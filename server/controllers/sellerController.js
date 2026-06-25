const { getPool } = require("../config/database");

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function getSellerVendorId(userId) {
  const [rows] = await getPool().execute("SELECT id FROM vendors WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0]?.id || null;
}

async function getSellerAnalytics(req, res, next) {
  try {
    const vendorId = await getSellerVendorId(req.user.id);

    if (!vendorId) {
      throw createHttpError(400, "You need a seller store to view analytics.");
    }

    const db = getPool();
    const [[summaryRows], [revenueRows], [inventoryRows], [performanceRows]] = await Promise.all([
      db.execute(
        `
          SELECT
            COALESCE(SUM(oi.line_total), 0) AS revenue,
            COALESCE(SUM(oi.quantity), 0) AS units_sold,
            COUNT(DISTINCT o.id) AS orders,
            AVG(oi.line_total) AS average_line_value
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          WHERE oi.vendor_id = ? AND o.status <> 'cancelled'
        `,
        [vendorId]
      ),
      db.execute(
        `
          SELECT DATE(o.created_at) AS day, COALESCE(SUM(oi.line_total), 0) AS revenue, COALESCE(SUM(oi.quantity), 0) AS units
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          WHERE oi.vendor_id = ? AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND o.status <> 'cancelled'
          GROUP BY DATE(o.created_at)
          ORDER BY day ASC
        `,
        [vendorId]
      ),
      db.execute(
        `
          SELECT id, name, stock_quantity, price, status
          FROM products
          WHERE vendor_id = ?
          ORDER BY stock_quantity ASC, updated_at DESC
          LIMIT 100
        `,
        [vendorId]
      ),
      db.execute(
        `
          SELECT p.id, p.name, p.stock_quantity, COALESCE(SUM(oi.quantity), 0) AS units_sold,
            COALESCE(SUM(oi.line_total), 0) AS revenue, COALESCE(AVG(r.rating), 0) AS rating, COUNT(DISTINCT r.id) AS reviews
          FROM products p
          LEFT JOIN order_items oi ON oi.product_id = p.id
          LEFT JOIN orders o ON o.id = oi.order_id AND o.status <> 'cancelled'
          LEFT JOIN reviews r ON r.product_id = p.id
          WHERE p.vendor_id = ?
          GROUP BY p.id
          ORDER BY revenue DESC, units_sold DESC
          LIMIT 12
        `,
        [vendorId]
      ),
    ]);

    const inventory = inventoryRows.map((row) => ({
      id: row.id,
      name: row.name,
      stock: row.stock_quantity,
      price: Number(row.price),
      status: row.status,
    }));

    res.json({
      summary: {
        revenue: Number(summaryRows[0]?.revenue || 0),
        unitsSold: Number(summaryRows[0]?.units_sold || 0),
        orders: Number(summaryRows[0]?.orders || 0),
        averageLineValue: Number(summaryRows[0]?.average_line_value || 0),
        lowStock: inventory.filter((item) => item.stock > 0 && item.stock <= 5).length,
        outOfStock: inventory.filter((item) => item.stock === 0).length,
      },
      revenue: revenueRows.map((row) => ({
        day: row.day,
        revenue: Number(row.revenue),
        units: Number(row.units),
      })),
      lowStockProducts: inventory.filter((item) => item.stock > 0 && item.stock <= 5),
      outOfStockProducts: inventory.filter((item) => item.stock === 0),
      productPerformance: performanceRows.map((row) => ({
        id: row.id,
        name: row.name,
        stock: row.stock_quantity,
        unitsSold: Number(row.units_sold || 0),
        revenue: Number(row.revenue || 0),
        rating: Number(Number(row.rating || 0).toFixed(1)),
        reviews: Number(row.reviews || 0),
      })),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSellerAnalytics,
};

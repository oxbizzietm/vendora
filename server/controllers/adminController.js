const { getPool } = require("../config/database");

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function pagination(query, fallbackLimit = 10) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || fallbackLimit, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

async function getAdminSummary(req, res, next) {
  try {
    const db = getPool();
    const [[users], [orders], [products], [sellers], [recentOrders], [revenueRows]] = await Promise.all([
      db.execute("SELECT COUNT(*) AS total, SUM(role = 'seller') AS sellers, SUM(role = 'customer') AS customers, SUM(is_active = FALSE) AS suspended FROM users"),
      db.execute("SELECT COUNT(*) AS total, SUM(status = 'pending') AS pending, SUM(status = 'delivered') AS delivered, COALESCE(SUM(grand_total), 0) AS revenue FROM orders"),
      db.execute("SELECT COUNT(*) AS total, SUM(status = 'active') AS active, SUM(stock_quantity = 0) AS out_of_stock FROM products"),
      db.execute("SELECT COUNT(*) AS total, SUM(status = 'pending') AS pending, SUM(status = 'approved') AS approved, SUM(status = 'suspended') AS suspended FROM vendors"),
      db.execute(
        `
          SELECT o.id, o.order_number, o.status, o.grand_total, o.created_at, u.name AS customer_name
          FROM orders o
          INNER JOIN users u ON u.id = o.user_id
          ORDER BY o.created_at DESC
          LIMIT 8
        `
      ),
      db.execute(
        `
          SELECT DATE(created_at) AS day, COALESCE(SUM(grand_total), 0) AS revenue, COUNT(*) AS orders
          FROM orders
          WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
          GROUP BY DATE(created_at)
          ORDER BY day ASC
        `
      ),
    ]);

    res.json({
      stats: {
        grossVolume: Number(orders[0]?.revenue || 0),
        users: Number(users[0]?.total || 0),
        customers: Number(users[0]?.customers || 0),
        sellers: Number(users[0]?.sellers || 0),
        suspendedUsers: Number(users[0]?.suspended || 0),
        orders: Number(orders[0]?.total || 0),
        pendingOrders: Number(orders[0]?.pending || 0),
        deliveredOrders: Number(orders[0]?.delivered || 0),
        products: Number(products[0]?.total || 0),
        activeProducts: Number(products[0]?.active || 0),
        outOfStockProducts: Number(products[0]?.out_of_stock || 0),
        pendingSellers: Number(sellers[0]?.pending || 0),
      },
      recentOrders: recentOrders.map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        status: row.status,
        grandTotal: Number(row.grand_total),
        customerName: row.customer_name,
        createdAt: row.created_at,
      })),
      revenue: revenueRows.map((row) => ({
        day: row.day,
        revenue: Number(row.revenue),
        orders: Number(row.orders),
      })),
    });
  } catch (error) {
    next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const { page, limit, offset } = pagination(req.query, 12);
    const db = getPool();
    const [countRows] = await db.execute("SELECT COUNT(*) AS total FROM users");
    const [rows] = await db.execute(
      `SELECT id, name, email, role, phone, is_active, created_at FROM users ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    );

    res.json({
      users: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        phone: row.phone,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
      })),
      pagination: { page, limit, total: Number(countRows[0]?.total || 0), pages: Math.ceil(Number(countRows[0]?.total || 0) / limit) },
    });
  } catch (error) {
    next(error);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const isActive = Boolean(req.body.isActive);

    if (userId === req.user.id && !isActive) {
      throw createHttpError(400, "You cannot suspend your own account.");
    }

    await getPool().execute("UPDATE users SET is_active = ? WHERE id = ?", [isActive, userId]);
    res.json({ message: isActive ? "User activated." : "User suspended." });
  } catch (error) {
    next(error);
  }
}

async function listSellers(req, res, next) {
  try {
    const [rows] = await getPool().execute(
      `
        SELECT v.id, v.store_name, v.slug, v.status, v.created_at, u.id AS user_id, u.name, u.email,
          COUNT(p.id) AS product_count
        FROM vendors v
        INNER JOIN users u ON u.id = v.user_id
        LEFT JOIN products p ON p.vendor_id = v.id
        GROUP BY v.id
        ORDER BY v.created_at DESC
        LIMIT 100
      `
    );

    res.json({
      sellers: rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        storeName: row.store_name,
        slug: row.slug,
        status: row.status,
        ownerName: row.name,
        ownerEmail: row.email,
        productCount: Number(row.product_count),
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
}

async function updateSellerStatus(req, res, next) {
  try {
    const sellerId = Number(req.params.id);
    const status = String(req.body.status || "").toLowerCase();

    if (!["pending", "approved", "suspended"].includes(status)) {
      throw createHttpError(400, "Status must be pending, approved, or suspended.");
    }

    await getPool().execute("UPDATE vendors SET status = ? WHERE id = ?", [status, sellerId]);
    res.json({ message: `Seller ${status}.` });
  } catch (error) {
    next(error);
  }
}

async function listCategories(req, res, next) {
  try {
    const [rows] = await getPool().execute(
      `
        SELECT c.id, c.name, c.slug, c.description, COUNT(p.id) AS product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name ASC
      `
    );

    res.json({
      categories: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        productCount: Number(row.product_count),
      })),
    });
  } catch (error) {
    next(error);
  }
}

async function listOrders(req, res, next) {
  try {
    const { page, limit, offset } = pagination(req.query, 12);
    const db = getPool();
    const [countRows] = await db.execute("SELECT COUNT(*) AS total FROM orders");
    const [rows] = await db.execute(
      `
        SELECT o.id, o.order_number, o.status, o.grand_total, o.created_at, u.name AS customer_name
        FROM orders o
        INNER JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    );

    res.json({
      orders: rows.map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        status: row.status,
        grandTotal: Number(row.grand_total),
        customerName: row.customer_name,
        createdAt: row.created_at,
      })),
      pagination: { page, limit, total: Number(countRows[0]?.total || 0), pages: Math.ceil(Number(countRows[0]?.total || 0) / limit) },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAdminSummary,
  listCategories,
  listOrders,
  listSellers,
  listUsers,
  updateSellerStatus,
  updateUserStatus,
};

const { getPool } = require("../config/database");

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function getWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    const db = getPool();

    const [items] = await db.execute(
      `
      SELECT
        w.id AS wishlist_id,
        w.product_id,
        p.name,
        p.slug,
        p.price,
        p.compare_at_price AS oldPrice,
        p.stock_quantity AS stock,
        p.status,
        v.store_name AS seller,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) AS image_url
      FROM wishlists w
      INNER JOIN products p ON p.id = w.product_id
      INNER JOIN vendors v ON v.id = p.vendor_id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
      `,
      [userId]
    );

    const mappedItems = items.map((row) => ({
      wishlistId: row.wishlist_id,
      id: row.product_id,
      name: row.name,
      slug: row.slug,
      price: Number(row.price),
      oldPrice: row.oldPrice ? Number(row.oldPrice) : null,
      stock: row.stock,
      seller: row.seller,
      image: row.image_url || "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=500&q=80",
    }));

    res.json({
      items: mappedItems,
      count: mappedItems.length,
    });
  } catch (error) {
    next(error);
  }
}

async function addToWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    const productId = Number(req.params.productId);

    if (!productId) {
      throw createHttpError(400, "Product ID is required.");
    }

    const db = getPool();

    const [productRows] = await db.execute(
      "SELECT id, status FROM products WHERE id = ? LIMIT 1",
      [productId]
    );

    if (!productRows[0]) {
      throw createHttpError(404, "Product not found.");
    }

    const [existing] = await db.execute(
      "SELECT id FROM wishlists WHERE user_id = ? AND product_id = ? LIMIT 1",
      [userId, productId]
    );

    if (existing[0]) {
      return res.json({ message: "Product is already in your wishlist." });
    }

    await db.execute(
      "INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)",
      [userId, productId]
    );

    res.status(201).json({ message: "Product added to wishlist." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.json({ message: "Product is already in your wishlist." });
    }
    next(error);
  }
}

async function removeFromWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    const productId = Number(req.params.productId);

    if (!productId) {
      throw createHttpError(400, "Product ID is required.");
    }

    const db = getPool();

    const [result] = await db.execute(
      "DELETE FROM wishlists WHERE user_id = ? AND product_id = ?",
      [userId, productId]
    );

    if (result.affectedRows === 0) {
      throw createHttpError(404, "Product not found in your wishlist.");
    }

    res.json({ message: "Product removed from wishlist." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};

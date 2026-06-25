const { getPool } = require("../config/database");

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function ensureCart(connection, userId) {
  const [existing] = await connection.execute(
    "SELECT id FROM carts WHERE user_id = ? LIMIT 1",
    [userId]
  );

  if (existing[0]) {
    return existing[0].id;
  }

  const [result] = await connection.execute(
    "INSERT INTO carts (user_id) VALUES (?)",
    [userId]
  );

  return result.insertId;
}

async function getCart(req, res, next) {
  try {
    const userId = req.user.id;
    const db = getPool();

    const [cartRows] = await db.execute("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [userId]);

    if (!cartRows[0]) {
      return res.json({ cart: null, items: [], summary: { subtotal: 0, itemCount: 0, totalItems: 0, total: 0 } });
    }

    const cartId = cartRows[0].id;

    const [items] = await db.execute(
      `
      SELECT
        ci.id AS item_id,
        ci.quantity,
        ci.price_at_addition,
        p.id,
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
      FROM cart_items ci
      INNER JOIN products p ON p.id = ci.product_id
      INNER JOIN vendors v ON v.id = p.vendor_id
      WHERE ci.cart_id = ?
      ORDER BY ci.created_at ASC
      `,
      [cartId]
    );

    const mappedItems = items.map((row) => ({
      itemId: row.item_id,
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: Number(row.price_at_addition),
      oldPrice: row.oldPrice ? Number(row.oldPrice) : null,
      stock: row.stock,
      seller: row.seller,
      image: row.image_url || "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=500&q=80",
      quantity: row.quantity,
    }));

    const subtotal = mappedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalItems = mappedItems.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      cart: { id: cartId },
      items: mappedItems,
      summary: {
        subtotal: Number(subtotal.toFixed(2)),
        itemCount: totalItems,
        totalItems,
        estimatedTotal: Number(subtotal.toFixed(2)),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function addToCart(req, res, next) {
  const connection = await getPool().getConnection();

  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId) {
      throw createHttpError(400, "Product ID is required.");
    }

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));

    await connection.beginTransaction();

    const [productRows] = await connection.execute(
      "SELECT id, stock_quantity, status, price FROM products WHERE id = ? LIMIT 1",
      [productId]
    );

    if (!productRows[0]) {
      throw createHttpError(404, "Product not found.");
    }

    if (productRows[0].status !== "active") {
      throw createHttpError(400, "This product is not available for purchase.");
    }

    if (productRows[0].stock_quantity < 1) {
      throw createHttpError(400, "This product is out of stock.");
    }

    const productPrice = productRows[0].price;

    const cartId = await ensureCart(connection, userId);

    const [existing] = await connection.execute(
      "SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1",
      [cartId, productId]
    );

    if (existing[0]) {
      const newQuantity = existing[0].quantity + qty;

      if (newQuantity > productRows[0].stock_quantity) {
        throw createHttpError(400, `Only ${productRows[0].stock_quantity} units available. You already have ${existing[0].quantity} in your cart.`);
      }

      await connection.execute(
        "UPDATE cart_items SET quantity = ? WHERE id = ?",
        [newQuantity, existing[0].id]
      );
    } else {
      if (qty > productRows[0].stock_quantity) {
        throw createHttpError(400, `Only ${productRows[0].stock_quantity} units available.`);
      }

      await connection.execute(
        "INSERT INTO cart_items (cart_id, product_id, quantity, price_at_addition) VALUES (?, ?, ?, ?)",
        [cartId, productId, qty, productPrice]
      );
    }

    await connection.commit();

    // Return updated cart
    req.user = req.user;
    return getCart(req, res, next);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

async function updateCartItem(req, res, next) {
  const connection = await getPool().getConnection();

  try {
    const userId = req.user.id;
    const itemId = Number(req.params.itemId);
    const { quantity } = req.body;

    if (!itemId) {
      throw createHttpError(400, "Item ID is required.");
    }

    const qty = Math.max(0, Math.floor(Number(quantity) || 0));

    await connection.beginTransaction();

    // Verify the item belongs to the user's cart
    const [itemRows] = await connection.execute(
      `
      SELECT ci.id, ci.product_id, p.stock_quantity
      FROM cart_items ci
      INNER JOIN carts c ON c.id = ci.cart_id
      INNER JOIN products p ON p.id = ci.product_id
      WHERE ci.id = ? AND c.user_id = ?
      LIMIT 1
      `,
      [itemId, userId]
    );

    if (!itemRows[0]) {
      throw createHttpError(404, "Cart item not found.");
    }

    if (qty === 0) {
      await connection.execute("DELETE FROM cart_items WHERE id = ?", [itemId]);
    } else {
      if (qty > itemRows[0].stock_quantity) {
        throw createHttpError(400, `Only ${itemRows[0].stock_quantity} units available.`);
      }

      await connection.execute(
        "UPDATE cart_items SET quantity = ? WHERE id = ?",
        [qty, itemId]
      );
    }

    await connection.commit();

    req.user = req.user;
    return getCart(req, res, next);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

async function removeCartItem(req, res, next) {
  const connection = await getPool().getConnection();

  try {
    const userId = req.user.id;
    const itemId = Number(req.params.itemId);

    await connection.beginTransaction();

    const [itemRows] = await connection.execute(
      `
      SELECT ci.id
      FROM cart_items ci
      INNER JOIN carts c ON c.id = ci.cart_id
      WHERE ci.id = ? AND c.user_id = ?
      LIMIT 1
      `,
      [itemId, userId]
    );

    if (!itemRows[0]) {
      throw createHttpError(404, "Cart item not found.");
    }

    await connection.execute("DELETE FROM cart_items WHERE id = ?", [itemId]);
    await connection.commit();

    req.user = req.user;
    return getCart(req, res, next);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

async function clearCart(req, res, next) {
  const connection = await getPool().getConnection();

  try {
    const userId = req.user.id;

    await connection.beginTransaction();

    const [cartRows] = await connection.execute(
      "SELECT id FROM carts WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (cartRows[0]) {
      await connection.execute("DELETE FROM cart_items WHERE cart_id = ?", [cartRows[0].id]);
    }

    await connection.commit();

    res.json({ message: "Cart cleared.", items: [] });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};

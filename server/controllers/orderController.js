const { getPool } = require("../config/database");
const { ensureVendorForUser, findVendorForUser } = require("../utils/vendorUtils");

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VND-${timestamp}-${random}`;
}

function calculateShipping(subtotal) {
  return subtotal >= 50000 ? 0 : 6500;
}

function calculateTax(subtotal) {
  return Number((Math.max(subtotal, 0) * 0.075).toFixed(2));
}

function timelineTitle(status) {
  return {
    pending: "Order placed",
    paid: "Payment confirmed",
    processing: "Order processing",
    shipped: "Order shipped",
    delivered: "Order delivered",
    cancelled: "Order cancelled",
    refunded: "Order refunded",
  }[status] || "Order updated";
}

async function addTimeline(connection, orderId, status, createdBy, note = null) {
  await connection.execute(
    "INSERT INTO order_timeline (order_id, status, title, note, created_by) VALUES (?, ?, ?, ?, ?)",
    [orderId, status, timelineTitle(status), note, createdBy || null]
  );
}

async function createNotification(connection, { userId = null, role = null, type, title, message, linkUrl = null }) {
  await connection.execute(
    "INSERT INTO notifications (user_id, role, type, title, message, link_url) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, role, type, title, message, linkUrl]
  );
}

async function validateCoupon(connection, code, subtotal) {
  const couponCode = String(code || "").trim().toUpperCase();

  if (!couponCode) {
    return { coupon: null, discountTotal: 0 };
  }

  const [rows] = await connection.execute(
    `
      SELECT *
      FROM coupons
      WHERE code = ?
        AND is_active = TRUE
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (expires_at IS NULL OR expires_at >= NOW())
        AND (usage_limit IS NULL OR used_count < usage_limit)
      LIMIT 1
    `,
    [couponCode]
  );

  const coupon = rows[0];

  if (!coupon) {
    throw createHttpError(400, "Coupon is invalid or expired.");
  }

  if (subtotal < Number(coupon.minimum_order)) {
    throw createHttpError(400, `Coupon requires a minimum order of ${Number(coupon.minimum_order).toFixed(2)}.`);
  }

  let discountTotal = coupon.discount_type === "fixed"
    ? Number(coupon.discount_value)
    : subtotal * (Number(coupon.discount_value) / 100);

  if (coupon.max_discount !== null) {
    discountTotal = Math.min(discountTotal, Number(coupon.max_discount));
  }

  return {
    coupon,
    discountTotal: Number(Math.min(discountTotal, subtotal).toFixed(2)),
  };
}

async function validateCouponCode(req, res, next) {
  const connection = await getPool().getConnection();

  try {
    const subtotal = Number(req.body.subtotal || req.query.subtotal || 0);
    const { coupon, discountTotal } = await validateCoupon(connection, req.body.code || req.query.code, subtotal);

    res.json({
      coupon: coupon
        ? {
            id: coupon.id,
            code: coupon.code,
            description: coupon.description,
            discountType: coupon.discount_type,
            discountValue: Number(coupon.discount_value),
            discountTotal,
          }
        : null,
      discountTotal,
    });
  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
}

async function getCartItems(connection, cartId) {
  const [cartItems] = await connection.execute(
    `
      SELECT
        ci.product_id,
        ci.quantity,
        p.name AS product_name,
        COALESCE(ci.price_at_addition, p.price) AS price,
        p.stock_quantity,
        p.vendor_id
      FROM cart_items ci
      INNER JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = ?
    `,
    [cartId]
  );

  return cartItems;
}

async function createOrder(req, res, next) {
  const connection = await getPool().getConnection();

  try {
    const userId = req.user.id;
    const { shippingAddressId, couponCode } = req.body;

    if (!shippingAddressId) {
      throw createHttpError(400, "Shipping address is required.");
    }

    await connection.beginTransaction();

    const [addressRows] = await connection.execute(
      "SELECT id FROM addresses WHERE id = ? AND user_id = ? LIMIT 1",
      [shippingAddressId, userId]
    );

    if (!addressRows[0]) {
      throw createHttpError(400, "Invalid shipping address.");
    }

    const [cartRows] = await connection.execute("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [userId]);

    if (!cartRows[0]) {
      throw createHttpError(400, "Your cart is empty.");
    }

    const cartItems = await getCartItems(connection, cartRows[0].id);

    if (cartItems.length === 0) {
      throw createHttpError(400, "Your cart is empty.");
    }

    for (const item of cartItems) {
      if (item.quantity > item.stock_quantity) {
        throw createHttpError(400, `Insufficient stock for "${item.product_name}". Only ${item.stock_quantity} units available.`);
      }
    }

    const subtotal = Number(cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0).toFixed(2));
    const { coupon, discountTotal } = await validateCoupon(connection, couponCode, subtotal);
    const taxableSubtotal = Number((subtotal - discountTotal).toFixed(2));
    const shippingTotal = calculateShipping(taxableSubtotal);
    const taxTotal = calculateTax(taxableSubtotal);
    const grandTotal = Number((taxableSubtotal + shippingTotal + taxTotal).toFixed(2));
    const orderNumber = generateOrderNumber();

    const [orderResult] = await connection.execute(
      `
        INSERT INTO orders
          (order_number, user_id, status, subtotal, discount_total, shipping_total, tax_total, grand_total, coupon_id, coupon_code, shipping_address_id, placed_at)
        VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        orderNumber,
        userId,
        subtotal,
        discountTotal,
        shippingTotal,
        taxTotal,
        grandTotal,
        coupon?.id || null,
        coupon?.code || null,
        shippingAddressId,
      ]
    );
    const orderId = orderResult.insertId;

    for (const item of cartItems) {
      const lineTotal = Number((Number(item.price) * item.quantity).toFixed(2));

      await connection.execute(
        "INSERT INTO order_items (order_id, product_id, vendor_id, product_name, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [orderId, item.product_id, item.vendor_id, item.product_name, item.quantity, item.price, lineTotal]
      );
      await connection.execute("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?", [item.quantity, item.product_id]);
    }

    await connection.execute(
      "INSERT INTO payments (order_id, provider, provider_reference, amount, status) VALUES (?, 'mock_payment', ?, ?, 'pending')",
      [orderId, `MOCK-${Date.now()}`, grandTotal]
    );

    if (coupon) {
      await connection.execute("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?", [coupon.id]);
    }

    await addTimeline(connection, orderId, "pending", userId, "Your order was created and is awaiting seller processing.");
    await createNotification(connection, {
      userId,
      type: "order_created",
      title: "Order placed",
      message: `Your order ${orderNumber} has been placed successfully.`,
      linkUrl: `/orders/${orderId}`,
    });
    await createNotification(connection, {
      role: "admin",
      type: "admin_order_created",
      title: "New marketplace order",
      message: `Order ${orderNumber} was placed.`,
      linkUrl: "/admin",
    });

    const vendorIds = [...new Set(cartItems.map((item) => item.vendor_id).filter(Boolean))];
    if (vendorIds.length) {
      const placeholders = vendorIds.map(() => "?").join(",");
      const [sellerRows] = await connection.execute(
        `SELECT user_id FROM vendors WHERE id IN (${placeholders})`,
        vendorIds
      );

      for (const seller of sellerRows) {
        await createNotification(connection, {
          userId: seller.user_id,
          type: "seller_order_created",
          title: "New seller order",
          message: `Order ${orderNumber} contains products from your store.`,
          linkUrl: "/seller/orders",
        });
      }
    }

    await connection.execute("DELETE FROM cart_items WHERE cart_id = ?", [cartRows[0].id]);
    await connection.commit();

    res.status(201).json({
      message: "Order placed successfully.",
      order: {
        id: orderId,
        orderNumber,
        status: "pending",
        subtotal,
        discountTotal,
        shippingTotal,
        taxTotal,
        grandTotal,
        couponCode: coupon?.code || null,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

async function getMyOrders(req, res, next) {
  try {
    const userId = req.user.id;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const offset = (page - 1) * limit;
    const db = getPool();

    const [countRows] = await db.execute("SELECT COUNT(*) AS total FROM orders WHERE user_id = ?", [userId]);
    const total = Number(countRows[0]?.total || 0);
    const [orders] = await db.execute(
      `
        SELECT o.id, o.order_number, o.status, o.subtotal, o.discount_total, o.shipping_total,
          o.tax_total, o.grand_total, o.coupon_code, o.placed_at, o.created_at, COUNT(oi.id) AS item_count
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      [userId]
    );

    res.json({
      orders: orders.map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        status: row.status,
        subtotal: Number(row.subtotal),
        discountTotal: Number(row.discount_total || 0),
        shippingTotal: Number(row.shipping_total),
        taxTotal: Number(row.tax_total),
        grandTotal: Number(row.grand_total),
        couponCode: row.coupon_code,
        itemCount: Number(row.item_count),
        placedAt: row.placed_at || row.created_at,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

async function getOrderDetails(req, res, next) {
  try {
    const userId = req.user.id;
    const orderId = Number(req.params.id);
    const db = getPool();

    if (!orderId) {
      throw createHttpError(400, "Order ID is required.");
    }

    const accessClause = req.user.role === "admin" ? "o.id = ?" : "o.id = ? AND o.user_id = ?";
    const accessParams = req.user.role === "admin" ? [orderId] : [orderId, userId];
    const [orderRows] = await db.execute(
      `
        SELECT o.*,
          a.recipient_name, a.phone AS address_phone, a.address_line1, a.address_line2,
          a.city, a.state, a.postal_code, a.country
        FROM orders o
        LEFT JOIN addresses a ON a.id = o.shipping_address_id
        WHERE ${accessClause}
        LIMIT 1
      `,
      accessParams
    );

    if (!orderRows[0]) {
      throw createHttpError(404, "Order not found.");
    }

    const order = orderRows[0];
    const [items] = await db.execute(
      `
        SELECT oi.product_name, oi.quantity, oi.unit_price, oi.line_total, oi.product_id,
          (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY pi.sort_order ASC, pi.id ASC LIMIT 1) AS image_url
        FROM order_items oi
        WHERE oi.order_id = ?
        ORDER BY oi.created_at ASC
      `,
      [orderId]
    );
    const [paymentRows] = await db.execute("SELECT provider, amount, status, paid_at FROM payments WHERE order_id = ? LIMIT 1", [orderId]);
    const [timeline] = await db.execute(
      `
        SELECT ot.id, ot.status, ot.title, ot.note, ot.created_at, u.name AS actor
        FROM order_timeline ot
        LEFT JOIN users u ON u.id = ot.created_by
        WHERE ot.order_id = ?
        ORDER BY ot.created_at ASC, ot.id ASC
      `,
      [orderId]
    );

    res.json({
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        subtotal: Number(order.subtotal),
        discountTotal: Number(order.discount_total || 0),
        shippingTotal: Number(order.shipping_total),
        taxTotal: Number(order.tax_total),
        grandTotal: Number(order.grand_total),
        couponCode: order.coupon_code,
        placedAt: order.placed_at || order.created_at,
        shippingAddress: order.recipient_name
          ? {
              recipientName: order.recipient_name,
              phone: order.address_phone,
              addressLine1: order.address_line1,
              addressLine2: order.address_line2,
              city: order.city,
              state: order.state,
              postalCode: order.postal_code,
              country: order.country,
            }
          : null,
        payment: paymentRows[0]
          ? {
              provider: paymentRows[0].provider,
              amount: Number(paymentRows[0].amount),
              status: paymentRows[0].status,
              paidAt: paymentRows[0].paid_at,
            }
          : null,
        timeline: timeline.map((item) => ({
          id: item.id,
          status: item.status,
          title: item.title,
          note: item.note,
          actor: item.actor,
          createdAt: item.created_at,
        })),
        items: items.map((item) => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          lineTotal: Number(item.line_total),
          image: item.image_url || "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=500&q=80",
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getSellerOrders(req, res, next) {
  try {
    const userId = req.user.id;
    const db = getPool();
    let vendor = await findVendorForUser(db, userId);

    if (!vendor && req.user.role === "seller") {
      vendor = await ensureVendorForUser(db, req.user);
    }

    if (!vendor) {
      throw createHttpError(400, "You need to be a verified seller to view orders.");
    }

    if (vendor.status !== "approved") {
      throw createHttpError(403, "Your seller store must be approved to view orders.");
    }

    const vendorId = vendor.id;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status || "";
    const whereClause = ["oi.vendor_id = ?"];
    const params = [vendorId];

    if (statusFilter && ["pending", "processing", "shipped", "delivered", "cancelled"].includes(statusFilter)) {
      whereClause.push("o.status = ?");
      params.push(statusFilter);
    }

    const where = whereClause.join(" AND ");
    const [countRows] = await db.execute(
      `SELECT COUNT(DISTINCT o.id) AS total FROM orders o INNER JOIN order_items oi ON oi.order_id = o.id WHERE ${where}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);
    const [orders] = await db.execute(
      `
        SELECT DISTINCT o.id, o.order_number, o.status, o.grand_total, o.placed_at,
          o.created_at, o.user_id, u.name AS customer_name
        FROM orders o
        INNER JOIN order_items oi ON oi.order_id = o.id
        INNER JOIN users u ON u.id = o.user_id
        WHERE ${where}
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      params
    );

    const orderIds = orders.map((order) => order.id);
    const itemsMap = new Map();

    if (orderIds.length) {
      const placeholders = orderIds.map(() => "?").join(",");
      const [allItems] = await db.execute(
        `
          SELECT oi.order_id, oi.product_name, oi.quantity, oi.unit_price, oi.line_total,
            (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY pi.sort_order ASC, pi.id ASC LIMIT 1) AS image_url
          FROM order_items oi
          WHERE oi.order_id IN (${placeholders}) AND oi.vendor_id = ?
        `,
        [...orderIds, vendorId]
      );

      for (const item of allItems) {
        if (!itemsMap.has(item.order_id)) {
          itemsMap.set(item.order_id, []);
        }
        itemsMap.get(item.order_id).push({
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          lineTotal: Number(item.line_total),
          image: item.image_url || "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=500&q=80",
        });
      }
    }

    res.json({
      orders: orders.map((row) => ({
        id: row.id,
        orderNumber: row.order_number,
        status: row.status,
        grandTotal: Number(row.grand_total),
        placedAt: row.placed_at || row.created_at,
        customerName: row.customer_name,
        items: itemsMap.get(row.id) || [],
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

async function updateOrderStatus(req, res, next) {
  const connection = await getPool().getConnection();

  try {
    const userId = req.user.id;
    const orderId = Number(req.params.id);
    const { status } = req.body;
    const allowedStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];

    if (!allowedStatuses.includes(status)) {
      throw createHttpError(400, `Status must be one of: ${allowedStatuses.join(", ")}.`);
    }

    await connection.beginTransaction();

    let vendor = await findVendorForUser(connection, userId);

    if (!vendor && req.user.role === "seller") {
      vendor = await ensureVendorForUser(connection, req.user);
    }

    if (!vendor && req.user.role !== "admin") {
      throw createHttpError(403, "Only verified sellers and admins can update order status.");
    }

    if (vendor?.status !== "approved" && req.user.role !== "admin") {
      throw createHttpError(403, "Your seller store must be approved to update order status.");
    }

    if (req.user.role !== "admin") {
      const [itemRows] = await connection.execute(
        "SELECT id FROM order_items WHERE order_id = ? AND vendor_id = ? LIMIT 1",
        [orderId, vendor.id]
      );

      if (!itemRows[0]) {
        throw createHttpError(404, "Order not found or you do not have items in this order.");
      }
    }

    await connection.execute("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
    await addTimeline(connection, orderId, status, userId, `${req.user.role === "admin" ? "Admin" : "Seller"} updated this order to ${status}.`);

    const [orderRows] = await connection.execute("SELECT user_id, order_number FROM orders WHERE id = ? LIMIT 1", [orderId]);
    if (orderRows[0]) {
      await createNotification(connection, {
        userId: orderRows[0].user_id,
        type: "order_status",
        title: "Order status updated",
        message: `Order ${orderRows[0].order_number} is now ${status}.`,
        linkUrl: `/orders/${orderId}`,
      });
      await createNotification(connection, {
        role: "admin",
        type: "order_status_admin",
        title: "Order status changed",
        message: `Order ${orderRows[0].order_number} is now ${status}.`,
        linkUrl: "/admin",
      });
    }

    await connection.commit();
    res.json({ message: `Order status updated to ${status}.` });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

async function completeMockPayment(req, res, next) {
  const connection = await getPool().getConnection();

  try {
    const userId = req.user.id;
    const orderId = Number(req.params.id);

    await connection.beginTransaction();

    const [orderRows] = await connection.execute(
      "SELECT id, order_number FROM orders WHERE id = ? AND user_id = ? LIMIT 1",
      [orderId, userId]
    );

    if (!orderRows[0]) {
      throw createHttpError(404, "Order not found.");
    }

    await connection.execute("UPDATE payments SET status = 'successful', paid_at = NOW() WHERE order_id = ?", [orderId]);
    await connection.execute("UPDATE orders SET status = 'processing' WHERE id = ? AND status = 'pending'", [orderId]);
    await addTimeline(connection, orderId, "paid", userId, "Mock payment was confirmed.");
    await addTimeline(connection, orderId, "processing", userId, "The seller can now prepare this order.");
    await createNotification(connection, {
      userId,
      type: "payment_successful",
      title: "Payment confirmed",
      message: `Mock payment for ${orderRows[0].order_number} was confirmed.`,
      linkUrl: `/orders/${orderId}`,
    });

    await connection.commit();
    res.json({ message: "Mock payment completed." });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

module.exports = {
  completeMockPayment,
  createOrder,
  getMyOrders,
  getOrderDetails,
  getSellerOrders,
  updateOrderStatus,
  validateCouponCode,
};

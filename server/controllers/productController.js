const path = require("path");
const { getPool } = require("../config/database");

const productSelect = `
  p.id,
  p.vendor_id,
  p.category_id,
  p.name,
  p.slug,
  p.description,
  p.price,
  p.compare_at_price,
  p.stock_quantity,
  p.sku,
  p.status,
  p.created_at,
  p.updated_at,
  c.name AS category_name,
  c.slug AS category_slug,
  v.store_name,
  v.slug AS vendor_slug,
  u.id AS seller_id,
  u.name AS seller_name,
  u.email AS seller_email,
  COALESCE(r.avg_rating, 0) AS average_rating,
  COALESCE(r.review_count, 0) AS review_count,
  COALESCE(o.sold_count, 0) AS sold_count,
  (
    SELECT pi.image_url
    FROM product_images pi
    WHERE pi.product_id = p.id
    ORDER BY pi.sort_order ASC, pi.id ASC
    LIMIT 1
  ) AS image_url
`;

const productJoins = `
  FROM products p
  INNER JOIN vendors v ON v.id = p.vendor_id
  INNER JOIN users u ON u.id = v.user_id
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN (
    SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
    FROM reviews
    GROUP BY product_id
  ) r ON r.product_id = p.id
  LEFT JOIN (
    SELECT product_id, SUM(quantity) AS sold_count
    FROM order_items
    GROUP BY product_id
  ) o ON o.product_id = p.id
`;

const allowedStatuses = ["draft", "active", "archived"];
const allowedSorts = ["featured", "newest", "price_asc", "price_desc", "rating", "best_selling"];

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function toNumber(value, field, { min = 0, required = true } = {}) {
  if (value === undefined || value === null || value === "") {
    if (!required) {
      return null;
    }

    throw createHttpError(400, `${field} is required.`);
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < min) {
    throw createHttpError(400, `${field} must be a valid number of at least ${min}.`);
  }

  return number;
}

function toInteger(value, field, { min = 0, required = true } = {}) {
  const number = toNumber(value, field, { min, required });

  if (number === null) {
    return null;
  }

  if (!Number.isInteger(number)) {
    throw createHttpError(400, `${field} must be a whole number.`);
  }

  return number;
}

function parseList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(parseList);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        return parseList(JSON.parse(trimmed));
      } catch {
        throw createHttpError(400, "Image URL list must be valid JSON.");
      }
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function validateProductInput(body, partial = false) {
  const data = {};

  if (!partial || body.name !== undefined) {
    data.name = String(body.name || "").trim();

    if (data.name.length < 2 || data.name.length > 180) {
      throw createHttpError(400, "Product name must be between 2 and 180 characters.");
    }
  }

  if (!partial || body.description !== undefined) {
    data.description = String(body.description || "").trim();

    if (data.description.length > 5000) {
      throw createHttpError(400, "Description must be 5000 characters or fewer.");
    }
  }

  if (!partial || body.price !== undefined) {
    data.price = toNumber(body.price, "Price", { min: 0.01 });
  }

  if (!partial || body.compare_at_price !== undefined || body.oldPrice !== undefined) {
    data.compare_at_price = toNumber(body.compare_at_price ?? body.oldPrice, "Compare at price", {
      min: 0,
      required: false,
    });
  }

  if (!partial || body.stock_quantity !== undefined || body.stock !== undefined) {
    data.stock_quantity = toInteger(body.stock_quantity ?? body.stock, "Stock", { min: 0 });
  }

  if (!partial || body.sku !== undefined) {
    data.sku = body.sku ? String(body.sku).trim().slice(0, 100) : null;
  }

  if (!partial || body.status !== undefined) {
    data.status = String(body.status || "active").trim().toLowerCase();

    if (!allowedStatuses.includes(data.status)) {
      throw createHttpError(400, `Status must be one of: ${allowedStatuses.join(", ")}.`);
    }
  }

  if (!partial || body.category !== undefined || body.category_id !== undefined) {
    data.category = String(body.category || "").trim();
    data.category_id = body.category_id ? toInteger(body.category_id, "Category ID", { min: 1 }) : null;

    if (data.category.length > 140) {
      throw createHttpError(400, "Category must be 140 characters or fewer.");
    }
  }

  return data;
}

function fileToImagePath(file) {
  return `/uploads/${path.basename(file.filename)}`;
}

function mapProduct(row, images = [], reviews = []) {
  const imageList = images.length ? images : row.image_url ? [row.image_url] : [];
  const price = Number(row.price);
  const oldPrice = row.compare_at_price === null ? null : Number(row.compare_at_price);
  const rating = Number(row.average_rating || 0);
  const reviewCount = Number(row.review_count || 0);
  const soldCount = Number(row.sold_count || 0);
  const badge =
    soldCount > 20 ? "Best Seller" : oldPrice && oldPrice > price ? "Flash Deal" : rating >= 4.5 ? "Top Rated" : "New Arrival";

  return {
    id: row.id,
    vendorId: row.vendor_id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    category: row.category_name || "Uncategorized",
    categorySlug: row.category_slug || "",
    seller: row.store_name || row.seller_name,
    sellerName: row.seller_name,
    sellerEmail: row.seller_email,
    sellerId: row.seller_id,
    price,
    oldPrice,
    stock: row.stock_quantity,
    sku: row.sku,
    status: row.status,
    rating: Number(rating.toFixed(1)),
    averageRating: Number(rating.toFixed(2)),
    reviews: reviewCount,
    reviewCount,
    soldCount,
    badge,
    image: imageList[0] || "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=900&q=80",
    images: imageList,
    reviewItems: reviews,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureUniqueSlug(connection, table, baseSlug, ignoreId) {
  const fallback = table === "vendors" ? "seller" : "product";
  const base = baseSlug || fallback;
  let slug = base;
  let count = 2;

  while (true) {
    const params = [slug];
    let sql = `SELECT id FROM ${table} WHERE slug = ?`;

    if (ignoreId) {
      sql += " AND id <> ?";
      params.push(ignoreId);
    }

    sql += " LIMIT 1";

    const [rows] = await connection.execute(sql, params);

    if (rows.length === 0) {
      return slug;
    }

    slug = `${base}-${count}`;
    count += 1;
  }
}

async function ensureCategory(connection, data) {
  if (data.category_id) {
    const [rows] = await connection.execute("SELECT id FROM categories WHERE id = ? LIMIT 1", [data.category_id]);

    if (!rows[0]) {
      throw createHttpError(400, "Selected category does not exist.");
    }

    return data.category_id;
  }

  if (!data.category) {
    return null;
  }

  const slug = slugify(data.category);
  const [existing] = await connection.execute("SELECT id FROM categories WHERE slug = ? OR name = ? LIMIT 1", [
    slug,
    data.category,
  ]);

  if (existing[0]) {
    return existing[0].id;
  }

  const [result] = await connection.execute("INSERT INTO categories (name, slug) VALUES (?, ?)", [data.category, slug]);
  return result.insertId;
}

async function ensureVendorForUser(connection, user) {
  const [existing] = await connection.execute("SELECT * FROM vendors WHERE user_id = ? LIMIT 1", [user.id]);

  if (existing[0]) {
    return existing[0];
  }

  const storeName = `${user.name}'s Store`.slice(0, 160);
  const slug = await ensureUniqueSlug(connection, "vendors", slugify(`${user.name}-store-${user.id}`));
  const [result] = await connection.execute(
    "INSERT INTO vendors (user_id, store_name, slug, status) VALUES (?, ?, ?, 'approved')",
    [user.id, storeName, slug]
  );

  return {
    id: result.insertId,
    user_id: user.id,
    store_name: storeName,
    slug,
    status: "approved",
  };
}

function assertProductAccess(product, user) {
  if (user.role === "admin") {
    return;
  }

  if (user.role !== "seller") {
    throw createHttpError(403, "Only sellers and admins can manage products.");
  }

  if (Number(product.seller_id) !== Number(user.id)) {
    throw createHttpError(403, "You can only manage your own products.");
  }
}

async function findProductForManagement(connection, id) {
  const [rows] = await connection.execute(
    `
      SELECT p.id, p.vendor_id, u.id AS seller_id
      FROM products p
      INNER JOIN vendors v ON v.id = p.vendor_id
      INNER JOIN users u ON u.id = v.user_id
      WHERE p.id = ?
      LIMIT 1
    `,
    [id]
  );

  if (!rows[0]) {
    throw createHttpError(404, "Product not found.");
  }

  return rows[0];
}

async function getImages(productIds) {
  if (!productIds.length) {
    return new Map();
  }

  const placeholders = productIds.map(() => "?").join(",");
  const [rows] = await getPool().execute(
    `
      SELECT product_id, image_url
      FROM product_images
      WHERE product_id IN (${placeholders})
      ORDER BY sort_order ASC, id ASC
    `,
    productIds
  );

  return rows.reduce((map, row) => {
    const images = map.get(row.product_id) || [];
    images.push(row.image_url);
    map.set(row.product_id, images);
    return map;
  }, new Map());
}

function buildProductFilters(query, user, mine = false) {
  const where = [];
  const params = [];
  const search = String(query.search || query.q || query.keyword || "").trim();
  const category = String(query.category || "").trim();
  const seller = String(query.seller || "").trim();
  const minPrice = query.minPrice || query.min_price;
  const maxPrice = query.maxPrice || query.max_price;
  const rating = query.rating || query.minRating || query.min_rating;

  if (mine) {
    where.push("u.id = ?");
    params.push(user.id);
  } else if (user?.role !== "admin" || query.includeInactive !== "true") {
    where.push("p.status = 'active'");
  }

  if (search) {
    where.push("(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ? OR v.store_name LIKE ? OR u.name LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like, like, like);
  }

  if (category) {
    where.push("(c.slug = ? OR c.name = ? OR c.id = ?)");
    params.push(category, category, Number(category) || 0);
  }

  if (seller) {
    where.push("(v.slug = ? OR v.store_name LIKE ? OR u.name LIKE ?)");
    params.push(seller, `%${seller}%`, `%${seller}%`);
  }

  if (minPrice !== undefined && minPrice !== "") {
    where.push("p.price >= ?");
    params.push(toNumber(minPrice, "Minimum price", { min: 0 }));
  }

  if (maxPrice !== undefined && maxPrice !== "") {
    where.push("p.price <= ?");
    params.push(toNumber(maxPrice, "Maximum price", { min: 0 }));
  }

  if (rating !== undefined && rating !== "") {
    where.push("COALESCE(r.avg_rating, 0) >= ?");
    params.push(toNumber(rating, "Rating", { min: 0 }));
  }

  return {
    clause: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

function getSortClause(sort) {
  const value = allowedSorts.includes(sort) ? sort : "featured";

  if (value === "newest") {
    return "p.created_at DESC, p.id DESC";
  }

  if (value === "price_asc") {
    return "p.price ASC, p.id DESC";
  }

  if (value === "price_desc") {
    return "p.price DESC, p.id DESC";
  }

  if (value === "rating") {
    return "average_rating DESC, review_count DESC, p.id DESC";
  }

  if (value === "best_selling") {
    return "sold_count DESC, review_count DESC, p.id DESC";
  }

  return "sold_count DESC, average_rating DESC, p.created_at DESC, p.id DESC";
}

async function listProducts(req, res, next) {
  try {
    const page = Math.max(toInteger(req.query.page || 1, "Page", { min: 1 }), 1);
    const limit = Math.min(Math.max(toInteger(req.query.limit || 12, "Limit", { min: 1 }), 1), 48);
    const offset = (page - 1) * limit;
    const filters = buildProductFilters(req.query, req.user);
    const sort = getSortClause(req.query.sort);

    const [countRows] = await getPool().execute(
      `SELECT COUNT(DISTINCT p.id) AS total ${productJoins} ${filters.clause}`,
      filters.params
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await getPool().execute(
      `SELECT ${productSelect} ${productJoins} ${filters.clause} ORDER BY ${sort} LIMIT ${limit} OFFSET ${offset}`,
      filters.params
    );
    const imageMap = await getImages(rows.map((row) => row.id));

    res.json({
      products: rows.map((row) => mapProduct(row, imageMap.get(row.id))),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function listMyProducts(req, res, next) {
  try {
    if (!["seller", "admin"].includes(req.user.role)) {
      throw createHttpError(403, "Only sellers and admins can view managed products.");
    }

    const page = Math.max(toInteger(req.query.page || 1, "Page", { min: 1 }), 1);
    const limit = Math.min(Math.max(toInteger(req.query.limit || 24, "Limit", { min: 1 }), 1), 48);
    const offset = (page - 1) * limit;
    const mine = req.user.role !== "admin" || req.query.mine === "true";
    const filters = buildProductFilters({ ...req.query, includeInactive: "true" }, req.user, mine);
    const sort = getSortClause(req.query.sort || "newest");

    const [countRows] = await getPool().execute(
      `SELECT COUNT(DISTINCT p.id) AS total ${productJoins} ${filters.clause}`,
      filters.params
    );
    const total = Number(countRows[0]?.total || 0);
    const [rows] = await getPool().execute(
      `SELECT ${productSelect} ${productJoins} ${filters.clause} ORDER BY ${sort} LIMIT ${limit} OFFSET ${offset}`,
      filters.params
    );
    const imageMap = await getImages(rows.map((row) => row.id));

    res.json({
      products: rows.map((row) => mapProduct(row, imageMap.get(row.id))),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getCategories(req, res, next) {
  try {
    const [rows] = await getPool().execute(`
      SELECT
        c.id,
        c.name,
        c.slug,
        COUNT(p.id) AS product_count,
        (
          SELECT pi.image_url
          FROM products p2
          INNER JOIN product_images pi ON pi.product_id = p2.id
          WHERE p2.category_id = c.id AND p2.status = 'active'
          ORDER BY pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) AS image_url
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.status = 'active'
      GROUP BY c.id, c.name, c.slug
      HAVING product_count > 0
      ORDER BY c.name ASC
    `);

    res.json({
      categories: rows.map((row) => ({
        id: row.slug || row.id,
        name: row.name,
        slug: row.slug,
        count: `${Number(row.product_count)} ${Number(row.product_count) === 1 ? "item" : "items"}`,
        image:
          row.image_url ||
          "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=900&q=80",
      })),
    });
  } catch (error) {
    next(error);
  }
}

async function getProduct(req, res, next) {
  try {
    const identifier = req.params.id;
    const params = [identifier, Number(identifier) || 0];
    let statusClause = "AND p.status = 'active'";

    if (req.user?.role === "admin") {
      statusClause = "";
    } else if (req.user?.id) {
      statusClause = "AND (p.status = 'active' OR u.id = ?)";
      params.push(req.user.id);
    }

    const [rows] = await getPool().execute(
      `SELECT ${productSelect} ${productJoins} WHERE (p.slug = ? OR p.id = ?) ${statusClause} LIMIT 1`,
      params
    );

    if (!rows[0]) {
      throw createHttpError(404, "Product not found.");
    }

    if (req.user?.id) {
      await getPool().execute(
        `
          INSERT INTO recently_viewed (user_id, product_id, viewed_at)
          VALUES (?, ?, NOW())
          ON DUPLICATE KEY UPDATE viewed_at = NOW()
        `,
        [req.user.id, rows[0].id]
      );
    }

    const [imageRows] = await getPool().execute(
      "SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC",
      [rows[0].id]
    );
    const [reviewRows] = await getPool().execute(
      `
        SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name
        FROM reviews r
        INNER JOIN users u ON u.id = r.user_id
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC
        LIMIT 12
      `,
      [rows[0].id]
    );

    res.json({
      product: mapProduct(
        rows[0],
        imageRows.map((row) => row.image_url),
        reviewRows.map((row) => ({
          id: row.id,
          rating: row.rating,
          comment: row.comment || "",
          user: row.user_name,
          createdAt: row.created_at,
        }))
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function createReview(req, res, next) {
  try {
    const productId = toInteger(req.params.id, "Product ID", { min: 1 });
    const rating = toInteger(req.body.rating, "Rating", { min: 1 });
    const comment = String(req.body.comment || "").trim().slice(0, 2000);

    if (rating > 5) {
      throw createHttpError(400, "Rating must be between 1 and 5.");
    }

    const [productRows] = await getPool().execute(
      "SELECT id FROM products WHERE id = ? AND status = 'active' LIMIT 1",
      [productId]
    );

    if (!productRows[0]) {
      throw createHttpError(404, "Product not found.");
    }

    await getPool().execute(
      `
        INSERT INTO reviews (product_id, user_id, rating, comment)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), updated_at = CURRENT_TIMESTAMP
      `,
      [productId, req.user.id, rating, comment || null]
    );

    res.status(201).json({ message: "Review saved." });
  } catch (error) {
    next(error);
  }
}

async function getRecentlyViewed(req, res, next) {
  try {
    const limit = Math.min(Math.max(toInteger(req.query.limit || 8, "Limit", { min: 1 }), 1), 24);
    const [rows] = await getPool().execute(
      `
        SELECT ${productSelect}
        ${productJoins}
        INNER JOIN recently_viewed rv ON rv.product_id = p.id
        WHERE rv.user_id = ? AND p.status = 'active'
        ORDER BY rv.viewed_at DESC
        LIMIT ${limit}
      `,
      [req.user.id]
    );
    const imageMap = await getImages(rows.map((row) => row.id));

    res.json({
      products: rows.map((row) => mapProduct(row, imageMap.get(row.id))),
    });
  } catch (error) {
    next(error);
  }
}

async function getRecommendations(req, res, next) {
  try {
    const limit = Math.min(Math.max(toInteger(req.query.limit || 8, "Limit", { min: 1 }), 1), 24);
    const category = String(req.query.category || "").trim();
    const params = [];
    let where = "WHERE p.status = 'active'";

    if (category) {
      where += " AND (c.slug = ? OR c.name = ? OR c.id = ?)";
      params.push(category, category, Number(category) || 0);
    }

    const [rows] = await getPool().execute(
      `
        SELECT ${productSelect}
        ${productJoins}
        ${where}
        ORDER BY sold_count DESC, average_rating DESC, p.created_at DESC
        LIMIT ${limit}
      `,
      params
    );
    const imageMap = await getImages(rows.map((row) => row.id));

    res.json({
      products: rows.map((row) => mapProduct(row, imageMap.get(row.id))),
    });
  } catch (error) {
    next(error);
  }
}

async function insertImages(connection, productId, imageUrls) {
  const urls = imageUrls.filter(Boolean).slice(0, 12);

  for (const [index, imageUrl] of urls.entries()) {
    await connection.execute(
      "INSERT INTO product_images (product_id, image_url, alt_text, sort_order) VALUES (?, ?, ?, ?)",
      [productId, imageUrl, null, index]
    );
  }
}

async function createProduct(req, res, next) {
  const connection = await getPool().getConnection();

  try {
    if (!["seller", "admin"].includes(req.user.role)) {
      throw createHttpError(403, "Only sellers and admins can create products.");
    }

    const data = validateProductInput(req.body);
    const uploadedImages = (req.files || []).map(fileToImagePath);
    const imageUrls = [...parseList(req.body.imageUrls), ...uploadedImages];

    await connection.beginTransaction();

    const vendor = req.user.role === "seller" ? await ensureVendorForUser(connection, req.user) : await ensureVendorForUser(connection, req.user);
    const categoryId = await ensureCategory(connection, data);
    const slug = await ensureUniqueSlug(connection, "products", slugify(data.slug || data.name));
    const [result] = await connection.execute(
      `
        INSERT INTO products
          (vendor_id, category_id, name, slug, description, price, compare_at_price, stock_quantity, sku, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        vendor.id,
        categoryId,
        data.name,
        slug,
        data.description,
        data.price,
        data.compare_at_price,
        data.stock_quantity,
        data.sku,
        data.status,
      ]
    );

    await insertImages(connection, result.insertId, imageUrls);
    await connection.commit();

    req.params.id = result.insertId;
    return getProduct(req, res, next);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

async function updateProduct(req, res, next) {
  const connection = await getPool().getConnection();

  try {
    const productId = toInteger(req.params.id, "Product ID", { min: 1 });
    const product = await findProductForManagement(connection, productId);
    assertProductAccess(product, req.user);

    const data = validateProductInput(req.body, true);
    const updates = [];
    const params = [];

    await connection.beginTransaction();

    if (data.category !== undefined || data.category_id !== undefined) {
      const categoryId = await ensureCategory(connection, data);
      updates.push("category_id = ?");
      params.push(categoryId);
    }

    for (const [field, column] of [
      ["name", "name"],
      ["description", "description"],
      ["price", "price"],
      ["compare_at_price", "compare_at_price"],
      ["stock_quantity", "stock_quantity"],
      ["sku", "sku"],
      ["status", "status"],
    ]) {
      if (data[field] !== undefined) {
        updates.push(`${column} = ?`);
        params.push(data[field]);
      }
    }

    if (data.name) {
      const slug = await ensureUniqueSlug(connection, "products", slugify(data.name), productId);
      updates.push("slug = ?");
      params.push(slug);
    }

    if (updates.length) {
      params.push(productId);
      await connection.execute(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    const uploadedImages = (req.files || []).map(fileToImagePath);
    const submittedImages = [...parseList(req.body.existingImages), ...parseList(req.body.imageUrls), ...uploadedImages];

    if (req.body.existingImages !== undefined || req.body.imageUrls !== undefined || uploadedImages.length > 0) {
      await connection.execute("DELETE FROM product_images WHERE product_id = ?", [productId]);
      await insertImages(connection, productId, submittedImages);
    }

    await connection.commit();

    req.params.id = productId;
    return getProduct(req, res, next);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

async function deleteProduct(req, res, next) {
  const connection = await getPool().getConnection();

  try {
    const productId = toInteger(req.params.id, "Product ID", { min: 1 });
    const product = await findProductForManagement(connection, productId);
    assertProductAccess(product, req.user);

    await connection.execute("DELETE FROM products WHERE id = ?", [productId]);

    res.json({
      message: "Product deleted.",
    });
  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
}

module.exports = {
  createReview,
  createProduct,
  deleteProduct,
  getCategories,
  getProduct,
  getRecentlyViewed,
  getRecommendations,
  listMyProducts,
  listProducts,
  updateProduct,
};

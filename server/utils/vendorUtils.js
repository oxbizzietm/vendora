function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

async function ensureUniqueVendorSlug(connection, baseSlug) {
  const base = baseSlug || "seller";
  let slug = base;
  let count = 2;

  while (true) {
    const [rows] = await connection.execute("SELECT id FROM vendors WHERE slug = ? LIMIT 1", [slug]);

    if (rows.length === 0) {
      return slug;
    }

    slug = `${base}-${count}`;
    count += 1;
  }
}

async function findVendorForUser(connection, userId) {
  const [rows] = await connection.execute("SELECT * FROM vendors WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0] || null;
}

async function ensureVendorForUser(connection, user) {
  const existing = await findVendorForUser(connection, user.id);

  if (existing) {
    return existing;
  }

  const storeName = `${user.name}'s Store`.slice(0, 160);
  const slug = await ensureUniqueVendorSlug(connection, slugify(`${user.name}-store-${user.id}`));
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

module.exports = {
  ensureVendorForUser,
  findVendorForUser,
};

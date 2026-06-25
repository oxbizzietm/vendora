const { getPool } = require("../config/database");

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function getAddresses(req, res, next) {
  try {
    const userId = req.user.id;
    const [rows] = await getPool().execute(
      `SELECT id, label, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default
       FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at ASC`,
      [userId]
    );

    res.json({
      addresses: rows.map((row) => ({
        id: row.id,
        label: row.label,
        recipientName: row.recipient_name,
        phone: row.phone,
        addressLine1: row.address_line1,
        addressLine2: row.address_line2,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        country: row.country,
        isDefault: Boolean(row.is_default),
      })),
    });
  } catch (error) {
    next(error);
  }
}

async function createAddress(req, res, next) {
  try {
    const userId = req.user.id;
    const { label, recipientName, phone, addressLine1, addressLine2, city, state, postalCode, country, isDefault } = req.body;

    if (!recipientName || !addressLine1 || !city || !state) {
      throw createHttpError(400, "Recipient name, address line 1, city, and state are required.");
    }

    const db = getPool();

    if (isDefault) {
      await db.execute("UPDATE addresses SET is_default = FALSE WHERE user_id = ?", [userId]);
    }

    const [result] = await db.execute(
      `INSERT INTO addresses (user_id, label, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        label || null,
        recipientName,
        phone || null,
        addressLine1,
        addressLine2 || null,
        city,
        state,
        postalCode || null,
        country || "Nigeria",
        isDefault ? true : false,
      ]
    );

    res.status(201).json({
      message: "Address added.",
      address: { id: result.insertId },
    });
  } catch (error) {
    next(error);
  }
}

async function updateAddress(req, res, next) {
  try {
    const userId = req.user.id;
    const addressId = Number(req.params.id);
    const { label, recipientName, phone, addressLine1, addressLine2, city, state, postalCode, country, isDefault } = req.body;

    const db = getPool();

    const [existing] = await db.execute(
      "SELECT id FROM addresses WHERE id = ? AND user_id = ? LIMIT 1",
      [addressId, userId]
    );

    if (!existing[0]) {
      throw createHttpError(404, "Address not found.");
    }

    if (isDefault) {
      await db.execute("UPDATE addresses SET is_default = FALSE WHERE user_id = ?", [userId]);
    }

    const fields = [];
    const params = [];

    if (label !== undefined) { fields.push("label = ?"); params.push(label || null); }
    if (recipientName !== undefined) { fields.push("recipient_name = ?"); params.push(recipientName); }
    if (phone !== undefined) { fields.push("phone = ?"); params.push(phone || null); }
    if (addressLine1 !== undefined) { fields.push("address_line1 = ?"); params.push(addressLine1); }
    if (addressLine2 !== undefined) { fields.push("address_line2 = ?"); params.push(addressLine2 || null); }
    if (city !== undefined) { fields.push("city = ?"); params.push(city); }
    if (state !== undefined) { fields.push("state = ?"); params.push(state); }
    if (postalCode !== undefined) { fields.push("postal_code = ?"); params.push(postalCode || null); }
    if (country !== undefined) { fields.push("country = ?"); params.push(country); }
    if (isDefault !== undefined) { fields.push("is_default = ?"); params.push(isDefault ? true : false); }

    if (fields.length) {
      params.push(addressId);
      await db.execute(`UPDATE addresses SET ${fields.join(", ")} WHERE id = ?`, params);
    }

    res.json({ message: "Address updated." });
  } catch (error) {
    next(error);
  }
}

async function deleteAddress(req, res, next) {
  try {
    const userId = req.user.id;
    const addressId = Number(req.params.id);

    const [result] = await getPool().execute(
      "DELETE FROM addresses WHERE id = ? AND user_id = ?",
      [addressId, userId]
    );

    if (result.affectedRows === 0) {
      throw createHttpError(404, "Address not found.");
    }

    res.json({ message: "Address deleted." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getPool } = require("../config/database");
const { ensureVendorForUser } = require("../utils/vendorUtils");

const allowedRoles = ["customer", "seller", "admin"];
const publicUserFields = "id, name, email, role, phone, avatar_url, is_active, created_at, updated_at";

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateName(name) {
  const value = String(name || "").trim();

  if (value.length < 2 || value.length > 120) {
    throw createHttpError(400, "Name must be between 2 and 120 characters.");
  }

  return value;
}

function validatePassword(password) {
  const value = String(password || "");

  if (value.length < 8) {
    throw createHttpError(400, "Password must be at least 8 characters long.");
  }

  if (value.length > 72) {
    throw createHttpError(400, "Password must be 72 characters or fewer.");
  }

  return value;
}

function validateRole(role) {
  const value = String(role || "customer").trim().toLowerCase();

  if (!allowedRoles.includes(value)) {
    throw createHttpError(400, `Role must be one of: ${allowedRoles.join(", ")}.`);
  }

  return value;
}

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw createHttpError(500, "JWT_SECRET is not configured.");
  }

  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

function sendAuthResponse(res, status, user) {
  const token = signToken(user);

  res.status(status).json({
    message: status === 201 ? "Registration successful." : "Login successful.",
    token,
    user,
  });
}

async function findUserByEmail(email) {
  const [rows] = await getPool().execute(
    `SELECT ${publicUserFields}, password_hash FROM users WHERE email = ? LIMIT 1`,
    [email]
  );

  return rows[0] || null;
}

async function findPublicUserById(id) {
  const [rows] = await getPool().execute(`SELECT ${publicUserFields} FROM users WHERE id = ? LIMIT 1`, [id]);

  return rows[0] || null;
}

async function register(req, res, next) {
  try {
    const name = validateName(req.body.name);
    const email = normalizeEmail(req.body.email);
    const password = validatePassword(req.body.password);
    const role = validateRole(req.body.role);
    const phone = req.body.phone ? String(req.body.phone).trim() : null;

    if (!isValidEmail(email)) {
      throw createHttpError(400, "A valid email address is required.");
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      throw createHttpError(409, "An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await getPool().execute(
      `
        INSERT INTO users (name, email, password_hash, role, phone)
        VALUES (?, ?, ?, ?, ?)
      `,
      [name, email, passwordHash, role, phone]
    );

    if (role === "seller") {
      await ensureVendorForUser(getPool(), { id: result.insertId, name });
    }

    const user = await findPublicUserById(result.insertId);
    sendAuthResponse(res, 201, user);
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      error.status = 409;
      error.message = "An account with this email already exists.";
    }

    next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!isValidEmail(email) || !password) {
      throw createHttpError(400, "Email and password are required.");
    }

    const user = await findUserByEmail(email);

    if (!user || !user.is_active) {
      throw createHttpError(401, "Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      throw createHttpError(401, "Invalid email or password.");
    }

    delete user.password_hash;
    sendAuthResponse(res, 200, user);
  } catch (error) {
    next(error);
  }
}

async function profile(req, res, next) {
  try {
    const user = await findPublicUserById(req.user.id);

    if (!user || !user.is_active) {
      throw createHttpError(401, "Authenticated user no longer exists or is inactive.");
    }

    res.json({
      user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  profile,
  allowedRoles,
};

const jwt = require("jsonwebtoken");
const { getPool } = require("../config/database");

const publicUserFields = "id, name, email, role, phone, avatar_url, is_active, created_at, updated_at";

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return req.cookies?.token || null;
}

async function authenticate(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      throw createHttpError(401, "Authentication token is required.");
    }

    if (!process.env.JWT_SECRET) {
      throw createHttpError(500, "JWT_SECRET is not configured.");
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await getPool().execute(`SELECT ${publicUserFields} FROM users WHERE id = ? LIMIT 1`, [
      payload.id,
    ]);

    const user = rows[0];

    if (!user || !user.is_active) {
      throw createHttpError(401, "Authenticated user no longer exists or is inactive.");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      error.status = 401;
      error.message = "Invalid or expired authentication token.";
    }

    next(error);
  }
}

async function optionalAuthenticate(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return next();
    }

    if (!process.env.JWT_SECRET) {
      return next();
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await getPool().execute(`SELECT ${publicUserFields} FROM users WHERE id = ? LIMIT 1`, [
      payload.id,
    ]);
    const user = rows[0];

    if (user && user.is_active) {
      req.user = user;
    }

    return next();
  } catch {
    return next();
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createHttpError(401, "Authentication is required."));
    }

    if (!roles.includes(req.user.role)) {
      return next(createHttpError(403, "You do not have permission to access this resource."));
    }

    return next();
  };
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorizeRoles,
};

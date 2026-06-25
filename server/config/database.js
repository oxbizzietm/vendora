const mysql = require("mysql2/promise");
const { schemaMaintenanceStatements, schemaStatements } = require("../models/schema");

let pool;

const requiredDbEnv = ["DB_HOST", "DB_PORT", "DB_USER", "DB_NAME"];

function validateDbEnvironment() {
  const missing = requiredDbEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required database environment variables: ${missing.join(", ")}`);
  }

  if (!/^[A-Za-z0-9_$]+$/.test(process.env.DB_NAME)) {
    throw new Error("DB_NAME may only contain letters, numbers, underscores, and dollar signs.");
  }
}

function getDatabaseName() {
  validateDbEnvironment();
  return process.env.DB_NAME;
}

function getConnectionOptions(includeDatabase = true) {
  validateDbEnvironment();

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    ...(includeDatabase ? { database: process.env.DB_NAME } : {}),
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
  };
}

async function ensureDatabaseExists() {
  const databaseName = getDatabaseName();
  const connection = await mysql.createConnection(getConnectionOptions(false));

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(getConnectionOptions(true));
  }

  return pool;
}

async function initializeDatabase() {
  validateDbEnvironment();
  await ensureDatabaseExists();

  const db = getPool();
  const connection = await db.getConnection();

  try {
    await connection.ping();

    for (const statement of schemaStatements) {
      await connection.query(statement.sql);
    }

    for (const statement of schemaMaintenanceStatements) {
      try {
        await connection.query(statement.sql);
      } catch (error) {
        if (!statement.ignoreErrors?.includes(error.code)) {
          throw error;
        }
      }
    }

    console.log(`MySQL connected and schema ready: ${process.env.DB_NAME}`);
  } finally {
    connection.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = {
  getPool,
  initializeDatabase,
  closePool,
};

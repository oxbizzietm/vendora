const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const app = require("./app");
const { closePool, initializeDatabase } = require("./config/database");

const PORT = Number(process.env.PORT) || 5000;

let server;

async function startServer() {
  try {
    await initializeDatabase();

    server = app.listen(PORT, () => {
      console.log(`Vendora API server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Vendora API server:");
    console.error(error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down Vendora API server...`);

  if (!server) {
    await closePool();
    process.exit(0);
  }

  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
};

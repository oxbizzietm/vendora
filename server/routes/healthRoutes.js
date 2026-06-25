const express = require("express");
const { getPool } = require("../config/database");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await getPool().query("SELECT 1 AS ok");

    res.json({
      status: "ok",
      database: rows[0].ok === 1 ? "connected" : "unknown",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

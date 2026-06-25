const express = require("express");
const { getSellerAnalytics } = require("../controllers/sellerController");
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate, authorizeRoles("seller", "admin"));
router.get("/analytics", getSellerAnalytics);

module.exports = router;

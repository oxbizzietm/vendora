const express = require("express");
const {
  completeMockPayment,
  createOrder,
  getMyOrders,
  getOrderDetails,
  getSellerOrders,
  updateOrderStatus,
  validateCouponCode,
} = require("../controllers/orderController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, getMyOrders);
router.post("/coupon", authenticate, validateCouponCode);
router.post("/", authenticate, createOrder);
router.get("/seller", authenticate, getSellerOrders);
router.post("/:id/pay", authenticate, completeMockPayment);
router.put("/:id/status", authenticate, updateOrderStatus);
router.get("/:id", authenticate, getOrderDetails);

module.exports = router;

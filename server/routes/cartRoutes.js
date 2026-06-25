const express = require("express");
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controllers/cartController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, getCart);
router.post("/", authenticate, addToCart);
router.put("/:itemId", authenticate, updateCartItem);
router.delete("/clear", authenticate, clearCart);
router.delete("/:itemId", authenticate, removeCartItem);

module.exports = router;

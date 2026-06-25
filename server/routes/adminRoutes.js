const express = require("express");
const {
  getAdminSummary,
  listCategories,
  listOrders,
  listSellers,
  listUsers,
  updateSellerStatus,
  updateUserStatus,
} = require("../controllers/adminController");
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

router.get("/summary", getAdminSummary);
router.get("/users", listUsers);
router.put("/users/:id/status", updateUserStatus);
router.get("/sellers", listSellers);
router.put("/sellers/:id/status", updateSellerStatus);
router.get("/categories", listCategories);
router.get("/orders", listOrders);

module.exports = router;

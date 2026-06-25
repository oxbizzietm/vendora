const express = require("express");
const { getNotifications, markNotificationsRead } = require("../controllers/notificationController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, getNotifications);
router.put("/read", authenticate, markNotificationsRead);

module.exports = router;

const { getPool } = require("../config/database");

async function getNotifications(req, res, next) {
  try {
    const [rows] = await getPool().execute(
      `
        SELECT id, type, title, message, link_url, is_read, created_at
        FROM notifications
        WHERE user_id = ? OR role = ?
        ORDER BY created_at DESC
        LIMIT 40
      `,
      [req.user.id, req.user.role]
    );

    res.json({
      notifications: rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        message: row.message,
        linkUrl: row.link_url,
        isRead: Boolean(row.is_read),
        createdAt: row.created_at,
      })),
      unreadCount: rows.filter((row) => !row.is_read).length,
    });
  } catch (error) {
    next(error);
  }
}

async function markNotificationsRead(req, res, next) {
  try {
    await getPool().execute(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = ? OR role = ?",
      [req.user.id, req.user.role]
    );

    res.json({ message: "Notifications marked as read." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  markNotificationsRead,
};

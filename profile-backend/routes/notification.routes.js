const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { auth } = require('../middleware/auth');

// All notification routes are authenticated
router.use(auth);

// GET /api/notifications — ดึงรายการแจ้งเตือนของผู้ใช้
router.get('/', notificationController.getNotifications);

// GET /api/notifications/unread-count — ดึงจำนวนที่ยังไม่อ่าน
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/notifications/read-all — ทำเครื่องหมายว่าอ่านทั้งหมด
router.patch('/read-all', notificationController.markAllAsRead);

// PATCH /api/notifications/:id/read — ทำเครื่องหมายรายการเดียวว่าอ่านแล้ว
router.patch('/:id/read', notificationController.markAsRead);

// DELETE /api/notifications/:id — ลบการแจ้งเตือน
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;

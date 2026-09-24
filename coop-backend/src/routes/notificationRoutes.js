const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middlewares/auth');

// GET /api/notifications — การแจ้งเตือนล่าสุดของผู้ใช้ปัจจุบัน (สูงสุด 50 รายการ)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      console.warn('GET /api/notifications: Unauthorized - req.user is missing or has no id:', req.user);
      return res.status(401).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้งาน (Unauthorized)' });
    }

    // แนบ department ของคำร้องที่เกี่ยวข้อง (ถ้ามี) เพื่อให้ frontend กรองตามสาขาวิชาได้
    const [rows] = await pool.query(
      `SELECT n.*, r.department AS department
       FROM notifications n
       LEFT JOIN requests r ON r.id = n.request_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC LIMIT 50`,
      [userId]
    );
    res.json({ success: true, data: rows || [] });
  } catch (error) {
    console.error('GET /api/notifications Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
});

// PATCH /api/notifications/read-all — ทำเครื่องหมายว่าอ่านทั้งหมด
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      console.warn('PATCH /api/notifications/read-all: Unauthorized - req.user is missing or has no id:', req.user);
      return res.status(401).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้งาน (Unauthorized)' });
    }

    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
    res.json({ success: true, message: 'ทำเครื่องหมายว่าอ่านทั้งหมดเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('PATCH /api/notifications/read-all Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
});

// PATCH /api/notifications/:id/read — ทำเครื่องหมายว่าอ่านรายการเดียว
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      console.warn(`PATCH /api/notifications/${req.params.id}/read: Unauthorized - req.user is missing or has no id:`, req.user);
      return res.status(401).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้งาน (Unauthorized)' });
    }

    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    res.json({ success: true, message: 'ทำเครื่องหมายว่าอ่านเรียบร้อยแล้ว' });
  } catch (error) {
    console.error(`PATCH /api/notifications/${req.params.id}/read Error:`, error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
});

module.exports = router;

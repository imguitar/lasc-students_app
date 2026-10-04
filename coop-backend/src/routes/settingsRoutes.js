const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');

// key ที่เปิดให้ public อ่านได้ — กันการรั่วค่า settings ภายในอนาคต
const PUBLIC_KEYS = new Set(['urgent_announcement', 'contact_info']);

const parseValue = (raw) => {
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return raw;
  }
};

// GET /api/public/settings — ค่าที่เปิด public เท่านั้น (หน้าแรก /coop)
router.get('/public/settings', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (?)',
      [[...PUBLIC_KEYS]]
    );
    const data = {};
    rows.forEach((r) => { data[r.setting_key] = parseValue(r.setting_value); });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/settings (admin — all settings)
router.get('/settings', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM site_settings ORDER BY setting_key ASC');
    const data = rows.map((r) => ({ ...r, setting_value: parseValue(r.setting_value) }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/settings/:key (admin — upsert; value เป็น object จะเก็บเป็น JSON)
router.put('/settings/:key', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { value, description } = req.body;
    if (value === undefined) {
      return res.status(400).json({ success: false, message: 'กรุณาส่ง value' });
    }
    const stored = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
    await pool.query(
      `INSERT INTO site_settings (setting_key, setting_value, description) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)${description !== undefined ? ', description = VALUES(description)' : ''}`,
      [req.params.key, stored, description || null]
    );
    const [rows] = await pool.query('SELECT * FROM site_settings WHERE setting_key = ?', [req.params.key]);
    res.json({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ', data: { ...rows[0], setting_value: parseValue(rows[0]?.setting_value) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

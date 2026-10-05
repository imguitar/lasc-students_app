const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');

// key ที่เปิดให้ public อ่านได้ — กันการรั่วค่า settings ภายในอนาคต
const PUBLIC_KEYS = new Set(['urgent_announcement', 'contact_info']);

// self-heal: สร้างตาราง+seed ถ้ายังไม่มี (กัน Table doesn't exist บน env ที่ยังไม่รัน migration)
let settingsTableReady = false;
const ensureSiteSettings = async () => {
  if (settingsTableReady) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS site_settings (
    setting_key VARCHAR(100) PRIMARY KEY COMMENT 'คีย์การตั้งค่า เช่น urgent_announcement',
    setting_value TEXT NULL COMMENT 'ค่าข้อมูล (String หรือ JSON)',
    description VARCHAR(255) NULL COMMENT 'คำอธิบายการตั้งค่า',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(
    `INSERT IGNORE INTO site_settings (setting_key, setting_value, description) VALUES
     ('urgent_announcement', '{"is_active":true,"text":"ประกาศด่วน: ระบบเปิดรับคำร้องฝึกงานตั้งแต่วันที่ 1 สิงหาคม เป็นต้นไป","link_url":""}', 'แถบประกาศด่วนบนหน้าแรก'),
     ('contact_info', '{"phone":"02-XXX-XXXX","email":"contact@sskru.ac.th"}', 'ข้อมูลติดต่อส่วนหัวเว็บ')`
  );
  settingsTableReady = true;
};

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
    await ensureSiteSettings();
    const [rows] = await pool.query(
      'SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (?)',
      [[...PUBLIC_KEYS]]
    );
    const data = {};
    rows.forEach((r) => { data[r.setting_key] = parseValue(r.setting_value); });
    res.json({ success: true, data });
  } catch (error) {
    // กันหน้าแรกพัง — คืน object ว่างให้ frontend ใช้ค่า default แทน 500
    console.error('[settings] public read fail:', error.message);
    res.json({ success: true, data: {} });
  }
});

// GET /api/settings (admin — all settings)
router.get('/settings', authenticate, authorize('admin'), async (req, res) => {
  try {
    await ensureSiteSettings();
    const [rows] = await pool.query('SELECT * FROM site_settings ORDER BY setting_key ASC');
    const data = rows.map((r) => ({ ...r, setting_value: parseValue(r.setting_value) }));
    res.json({ success: true, data });
  } catch (error) {
    // กันหน้า Home Editor พัง — คืน list ว่าง ให้หน้าแสดงฟอร์ม default แทน toast แดง
    console.error('[settings] admin list fail:', error.message);
    res.json({ success: true, data: [] });
  }
});

// PUT /api/settings/:key (admin — upsert; value เป็น object จะเก็บเป็น JSON)
router.put('/settings/:key', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { value, description } = req.body;
    await ensureSiteSettings();
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

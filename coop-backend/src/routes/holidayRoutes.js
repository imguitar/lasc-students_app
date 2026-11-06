const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');
const SEED_HOLIDAYS = require('../utils/thaiHolidaysSeed');
const { isValidYMD } = require('../utils/workingDays');

// ==================== Schema (idempotent — ตรงกับ db/migrations/20261106-add-public-holidays-and-round-hours.sql) ====================
// วันหยุดนักขัตฤกษ์ที่แอดมินจัดการเองได้ ใช้ทั้งปฏิทินรายงานประจำวันและการคำนวณวันสิ้นสุดฝึกงาน
let tableReady = null;
const ensureTable = () => {
  if (!tableReady) {
    tableReady = (async () => {
      await pool.query(`CREATE TABLE IF NOT EXISTS public_holidays (
        id INT NOT NULL AUTO_INCREMENT,
        date DATE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY public_holidays_date_key (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      // คอลัมน์เปิด/ปิดการใช้งานวันหยุดรายการ (MySQL 8 ไม่มี ADD COLUMN IF NOT EXISTS จึงเช็คก่อน)
      const [cols] = await pool.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'public_holidays' AND COLUMN_NAME = 'isActive'"
      );
      if (!cols.length) {
        await pool.query('ALTER TABLE public_holidays ADD COLUMN isActive TINYINT(1) NOT NULL DEFAULT 1 AFTER name');
      }
      // ตารางว่าง (สร้างครั้งแรก) → นำเข้ารายการวันหยุดเดิมของระบบเป็นค่าตั้งต้น
      const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM public_holidays');
      if (Number(n) === 0) {
        const rows = Object.entries(SEED_HOLIDAYS).map(([date, name]) => [date, name]);
        if (rows.length) await pool.query('INSERT IGNORE INTO public_holidays (date, name) VALUES ?', [rows]);
      }
    })().catch((err) => {
      tableReady = null; // ให้ลองใหม่ครั้งถัดไป
      throw err;
    });
  }
  return tableReady;
};
ensureTable().catch(() => {});

/** ชุดวันที่วันหยุดทั้งหมด (Set ของ 'YYYY-MM-DD') — ใช้คำนวณวันทำการในไฟล์อื่น */
const getHolidaySet = async () => {
  await ensureTable();
  const [rows] = await pool.query("SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date FROM public_holidays WHERE isActive = 1");
  return new Set(rows.map((r) => r.date));
};

// GET /api/holidays?year=2026 — รายการวันหยุด (อ่านได้ทุกคน เพราะปฏิทินหน้านักศึกษาใช้ด้วย)
router.get('/holidays', async (req, res) => {
  try {
    await ensureTable();
    const year = Number(req.query.year);
    let sql = "SELECT id, DATE_FORMAT(date, '%Y-%m-%d') AS date, name, isActive FROM public_holidays";
    const params = [];
    if (year >= 1900 && year <= 3000) {
      sql += ' WHERE YEAR(date) = ?';
      params.push(year);
    }
    sql += ' ORDER BY date ASC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/holidays — เพิ่มวันหยุด { date: 'YYYY-MM-DD', name }
router.post('/admin/holidays', authenticate, authorize('admin'), async (req, res) => {
  try {
    await ensureTable();
    const date = String(req.body?.date || '').slice(0, 10);
    const name = String(req.body?.name || '').trim();
    if (!isValidYMD(date) || !name) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุวันที่และชื่อวันหยุด' });
    }
    const [dup] = await pool.query('SELECT id FROM public_holidays WHERE date = ?', [date]);
    if (dup[0]) return res.status(409).json({ success: false, message: 'มีวันหยุดในวันที่นี้อยู่แล้ว' });
    const [result] = await pool.query('INSERT INTO public_holidays (date, name) VALUES (?, ?)', [date, name]);
    res.status(201).json({ success: true, message: 'เพิ่มวันหยุดสำเร็จ', data: { id: result.insertId, date, name } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/holidays/:id — ลบวันหยุด
router.delete('/admin/holidays/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await ensureTable();
    const [result] = await pool.query('DELETE FROM public_holidays WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'ไม่พบวันหยุด' });
    res.json({ success: true, message: 'ลบวันหยุดเรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/admin/holidays/:id — เปิด/ปิดการใช้งานวันหยุดรายการนั้น { isActive }
router.patch('/admin/holidays/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await ensureTable();
    const active = req.body?.isActive ? 1 : 0;
    const [result] = await pool.query('UPDATE public_holidays SET isActive = ? WHERE id = ?', [active, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'ไม่พบวันหยุด' });
    res.json({ success: true, message: active ? 'เปิดใช้งานวันหยุดแล้ว' : 'ปิดใช้งานวันหยุดแล้ว' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/holidays/sync — ซิงค์วันหยุดของปีที่เลือกจากชุดมาตรฐาน (เพิ่มเฉพาะวันที่ยังไม่มี ไม่แตะรายการเดิม)
// body: { year } (ค.ศ.) — ชุดมาตรฐานครอบคลุมปี 2568-2570
router.post('/admin/holidays/sync', authenticate, authorize('admin'), async (req, res) => {
  try {
    await ensureTable();
    const year = Number(req.body?.year);
    const rows = Object.entries(SEED_HOLIDAYS)
      .filter(([date]) => Number(date.slice(0, 4)) === year)
      .map(([date, name]) => [date, name]);
    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'ไม่มีชุดวันหยุดมาตรฐานสำหรับปีนี้' });
    }
    const [result] = await pool.query('INSERT IGNORE INTO public_holidays (date, name) VALUES ?', [rows]);
    const added = result.affectedRows;
    res.json({
      success: true,
      message: added ? `ซิงค์วันหยุดปี ${year + 543} เพิ่ม ${added} วัน` : `วันหยุดปี ${year + 543} ครบอยู่แล้ว`,
      data: { added, total: rows.length },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
module.exports.getHolidaySet = getHolidaySet;

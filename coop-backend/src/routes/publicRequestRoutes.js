const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { publicInternals } = require('./requestRoutes');

const { handleGetSingleRequest, updateStatusHandler, isCompanyResponseTokenUsable } = publicInternals;

/**
 * Public Request Routes — สำหรับสถานประกอบการตอบรับ/ปฏิเสธคำร้องผ่านลิงก์
 * Mount: /api/public/requests
 * ทุก endpoint บังคับ responseToken ที่ออกให้ผ่าน /api/requests/:id/response-qr (admin)
 * โทเค็นมีอายุ 7 วันและใช้งานได้ครั้งเดียว
 */
const requireCompanyResponseToken = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT details FROM requests WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลคำร้อง' });
    if (!isCompanyResponseTokenUsable(rows[0].details, req.query.responseToken)) {
      return res.status(403).json({ success: false, message: 'ลิงก์ตอบรับไม่ถูกต้อง หมดอายุ หรือถูกใช้งานไปแล้ว' });
    }
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/public/requests/:id — สถานประกอบการดูรายละเอียดคำร้อง (ต้องมีโทเค็น)
router.get('/:id', requireCompanyResponseToken, handleGetSingleRequest);

// ตอบรับต้องมีลายเซ็นเสมอ (บังคับฝั่ง server ด้วย กันยิง API ข้ามหน้าเว็บ)
// ปฏิเสธไม่ต้องเซ็น
const requireSignatureForAccept = (req, res, next) => {
  const wantsAccept = req.body?.statusCode === 'COMPANY_ACCEPTED'
    || String(req.body?.status || '').includes('ตอบรับ');
  if (wantsAccept && !req.body?.signature) {
    return res.status(400).json({ success: false, message: 'กรุณาเซ็นลายมือชื่อก่อนยืนยันการตอบรับ' });
  }
  next();
};

// PATCH /api/public/requests/:id/status — สถานประกอบการตอบรับ/ปฏิเสธ (ต้องมีโทเค็น)
router.patch('/:id/status', requireCompanyResponseToken, requireSignatureForAccept, updateStatusHandler);

module.exports = router;

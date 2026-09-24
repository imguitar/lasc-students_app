const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middlewares/auth');
const {
  sendStatusNotifyEmail,
  findStudentEmail,
  isGmailConfigured,
} = require('../utils/mailer');

// POST /api/internship/status-notify — ส่งอีเมลแจ้งเตือนเมื่อสถานะคำร้องเปลี่ยน
// Body: { studentId, studentName, requestId, status, comment?, company?, position?, to? }
// ผู้รับ: ระบบค้นหาอีเมลจากตาราง user ด้วย studentId เป็นหลัก
//         (เฉพาะ admin/advisor เท่านั้นที่ส่งถึง `to` ที่ระบุเองได้)
router.post('/status-notify', authenticate, async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      requestId,
      status,
      comment,
      company,
      position,
      to,
    } = req.body || {};

    if (!status) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุสถานะ (status)' });
    }
    if (!studentId && !to) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ studentId หรืออีเมลผู้รับ' });
    }

    // นักศึกษาส่งแจ้งเตือนได้เฉพาะคำร้องของตัวเอง
    if (req.user?.role === 'student' && studentId && String(req.user.username) !== String(studentId)) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์แจ้งเตือนคำร้องของผู้อื่น' });
    }

    // หาอีเมลผู้รับ — ค่า `to` ใช้ได้เฉพาะ admin/advisor เพื่อกันระบบถูกใช้เป็น open relay
    let recipient = null;
    if (to && ['admin', 'advisor'].includes(req.user?.role)) {
      recipient = String(to).trim();
    } else {
      recipient = await findStudentEmail(studentId);
    }

    if (!recipient) {
      return res.status(404).json({ success: false, message: 'ไม่พบอีเมลผู้รับในระบบ' });
    }

    // ถ้าระบุ requestId ให้เติมข้อมูลบริษัท/ตำแหน่งจากฐานข้อมูลอัตโนมัติ
    let resolvedCompany = company;
    let resolvedPosition = position;
    if (requestId && (!resolvedCompany || !resolvedPosition)) {
      try {
        const [rows] = await pool.query('SELECT company, position FROM requests WHERE id = ?', [requestId]);
        resolvedCompany = resolvedCompany || rows[0]?.company;
        resolvedPosition = resolvedPosition || rows[0]?.position;
      } catch (_) {}
    }

    const result = await sendStatusNotifyEmail({
      to: recipient,
      studentName,
      studentId,
      requestId,
      status,
      comment,
      company: resolvedCompany,
      position: resolvedPosition,
    });

    if (!result.success) {
      const statusCode = result.simulated ? 200 : 502;
      return res.status(statusCode).json({
        success: result.simulated,
        simulated: Boolean(result.simulated),
        message: result.simulated
          ? 'ยังไม่ได้ตั้งค่า Gmail OAuth2 — ไม่ได้ส่งอีเมลจริง (ดู console)'
          : `ส่งอีเมลไม่สำเร็จ: ${result.error || result.reason}`,
        ...result,
      });
    }

    return res.json({ success: true, message: `ส่งอีเมลแจ้งเตือนถึง ${recipient} แล้ว`, messageId: result.messageId });
  } catch (error) {
    console.error('[Internship] status-notify error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/internship/status-notify/config — ตรวจว่า Gmail OAuth2 ตั้งค่าครบไหม (debug)
router.get('/status-notify/config', authenticate, (req, res) => {
  res.json({ success: true, gmailConfigured: isGmailConfigured() });
});

module.exports = router;

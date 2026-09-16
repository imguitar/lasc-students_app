const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticate } = require('../middlewares/auth');
const { toFrontendUser, USER_SELECT_SQL } = require('../utils/helpers');

// ---------------------------------------------------------------
// SSO จากระบบฐานข้อมูลนักศึกษา (profile)
// ผู้ใช้ล็อกอินที่ระบบ profile แล้วได้ตั๋วอายุสั้นมาแลกเป็น token ของระบบนี้
// ตั๋วใช้ได้ครั้งเดียว กัน replay ด้วยการจำ jti ที่ใช้ไปแล้วจนกว่าจะหมดอายุ
// ---------------------------------------------------------------
const SSO_TICKET_PURPOSE = 'coop-sso';
const usedTicketIds = new Map(); // jti -> เวลาหมดอายุ (ms)

const rememberTicketId = (jti, expSeconds) => {
  const now = Date.now();
  for (const [id, expiresAt] of usedTicketIds) {
    if (expiresAt <= now) usedTicketIds.delete(id);
  }
  usedTicketIds.set(jti, expSeconds ? expSeconds * 1000 : now + 120000);
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'กรุณากรอก username และ password' });
    }

    const [rows] = await pool.query(
      `${USER_SELECT_SQL} WHERE u.username = ? OR u.email = ? GROUP BY u.id`,
      [email, email]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'บัญชีถูกระงับการใช้งาน' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ', token, user: toFrontendUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`${USER_SELECT_SQL} WHERE u.id = ? GROUP BY u.id`, [req.user.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
    res.json({ success: true, user: toFrontendUser(rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/sso — แลกตั๋วจากระบบ profile เป็น token ของระบบศูนย์ฝึก
router.post('/sso', async (req, res) => {
  try {
    const secret = process.env.SSO_SHARED_SECRET;
    if (!secret) {
      return res.status(503).json({ success: false, message: 'ยังไม่ได้ตั้งค่า SSO_SHARED_SECRET' });
    }

    const { ticket } = req.body;
    if (!ticket) {
      return res.status(400).json({ success: false, message: 'ไม่พบตั๋วเข้าใช้งาน' });
    }

    let payload;
    try {
      payload = jwt.verify(ticket, secret);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'ตั๋วไม่ถูกต้องหรือหมดอายุแล้ว' });
    }

    if (payload.purpose !== SSO_TICKET_PURPOSE) {
      return res.status(401).json({ success: false, message: 'ตั๋วนี้ไม่ได้ออกมาเพื่อเข้าระบบศูนย์ฝึก' });
    }
    if (!payload.jti || usedTicketIds.has(payload.jti)) {
      return res.status(401).json({ success: false, message: 'ตั๋วนี้ถูกใช้ไปแล้ว กรุณาเลือกเมนูใหม่อีกครั้ง' });
    }

    // อ่านผู้ใช้จากฐานข้อมูลร่วม ไม่เชื่อ role ที่ติดมากับตั๋ว
    const [rows] = await pool.query(`${USER_SELECT_SQL} WHERE u.id = ? GROUP BY u.id`, [payload.userId]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งานในระบบศูนย์ฝึก' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'บัญชีถูกระงับการใช้งาน' });
    }

    rememberTicketId(payload.jti, payload.exp);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ success: true, message: 'เข้าสู่ระบบศูนย์ฝึกสำเร็จ', token, user: toFrontendUser(user) });
  } catch (error) {
    console.error('SSO error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

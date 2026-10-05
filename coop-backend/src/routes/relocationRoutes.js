const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middlewares/auth');
const { createNotification, findUserIdByUsername, findUserIdsByRole } = require('../utils/notificationService');
const { sendEmail } = require('../utils/mailer');

// ==================== Schema (idempotent — ตรงกับ db/migrations/20261004-create-relocation-requests.sql) ====================
const FULL_STATUS_ENUM = `ENUM(
  'submitted_waiting_company',
  'company_approved_waiting_advisor',
  'submitted_waiting_advisor',
  'advisor_approved_waiting_admin',
  'admin_approved_generating_request_letter',
  'waiting_company_acceptance',
  'company_accepted_generating_dispatch_letter',
  'completed',
  'rejected'
)`;

const ensureTable = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS internship_relocation_requests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    internship_request_id INT UNSIGNED NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    return_letter_file VARCHAR(255) NULL,
    return_letter_name VARCHAR(255) NULL,
    new_company_name VARCHAR(255) NOT NULL,
    new_company_address TEXT NOT NULL,
    new_company_contact VARCHAR(255) NOT NULL,
    mentor_name VARCHAR(255) NULL,
    mentor_position VARCHAR(255) NULL,
    mentor_email VARCHAR(255) NULL,
    mentor_phone VARCHAR(50) NULL,
    days_trained INT DEFAULT 0,
    days_remaining INT DEFAULT 0,
    status ${FULL_STATUS_ENUM} NOT NULL DEFAULT 'submitted_waiting_company',
    advisor_comment TEXT NULL,
    admin_comment TEXT NULL,
    new_request_letter_file VARCHAR(255) NULL,
    new_acceptance_letter_file VARCHAR(255) NULL,
    new_dispatch_letter_file VARCHAR(255) NULL,
    student_signature LONGTEXT NULL COMMENT 'ลายเซ็นดิจิทัลนักศึกษา (data-url PNG)',
    company_token VARCHAR(64) NULL COMMENT 'one-time token สำหรับบริษัทเดิมลงนามยินยอม',
    company_signer_name VARCHAR(255) NULL,
    company_signer_position VARCHAR(255) NULL,
    company_signature LONGTEXT NULL,
    company_signed_at DATETIME NULL,
    company_token_used_at DATETIME NULL,
    advisor_signature LONGTEXT NULL,
    advisor_signed_at DATETIME NULL,
    dean_signature LONGTEXT NULL,
    dean_signed_at DATETIME NULL,
    dean_decision VARCHAR(50) NULL,
    dean_token VARCHAR(64) NULL COMMENT 'one-time token สำหรับคณบดีลงนามอนุญาตผ่านลิงก์',
    dean_token_used_at DATETIME NULL,
    acceptance_token VARCHAR(64) NULL COMMENT 'one-time token สำหรับสถานประกอบการใหม่ตอบรับ',
    acceptance_token_used_at DATETIME NULL,
    acceptance_signer_name VARCHAR(255) NULL,
    acceptance_signer_position VARCHAR(255) NULL,
    acceptance_signature LONGTEXT NULL,
    acceptance_signed_at DATETIME NULL,
    acceptance_department VARCHAR(255) NULL COMMENT 'แผนก/ฝ่ายที่สถานประกอบการใหม่มอบหมาย',
    acceptance_allowance VARCHAR(255) NULL COMMENT 'เบี้ยเลี้ยงที่ให้ เช่น "ไม่มีเบี้ยเลี้ยง" หรือ "3,000 บาท/เดือน"',
    acceptance_preparations TEXT NULL COMMENT 'สิ่งของ/เอกสารที่ให้นักศึกษาเตรียม (สถานประกอบการใหม่ระบุตอนตอบรับ)',
    acceptance_evaluator_email VARCHAR(255) NULL COMMENT 'อีเมลสำหรับรับแบบประเมินอัตโนมัติ',
    acceptance_proof_file VARCHAR(255) NULL COMMENT 'ไฟล์หลักฐาน/หนังสือตอบรับที่บริษัทใหม่แนบเองตอนตอบรับ (ไม่บังคับ)',
    acceptance_proof_name VARCHAR(255) NULL,
    new_addr_house VARCHAR(50) NULL,
    new_addr_moo VARCHAR(50) NULL,
    new_addr_road VARCHAR(255) NULL,
    new_addr_tambon VARCHAR(255) NULL,
    new_addr_amphur VARCHAR(255) NULL,
    new_addr_province VARCHAR(255) NULL,
    new_addr_postal VARCHAR(20) NULL,
    new_addr_phone VARCHAR(50) NULL,
    new_addr_fax VARCHAR(50) NULL,
    semester VARCHAR(50) NULL,
    academic_year VARCHAR(20) NULL,
    student_phone VARCHAR(50) NULL,
    new_start_date DATE NULL COMMENT 'วันที่เริ่มฝึกงาน ณ ที่ใหม่ (แอดมินระบุตอนออกหนังสือ)',
    new_end_date DATE NULL COMMENT 'วันที่สิ้นสุดการฝึกงาน ณ ที่ใหม่',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_relocation_student (student_id),
    INDEX idx_relocation_request (internship_request_id),
    INDEX idx_relocation_status (status),
    INDEX idx_relocation_company_token (company_token)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  // ตารางเดิมที่มีอยู่แล้ว — เพิ่มคอลัมน์ลายเซ็น/token และขยาย enum (idempotent)
  await pool.query(`ALTER TABLE internship_relocation_requests MODIFY COLUMN status ${FULL_STATUS_ENUM} NOT NULL DEFAULT 'submitted_waiting_company'`).catch(() => {});
  // หนังสือส่งตัวกลับไม่บังคับแล้ว — สถานประกอบการใหม่แนบเอกสารเองตอนตอบรับได้
  await pool.query('ALTER TABLE internship_relocation_requests MODIFY COLUMN return_letter_file VARCHAR(255) NULL').catch(() => {});
  const addCols = [
    'student_signature LONGTEXT NULL',
    'company_token VARCHAR(64) NULL',
    'company_signer_name VARCHAR(255) NULL',
    'company_signer_position VARCHAR(255) NULL',
    'company_signature LONGTEXT NULL',
    'company_signed_at DATETIME NULL',
    'company_token_used_at DATETIME NULL',
    'advisor_signature LONGTEXT NULL',
    'advisor_signed_at DATETIME NULL',
    'dean_signature LONGTEXT NULL',
    'dean_signed_at DATETIME NULL',
    'dean_decision VARCHAR(50) NULL',
    'dean_token VARCHAR(64) NULL',
    'dean_token_used_at DATETIME NULL',
    'acceptance_token VARCHAR(64) NULL',
    'acceptance_token_used_at DATETIME NULL',
    'acceptance_signer_name VARCHAR(255) NULL',
    'acceptance_signer_position VARCHAR(255) NULL',
    'acceptance_signature LONGTEXT NULL',
    'acceptance_signed_at DATETIME NULL',
    'acceptance_department VARCHAR(255) NULL',
    'acceptance_allowance VARCHAR(255) NULL',
    'acceptance_preparations TEXT NULL',
    'acceptance_evaluator_email VARCHAR(255) NULL',
    'acceptance_proof_file VARCHAR(255) NULL',
    'acceptance_proof_name VARCHAR(255) NULL',
    'new_addr_house VARCHAR(50) NULL',
    'new_addr_moo VARCHAR(50) NULL',
    'new_addr_road VARCHAR(255) NULL',
    'new_addr_tambon VARCHAR(255) NULL',
    'new_addr_amphur VARCHAR(255) NULL',
    'new_addr_province VARCHAR(255) NULL',
    'new_addr_postal VARCHAR(20) NULL',
    'new_addr_phone VARCHAR(50) NULL',
    'new_addr_fax VARCHAR(50) NULL',
    'semester VARCHAR(50) NULL',
    'academic_year VARCHAR(20) NULL',
    'student_phone VARCHAR(50) NULL',
    'mentor_name VARCHAR(255) NULL',
    'mentor_position VARCHAR(255) NULL',
    'mentor_email VARCHAR(255) NULL',
    'mentor_phone VARCHAR(50) NULL',
    'new_start_date DATE NULL',
    'new_end_date DATE NULL',
    'relocation_round INT UNSIGNED DEFAULT 1'
  ];
  // MySQL 8 ไม่รองรับ ADD COLUMN IF NOT EXISTS — เช็ค information_schema ก่อนเพิ่ม (idempotent, ใช้ได้ทั้ง MySQL/MariaDB)
  const [colRows] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'internship_relocation_requests'`
  );
  const existingCols = new Set(colRows.map((c) => c.COLUMN_NAME));
  for (const col of addCols) {
    if (!existingCols.has(col.split(' ')[0])) {
      await pool.query(`ALTER TABLE internship_relocation_requests ADD COLUMN ${col}`).catch(() => {});
    }
  }
};
let tableReady = false;
const withTable = async (fn) => {
  if (!tableReady) { await ensureTable(); tableReady = true; }
  return fn();
};

// ==================== อัปโหลดไฟล์ (แพทเทิร์นเดียวกับเอกสารนิเทศ) ====================
const DOC_MIME = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg' };
const DOC_DIR = path.join(__dirname, '..', '..', 'uploads', 'relocations');
const MAX_DOC_BYTES = 10 * 1024 * 1024;

const saveDataUrlFile = async (dataUrl, prefix) => {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!match) return { error: 'รองรับเฉพาะไฟล์ PDF, PNG, JPG เท่านั้น' };
  const ext = DOC_MIME[match[1].toLowerCase()];
  if (!ext) return { error: 'รองรับเฉพาะไฟล์ PDF, PNG, JPG เท่านั้น' };
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_DOC_BYTES) return { error: 'ไฟล์ต้องมีขนาดไม่เกิน 10MB' };
  await fs.promises.mkdir(DOC_DIR, { recursive: true });
  const filename = `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  await fs.promises.writeFile(path.join(DOC_DIR, filename), buffer);
  return { url: `/uploads/relocations/${filename}` };
};

const STATUS_LABEL = {
  submitted_waiting_company: 'ยื่นคำร้องแล้ว / รอบริษัทเดิมลงนามยินยอม',
  company_approved_waiting_advisor: 'บริษัทเดิมยินยอมแล้ว / รออาจารย์ที่ปรึกษาพิจารณา',
  submitted_waiting_advisor: 'ยื่นคำร้องแล้ว / รออาจารย์ที่ปรึกษาพิจารณา',
  advisor_approved_waiting_admin: 'อาจารย์อนุญาตแล้ว / รอสำนักงานคณบดีดำเนินการ',
  admin_approved_generating_request_letter: 'อนุมัติแล้ว / กำลังออกหนังสือขอความอนุเคราะห์',
  waiting_company_acceptance: 'รอแบบตอบรับจากสถานประกอบการใหม่',
  company_accepted_generating_dispatch_letter: 'ตอบรับแล้ว / กำลังออกหนังสือส่งตัวใหม่',
  completed: 'เสร็จสิ้น — ออกหนังสือส่งตัวฉบับใหม่เรียบร้อย',
  rejected: 'ไม่อนุมัติ / ตีกลับคำร้อง'
};

// ดึงข้อมูลร่วมกับคำร้องเดิมเพื่อให้ UI แสดงบริบท (บริษัทเดิม/สาขา)
const listQuery = `
  SELECT rr.*, r.studentName, r.department, r.company AS old_company, r.position AS old_position,
         COALESCE(JSON_UNQUOTE(JSON_EXTRACT(r.details, '$.studentPhoto.dataUrl')), p.avatar_url) AS student_avatar
  FROM internship_relocation_requests rr
  LEFT JOIN requests r ON r.id = rr.internship_request_id
  LEFT JOIN profile p ON p.profile_id = r.studentId
`;

const notifyAdmins = async (payload) => {
  try {
    const adminIds = await findUserIdsByRole('admin');
    await Promise.all((adminIds || []).map((id) => createNotification({ userId: id, ...payload })));
  } catch (e) { console.error('[Relocation] notify admins fail:', e.message); }
};

const notifyStudent = async (studentId, payload) => {
  try {
    const uid = await findUserIdByUsername(studentId);
    if (uid) await createNotification({ userId: uid, ...payload });
  } catch (e) { console.error('[Relocation] notify student fail:', e.message); }
};

// ระบบไม่ได้ผูกอาจารย์ที่ปรึกษากับนักศึกษารายคน — แจ้งอาจารย์ทุกคน (หน้า list กรองตามภาควิชาอยู่แล้ว)
const notifyAdvisors = async (payload) => {
  try {
    const advisorIds = await findUserIdsByRole('advisor');
    await Promise.all((advisorIds || []).map((id) => createNotification({ userId: id, ...payload })));
  } catch (e) { console.error('[Relocation] notify advisors fail:', e.message); }
};

// ==================== STUDENT: ยื่นคำร้อง ====================
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'เฉพาะนักศึกษาเท่านั้น' });
    }
    const {
      internship_request_id, reason, new_company_name, new_company_address,
      new_company_contact, days_trained, days_remaining,
      mentor_name, mentor_position, mentor_email, mentor_phone,
      return_letter_name, return_letter_data_url,
      student_signature_data_url,
      new_addr_house, new_addr_moo, new_addr_road, new_addr_tambon, new_addr_amphur,
      new_addr_province, new_addr_postal, new_addr_phone, new_addr_fax,
      semester, academic_year, student_phone
    } = req.body || {};

    // รวมข้อมูลหัวหน้าหน่วยงาน/ผู้ดูแลเป็นช่องเดียวสำหรับคอลัมน์เดิม (แสดงผลย่อ + ความเข้ากันได้)
    const contactLine = new_company_contact?.trim()
      || [mentor_name, mentor_position, mentor_phone, mentor_email].map((v) => (v || '').trim()).filter(Boolean).join(' · ');
    if (!internship_request_id || !reason?.trim() || !new_company_name?.trim() || !contactLine) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน (เหตุผล/บริษัทใหม่/หัวหน้าหน่วยงาน)' });
    }
    if (mentor_email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mentor_email.trim())) {
      return res.status(400).json({ success: false, message: 'รูปแบบอีเมลหัวหน้าหน่วยงานไม่ถูกต้อง' });
    }
    // เบอร์ติดต่อที่ใหม่: ฟอร์มไม่ถามเบอร์บริษัทแล้ว — ใช้เบอร์หัวหน้าหน่วยงานแทนถ้ามี
    const contactPhone = (new_addr_phone || '').trim() || (mentor_phone || '').trim() || null;
    if (!/^data:image\/png;base64,/.test(student_signature_data_url || '')) {
      return res.status(400).json({ success: false, message: 'กรุณาลงลายมือชื่อดิจิทัลก่อนยื่นคำร้อง' });
    }

    // คำร้องต้องเป็นของนักศึกษาคนนี้จริง และต้อง "ออกฝึกงานแล้ว" เท่านั้น
    const [reqRows] = await pool.query('SELECT id, studentId, status FROM requests WHERE id = ?', [internship_request_id]);
    if (!reqRows[0] || String(reqRows[0].studentId) !== String(req.user.username)) {
      return res.status(403).json({ success: false, message: 'ไม่พบคำร้องฝึกงานของคุณ' });
    }
    if (!['ออกฝึกงาน', 'กำลังออกฝึกงาน'].includes(String(reqRows[0].status || '').trim())) {
      return res.status(400).json({ success: false, message: 'ขอเปลี่ยนสถานที่ได้เฉพาะช่วงที่ออกฝึกงานแล้วเท่านั้น' });
    }

    // หนังสือส่งตัวกลับเป็นตัวเลือก (สถานประกอบการใหม่แนบเอกสารเองได้ตอนตอบรับ)
    let returnLetterUrl = null;
    if (return_letter_data_url) {
      const saved = await saveDataUrlFile(return_letter_data_url, `return-${internship_request_id}`);
      if (saved.error) return res.status(400).json({ success: false, message: saved.error });
      returnLetterUrl = saved.url;
    }

    await withTable(async () => {
      // ป้องกันยื่นซ้ำเฉพาะตอนที่ยังมีคำร้องอยู่ระหว่างดำเนินการ — รอบที่ "เสร็จสิ้น/ถูกปฏิเสธ" แล้วยื่นใหม่ได้
      const [dupes] = await pool.query(
        "SELECT id FROM internship_relocation_requests WHERE internship_request_id = ? AND status NOT IN ('rejected','completed') LIMIT 1",
        [internship_request_id]
      );
      if (dupes[0]) throw Object.assign(new Error('มีคำร้องขอเปลี่ยนสถานที่ฝึกงานที่กำลังดำเนินการอยู่แล้ว'), { httpStatus: 409 });

      // ลำดับรอบการย้าย (1, 2, 3...) ต่อ internship request นี้ — เก็บประวัติทุกรอบ
      const [roundRows] = await pool.query(
        'SELECT COALESCE(MAX(relocation_round), 0) + 1 AS nextRound FROM internship_relocation_requests WHERE internship_request_id = ?',
        [internship_request_id]
      );
      const relocationRound = roundRows[0]?.nextRound || 1;

      // one-time token สำหรับลิงก์/QR ให้บริษัทเดิมลงนาม
      const companyToken = crypto.randomBytes(24).toString('hex');
      // รวมที่อยู่ใหม่เป็นบรรทัดเดียวสำหรับแสดงผลย่อ (คอลัมน์แยกเก็บตามแบบบันทึกข้อความ)
      const composedAddress = [
        new_addr_house && `เลขที่ ${new_addr_house}`,
        new_addr_moo && `หมู่ ${new_addr_moo}`,
        new_addr_road && `ถ.${new_addr_road}`,
        new_addr_tambon && `ต.${new_addr_tambon}`,
        new_addr_amphur && `อ.${new_addr_amphur}`,
        new_addr_province && `จ.${new_addr_province}`,
        new_addr_postal
      ].filter(Boolean).join(' ') || (new_company_address || '').trim();

      const [result] = await pool.query(
        `INSERT INTO internship_relocation_requests
         (internship_request_id, student_id, reason, return_letter_file, return_letter_name,
          new_company_name, new_company_address, new_company_contact, days_trained, days_remaining,
          status, student_signature, company_token,
          new_addr_house, new_addr_moo, new_addr_road, new_addr_tambon, new_addr_amphur,
          new_addr_province, new_addr_postal, new_addr_phone, new_addr_fax,
          semester, academic_year, student_phone,
          mentor_name, mentor_position, mentor_email, mentor_phone, relocation_round)
         VALUES (?,?,?,?,?,?,?,?,?,?, 'submitted_waiting_company', ?, ?, ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, ?)`,
        [internship_request_id, String(req.user.username), reason.trim(), returnLetterUrl,
         returnLetterUrl ? String(return_letter_name || 'หนังสือส่งตัวกลับ').slice(0, 255) : null,
         new_company_name.trim(), composedAddress, contactLine,
         Number(days_trained) || 0, Number(days_remaining) || 0,
         student_signature_data_url, companyToken,
         new_addr_house || null, new_addr_moo || null, new_addr_road || null,
         new_addr_tambon || null, new_addr_amphur || null, new_addr_province || null,
         new_addr_postal || null, contactPhone, new_addr_fax || null,
         semester || null, academic_year || null, student_phone || null,
         mentor_name?.trim() || null, mentor_position?.trim() || null,
         mentor_email?.trim() || null, mentor_phone?.trim() || null, relocationRound]
      );
      res.status(201).json({ success: true, data: { id: result.insertId, company_token: companyToken } });
    });
  } catch (error) {
    res.status(error.httpStatus || 500).json({ success: false, message: error.message });
  }
});

// ==================== LIST (student=ตัวเอง / advisor+admin=ทั้งหมดตามสถานะ) ====================
router.get('/', authenticate, async (req, res) => {
  try {
    await withTable(async () => {
      const role = req.user.role;
      let where = '';
      const params = [];
      if (role === 'student') { where = 'WHERE rr.student_id = ?'; params.push(String(req.user.username)); }
      else if (role === 'advisor') { where = "WHERE rr.status IN ('company_approved_waiting_advisor','submitted_waiting_advisor','advisor_approved_waiting_admin','rejected')"; }
      else if (role !== 'admin') { return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์' }); }
      const [rows] = await pool.query(`${listQuery} ${where} ORDER BY rr.created_at DESC`, params);
      res.json({ success: true, data: rows });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ADVISOR: อนุญาต / ไม่อนุญาต ====================
router.patch('/:id/advisor-review', authenticate, async (req, res) => {
  try {
    if (!['advisor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'เฉพาะอาจารย์ที่ปรึกษาเท่านั้น' });
    }
    const { approve, comment, signature_data_url } = req.body || {};
    const [rows] = await pool.query('SELECT * FROM internship_relocation_requests WHERE id = ?', [req.params.id]);
    const rel = rows[0];
    if (!rel) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
    if (!['company_approved_waiting_advisor', 'submitted_waiting_advisor'].includes(rel.status)) {
      return res.status(409).json({ success: false, message: 'คำร้องนี้ถูกพิจารณาไปแล้วหรือยังรอการลงนามจากบริษัทเดิม' });
    }
    // อนุญาตต้องมีลายเซ็นดิจิทัลของอาจารย์
    if (approve && !/^data:image\/png;base64,/.test(signature_data_url || '')) {
      return res.status(400).json({ success: false, message: 'กรุณาลงลายมือชื่อดิจิทัลเพื่อยืนยันการอนุญาต' });
    }
    const next = approve ? 'advisor_approved_waiting_admin' : 'rejected';
    await pool.query(
      'UPDATE internship_relocation_requests SET status = ?, advisor_comment = ?, advisor_signature = ?, advisor_signed_at = ? WHERE id = ?',
      [next, comment || null, approve ? signature_data_url : null, approve ? new Date() : null, rel.id]);

    if (approve) {
      await notifyAdmins({
        type: 'relocation_status', title: 'คำร้องขอเปลี่ยนสถานที่ฝึกงานรอดำเนินการ',
        message: `อาจารย์อนุญาตคำร้องของ ${rel.student_id} → ${rel.new_company_name} รอสำนักงานคณบดีดำเนินการ`,
        link: '/admin-dashboard/relocations', requestId: rel.internship_request_id
      });
    }
    await notifyStudent(rel.student_id, {
      type: 'relocation_status',
      title: approve ? 'อาจารย์อนุญาตคำร้องเปลี่ยนสถานที่ฝึกงาน' : 'คำร้องเปลี่ยนสถานที่ฝึกงานไม่ได้รับอนุญาต',
      message: approve
        ? `คำร้องย้ายไป ${rel.new_company_name} ได้รับอนุญาตจากอาจารย์แล้ว รอสำนักงานคณบดีดำเนินการ`
        : `คำร้องถูกตีกลับ${comment ? `: ${comment}` : ''}`,
      link: '/dashboard/my-requests', requestId: rel.internship_request_id
    });

    res.json({ success: true, status: next });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ADMIN: ขั้นตอนทีละสถานะ ====================
const adminOnly = (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
    return false;
  }
  return true;
};

// นับวันทำการ (จันทร์–เสาร์ ไม่รวมอาทิตย์) ระหว่างวันที่ — ใช้คำนวณวัน/ชั่วโมงฝึกงานคงเหลือ
const countWorkDays = (start, end) => {
  let d = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  let n = 0;
  while (d <= e) { if (d.getDay() !== 0) n += 1; d.setDate(d.getDate() + 1); }
  return n;
};

const transition = async (req, res, { from, to, fileField, filePrefix, notify, extra, requireDates }) => {
  const [rows] = await pool.query('SELECT * FROM internship_relocation_requests WHERE id = ?', [req.params.id]);
  const rel = rows[0];
  if (!rel) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
  if (rel.status !== from) {
    return res.status(409).json({ success: false, message: `สถานะปัจจุบันคือ "${STATUS_LABEL[rel.status] || rel.status}" — ไม่สามารถดำเนินการขั้นนี้ได้` });
  }

  const updates = ['status = ?'];
  const params = [to];

  // บังคับระบุช่วงวันฝึกงานจริงก่อนออกหนังสือ (ขอความอนุเคราะห์ / ส่งตัว) — เก็บไว้ให้บริษัทใหม่เห็นในหน้าตอบรับ
  if (requireDates) {
    const sd = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.new_start_date || '') ? req.body.new_start_date : null;
    const ed = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.new_end_date || '') ? req.body.new_end_date : null;
    if (sd || ed) {
      if (!sd || !ed || new Date(ed) < new Date(sd)) {
        return res.status(400).json({ success: false, message: 'ช่วงวันฝึกงานไม่ถูกต้อง — วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น' });
      }
      updates.push('new_start_date = ?', 'new_end_date = ?', 'days_remaining = ?');
      params.push(sd, ed, countWorkDays(sd, ed));
    } else if (!rel.new_start_date || !rel.new_end_date) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุวันที่เริ่มฝึกงานและวันที่สิ้นสุด ณ สถานประกอบการใหม่' });
    }
  }

  if (fileField) {
    const { file_name, file_data_url } = req.body || {};
    if (!file_data_url) return res.status(400).json({ success: false, message: 'กรุณาแนบไฟล์เอกสาร' });
    const saved = await saveDataUrlFile(file_data_url, `${filePrefix}-${rel.id}`);
    if (saved.error) return res.status(400).json({ success: false, message: saved.error });
    updates.push(`${fileField} = ?`);
    params.push(saved.url);
    void file_name;
  }

  const { comment } = req.body || {};
  if (comment !== undefined) { updates.push('admin_comment = ?'); params.push(comment || null); }
  if (extra) for (const [k, v] of Object.entries(extra)) { updates.push(`${k} = ?`); params.push(v); }

  params.push(rel.id);
  await pool.query(`UPDATE internship_relocation_requests SET ${updates.join(', ')} WHERE id = ?`, params);

  if (notify) await notify(rel);

  const [updated] = await pool.query('SELECT * FROM internship_relocation_requests WHERE id = ?', [rel.id]);
  res.json({ success: true, data: updated[0] });
};

// ขั้น 1: อนุมัติคำร้อง (คณบดีเห็นชอบ — ต้องมีลายเซ็น/บันทึกการตัดสิน)
router.patch('/:id/admin-approve', authenticate, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;
    const { decision, dean_signature_data_url } = req.body || {};
    if (!['allow', 'deny'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกผลพิจารณา อนุญาต/ไม่อนุญาต' });
    }
    if (!/^data:image\/png;base64,/.test(dean_signature_data_url || '')) {
      return res.status(400).json({ success: false, message: 'กรุณาลงลายมือชื่อดิจิทัล (คณบดี/ผู้บันทึกแทน)' });
    }
    if (decision === 'deny') {
      const [rows] = await pool.query('SELECT * FROM internship_relocation_requests WHERE id = ?', [req.params.id]);
      const rel = rows[0];
      if (!rel) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
      if (rel.status !== 'advisor_approved_waiting_admin') {
        return res.status(409).json({ success: false, message: `สถานะปัจจุบันคือ "${STATUS_LABEL[rel.status] || rel.status}"` });
      }
      await pool.query(
        "UPDATE internship_relocation_requests SET status='rejected', dean_decision='deny', dean_signature=?, dean_signed_at=?, admin_comment=? WHERE id=?",
        [dean_signature_data_url, new Date(), req.body?.comment || null, rel.id]);
      await notifyStudent(rel.student_id, {
        type: 'relocation_status', title: 'คำร้องเปลี่ยนสถานที่ฝึกงานไม่ได้รับอนุญาต',
        message: 'คณบดีไม่อนุญาตให้เปลี่ยนสถานที่ฝึกงาน',
        link: '/dashboard/my-requests', requestId: rel.internship_request_id
      });
      return res.json({ success: true, status: 'rejected' });
    }

    const [rows] = await pool.query('SELECT * FROM internship_relocation_requests WHERE id = ?', [req.params.id]);
    const rel = rows[0];
    if (!rel) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
    if (rel.status !== 'advisor_approved_waiting_admin') {
      return res.status(409).json({ success: false, message: `สถานะปัจจุบันคือ "${STATUS_LABEL[rel.status] || rel.status}"` });
    }
    await pool.query(
      "UPDATE internship_relocation_requests SET status='admin_approved_generating_request_letter', dean_decision='allow', dean_signature=?, dean_signed_at=?, admin_comment=? WHERE id=?",
      [dean_signature_data_url, new Date(), req.body?.comment || null, rel.id]);
    await notifyStudent(rel.student_id, {
      type: 'relocation_status', title: 'คณบดีอนุมัติคำร้องเปลี่ยนสถานที่ฝึกงาน',
      message: `คำร้องย้ายไป ${rel.new_company_name} ได้รับอนุมัติ — กำลังออกหนังสือขอความอนุเคราะห์`,
      link: '/dashboard/my-requests', requestId: rel.internship_request_id
    });
    res.json({ success: true, status: 'admin_approved_generating_request_letter' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// สร้าง/ดึง one-time link สำหรับคณบดีลงนามอนุญาต (admin gen QR ส่งให้คณบดีเซ็นเอง)
router.post('/:id/dean-link', authenticate, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;
    await withTable(async () => {
      const [rows] = await pool.query('SELECT * FROM internship_relocation_requests WHERE id = ?', [req.params.id]);
      const rel = rows[0];
      if (!rel) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
      if (rel.status !== 'advisor_approved_waiting_admin') {
        return res.status(409).json({ success: false, message: `คำร้องนี้ผ่านขั้นคณบดีไปแล้ว (สถานะ: ${STATUS_LABEL[rel.status] || rel.status})` });
      }
      let token = rel.dean_token;
      if (!token) {
        token = crypto.randomBytes(24).toString('hex');
        await pool.query('UPDATE internship_relocation_requests SET dean_token = ? WHERE id = ?', [token, rel.id]);
      }
      res.json({ success: true, data: { token, approvalUrl: `/public/relocation-dean/${token}` } });
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// (เก่า) admin-approve ผ่าน transition — ไม่ใช้แล้ว คงไว้เผื่อ legacy caller โดยไม่มีลายเซ็นจะถูก block ผ่าน path ใหม่ข้างบน
router.patch('/:id/admin-approve-legacy', authenticate, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;
    await transition(req, res, {
      from: 'advisor_approved_waiting_admin',
      to: 'admin_approved_generating_request_letter',
      notify: (rel) => notifyStudent(rel.student_id, {
        type: 'relocation_status', title: 'คณบดีอนุมัติคำร้องเปลี่ยนสถานที่ฝึกงาน',
        message: `คำร้องย้ายไป ${rel.new_company_name} ได้รับอนุมัติ — กำลังออกหนังสือขอความอนุเคราะห์`,
        link: '/dashboard/my-requests', requestId: rel.internship_request_id
      })
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ขั้น 1 (ทางเลือก): ตีกลับ
router.patch('/:id/admin-reject', authenticate, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;
    const [rows] = await pool.query('SELECT * FROM internship_relocation_requests WHERE id = ?', [req.params.id]);
    const rel = rows[0];
    if (!rel) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
    if (['completed', 'rejected'].includes(rel.status)) {
      return res.status(409).json({ success: false, message: 'คำร้องนี้สิ้นสุดแล้ว' });
    }
    const { comment } = req.body || {};
    await pool.query("UPDATE internship_relocation_requests SET status = 'rejected', admin_comment = ? WHERE id = ?", [comment || null, rel.id]);
    await notifyStudent(rel.student_id, {
      type: 'relocation_status', title: 'คำร้องเปลี่ยนสถานที่ฝึกงานถูกตีกลับ',
      message: `สำนักงานคณบดีไม่อนุมัติคำร้อง${comment ? `: ${comment}` : ''}`,
      link: '/dashboard/my-requests', requestId: rel.internship_request_id
    });
    res.json({ success: true, status: 'rejected' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ขั้น 2: ออกหนังสือขอความอนุเคราะห์ (แนบ PDF + ส่งอีเมลหาบริษัทใหม่)
router.patch('/:id/request-letter', authenticate, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;
    await transition(req, res, {
      from: 'admin_approved_generating_request_letter',
      to: 'waiting_company_acceptance',
      fileField: 'new_request_letter_file',
      filePrefix: 'request-letter',
      requireDates: true,
      // one-time token สำหรับลิงก์/QR ให้สถานประกอบการใหม่ตอบรับออนไลน์
      extra: { acceptance_token: crypto.randomBytes(24).toString('hex') },
      notify: async (rel) => {
        // ส่งอีเมลแจ้งบริษัทใหม่ (ใช้อีเมลหัวหน้าหน่วยงาน หรือดึงอีเมลแรกจากช่องผู้ประสานงานเดิม)
        const emailMatch = rel.mentor_email
          ? [rel.mentor_email]
          : /[\w.+-]+@[\w-]+\.[\w.]+/.exec(rel.new_company_contact || '');
        if (emailMatch) {
          try {
            await sendEmail({
              to: emailMatch[0],
              subject: `[LASC] ขอความอนุเคราะห์รับนักศึกษาฝึกงาน (ย้ายจากสถานประกอบการเดิม) — ${rel.new_company_name}`,
              htmlContent: `<p>เรียน ผู้ประสานงาน ${rel.new_company_name}</p>
                <p>คณะศิลปศาสตร์และวิทยาศาสตร์ มหาวิทยาลัยราชภัฏศรีสะเกษ ได้ออกหนังสือขอความอนุเคราะห์ส่งนักศึกษา <strong>${rel.student_id}</strong> ไปฝึกงาน ณ สถานประกอบการของท่าน โปรดตรวจสอบเอกสารแนบในระบบหรือติดต่อฝ่ายฝึกประสบการณ์เพื่อตอบรับการฝึกงาน</p>
                <p style="color:#94a3b8;font-size:12px">อีเมลอัตโนมัติจากระบบสหกิจศึกษา LASC</p>`
            });
          } catch (mailErr) { console.error('[Relocation] company email fail:', mailErr.message); }
        }
        await notifyStudent(rel.student_id, {
          type: 'relocation_status', title: 'ออกหนังสือขอความอนุเคราะห์ที่ใหม่แล้ว',
          message: `ระบบส่งหนังสือขอความอนุเคราะห์ไปยัง ${rel.new_company_name} แล้ว รอแบบตอบรับ`,
          link: '/dashboard/my-requests', requestId: rel.internship_request_id
        });
      }
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ขั้น 3: บันทึกการตอบรับ (แนบใบตอบรับ)
router.patch('/:id/acceptance', authenticate, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;
    await transition(req, res, {
      from: 'waiting_company_acceptance',
      to: 'company_accepted_generating_dispatch_letter',
      fileField: 'new_acceptance_letter_file',
      filePrefix: 'acceptance',
      notify: (rel) => notifyStudent(rel.student_id, {
        type: 'relocation_status', title: 'สถานประกอบการใหม่ตอบรับแล้ว',
        message: `${rel.new_company_name} ตอบรับรับนักศึกษาแล้ว — กำลังออกหนังสือส่งตัวฉบับใหม่`,
        link: '/dashboard/my-requests', requestId: rel.internship_request_id
      })
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ขั้น 4: ออกหนังสือส่งตัวฉบับใหม่ (นักศึกษาดาวน์โหลดได้)
router.patch('/:id/dispatch-letter', authenticate, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;
    await transition(req, res, {
      from: 'company_accepted_generating_dispatch_letter',
      to: 'completed',
      fileField: 'new_dispatch_letter_file',
      filePrefix: 'dispatch-letter',
      requireDates: true,
      notify: (rel) => notifyStudent(rel.student_id, {
        type: 'relocation_status', title: 'หนังสือส่งตัวฉบับใหม่พร้อมดาวน์โหลด',
        message: `ระบบออกหนังสือส่งตัวไปฝึกงานที่ ${rel.new_company_name} เรียบร้อย — ดาวน์โหลดได้ที่หน้า "คำร้องของฉัน"`,
        link: '/dashboard/my-requests', requestId: rel.internship_request_id
      })
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// สร้าง/ดึง one-time link สำหรับสถานประกอบการใหม่ตอบรับ (เปิด modal ซ้ำได้จนกว่าบริษัทจะตอบ)
router.get('/:id/acceptance-link', authenticate, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;
    await withTable(async () => {
      const [rows] = await pool.query('SELECT * FROM internship_relocation_requests WHERE id = ?', [req.params.id]);
      const rel = rows[0];
      if (!rel) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
      if (rel.status !== 'waiting_company_acceptance') {
        return res.status(409).json({ success: false, message: `ขั้นตอนนี้ใช้ได้เฉพาะตอนรอบริษัทใหม่ตอบรับ (สถานะ: ${STATUS_LABEL[rel.status] || rel.status})` });
      }
      let token = rel.acceptance_token;
      if (!token) {
        token = crypto.randomBytes(24).toString('hex');
        await pool.query('UPDATE internship_relocation_requests SET acceptance_token = ? WHERE id = ?', [token, rel.id]);
      }
      res.json({ success: true, data: { token, acceptanceUrl: `/public/company-acceptance/${token}` } });
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// แอดมินกำหนดช่วงวันฝึกงาน ณ ที่ใหม่แยกต่างหาก (ใช้ได้ก่อนเสร็จสิ้น — prefill ให้หน้าตอบรับบริษัท)
router.patch('/:id/training-dates', authenticate, async (req, res) => {
  try {
    if (!adminOnly(req, res)) return;
    const { new_start_date, new_end_date } = req.body || {};
    const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
    if (!isDate(new_start_date) || !isDate(new_end_date)) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุวันที่เริ่มและสิ้นสุดการฝึกงานให้ครบถ้วน' });
    }
    if (new Date(new_end_date) < new Date(new_start_date)) {
      return res.status(400).json({ success: false, message: 'วันสิ้นสุดการฝึกงานต้องไม่ก่อนวันเริ่มต้น' });
    }
    const [rows] = await pool.query('SELECT id, status FROM internship_relocation_requests WHERE id = ?', [req.params.id]);
    const rel = rows[0];
    if (!rel) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
    if (['completed', 'rejected'].includes(rel.status)) {
      return res.status(409).json({ success: false, message: 'คำร้องนี้สิ้นสุดแล้ว — แก้ไขวันฝึกงานไม่ได้' });
    }
    await pool.query(
      'UPDATE internship_relocation_requests SET new_start_date = ?, new_end_date = ?, days_remaining = ? WHERE id = ?',
      [new_start_date, new_end_date, countWorkDays(new_start_date, new_end_date), rel.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ==================== Public One-Time Link (บริษัทเดิมลงนาม — ไม่ต้องล็อกอิน) ====================
const publicRouter = express.Router();

// GET สรุปคำร้องผ่าน token (ยังไม่เผยลายเซ็น/ข้อมูลอ่อนไหวเกินจำเป็น)
publicRouter.get('/token/:token', async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query(
      `SELECT rr.id, rr.status, rr.reason, rr.new_company_name, rr.new_company_address,
              rr.new_company_contact, rr.days_trained, rr.days_remaining,
              rr.mentor_name, rr.mentor_position, rr.mentor_email, rr.mentor_phone,
              rr.company_signed_at, rr.company_signer_name, rr.return_letter_file, rr.return_letter_name,
              r.studentId AS student_id, r.studentName AS student_name_th,
              r.department AS major, r.company AS company_name
       FROM internship_relocation_requests rr
       JOIN requests r ON r.id = rr.internship_request_id
       WHERE rr.company_token = ?`, [req.params.token]);
    const rel = rows[0];
    if (!rel) return res.status(404).json({ success: false, message: 'ลิงก์ไม่ถูกต้องหรือถูกใช้งานไปแล้ว' });
    const usable = rel.status === 'submitted_waiting_company';
    res.json({ success: true, data: { ...rel, usable } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST บริษัทเดิมลงนามยินยอม — token ใช้ได้ครั้งเดียว
publicRouter.post('/token/:token/approve', async (req, res) => {
  try {
    await ensureTable();
    const { signer_name, signer_position, signature_data_url, return_letter_document } = req.body || {};
    if (!signer_name?.trim()) return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อ-ตำแหน่งผู้ลงนาม' });
    // บังคับลายเซ็นยินยอม | ไฟล์หนังสือส่งตัวกลับแนบเพิ่มเติมได้ (ไม่บังคับ)
    const hasSignature = /^data:image\/png;base64,/.test(signature_data_url || '');
    const hasDoc = !!return_letter_document?.dataUrl;
    if (!hasSignature) {
      return res.status(400).json({ success: false, message: 'กรุณาลงลายมือชื่อดิจิทัลเพื่อยืนยันการยินยอม' });
    }
    const [rows] = await pool.query('SELECT * FROM internship_relocation_requests WHERE company_token = ?', [req.params.token]);
    const rel = rows[0];
    if (!rel) return res.status(404).json({ success: false, message: 'ลิงก์ไม่ถูกต้องหรือถูกใช้งานไปแล้ว' });
    if (rel.status !== 'submitted_waiting_company') {
      return res.status(409).json({ success: false, message: 'ลิงก์นี้ถูกใช้งานไปแล้วหรือคำร้องหมดอายุ' });
    }
    // บริษัทเดิมแนบหนังสือส่งตัวกลับเองตอนลงนาม → เก็บลง return_letter_file
    let letterUrl = null;
    let letterName = null;
    if (hasDoc) {
      const saved = await saveDataUrlFile(return_letter_document.dataUrl, `return-letter-${rel.id}`);
      if (saved.error) return res.status(400).json({ success: false, message: saved.error });
      letterUrl = saved.url;
      letterName = String(return_letter_document.fileName || 'หนังสือส่งตัวกลับ').slice(0, 255);
    }
    const [r] = await pool.query(
      `UPDATE internship_relocation_requests
       SET status='company_approved_waiting_advisor', company_signer_name=?, company_signer_position=?,
           company_signature=?, company_signed_at=?,
           return_letter_file=COALESCE(?, return_letter_file), return_letter_name=COALESCE(?, return_letter_name),
           company_token_used_at=?, company_token=NULL
       WHERE id=? AND status='submitted_waiting_company'`,
      [signer_name.trim(), signer_position?.trim() || null, hasSignature ? signature_data_url : null, new Date(),
       letterUrl, letterName, new Date(), rel.id]);
    if (!r.affectedRows) return res.status(409).json({ success: false, message: 'ลิงก์นี้ถูกใช้งานไปแล้ว' });
    await notifyStudent(rel.student_id, {
      type: 'relocation_status', title: 'บริษัทเดิมลงนามยินยอมแล้ว',
      message: `สถานประกอบการเดิมยินยอมให้ย้ายไป ${rel.new_company_name} — รออาจารย์ที่ปรึกษาพิจารณา`,
      link: '/dashboard/my-requests', requestId: rel.internship_request_id
    });
    // แจ้งอาจารย์ให้มาพิจารณาคำร้องเปลี่ยนสถานที่ฝึกงาน
    await notifyAdvisors({
      type: 'relocation_review', title: 'มีคำร้องขอเปลี่ยนสถานที่ฝึกงานรอพิจารณา',
      message: `นักศึกษารหัส ${rel.student_id} ขอเปลี่ยนสถานที่ฝึกงาน (บริษัทเดิมลงนามยินยอมแล้ว) — โปรดตรวจสอบและพิจารณา`,
      link: '/advisor-dashboard/relocations', requestId: rel.internship_request_id
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET สรุปคำร้องสำหรับคณบดีผ่าน dean token (ไม่ต้องล็อกอิน)
publicRouter.get('/dean/:token', async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query(
      `SELECT rr.id, rr.status, rr.reason, rr.new_company_name, rr.new_company_address,
              rr.days_trained, rr.days_remaining, rr.advisor_comment, rr.return_letter_file, rr.return_letter_name,
              r.studentId AS student_id, r.studentName AS student_name_th,
              r.department AS major, r.company AS company_name,
              COALESCE(JSON_UNQUOTE(JSON_EXTRACT(r.details, '$.studentPhoto.dataUrl')), p.avatar_url) AS student_avatar
       FROM internship_relocation_requests rr
       JOIN requests r ON r.id = rr.internship_request_id
       LEFT JOIN profile p ON p.profile_id = r.studentId
       WHERE rr.dean_token = ?`, [req.params.token]);
    const rel = rows[0];
    if (!rel) return res.status(404).json({ success: false, message: 'ลิงก์ไม่ถูกต้องหรือถูกใช้งานไปแล้ว' });
    const usable = rel.status === 'advisor_approved_waiting_admin';
    res.json({ success: true, data: { ...rel, usable } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST คณบดีลงนามอนุญาต/ไม่อนุญาตผ่าน dean token — ใช้ได้ครั้งเดียว
publicRouter.post('/dean/:token/approve', async (req, res) => {
  try {
    await ensureTable();
    const { decision, signature_data_url, comment } = req.body || {};
    if (!['allow', 'deny'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกผลพิจารณา อนุญาต/ไม่อนุญาต' });
    }
    if (!/^data:image\/png;base64,/.test(signature_data_url || '')) {
      return res.status(400).json({ success: false, message: 'กรุณาลงลายมือชื่อดิจิทัล (คณบดี)' });
    }
    const [rows] = await pool.query('SELECT * FROM internship_relocation_requests WHERE dean_token = ?', [req.params.token]);
    const rel = rows[0];
    if (!rel) return res.status(404).json({ success: false, message: 'ลิงก์ไม่ถูกต้องหรือถูกใช้งานไปแล้ว' });
    if (rel.status !== 'advisor_approved_waiting_admin') {
      return res.status(409).json({ success: false, message: 'ลิงก์นี้ถูกใช้งานไปแล้วหรือคำร้องหมดอายุ' });
    }
    const nextStatus = decision === 'allow' ? 'admin_approved_generating_request_letter' : 'rejected';
    const [r] = await pool.query(
      `UPDATE internship_relocation_requests
       SET status=?, dean_decision=?, dean_signature=?, dean_signed_at=?, admin_comment=?,
           dean_token_used_at=?, dean_token=NULL
       WHERE id=? AND status='advisor_approved_waiting_admin'`,
      [nextStatus, decision, signature_data_url, new Date(), comment || null, new Date(), rel.id]);
    if (!r.affectedRows) return res.status(409).json({ success: false, message: 'ลิงก์นี้ถูกใช้งานไปแล้ว' });
    await notifyStudent(rel.student_id, {
      type: 'relocation_status',
      title: decision === 'allow' ? 'คณบดีอนุมัติคำร้องเปลี่ยนสถานที่ฝึกงาน' : 'คำร้องเปลี่ยนสถานที่ฝึกงานไม่ได้รับอนุญาต',
      message: decision === 'allow'
        ? `คำร้องย้ายไป ${rel.new_company_name} ได้รับอนุมัติ — กำลังออกหนังสือขอความอนุเคราะห์`
        : 'คณบดีไม่อนุญาตให้เปลี่ยนสถานที่ฝึกงาน',
      link: '/dashboard/my-requests', requestId: rel.internship_request_id
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET สรุปคำร้องสำหรับสถานประกอบการใหม่ผ่าน acceptance token (ไม่ต้องล็อกอิน)
publicRouter.get('/acceptance/:token', async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query(
      `SELECT rr.id, rr.status, rr.reason, rr.new_company_name, rr.new_company_address,
              rr.new_company_contact, rr.days_trained, rr.days_remaining,
              rr.mentor_name, rr.mentor_position, rr.mentor_email, rr.mentor_phone,
              rr.new_request_letter_file, rr.new_start_date, rr.new_end_date,
              r.studentId AS student_id, r.studentName AS student_name_th,
              r.department AS major, r.company AS company_name, r.position AS intern_position,
              JSON_UNQUOTE(JSON_EXTRACT(r.details, '$.description')) AS intern_description,
              JSON_UNQUOTE(JSON_EXTRACT(r.details, '$.skills')) AS intern_skills,
              JSON_EXTRACT(r.details, '$.student_info') AS student_info,
              COALESCE(JSON_UNQUOTE(JSON_EXTRACT(r.details, '$.studentPhoto.dataUrl')), p.avatar_url) AS student_avatar
       FROM internship_relocation_requests rr
       JOIN requests r ON r.id = rr.internship_request_id
       LEFT JOIN profile p ON p.profile_id = r.studentId
       WHERE rr.acceptance_token = ?`, [req.params.token]);
    const rel = rows[0];
    if (!rel) return res.status(404).json({ success: false, message: 'ลิงก์ไม่ถูกต้องหรือถูกใช้งานไปแล้ว' });
    const usable = rel.status === 'waiting_company_acceptance';
    res.json({ success: true, data: { ...rel, usable } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST สถานประกอบการใหม่ตอบรับ/ปฏิเสธผ่าน acceptance token — ใช้ได้ครั้งเดียว
publicRouter.post('/acceptance/:token/respond', async (req, res) => {
  try {
    await ensureTable();
    const { decision, signer_name, signer_position, signature_data_url, comment, acceptance_department, acceptance_allowance, acceptance_preparations, acceptance_evaluator_email, acceptance_document } = req.body || {};
    if (!['accept', 'decline'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกผลตอบรับ รับนักศึกษา/ไม่รับ' });
    }
    if (!signer_name?.trim()) return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อ-นามสกุลผู้ลงนาม' });
    const isAccept = decision === 'accept';
    // ลายเซ็น/ไฟล์แนบเป็น optional — ถ้าส่งมาก็ต้องถูกรูปแบบ
    if (signature_data_url && !/^data:image\/png;base64,/.test(signature_data_url)) {
      return res.status(400).json({ success: false, message: 'รูปแบบลายมือชื่อไม่ถูกต้อง' });
    }
    if (!isAccept && !comment?.trim()) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุเหตุผลที่ไม่สามารถรับนักศึกษาได้' });
    }
    if (acceptance_evaluator_email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acceptance_evaluator_email.trim())) {
      return res.status(400).json({ success: false, message: 'รูปแบบอีเมลสำหรับรับแบบประเมินไม่ถูกต้อง' });
    }
    const [rows] = await pool.query('SELECT * FROM internship_relocation_requests WHERE acceptance_token = ?', [req.params.token]);
    const rel = rows[0];
    if (!rel) return res.status(404).json({ success: false, message: 'ลิงก์ไม่ถูกต้องหรือถูกใช้งานไปแล้ว' });
    if (rel.status !== 'waiting_company_acceptance') {
      return res.status(409).json({ success: false, message: 'ลิงก์นี้ถูกใช้งานไปแล้วหรือคำร้องหมดอายุ' });
    }
    const accept = decision === 'accept';
    const nextStatus = accept ? 'company_accepted_generating_dispatch_letter' : 'rejected';
    const adminNote = accept
      ? (comment || null)
      : `สถานประกอบการใหม่ไม่รับนักศึกษา${comment ? `: ${comment}` : ''}`;
    // ไฟล์หลักฐานตอบรับที่บริษัทแนบเอง (optional) — เขียนลง uploads/relocations/
    let proofUrl = null;
    let proofName = null;
    if (accept && acceptance_document?.dataUrl) {
      const savedProof = await saveDataUrlFile(acceptance_document.dataUrl, `acceptance-proof-${rel.id}`);
      if (savedProof.error) return res.status(400).json({ success: false, message: savedProof.error });
      proofUrl = savedProof.url;
      proofName = String(acceptance_document.fileName || 'เอกสารตอบรับ').slice(0, 255);
    }
    const [r] = await pool.query(
      `UPDATE internship_relocation_requests
       SET status=?, acceptance_signer_name=?, acceptance_signer_position=?, acceptance_signature=?, acceptance_signed_at=?,
           acceptance_department=?, acceptance_allowance=?, acceptance_preparations=?, acceptance_evaluator_email=?,
           acceptance_proof_file=?, acceptance_proof_name=?,
           admin_comment=?, acceptance_token_used_at=?, acceptance_token=NULL
       WHERE id=? AND status='waiting_company_acceptance'`,
      [nextStatus, signer_name.trim(), signer_position?.trim() || null, accept ? (signature_data_url || null) : null,
       new Date(), accept ? (acceptance_department || null) : null, accept ? (acceptance_allowance || null) : null,
       accept ? (acceptance_preparations?.trim() || null) : null, accept ? (acceptance_evaluator_email?.trim() || null) : null,
       proofUrl, proofName,
       adminNote, new Date(), rel.id]);
    if (!r.affectedRows) return res.status(409).json({ success: false, message: 'ลิงก์นี้ถูกใช้งานไปแล้ว' });
    await notifyStudent(rel.student_id, {
      type: 'relocation_status',
      title: accept ? 'สถานประกอบการใหม่ตอบรับแล้ว' : 'สถานประกอบการใหม่ไม่รับนักศึกษา',
      message: accept
        ? `${rel.new_company_name} ตอบรับรับนักศึกษาแล้ว — กำลังออกหนังสือส่งตัวฉบับใหม่`
        : `${rel.new_company_name} ไม่สามารถรับนักศึกษาได้ — กรุณาติดต่อสำนักงานคณบดี`,
      link: '/dashboard/my-requests', requestId: rel.internship_request_id
    });
    await notifyAdmins({
      type: 'relocation_status',
      title: accept ? 'ที่ใหม่ตอบรับออนไลน์แล้ว' : 'ที่ใหม่ปฏิเสธรับนักศึกษา',
      message: `${rel.new_company_name} ${accept ? `ตอบรับโดย ${signer_name.trim()}` : 'ไม่รับนักศึกษา'} — คำร้อง #${rel.id}`,
      link: '/admin-dashboard/relocations'
    });
    res.json({ success: true, decision });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.publicRouter = publicRouter;
module.exports = router;
module.exports.STATUS_LABEL = STATUS_LABEL;

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');

// ==================== Schema (idempotent — ตรงกับ db/migrations/20261004-add-internship-rounds.sql) ====================
// รอบปฏิทินฝึกงานกลางต่อภาคการศึกษา — แอดมินประกาศครั้งเดียว ระบบเติมวันให้คำร้องทั้งเทอม
const ensureTable = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS internship_rounds (
    id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    academicYear VARCHAR(50) DEFAULT NULL,
    semester VARCHAR(50) DEFAULT NULL COMMENT '1 / 2 — map กับ requests.details.internshipTerm (term1/term2)',
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    note TEXT DEFAULT NULL,
    isActive TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY internship_rounds_is_active_idx (isActive),
    KEY internship_rounds_semester_idx (semester)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`).catch(() => {});
};
ensureTable();

// semester '1'/'2' ↔ details.internshipTerm — คำร้องเก็บได้หลายรูปแบบ
// (ฟอร์มนักศึกษา: 'term1'/'term2', schedule modal แอดมิน: 'ภาคการศึกษาที่ 1'/'ภาคการศึกษาที่ 2')
const SEMESTER_TERM_VARIANTS = {
  '1': ['term1', 'ภาคการศึกษาที่ 1', '1'],
  '2': ['term2', 'ภาคการศึกษาที่ 2', '2'],
  'summer': ['summer', 'ภาคฤดูร้อน'],
};

// สถานะคำร้องที่ยังอยู่ก่อน/รอออกฝึกงาน — apply รอบได้ (ไม่แตะคนที่กำลังฝึก/จบแล้ว)
const APPLICABLE_STATUSES = [
  'อนุมัติแล้ว',
  'อนุมัติแล้ว (รอออกฝึกงาน)',
  'รอออกฝึกงาน',
  'สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)',
  'รอแอดมินออกใบส่งตัว',
  'ตอบรับแล้ว',
];

const toYMD = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date(d));

// GET /api/internship-rounds — รายการรอบทั้งหมด (อ่านได้ทุกคนเหมือน evaluation-rounds)
router.get('/internship-rounds', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM internship_rounds ORDER BY startDate DESC, id DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/internship-rounds/active — รอบที่เปิดใช้งานอยู่ พร้อม flag ว่าอยู่ในช่วงเวลาฝึกไหม
router.get('/internship-rounds/active', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM internship_rounds WHERE isActive = 1 ORDER BY semester ASC, startDate ASC');
    const today = toYMD(new Date());
    const data = rows.map((r) => ({
      ...r,
      isInPeriod: toYMD(r.startDate) <= today && today <= toYMD(r.endDate),
    }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/internship-rounds — สร้างรอบใหม่
router.post('/admin/internship-rounds', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, academicYear, semester, startDate, endDate, note, isActive } = req.body;
    if (!title || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อรอบ วันที่เริ่มต้น และวันที่สิ้นสุด' });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ success: false, message: 'วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่มต้น' });
    }

    const [result] = await pool.query(
      `INSERT INTO internship_rounds (title, academicYear, semester, startDate, endDate, note, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, academicYear || null, semester || null, startDate, endDate, note || null, isActive === undefined ? 1 : (isActive ? 1 : 0)]
    );

    const [newRow] = await pool.query('SELECT * FROM internship_rounds WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'สร้างรอบฝึกงานสำเร็จ', data: newRow[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/internship-rounds/:id — แก้ไขรอบ
router.put('/admin/internship-rounds/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, academicYear, semester, startDate, endDate, note, isActive } = req.body;
    const [existing] = await pool.query('SELECT * FROM internship_rounds WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ success: false, message: 'ไม่พบรอบฝึกงาน' });

    const nextStart = startDate !== undefined ? startDate : existing[0].startDate;
    const nextEnd = endDate !== undefined ? endDate : existing[0].endDate;
    if (new Date(nextEnd) < new Date(nextStart)) {
      return res.status(400).json({ success: false, message: 'วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่มต้น' });
    }

    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (academicYear !== undefined) { updates.push('academicYear = ?'); params.push(academicYear || null); }
    if (semester !== undefined) { updates.push('semester = ?'); params.push(semester || null); }
    if (startDate !== undefined) { updates.push('startDate = ?'); params.push(startDate); }
    if (endDate !== undefined) { updates.push('endDate = ?'); params.push(endDate); }
    if (note !== undefined) { updates.push('note = ?'); params.push(note || null); }
    if (isActive !== undefined) { updates.push('isActive = ?'); params.push(isActive ? 1 : 0); }

    if (updates.length > 0) {
      params.push(req.params.id);
      await pool.query(`UPDATE internship_rounds SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [updated] = await pool.query('SELECT * FROM internship_rounds WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'อัปเดตรอบฝึกงานสำเร็จ', data: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/internship-rounds/:id — ลบรอบ
router.delete('/admin/internship-rounds/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM internship_rounds WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ success: false, message: 'ไม่พบรอบฝึกงาน' });
    await pool.query('DELETE FROM internship_rounds WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'ลบรอบฝึกงานสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/internship-rounds/:id/apply — เติมวันฝึกงานให้คำร้องทั้งเทอมที่ยังไม่ออกฝึก
// body: { overwrite } — false (default) เติมเฉพาะคำร้องที่ยังไม่มีวันทางการ, true เขียนทับทั้งหมด
router.post('/admin/internship-rounds/:id/apply', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM internship_rounds WHERE id = ?', [req.params.id]);
    const round = rows[0];
    if (!round) return res.status(404).json({ success: false, message: 'ไม่พบรอบฝึกงาน' });

    const termVariants = SEMESTER_TERM_VARIANTS[String(round.semester || '')];
    if (!termVariants) {
      return res.status(400).json({ success: false, message: 'รอบนี้ไม่ได้ระบุภาคเรียน — ไม่สามารถจับคู่กับคำร้องได้' });
    }

    const overwrite = Boolean(req.body?.overwrite);
    const [result] = await pool.query(
      `UPDATE requests
       SET internship_start_date = ?, internship_end_date = ?
       WHERE JSON_UNQUOTE(JSON_EXTRACT(details, '$.internshipTerm')) IN (?)
         AND status IN (?)
         ${overwrite ? '' : 'AND internship_start_date IS NULL'}`,
      [round.startDate, round.endDate, termVariants, APPLICABLE_STATUSES]
    );

    res.json({
      success: true,
      message: `นำรอบ "${round.title}" ไปใช้กับคำร้อง ${result.affectedRows} รายการแล้ว`,
      data: { updated: result.affectedRows, overwrite },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

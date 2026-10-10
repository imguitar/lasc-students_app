const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middlewares/auth');
const { LATEST_COMPLETED_RELOC_JOIN, ACTIVE_COMPANY_COLS } = require('../utils/activeCompany');

// สถานะคำร้องที่อนุญาตเช็คชื่อ/เซ็นย้อนหลัง:
// กำลังฝึก + อนุมัติแล้วรอออกฝึก (วันเริ่มผ่านแล้วแต่ cron ยังไม่ flip) + เฟสประเมิน/ปิดงาน (เซ็นย้อนหลังได้)
const CHECKIN_REQUEST_STATUSES = [
  'ออกฝึกงาน', 'กำลังออกฝึกงาน',
  'INTERNING', 'IN_PROGRESS', 'TRAINING', 'START_INTERNSHIP', // legacy keys
  'อนุมัติแล้ว (รอออกฝึกงาน)', 'รอออกฝึกงาน',
  'รออาจารย์อนุมัติเริ่มฝึกงาน', 'รอแอดมินอนุมัติเริ่มฝึกงาน', 'รอแอดมินอนุมัติการออกฝึกงาน',
  'สิ้นสุดการฝึกงาน (รอประเมิน)', 'สิ้นสุดการฝึกงาน', 'ประเมินเสร็จแล้ว',
  'ประเมินจากสถานประกอบการแล้ว', 'ประเมินจากอาจารย์แล้ว',
  'ฝึกงานเสร็จแล้ว', 'เสร็จสิ้นสมบูรณ์',
];
const CHECKIN_STATUS_SQL = CHECKIN_REQUEST_STATUSES.map(() => '?').join(',');
// สถานะก่อนออกฝึก — อนุญาตเฉพาะเมื่อมีวันฝึกทางการแล้ว (ห้าม fallback ไปวันยื่นคำร้อง)
const PRE_ACTIVE_STATUSES = new Set([
  'อนุมัติแล้ว (รอออกฝึกงาน)', 'รอออกฝึกงาน',
  'รออาจารย์อนุมัติเริ่มฝึกงาน', 'รอแอดมินอนุมัติเริ่มฝึกงาน', 'รอแอดมินอนุมัติการออกฝึกงาน',
]);
const todayBangkok = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
// คืน internship_start_date (YYYY-MM-DD) ของคำร้องล่าสุดที่เข้าเกณฑ์เช็คชื่อ หรือ { error }
const getCheckinGuard = async (studentId) => {
  const [reqRows] = await pool.query(
    `SELECT internship_start_date, status, updated_at, submittedDate FROM requests
     WHERE (studentId = ? OR JSON_UNQUOTE(JSON_EXTRACT(details, '$.student_info.studentId')) = ?)
       AND status IN (${CHECKIN_STATUS_SQL}) ORDER BY id DESC LIMIT 1`,
    [studentId, studentId, ...CHECKIN_REQUEST_STATUSES]
  );
  const row = reqRows[0];
  if (!row) {
    return { error: 'ยังไม่สามารถเช็คชื่อได้ — คำร้องยังไม่ถึงช่วงออกฝึกงาน' };
  }
  if (PRE_ACTIVE_STATUSES.has(row.status) && !row.internship_start_date) {
    return { error: 'ยังไม่ได้กำหนดวันเริ่มฝึกงานอย่างเป็นทางการ' };
  }
  const startDateStr = row.internship_start_date
    ? new Date(row.internship_start_date).toISOString().slice(0, 10)
    : new Date(row.updated_at || row.submittedDate).toISOString().slice(0, 10);
  return { startDateStr };
};

// GET /api/checkins
router.get('/', authenticate, async (req, res) => {
  try {
    const { studentId, date, status, department, search } = req.query;
    let sql = "SELECT dc.*, DATE_FORMAT(dc.date, '%Y-%m-%d') AS date FROM daily_checkins dc WHERE 1=1";
    const params = [];

    if (studentId) { sql += ' AND dc.studentId = ?'; params.push(studentId); }
    if (date) { sql += ' AND dc.date = ?'; params.push(date); }
    if (status && status !== 'all') { sql += ' AND dc.status = ?'; params.push(status); }
    if (department && department !== 'all') {
      sql += ' AND dc.studentId IN (SELECT r.studentId FROM requests r WHERE r.department = ?)';
      params.push(department);
    }
    if (search) {
      sql += ' AND (dc.studentName LIKE ? OR dc.studentId LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }

    sql += ' ORDER BY dc.date DESC, dc.createdAt DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/checkins/overview — สรุปความคืบหน้าการส่งรายงานรายวัน ต่อนักศึกษา 1 คน (คำร้องล่าสุดที่ถึงช่วงฝึก)
router.get('/overview', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id AS requestId, r.studentId, r.studentName, r.department, r.company, r.status,${ACTIVE_COMPANY_COLS},
              DATE_FORMAT(r.internship_start_date, '%Y-%m-%d') AS startDate,
              DATE_FORMAT(r.internship_end_date, '%Y-%m-%d') AS endDate,
              (SELECT COUNT(*) FROM daily_checkins dc WHERE dc.studentId = r.studentId) AS submittedDays,
              (SELECT COUNT(*) FROM daily_checkins dc WHERE dc.studentId = r.studentId AND dc.status = 'present') AS presentCount,
              (SELECT COUNT(*) FROM daily_checkins dc WHERE dc.studentId = r.studentId AND dc.status = 'late') AS lateCount,
              (SELECT COUNT(*) FROM daily_checkins dc WHERE dc.studentId = r.studentId AND dc.status = 'absent') AS absentCount,
              (SELECT COUNT(*) FROM daily_checkins dc WHERE dc.studentId = r.studentId AND dc.status = 'sick') AS sickCount,
              (SELECT COUNT(*) FROM daily_checkins dc WHERE dc.studentId = r.studentId AND dc.status = 'personal') AS personalCount,
              (SELECT COUNT(*) FROM daily_checkins dc WHERE dc.studentId = r.studentId AND dc.status = 'holiday') AS holidayCount,
              (SELECT COUNT(*) FROM daily_checkins dc WHERE dc.studentId = r.studentId
                 AND dc.status IN ('present','late','absent')
                 AND (dc.supervisor_signature IS NULL OR dc.supervisor_signature = '')) AS pendingSignature,
              (SELECT DATE_FORMAT(MAX(dc.date), '%Y-%m-%d') FROM daily_checkins dc WHERE dc.studentId = r.studentId) AS lastCheckinDate
       FROM requests r
       ${LATEST_COMPLETED_RELOC_JOIN('r')}
       INNER JOIN (
         SELECT studentId, MAX(id) AS latestId
         FROM requests
         WHERE status IN (${CHECKIN_STATUS_SQL})
         GROUP BY studentId
       ) latest ON latest.latestId = r.id
       ORDER BY r.studentName ASC`,
      CHECKIN_REQUEST_STATUSES
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/checkins/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') AS date FROM daily_checkins WHERE id = ?", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเช็คชื่อ' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/checkins — บันทึกเช็คชื่อรายวัน
router.post('/', authenticate, async (req, res) => {
  try {
    const { studentId, studentName, date, status, note, workExperience, supervisorSignature, supervisorName, supervisorComment } = req.body;

    // Check internship window: ต้องมีคำร้องที่ถึงช่วงออกฝึก + ไม่ก่อนวันเริ่ม + ไม่ล่วงหน้า
    if (studentId) {
      const checkinDateStr = String(date).split('T')[0];
      if (checkinDateStr > todayBangkok()) {
        return res.status(400).json({ success: false, message: 'ไม่สามารถเช็คชื่อล่วงหน้าได้' });
      }
      // บันทึกย้อนหลัง — บังคับลายเซ็นพี่เลี้ยงเฉพาะนักศึกษา (admin/advisor bypass จัดการแทนได้)
      const isStaff = ['admin', 'advisor'].includes(req.user?.role);
      if (checkinDateStr < todayBangkok() && !supervisorSignature && !isStaff) {
        return res.status(400).json({
          success: false,
          message: 'การบันทึกย้อนหลังจำเป็นต้องได้รับการลงนามรับรองจากพี่เลี้ยงสถานประกอบการ'
        });
      }
      const guard = await getCheckinGuard(studentId);
      if (guard.error) {
        return res.status(400).json({ success: false, message: guard.error });
      }
      if (checkinDateStr < guard.startDateStr) {
        return res.status(400).json({
          success: false,
          message: `ไม่สามารถบันทึกรายงานก่อนวันเริ่มฝึกงานได้ (วันเริ่มฝึกงานคือ: ${guard.startDateStr})`
        });
      }
    }

    const [existing] = await pool.query('SELECT id FROM daily_checkins WHERE studentId = ? AND date = ?', [studentId, date]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'คุณเช็คชื่อของวันนี้ไปแล้ว (จะรีเซ็ตในวันถัดไปหลัง 07:00 น.)' });
    }

    await pool.query(
      `INSERT INTO daily_checkins (studentId, studentName, date, status, note, work_experience, supervisor_signature, supervisor_name, supervisor_comment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [studentId, studentName || null, date, status || 'present', note || null, workExperience || null, supervisorSignature || null, supervisorName || null, supervisorComment || null]
    );
    const [rows] = await pool.query("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') AS date FROM daily_checkins WHERE studentId = ? AND date = ?", [studentId, date]);
    res.status(201).json({ success: true, message: 'บันทึกการเช็คชื่อเรียบร้อยแล้ว', data: rows[0] || null });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'คุณเช็คชื่อของวันนี้ไปแล้ว (จะรีเซ็ตในวันถัดไปหลัง 07:00 น.)' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/checkins/:id — แอดมิน/อาจารย์แก้ไขรายงานทุกฟิลด์ (staff override — ไม่บังคับลายเซ็น)
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (!['admin', 'advisor'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'เฉพาะผู้ดูแลระบบหรืออาจารย์ที่ปรึกษาเท่านั้น' });
    }
    const { date, status, note, workExperience } = req.body;
    if (!date) return res.status(400).json({ success: false, message: 'กรุณาระบุวันที่' });
    const [result] = await pool.query(
      'UPDATE daily_checkins SET date = ?, status = ?, note = ?, work_experience = ? WHERE id = ?',
      [String(date).split('T')[0], status || 'present', note || null, workExperience || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเช็คชื่อ' });
    const [rows] = await pool.query("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') AS date FROM daily_checkins WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: 'บันทึกข้อมูลสำเร็จเรียบร้อย', data: rows[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'นักศึกษาคนนี้มีรายงานในวันที่นี้แล้ว' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/checkins/batch-sign — ให้พี่เลี้ยงเซ็นรับรองหลายๆ วันในคราวเดียว
router.patch('/batch-sign', authenticate, async (req, res) => {
  try {
    const { studentId, dates = [], checkinIds = [], supervisorSignature, supervisorName, supervisorComment } = req.body;

    if (!supervisorSignature) {
      return res.status(400).json({ success: false, message: 'กรุณาแนบลายเซ็นพี่เลี้ยง' });
    }

    if ((!dates || dates.length === 0) && (!checkinIds || checkinIds.length === 0)) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกวันที่ต้องการเซ็นรับรองอย่างน้อย 1 วัน' });
    }

    // Filter out dates strictly before internship_start_date และวันล่วงหน้า
    let validDates = dates.filter(d => String(d).split('T')[0] <= todayBangkok());
    if (studentId && dates.length > 0) {
      const guard = await getCheckinGuard(studentId);
      if (guard.error) {
        return res.status(400).json({ success: false, message: guard.error });
      }
      validDates = validDates.filter(d => String(d).split('T')[0] >= guard.startDateStr);
      if (validDates.length === 0) {
        return res.status(400).json({
          success: false,
          message: `ไม่สามารถเซ็นรับรองวันก่อนวันเริ่มฝึกงานได้ (วันเริ่มฝึกงานคือ: ${guard.startDateStr})`
        });
      }
    }

    // 1. If checkinIds provided
    if (checkinIds.length > 0) {
      await pool.query(
        `UPDATE daily_checkins 
         SET supervisor_signature = ?, supervisor_name = ?, supervisor_comment = ?
         WHERE id IN (?)`,
        [supervisorSignature, supervisorName || null, supervisorComment || null, checkinIds]
      );
    }

    // 2. If dates & studentId provided (for matching existing or creating entries by date)
    if (validDates.length > 0 && studentId) {
      for (const date of validDates) {
        const [existing] = await pool.query('SELECT id FROM daily_checkins WHERE studentId = ? AND date = ?', [studentId, date]);
        if (existing.length > 0) {
          await pool.query(
            `UPDATE daily_checkins 
             SET supervisor_signature = ?, supervisor_name = ?, supervisor_comment = ?
             WHERE studentId = ? AND date = ?`,
            [supervisorSignature, supervisorName || null, supervisorComment || null, studentId, date]
          );
        } else {
          await pool.query(
            `INSERT INTO daily_checkins (studentId, studentName, date, status, note, work_experience, supervisor_signature, supervisor_name, supervisor_comment)
             VALUES (?, ?, ?, 'present', 'บันทึกและลงชื่อรับรองย้อนหลังโดยพี่เลี้ยง', 'ปฏิบัติงานประจำวัน', ?, ?, ?)
             ON DUPLICATE KEY UPDATE supervisor_signature = VALUES(supervisor_signature), supervisor_name = VALUES(supervisor_name), supervisor_comment = VALUES(supervisor_comment)`,
            [studentId, req.body.studentName || null, date, supervisorSignature, supervisorName || null, supervisorComment || null]
          );
        }
      }
    }

    const [rows] = await pool.query("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') AS date FROM daily_checkins WHERE studentId = ? ORDER BY date DESC", [studentId]);
    res.json({
      success: true,
      message: `บันทึกลายเซ็นพี่เลี้ยงรับรองเรียบร้อยแล้ว (${dates.length || checkinIds.length} วัน)`,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/checkins/:id — เฉพาะ staff (แอดมิน/อาจารย์)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (!['admin', 'advisor'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'เฉพาะผู้ดูแลระบบหรืออาจารย์ที่ปรึกษาเท่านั้น' });
    }
    const [result] = await pool.query('DELETE FROM daily_checkins WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเช็คชื่อ' });
    res.json({ success: true, message: 'ลบเช็คชื่อสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/checkins/student/:studentId — เฉพาะแอดมิน (ลบทั้งชุดอันตราย)
router.delete('/student/:studentId', authenticate, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
    }
    await pool.query('DELETE FROM daily_checkins WHERE studentId = ?', [req.params.studentId]);
    res.json({ success: true, message: 'ลบรายงานประจำวันสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

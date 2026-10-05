const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');
const { parseRequestRow, USER_SELECT_SQL, DEPARTMENT_NAME_TO_ID } = require('../utils/helpers');
const { createNotification, findUserIdByUsername, findUserIdsByRole } = require('../utils/notificationService');
const { sendStatusNotifyEmail, findStudentEmail } = require('../utils/mailer');
const { autoUpdateInternshipStatuses } = require('../utils/internshipAutoUpdate');

const getCompanyResponseToken = (details) => {
  if (!details) return '';
  try {
    const parsed = typeof details === 'object' ? details : JSON.parse(details);
    return parsed.companyResponseToken || '';
  } catch (_) {
    return '';
  }
};

const getCompanyResponseTokenMeta = (details) => {
  if (!details) return {};
  try {
    const parsed = typeof details === 'object' ? details : JSON.parse(details);
    return {
      token: parsed.companyResponseToken || '',
      expiresAt: parsed.companyResponseTokenExpiresAt || null,
      usedAt: parsed.companyResponseTokenUsedAt || null,
    };
  } catch (_) {
    return {};
  }
};

// ลิงก์ตอบรับของสถานประกอบการมีอายุ 7 วัน และใช้ได้ครั้งเดียว
const COMPANY_RESPONSE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const matchesCompanyResponseToken = (details, token) => {
  const storedToken = getCompanyResponseToken(details);
  if (!storedToken || !token) return false;
  const storedBuffer = Buffer.from(storedToken);
  const tokenBuffer = Buffer.from(String(token));
  return storedBuffer.length === tokenBuffer.length && crypto.timingSafeEqual(storedBuffer, tokenBuffer);
};

const isCompanyResponseTokenUsable = (details, token) => {
  const meta = getCompanyResponseTokenMeta(details);
  if (!meta.token || meta.usedAt) return false;
  if (meta.expiresAt && new Date(meta.expiresAt).getTime() <= Date.now()) return false;
  return matchesCompanyResponseToken(details, token);
};

// Ensure company_email column exists in requests table (Idempotent)
pool.query('ALTER TABLE requests ADD COLUMN IF NOT EXISTS company_email VARCHAR(191) DEFAULT NULL AFTER evaluator_email').catch(() => {});

const serializeRequestRow = (row) => {
  const parsed = parseRequestRow(row);
  if (parsed?.details && typeof parsed.details === 'object') {
    delete parsed.details.companyResponseToken;
    delete parsed.details.companyResponseTokenExpiresAt;
    delete parsed.details.companyResponseTokenUsedAt;
  }
  return parsed;
};

// Helper to handle single request fetching
const handleGetSingleRequest = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, 
             IF(e.id IS NOT NULL, true, false) AS hasCompanyEval,
             IF(ae.id IS NOT NULL, true, false) AS hasAdvisorEval
      FROM requests r
      LEFT JOIN evaluations e ON r.id = e.requestId
      LEFT JOIN advisor_evaluations ae ON r.id = ae.requestId
      WHERE r.id = ?
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลคำร้อง' });
    const isPublic = req.baseUrl.includes('public') || req.originalUrl.includes('public');
    if (isPublic && !isCompanyResponseTokenUsable(rows[0].details, req.query.responseToken)) {
      return res.status(403).json({ success: false, message: 'ลิงก์ตอบรับไม่ถูกต้อง หมดอายุ หรือถูกใช้งานไปแล้ว' });
    }
    res.json({ success: true, data: serializeRequestRow(rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/requests — ดึงรายการคำร้องทั้งหมด (Authenticated)
router.get('/', authenticate, async (req, res) => {
  try {
    // Auto-update request statuses
    try {
      await pool.query(`
        UPDATE requests r
        JOIN evaluations e ON r.id = e.requestId
        SET r.status = 'ฝึกงานเสร็จแล้ว'
        WHERE r.status = 'ประเมินเสร็จแล้ว'
          AND e.createdAt <= NOW() - INTERVAL 3 DAY
      `);
      // เปลี่ยนสถานะเป็น 'ออกฝึกงาน' ตามวันเริ่มฝึกงานที่กำหนด (เวลาไทย)
      await autoUpdateInternshipStatuses();
      // กู้คำร้องที่ประเมินครบทั้งบริษัท+อาจารย์แล้ว แต่สถานะยังค้าง (bug เดิมที่ advisor eval ไม่อัปเดต status)
      await pool.query(`
        UPDATE requests r
        JOIN evaluations e ON r.id = e.requestId
        JOIN advisor_evaluations ae ON r.id = ae.requestId
        SET r.status = 'ฝึกงานเสร็จแล้ว'
        WHERE r.status IN ('ออกฝึกงาน', 'กำลังออกฝึกงาน', 'ประเมินเสร็จแล้ว', 'สิ้นสุดการฝึกงาน (รอประเมิน)')
      `);
    } catch (autoErr) {
      console.error('Auto-update query error:', autoErr);
    }

    const { studentId, status, department, search } = req.query;
    let sql = `
      SELECT r.*, 
             IF(e.id IS NOT NULL, true, false) AS hasCompanyEval,
             IF(ae.id IS NOT NULL, true, false) AS hasAdvisorEval
      FROM requests r
      LEFT JOIN evaluations e ON r.id = e.requestId
      LEFT JOIN advisor_evaluations ae ON r.id = ae.requestId
      WHERE 1=1
    `;
    const params = [];

    if (studentId) {
      sql += ' AND r.studentId = ?';
      params.push(studentId);
    }
    if (status && status !== 'all') {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (department && department !== 'all') {
      // ชื่อสาขาอาจเก็บต่างกัน (มี/ไม่มี "สาขาวิชา" นำหน้า หรือเว้นวรรคต่างกัน)
      // เทียบแบบ normalize: ตัด "สาขาวิชา" + ช่องว่าง แล้ว LIKE ทั้งสองทิศ
      const deptCore = String(department).replace(/สาขาวิชา/g, '').replace(/\s+/g, '');
      // fallback: คำร้องที่ไม่ได้เก็บ department — เช็ค profile.department_id ของนักศึกษาแทน
      const deptId = DEPARTMENT_NAME_TO_ID[department] || DEPARTMENT_NAME_TO_ID[`สาขาวิชา${deptCore}`];
      const deptFallback = deptId
        ? ` OR ((r.department IS NULL OR TRIM(r.department) = '') AND EXISTS (
             SELECT 1 FROM profile p2 WHERE p2.profile_id = r.studentId AND p2.department_id = ?
           ))`
        : '';

      sql += ` AND (
        REPLACE(REPLACE(TRIM(r.department), 'สาขาวิชา', ''), ' ', '') = ?
        OR REPLACE(REPLACE(TRIM(r.department), 'สาขาวิชา', ''), ' ', '') LIKE CONCAT('%', ?, '%')
        OR ? LIKE CONCAT('%', NULLIF(REPLACE(REPLACE(TRIM(r.department), 'สาขาวิชา', ''), ' ', ''), ''), '%')
        ${deptFallback}
      )`;
      params.push(deptCore, deptCore, deptCore);
      if (deptId) params.push(deptId);
    }
    if (search) {
      sql += ' AND (r.studentName LIKE ? OR r.studentId LIKE ? OR r.company LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    sql += ' ORDER BY r.updated_at DESC, r.id DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows.map(serializeRequestRow) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/response-qr', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT details FROM requests WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลคำร้อง' });

    let details = {};
    if (rows[0].details) {
      try {
        details = typeof rows[0].details === 'object' ? rows[0].details : JSON.parse(rows[0].details);
      } catch (_) {}
    }

    let { token, expiresAt, usedAt } = getCompanyResponseTokenMeta(details);
    const isExpired = expiresAt && new Date(expiresAt).getTime() <= Date.now();
    // ออกโทเค็นใหม่เมื่อยังไม่มี หมดอายุ หรือถูกใช้งานไปแล้ว
    if (!token || isExpired || usedAt) {
      token = crypto.randomBytes(32).toString('hex');
      expiresAt = new Date(Date.now() + COMPANY_RESPONSE_TOKEN_TTL_MS).toISOString();
      details.companyResponseToken = token;
      details.companyResponseTokenExpiresAt = expiresAt;
      delete details.companyResponseTokenUsedAt;
      await pool.query('UPDATE requests SET details = ? WHERE id = ?', [JSON.stringify(details), req.params.id]);
    }

    const responsePath = `/coop/public/request/${req.params.id}?responseToken=${encodeURIComponent(token)}`;
    res.json({
      success: true,
      data: { token, responseUrl: responsePath, expiresAt }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/requests/:id — Private เท่านั้น (public แยกไปที่ publicRequestRoutes)
router.get('/:id', authenticate, (req, res) => handleGetSingleRequest(req, res));

// POST /api/requests — ยื่นคำร้องใหม่
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      studentId, studentName, department, company, position,
      submittedDate, details, status, company_email, companyEmail
    } = req.body;

    if (!studentId || !company) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน' });
    }

    let initialCompanyEmail = (company_email !== undefined ? company_email : companyEmail) || null;
    let detailsObj = null;
    if (typeof details === 'object' && details !== null) {
      detailsObj = { ...details };
    } else if (typeof details === 'string') {
      try { detailsObj = JSON.parse(details); } catch (_) {}
    }
    if (!initialCompanyEmail && detailsObj?.contactEmail) {
      initialCompanyEmail = detailsObj.contactEmail;
    }
    if (initialCompanyEmail && detailsObj && !detailsObj.companyEmail) {
      detailsObj.companyEmail = initialCompanyEmail;
    }
    const detailsStr = detailsObj ? JSON.stringify(detailsObj) : (typeof details === 'string' ? details : null);
    // สถานะเริ่มต้น Hardcode — นักศึกษาไม่สามารถกำหนดสถานะเองได้ (กันคำร้องเด้งข้าม flow)
    // internship_start_date / dispatchLetter เริ่มต้น NULL ตาม schema — เขียนได้เฉพาะแอดมินรอบที่ 2
    const initialStatus = req.user?.role === 'admin'
      ? (status || 'รอผู้ดูแลระบบตรวจสอบ')
      : 'รออาจารย์ที่ปรึกษาอนุมัติ';

    const [result] = await pool.query(
      `INSERT INTO requests (studentId, studentName, department, company, position, submittedDate, details, status, company_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId,
        studentName || null,
        department || null,
        company,
        position || null,
        submittedDate || new Date().toISOString().split('T')[0],
        detailsStr,
        initialStatus,
        initialCompanyEmail ? String(initialCompanyEmail).trim() : null
      ]
    );

    const [newRow] = await pool.query('SELECT * FROM requests WHERE id = ?', [result.insertId]);

    // ส่งอีเมลยืนยันการยื่นคำร้องให้นักศึกษา — ล้มเหลวได้โดยไม่กระทบการบันทึก
    try {
      const recipient = await findStudentEmail(studentId);
      if (recipient) {
        await sendStatusNotifyEmail({
          to: recipient,
          studentName,
          studentId,
          requestId: result.insertId,
          status: `ยื่นคำร้องสำเร็จ (${initialStatus})`,
          company,
          position,
        });
      }
    } catch (mailErr) {
      console.error('[Mailer] ส่งอีเมลยืนยันการยื่นคำร้องล้มเหลว:', mailErr.message);
    }

    res.status(201).json({ success: true, message: 'ยื่นคำร้องสำเร็จ', data: serializeRequestRow(newRow[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/requests/batch/internship-period — กำหนดวันฝึกงานให้หลายคำร้องพร้อมกัน (Admin)
router.patch('/batch/internship-period', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { ids, startDate, endDate } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุรายการคำร้องที่ต้องการอัปเดต' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุวันเริ่มต้นและวันสิ้นสุดฝึกงาน' });
    }

    const [rows] = await pool.query('SELECT * FROM requests WHERE id IN (?)', [ids]);

    for (const row of rows) {
      let details = {};
      if (row.details) {
        try {
          details = typeof row.details === 'object' ? row.details : JSON.parse(row.details);
        } catch (_) {}
      }
      details.startDate = startDate;
      details.endDate = endDate;

      await pool.query(
        'UPDATE requests SET internship_start_date = ?, internship_end_date = ?, details = ? WHERE id = ?',
        [startDate, endDate, JSON.stringify(details), row.id]
      );
    }

    const [updated] = await pool.query('SELECT * FROM requests WHERE id IN (?)', [ids]);
    res.json({
      success: true,
      message: `กำหนดวันฝึกงานให้ ${updated.length} คำร้องเรียบร้อยแล้ว`,
      data: updated.map(serializeRequestRow),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/requests/batch/status — เปลี่ยนสถานะหลายคำร้องพร้อมกัน (Admin)
router.patch('/batch/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุรายการคำร้องที่ต้องการอัปเดต' });
    }
    if (!status) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุสถานะที่ต้องการอัปเดต' });
    }

    await pool.query('UPDATE requests SET status = ? WHERE id IN (?)', [status, ids]);
    const [updated] = await pool.query('SELECT * FROM requests WHERE id IN (?)', [ids]);
    res.json({
      success: true,
      message: `อัปเดตสถานะให้ ${updated.length} คำร้องเรียบร้อยแล้ว`,
      data: updated.map(serializeRequestRow),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/requests/:id/status — Private (ต้อง login ผ่าน authenticate ที่ mount + ที่ route)
// PATCH /api/public/requests/:id/status — สถานประกอบการตอบรับ/ปฏิเสธ ผ่าน publicRequestRoutes (บังคับ responseToken)
const updateStatusHandler = async (req, res) => {
  const isPublic = req.baseUrl.includes('public') || req.originalUrl.includes('public');

  {
    try {
      const { status, comment, admin_comment, advisor_comment, company_comment, dispatchLetter, startDate, endDate, internshipTerm, evaluatorEmail, evaluator_email, evaluatorName, evaluatorPosition, company_email, companyEmail } = req.body;
      const [rows] = await pool.query('SELECT * FROM requests WHERE id = ?', [req.params.id]);
      if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
      // public mount: บังคับโทเค็นที่ใช้ได้เสมอ — ปิดช่อง anonymous status change
      const publicTokenIssued = isPublic;
      if (isPublic && !isCompanyResponseTokenUsable(rows[0].details, req.query.responseToken)) {
        return res.status(403).json({ success: false, message: 'ลิงก์ตอบรับไม่ถูกต้อง หมดอายุ หรือถูกใช้งานไปแล้ว' });
      }

      const updates = ['status = ?'];
      const params = [status];

      let details = {};
      if (rows[0].details) {
        try {
          details = typeof rows[0].details === 'object' ? rows[0].details : JSON.parse(rows[0].details);
        } catch (_) {}
      }

      // One-time usage: ตัดสิทธิ์โทเค็นทันทีเมื่อสถานประกอบการตอบรับ/ปฏิเสธผ่านลิงก์สาธารณะ
      if (publicTokenIssued) {
        details.companyResponseTokenUsedAt = new Date().toISOString();
      }

      // อีเมลติดต่อของสถานประกอบการ / ผู้ประสานงาน
      const targetCompanyEmail = company_email !== undefined ? company_email : companyEmail;
      const hasCompanyEmail = targetCompanyEmail !== undefined;
      if (hasCompanyEmail) {
        const cleanCompEmail = targetCompanyEmail ? String(targetCompanyEmail).trim() : null;
        updates.push('company_email = ?');
        params.push(cleanCompEmail);
        details.companyEmail = cleanCompEmail;
        if (cleanCompEmail) {
          details.contactEmail = cleanCompEmail;
        }

        // หากมีการจัดเก็บ Master Data ของตารางสถานประกอบการ (companies) ให้อัปเดตจำอีเมลล่าสุดของสถานประกอบการแห่งนี้ไว้ด้วย
        if (cleanCompEmail && rows[0].company) {
          try {
            await pool.query(
              'UPDATE companies SET email = ? WHERE TRIM(name) = TRIM(?)',
              [cleanCompEmail, rows[0].company]
            );
          } catch (compErr) {
            console.warn('[Company Update] Failed to update company email in companies table:', compErr.message);
          }
        }
      }

      // อีเมลผู้ประเมิน — เฉพาะ admin (สำนักงานคณบดี) หรือบริษัทผ่าน public response token เท่านั้น
      // (นักศึกษา/อาจารย์แก้ไม่ได้ — บริษัทเป็นผู้ประเมินอยู่แล้วจึงระบุอีเมลผู้ประเมินของตัวเองได้)
      // ตรวจการมีคีย์แยกจากค่า เพื่อให้ส่งค่าว่างมาเพื่อล้างอีเมลได้
      const hasEvalEmail = evaluatorEmail !== undefined || evaluator_email !== undefined;
      const targetEvalEmail = evaluatorEmail !== undefined ? evaluatorEmail : evaluator_email;
      if (hasEvalEmail) {
        if (req.user?.role !== 'admin' && !isPublic) {
          return res.status(403).json({ success: false, message: 'เฉพาะเจ้าหน้าที่สำนักงานคณบดี (Admin) เท่านั้นที่แก้ไขอีเมลผู้ประเมินได้' });
        }
        updates.push('evaluator_email = ?');
        params.push(targetEvalEmail || null);
        details.evaluatorEmail = targetEvalEmail || null;
        // ชื่อ/ตำแหน่งผู้ประเมินเก็บไว้ใน details เพราะไม่ได้ใช้ค้นหา
        if (evaluatorName !== undefined) details.evaluatorName = evaluatorName || null;
        if (evaluatorPosition !== undefined) details.evaluatorPosition = evaluatorPosition || null;
      }

      if (startDate !== undefined) {
        updates.push('internship_start_date = ?');
        params.push(startDate || null);
        details.startDate = startDate;
      } else if (status === 'ออกฝึกงาน') {
        updates.push('internship_start_date = IFNULL(internship_start_date, CURDATE())');
      }

      if (endDate !== undefined) {
        updates.push('internship_end_date = ?');
        params.push(endDate || null);
        details.endDate = endDate;
      }

      if (req.body.studentPreparation !== undefined) details.studentPreparation = req.body.studentPreparation;
      if (req.body.signature !== undefined) details.signature = req.body.signature;
      if (req.body.signerName !== undefined) details.signerName = req.body.signerName;
      if (req.body.signerPosition !== undefined) details.signerPosition = req.body.signerPosition;
      if (req.body.companyResponse !== undefined) details.companyResponse = req.body.companyResponse;

      // เอกสารแนบยืนยันการตอบรับ (ใช้แทน/ประกอบลายเซ็นได้) — เขียนไฟล์ลง uploads/acceptance/ แล้วเก็บ url ใน details
      if (req.body.acceptanceDocument !== undefined) {
        const doc = req.body.acceptanceDocument;
        const parsed = parseDataUrl(doc?.dataUrl);
        if (!parsed || !ACCEPTANCE_DOC_MIME[parsed.mime] || parsed.buffer.length > MAX_ACCEPTANCE_DOC_BYTES) {
          return res.status(400).json({ success: false, message: 'ไฟล์หลักฐานการตอบรับไม่ถูกต้อง รองรับเฉพาะ PDF, JPG, PNG ขนาดไม่เกิน 10MB' });
        }
        fs.mkdirSync(ACCEPTANCE_DOC_DIR, { recursive: true });
        const filename = `acceptance-${req.params.id}-${Date.now()}${ACCEPTANCE_DOC_MIME[parsed.mime]}`;
        fs.writeFileSync(path.join(ACCEPTANCE_DOC_DIR, filename), parsed.buffer);
        details.acceptanceDocument = {
          fileName: String(doc.fileName || `เอกสารตอบรับ${ACCEPTANCE_DOC_MIME[parsed.mime]}`).slice(0, 255),
          url: `/uploads/acceptance/${filename}`,
          size: parsed.buffer.length,
          mime: parsed.mime,
          uploadedAt: new Date().toISOString()
        };
        if (details.companyResponse) details.companyResponse.acceptanceDocument = details.acceptanceDocument;
      }

      if (
        publicTokenIssued ||
        startDate !== undefined ||
        endDate !== undefined ||
        internshipTerm !== undefined ||
        hasEvalEmail ||
        hasCompanyEmail ||
        req.body.studentPreparation !== undefined ||
        req.body.signature !== undefined ||
        req.body.signerName !== undefined ||
        req.body.signerPosition !== undefined ||
        req.body.companyResponse !== undefined ||
        req.body.acceptanceDocument !== undefined
      ) {
        updates.push('details = ?');
        params.push(JSON.stringify(details));
      }

      if (dispatchLetter !== undefined) {
        updates.push('dispatchLetter = ?');
        params.push(typeof dispatchLetter === 'object' ? JSON.stringify(dispatchLetter) : dispatchLetter);
      }

      const c = comment || admin_comment || advisor_comment || company_comment;
      if (c) {
        if (req.user?.role === 'admin' || admin_comment) {
          updates.push('admin_comment = ?');
        } else if (req.user?.role === 'advisor' || advisor_comment) {
          updates.push('advisor_comment = ?');
        } else {
          updates.push('company_comment = ?');
        }
        params.push(c);
      }

      params.push(req.params.id);
      await pool.query(`UPDATE requests SET ${updates.join(', ')} WHERE id = ?`, params);

      const [updated] = await pool.query('SELECT * FROM requests WHERE id = ?', [req.params.id]);

      // แจ้งเตือนเมื่อสถานประกอบการตอบกลับคำร้องผ่านลิงก์สาธารณะ — ล้มเหลวได้โดยไม่กระทบการอัปเดตสถานะ
      if (publicTokenIssued && updated[0]) {
        try {
          const requestRow = updated[0];
          const accepted = String(req.body.statusCode) === 'COMPANY_ACCEPTED'
            || String(status || '').includes('ตอบรับ');
          const companyName = requestRow.company || 'สถานประกอบการ';
          const studentLabel = requestRow.studentName
            ? `${requestRow.studentName} (${requestRow.studentId || '-'})`
            : (requestRow.studentId || 'นักศึกษา');
          const title = accepted
            ? 'สถานประกอบการตอบรับคำร้องฝึกงาน'
            : 'สถานประกอบการปฏิเสธคำร้องฝึกงาน';
          const message = accepted
            ? `${companyName} ตอบรับนักศึกษา ${studentLabel} เข้าฝึกงานแล้ว`
            : `${companyName} ปฏิเสธคำร้องของ ${studentLabel}${c ? ` — เหตุผล: ${c}` : ''}`;
          const requestLink = `/dashboard/request/${requestRow.id}`;

          const adminIds = await findUserIdsByRole('admin');
          for (const adminId of adminIds) {
            await createNotification({
              userId: adminId,
              type: 'company_response',
              title,
              message,
              link: requestLink,
              requestId: requestRow.id,
            });
          }

          const studentUserId = await findUserIdByUsername(requestRow.studentId);
          if (studentUserId) {
            await createNotification({
              userId: studentUserId,
              type: 'company_response',
              title: accepted ? 'สถานประกอบการตอบรับคำร้องของคุณแล้ว' : 'สถานประกอบการปฏิเสธคำร้องของคุณ',
              message: accepted
                ? `${companyName} ยืนยันรับคุณเข้าฝึกงานแล้ว`
                : `${companyName} ปฏิเสธคำร้องฝึกงานของคุณ${c ? ` — เหตุผล: ${c}` : ''}`,
              link: '/dashboard',
              requestId: requestRow.id,
            });
          }
        } catch (notifyErr) {
          console.error('[Notification] แจ้งเตือนผลตอบรับสถานประกอบการล้มเหลว:', notifyErr.message);
        }
      }

      // แจ้งเตือนในแอปเมื่ออนุมัติพร้อมแนบหนังสือส่งตัว — ให้นักศึกษาไปดาวน์โหลดเอกสาร
      // (ใช้ startsWith กัน 'ไม่อนุมัติ' ที่มี substring 'อนุมัติ' เหมือนกัน)
      const isApprovedWithLetter =
        updated[0] && dispatchLetter && status &&
        (String(status).startsWith('อนุมัติแล้ว') || status === 'รอออกฝึกงาน' || status === 'ออกฝึกงาน');
      if (isApprovedWithLetter) {
        try {
          const studentUserId = await findUserIdByUsername(updated[0].studentId);
          if (studentUserId) {
            await createNotification({
              userId: studentUserId,
              type: 'request_status',
              title: 'คำร้องได้รับการอนุมัติแล้ว',
              message: `คำร้อง #${updated[0].id} ได้รับการอนุมัติแล้ว กรุณาดาวน์โหลดหนังสือส่งตัวเพื่อนำไปยื่น ณ สถานประกอบการ`,
              link: '/dashboard',
              requestId: updated[0].id,
            });
          }
        } catch (notifyErr) {
          console.error('[Notification] แจ้งเตือนอนุมัติ+หนังสือส่งตัวล้มเหลว:', notifyErr.message);
        }
      }

      // ส่งอีเมลแจ้งสถานะคำร้องให้นักศึกษา — ล้มเหลวได้โดยไม่กระทบการอัปเดตสถานะ
      if (updated[0] && status) {
        try {
          const requestRow = updated[0];
          const recipient = await findStudentEmail(requestRow.studentId);
          if (recipient) {
            await sendStatusNotifyEmail({
              to: recipient,
              studentName: requestRow.studentName,
              studentId: requestRow.studentId,
              requestId: requestRow.id,
              status,
              comment: c,
              company: requestRow.company,
              position: requestRow.position,
            });
          }
        } catch (mailErr) {
          console.error('[Mailer] ส่งอีเมลแจ้งสถานะคำร้องล้มเหลว:', mailErr.message);
        }
      }

      res.json({ success: true, message: 'อัปเดตสถานะสำเร็จ', data: serializeRequestRow(updated[0]) });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

router.patch('/:id/status', authenticate, updateStatusHandler);

// PATCH /api/requests/:id/internship-period — กำหนดวันฝึกงาน (Admin)
router.patch('/:id/internship-period', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, internshipTerm, note } = req.body;
    const [rows] = await pool.query('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });

    let details = {};
    if (rows[0].details) {
      try {
        details = typeof rows[0].details === 'object' ? rows[0].details : JSON.parse(rows[0].details);
      } catch (_) {}
    }

    if (startDate !== undefined) details.startDate = startDate;
    if (endDate !== undefined) details.endDate = endDate;
    if (internshipTerm !== undefined) details.internshipTerm = internshipTerm;
    if (note !== undefined) details.internshipDateNote = note;

    const sDate = startDate || details.startDate || rows[0].internship_start_date || null;
    const eDate = endDate || details.endDate || rows[0].internship_end_date || null;

    await pool.query(
      'UPDATE requests SET internship_start_date = ?, internship_end_date = ?, details = ? WHERE id = ?',
      [sDate, eDate, JSON.stringify(details), req.params.id]
    );

    const [updated] = await pool.query('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'บันทึกกำหนดวันฝึกงานสำเร็จ', data: serializeRequestRow(updated[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/requests/:id/appointment — กำหนดอาจารย์นิเทศและวันนิเทศ
// เฉพาะ admin หรืออาจารย์ที่เป็นประธานสาขาวิชาเท่านั้น
router.patch('/:id/appointment', authenticate, async (req, res) => {
  try {
    // อ่านสิทธิ์จากฐานข้อมูลทุกครั้ง ไม่เชื่อค่าใน JWT เพราะประธานสาขาเปลี่ยนได้จากระบบ Profile
    const [uRows] = await pool.query(`${USER_SELECT_SQL} WHERE u.id = ? GROUP BY u.id`, [req.user.id]);
    const currentUser = uRows[0];
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    const isHead = currentUser.role === 'admin'
      || (currentUser.role === 'advisor' && Boolean(currentUser.isDepartmentHead));

    if (!isHead) {
      return res.status(403).json({
        success: false,
        message: 'เฉพาะประธานสาขาวิชาเท่านั้นที่มีสิทธิ์กำหนดรายชื่ออาจารย์นิเทศและวันนิเทศก์'
      });
    }

    // ถ้าอาจารย์บันทึกผลนิเทศแล้ว ห้ามเปลี่ยนนัดหมาย/อาจารย์นิเทศอีก
    const [evalRows] = await pool.query('SELECT id FROM advisor_evaluations WHERE requestId = ?', [req.params.id]);
    if (evalRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'คำร้องนี้บันทึกผลการนิเทศแล้ว ไม่สามารถเปลี่ยนนัดหมายหรืออาจารย์นิเทศได้',
      });
    }

    const body = req.body || {};
    const appointmentObj = body.supervisionAppointment || body;
    const appointmentData = (appointmentObj && typeof appointmentObj === 'object') ? { ...appointmentObj } : {};

    // วันนิเทศบังคับกรอก และต้องตรงช่วงเวลาฝึกงาน (วันทางการก่อน → fallback วันที่นักศึกษากรอก)
    if (!appointmentData.date) {
      return res.status(400).json({ success: false, message: 'โปรดระบุวันที่นิเทศให้ตรงกับวันที่ในเอกสารราชการ/หนังสือนิเทศ' });
    }
    const apptDate = new Date(appointmentData.date);
    if (Number.isNaN(apptDate.getTime())) {
      return res.status(400).json({ success: false, message: 'รูปแบบวันที่นิเทศไม่ถูกต้อง' });
    }
    const [targetRows] = await pool.query('SELECT internship_start_date, internship_end_date, details FROM requests WHERE id = ?', [req.params.id]);
    const targetRow = targetRows[0];
    if (targetRow) {
      let det = {};
      try { det = typeof targetRow.details === 'string' ? JSON.parse(targetRow.details) : (targetRow.details || {}); } catch (_) {}
      const toYMD = (v) => { const t = new Date(v); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
      const rangeStart = targetRow.internship_start_date || det.startDate;
      const rangeEnd = targetRow.internship_end_date || det.endDate;
      const apptYmd = toYMD(apptDate);
      if (rangeStart && apptYmd < toYMD(rangeStart)) {
        return res.status(400).json({ success: false, message: `วันนิเทศต้องไม่ก่อนวันเริ่มฝึกงาน (${toYMD(rangeStart)}) ตามเอกสารราชการ` });
      }
      if (rangeEnd && apptYmd > toYMD(rangeEnd)) {
        return res.status(400).json({ success: false, message: `วันนิเทศต้องไม่เกินวันสิ้นสุดการฝึกงาน (${toYMD(rangeEnd)}) ตามเอกสารราชการ` });
      }
    }

    // บันทึกไว้ว่าใครเป็นคนกำหนดและกำหนดเมื่อไร
    appointmentData.assignedBy = currentUser.username;
    appointmentData.assignedAt = new Date().toISOString();
    const apptStr = JSON.stringify(appointmentData);

    await pool.query('UPDATE requests SET supervisionAppointment = ? WHERE id = ?', [apptStr, req.params.id]);
    const [updated] = await pool.query('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    if (!updated[0]) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });

    // แจ้งเตือนอาจารย์ผู้ได้รับมอบหมายและนักศึกษาเจ้าของคำร้อง — ล้มเหลวได้โดยไม่กระทบการบันทึกวันนิเทศ
    try {
      const requestRow = updated[0];
      const supervisionDateLabel = appointmentData.date
        ? new Date(appointmentData.date).toLocaleDateString('th-TH')
        : 'ยังไม่ระบุ';
      let advisorUserId = appointmentData.advisorId ? Number(appointmentData.advisorId) : null;
      if (!advisorUserId && appointmentData.advisorName) {
        advisorUserId = await findUserIdByUsername(appointmentData.advisorName);
        if (!advisorUserId) {
          const [advRows] = await pool.query(
            'SELECT u.id FROM `user` u LEFT JOIN profile p ON u.id = p.user_id WHERE CONCAT(p.firstname, " ", p.lastname) = ? OR u.username = ? LIMIT 1',
            [appointmentData.advisorName, appointmentData.advisorName]
          );
          advisorUserId = advRows[0]?.id || null;
        }
      }

      if (advisorUserId) {
        await createNotification({
          userId: advisorUserId,
          type: 'supervision_assigned',
          title: 'ได้รับมอบหมายนิเทศนักศึกษา',
          message: `คุณได้รับมอบหมายให้นิเทศ ${requestRow.studentName || requestRow.studentId} วันที่ ${supervisionDateLabel} (${appointmentData.mode || '-'})`,
          link: '/advisor-dashboard/supervision',
          requestId: requestRow.id,
        });
      }

      const studentUserId = await findUserIdByUsername(requestRow.studentId);
      if (studentUserId) {
        await createNotification({
          userId: studentUserId,
          type: 'supervision_assigned',
          title: 'กำหนดวันนิเทศเรียบร้อยแล้ว',
          message: `อาจารย์${appointmentData.advisorName ? ` ${appointmentData.advisorName} ` : ' '}จะนิเทศคุณวันที่ ${supervisionDateLabel} (${appointmentData.mode || '-'})`,
          link: '/dashboard',
          requestId: requestRow.id,
        });
      }
    } catch (notifyErr) {
      console.error('[Notification] แจ้งเตือนกำหนดวันนิเทศล้มเหลว:', notifyErr.message);
    }

    res.json({ success: true, message: 'บันทึกวันนัดหมายและอาจารย์นิเทศสำเร็จ', data: serializeRequestRow(updated[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ เอกสารการนิเทศ (Supervision Documents) ============
const ACCEPTANCE_DOC_MIME = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg' };
const ACCEPTANCE_DOC_DIR = path.join(__dirname, '..', '..', 'uploads', 'acceptance');
const MAX_ACCEPTANCE_DOC_BYTES = 10 * 1024 * 1024; // 10MB

const SUPERVISION_DOC_MIME = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg' };
const SUPERVISION_DOC_DIR = path.join(__dirname, '..', '..', 'uploads', 'supervision');
const MAX_SUPERVISION_DOC_BYTES = 10 * 1024 * 1024; // 10MB

const parseDataUrl = (dataUrl) => {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!match) return null;
  return { mime: match[1].toLowerCase(), buffer: Buffer.from(match[2], 'base64') };
};

const loadAppointment = async (requestId) => {
  const [rows] = await pool.query('SELECT supervisionAppointment FROM requests WHERE id = ?', [requestId]);
  if (!rows[0]) return null;
  let appt = {};
  try {
    const raw = rows[0].supervisionAppointment;
    appt = typeof raw === 'string' ? (JSON.parse(raw || '{}')) : (raw || {});
  } catch (_) { appt = {}; }
  if (!Array.isArray(appt.documents)) appt.documents = [];
  return appt;
};

// POST /api/requests/:id/supervision-documents - แนบเอกสารนิเทศ (PDF/PNG/JPG ≤10MB)
router.post('/:id/supervision-documents', authenticate, async (req, res) => {
  try {
    if (!['admin', 'advisor'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'เฉพาะอาจารย์หรือผู้ดูแลระบบเท่านั้น' });
    }
    const { document_name, document_type, data_url } = req.body || {};
    if (!data_url || !document_name) {
      return res.status(400).json({ success: false, message: 'กรุณาแนบไฟล์เอกสารนิเทศ' });
    }
    const parsed = parseDataUrl(data_url);
    const ext = parsed ? SUPERVISION_DOC_MIME[parsed.mime] : null;
    if (!parsed || !ext) {
      return res.status(400).json({ success: false, message: 'รองรับเฉพาะไฟล์ PDF, PNG, JPG เท่านั้น' });
    }
    if (parsed.buffer.length > MAX_SUPERVISION_DOC_BYTES) {
      return res.status(400).json({ success: false, message: 'ไฟล์ต้องมีขนาดไม่เกิน 10MB' });
    }

    const appt = await loadAppointment(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });

    await fs.promises.mkdir(SUPERVISION_DOC_DIR, { recursive: true });
    const filename = `req${req.params.id}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    await fs.promises.writeFile(path.join(SUPERVISION_DOC_DIR, filename), parsed.buffer);

    const doc = {
      id: crypto.randomBytes(8).toString('hex'),
      name: String(document_name).slice(0, 255),
      type: String(document_type || 'เอกสารนิเทศ').slice(0, 50),
      url: `/uploads/supervision/${filename}`,
      size: parsed.buffer.length,
      mime: parsed.mime,
      uploadedBy: req.user.username,
      uploadedAt: new Date().toISOString()
    };
    appt.documents.push(doc);
    await pool.query('UPDATE requests SET supervisionAppointment = ? WHERE id = ?', [JSON.stringify(appt), req.params.id]);

    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    console.error('Supervision doc upload error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/requests/:id/supervision-documents/:docId - ลบเอกสารนิเทศ
router.delete('/:id/supervision-documents/:docId', authenticate, async (req, res) => {
  try {
    if (!['admin', 'advisor'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'เฉพาะอาจารย์หรือผู้ดูแลระบบเท่านั้น' });
    }
    const appt = await loadAppointment(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });

    const doc = appt.documents.find((d) => d.id === req.params.docId);
    if (!doc) return res.status(404).json({ success: false, message: 'ไม่พบเอกสาร' });

    // ลบไฟล์เฉพาะที่อยู่ใต้ /uploads/supervision/ เท่านั้น (กัน path traversal)
    if (doc.url && doc.url.startsWith('/uploads/supervision/')) {
      const filePath = path.join(SUPERVISION_DOC_DIR, path.basename(doc.url));
      await fs.promises.unlink(filePath).catch(() => {});
    }
    appt.documents = appt.documents.filter((d) => d.id !== doc.id);
    await pool.query('UPDATE requests SET supervisionAppointment = ? WHERE id = ?', [JSON.stringify(appt), req.params.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Supervision doc delete error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/requests/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      studentId, studentName, department, company, position, status,
      details, dispatchLetter, internship_start_date, internship_end_date,
      evaluator_email, evaluatorEmail, company_email, companyEmail
    } = req.body;
    const [rows] = await pool.query('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });

    const updates = [];
    const params = [];

    if (studentId !== undefined) { updates.push('studentId = ?'); params.push(studentId); }
    if (studentName !== undefined) { updates.push('studentName = ?'); params.push(studentName); }
    if (department !== undefined) { updates.push('department = ?'); params.push(department); }
    if (company !== undefined) { updates.push('company = ?'); params.push(company); }
    if (position !== undefined) { updates.push('position = ?'); params.push(position); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (internship_start_date !== undefined) { updates.push('internship_start_date = ?'); params.push(internship_start_date); }
    if (internship_end_date !== undefined) { updates.push('internship_end_date = ?'); params.push(internship_end_date); }

    // อีเมลสถานประกอบการ
    const targetCompEmail = company_email !== undefined ? company_email : companyEmail;
    if (targetCompEmail !== undefined) {
      const cleanCompEmail = targetCompEmail ? String(targetCompEmail).trim() : null;
      updates.push('company_email = ?');
      params.push(cleanCompEmail);
    }

    // อีเมลผู้ประเมิน — เฉพาะ admin (สำนักงานคณบดี) เท่านั้นที่เขียนได้
    // ตรวจการมีคีย์แยกจากค่า เพื่อให้ส่งค่าว่างมาเพื่อล้างอีเมลได้
    const hasEvalEmail = evaluator_email !== undefined || evaluatorEmail !== undefined;
    const targetEmail = evaluator_email !== undefined ? evaluator_email : evaluatorEmail;
    if (hasEvalEmail && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'เฉพาะเจ้าหน้าที่สำนักงานคณบดี (Admin) เท่านั้นที่แก้ไขอีเมลผู้ประเมินได้' });
    }
    if (hasEvalEmail) {
      updates.push('evaluator_email = ?');
      params.push(targetEmail || null);
    }

    if (details !== undefined) {
      let detailsObj = {};
      if (typeof details === 'object' && details !== null) {
        detailsObj = { ...details };
      } else if (typeof details === 'string') {
        try { detailsObj = JSON.parse(details) || {}; } catch (_) { detailsObj = {}; }
      }

      if (targetCompEmail !== undefined) {
        const cleanCompEmail = targetCompEmail ? String(targetCompEmail).trim() : null;
        detailsObj.companyEmail = cleanCompEmail;
        if (cleanCompEmail) detailsObj.contactEmail = cleanCompEmail;
      }

      if (hasEvalEmail && canEditEvalEmail) {
        detailsObj.evaluatorEmail = targetEmail || null;
      } else {
        // ผู้ที่แก้ไม่ได้ (เช่น นักศึกษา) ต้องไม่ลบอีเมลเดิมทิ้งผ่านการแก้ details
        let existingDetails = {};
        if (typeof rows[0].details === 'string') {
          try { existingDetails = JSON.parse(rows[0].details || '{}') || {}; } catch (_) {}
        } else if (rows[0].details && typeof rows[0].details === 'object') {
          existingDetails = rows[0].details;
        }
        const preserved = rows[0].evaluator_email || existingDetails.evaluatorEmail;
        if (preserved) detailsObj.evaluatorEmail = preserved;
      }

      updates.push('details = ?');
      params.push(JSON.stringify(detailsObj));
    }
    if (dispatchLetter !== undefined) {
      updates.push('dispatchLetter = ?');
      params.push(typeof dispatchLetter === 'object' ? JSON.stringify(dispatchLetter) : dispatchLetter);
    }

    if (updates.length > 0) {
      params.push(req.params.id);
      await pool.query(`UPDATE requests SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [updated] = await pool.query('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'แก้ไขคำร้องสำเร็จ', data: serializeRequestRow(updated[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/requests/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM advisor_evaluations WHERE requestId = ?', [req.params.id]);
    await pool.query('DELETE FROM evaluations WHERE requestId = ?', [req.params.id]);
    await pool.query('DELETE FROM requests WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'ลบคำร้องสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
// ใช้ร่วมกับ publicRequestRoutes — public mount ต้องผ่าน token gate เสมอ
module.exports.publicInternals = {
  handleGetSingleRequest,
  updateStatusHandler,
  isCompanyResponseTokenUsable,
};

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');
const { parseRequestRow, USER_SELECT_SQL } = require('../utils/helpers');
const { sendCompanyEvaluationEmail, buildEvaluationUrl } = require('../utils/emailService');
const { sendAdminEvaluationAlertEmail, sendStudentEvaluationNoticeEmail, findStudentEmail } = require('../utils/mailer');
const { createNotification, findUserIdsByRole } = require('../utils/notificationService');

// รอบการประเมินที่เปิดใช้งานอยู่ — ถ้ายังไม่เคยตั้งรอบไว้เลยจะได้ null (ไม่ปิดกั้นการประเมิน)
const getActiveEvaluationRound = async () => {
  try {
    const [rounds] = await pool.query('SELECT * FROM evaluation_rounds WHERE isActive = 1 ORDER BY id DESC LIMIT 1');
    return rounds[0] || null;
  } catch (_) {
    return null;
  }
};

// ตรวจว่าวันนี้อยู่ในช่วงของรอบที่เปิดอยู่หรือไม่
// คืน null = ประเมินได้, คืน object = ปิดอยู่พร้อมข้อความอธิบาย
const checkEvaluationRoundClosed = async () => {
  const round = await getActiveEvaluationRound();
  if (!round) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(round.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(round.endDate);
  end.setHours(23, 59, 59, 999);

  if (today >= start && today <= end) return null;

  const fmt = (d) => new Date(d).toLocaleDateString('th-TH');
  return {
    round,
    message: `ขณะนี้อยู่นอกช่วงเวลาการประเมิน (${round.title}: วันที่ ${fmt(round.startDate)} ถึง ${fmt(round.endDate)})`
  };
};

const INTERNSHIP_DONE_STATUS = 'ฝึกงานเสร็จแล้ว';

// ถ้าคำร้องนี้ประเมินครบทั้งสถานประกอบการและอาจารย์นิเทศแล้ว → ปิดสถานะเป็น "ฝึกงานเสร็จแล้ว" ทันที
// (แทนการรอ lazy transition 3 วันใน GET /requests)
const maybeMarkInternshipCompleted = async (requestId) => {
  const [rows] = await pool.query(
    `SELECT r.status,
            IF(e.id IS NOT NULL, 1, 0) AS hasCompanyEval,
            IF(ae.id IS NOT NULL, 1, 0) AS hasAdvisorEval
     FROM requests r
     LEFT JOIN evaluations e ON e.requestId = r.id
     LEFT JOIN advisor_evaluations ae ON ae.requestId = r.id
     WHERE r.id = ?`,
    [requestId]
  );
  const row = rows[0];
  if (!row) return false;
  if (row.hasCompanyEval && row.hasAdvisorEval && row.status !== INTERNSHIP_DONE_STATUS) {
    await pool.query('UPDATE requests SET status = ? WHERE id = ?', [INTERNSHIP_DONE_STATUS, requestId]);
    console.log(`[Evaluation] คำร้อง #${requestId} ประเมินครบ 2 ฝ่าย → "${INTERNSHIP_DONE_STATUS}" อัตโนมัติ`);
    return true;
  }
  return false;
};

// =============================================
// Company Evaluations (Public & Analytics)
// =============================================

// GET /api/public/evaluate/request/:id
router.get('/public/evaluate/request/:id', async (req, res) => {
  try {
    const closed = await checkEvaluationRoundClosed();
    if (closed) {
      return res.json({ success: true, evaluated: false, roundClosed: true, roundMessage: closed.message });
    }

    const [rows] = await pool.query('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });

    const [evalRows] = await pool.query('SELECT id FROM evaluations WHERE requestId = ?', [req.params.id]);
    if (evalRows.length > 0) {
      return res.json({ success: true, evaluated: true, message: 'นักศึกษาคนนี้ได้รับการประเมินแล้ว' });
    }
    res.json({ success: true, evaluated: false, data: parseRequestRow(rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/public/evaluate/:requestId
router.post('/public/evaluate/:requestId', async (req, res) => {
  try {
    // ปิดกั้นที่ฝั่งเซิร์ฟเวอร์ด้วย ไม่ใช่แค่ซ่อนหน้าจอ
    const closed = await checkEvaluationRoundClosed();
    if (closed) {
      return res.status(403).json({ success: false, roundClosed: true, message: closed.message });
    }

    const reqId = req.params.requestId;

    // ล็อกการประเมินจนกว่าจะถึงวันสิ้นสุดฝึกงานจริงตามปฏิทิน
    const [reqRows] = await pool.query('SELECT internship_end_date, details FROM requests WHERE id = ?', [reqId]);
    const reqRow = reqRows[0];
    let endDateRaw = reqRow?.internship_end_date || null;
    if (!endDateRaw && reqRow?.details) {
      try {
        const d = typeof reqRow.details === 'object' ? reqRow.details : JSON.parse(reqRow.details);
        endDateRaw = d.endDate || null;
      } catch (_) {}
    }
    if (endDateRaw) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const internshipEndDate = new Date(endDateRaw);
      internshipEndDate.setHours(0, 0, 0, 0);
      if (today < internshipEndDate) {
        const endLabel = internshipEndDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
        return res.status(400).json({
          success: false,
          message: `ไม่สามารถส่งแบบประเมินก่อนกำหนดได้ กรุณาประเมินตั้งแต่วันที่ ${endLabel} เป็นต้นไป`,
        });
      }
    }

    const {
      studentId, evaluatorName, evaluatorPosition, evaluatorDepartment,
      q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q18, q19, q20,
      strengths, improvements, hireFuture, overallScore, projectUsage, otherComments, signature
    } = req.body;

    await pool.query(
      `INSERT INTO evaluations (
        requestId, studentId, evaluatorName, evaluatorPosition, evaluatorDepartment,
        q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q18, q19, q20,
        strengths, improvements, hireFuture, overallScore, projectUsage, otherComments, signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reqId, studentId, evaluatorName, evaluatorPosition, evaluatorDepartment,
        q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q18, q19, q20,
        strengths, improvements, hireFuture, overallScore, projectUsage, otherComments, signature || null
      ]
    );

    // ถ้าอาจารย์นิเทศประเมินไว้แล้ว → ครบ 2 ฝ่าย ปิดงานเป็น "ฝึกงานเสร็จแล้ว" ทันที
    const bothEvaluated = await maybeMarkInternshipCompleted(reqId);
    if (!bothEvaluated) {
      await pool.query('UPDATE requests SET status = ? WHERE id = ?', ['ประเมินเสร็จแล้ว', reqId]);
    }

    // แจ้งเตือน admin — inbox ในระบบ + อีเมล ทั้งคู่เป็น non-blocking (ล้มเหลวไม่กระทบการบันทึกคะแนน)
    try {
      const [infoRows] = await pool.query('SELECT studentName, studentId, company FROM requests WHERE id = ?', [reqId]);
      const info = infoRows[0] || {};
      const companyName = info.company || 'สถานประกอบการ';
      const totalScore = [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q18, q19, q20]
        .reduce((sum, v) => sum + (Number.isFinite(Number(v)) ? Number(v) : 0), 0);

      // 1) Notification inbox ของ admin ทุกคน
      const adminUserIds = await findUserIdsByRole('admin');
      await Promise.all(adminUserIds.map((adminId) => createNotification({
        userId: adminId,
        type: 'company_evaluation_submitted',
        title: 'สถานประกอบการประเมินผลการฝึกงานแล้ว',
        message: `${companyName} ประเมินผลการฝึกงานของ ${info.studentName || 'นักศึกษา'} (${info.studentId || '-'}) เรียบร้อยแล้ว (คะแนนรวม: ${totalScore} คะแนน)`,
        link: `/dashboard/request/${reqId}`,
        requestId: Number(reqId),
      })));

      // 2) อีเมลถึง ADMIN_EMAIL + อีเมล admin ทุกคนในระบบ
      const adminEmails = new Set();
      if (process.env.ADMIN_EMAIL) adminEmails.add(process.env.ADMIN_EMAIL.trim());
      const [adminRows] = await pool.query("SELECT email FROM `user` WHERE role = 'admin' AND email IS NOT NULL AND email != ''");
      adminRows.forEach((r) => r.email && adminEmails.add(String(r.email).trim()));

      for (const adminEmail of adminEmails) {
        await sendAdminEvaluationAlertEmail({
          to: adminEmail,
          studentName: info.studentName,
          studentId: info.studentId,
          companyName,
          evaluatorName,
          evaluatorPosition,
          totalScore,
          maxScore: 100,
          comments: otherComments || improvements || strengths,
          requestId: reqId,
        });
      }
      console.log(`[PublicEvaluation] แจ้งเตือน admin แล้ว — inbox ${adminUserIds.length} คน, อีเมล ${adminEmails.size} ที่อยู่`);

      // 3) แจ้งเตือนนักศึกษา — แจ้งเฉพาะ "สถานะว่าประเมินเสร็จ" ไม่เปิดเผยคะแนน/เปอร์เซ็นต์/เกรด
      const studentSid = info.studentId || studentId;
      const [studentUserRows] = await pool.query('SELECT id FROM `user` WHERE username = ? LIMIT 1', [String(studentSid || '')]);
      if (studentUserRows[0]) {
        await createNotification({
          userId: studentUserRows[0].id,
          type: 'company_evaluation_submitted',
          title: 'สถานประกอบการส่งผลการประเมินแล้ว',
          message: `${companyName} บันทึกและส่งแบบประเมินผลการปฏิบัติงานของคุณเรียบร้อยแล้ว — อยู่ระหว่างการตรวจสอบและสรุปผลร่วมกับอาจารย์นิเทศ`,
          link: `/dashboard/request/${reqId}`,
          requestId: Number(reqId),
        });
      }
      const studentEmail = await findStudentEmail(studentSid);
      if (studentEmail) {
        await sendStudentEvaluationNoticeEmail({
          to: studentEmail,
          studentName: info.studentName,
          companyName,
          requestId: reqId,
        });
      }
    } catch (notifyErr) {
      console.error('[PublicEvaluation] Error notifying admins:', notifyErr);
    }

    res.status(201).json({ success: true, message: 'บันทึกและส่งผลการประเมินเรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/evaluations/request/:requestId
router.get('/evaluations/request/:requestId', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM evaluations WHERE requestId = ?', [req.params.requestId]);
    if (!rows[0]) return res.json({ success: true, data: null });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/evaluations/analytics
router.get('/evaluations/analytics', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const [rows] = await pool.query(`
      SELECT 
        r.department, 
        r.company,
        e.q1, e.q2, e.q3, e.q4, e.q5, e.q6, e.q7, e.q8, e.q9, e.q10,
        e.q11, e.q12, e.q13, e.q14, e.q15, e.q16, e.q17, e.q18, e.q19, e.q20,
        e.hireFuture
      FROM evaluations e
      JOIN requests r ON e.requestId = r.id
      WHERE r.status IN ('ประเมินเสร็จแล้ว', 'ฝึกงานเสร็จแล้ว')
    `);

    const deptStats = {};
    const companyStats = {};
    let totalEvals = 0;

    rows.forEach(row => {
      totalEvals++;
      if (!deptStats[row.department]) {
        deptStats[row.department] = {
          count: 0,
          cat1: { sum: 0, count: 0 },
          cat2: { sum: 0, count: 0 },
          cat3: { sum: 0, count: 0 }
        };
      }
      deptStats[row.department].count++;

      const sumAvg = (start, end, targetObj) => {
        for(let i=start; i<=end; i++) {
          const val = row[`q${i}`];
          if (val && !isNaN(val)) {
            targetObj.sum += parseInt(val);
            targetObj.count++;
          }
        }
      };

      sumAvg(1, 2, deptStats[row.department].cat1);
      sumAvg(3, 14, deptStats[row.department].cat2);
      sumAvg(15, 20, deptStats[row.department].cat3);

      if (row.company) {
        if (!companyStats[row.company]) {
          companyStats[row.company] = { total: 0, hire: 0, maybe: 0, no: 0 };
        }
        companyStats[row.company].total++;
        if (row.hireFuture === 'รับ') companyStats[row.company].hire++;
        else if (row.hireFuture === 'ไม่แน่ใจ') companyStats[row.company].maybe++;
        else if (row.hireFuture === 'ไม่รับ') companyStats[row.company].no++;
      }
    });

    const formattedDeptStats = Object.keys(deptStats).map(dept => {
      const d = deptStats[dept];
      return {
        department: dept,
        count: d.count,
        avgCat1: d.cat1.count > 0 ? (d.cat1.sum / d.cat1.count).toFixed(2) : 0,
        avgCat2: d.cat2.count > 0 ? (d.cat2.sum / d.cat2.count).toFixed(2) : 0,
        avgCat3: d.cat3.count > 0 ? (d.cat3.sum / d.cat3.count).toFixed(2) : 0,
      };
    });

    res.json({ 
      success: true, 
      data: {
        totalEvals,
        departments: formattedDeptStats,
        companies: companyStats
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================
// Advisor Evaluations
// =============================================

// GET /api/advisor-evaluations/request/:requestId
router.get('/advisor-evaluations/request/:requestId', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM advisor_evaluations WHERE requestId = ?', [req.params.requestId]);
    if (!rows[0]) return res.json({ success: true, data: null });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/advisor-evaluations/request/:requestId
router.post('/advisor-evaluations/request/:requestId', authenticate, async (req, res) => {
  try {
    const reqId = req.params.requestId;
    const {
      advisorName,
      c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17, companyComments,
      s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, studentComments
    } = req.body;

    // ตรวจสิทธิ์ผู้นิเทศ: ต้องเป็นอาจารย์ที่ได้รับมอบหมายในคำร้องนี้ (admin ยกเว้น)
    const [rAuthRows] = await pool.query('SELECT id, supervisionAppointment FROM requests WHERE id = ?', [reqId]);
    if (!rAuthRows[0]) {
      return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
    }

    let appt = null;
    try {
      appt = typeof rAuthRows[0].supervisionAppointment === 'object'
        ? rAuthRows[0].supervisionAppointment
        : JSON.parse(rAuthRows[0].supervisionAppointment || 'null');
    } catch (_) {}

    const [uRows] = await pool.query(`${USER_SELECT_SQL} WHERE u.id = ? GROUP BY u.id`, [req.user.id]);
    const currentUser = uRows[0];
    const isAdmin = currentUser?.role === 'admin';
    const currentName = [currentUser?.firstname, currentUser?.lastname].filter(Boolean).join(' ').trim()
      || currentUser?.username || '';

    const assignedId = appt?.advisorId ? Number(appt.advisorId) : null;
    const assignedName = String(appt?.advisorName || '').trim();
    const isAssigned = Boolean(
      (assignedId && assignedId === Number(req.user.id)) ||
      (assignedName && (assignedName === currentName || assignedName === currentUser?.username))
    );

    if (!isAdmin && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'เฉพาะอาจารย์ผู้นิเทศที่ได้รับมอบหมายในคำร้องนี้เท่านั้นที่บันทึกผลนิเทศได้',
      });
    }

    const [existing] = await pool.query('SELECT id FROM advisor_evaluations WHERE requestId = ?', [reqId]);
    if (existing.length > 0) {
      // บันทึกผลนิเทศแล้ว — ห้ามแก้ไขซ้ำ (ต้องให้ admin reset หากจำเป็น)
      return res.status(409).json({
        success: false,
        message: 'คำร้องนี้บันทึกผลการนิเทศเรียบร้อยแล้ว ไม่สามารถแก้ไขได้',
      });
    }
    await pool.query(
      `INSERT INTO advisor_evaluations (
        requestId, advisorName,
        c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17, companyComments,
        s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, studentComments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reqId, advisorName,
        c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17, companyComments,
        s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, studentComments
      ]
    );

    await pool.query(
      `UPDATE requests SET advisor_comment = ? WHERE id = ?`,
      ['ประเมินแบบฟอร์มละเอียดแล้ว (ผลการนิเทศ: ผ่าน)', reqId]
    );

    // ถ้าสถานประกอบการประเมินไว้แล้ว → ครบ 2 ฝ่าย ปิดงานเป็น "ฝึกงานเสร็จแล้ว" ทันที
    try {
      await maybeMarkInternshipCompleted(reqId);
    } catch (statusErr) {
      console.error('[AdvisorEvaluation] auto-complete status ล้มเหลว:', statusErr.message);
    }

    // เมื่ออาจารย์บันทึกผลนิเทศแล้ว ส่งลิงก์แบบประเมินให้ผู้ประเมินฝั่งสถานประกอบการ
    // การส่งอีเมลล้มเหลวต้องไม่ทำให้การบันทึกผลนิเทศล้มเหลวตามไปด้วย
    let emailSent = false;
    let emailSimulated = false;
    let recipientEmail = null;
    try {
      const [rRows] = await pool.query('SELECT * FROM requests WHERE id = ?', [reqId]);
      if (rRows[0]) {
        const reqItem = rRows[0];
        let detailsObj = {};
        if (reqItem.details) {
          try {
            detailsObj = typeof reqItem.details === 'object' ? reqItem.details : JSON.parse(reqItem.details);
          } catch (_) {}
        }

        recipientEmail = reqItem.evaluator_email || detailsObj.evaluatorEmail || reqItem.company_email || detailsObj.contactEmail || null;
        console.log('[AdvisorEvaluation] ผู้รับอีเมลแบบประเมิน →', JSON.stringify({
          requestId: reqId,
          evaluator_email: reqItem.evaluator_email || null,
          details_evaluatorEmail: detailsObj.evaluatorEmail || null,
          company_email: reqItem.company_email || null,
          details_contactEmail: detailsObj.contactEmail || null,
          resolved: recipientEmail,
        }));
        if (recipientEmail) {
          const startDateRaw = reqItem.internship_start_date || detailsObj.startDate || null;
          const endDateRaw = reqItem.internship_end_date || detailsObj.endDate || null;
          const fmtThai = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
          const result = await sendCompanyEvaluationEmail({
            to: recipientEmail,
            studentName: reqItem.studentName,
            studentId: reqItem.studentId,
            companyName: reqItem.company,
            advisorName,
            startDate: fmtThai(startDateRaw),
            endDate: fmtThai(endDateRaw),
            evaluationUrl: buildEvaluationUrl(reqId),
          });

          emailSent = result.success && !result.simulated;
          emailSimulated = Boolean(result.simulated);
          console.log(`[AdvisorEvaluation] ผลการส่งอีเมล → success:${result.success} simulated:${emailSimulated} via:${result.via || '-'} reason:${result.reason || '-'}`);

          detailsObj.evaluatorEmailSent = emailSent;
          detailsObj.evaluatorEmailSentAt = emailSent ? new Date().toISOString() : null;
          await pool.query('UPDATE requests SET details = ? WHERE id = ?', [JSON.stringify(detailsObj), reqId]);
        }
      }
    } catch (mailErr) {
      console.error('[AdvisorEvaluation] Error sending email:', mailErr);
    }

    // แจ้งเตือน Admin ทุกคนว่าอาจารย์บันทึกผลนิเทศแล้ว — ห้ามใส่ URL แบบประเมินของสถานประกอบการ
    // ในการแจ้งเตือนนี้เด็ดขาด (ลิงก์นั้นมีไว้สำหรับผู้ประเมินฝั่งสถานประกอบการเท่านั้น) และห้ามส่งแจ้งเตือนนี้ถึงนักศึกษา
    try {
      const emailStatusText = emailSent
        ? 'ระบบส่งแบบประเมินให้สถานประกอบการทางอีเมลแล้ว'
        : recipientEmail
          ? 'ส่งอีเมลแบบประเมินไปยังสถานประกอบการไม่สำเร็จ กรุณาตรวจสอบอีเมลผู้ประเมิน'
          : 'ยังไม่มีอีเมลผู้ประเมินของสถานประกอบการในระบบ จึงยังไม่ได้ส่งแบบประเมิน';

      const adminUserIds = await findUserIdsByRole('admin');
      await Promise.all(adminUserIds.map((adminId) => createNotification({
        userId: adminId,
        type: 'supervision_completed',
        title: 'อาจารย์ประเมินนิเทศแล้ว',
        message: `${advisorName || 'อาจารย์ที่ปรึกษา'} ประเมินนิเทศคำร้องเลขที่ ${reqId} แล้ว — ${emailStatusText}`,
        link: `/dashboard/request/${reqId}`,
        requestId: Number(reqId),
      })));
    } catch (notifyErr) {
      console.error('[Notification] แจ้งเตือน Admin เรื่องผลนิเทศล้มเหลว:', notifyErr.message);
    }

    let message = 'บันทึกผลการนิเทศสำเร็จ';
    if (emailSent) {
      message = `บันทึกผลการนิเทศสำเร็จ และส่งอีเมลแบบประเมินไปยัง ${recipientEmail} เรียบร้อยแล้ว`;
    } else if (emailSimulated) {
      message = 'บันทึกผลการนิเทศสำเร็จ (ยังไม่ได้ตั้งค่าระบบอีเมล จึงยังไม่ได้ส่งแบบประเมิน)';
    } else if (recipientEmail) {
      message = `บันทึกผลการนิเทศสำเร็จ แต่ส่งอีเมลไปยัง ${recipientEmail} ไม่สำเร็จ`;
    } else {
      message = 'บันทึกผลการนิเทศสำเร็จ (ยังไม่ได้ระบุอีเมลผู้ประเมิน จึงยังไม่ได้ส่งแบบประเมิน)';
    }

    res.status(201).json({ success: true, message, emailSent, emailSimulated, recipientEmail });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================
// Evaluation Rounds — รอบการประเมินสถานประกอบการ
// =============================================

// GET /api/evaluation-rounds — รายการรอบทั้งหมด
router.get('/evaluation-rounds', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM evaluation_rounds ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/evaluation-rounds/active — รอบที่เปิดใช้งานอยู่ พร้อมสถานะว่าอยู่ในช่วงเวลาหรือยัง
router.get('/evaluation-rounds/active', async (req, res) => {
  try {
    const active = await getActiveEvaluationRound();
    const closed = await checkEvaluationRoundClosed();
    res.json({
      success: true,
      data: active,
      isOpen: !closed,
      roundMessage: closed ? closed.message : null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/evaluation-rounds — สร้างรอบใหม่
router.post('/admin/evaluation-rounds', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, academicYear, semester, startDate, endDate, isActive } = req.body;
    if (!title || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อรอบ วันที่เริ่มต้น และวันที่สิ้นสุด' });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ success: false, message: 'วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่มต้น' });
    }

    // ค่าเริ่มต้นคือเปิดใช้งาน และเปิดได้ทีละรอบเท่านั้น
    const willBeActive = isActive === undefined ? true : Boolean(isActive);
    if (willBeActive) {
      await pool.query('UPDATE evaluation_rounds SET isActive = 0');
    }

    const [result] = await pool.query(
      `INSERT INTO evaluation_rounds (title, academicYear, semester, startDate, endDate, isActive)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, academicYear || null, semester || null, startDate, endDate, willBeActive ? 1 : 0]
    );

    const [newRow] = await pool.query('SELECT * FROM evaluation_rounds WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'สร้างรอบการประเมินสำเร็จ', data: newRow[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/evaluation-rounds/:id — แก้ไขรอบ
router.put('/admin/evaluation-rounds/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, academicYear, semester, startDate, endDate, isActive } = req.body;
    const [existing] = await pool.query('SELECT * FROM evaluation_rounds WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ success: false, message: 'ไม่พบรอบการประเมิน' });

    const nextStart = startDate !== undefined ? startDate : existing[0].startDate;
    const nextEnd = endDate !== undefined ? endDate : existing[0].endDate;
    if (new Date(nextEnd) < new Date(nextStart)) {
      return res.status(400).json({ success: false, message: 'วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่มต้น' });
    }

    if (isActive) {
      await pool.query('UPDATE evaluation_rounds SET isActive = 0 WHERE id != ?', [req.params.id]);
    }

    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (academicYear !== undefined) { updates.push('academicYear = ?'); params.push(academicYear || null); }
    if (semester !== undefined) { updates.push('semester = ?'); params.push(semester || null); }
    if (startDate !== undefined) { updates.push('startDate = ?'); params.push(startDate); }
    if (endDate !== undefined) { updates.push('endDate = ?'); params.push(endDate); }
    if (isActive !== undefined) { updates.push('isActive = ?'); params.push(isActive ? 1 : 0); }

    if (updates.length > 0) {
      params.push(req.params.id);
      await pool.query(`UPDATE evaluation_rounds SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [updated] = await pool.query('SELECT * FROM evaluation_rounds WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'อัปเดตรอบการประเมินสำเร็จ', data: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/evaluation-rounds/:id — ลบรอบ
router.delete('/admin/evaluation-rounds/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM evaluation_rounds WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ success: false, message: 'ไม่พบรอบการประเมิน' });

    await pool.query('DELETE FROM evaluation_rounds WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'ลบรอบการประเมินสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

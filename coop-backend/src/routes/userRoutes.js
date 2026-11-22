const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');
const { toFrontendUser, USER_SELECT_SQL, DEPARTMENT_MAP, DEPARTMENT_NAME_TO_ID } = require('../utils/helpers');

// GET /api/users — ดึงผู้ใช้ทั้งหมด
router.get('/', authenticate, async (req, res) => {
  try {
    const { role, search, department_id, department } = req.query;
    let sql = `${USER_SELECT_SQL} WHERE 1=1`;
    const params = [];

    if (role) { sql += ' AND u.role = ?'; params.push(role); }
    // กรองตามสาขา: เทียบ profile.department_id หรือ user.department (normalize ตัด "สาขาวิชา"/ช่องว่าง)
    if (department_id || department) {
      const deptName = department || DEPARTMENT_MAP[Number(department_id)] || '';
      const deptCore = deptName.replace(/สาขาวิชา/g, '').replace(/\s+/g, '');
      sql += ` AND (
        p.department_id = ?
        OR REPLACE(REPLACE(TRIM(u.department), 'สาขาวิชา', ''), ' ', '') = ?
        OR REPLACE(REPLACE(TRIM(u.department), 'สาขาวิชา', ''), ' ', '') LIKE CONCAT('%', ?, '%')
      )`;
      params.push(Number(department_id) || 0, deptCore, deptCore);
    }
    if (search) {
      sql += ' AND (u.username LIKE ? OR u.email LIKE ? OR p.firstname LIKE ? OR p.lastname LIKE ? OR p.profile_id LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    sql += ' GROUP BY u.id ORDER BY u.createdAt DESC';
    const [rows] = await pool.query(sql, params);
    let users = rows.map(toFrontendUser);

    if (role === 'student') {
      const allowedPrefixes = ['66', '67', '68', '69'];
      users = users.filter(student => {
        const code = String(student.student_code || student.studentId || student.username || '').trim();
        return allowedPrefixes.some(prefix => code.startsWith(prefix)) || code.startsWith('student');
      });

      // แนบคำร้องล่าสุดของนักศึกษาแต่ละคน (สถานะ/บริษัท/เบอร์โทรจากฟอร์ม) สำหรับหน้าอาจารย์ที่ปรึกษา
      try {
        const codes = users
          .map((u) => String(u.student_code || u.studentId || u.username || '').trim())
          .filter(Boolean);
        if (codes.length > 0) {
          const [reqRows] = await pool.query(
            `SELECT r.id, r.studentId, r.status,
                    COALESCE((SELECT rr.new_company_name FROM internship_relocation_requests rr
                              WHERE rr.internship_request_id = r.id AND rr.status = 'completed'
                              ORDER BY rr.created_at DESC, rr.id DESC LIMIT 1), r.company) AS company,
                    r.details
             FROM requests r
             INNER JOIN (
               SELECT studentId, MAX(id) AS maxId
               FROM requests WHERE studentId IN (?) GROUP BY studentId
             ) latest ON r.id = latest.maxId`,
            [codes]
          );
          const reqMap = {};
          reqRows.forEach((row) => {
            let phone = '';
            try {
              const d = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
              phone = d?.student_info?.phone || d?.student_info?.tel || d?.phone || '';
            } catch (_) {}
            reqMap[String(row.studentId)] = {
              requestId: row.id,
              status: row.status || '',
              company: row.company || '',
              phone,
            };
          });
          users = users.map((u) => {
            const req = reqMap[String(u.student_code || u.studentId || u.username || '').trim()];
            if (!req) return u;
            return {
              ...u,
              latest_request_status: req.status,
              company_name: req.company,
              request_id: req.requestId,
              request_phone: req.phone,
            };
          });
        }
      } catch (enrichErr) {
        console.warn('[Users] ดึงคำร้องล่าสุดของนักศึกษาไม่สำเร็จ:', enrichErr.message);
      }
    }

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/students/paged — รายชื่อนักศึกษาแบบแบ่งหน้า (Admin/Advisor)
// ดึงจากฐานข้อมูลทีละหน้า + แนบคำร้อง/การชำระเงินล่าสุดเฉพาะแถวที่ส่งกลับ (ไม่โหลดทั้งระบบ)
//   page, limit (ค่าเริ่มต้น 20; limit=all ดึงทั้งหมดที่กรองไว้สำหรับ Export), year, department, q,
//   codes (รหัสนักศึกษาคั่นด้วยจุลภาค), includeSlip=1 (แนบรูปสลิปเต็ม — ใช้เฉพาะตอน Export)
router.get('/students/paged', authenticate, authorize('admin', 'advisor'), async (req, res) => {
  try {
    const { year, department, q, codes, includeSlip } = req.query;
    const wantAll = String(req.query.limit || '').toLowerCase() === 'all';
    const limit = wantAll ? 5000 : Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);
    const page = wantAll ? 1 : Math.max(parseInt(req.query.page, 10) || 1, 1);

    const CODE = "COALESCE(NULLIF(p1.profile_id, ''), NULLIF(p2.profile_id, ''), NULLIF(u.studentId, ''), u.username)";
    const FROM_SQL = `
      FROM \`user\` u
      LEFT JOIN \`profile\` p1 ON p1.profile_id = u.username
      LEFT JOIN \`profile\` p2 ON p2.profile_id = u.studentId AND u.studentId <> ''`;

    const prefixes = ['66', '67', '68', '69'];
    const where = [
      "u.role = 'student'",
      `(${prefixes.map(() => `${CODE} LIKE ?`).join(' OR ')} OR ${CODE} LIKE 'student%')`,
    ];
    const params = prefixes.map((prefix) => `${prefix}%`);

    if (year && year !== 'all') {
      where.push(`${CODE} LIKE ?`);
      params.push(`${String(year).replace(/[^0-9]/g, '').slice(0, 2)}%`);
    }
    if (department && department !== 'all') {
      const deptId = DEPARTMENT_NAME_TO_ID[department] || 0;
      where.push("(u.department = ? OR ((u.department IS NULL OR u.department = '') AND COALESCE(p1.department_id, p2.department_id) = ?))");
      params.push(department, deptId);
    }
    if (q && String(q).trim()) {
      const like = `%${String(q).trim()}%`;
      where.push(`(${CODE} LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR CONCAT_WS(' ', COALESCE(p1.firstname, p2.firstname), COALESCE(p1.lastname, p2.lastname)) LIKE ?)`);
      params.push(like, like, like, like);
    }
    if (codes) {
      const list = String(codes).split(',').map((c) => c.trim()).filter(Boolean).slice(0, 1000);
      if (list.length === 0) {
        return res.json({ success: true, data: [], meta: { page: 1, limit, total: 0, totalPages: 1, totalWithSlips: 0, years: [] } });
      }
      where.push(`${CODE} IN (?)`);
      params.push(list);
    }
    const WHERE_SQL = `WHERE ${where.join(' AND ')}`;

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${FROM_SQL} ${WHERE_SQL}`, params);
    const [[{ totalWithSlips }]] = await pool.query(
      `SELECT COUNT(*) AS totalWithSlips ${FROM_SQL} ${WHERE_SQL}
         AND EXISTS (SELECT 1 FROM payment_proofs pp WHERE pp.studentId = ${CODE} AND pp.slipDataUrl IS NOT NULL AND pp.slipDataUrl <> '')`,
      params
    );

    const [rows] = await pool.query(
      `SELECT u.*, ${CODE} AS profile_id,
              COALESCE(p1.firstname, p2.firstname) AS firstname, COALESCE(p1.lastname, p2.lastname) AS lastname,
              COALESCE(p1.faculty_id, p2.faculty_id) AS faculty_id, COALESCE(p1.department_id, p2.department_id) AS department_id,
              COALESCE(p1.address, p2.address) AS profile_address, COALESCE(p1.phone, p2.phone) AS profile_phone
       ${FROM_SQL} ${WHERE_SQL}
       ORDER BY u.createdAt DESC, u.id ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    const students = rows.map(toFrontendUser);
    const pageCodes = students.map((s) => String(s.student_code || s.username)).filter(Boolean);

    const latestReq = new Map();
    const latestPay = new Map();
    if (pageCodes.length > 0) {
      const [reqRows] = await pool.query(
        'SELECT id, studentId, status, department, details FROM requests WHERE studentId IN (?) ORDER BY id ASC',
        [pageCodes]
      );
      reqRows.forEach((r) => latestReq.set(String(r.studentId), r));
      const slipCol = String(includeSlip) === '1' ? ', slipDataUrl' : '';
      const [payRows] = await pool.query(
        `SELECT id, studentId, status, (slipDataUrl IS NOT NULL AND slipDataUrl <> '') AS hasSlip${slipCol}
         FROM payment_proofs WHERE studentId IN (?) ORDER BY created_at ASC, id ASC`,
        [pageCodes]
      );
      payRows.forEach((p) => latestPay.set(String(p.studentId), p));
    }

    const data = students.map((student) => {
      const code = String(student.student_code || student.username);
      const reqRow = latestReq.get(code) || null;
      const pay = latestPay.get(code) || null;
      let details = {};
      if (reqRow && reqRow.details) {
        try { details = typeof reqRow.details === 'object' ? reqRow.details : JSON.parse(reqRow.details); } catch (_) { details = {}; }
      }
      const phoneFromForm = details.studentPhone || details.student_info?.phone || details.phone || details.mobile || details.tel;
      const dept = student.major || student.department || reqRow?.department || '';
      return {
        ...student,
        phone: phoneFromForm || student.phone || '-',
        department: dept,
        major: dept,
        requestStatus: reqRow ? reqRow.status : 'ยังไม่ยื่นคำร้อง',
        paymentStatus: pay ? pay.status : 'ยังไม่ชำระเงิน',
        paymentId: pay ? pay.id : null,
        hasSlip: Boolean(pay && pay.hasSlip),
        paymentSlip: pay && pay.slipDataUrl ? pay.slipDataUrl : null,
      };
    });

    const [yearRows] = await pool.query(
      `SELECT DISTINCT SUBSTRING(COALESCE(NULLIF(u.studentId, ''), u.username), 1, 2) AS yr
       FROM \`user\` u
       WHERE u.role = 'student' AND COALESCE(NULLIF(u.studentId, ''), u.username) REGEXP '^(66|67|68|69)'
       ORDER BY yr`
    );

    res.json({
      success: true,
      data,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), totalWithSlips, years: yearRows.map((r) => r.yr) },
    });
  } catch (error) {
    console.error('[Users] students/paged error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ปีการศึกษา พ.ศ. ปัจจุบัน (ปีการศึกษาเริ่มเดือนมิถุนายน)
const currentAcademicYearBE = () => {
  const now = new Date();
  return now.getFullYear() + 543 - (now.getMonth() + 1 < 6 ? 1 : 0);
};

// GET /api/users/:id/student-profile — ข้อมูลโปรไฟล์นักศึกษาครบทุกส่วน (เจ้าของบัญชี / admin / advisor)
// รวมข้อมูลจาก user + profile + departments + student_educations + student_addresses + requests
router.get('/:id/student-profile', authenticate, async (req, res) => {
  try {
    const isSelf = String(req.user.id) === String(req.params.id);
    if (!isSelf && !['admin', 'advisor'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์เข้าถึง' });
    }
    const [rows] = await pool.query(`${USER_SELECT_SQL} WHERE u.id = ? GROUP BY u.id`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
    const base = toFrontendUser(rows[0]);
    const code = String(base.student_code || base.username || '').trim();

    const [profRows] = await pool.query(
      'SELECT prefix, firstname, lastname, address, phone, student_status FROM `profile` WHERE profile_id = ? LIMIT 1',
      [code]
    );
    const prof = profRows[0] || {};

    // ชื่อสาขา/คณะจากตารางอ้างอิง (department_id ในตาราง profile คือ departments.id)
    let departmentName = base.department || '';
    let facultyName = '';
    if (base.department_id) {
      const [dRows] = await pool.query(
        `SELECT d.department_name, f.faculty_name FROM departments d
         LEFT JOIN faculties f ON f.id = d.faculty_id WHERE d.id = ? LIMIT 1`,
        [base.department_id]
      );
      if (dRows[0]) {
        departmentName = departmentName || dRows[0].department_name || '';
        facultyName = dRows[0].faculty_name || '';
      }
    }

    // เกรดเฉลี่ย: ใช้เฉพาะประวัติการศึกษาระดับปริญญาตรี (ไม่นำเกรดมัธยมมาแสดงเป็น GPAX)
    const [eduRows] = await pool.query(
      `SELECT gpa FROM student_educations
       WHERE profile_id = ? AND level LIKE '%ตรี%' AND gpa IS NOT NULL AND gpa <> ''
       ORDER BY order_index ASC, id DESC LIMIT 1`,
      [code]
    );
    const gpa = eduRows[0]?.gpa || '';

    // ที่อยู่ปัจจุบัน: student_addresses (current) → fallback profile.address
    const [addrRows] = await pool.query(
      "SELECT * FROM student_addresses WHERE profile_id = ? AND type = 'current' ORDER BY id DESC LIMIT 1",
      [code]
    );
    const a = addrRows[0];
    const structured = a
      ? [a.address_line, a.house_no && `เลขที่ ${a.house_no}`, a.village_no && `หมู่ ${a.village_no}`, a.road && `ถนน${a.road}`,
         a.subdistrict && `ต.${a.subdistrict}`, a.district && `อ.${a.district}`, a.province && `จ.${a.province}`, a.postal_code]
          .filter(Boolean).join(' ')
      : '';
    const address = (prof.address || '').trim() || structured;

    // ชั้นปี: คำนวณจากรหัสนักศึกษา 2 หลักแรก (ปีที่เข้าศึกษา พ.ศ.) เทียบปีการศึกษาปัจจุบัน
    let yearLevel = null;
    const entry = /^(\d{2})\d{5,}$/.exec(code);
    if (entry) {
      const y = currentAcademicYearBE() - (2500 + Number(entry[1])) + 1;
      if (y >= 1 && y <= 8) yearLevel = y;
    }

    // คำร้องล่าสุด + อาจารย์ที่ปรึกษา (อาจารย์ผูกกับการนัดนิเทศในคำร้อง ไม่มีคอลัมน์ advisor ในตารางนักศึกษา)
    const [reqRows] = await pool.query(
      'SELECT id, status, supervisionAppointment FROM requests WHERE studentId = ? ORDER BY id DESC LIMIT 1',
      [code]
    );
    let advisorName = '';
    if (reqRows[0]?.supervisionAppointment) {
      try {
        const appt = typeof reqRows[0].supervisionAppointment === 'string'
          ? JSON.parse(reqRows[0].supervisionAppointment) : reqRows[0].supervisionAppointment;
        advisorName = String(appt?.advisorName || '').trim();
      } catch (_) { /* ข้อมูลนัดนิเทศไม่ใช่ JSON ที่ถูกต้อง: ถือว่ายังไม่มีอาจารย์ */ }
    }

    res.json({
      success: true,
      data: {
        id: base.id,
        username: base.username,
        email: base.email,
        phone: prof.phone || base.phone || '',
        is_active: base.is_active,
        student_code: code,
        prefix: prof.prefix || '',
        firstname: prof.firstname || base.firstname || '',
        lastname: prof.lastname || base.lastname || '',
        department: departmentName,
        faculty: facultyName,
        gpa,
        year_level: yearLevel,
        address,
        student_status: prof.student_status || '',
        advisor_name: advisorName,
        latest_request_status: reqRows[0]?.status || '',
        has_request: reqRows.length > 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`${USER_SELECT_SQL} WHERE u.id = ? GROUP BY u.id`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
    res.json({ success: true, data: toFrontendUser(rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users — สร้างผู้ใช้ใหม่ (Admin เท่านั้น)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { username, email, password, role, name, firstname, lastname, address, faculty_id, department_id, department } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'กรุณากรอก username และ password' });
    }

    const emailToUse = (email && email.trim()) ? email.trim() : username.trim();

    const [existing] = await pool.query('SELECT id FROM `user` WHERE username = ? OR email = ?', [username, emailToUse]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Username หรือ Email นี้ถูกใช้งานแล้ว' });
    }

    const targetDeptId = department_id ? Number(department_id) : (department ? (DEPARTMENT_NAME_TO_ID[department] || 0) : 0);
    const targetDeptName = department || (targetDeptId && DEPARTMENT_MAP[targetDeptId] ? DEPARTMENT_MAP[targetDeptId] : '');

    const hashedPassword = await bcrypt.hash(password || '123456', 10);
    const [result] = await pool.query(
      'INSERT INTO `user` (username, email, password, role, department) VALUES (?, ?, ?, ?, ?)',
      [username, emailToUse, hashedPassword, role || 'student', targetDeptName || null]
    );

    let fn = firstname || '';
    let ln = lastname || '';
    if (name && !fn && !ln) {
      const parts = name.trim().split(/\s+/);
      fn = parts[0] || '';
      ln = parts.slice(1).join(' ') || '';
    }

    if (fn || ln || address || faculty_id || targetDeptId) {
      await pool.query(
        `INSERT INTO \`profile\` (profile_id, firstname, lastname, faculty_id, department_id, address)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [username, fn, ln, faculty_id || 0, targetDeptId, address || null]
      );
    }

    const [newUser] = await pool.query(`${USER_SELECT_SQL} WHERE u.id = ? GROUP BY u.id`, [result.insertId]);
    res.status(201).json({ success: true, message: 'สร้างผู้ใช้สำเร็จ', data: toFrontendUser(newUser[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users/import — นำเข้าผู้ใช้หลายคน (Admin)
router.post('/import', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { users: userList } = req.body;
    if (!Array.isArray(userList) || userList.length === 0) {
      return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลผู้ใช้' });
    }

    let created = 0;
    const errors = [];

    for (let i = 0; i < userList.length; i++) {
      try {
        const row = userList[i];
        const [existing] = await pool.query('SELECT id FROM `user` WHERE username = ?', [row.username]);
        if (existing.length > 0) {
          errors.push({ index: i, message: `${row.username} ซ้ำกับผู้ใช้เดิม` });
          continue;
        }

        const targetDeptId = row.department_id ? Number(row.department_id) : (row.department ? (DEPARTMENT_NAME_TO_ID[row.department] || 0) : 0);
        const targetDeptName = row.department || (targetDeptId && DEPARTMENT_MAP[targetDeptId] ? DEPARTMENT_MAP[targetDeptId] : '');

        const hashedPassword = await bcrypt.hash(row.password || '123456', 10);
        await pool.query(
          'INSERT INTO `user` (username, email, password, role, department) VALUES (?, ?, ?, ?, ?)',
          [row.username, row.email || row.username, hashedPassword, row.role || 'student', targetDeptName || null]
        );

        let fn = row.firstname || '';
        let ln = row.lastname || '';
        if (row.name && !fn && !ln) {
          const parts = row.name.trim().split(/\s+/);
          fn = parts[0] || '';
          ln = parts.slice(1).join(' ') || '';
        }

        if (fn || ln || row.address || targetDeptId) {
          await pool.query(
            `INSERT INTO \`profile\` (profile_id, firstname, lastname, faculty_id, department_id, address)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [row.username, fn, ln, row.faculty_id || 0, targetDeptId, typeof row.address === 'object' ? JSON.stringify(row.address) : (row.address || null)]
          );
        }

        created++;
      } catch (err) {
        errors.push({ index: i, message: err.message });
      }
    }

    res.json({ success: true, message: `เพิ่มผู้ใช้สำเร็จ ${created} รายการ`, created, errors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/users/:id — อัปเดตผู้ใช้
router.put('/:id', authenticate, async (req, res) => {
  try {
    const [userRows] = await pool.query('SELECT * FROM `user` WHERE id = ?', [req.params.id]);
    if (!userRows[0]) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
    const current = userRows[0];

    // แก้ได้เฉพาะบัญชีตัวเอง หรือ admin; ผู้ใช้ทั่วไปห้ามแก้ username/role/isActive (กัน privilege escalation)
    const isAdmin = req.user.role === 'admin';
    // Partial update: ตัดค่า undefined/null/สตริงว่างออกก่อน ไม่ให้ไปเขียนทับข้อมูลเดิม (เช่น username/email ว่างจนล็อกอินไม่ได้)
    // ค่า false/0 (เช่น isActive) ยังถือเป็นค่าที่ส่งมาจริง
    const body = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'string' && v.trim() === '') continue;
      body[k] = (typeof v === 'string' && k !== 'password') ? v.trim() : v;
    }
    // นักศึกษา: สาขา/คณะ มาจากระบบทะเบียนกลาง ห้ามแก้เอง
    if (!isAdmin && current.role === 'student') {
      delete body.department; delete body.department_id; delete body.faculty_id;
    }
    // ผู้ใช้ทั่วไปห้ามแตะฟิลด์ยืนยันตัวตน ต่อให้ส่งมา
    if (!isAdmin) { delete body.username; delete body.role; delete body.isActive; delete body.studentId; }
    if (!isAdmin && String(req.user.id)  !== String(req.params.id)) {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลของผู้ใช้อื่น' });
    }
    if (body.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email).trim())) {
      return res.status(400).json({ success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' });
    }
    if (body.phone !== undefined && body.phone !== '' && !/^[0-9]{9,10}$/.test(String(body.phone))) {
      return res.status(400).json({ success: false, message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก' });
    }

    const allowedUserKeys = isAdmin
      ? ['username', 'email', 'role', 'isActive', 'phone']
      : ['email', 'phone'];
    const userUpdates = [];
    const userParams = [];

    for (const key of allowedUserKeys) {
      if (body[key] !== undefined) {
        userUpdates.push(`\`${key}\` = ?`);
        userParams.push(body[key]);
      }
    }

    let targetDeptId = body.department_id !== undefined ? Number(body.department_id) : (body.department ? DEPARTMENT_NAME_TO_ID[body.department] : undefined);
    let targetDeptName = body.department !== undefined ? body.department : (targetDeptId && DEPARTMENT_MAP[targetDeptId] ? DEPARTMENT_MAP[targetDeptId] : undefined);

    if (targetDeptName !== undefined) {
      userUpdates.push('`department` = ?');
      userParams.push(targetDeptName);
    }

    if (body.password) {
      userUpdates.push('`password` = ?');
      userParams.push(await bcrypt.hash(body.password, 10));
    }

    if (userUpdates.length > 0) {
      userParams.push(req.params.id);
      await pool.query(`UPDATE \`user\` SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    let fn = body.firstname;
    let ln = body.lastname;
    if (body.name && (fn === undefined || ln === undefined)) {
      const parts = body.name.trim().split(/\s+/);
      fn = parts[0] || '';
      ln = parts.slice(1).join(' ') || '';
    }

    const profileId = (isAdmin && body.username) || current.username;
    const prefixUpdate = body.prefix !== undefined ? String(body.prefix).trim().slice(0, 50) : undefined;
    if (prefixUpdate !== undefined || fn !== undefined || ln !== undefined || body.address !== undefined || body.faculty_id !== undefined || targetDeptId !== undefined || body.phone !== undefined) {
      const [pRows] = await pool.query('SELECT id FROM `profile` WHERE profile_id = ?', [profileId]);
      if (pRows.length > 0) {
        const pUpdates = [];
        const pParams = [];
        if (prefixUpdate !== undefined) { pUpdates.push('`prefix` = ?'); pParams.push(prefixUpdate); }
        if (fn !== undefined) { pUpdates.push('`firstname` = ?'); pParams.push(fn); }
        if (ln !== undefined) { pUpdates.push('`lastname` = ?'); pParams.push(ln); }
        if (body.address !== undefined) { pUpdates.push('`address` = ?'); pParams.push(body.address); }
        if (body.faculty_id !== undefined) { pUpdates.push('`faculty_id` = ?'); pParams.push(body.faculty_id); }
        if (targetDeptId !== undefined) { pUpdates.push('`department_id` = ?'); pParams.push(targetDeptId); }
        if (body.phone !== undefined) { pUpdates.push('`phone` = ?'); pParams.push(body.phone); }
        if (pUpdates.length > 0) {
          pParams.push(pRows[0].id);
          await pool.query(`UPDATE \`profile\` SET ${pUpdates.join(', ')} WHERE id = ?`, pParams);
        }
      } else {
        await pool.query(
          `INSERT INTO \`profile\` (profile_id, firstname, lastname, faculty_id, department_id, address, phone)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [profileId, fn || '', ln || '', body.faculty_id || 0, targetDeptId || 0, body.address || null, body.phone || null]
        );
      }
    }

    const [updated] = await pool.query(`${USER_SELECT_SQL} WHERE u.id = ? GROUP BY u.id`, [req.params.id]);
    res.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ', data: toFrontendUser(updated[0]) });
  } catch (error) {
    // ค่าซ้ำกับผู้ใช้อื่น (unique key: user_email_key / user_username_key)
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      const isUsername = /username/i.test(error.sqlMessage || '');
      return res.status(409).json({
        success: false,
        message: isUsername
          ? 'ชื่อผู้ใช้นี้ถูกใช้งานในระบบแล้ว กรุณาใช้ชื่อผู้ใช้อื่น'
          : 'อีเมลนี้ถูกใช้งานในระบบแล้ว กรุณาใช้อีเมลอื่น',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/users/:id — ลบผู้ใช้และข้อมูลทั้งหมดที่เกี่ยวข้อง (Admin เท่านั้น)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [userRows] = await pool.query('SELECT username, email FROM `user` WHERE id = ?', [req.params.id]);
    if (!userRows[0]) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
    const { username, email } = userRows[0];

    const identifiers = [username, email].filter(Boolean);

    // 1. ลบ requests และแบบประเมินที่เชื่อมโยง
    const [reqRows] = await pool.query('SELECT id FROM requests WHERE studentId IN (?)', [identifiers]);
    const reqIds = reqRows.map(r => r.id);
    if (reqIds.length > 0) {
      await pool.query('DELETE FROM advisor_evaluations WHERE requestId IN (?)', [reqIds]);
      await pool.query('DELETE FROM evaluations WHERE requestId IN (?)', [reqIds]);
      await pool.query('DELETE FROM requests WHERE id IN (?)', [reqIds]);
    }

    // 2. ลบ daily_checkins
    await pool.query('DELETE FROM daily_checkins WHERE studentId IN (?)', [identifiers]);

    // 3. ลบ payment_proofs
    await pool.query('DELETE FROM payment_proofs WHERE studentId IN (?)', [identifiers]);

    // 4. ลบ profile
    await pool.query('DELETE FROM `profile` WHERE profile_id IN (?)', [identifiers]);

    // 5. ลบ user
    const [result] = await pool.query('DELETE FROM `user` WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });

    res.json({ success: true, message: 'ลบผู้ใช้และข้อมูลทั้งหมดที่เกี่ยวข้องสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

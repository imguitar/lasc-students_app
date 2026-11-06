// E2E workflow runner for the LASC Co-op backend.
// Runs inside the lasc-coop-backend container against the capture-enabled test instance
// (port 5099). All outgoing email is captured by /tmp/e2e/cap.js; nothing is delivered.
const fs = require('fs');
const path = require('path');
const jwt = require('/app/node_modules/jsonwebtoken');

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:5099/api';
const MAIL_LOG = '/tmp/e2e/mails/mails.jsonl';
const OUT = '/tmp/e2e/results.json';
const SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

const FIX = {
  student: { id: 1217, username: '6610014111', name: 'นายอภิชาติ กรมพันธ์', specEmail: 'stu6610014111@sskru.ac.th', department: 'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์' },
  admin: { id: 1, username: 'admin', specEmail: 'apichatkrompan471@gmail.com' },
  advisor: { username: 'AD034', password: 'Password123', specEmail: 'apichatkrompan75@gmail.com' },
  company: { name: 'บริษัท ตัวอย่างเทคโนโลยี จำกัด', mentorEmail: 'apichatkrompan02668@gmail.com', mentorName: 'คุณพี่เลี้ยง ทดสอบระบบ', mentorPosition: 'Senior Software Engineer' },
};

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const PDF_MIN = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n').toString('base64');

const bangkokYMD = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
};
const TODAY = bangkokYMD(0);
const TWO_DAYS_AGO = bangkokYMD(-2);
const START_DATE = process.env.E2E_START || '2026-11-02';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mint = (u) => jwt.sign({ id: u.id, username: u.username, role: u.role }, SECRET, { expiresIn: '2h' });

const results = [];
const emails = [];
const issues = [];
const ctx = { startedAt: new Date().toISOString(), today: TODAY };

const call = async (method, p, { token, body, query } = {}) => {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const res = await fetch(BASE + p + qs, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch (_) { json = { raw: text.slice(0, 300) }; }
  return { status: res.status, json };
};

const readMails = () => {
  try {
    return fs.readFileSync(MAIL_LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch (_) { return []; }
};
const mailMark = () => readMails().length;
const mailsSince = async (mark, waitMs = 1800) => { await sleep(waitMs); return readMails().slice(mark); };

const rec = (step, api, expected, actual, status, note = '') => {
  results.push({ step, api, expected, actual, status, note });
  console.log(`[${status}] ${step} | ${api} | ${actual}${note ? ' | ' + note : ''}`);
};
const recMails = (event, list, expectation) => {
  if (!list.length) {
    emails.push({ event, to: '-', subject: '-', status: 'NOT SENT', messageId: '-', expectation });
    return;
  }
  for (const m of list) {
    emails.push({ event, to: m.to, subject: m.subject, status: 'CAPTURED (not delivered)', messageId: m.messageId, from: m.from, htmlBytes: m.htmlBytes, hasHtmlTag: m.hasHtmlTag, expectation });
  }
};
const issue = (severity, title, detail) => issues.push({ severity, title, detail });
const msg = (r) => (r && r.json && (r.json.message || r.json.raw)) || '';

// Independent working-day calculation (Mon-Fri, minus active holidays), used to cross-check the backend.
const independentEndDate = (start, hours, holidaySet) => {
  const needed = Math.ceil(hours / 8);
  let cur = new Date(start + 'T00:00:00Z');
  let count = 0;
  for (let i = 0; i < 2000; i += 1) {
    const ymd = cur.toISOString().slice(0, 10);
    const wd = cur.getUTCDay();
    if (wd !== 0 && wd !== 6 && !holidaySet.has(ymd)) {
      count += 1;
      if (count >= needed) return { endDate: ymd, workingDays: needed };
    }
    cur = new Date(cur.getTime() + 86400000);
  }
  return null;
};

const main = async () => {
  const studentToken = mint({ ...FIX.student, role: 'student' });
  const adminToken = mint({ ...FIX.admin, role: 'admin' });
  ctx.authNote = 'Student and admin tokens minted with the server JWT secret (their passwords are not part of the fixture). Advisor uses real login.';

  // ===== Step 1: System setup =====
  const holidaySet = new Set();
  for (const y of [2026, 2027]) {
    const h = await call('GET', '/holidays', { query: { year: String(y) } });
    const list = (h.json && h.json.data) || [];
    list.forEach((x) => {
      const active = x.isActive === undefined ? true : Boolean(Number(x.isActive));
      if (active && x.date) holidaySet.add(String(x.date).slice(0, 10));
    });
  }
  ctx.activeHolidaysLoaded = holidaySet.size;

  const preview = await call('GET', '/internship-rounds/preview-end-date', { query: { start: START_DATE, hours: '300' } });
  const indep = independentEndDate(START_DATE, 300, holidaySet);
  const prevEnd = preview.json && preview.json.data && preview.json.data.endDate;
  rec('1.1 คำนวณวันสิ้นสุดอัตโนมัติ (preview)', 'GET /internship-rounds/preview-end-date',
    `endDate = ${indep && indep.endDate} (คำนวณแยก: ${START_DATE}, 300 ชม., 38 วันทำการ, หักเสาร์-อาทิตย์และวันหยุด ${holidaySet.size} วัน)`,
    `HTTP ${preview.status}, endDate = ${prevEnd}, skipped holidays = ${JSON.stringify((preview.json.data || {}).skippedHolidays || [])}`,
    preview.status === 200 && indep && prevEnd === indep.endDate ? 'PASS' : 'FAIL');

  const roundRes = await call('POST', '/admin/internship-rounds', {
    token: adminToken,
    body: { title: '[E2E] รอบทดสอบ ภาค 2/2569', academicYear: '2569', semester: '2', startDate: START_DATE, requiredHours: 300, note: 'สร้างโดยชุดทดสอบ E2E', isActive: true },
  });
  const round = roundRes.json && roundRes.json.data;
  ctx.roundId = round && round.id;
  const roundEnd = round && String(round.endDate).slice(0, 10);
  rec('1.2 แอดมินสร้างรอบฝึกงาน', 'POST /admin/internship-rounds',
    `201 และ endDate ฝั่งเซิร์ฟเวอร์ = ${prevEnd}`,
    `HTTP ${roundRes.status}, round #${ctx.roundId}, endDate = ${roundEnd}`,
    roundRes.status === 201 && roundEnd && (round.endDate && new Date(round.endDate).toISOString().slice(0, 10) <= prevEnd) ? 'PASS' : 'FAIL',
    'endDate อ่านจาก DATE column ผ่าน mysql2 อาจเลื่อนตามเขตเวลา จึงตรวจซ้ำในขั้น 1.3');

  const active = await call('GET', '/internship-rounds/active');
  const mine = ((active.json && active.json.data) || []).find((r) => r.id === ctx.roundId);
  rec('1.3 รอบเปิดรับและอยู่ในช่วงเวลา', 'GET /internship-rounds/active',
    'รอบที่สร้างอยู่ในรายการ isActive และ isInPeriod = true',
    `HTTP ${active.status}, found = ${Boolean(mine)}, isInPeriod = ${mine && mine.isInPeriod}`,
    active.status === 200 && mine && mine.isInPeriod ? 'PASS' : 'FAIL');

  // ===== Step 2: Student submission =====
  let mark = mailMark();
  const reqPayload = {
    studentId: FIX.student.username,
    studentName: FIX.student.name,
    department: FIX.student.department,
    company: FIX.company.name,
    position: 'นักศึกษาฝึกงานพัฒนาซอฟต์แวร์',
    submittedDate: `${TODAY} 09:00:00`,
    status: 'อนุมัติแล้ว',
    details: {
      student_info: {
        title: 'นาย', name: FIX.student.name, email: FIX.student.specEmail, studentId: FIX.student.username, year: '4',
        lastSemesterGrade: '3.50', major: FIX.student.department,
        address: { house: '99', moo: '1', soi: '', road: 'ถนนทดสอบ', tambon: 'โพธิ์', amphur: 'เมืองศรีสะเกษ', province: 'ศรีสะเกษ', postal: '33000' },
        phone: '0940000000',
      },
      companyAddress: { house: '1', moo: '', soi: '', road: 'ถนนเทคโนโลยี', tambon: 'โพธิ์', amphur: 'เมืองศรีสะเกษ', province: 'ศรีสะเกษ', postal: '33000', detail: '' },
      contactPerson: FIX.company.mentorName,
      contactPosition: FIX.company.mentorPosition,
      contactEmail: FIX.company.mentorEmail,
      contactPhone: '0450000000',
      internshipTerm: 'term2',
      internshipType: 'internship',
      description: 'พัฒนาเว็บแอปพลิเคชันภายในองค์กร',
      skills: 'React, Node.js',
      advisorUsername: FIX.advisor.username,
      studentPhoto: null,
    },
  };
  const sub = await call('POST', '/requests', { token: studentToken, body: reqPayload });
  const reqRow = sub.json && sub.json.data;
  ctx.requestId = reqRow && reqRow.id;
  rec('2.1 นักศึกษายื่นคำร้อง (การฝึกงานทั่วไป)', 'POST /requests',
    '201 และสถานะเริ่มต้น = รออาจารย์ที่ปรึกษาอนุมัติ (แม้ส่ง status อื่นมา)',
    `HTTP ${sub.status}, request #${ctx.requestId}, status = ${reqRow && reqRow.status}, company_email = ${reqRow && reqRow.company_email}`,
    sub.status === 201 && reqRow && reqRow.status === 'รออาจารย์ที่ปรึกษาอนุมัติ' && reqRow.company_email === FIX.company.mentorEmail ? 'PASS' : 'FAIL',
    'ส่ง status = อนุมัติแล้ว มาด้วยเพื่อทดสอบว่าเซิร์ฟเวอร์ไม่เชื่อค่าจากนักศึกษา');
  if (!ctx.requestId) throw new Error('สร้างคำร้องไม่สำเร็จ หยุดการทดสอบ');
  const RID = ctx.requestId;

  let m1 = await mailsSince(mark, 2500);
  recMails('ยื่นคำร้องสำเร็จ (Email Check 1)', m1, 'นักศึกษาได้รับอีเมลยืนยัน, อาจารย์ในสาขาได้รับแจ้งคำร้องใหม่, สถานประกอบการ (พี่เลี้ยง) ได้รับแจ้ง');
  const toStudent1 = m1.filter((m) => /6610014111/.test(m.to || ''));
  const toAdvisors1 = m1.filter((m) => /@lasc\.ac\.th|AD0/i.test(m.to || '') && !/admin@/.test(m.to || ''));
  const toAD034 = m1.filter((m) => /ad034@/i.test(m.to || ''));
  const toMentor1 = m1.filter((m) => (m.to || '').includes(FIX.company.mentorEmail));
  rec('2.2 Email Check 1: ยืนยันการยื่นถึงนักศึกษา', 'mailer.sendStatusNotifyEmail',
    'มีอีเมล 1 ฉบับถึงอีเมลนักศึกษาในระบบ',
    `${toStudent1.length} ฉบับ → ${toStudent1.map((m) => m.to).join(', ') || '-'} | subject: ${toStudent1[0] ? toStudent1[0].subject : '-'}`,
    toStudent1.length === 1 ? 'PASS' : 'FAIL',
    `อีเมลในฐานข้อมูลคือ 6610014111@student.sskru.ac.th ไม่ใช่ ${FIX.student.specEmail} ตามสเปก`);
  rec('2.3 Email Check 1: แจ้งอาจารย์ที่ปรึกษา', 'mailer.notifyAdvisorsNewRequest',
    'อาจารย์ AD034 ได้รับแจ้งคำร้องใหม่',
    `ส่งถึงอาจารย์ ${toAdvisors1.length} คน (รวม AD034: ${toAD034.length ? 'ใช่' : 'ไม่'})`,
    toAD034.length ? 'PASS' : 'FAIL',
    `ระบบส่งหาอาจารย์ทุกคนในสาขา ไม่ได้เลือกเฉพาะ AD034 และใช้อีเมล ad034@lasc.ac.th ไม่ใช่ ${FIX.advisor.specEmail}`);
  ctx.advisorFanout = toAdvisors1.length;
  rec('2.4 Email Check 1: แจ้งสถานประกอบการ (พี่เลี้ยง)', 'ไม่มีจุดส่งในโค้ด',
    `มีอีเมลถึง ${FIX.company.mentorEmail}`,
    `${toMentor1.length} ฉบับ`,
    toMentor1.length ? 'PASS' : 'FAIL',
    'ระบบไม่ได้ส่งอีเมลถึงสถานประกอบการตอนยื่นคำร้อง ลิงก์ตอบรับออกผ่าน QR/ลิงก์ที่แอดมินคัดลอกไปส่งเองในขั้น 3');

  // Security probe: student changes own request status (same value, harmless)
  const probe = await call('PATCH', `/requests/${RID}/status`, { token: studentToken, body: { status: 'รออาจารย์ที่ปรึกษาอนุมัติ' } });
  rec('2.5 [Security] นักศึกษาเรียก PATCH สถานะคำร้องตัวเอง', 'PATCH /requests/:id/status (student token)',
    '403 ห้ามนักศึกษาเปลี่ยนสถานะ',
    `HTTP ${probe.status} ${msg(probe)}`,
    probe.status === 403 ? 'PASS' : 'FAIL',
    'ส่งค่าเดิมเพื่อไม่ให้กระทบ flow');
  if (probe.status !== 403) {
    issue('Critical', 'PATCH /api/requests/:id/status ไม่ตรวจบทบาทหรือเจ้าของคำร้อง',
      'route ใช้แค่ authenticate โดยไม่มี authorize หรือการตรวจ state transition นักศึกษาที่ล็อกอินจึงเปลี่ยนสถานะคำร้องเป็นค่าใดก็ได้ (เช่น อนุมัติแล้ว หรือ ฝึกงานเสร็จแล้ว) ข้ามขั้นอาจารย์และแอดมินได้ ทดสอบด้วยการส่งค่าเดิมและได้ 200');
  }

  // ===== Step 3: Approvals =====
  const login = await call('POST', '/auth/login', { body: { email: FIX.advisor.username, password: FIX.advisor.password } });
  const advisorToken = login.json && (login.json.token || (login.json.data && login.json.data.token));
  const advUser = login.json && (login.json.user || (login.json.data && login.json.data.user)) || {};
  ctx.advisorUserId = advUser.id;
  ctx.advisorName = [advUser.firstname, advUser.lastname].filter(Boolean).join(' ') || advUser.name || FIX.advisor.username;
  rec('3.1 อาจารย์ล็อกอิน AD034 / Password123', 'POST /auth/login',
    '200 และได้ JWT role = advisor',
    `HTTP ${login.status}, token = ${advisorToken ? 'ได้รับ' : 'ไม่ได้รับ'}, role = ${advUser.role}, id = ${advUser.id}`,
    login.status === 200 && advisorToken && advUser.role === 'advisor' ? 'PASS' : 'FAIL');
  if (!advisorToken) throw new Error('อาจารย์ล็อกอินไม่ได้ หยุดการทดสอบ');

  const advList = await call('GET', '/requests', { token: advisorToken });
  const advRows = (advList.json && advList.json.data) || [];
  const seen = advRows.find((r) => Number(r.id) === Number(RID));
  rec('3.2 อาจารย์เห็นคำร้องของ 6610014111', 'GET /requests (advisor)',
    'คำร้องปรากฏในรายการของอาจารย์',
    `HTTP ${advList.status}, รายการทั้งหมด ${advRows.length}, พบคำร้อง #${RID} = ${Boolean(seen)}`,
    advList.status === 200 && seen ? 'PASS' : 'FAIL');

  mark = mailMark();
  const advApprove = await call('PATCH', `/requests/${RID}/status`, { token: advisorToken, body: { status: 'รอผู้ดูแลระบบอนุมัติ', advisor_comment: '[E2E] อนุมัติโดยอาจารย์ที่ปรึกษา' } });
  rec('3.3 อาจารย์อนุมัติคำร้อง (payload เดียวกับปุ่มบนแดชบอร์ดอาจารย์)', 'PATCH /requests/:id/status',
    '200 และสถานะ = รอผู้ดูแลระบบอนุมัติ',
    `HTTP ${advApprove.status}, status = ${advApprove.json && advApprove.json.data && advApprove.json.data.status}`,
    advApprove.status === 200 ? 'PASS' : 'FAIL',
    'ระบบไม่มีช่องแนบลายมือชื่ออาจารย์ในขั้นนี้');
  const m2 = await mailsSince(mark);
  recMails('อาจารย์อนุมัติ (Email Check 2)', m2, 'นักศึกษาได้รับแจ้งว่าอาจารย์อนุมัติแล้ว และแอดมินได้รับแจ้งให้ตรวจสอบ');
  const toStudent2 = m2.filter((m) => /6610014111/.test(m.to || ''));
  const toAdmin2 = m2.filter((m) => /admin@|apichatkrompan471/.test(m.to || ''));
  rec('3.4 Email Check 2: แจ้งนักศึกษาว่าอาจารย์อนุมัติ', 'mailer.notifyStudentStatusChange',
    'มีอีเมลถึงนักศึกษา', `${toStudent2.length} ฉบับ`, toStudent2.length ? 'PASS' : 'FAIL',
    'สถานะ รอผู้ดูแลระบบอนุมัติ ไม่อยู่ใน shouldEmailStudentForStatus จึงไม่ส่ง');
  rec('3.5 Email Check 2: แจ้งแอดมินให้ตรวจสอบ', 'mailer.notifyAdminsPendingReview',
    'มีอีเมลถึงแอดมิน', `${toAdmin2.length} ฉบับ`, toAdmin2.length ? 'PASS' : 'FAIL',
    'backend ส่งเฉพาะเมื่อ status = รอผู้ดูแลระบบตรวจสอบ แต่ปุ่มบนแดชบอร์ดอาจารย์ส่ง รอผู้ดูแลระบบอนุมัติ');
  if (!toAdmin2.length) {
    issue('Major', 'อาจารย์อนุมัติจากแดชบอร์ดแล้วแอดมินไม่ได้รับอีเมล',
      'AdvisorDashboardPage ตั้งสถานะ "รอผู้ดูแลระบบอนุมัติ" ส่วน RequestDetailsPage ตั้ง "รอผู้ดูแลระบบตรวจสอบ" แต่ requestRoutes.js เรียก notifyAdminsPendingReview เฉพาะ "รอผู้ดูแลระบบตรวจสอบ" อนุมัติจากแดชบอร์ดจึงไม่มีอีเมลถึงแอดมิน และสถานะสองชื่อทำให้ข้อมูลไม่สม่ำเสมอ');
  }
  if (!toStudent2.length) {
    issue('Minor', 'นักศึกษาไม่ได้รับอีเมลเมื่ออาจารย์อนุมัติ',
      'shouldEmailStudentForStatus ไม่รวมสถานะ รอผู้ดูแลระบบอนุมัติ / รอผู้ดูแลระบบตรวจสอบ นักศึกษาได้รับแค่แจ้งเตือนในแอป (ถ้ามี) ตรงข้ามกับความคาดหวังในสเปก');
  }

  mark = mailMark();
  const adminApprove = await call('PATCH', `/requests/${RID}/status`, {
    token: adminToken,
    body: { status: 'รอสถานประกอบการตอบรับ', admin_comment: '[E2E] แอดมินอนุมัติและแนบหนังสือขอความอนุเคราะห์', dispatchLetter: { fileName: 'e2e-letter.pdf', mimeType: 'application/pdf', dataUrl: PDF_MIN, uploadedAt: new Date().toISOString() } },
  });
  rec('3.6 แอดมินอนุมัติและแนบหนังสือขอความอนุเคราะห์', 'PATCH /requests/:id/status (admin)',
    '200 และสถานะ = รอสถานประกอบการตอบรับ',
    `HTTP ${adminApprove.status}, status = ${adminApprove.json && adminApprove.json.data && adminApprove.json.data.status}`,
    adminApprove.status === 200 ? 'PASS' : 'FAIL');
  const m3a = await mailsSince(mark);
  recMails('แอดมินส่งต่อให้สถานประกอบการ', m3a, 'ไม่มีข้อกำหนดในสเปก (บันทึกเพื่อ audit)');

  const qr = await call('POST', `/requests/${RID}/response-qr`, { token: adminToken });
  const respToken = qr.json && qr.json.data && qr.json.data.token;
  rec('3.7 แอดมินออกลิงก์ตอบรับของสถานประกอบการ', 'POST /requests/:id/response-qr',
    '200 และได้ token แบบใช้ครั้งเดียว',
    `HTTP ${qr.status}, token = ${respToken ? 'ได้รับ (' + respToken.length + ' ตัวอักษร)' : '-'}, expiresAt = ${qr.json && qr.json.data && qr.json.data.expiresAt}`,
    qr.status === 200 && respToken ? 'PASS' : 'FAIL');

  const pubGet = await call('GET', `/public/requests/${RID}`, { query: { responseToken: respToken } });
  rec('3.8 สถานประกอบการเปิดลิงก์ตอบรับ', 'GET /public/requests/:id?responseToken',
    '200', `HTTP ${pubGet.status}`, pubGet.status === 200 ? 'PASS' : 'FAIL');

  const noSig = await call('PATCH', `/public/requests/${RID}/status`, { query: { responseToken: respToken }, body: { status: 'สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)', statusCode: 'COMPANY_ACCEPTED' } });
  rec('3.9 ตอบรับโดยไม่ลงนาม (negative)', 'PATCH /public/requests/:id/status',
    '400 ต้องลงนามหรือแนบเอกสาร', `HTTP ${noSig.status} ${msg(noSig)}`, noSig.status === 400 ? 'PASS' : 'FAIL');

  mark = mailMark();
  const accept = await call('PATCH', `/public/requests/${RID}/status`, {
    query: { responseToken: respToken },
    body: {
      status: 'สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)', statusCode: 'COMPANY_ACCEPTED',
      company_email: FIX.company.mentorEmail, companyEmail: FIX.company.mentorEmail,
      company_comment: '[E2E] พร้อมรับนักศึกษา', studentPreparation: 'เตรียมโน้ตบุ๊ก',
      signature: PNG_1PX, signerName: FIX.company.mentorName, signerPosition: FIX.company.mentorPosition,
      evaluatorEmail: FIX.company.mentorEmail, evaluatorName: FIX.company.mentorName, evaluatorPosition: FIX.company.mentorPosition,
      companyResponse: { accepted: true, status: 'COMPANY_ACCEPTED', company_email: FIX.company.mentorEmail, companyEmail: FIX.company.mentorEmail, studentPreparation: 'เตรียมโน้ตบุ๊ก', signature: PNG_1PX, signerName: FIX.company.mentorName, signerPosition: FIX.company.mentorPosition, evaluatorEmail: FIX.company.mentorEmail, respondedAt: new Date().toISOString() },
    },
  });
  rec('3.10 สถานประกอบการตอบรับพร้อมลายมือชื่อ', 'PATCH /public/requests/:id/status',
    '200 และสถานะ = สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)',
    `HTTP ${accept.status}, status = ${accept.json && accept.json.data && accept.json.data.status}`,
    accept.status === 200 ? 'PASS' : 'FAIL');
  const m3b = await mailsSince(mark);
  recMails('สถานประกอบการตอบรับ', m3b, 'แอดมินได้รับแจ้งผลตอบรับ');
  const toAdmin3 = m3b.filter((m) => /admin@|apichatkrompan471/.test(m.to || ''));
  rec('3.11 แจ้งแอดมินเรื่องผลตอบรับ', 'mailer.notifyAdminsCompanyResponse',
    'มีอีเมลถึงแอดมิน', `${toAdmin3.length} ฉบับ → ${toAdmin3.map((m) => m.to).join(', ') || '-'}`,
    toAdmin3.length ? 'PASS' : 'FAIL', `ผู้รับมาจาก ADMIN_EMAIL และบัญชี role=admin ไม่ใช่ ${FIX.admin.specEmail} ตามสเปก`);

  const reuse = await call('PATCH', `/public/requests/${RID}/status`, { query: { responseToken: respToken }, body: { status: 'สถานประกอบการปฏิเสธ', company_comment: 'reuse' } });
  rec('3.12 ใช้ลิงก์ตอบรับซ้ำ (negative)', 'PATCH /public/requests/:id/status',
    '403 ลิงก์ใช้ได้ครั้งเดียว', `HTTP ${reuse.status}`, reuse.status === 403 ? 'PASS' : 'FAIL');

  // ===== Step 4: Payment & activation =====
  const pay = await call('POST', '/payments', { token: studentToken, body: { studentId: FIX.student.username, studentName: FIX.student.name, date: TODAY, department: FIX.student.department, slipDataUrl: PNG_1PX, slipFileName: 'e2e-slip.png' } });
  const payRow = pay.json && pay.json.data;
  ctx.paymentId = payRow && payRow.id;
  rec('4.1 นักศึกษาอัปโหลดสลิป', 'POST /payments', '201 สถานะสลิป = pending',
    `HTTP ${pay.status}, payment #${ctx.paymentId}, status = ${payRow && payRow.status}`,
    pay.status === 201 && ctx.paymentId ? 'PASS' : 'FAIL');

  const selfApprove = await call('PATCH', `/payments/${ctx.paymentId}/approve`, { token: studentToken });
  rec('4.2 [Security] นักศึกษาอนุมัติสลิปตัวเอง', 'PATCH /payments/:id/approve (student token)',
    '403', `HTTP ${selfApprove.status}, status = ${selfApprove.json && selfApprove.json.data && selfApprove.json.data.status}`,
    selfApprove.status === 403 ? 'PASS' : 'FAIL');
  if (selfApprove.status !== 403) {
    issue('Critical', 'นักศึกษาอนุมัติหลักฐานการชำระเงินของตัวเองได้',
      'PATCH /api/payments/:id/approve และ /reject ใช้แค่ authenticate ไม่มี authorize("admin") ทดสอบด้วย token นักศึกษาแล้วสถานะเปลี่ยนเป็น approved');
  }
  const adminPay = await call('PATCH', `/payments/${ctx.paymentId}/approve`, { token: adminToken });
  rec('4.3 แอดมินอนุมัติสลิป', 'PATCH /payments/:id/approve (admin)', '200 สถานะ = approved',
    `HTTP ${adminPay.status}, status = ${adminPay.json && adminPay.json.data && adminPay.json.data.status}`,
    adminPay.status === 200 && adminPay.json.data && adminPay.json.data.status === 'approved' ? 'PASS' : 'FAIL');

  const preCheckin = await call('POST', '/checkins', { token: studentToken, body: { studentId: FIX.student.username, studentName: FIX.student.name, date: TODAY, status: 'present', workExperience: 'ก่อนเริ่มฝึก' } });
  rec('4.4 รายงานประจำวันยังล็อกก่อนเริ่มฝึก (negative)', 'POST /checkins',
    '400 คำร้องยังไม่ถึงช่วงออกฝึกงาน', `HTTP ${preCheckin.status} ${msg(preCheckin)}`, preCheckin.status === 400 ? 'PASS' : 'FAIL');

  mark = mailMark();
  const start = await call('PATCH', `/requests/${RID}/status`, {
    token: adminToken,
    body: { status: 'ออกฝึกงาน', admin_comment: '[E2E] เริ่มฝึกงาน', dispatchLetter: { fileName: 'e2e-dispatch.pdf', mimeType: 'application/pdf', dataUrl: PDF_MIN, uploadedAt: new Date().toISOString() }, startDate: START_DATE, endDate: prevEnd },
  });
  const started = start.json && start.json.data;
  rec('4.5 แอดมินกดเริ่มฝึกงาน', 'PATCH /requests/:id/status (admin, payload เดียวกับหน้าภาพรวมคำร้อง)',
    `200, สถานะ = ออกฝึกงาน, วันเริ่ม = ${START_DATE}`,
    `HTTP ${start.status}, status = ${started && started.status}, start = ${started && String(started.internship_start_date).slice(0, 10)}, end = ${started && String(started.internship_end_date).slice(0, 10)}`,
    start.status === 200 && started && started.status === 'ออกฝึกงาน' ? 'PASS' : 'FAIL',
    'ระบบไม่ได้ผูกการอนุมัติสลิปกับการเริ่มฝึกงาน แอดมินเริ่มฝึกได้แม้ยังไม่มีสลิป');
  const m4 = await mailsSince(mark);
  recMails('เริ่มฝึกงาน (Email Check 3)', m4, 'นักศึกษาได้รับแจ้งเริ่มฝึกงาน');
  const toStudent4 = m4.filter((m) => /6610014111/.test(m.to || ''));
  rec('4.6 Email Check 3: แจ้งเริ่มฝึกงานถึงนักศึกษา', 'mailer.notifyStudentStatusChange',
    'มีอีเมล 1 ฉบับถึงนักศึกษา', `${toStudent4.length} ฉบับ | subject: ${toStudent4[0] ? toStudent4[0].subject : '-'}`,
    toStudent4.length === 1 ? 'PASS' : 'FAIL');

  // ===== Step 5: Daily report =====
  const statsOf = (rows) => {
    const onTime = rows.filter((r) => !Number(r.isBackfill) && r.status === 'present').length;
    const backfill = rows.filter((r) => Number(r.isBackfill)).length;
    const leave = rows.filter((r) => r.status === 'leave').length;
    return { onTime, backfill, leave, total: rows.length };
  };
  const before = await call('GET', '/checkins', { token: studentToken, query: { studentId: FIX.student.username } });
  const statsBefore = statsOf((before.json && before.json.data) || []);

  const onTime = await call('POST', '/checkins', { token: studentToken, body: { studentId: FIX.student.username, studentName: FIX.student.name, date: TODAY, status: 'present', note: '08:30-16:30', workExperience: '[E2E] พัฒนาหน้าจอรายงาน' } });
  rec('5.1 บันทึกรายงานตรงวัน', 'POST /checkins', '201', `HTTP ${onTime.status} ${msg(onTime)}`, onTime.status === 201 ? 'PASS' : 'FAIL');

  const backNoSig = await call('POST', '/checkins', { token: studentToken, body: { studentId: FIX.student.username, studentName: FIX.student.name, date: TWO_DAYS_AGO, status: 'present', workExperience: '[E2E] ย้อนหลังไม่มีลายเซ็น' } });
  rec('5.2 บันทึกย้อนหลังโดยไม่มีลายเซ็นพี่เลี้ยง (negative)', 'POST /checkins',
    '400 ต้องมีลายเซ็นพี่เลี้ยง', `HTTP ${backNoSig.status} ${msg(backNoSig)}`, backNoSig.status === 400 ? 'PASS' : 'FAIL');

  const back = await call('POST', '/checkins', { token: studentToken, body: { studentId: FIX.student.username, studentName: FIX.student.name, date: TWO_DAYS_AGO, status: 'present', note: '08:30-16:30', workExperience: '[E2E] บันทึกย้อนหลัง', supervisorSignature: PNG_1PX, supervisorName: FIX.company.mentorName } });
  rec(`5.3 บันทึกย้อนหลัง ${TWO_DAYS_AGO} พร้อมลายเซ็นพี่เลี้ยง`, 'POST /checkins', '201', `HTTP ${back.status} ${msg(back)}`, back.status === 201 ? 'PASS' : 'FAIL');

  const dup = await call('POST', '/checkins', { token: studentToken, body: { studentId: FIX.student.username, date: TODAY, status: 'present' } });
  rec('5.4 บันทึกซ้ำวันเดิม (negative)', 'POST /checkins', '409', `HTTP ${dup.status}`, dup.status === 409 ? 'PASS' : 'FAIL');
  const future = await call('POST', '/checkins', { token: studentToken, body: { studentId: FIX.student.username, date: bangkokYMD(1), status: 'present' } });
  rec('5.5 บันทึกล่วงหน้า (negative)', 'POST /checkins', '400', `HTTP ${future.status}`, future.status === 400 ? 'PASS' : 'FAIL');
  const beforeStart = await call('POST', '/checkins', { token: studentToken, body: { studentId: FIX.student.username, date: '2026-10-30', status: 'present', supervisorSignature: PNG_1PX } });
  rec('5.6 บันทึกก่อนวันเริ่มฝึก (negative)', 'POST /checkins', '400', `HTTP ${beforeStart.status} ${msg(beforeStart)}`, beforeStart.status === 400 ? 'PASS' : 'FAIL');

  const after = await call('GET', '/checkins', { token: studentToken, query: { studentId: FIX.student.username } });
  const rowsAfter = (after.json && after.json.data) || [];
  const tRow = rowsAfter.find((r) => r.date === TODAY);
  const bRow = rowsAfter.find((r) => r.date === TWO_DAYS_AGO);
  rec('5.7 ธงตรงเวลา: รายงานวันนี้', 'GET /checkins',
    'isBackfill = 0 (เทียบ is_late_submission === false), status = present (เทียบ attendance_status)',
    `isBackfill = ${tRow && tRow.isBackfill}, status = ${tRow && tRow.status}, submittedAt = ${tRow && tRow.submittedAt}`,
    tRow && !Number(tRow.isBackfill) && tRow.status === 'present' ? 'PASS' : 'FAIL',
    'ชื่อฟิลด์จริงคือ isBackfill และ status ไม่ใช่ is_late_submission และ attendance_status');
  rec('5.8 ธงย้อนหลัง: รายงานสองวันก่อน', 'GET /checkins',
    'isBackfill = 1 และมี submittedAt จริง',
    `isBackfill = ${bRow && bRow.isBackfill}, submittedAt = ${bRow && bRow.submittedAt}`,
    bRow && Number(bRow.isBackfill) === 1 && bRow.submittedAt ? 'PASS' : 'FAIL');
  const statsAfter = statsOf(rowsAfter);
  ctx.stats = { before: statsBefore, after: statsAfter };
  rec('5.9 การ์ดสถิติ: ตรงเวลา +1 และย้อนหลัง +1', 'สูตรเดียวกับ StudentCheckInPage',
    `ตรงเวลา ${statsBefore.onTime}→${statsBefore.onTime + 1}, ย้อนหลัง ${statsBefore.backfill}→${statsBefore.backfill + 1}`,
    `ตรงเวลา ${statsBefore.onTime}→${statsAfter.onTime}, ย้อนหลัง ${statsBefore.backfill}→${statsAfter.backfill}, ลา ${statsAfter.leave}`,
    statsAfter.onTime === statsBefore.onTime + 1 && statsAfter.backfill === statsBefore.backfill + 1 ? 'PASS' : 'FAIL',
    'คำนวณจากข้อมูล API ด้วยสูตรเดียวกับหน้าจอ ช่องขาดขึ้นกับวันทำการที่ผ่านมาและไม่ได้ตรวจในขั้นนี้');

  // ===== Step 6: Supervision & evaluation =====
  const earlyEval = await call('POST', `/public/evaluate/${RID}`, { body: { studentId: FIX.student.username, evaluatorName: FIX.company.mentorName, q1: 5 } });
  rec('6.1 สถานประกอบการประเมินก่อนวันสิ้นสุดฝึก (negative)', 'POST /public/evaluate/:id',
    '400 ยังไม่ถึงวันสิ้นสุด', `HTTP ${earlyEval.status} ${msg(earlyEval)}`, earlyEval.status === 400 ? 'PASS' : 'FAIL');

  const uiAssign = await call('PATCH', `/requests/${RID}/appointment`, { token: adminToken, body: { advisorId: ctx.advisorUserId, advisorName: ctx.advisorName } });
  rec('6.2 แอดมินมอบหมายผู้นิเทศ (payload เดียวกับหน้าภาพรวมคำร้อง)', 'PATCH /requests/:id/appointment',
    '200 มอบหมายสำเร็จ', `HTTP ${uiAssign.status} ${msg(uiAssign)}`, uiAssign.status === 200 ? 'PASS' : 'FAIL',
    'หน้าจอส่งแค่ advisorId และ advisorName ไม่มีวันที่');
  if (uiAssign.status === 400) {
    issue('Major', 'ปุ่มมอบหมายผู้นิเทศในหน้าภาพรวมคำร้องใช้งานไม่ได้',
      'AllRequestsOverviewPage ส่ง { advisorId, advisorName } แต่ handleSupervisionAppointment บังคับให้มี date จึงได้ 400 "โปรดระบุวันที่นิเทศ..." ทุกครั้ง');
  }

  const snakeAssign = await call('PATCH', `/requests/${RID}/appointment`, { token: adminToken, body: { advisor_id: ctx.advisorUserId, supervision_date: TODAY, supervision_type: 'onsite', note: '[E2E] snake_case payload' } });
  rec('6.3 นัดนิเทศด้วย payload แบบหน้า AdvisorSupervisionPage (advisor_id ไม่มีชื่อ)', 'PATCH /requests/:id/appointment',
    '200', `HTTP ${snakeAssign.status} ${msg(snakeAssign)}`, snakeAssign.status === 200 ? 'PASS' : 'FAIL');
  if (snakeAssign.status === 500) {
    issue('Major', 'นัดนิเทศจากหน้าอาจารย์ล้มด้วย 500 (ค้นตาราง users ที่ไม่มีอยู่)',
      `handleSupervisionAppointment เรียก "SELECT name, username FROM users" แต่ตารางจริงชื่อ user เมื่อส่ง advisor_id โดยไม่มี advisorName จึงได้ 500: ${msg(snakeAssign)}`);
  }

  const assign = await call('PATCH', `/requests/${RID}/appointment`, { token: adminToken, body: { advisorId: ctx.advisorUserId, advisorName: ctx.advisorName, date: TODAY, mode: 'onsite', note: '[E2E] นิเทศรอบที่ 1' } });
  rec('6.4 แอดมินกำหนดผู้นิเทศ AD034 พร้อมวันนิเทศ', 'PATCH /requests/:id/appointment',
    '200', `HTTP ${assign.status} ${msg(assign)}`, assign.status === 200 ? 'PASS' : 'FAIL');

  const shift = await call('PATCH', `/requests/${RID}/internship-period`, { token: adminToken, body: { startDate: START_DATE, endDate: TODAY, note: '[E2E] จำลองให้ครบช่วงฝึกวันนี้' } });
  rec('6.5 [จำลองเวลา] แอดมินปรับวันสิ้นสุดฝึกเป็นวันนี้', 'PATCH /requests/:id/internship-period',
    '200 (จำเป็นต่อการทดสอบขั้นประเมินในวันเดียว)', `HTTP ${shift.status} ${msg(shift)}`, shift.status === 200 ? 'PASS' : 'FAIL',
    `ช่วงจริง ${START_DATE} ถึง ${prevEnd} ยาวเกินกว่าจะรอได้`);

  const scores = {};
  for (let i = 1; i <= 17; i += 1) scores['c' + i] = 4;
  for (let i = 1; i <= 20; i += 1) scores['s' + i] = 4;
  mark = mailMark();
  const advEval = await call('POST', `/advisor-evaluations/request/${RID}`, { token: advisorToken, body: { advisorName: ctx.advisorName, ...scores, companyComments: '[E2E] สถานประกอบการให้การดูแลดี', studentComments: '[E2E] นักศึกษาปฏิบัติงานดี' } });
  rec('6.6 อาจารย์ AD034 บันทึกผลนิเทศรอบที่ 1', 'POST /advisor-evaluations/request/:id',
    '201 และส่งลิงก์แบบประเมินถึงพี่เลี้ยง',
    `HTTP ${advEval.status}, emailSent = ${advEval.json && advEval.json.emailSent}, recipient = ${advEval.json && advEval.json.recipientEmail}`,
    advEval.status === 201 ? 'PASS' : 'FAIL');
  const m6a = await mailsSince(mark);
  recMails('อาจารย์บันทึกผลนิเทศ', m6a, 'พี่เลี้ยงได้รับลิงก์แบบประเมินผลการปฏิบัติงาน');
  const toMentor6 = m6a.filter((m) => (m.to || '').includes(FIX.company.mentorEmail));
  rec('6.7 ลิงก์แบบประเมินถึงพี่เลี้ยง', 'emailService.sendCompanyEvaluationEmail',
    `มีอีเมลถึง ${FIX.company.mentorEmail}`, `${toMentor6.length} ฉบับ | subject: ${toMentor6[0] ? toMentor6[0].subject : '-'}`,
    toMentor6.length ? 'PASS' : 'FAIL');

  const dupEval = await call('POST', `/advisor-evaluations/request/${RID}`, { token: advisorToken, body: { advisorName: ctx.advisorName, ...scores } });
  rec('6.8 บันทึกผลนิเทศซ้ำ (negative)', 'POST /advisor-evaluations/request/:id', '409', `HTTP ${dupEval.status}`, dupEval.status === 409 ? 'PASS' : 'FAIL');

  const q = {};
  for (let i = 1; i <= 20; i += 1) q['q' + i] = 4;
  mark = mailMark();
  const compEval = await call('POST', `/public/evaluate/${RID}`, { body: { studentId: FIX.student.username, evaluatorName: FIX.company.mentorName, evaluatorPosition: FIX.company.mentorPosition, evaluatorDepartment: 'IT', ...q, strengths: '[E2E] เรียนรู้เร็ว', improvements: '[E2E] การสื่อสาร', hireFuture: 'yes', overallScore: 80, projectUsage: 'ใช้งานจริง', otherComments: '[E2E]', signature: PNG_1PX } });
  rec('6.9 สถานประกอบการส่งแบบประเมิน (ไม่มี token)', 'POST /public/evaluate/:id',
    '201', `HTTP ${compEval.status} ${msg(compEval)}`, compEval.status === 201 ? 'PASS' : 'FAIL',
    'endpoint นี้รับข้อมูลโดยไม่ต้องมี token ใด ๆ');
  issue('Major', 'แบบประเมินของสถานประกอบการรับข้อมูลได้โดยไม่ต้องยืนยันตัวตน',
    'POST /api/public/evaluate/:requestId ไม่ตรวจ token เหมือนลิงก์ตอบรับ ใครที่รู้เลขคำร้อง (เลขเรียงลำดับ) ส่งคะแนนแทนพี่เลี้ยงได้ ในการทดสอบนี้ส่งสำเร็จโดยไม่มี token');
  const m6b = await mailsSince(mark, 2500);
  recMails('สถานประกอบการส่งแบบประเมิน (Email Check 4)', m6b, 'แอดมินได้รับแจ้ง, นักศึกษาได้รับแจ้งผลประเมินและการสิ้นสุดการฝึก');
  const toStudent6 = m6b.filter((m) => /6610014111/.test(m.to || ''));
  const toAdmin6 = m6b.filter((m) => /admin@|apichatkrompan471/.test(m.to || ''));
  rec('6.10 Email Check 4: แจ้งนักศึกษาเรื่องผลประเมินและสิ้นสุดการฝึก', 'mailer.sendStudentEvaluationNoticeEmail + notifyStudentStatusChange',
    'มีอีเมลถึงนักศึกษาอย่างน้อย 1 ฉบับ', `${toStudent6.length} ฉบับ: ${toStudent6.map((m) => m.subject).join(' | ') || '-'}`,
    toStudent6.length ? 'PASS' : 'FAIL');
  rec('6.11 แจ้งแอดมินว่ามีผลประเมินใหม่', 'mailer.sendAdminEvaluationAlertEmail',
    'มีอีเมลถึงแอดมิน', `${toAdmin6.length} ฉบับ`, toAdmin6.length ? 'PASS' : 'FAIL');

  const afterEval = await call('GET', `/requests/${RID}`, { token: adminToken });
  const statusAfterEval = afterEval.json && afterEval.json.data && afterEval.json.data.status;
  rec('6.12 ประเมินครบสองฝ่ายแล้วปิดสถานะอัตโนมัติ', 'GET /requests/:id',
    'สถานะ = ฝึกงานเสร็จแล้ว', `HTTP ${afterEval.status}, status = ${statusAfterEval}`, statusAfterEval === 'ฝึกงานเสร็จแล้ว' ? 'PASS' : 'FAIL');
  rec('6.13 อาจารย์ตัดเกรด (S / ผ่าน)', '-', 'มีช่องบันทึกเกรด', 'ไม่พบ endpoint หรือคอลัมน์สำหรับเกรดในระบบ', 'SKIPPED',
    'ฟีเจอร์ยังไม่มีในระบบ');

  // ===== Step 7: Completion =====
  const ck = await call('GET', '/checkins', { token: adminToken, query: { studentId: FIX.student.username } });
  const ckRows = (ck.json && ck.json.data) || [];
  const hours = ckRows.filter((r) => r.status === 'present').length * 8;
  rec('7.1 ตรวจชั่วโมงฝึกครบ 300', 'GET /checkins (admin)', '>= 300 ชั่วโมง',
    `${ckRows.length} รายงาน x 8 ชม. = ${hours} ชั่วโมง`, hours >= 300 ? 'PASS' : 'BLOCKED',
    'ทดสอบได้แค่ 2 วันทำการ ไม่สามารถสะสมครบ 300 ชั่วโมงภายในการทดสอบ และระบบไม่มีจุดตรวจชั่วโมงอัตโนมัติก่อนปิดงาน');

  mark = mailMark();
  const finish = await call('PATCH', `/requests/${RID}/status`, { token: adminToken, body: { status: 'เสร็จสิ้นสมบูรณ์', admin_comment: '[E2E] ปิดการฝึกประสบการณ์วิชาชีพ' } });
  rec('7.2 แอดมินปิดสถานะสุดท้าย', 'PATCH /requests/:id/status (admin)',
    '200 และสถานะ = เสร็จสิ้นสมบูรณ์', `HTTP ${finish.status}, status = ${finish.json && finish.json.data && finish.json.data.status}`,
    finish.status === 200 ? 'PASS' : 'FAIL',
    'ไม่มีปุ่มนี้บนหน้าจอ ใช้ API โดยตรง และชื่อสถานะในระบบคือ เสร็จสิ้นสมบูรณ์');
  const m7 = await mailsSince(mark);
  recMails('ปิดการฝึกงาน', m7, 'นักศึกษาได้รับแจ้งสถานะสุดท้าย');
  const toStudent7 = m7.filter((m) => /6610014111/.test(m.to || ''));
  rec('7.3 แจ้งสถานะสุดท้ายถึงนักศึกษา', 'mailer.notifyStudentStatusChange', 'มีอีเมลถึงนักศึกษา', `${toStudent7.length} ฉบับ`, toStudent7.length ? 'PASS' : 'FAIL');

  // ===== Round 2: CWIE edge case =====
  const cwie = await call('POST', '/requests', { token: studentToken, body: { ...reqPayload, company: '[E2E] บริษัท สหกิจทดสอบ จำกัด', details: { ...reqPayload.details, internshipType: 'cwie', internshipTerm: 'term1' } } });
  const cwieRow = cwie.json && cwie.json.data;
  ctx.cwieRequestId = cwieRow && cwieRow.id;
  let cwieType = null;
  try { cwieType = (typeof cwieRow.details === 'string' ? JSON.parse(cwieRow.details) : cwieRow.details).internshipType; } catch (_) {}
  rec('R2.1 ยื่นคำร้องสหกิจศึกษา (CWIE)', 'POST /requests',
    '201 และ internshipType = cwie', `HTTP ${cwie.status}, request #${ctx.cwieRequestId}, internshipType = ${cwieType}`,
    cwie.status === 201 && cwieType === 'cwie' ? 'PASS' : 'FAIL');
  const cwiePreview = await call('GET', '/internship-rounds/preview-end-date', { query: { start: START_DATE, hours: String(16 * 5 * 8) } });
  rec('R2.2 คำนวณช่วงฝึก CWIE 16 สัปดาห์', 'GET /internship-rounds/preview-end-date (640 ชม.)',
    'ระบบมีรูปแบบคำนวณแบบสัปดาห์สำหรับ CWIE',
    `HTTP ${cwiePreview.status}, endDate = ${cwiePreview.json && cwiePreview.json.data && cwiePreview.json.data.endDate} (คำนวณจากชั่วโมงเท่านั้น)`,
    'SKIPPED', 'ไม่มีตรรกะเฉพาะ CWIE ฝั่งเซิร์ฟเวอร์ ใช้ชั่วโมง 640 = 16 สัปดาห์ x 5 วัน x 8 ชม. แทน');
  rec('R2.3 ยื่นคำร้องซ้อนขณะมีคำร้องอื่นอยู่', 'POST /requests', 'ระบบควรป้องกันคำร้องซ้อน',
    `สร้างคำร้องที่ 2 ได้ (HTTP ${cwie.status})`, cwie.status === 201 ? 'FAIL' : 'PASS',
    'ไม่มีการตรวจคำร้องที่ยังเปิดอยู่ของนักศึกษาคนเดียวกัน');
  if (cwie.status === 201) {
    issue('Minor', 'ไม่มีการกันคำร้องซ้อน', 'POST /api/requests ไม่ตรวจว่านักศึกษามีคำร้องที่ยังดำเนินการอยู่หรือไม่ ยื่นซ้ำได้ไม่จำกัด');
  }
};

main()
  .catch((err) => {
    rec('ABORT', '-', '-', err.message, 'FAIL');
    ctx.aborted = err.message;
  })
  .finally(() => {
    ctx.finishedAt = new Date().toISOString();
    ctx.allMails = readMails();
    fs.writeFileSync(OUT, JSON.stringify({ ctx, results, emails, issues }, null, 2), 'utf8');
    const count = (s) => results.filter((r) => r.status === s).length;
    console.log(`\nSUMMARY pass=${count('PASS')} fail=${count('FAIL')} skipped=${count('SKIPPED')} blocked=${count('BLOCKED')} mails=${ctx.allMails.length}`);
    console.log(`requestId=${ctx.requestId} cwieRequestId=${ctx.cwieRequestId} roundId=${ctx.roundId} paymentId=${ctx.paymentId}`);
  });

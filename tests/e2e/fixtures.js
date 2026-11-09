'use strict';
// ค่าคงที่และตัวช่วยร่วมของชุดทดสอบ E2E (ไฟล์ 01 ถึง 07)
// รันภายใน container ของ coop-backend เสมอ (ต้องเข้าถึง JWT secret และ node_modules ของ backend)
const fs = require('fs');
const path = require('path');

const STATE_DIR = process.env.E2E_STATE_DIR || '/tmp/e2e';
const MAIL_LOG = path.join(process.env.E2E_MAIL_DIR || path.join(STATE_DIR, 'mails'), 'mails.jsonl');
const STATE_FILE = path.join(STATE_DIR, 'state.json');
const AUDIT_FILE = path.join(STATE_DIR, 'email-audit.jsonl');
const NOTES_FILE = path.join(STATE_DIR, 'notes.jsonl');
fs.mkdirSync(STATE_DIR, { recursive: true });

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:5099/api';
const SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

const FIXTURES = {
  student: {
    id: 1217,
    studentId: '6610014111',
    email: 'stu6610014111@sskru.ac.th',
    name: 'นายอภิชาติ กรมพันธ์',
    department: 'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์',
  },
  company: {
    name: 'บริษัท ตัวอย่างเทคโนโลยี จำกัด',
    mentorEmail: 'apichatkrompan02668@gmail.com',
    mentorName: 'คุณพี่เลี้ยง ทดสอบระบบ',
    mentorPosition: 'Senior Software Engineer',
  },
  advisor: {
    username: 'AD034',
    password: 'Password123',
    email: 'apichatkrompan75@gmail.com',
  },
  admin: {
    id: 1,
    username: 'admin',
    email: 'apichatkrompan471@gmail.com',
  },
  requiredHours: 300,
  roundTitle: '[E2E] รอบทดสอบอัตโนมัติ',
};

// 1x1 PNG และ PDF ขนาดเล็กสำหรับลายมือชื่อ/สลิป/หนังสือ
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const PDF_MIN = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n').toString('base64');

// ---------- วันที่ (เขตเวลา Asia/Bangkok) ----------
const ymd = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
const addDays = (dateStr, n) => ymd(new Date(new Date(dateStr + 'T12:00:00+07:00').getTime() + n * 86400000));
const isWeekend = (dateStr) => {
  const wd = new Date(dateStr + 'T12:00:00+07:00').getUTCDay();
  return wd === 0 || wd === 6;
};
const today = () => ymd(new Date());
// ย้อนหลัง n วันทำการ (ข้ามเสาร์-อาทิตย์ เพื่อให้ลงย้อนหลังในวันที่เป็นวันทำงานจริง)
const workdayBack = (n) => {
  let d = today();
  let left = n;
  while (left > 0) {
    d = addDays(d, -1);
    if (!isWeekend(d)) left -= 1;
  }
  return d;
};
// วันเริ่มฝึก: วันจันทร์ของสัปดาห์ก่อนหน้า (ไม่เกินวันลงย้อนหลังเสมอ)
const defaultStart = () => {
  let d = addDays(today(), -7);
  while (new Date(d + 'T12:00:00+07:00').getUTCDay() !== 1) d = addDays(d, -1);
  return d;
};

// ---------- state ที่ส่งต่อระหว่างไฟล์ ----------
const loadState = () => {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (_) { return {}; }
};
const saveState = (patch) => {
  const next = { ...loadState(), ...patch };
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2), 'utf8');
  return next;
};
const requireState = (...keys) => {
  const s = loadState();
  const missing = keys.filter((k) => s[k] === undefined || s[k] === null);
  if (missing.length) {
    throw new Error(`ขาดข้อมูลจากขั้นตอนก่อนหน้า (${missing.join(', ')}) ให้รันไฟล์ก่อนหน้าให้ผ่านก่อน`);
  }
  return s;
};

// ---------- HTTP ----------
const api = async (method, urlPath, { token, body, query } = {}) => {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const res = await fetch(BASE + urlPath + qs, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) { json = { raw: text.slice(0, 300) }; }
  return { status: res.status, json, data: json && json.data };
};
const msg = (r) => (r && r.json && (r.json.message || r.json.raw)) || '';

// ---------- โทเค็น ----------
// บัญชีจริง: ล็อกอินด้วยรหัสผ่านที่ให้มา ถ้าไม่ผ่านจะสร้างโทเค็นด้วย JWT secret ของเซิร์ฟเวอร์ (บันทึกวิธีที่ใช้ไว้)
const mint = ({ id, username, role }) => {
  const jwt = require('/app/node_modules/jsonwebtoken');
  return jwt.sign({ id, username, role }, SECRET, { expiresIn: '2h' });
};
const login = async (username, passwords) => {
  for (const password of passwords) {
    const r = await api('POST', '/auth/login', { body: { email: username, password } });
    if (r.status === 200 && r.json.token) return { token: r.json.token, user: r.json.user, via: 'login' };
  }
  return null;
};

// ---------- อีเมลที่ถูกดักไว้ ----------
const readMails = () => {
  try { return fs.readFileSync(MAIL_LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch (_) { return []; }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mailMark = () => readMails().length;
const mailsSince = async (mark, waitMs = 2000) => { await sleep(waitMs); return readMails().slice(mark); };
const matchTo = (m, address) => String(m.to || '').toLowerCase().includes(String(address).toLowerCase());

/**
 * ตรวจอีเมลที่ควรถึงผู้รับ และบันทึกลงตาราง Email Delivery Audit
 * expectations: [{ to, note }]   to = ที่อยู่ที่สเปกกำหนด
 * คืน array ของผลต่อผู้รับ [{ to, found, mail }]
 */
const verifyEmails = (event, captured, expectations) => {
  const results = expectations.map(({ to, note }) => {
    const mail = captured.find((m) => matchTo(m, to)) || null;
    const row = {
      event,
      to,
      subject: mail ? mail.subject : '-',
      status: mail ? 'SENT (captured)' : 'NOT SENT',
      log: mail ? mail.messageId : '-',
      htmlFile: mail ? path.basename(mail.htmlFile) : null,
      note: note || '',
    };
    fs.appendFileSync(AUDIT_FILE, JSON.stringify(row) + '\n', 'utf8');
    return { to, found: Boolean(mail), mail };
  });
  // อีเมลอื่นที่เกิดขึ้นในเหตุการณ์เดียวกันแต่ไม่อยู่ในรายการคาดหวัง (เพื่อให้เห็นภาพรวมการส่งจริง)
  for (const m of captured) {
    if (expectations.some(({ to }) => matchTo(m, to))) continue;
    fs.appendFileSync(AUDIT_FILE, JSON.stringify({
      event: `${event} (ผู้รับอื่นที่ระบบส่งจริง)`, to: m.to, subject: m.subject, status: 'SENT (captured)',
      log: m.messageId, htmlFile: path.basename(m.htmlFile), note: '',
    }) + '\n', 'utf8');
  }
  return results;
};

// บันทึกค่าจริงที่สังเกตได้ในแต่ละเทสต์ เพื่อแสดงในคอลัมน์ "ผลลัพธ์จริง" ของรายงาน
const note = (t, text) => {
  fs.appendFileSync(NOTES_FILE, JSON.stringify({ file: path.basename(process.argv[1] || ''), test: t && t.name, text }) + '\n', 'utf8');
};

module.exports = {
  FIXTURES, PNG_1PX, PDF_MIN, BASE, STATE_DIR,
  ymd, addDays, isWeekend, today, workdayBack, defaultStart,
  loadState, saveState, requireState,
  api, msg, mint, login,
  readMails, mailMark, mailsSince, sleep, verifyEmails, note,
};

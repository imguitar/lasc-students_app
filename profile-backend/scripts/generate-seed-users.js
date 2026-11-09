/**
 * สร้างไฟล์ db/03-seed-users.sql จากข้อมูลจริงในไฟล์ Excel
 *
 *   node scripts/generate-seed-users.js [students.xlsx] [advisors.xlsx]
 *
 * - นักศึกษา: username = รหัสนักศึกษา, รหัสผ่านเริ่มต้น = รหัสนักศึกษา
 *   รหัสขึ้นต้น 63–64 ถือเป็นศิษย์เก่า (role alumni, student_status graduated)
 * - อาจารย์: username = AD001, AD002, ... ตามลำดับในไฟล์, รหัสผ่านเริ่มต้น = username
 * - admin: รหัสผ่านเริ่มต้น password123
 *
 * รันซ้ำบนฐานข้อมูลเดิมได้ จะไม่เขียนทับรหัสผ่านที่ผู้ใช้เปลี่ยนแล้ว
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');

const ROOT = path.resolve(__dirname, '..');
const STUDENTS_FILE = process.argv[2] || path.join(ROOT, 'นักศึกษา_1783875795887.xlsx');
const ADVISORS_FILE = process.argv[3] || path.join(ROOT, 'advisors.xlsx');
const OUT_FILE = path.resolve(ROOT, '..', 'db', '03-seed-users.sql');

const ALUMNI_ID_PREFIXES = ['63', '64'];
const ADMIN_HASH = '$2a$10$OBZ.UMFG.QGMhJVl7DAyXeMTzRbA/MkTKGNtjduEm/8mPo/kloiiO'; // password123
const CHUNK = 500;

// ตรงกับ db/02-reference-data.sql
const DEPARTMENTS = {
  1: 'สาขาวิชาวิทยาการคอมพิวเตอร์',
  2: 'สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล',
  3: 'สาขาวิชาสาธารณสุขชุมชน',
  4: 'สาขาวิชาวิทยาศาสตร์การกีฬา',
  5: 'สาขาวิชาเทคโนโลยีการเกษตร',
  6: 'สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร',
  7: 'สาขาวิชาอาชีวอนามัยและความปลอดภัย',
  8: 'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์',
  9: 'สาขาวิชาวิศวกรรมโลจิสติกส์',
  10: 'สาขาวิชาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม',
  11: 'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ',
  12: 'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม',
};

// ชื่อสาขาในไฟล์ Excel (ตัด "สาขาวิชา"/"สาขา" ออกแล้ว) -> departments.id
// ชื่อเดิมของหลักสูตรถูกจับคู่เข้ากับสาขาปัจจุบัน
const DEPT_ALIASES = {
  'วิทยาการคอมพิวเตอร์': 1,
  'เทคโนโลยีคอมพิวเตอร์และดิจิทัล': 2,
  'เทคโนโลยีสารสนเทศ': 2,
  'สาธารณสุขชุมชน': 3,
  'วิทยาศาสตร์การกีฬา': 4,
  'เทคโนโลยีการเกษตร': 5,
  'วิทยาศาสตร์และเทคโนโลยีการอาหาร': 6,
  'อาชีวอนามัยและความปลอดภัย': 7,
  'วิศวกรรมซอฟต์แวร์': 8,
  'วิศวกรรมโลจิสติกส์': 9,
  'วิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม': 10,
  'การจัดการอุตสาหกรรม': 10,
  'วิทยาศาสตร์สิ่งแวดล้อม': 10,
  'นวัตกรรมวัสดุและการออกแบบผลิตภัณฑ์': 11,
  'ออกแบบผลิตภัณฑ์อุตสาหกรรม': 11,
  'เทคโนโลยีโยธาและสถาปัตยกรรม': 12,
  'เทคโนโลยีก่อสร้าง': 12,
};

const ACADEMIC_PREFIX = /^(ศ\.ดร\.|รศ\.ดร\.|ผศ\.ดร\.|ศ\.|รศ\.|ผศ\.|ดร\.|อ\.)/;
const THAI_COMBINING = /^[ัิ-ฺ็-๎]/;

function deptId(name) {
  const key = String(name || '').trim().replace(/^สาขา(วิชา)?/, '');
  const id = DEPT_ALIASES[key];
  if (!id) throw new Error(`ไม่รู้จักสาขา: "${name}" — เพิ่มใน DEPT_ALIASES`);
  return id;
}

// ไฟล์ต้นทางตัดคำนำหน้าออก 3 ตัวอักษร: "นายxxx" -> "xxx", "นางสาวxxx" -> "สาวxxx"
function splitStudentPrefix(firstName) {
  const name = String(firstName).trim();
  if (name.startsWith('สาว')) {
    let rest = name.slice(3);
    // "สาวิ..." = "นางสา" + "วิ..." ตัวอักษรที่เหลือต้องไม่ขึ้นต้นด้วยสระบน/ล่างหรือวรรณยุกต์
    if (THAI_COMBINING.test(rest)) rest = name.slice(2);
    return { prefix: 'นางสาว', firstname: rest };
  }
  return { prefix: 'นาย', firstname: name };
}

function splitAdvisorName(fullName) {
  let name = String(fullName).trim();
  const m = name.match(ACADEMIC_PREFIX);
  const prefix = m ? m[1] : null;
  if (m) name = name.slice(m[1].length).trim();
  const [firstname, ...rest] = name.split(/\s+/);
  return { prefix, firstname, lastname: rest.join(' ') };
}

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`);

function readSheet(file) {
  const wb = XLSX.readFile(file);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
}

function chunks(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK));
  return out;
}

async function main() {
  const people = [];

  for (const r of readSheet(STUDENTS_FILE)) {
    const id = String(r.student_id).trim();
    if (!/^\d{10}$/.test(id)) throw new Error(`รหัสนักศึกษาไม่ถูกต้อง: ${id}`);
    const alumni = ALUMNI_ID_PREFIXES.includes(id.slice(0, 2));
    const d = deptId(r.department);
    const { prefix, firstname } = splitStudentPrefix(r.first_name);
    people.push({
      username: id, email: String(r.email || `${id}@student.sskru.ac.th`).trim().toLowerCase(),
      role: alumni ? 'alumni' : 'student', studentId: id, deptId: d,
      prefix, firstname, lastname: String(r.last_name).trim(),
      status: alumni ? 'graduated' : 'active', phone: r.phone ? String(r.phone).trim() : null,
    });
  }

  readSheet(ADVISORS_FILE).forEach((r, i) => {
    const username = `AD${String(i + 1).padStart(3, '0')}`;
    const d = deptId(r.department);
    people.push({
      username, email: `${username.toLowerCase()}@lasc.ac.th`, role: 'advisor', studentId: null,
      deptId: d, ...splitAdvisorName(r.name), status: 'active', phone: null,
    });
  });

  const dupes = (key) => people.length - new Set(people.map((p) => p[key])).size;
  if (dupes('username') || dupes('email')) throw new Error('พบ username หรือ email ซ้ำ');

  console.log(`กำลังสร้าง bcrypt hash ${people.length} บัญชี...`);
  for (const [i, p] of people.entries()) {
    p.hash = await bcrypt.hash(p.username, 10);
    if ((i + 1) % 250 === 0) console.log(`  ${i + 1}/${people.length}`);
  }

  const count = (role) => people.filter((p) => p.role === role).length;
  const lines = [
    '-- ==========================================================',
    '-- Seed: บัญชีผู้ใช้จริง (สร้างอัตโนมัติ ห้ามแก้ไขไฟล์นี้ด้วยมือ)',
    '-- สร้างจาก: profile-backend/scripts/generate-seed-users.js',
    `-- นักศึกษา ${count('student')} | ศิษย์เก่า ${count('alumni')} | อาจารย์ ${count('advisor')} | admin 1`,
    '-- รหัสผ่านเริ่มต้น: เท่ากับ username (admin ใช้ password123) ให้ผู้ใช้เปลี่ยนหลังเข้าสู่ระบบครั้งแรก',
    '-- รันซ้ำได้: ไม่เขียนทับรหัสผ่านของบัญชีที่มีอยู่แล้ว',
    '-- ==========================================================',
    '',
    'USE `lascstudent`;',
    'SET NAMES utf8mb4;',
    '',
    '-- 1. admin',
    'INSERT INTO `user` (`username`, `email`, `password`, `role`, `isActive`, `studentId`, `department`, `phone`)',
    `VALUES ('admin', 'admin@lasc.ac.th', '${ADMIN_HASH}', 'admin', 1, NULL, ${q(DEPARTMENTS[1])}, NULL)`,
    'ON DUPLICATE KEY UPDATE `role` = VALUES(`role`);',
    '',
    'INSERT INTO `profile` (`profile_id`, `prefix`, `firstname`, `lastname`, `faculty_id`, `department_id`, `student_status`)',
    "VALUES ('admin', NULL, 'ผู้ดูแลระบบ', 'ส่วนกลาง', 1, 1, 'active')",
    'ON DUPLICATE KEY UPDATE `firstname` = VALUES(`firstname`);',
    '',
  ];

  lines.push('-- 2. บัญชีผู้ใช้ (user)');
  for (const part of chunks(people)) {
    lines.push('INSERT INTO `user` (`username`, `email`, `password`, `role`, `isActive`, `studentId`, `department`, `phone`) VALUES');
    lines.push(part.map((p) => `  (${q(p.username)}, ${q(p.email)}, ${q(p.hash)}, ${q(p.role)}, 1, ${q(p.studentId)}, ${q(DEPARTMENTS[p.deptId])}, ${q(p.phone)})`).join(',\n'));
    lines.push('ON DUPLICATE KEY UPDATE `role` = VALUES(`role`), `studentId` = VALUES(`studentId`), `department` = VALUES(`department`);');
    lines.push('');
  }

  lines.push('-- 3. โปรไฟล์ (profile)');
  for (const part of chunks(people)) {
    lines.push('INSERT INTO `profile` (`profile_id`, `prefix`, `firstname`, `lastname`, `faculty_id`, `department_id`, `phone`, `student_status`) VALUES');
    lines.push(part.map((p) => `  (${q(p.username)}, ${q(p.prefix)}, ${q(p.firstname)}, ${q(p.lastname)}, 1, ${p.deptId}, ${q(p.phone)}, ${q(p.status)})`).join(',\n'));
    lines.push('ON DUPLICATE KEY UPDATE `prefix` = VALUES(`prefix`), `firstname` = VALUES(`firstname`), `lastname` = VALUES(`lastname`), `faculty_id` = VALUES(`faculty_id`), `department_id` = VALUES(`department_id`), `student_status` = VALUES(`student_status`);');
    lines.push('');
  }

  fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');
  console.log(`เขียน ${OUT_FILE} แล้ว (${people.length + 1} บัญชี)`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });

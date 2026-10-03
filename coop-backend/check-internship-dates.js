// Diagnostic: ตรวจคำร้องที่ถึงกำหนดวันเริ่ม/สิ้นสุดฝึกงานแต่สถานะยังไม่เปลี่ยน
//   node check-internship-dates.js          — ดูรายการ (dry-run)
//   node check-internship-dates.js --apply  — อัปเดตสถานะจริง ('ออกฝึกงาน' / 'สิ้นสุดการฝึกงาน (รอประเมิน)')
require('dotenv').config();
const pool = require('./src/config/db');
const {
  autoUpdateInternshipStatuses,
  findDueInternshipRequests,
  findEndedInternshipRequests,
  getBangkokToday,
  PRE_INTERNSHIP_STATUSES,
  ACTIVE_INTERNSHIP_STATUSES,
} = require('./src/utils/internshipAutoUpdate');

const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '-');

(async () => {
  const apply = process.argv.includes('--apply');
  const today = getBangkokToday();

  console.log('=== Internship Start-Date Diagnostic ===');
  console.log('Server now        :', new Date().toString());
  console.log('Today (Asia/BKK)  :', today);
  console.log('');

  // คำร้องที่อยู่ในสถานะก่อนฝึกงานทั้งหมด — ยึดวันทางการ (คอลัมน์) เท่านั้น ไม่ใช้ details.startDate
  const [candidates] = await pool.query(
    `SELECT id, studentId, studentName, status,
            internship_start_date, internship_end_date,
            JSON_EXTRACT(dispatchLetter, '$.uploadedAt') AS dispatch_letter_at,
            JSON_UNQUOTE(JSON_EXTRACT(details, '$.startDate')) AS details_startDate
     FROM requests
     WHERE status IN (?)
     ORDER BY id`,
    [PRE_INTERNSHIP_STATUSES]
  );

  console.log(`คำร้องในสถานะก่อนฝึกงาน: ${candidates.length} รายการ`);
  console.log('-'.repeat(100));
  for (const r of candidates) {
    const due = findDueCheck(r, today);
    console.log(
      `#${r.id} | ${r.studentId} | ${r.status}\n` +
      `     start(ทางการ)=${fmtDate(r.internship_start_date)} end=${fmtDate(r.internship_end_date)}` +
      ` | หนังสือส่งตัว=${r.dispatch_letter_at ? 'มี' : 'ยังไม่มี'} | details.startDate(นักศึกษาเสนอ)=${r.details_startDate || '-'}` +
      ` | ${due ? '=> ครบเงื่อนไข ควรเปลี่ยนสถานะ' : 'ยังไม่ครบเงื่อนไข'}`
    );
  }
  console.log('-'.repeat(100));

  const due = await findDueInternshipRequests(today);
  console.log(`คำร้องที่ควรเปลี่ยนเป็น 'ออกฝึกงาน': ${due.length} รายการ`);
  due.forEach((r) => console.log(`  #${r.id} ${r.studentId} start=${fmtDate(r.start_date)}`));

  // คำร้องที่เลยวันสิ้นสุดแต่ยังค้างสถานะกำลังฝึกงาน — ยึดคอลัมน์ทางการเช่นกัน
  console.log('');
  const [activeRows] = await pool.query(
    `SELECT id, studentId, studentName, status,
            internship_end_date,
            JSON_UNQUOTE(JSON_EXTRACT(details, '$.endDate')) AS details_endDate
     FROM requests
     WHERE status IN (?)
     ORDER BY id`,
    [ACTIVE_INTERNSHIP_STATUSES]
  );
  console.log(`คำร้องในสถานะกำลังฝึกงาน: ${activeRows.length} รายการ`);
  console.log('-'.repeat(100));
  for (const r of activeRows) {
    console.log(`  #${r.id} | ${r.studentId} | ${r.status} | end(ทางการ)=${fmtDate(r.internship_end_date)} | details.endDate=${r.details_endDate || '-'}`);
  }
  console.log('-'.repeat(100));

  const ended = await findEndedInternshipRequests(today);
  console.log(`คำร้องที่ควรเปลี่ยนเป็น 'สิ้นสุดการฝึกงาน (รอประเมิน)': ${ended.length} รายการ`);
  ended.forEach((r) => console.log(`  #${r.id} ${r.studentId} end=${fmtDate(r.end_date)}`));

  if (apply && (due.length > 0 || ended.length > 0)) {
    const { updated, ended: endedUpdated } = await autoUpdateInternshipStatuses();
    console.log(`\nอัปเดตแล้ว: เริ่มฝึกงาน ${updated} รายการ, สิ้นสุดฝึกงาน ${endedUpdated} รายการ`);
  } else if (due.length > 0 || ended.length > 0) {
    console.log('\n(dry-run — รันด้วย --apply เพื่ออัปเดตจริง)');
  }

  await pool.end();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

// ตรงเงื่อนไข auto-update ใหม่: วันเริ่มต้องเป็นคอลัมน์ทางการเท่านั้น + มีหนังสือส่งตัว (uploadedAt)
function findDueCheck(r, today) {
  if (!r.internship_start_date) return false;
  if (!r.dispatch_letter_at) return false;
  const s = String(r.internship_start_date).slice(0, 10);
  return s <= today;
}

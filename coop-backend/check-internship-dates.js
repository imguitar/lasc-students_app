// Diagnostic: ตรวจคำร้องที่ถึงกำหนดวันเริ่มฝึกงานแต่สถานะยังไม่เปลี่ยน
//   node check-internship-dates.js          — ดูรายการ (dry-run)
//   node check-internship-dates.js --apply  — อัปเดตสถานะเป็น 'ออกฝึกงาน' จริง
require('dotenv').config();
const pool = require('./src/config/db');
const {
  autoUpdateInternshipStatuses,
  findDueInternshipRequests,
  getBangkokToday,
  PRE_INTERNSHIP_STATUSES,
} = require('./src/utils/internshipAutoUpdate');

const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '-');

(async () => {
  const apply = process.argv.includes('--apply');
  const today = getBangkokToday();

  console.log('=== Internship Start-Date Diagnostic ===');
  console.log('Server now        :', new Date().toString());
  console.log('Today (Asia/BKK)  :', today);
  console.log('');

  // คำร้องที่อยู่ในสถานะก่อนฝึกงานทั้งหมด พร้อมวันที่เริ่ม/จบที่เก็บจริง
  const [candidates] = await pool.query(
    `SELECT id, studentId, studentName, status,
            internship_start_date, internship_end_date,
            JSON_UNQUOTE(JSON_EXTRACT(details, '$.startDate')) AS details_startDate
     FROM requests
     WHERE status IN (?)
     ORDER BY id`,
    [PRE_INTERNSHIP_STATUSES]
  );

  console.log(`คำร้องในสถานะก่อนฝึกงาน: ${candidates.length} รายการ`);
  console.log('-'.repeat(100));
  for (const r of candidates) {
    const start = fmtDate(r.internship_start_date) !== '-' ? fmtDate(r.internship_start_date) : String(r.details_startDate || '-');
    const due = findDueCheck(r, today);
    console.log(
      `#${r.id} | ${r.studentId} | ${r.status}\n` +
      `     start=${start} end=${fmtDate(r.internship_end_date)} | details.startDate=${r.details_startDate || '-'}` +
      ` | ${due ? '=> ถึงกำหนด ควรเปลี่ยนสถานะ' : 'ยังไม่ถึงกำหนด/ไม่มีวันที่'}`
    );
  }
  console.log('-'.repeat(100));

  const due = await findDueInternshipRequests(today);
  console.log(`คำร้องที่ควรเปลี่ยนเป็น 'ออกฝึกงาน': ${due.length} รายการ`);
  due.forEach((r) => console.log(`  #${r.id} ${r.studentId} start=${fmtDate(r.start_date)}`));

  if (apply && due.length > 0) {
    const { updated } = await autoUpdateInternshipStatuses();
    console.log(`\nอัปเดตแล้ว ${updated} รายการ`);
  } else if (due.length > 0) {
    console.log('\n(dry-run — รันด้วย --apply เพื่ออัปเดตจริง)');
  }

  await pool.end();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

function findDueCheck(r, today) {
  const start = r.internship_start_date || r.details_startDate;
  if (!start) return false;
  const s = String(start).slice(0, 10);
  return s <= today;
}

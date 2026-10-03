const pool = require('../config/db');
const { createNotification, findUserIdByUsername } = require('./notificationService');

// สถานะที่ผ่านการอนุมัติขั้นสุดท้ายแล้วเท่านั้น — ถึงวันเริ่มตามกำหนดจึงเปลี่ยนเป็น 'ออกฝึกงาน'
// (ตัดกลุ่ม "สถานประกอบการตอบรับแล้ว" และ "รอ...อนุมัติ" ออก — ห้ามกระโดดข้ามขั้นตอนอนุมัติ)
const PRE_INTERNSHIP_STATUSES = [
  'อนุมัติแล้ว',
  'อนุมัติแล้ว (รอออกฝึกงาน)',
  'รอออกฝึกงาน',
];

// สถานะที่กำลังฝึกงานอยู่ — ถ้าเลยวันสิ้นสุดแล้วให้เปลี่ยนเป็น 'สิ้นสุดการฝึกงาน (รอประเมิน)'
const ACTIVE_INTERNSHIP_STATUSES = [
  'ออกฝึกงาน',
  'กำลังออกฝึกงาน',
];

// วันนี้ตามเวลาประเทศไทย (YYYY-MM-DD) — กันปัญหา server ตั้งค่าเป็น UTC ทำให้วันที่ช้า/เร็วไป 7 ชม.
const getBangkokToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

// วันเริ่มฝึกงาน: ยึดคอลัมน์ internship_start_date เท่านั้น — เขียนโดยแอดมินอย่างเป็นทางการเท่านั้น
// (ห้าม fallback ไป details.startDate ซึ่งเป็นวันที่นักศึกษากรอกเสนอเอง จะทำให้คำร้องเด้งข้ามขั้นได้)
const START_DATE_EXPR = "internship_start_date";

// วันสิ้นสุดฝึกงาน: ยึดคอลัมน์ internship_end_date (แอดมินกำหนด) เช่นเดียวกัน
const END_DATE_EXPR = "internship_end_date";

// หนังสือส่งตัวทางการจากแอดมิน: ฟอร์ม "กำหนดวัน+แนบหนังสือส่งตัว" ประทับ uploadedAt เสมอ
// (dispatchLetter เป็นคอลัมน์เดียวกับหนังสือขอความอนุเคราะห์ — ใช้ uploadedAt เป็นตัวแยกว่าเป็นหนังสือส่งตัวจริง)
const DISPATCH_LETTER_EXPR = "JSON_EXTRACT(dispatchLetter, '$.uploadedAt')";

// ค้นหาคำร้องที่ถึงกำหนดวันเริ่มฝึกงานแล้ว แต่ยังไม่ได้เปลี่ยนสถานะ
// เงื่อนไข: อนุมัติขั้นสุดท้ายแล้ว + แอดมินกำหนดวันทางการ + แนบหนังสือส่งตัวแล้ว + ถึงวัน (เวลาไทย)
const findDueInternshipRequests = async (today = getBangkokToday()) => {
  const [rows] = await pool.query(
    `SELECT id, studentId, studentName, status, ${START_DATE_EXPR} AS start_date
     FROM requests
     WHERE status IN (?)
       AND ${START_DATE_EXPR} IS NOT NULL
       AND ${START_DATE_EXPR} <= ?
       AND ${DISPATCH_LETTER_EXPR} IS NOT NULL
     ORDER BY id`,
    [PRE_INTERNSHIP_STATUSES, today]
  );
  return rows;
};

// ค้นหาคำร้องที่เลยวันสิ้นสุดฝึกงานแล้ว แต่ยังค้างสถานะกำลังฝึกงาน
const findEndedInternshipRequests = async (today = getBangkokToday()) => {
  const [rows] = await pool.query(
    `SELECT id, studentId, studentName, status, ${END_DATE_EXPR} AS end_date
     FROM requests
     WHERE status IN (?)
       AND ${END_DATE_EXPR} IS NOT NULL
       AND ${END_DATE_EXPR} < ?
     ORDER BY id`,
    [ACTIVE_INTERNSHIP_STATUSES, today]
  );
  return rows;
};

// อัปเดตสถานะคำร้องที่ถึงกำหนดแล้วเป็น 'ออกฝึกงาน' + แจ้งเตือนนักศึกษา
// และอัปเดตคำร้องที่เลยวันสิ้นสุดแล้วเป็น 'สิ้นสุดการฝึกงาน (รอประเมิน)'
const autoUpdateInternshipStatuses = async ({ notify = true } = {}) => {
  const today = getBangkokToday();
  const due = await findDueInternshipRequests(today);

  if (due.length > 0) {
    await pool.query(
      `UPDATE requests
       SET status = 'ออกฝึกงาน'
       WHERE status IN (?)
         AND ${START_DATE_EXPR} IS NOT NULL
         AND ${START_DATE_EXPR} <= ?
         AND ${DISPATCH_LETTER_EXPR} IS NOT NULL`,
      [PRE_INTERNSHIP_STATUSES, today]
    );

    if (notify) {
      for (const req of due) {
        const userId = await findUserIdByUsername(req.studentId);
        if (userId) {
          await createNotification({
            userId,
            type: 'request_status',
            title: 'เริ่มการฝึกงาน',
            message: `คำร้อง #${req.id} เปลี่ยนสถานะเป็น "ออกฝึกงาน" ตามกำหนดวันเริ่มฝึกงาน`,
            link: '/dashboard',
            requestId: req.id,
          });
        }
      }
    }
  }

  // เลยวันสิ้นสุด → 'สิ้นสุดการฝึกงาน (รอประเมิน)' (รันหลัง start-update เพื่อจับเคสที่เลยทั้ง start+end ในครั้งเดียว)
  const ended = await findEndedInternshipRequests(today);

  if (ended.length > 0) {
    await pool.query(
      `UPDATE requests
       SET status = 'สิ้นสุดการฝึกงาน (รอประเมิน)'
       WHERE status IN (?)
         AND ${END_DATE_EXPR} IS NOT NULL
         AND ${END_DATE_EXPR} < ?`,
      [ACTIVE_INTERNSHIP_STATUSES, today]
    );

    if (notify) {
      for (const req of ended) {
        const userId = await findUserIdByUsername(req.studentId);
        if (userId) {
          await createNotification({
            userId,
            type: 'request_status',
            title: 'สิ้นสุดการฝึกงาน',
            message: `คำร้อง #${req.id} สิ้นสุดการฝึกงานแล้ว รอการประเมินผล`,
            link: '/dashboard',
            requestId: req.id,
          });
        }
      }
    }
  }

  return { today, updated: due.length, ended: ended.length, requests: due };
};

module.exports = {
  autoUpdateInternshipStatuses,
  findDueInternshipRequests,
  findEndedInternshipRequests,
  getBangkokToday,
  PRE_INTERNSHIP_STATUSES,
  ACTIVE_INTERNSHIP_STATUSES,
};

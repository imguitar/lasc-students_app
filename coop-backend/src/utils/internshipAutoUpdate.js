const pool = require('../config/db');
const { createNotification, findUserIdByUsername } = require('./notificationService');

// สถานะก่อนเริ่มฝึกงานจริง — ถึงวันเริ่มตามกำหนดแล้วให้เปลี่ยนเป็น 'ออกฝึกงาน'
const PRE_INTERNSHIP_STATUSES = [
  'อนุมัติแล้ว',
  'รออาจารย์อนุมัติเริ่มฝึกงาน',
  'รอแอดมินอนุมัติเริ่มฝึกงาน',
  'รอแอดมินอนุมัติการออกฝึกงาน',
  'สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)',
  'ตอบรับแล้ว',
];

// วันนี้ตามเวลาประเทศไทย (YYYY-MM-DD) — กันปัญหา server ตั้งค่าเป็น UTC ทำให้วันที่ช้า/เร็วไป 7 ชม.
const getBangkokToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());

// วันเริ่มฝึกงานเก็บได้ 2 ที่: คอลัมน์ internship_start_date (แหล่งหลัก) และ details.startDate (JSON)
const START_DATE_EXPR =
  "COALESCE(internship_start_date, DATE(JSON_UNQUOTE(JSON_EXTRACT(details, '$.startDate'))))";

// ค้นหาคำร้องที่ถึงกำหนดวันเริ่มฝึกงานแล้ว แต่ยังไม่ได้เปลี่ยนสถานะ
const findDueInternshipRequests = async (today = getBangkokToday()) => {
  const [rows] = await pool.query(
    `SELECT id, studentId, studentName, status, ${START_DATE_EXPR} AS start_date
     FROM requests
     WHERE status IN (?)
       AND ${START_DATE_EXPR} IS NOT NULL
       AND ${START_DATE_EXPR} <= ?
     ORDER BY id`,
    [PRE_INTERNSHIP_STATUSES, today]
  );
  return rows;
};

// อัปเดตสถานะคำร้องที่ถึงกำหนดแล้วเป็น 'ออกฝึกงาน' + แจ้งเตือนนักศึกษา
const autoUpdateInternshipStatuses = async ({ notify = true } = {}) => {
  const today = getBangkokToday();
  const due = await findDueInternshipRequests(today);
  if (due.length === 0) return { today, updated: 0, requests: [] };

  await pool.query(
    `UPDATE requests
     SET status = 'ออกฝึกงาน'
     WHERE status IN (?)
       AND ${START_DATE_EXPR} IS NOT NULL
       AND ${START_DATE_EXPR} <= ?`,
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

  return { today, updated: due.length, requests: due };
};

module.exports = {
  autoUpdateInternshipStatuses,
  findDueInternshipRequests,
  getBangkokToday,
  PRE_INTERNSHIP_STATUSES,
};

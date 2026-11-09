// ตัวช่วยนับวันทำการ (จันทร์-ศุกร์ ไม่รวมวันหยุดนักขัตฤกษ์) — ตรรกะเดียวกับ coop-backend/src/utils/workingDays.js
// ฝั่งหน้าจอใช้คำนวณสด (Live) ฝั่ง backend คำนวณซ้ำตอนบันทึกเพื่อเป็นค่าทางการ

export const HOURS_PER_DAY = 8;
export const DEFAULT_REQUIRED_HOURS = 300;

const parseYMD = (ymd) => {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const formatYMD = (ms) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (ymd, n) => formatYMD(parseYMD(ymd) + n * 86400000);
export const isWeekend = (ymd) => {
  const wd = new Date(parseYMD(ymd)).getUTCDay();
  return wd === 0 || wd === 6;
};
export const isValidYMD = (ymd) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(ymd || '').slice(0, 10)) && !Number.isNaN(parseYMD(ymd));

/** จำนวนวันทำการที่ต้องฝึกจากจำนวนชั่วโมง (ปัดขึ้น) */
export const requiredWorkingDays = (hours, hoursPerDay = HOURS_PER_DAY) =>
  Math.max(1, Math.ceil((Number(hours) || DEFAULT_REQUIRED_HOURS) / hoursPerDay));

/**
 * วันสิ้นสุดฝึกงาน: นับจากวันเริ่ม (นับวันเริ่มด้วยถ้าเป็นวันทำการ) ข้ามเสาร์-อาทิตย์และวันหยุด
 * คืน { endDate, workingDays, skippedHolidays } หรือ null ถ้าวันเริ่มไม่ถูกต้อง
 */
export const computeEndDate = (startYmd, requiredHours, holidaySet = new Set(), hoursPerDay = HOURS_PER_DAY) => {
  if (!isValidYMD(startYmd)) return null;
  const needed = requiredWorkingDays(requiredHours, hoursPerDay);
  const skippedHolidays = [];
  let cur = String(startYmd).slice(0, 10);
  let count = 0;
  for (let i = 0; i < 2000; i += 1) {
    if (!isWeekend(cur)) {
      if (holidaySet.has(cur)) {
        skippedHolidays.push(cur);
      } else {
        count += 1;
        if (count >= needed) return { endDate: cur, workingDays: needed, skippedHolidays };
      }
    }
    cur = addDays(cur, 1);
  }
  return null;
};

/**
 * วันทำการในช่วง [from, to] (รวมทั้งสองฝั่ง) — คืนอาร์เรย์ 'YYYY-MM-DD'
 * ใช้หาวัน "ขาดบันทึก" = วันทำการที่ผ่านมาแล้วแต่ไม่มีรายงาน
 */
export const listWorkingDays = (from, to, holidaySet = new Set()) => {
  if (!isValidYMD(from) || !isValidYMD(to) || from > to) return [];
  const days = [];
  let cur = String(from).slice(0, 10);
  for (let i = 0; i < 2000 && cur <= to; i += 1) {
    if (!isWeekend(cur) && !holidaySet.has(cur)) days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
};

// ตัวช่วยนับวันทำการ (จันทร์-ศุกร์ ไม่รวมวันหยุดนักขัตฤกษ์)
// ทำงานกับสตริง 'YYYY-MM-DD' ด้วย Date.UTC ทั้งหมด เพื่อไม่ให้เขตเวลาของเซิร์ฟเวอร์ทำให้วันเลื่อน
// ตรรกะเดียวกับ coop-frontend/src/utils/workingDays.js (ฝั่งหน้าจอใช้คำนวณสด ฝั่งนี้ใช้ตอนบันทึก)

const HOURS_PER_DAY = 8;
const DEFAULT_REQUIRED_HOURS = 300;

const parseYMD = (ymd) => {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const formatYMD = (ms) => new Date(ms).toISOString().slice(0, 10);
const addDays = (ymd, n) => formatYMD(parseYMD(ymd) + n * 86400000);
const isWeekend = (ymd) => {
  const wd = new Date(parseYMD(ymd)).getUTCDay();
  return wd === 0 || wd === 6;
};
const isValidYMD = (ymd) => /^\d{4}-\d{2}-\d{2}$/.test(String(ymd || '').slice(0, 10)) && !Number.isNaN(parseYMD(ymd));

/** จำนวนวันทำการที่ต้องฝึกจากจำนวนชั่วโมง (ปัดขึ้น) */
const requiredWorkingDays = (hours, hoursPerDay = HOURS_PER_DAY) =>
  Math.max(1, Math.ceil((Number(hours) || DEFAULT_REQUIRED_HOURS) / hoursPerDay));

/**
 * คำนวณวันสิ้นสุดฝึกงาน: นับจากวันเริ่ม (นับวันเริ่มด้วยถ้าเป็นวันทำการ)
 * ข้ามเสาร์-อาทิตย์และวันหยุดใน holidaySet จนครบจำนวนวันทำการ
 * คืน { endDate, workingDays, skippedHolidays: [{ date }] }
 */
const computeEndDate = (startYmd, requiredHours, holidaySet = new Set(), hoursPerDay = HOURS_PER_DAY) => {
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

module.exports = {
  HOURS_PER_DAY,
  DEFAULT_REQUIRED_HOURS,
  addDays,
  isWeekend,
  isValidYMD,
  requiredWorkingDays,
  computeEndDate,
};

'use strict';
// ขั้นที่ 1: แอดมินตั้งรอบฝึกงานและคำนวณวันสิ้นสุดอัตโนมัติ
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const F = require('./fixtures');

// คำนวณแยกอิสระ: นับวันทำการ (จันทร์-ศุกร์ ไม่รวมวันหยุดที่เปิดใช้งาน) ครบจำนวนชั่วโมง / 8
const independentEnd = (start, hours, holidays) => {
  const needed = Math.ceil(hours / 8);
  let cur = start;
  let count = 0;
  for (let i = 0; i < 2000; i += 1) {
    if (!F.isWeekend(cur) && !holidays.has(cur)) {
      count += 1;
      if (count >= needed) return { endDate: cur, workingDays: needed };
    }
    cur = F.addDays(cur, 1);
  }
  return null;
};

describe('01 admin round setup', () => {
  const start = process.env.E2E_START || F.defaultStart();
  let adminToken;
  const holidays = new Set();
  let expected;

  before(async () => {
    adminToken = F.mint({ id: F.FIXTURES.admin.id, username: F.FIXTURES.admin.username, role: 'admin' });
    for (const y of new Set([Number(start.slice(0, 4)), Number(start.slice(0, 4)) + 1])) {
      const h = await F.api('GET', '/holidays', { query: { year: String(y) } });
      ((h.data) || []).forEach((x) => {
        const active = x.isActive === undefined ? true : Boolean(Number(x.isActive));
        if (active && x.date) holidays.add(String(x.date).slice(0, 10));
      });
    }
    expected = independentEnd(start, F.FIXTURES.requiredHours, holidays);
  });

  it('ฐานข้อมูลวันหยุดมีข้อมูลที่เปิดใช้งานให้คำนวณ', async (t) => {
    F.note(t, `โหลดวันหยุดที่เปิดใช้งาน ${holidays.size} วัน`);
    assert.ok(holidays.size > 0, 'ไม่พบวันหยุดที่เปิดใช้งานในฐานข้อมูล จึงตรวจการหักวันหยุดไม่ได้');
  });

  it('preview คำนวณวันสิ้นสุด 300 ชั่วโมง = 38 วันทำการ หักเสาร์-อาทิตย์และวันหยุด', async (t) => {
    const r = await F.api('GET', '/internship-rounds/preview-end-date', { query: { start, hours: String(F.FIXTURES.requiredHours) } });
    const got = r.data && r.data.endDate;
    F.note(t, `เริ่ม ${start}, ระบบ = ${got} (${r.data && r.data.workingDays} วันทำการ), คำนวณแยก = ${expected && expected.endDate}, หักวันหยุด ${JSON.stringify((r.data && r.data.skippedHolidays) || [])}`);
    assert.equal(r.status, 200, `HTTP ${r.status} ${F.msg(r)}`);
    assert.equal(r.data.workingDays, 38, 'จำนวนวันทำการต้องเป็น 38 (300 ชม. / 8)');
    assert.equal(got, expected.endDate, `วันสิ้นสุดไม่ตรง (ระบบ ${got}, คำนวณแยก ${expected.endDate})`);
  });

  it('แอดมินสร้างรอบฝึกงานได้ และเซิร์ฟเวอร์คำนวณวันสิ้นสุดเองโดยไม่เชื่อค่าจาก client', async (t) => {
    const r = await F.api('POST', '/admin/internship-rounds', {
      token: adminToken,
      body: { title: F.FIXTURES.roundTitle, academicYear: String(Number(start.slice(0, 4)) + 543), semester: '2', startDate: start, endDate: '2099-01-01', requiredHours: F.FIXTURES.requiredHours, note: 'สร้างโดยชุดทดสอบ E2E', isActive: true },
    });
    const round = r.data;
    F.note(t, `HTTP ${r.status}, รอบ #${round && round.id}, endDate ที่เก็บ = ${round && round.endDate}`);
    assert.equal(r.status, 201, `HTTP ${r.status} ${F.msg(r)}`);
    F.saveState({ roundId: round.id, startDate: start, expectedEndDate: expected.endDate });
    const stored = new Date(round.endDate);
    // DATE ที่ mysql2 คืนอาจเลื่อนตามเขตเวลา จึงเทียบแบบยอมคลาดเคลื่อนหนึ่งวัน
    const diff = Math.abs(stored.getTime() - new Date(expected.endDate + 'T00:00:00Z').getTime()) / 86400000;
    assert.ok(diff <= 1, `endDate ที่เก็บ (${round.endDate}) ไม่ตรงกับที่คำนวณ (${expected.endDate}) และต้องไม่ใช่ค่า 2099 จาก client`);
  });

  it('ไม่ใช่แอดมิน สร้างรอบไม่ได้ (403)', async (t) => {
    const studentToken = F.mint({ id: F.FIXTURES.student.id, username: F.FIXTURES.student.studentId, role: 'student' });
    const r = await F.api('POST', '/admin/internship-rounds', { token: studentToken, body: { title: '[E2E] ห้ามสร้าง', startDate: start } });
    F.note(t, `HTTP ${r.status}`);
    assert.equal(r.status, 403);
  });

  it('รอบที่สร้างเปิดรับและอยู่ในช่วงเวลา พร้อมรับคำร้อง', async (t) => {
    const { roundId } = F.requireState('roundId');
    const r = await F.api('GET', '/internship-rounds/active');
    const mine = ((r.data) || []).find((x) => x.id === roundId);
    F.note(t, `HTTP ${r.status}, พบรอบ = ${Boolean(mine)}, isInPeriod = ${mine && mine.isInPeriod}`);
    assert.ok(mine, 'ไม่พบรอบที่เพิ่งสร้างในรายการรอบที่เปิดใช้งาน');
    assert.equal(Boolean(mine.isInPeriod), true, 'รอบต้องอยู่ในช่วงเวลา (วันเริ่มไม่เกินวันนี้และวันสิ้นสุดยังไม่ผ่าน)');
  });
});

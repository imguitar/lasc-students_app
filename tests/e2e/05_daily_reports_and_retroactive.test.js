'use strict';
// ขั้นที่ 5: รายงานประจำวัน ตรงเวลา และบันทึกย้อนหลัง
// ชื่อฟิลด์ในระบบจริง: isBackfill (= is_late_submission), status (= attendance_status), submittedAt (= submitted_at)
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const F = require('./fixtures');

const { student, company } = F.FIXTURES;

describe('05 daily reports and retroactive', () => {
  const studentToken = F.mint({ id: student.id, username: student.studentId, role: 'student' });
  const TODAY = F.today();
  const BACK = F.workdayBack(2);

  const list = async () => {
    const r = await F.api('GET', '/checkins', { token: studentToken, query: { studentId: student.studentId } });
    return r.data || [];
  };
  // สูตรเดียวกับการ์ดสถิติในหน้ารายงานประจำวันของนักศึกษา
  const stats = (rows) => ({
    onTime: rows.filter((r) => !Number(r.isBackfill) && r.status === 'present').length,
    backfill: rows.filter((r) => Number(r.isBackfill)).length,
    leave: rows.filter((r) => r.status === 'leave').length,
  });

  it('บันทึกรายงานตรงวัน: สำเร็จ isBackfill = false และ status = present', async (t) => {
    const before = stats(await list());
    F.saveState({ statsBefore: before });
    const r = await F.api('POST', '/checkins', { token: studentToken, body: { studentId: student.studentId, studentName: student.name, date: TODAY, status: 'present', note: '08:30-16:30', workExperience: '[E2E] พัฒนาหน้าจอรายงาน' } });
    assert.equal(r.status, 201, `HTTP ${r.status} ${F.msg(r)}`);
    const row = (await list()).find((x) => x.date === TODAY);
    F.note(t, `HTTP ${r.status}, วันที่ ${TODAY}, isBackfill = ${row && row.isBackfill}, status = ${row && row.status}, submittedAt = ${row && row.submittedAt}`);
    assert.ok(row, 'ไม่พบรายงานวันนี้หลังบันทึก');
    assert.equal(Number(row.isBackfill), 0, 'รายงานตรงวันต้องไม่ถูกทำเครื่องหมายย้อนหลัง');
    assert.equal(row.status, 'present');
    assert.ok(row.submittedAt, 'ต้องมีเวลาที่ส่งจริง');
  });

  it('บันทึกย้อนหลังโดยไม่มีลายเซ็นพี่เลี้ยงไม่ได้ (400)', async (t) => {
    const r = await F.api('POST', '/checkins', { token: studentToken, body: { studentId: student.studentId, studentName: student.name, date: BACK, status: 'present', workExperience: '[E2E] ย้อนหลังไม่มีลายเซ็น' } });
    F.note(t, `วันที่ ${BACK}, HTTP ${r.status} ${F.msg(r)}`);
    assert.equal(r.status, 400);
  });

  it('บันทึกย้อนหลัง (2 วันทำการก่อน) พร้อมลายเซ็นพี่เลี้ยง: สำเร็จ isBackfill = true และมี submittedAt จริง', async (t) => {
    const r = await F.api('POST', '/checkins', { token: studentToken, body: { studentId: student.studentId, studentName: student.name, date: BACK, status: 'present', note: '08:30-16:30', workExperience: '[E2E] บันทึกย้อนหลัง', supervisorSignature: F.PNG_1PX, supervisorName: company.mentorName } });
    assert.equal(r.status, 201, `HTTP ${r.status} ${F.msg(r)}`);
    const row = (await list()).find((x) => x.date === BACK);
    F.note(t, `วันที่ ${BACK}, isBackfill = ${row && row.isBackfill}, submittedAt = ${row && row.submittedAt}`);
    assert.ok(row);
    assert.equal(Number(row.isBackfill), 1, 'รายงานย้อนหลังต้องมี isBackfill = 1');
    assert.match(row.submittedAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'submittedAt ต้องเป็นเวลาจริงที่กดส่ง');
    const sentAt = new Date(row.submittedAt.replace(' ', 'T') + '+07:00').getTime();
    assert.ok(Math.abs(Date.now() - sentAt) < 5 * 60 * 1000, 'submittedAt ต้องใกล้เคียงเวลาปัจจุบัน (คลาดเคลื่อนไม่เกิน 5 นาที)');
    F.saveState({ backfillDate: BACK });
  });

  it('กฎกันข้อมูลผิด: ซ้ำวันเดิม (409), ล่วงหน้า (400), ก่อนวันเริ่มฝึก (400)', async (t) => {
    const { startDate } = F.requireState('startDate');
    const dup = await F.api('POST', '/checkins', { token: studentToken, body: { studentId: student.studentId, date: TODAY, status: 'present' } });
    const future = await F.api('POST', '/checkins', { token: studentToken, body: { studentId: student.studentId, date: F.addDays(TODAY, 1), status: 'present' } });
    const early = await F.api('POST', '/checkins', { token: studentToken, body: { studentId: student.studentId, date: F.addDays(startDate, -3), status: 'present', supervisorSignature: F.PNG_1PX } });
    F.note(t, `ซ้ำ HTTP ${dup.status}, ล่วงหน้า HTTP ${future.status}, ก่อนวันเริ่ม HTTP ${early.status}`);
    assert.equal(dup.status, 409);
    assert.equal(future.status, 400);
    assert.equal(early.status, 400);
  });

  it('สถิติ 4 ช่อง: ตรงเวลา +1, ลงย้อนหลัง +1, ลา = 0 และขาดนับจากวันทำการที่ไม่มีรายงาน', async (t) => {
    const { statsBefore, startDate } = F.requireState('statsBefore', 'startDate');
    const rows = await list();
    const after = stats(rows);
    // ช่อง "ขาด": วันทำการตั้งแต่วันเริ่มถึงเมื่อวาน ที่ไม่มีรายงาน (ไม่รวมวันหยุดที่เปิดใช้งาน)
    const holidays = new Set();
    for (const y of new Set([Number(startDate.slice(0, 4)), Number(TODAY.slice(0, 4))])) {
      const h = await F.api('GET', '/holidays', { query: { year: String(y) } });
      (h.data || []).forEach((x) => { if (x.date && (x.isActive === undefined || Number(x.isActive))) holidays.add(String(x.date).slice(0, 10)); });
    }
    const recorded = new Set(rows.map((x) => x.date));
    let missing = 0;
    let missingExpected = 0;
    for (let d = startDate; d < TODAY; d = F.addDays(d, 1)) {
      if (F.isWeekend(d) || holidays.has(d)) continue;
      missingExpected += 1;
      if (!recorded.has(d)) missing += 1;
    }
    F.note(t, `ตรงเวลา ${statsBefore.onTime}->${after.onTime}, ย้อนหลัง ${statsBefore.backfill}->${after.backfill}, ลา ${after.leave}, ขาด ${missing} จาก ${missingExpected} วันทำการที่ผ่านมา`);
    assert.equal(after.onTime, statsBefore.onTime + 1);
    assert.equal(after.backfill, statsBefore.backfill + 1);
    assert.equal(after.leave, 0);
    assert.equal(missing, missingExpected - (recorded.has(BACK) ? 1 : 0), 'จำนวนวันขาดต้องเท่ากับวันทำการที่ผ่านมาลบวันที่มีรายงาน');
  });
});

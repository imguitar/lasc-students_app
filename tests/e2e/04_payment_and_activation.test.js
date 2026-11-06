'use strict';
// ขั้นที่ 4: ชำระเงินและแอดมินเริ่มฝึกงาน
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const F = require('./fixtures');

const { student, admin } = F.FIXTURES;

describe('04 payment and activation', () => {
  const studentToken = F.mint({ id: student.id, username: student.studentId, role: 'student' });
  const adminToken = F.mint({ id: admin.id, username: admin.username, role: 'admin' });

  it('นักศึกษาอัปโหลดสลิป สถานะเริ่มต้นเป็น pending', async (t) => {
    const r = await F.api('POST', '/payments', {
      token: studentToken,
      body: { studentId: student.studentId, studentName: student.name, date: F.today(), department: student.department, slipDataUrl: F.PNG_1PX, slipFileName: 'e2e-slip.png' },
    });
    F.note(t, `HTTP ${r.status}, payment #${r.data && r.data.id}, status = ${r.data && r.data.status}`);
    assert.equal(r.status, 201, `HTTP ${r.status} ${F.msg(r)}`);
    assert.equal(r.data.status, 'pending');
    F.saveState({ paymentId: r.data.id });
  });

  it('[ความปลอดภัย] นักศึกษาอนุมัติสลิปของตัวเองไม่ได้ (403)', async (t) => {
    const { paymentId } = F.requireState('paymentId');
    const r = await F.api('PATCH', `/payments/${paymentId}/approve`, { token: studentToken });
    F.note(t, `HTTP ${r.status}, status สลิปหลังเรียก = ${r.data && r.data.status}`);
    assert.equal(r.status, 403, 'นักศึกษาอนุมัติสลิปตัวเองได้ แสดงว่า /payments/:id/approve ไม่ตรวจบทบาท');
  });

  it('แอดมินอนุมัติสลิป สถานะเป็น approved', async (t) => {
    const { paymentId } = F.requireState('paymentId');
    const r = await F.api('PATCH', `/payments/${paymentId}/approve`, { token: adminToken });
    F.note(t, `HTTP ${r.status}, status = ${r.data && r.data.status}`);
    assert.equal(r.status, 200);
    assert.equal(r.data.status, 'approved');
  });

  it('ก่อนเริ่มฝึก ฟังก์ชันรายงานประจำวันยังถูกล็อก (400)', async (t) => {
    const r = await F.api('POST', '/checkins', { token: studentToken, body: { studentId: student.studentId, studentName: student.name, date: F.today(), status: 'present', workExperience: 'ก่อนเริ่มฝึก' } });
    F.note(t, `HTTP ${r.status} ${F.msg(r)}`);
    assert.equal(r.status, 400);
  });

  it('แอดมินกดเริ่มฝึกงาน สถานะเป็นออกฝึกงาน (กำลังฝึกงาน) พร้อมวันเริ่ม-สิ้นสุด', async (t) => {
    const { requestId, startDate, expectedEndDate } = F.requireState('requestId', 'startDate', 'expectedEndDate');
    const mark = F.mailMark();
    const r = await F.api('PATCH', `/requests/${requestId}/status`, {
      token: adminToken,
      body: { status: 'ออกฝึกงาน', admin_comment: '[E2E] เริ่มฝึกงาน', dispatchLetter: { fileName: 'e2e-dispatch.pdf', mimeType: 'application/pdf', dataUrl: F.PDF_MIN, uploadedAt: new Date().toISOString() }, startDate, endDate: expectedEndDate },
    });
    const row = r.data || {};
    F.note(t, `HTTP ${r.status}, status = ${row.status}, เริ่ม = ${String(row.internship_start_date).slice(0, 10)}, สิ้นสุด = ${String(row.internship_end_date).slice(0, 10)}`);
    assert.equal(r.status, 200, `HTTP ${r.status} ${F.msg(r)}`);
    assert.equal(row.status, 'ออกฝึกงาน');
    F.saveState({ startMailMark: mark });
  });

  it('หลังเริ่มฝึก สถานะที่นักศึกษาเห็นเป็นออกฝึกงาน', async (t) => {
    const { requestId } = F.requireState('requestId');
    const r = await F.api('GET', `/requests/${requestId}`, { token: studentToken });
    F.note(t, `HTTP ${r.status}, status = ${r.data && r.data.status}`);
    assert.equal(r.status, 200);
    assert.equal(r.data.status, 'ออกฝึกงาน');
  });

  it('Email: นักศึกษา (stu6610014111@sskru.ac.th) ได้รับแจ้งเริ่มฝึกงาน', async (t) => {
    const { startMailMark } = F.requireState('startMailMark');
    const mails = await F.mailsSince(startMailMark, 2500);
    const res = F.verifyEmails('แอดมินกดเริ่มฝึกงาน', mails, [{ to: student.email, note: 'แจ้งสถานะ ออกฝึกงาน' }]);
    F.note(t, `${mails.length} ฉบับ, ถึงนักศึกษา = ${res[0].found}, subject = ${res[0].mail ? res[0].mail.subject : '-'}`);
    assert.ok(res[0].found, `ไม่พบอีเมลถึง ${student.email}`);
  });
});

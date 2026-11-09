'use strict';
// ขั้นที่ 3: สถานประกอบการตอบรับ และอาจารย์อนุมัติ
// ลำดับจริงของระบบ: อาจารย์อนุมัติ -> แอดมินอนุมัติพร้อมหนังสือ -> สถานประกอบการตอบรับผ่านลิงก์ใช้ครั้งเดียว
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const F = require('./fixtures');

const { student, company, advisor, admin } = F.FIXTURES;
const COMPANY_ACCEPTED = 'สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)';

describe('03 approvals mentor advisor', () => {
  let advisorToken;
  let adminToken;

  it('ล็อกอินอาจารย์ AD034 ด้วย Password123', async (t) => {
    const real = await F.login(advisor.username, [advisor.password]);
    F.note(t, real ? `role = ${real.user.role}, user id = ${real.user.id}` : 'ล็อกอินไม่สำเร็จ');
    assert.ok(real, 'ล็อกอิน AD034 ด้วย Password123 ไม่สำเร็จ');
    assert.equal(real.user.role, 'advisor');
    advisorToken = real.token;
    adminToken = F.mint({ id: admin.id, username: admin.username, role: 'admin' });
    const name = [real.user.firstname, real.user.lastname].filter(Boolean).join(' ') || real.user.name || advisor.username;
    F.saveState({ advisorUserId: real.user.id, advisorName: name });
  });

  it('อาจารย์เห็นคำร้องของ 6610014111 ในรายการ', async (t) => {
    const { requestId } = F.requireState('requestId');
    const r = await F.api('GET', '/requests', { token: advisorToken });
    const rows = r.data || [];
    const seen = rows.find((x) => Number(x.id) === Number(requestId));
    F.note(t, `HTTP ${r.status}, ${rows.length} รายการ, พบคำร้อง #${requestId} = ${Boolean(seen)}`);
    assert.ok(seen, 'คำร้องไม่ปรากฏในรายการของอาจารย์');
  });

  it('อาจารย์อนุมัติคำร้อง (payload เดียวกับปุ่มบนแดชบอร์ดอาจารย์) สถานะเป็นรอผู้ดูแลระบบอนุมัติ', async (t) => {
    const { requestId } = F.requireState('requestId');
    const mark = F.mailMark();
    const r = await F.api('PATCH', `/requests/${requestId}/status`, { token: advisorToken, body: { status: 'รอผู้ดูแลระบบอนุมัติ', advisor_comment: '[E2E] อนุมัติโดยอาจารย์ที่ปรึกษา' } });
    F.note(t, `HTTP ${r.status}, status = ${r.data && r.data.status}`);
    assert.equal(r.status, 200, `HTTP ${r.status} ${F.msg(r)}`);
    assert.equal(r.data.status, 'รอผู้ดูแลระบบอนุมัติ');
    F.saveState({ advisorApproveMark: mark });
  });

  it('Email: นักศึกษา (stu6610014111@sskru.ac.th) ได้รับแจ้งผลการอนุมัติของอาจารย์', async (t) => {
    const { advisorApproveMark } = F.requireState('advisorApproveMark');
    const mails = await F.mailsSince(advisorApproveMark, 2500);
    const res = F.verifyEmails('อาจารย์อนุมัติคำร้อง: แจ้งนักศึกษา', mails, [{ to: student.email, note: 'ระบบแจ้งนักศึกษาเฉพาะบางสถานะ ซึ่งไม่รวม รอผู้ดูแลระบบอนุมัติ' }]);
    F.note(t, `${mails.length} ฉบับในเหตุการณ์นี้, ถึงนักศึกษา = ${res[0].found}`);
    assert.ok(res[0].found, `ไม่พบอีเมลถึง ${student.email} หลังอาจารย์อนุมัติ`);
  });

  it('Email: แอดมิน (apichatkrompan471@gmail.com) ได้รับแจ้งว่าอาจารย์อนุมัติแล้ว', async (t) => {
    const { advisorApproveMark } = F.requireState('advisorApproveMark');
    const mails = F.readMails().slice(advisorApproveMark);
    const res = F.verifyEmails('อาจารย์อนุมัติคำร้อง: แจ้งแอดมิน', mails, [{ to: admin.email, note: 'backend แจ้งแอดมินเฉพาะสถานะ รอผู้ดูแลระบบตรวจสอบ แต่ปุ่มอาจารย์ส่ง รอผู้ดูแลระบบอนุมัติ' }]);
    F.note(t, `ถึงแอดมิน = ${res[0].found}`);
    assert.ok(res[0].found, `ไม่พบอีเมลถึงแอดมิน ${admin.email} หลังอาจารย์อนุมัติ`);
  });

  let respToken;
  it('แอดมินอนุมัติพร้อมหนังสือขอความอนุเคราะห์ และออกลิงก์ตอบรับสำหรับสถานประกอบการ', async (t) => {
    const { requestId } = F.requireState('requestId');
    const a = await F.api('PATCH', `/requests/${requestId}/status`, {
      token: adminToken,
      body: { status: 'รอสถานประกอบการตอบรับ', admin_comment: '[E2E] แอดมินอนุมัติ', dispatchLetter: { fileName: 'e2e-letter.pdf', mimeType: 'application/pdf', dataUrl: F.PDF_MIN, uploadedAt: new Date().toISOString() } },
    });
    assert.equal(a.status, 200, `HTTP ${a.status} ${F.msg(a)}`);
    const q = await F.api('POST', `/requests/${requestId}/response-qr`, { token: adminToken });
    respToken = q.data && q.data.token;
    F.note(t, `อนุมัติ HTTP ${a.status}, ออกลิงก์ HTTP ${q.status}, token ${respToken ? respToken.length + ' ตัวอักษร' : '-'}`);
    assert.equal(q.status, 200);
    assert.ok(respToken, 'ไม่ได้รับโทเค็นตอบรับ');
  });

  it('สถานประกอบการเปิดลิงก์ได้ แต่ตอบรับโดยไม่ลงนามหรือแนบเอกสารไม่ได้ (400)', async (t) => {
    const { requestId } = F.requireState('requestId');
    const g = await F.api('GET', `/public/requests/${requestId}`, { query: { responseToken: respToken } });
    const n = await F.api('PATCH', `/public/requests/${requestId}/status`, { query: { responseToken: respToken }, body: { status: COMPANY_ACCEPTED, statusCode: 'COMPANY_ACCEPTED' } });
    F.note(t, `เปิดลิงก์ HTTP ${g.status}, ตอบรับโดยไม่ลงนาม HTTP ${n.status}`);
    assert.equal(g.status, 200);
    assert.equal(n.status, 400);
  });

  it('สถานประกอบการตอบรับพร้อมลายมือชื่อสำเร็จ และใช้ลิงก์ซ้ำไม่ได้ (403)', async (t) => {
    const { requestId } = F.requireState('requestId');
    const mark = F.mailMark();
    const body = {
      status: COMPANY_ACCEPTED, statusCode: 'COMPANY_ACCEPTED',
      company_email: company.mentorEmail, companyEmail: company.mentorEmail,
      company_comment: '[E2E] พร้อมรับนักศึกษา', studentPreparation: 'เตรียมโน้ตบุ๊ก',
      signature: F.PNG_1PX, signerName: company.mentorName, signerPosition: company.mentorPosition,
      evaluatorEmail: company.mentorEmail, evaluatorName: company.mentorName, evaluatorPosition: company.mentorPosition,
      companyResponse: { accepted: true, status: 'COMPANY_ACCEPTED', company_email: company.mentorEmail, companyEmail: company.mentorEmail, studentPreparation: 'เตรียมโน้ตบุ๊ก', signature: F.PNG_1PX, signerName: company.mentorName, signerPosition: company.mentorPosition, evaluatorEmail: company.mentorEmail, respondedAt: new Date().toISOString() },
    };
    const ok = await F.api('PATCH', `/public/requests/${requestId}/status`, { query: { responseToken: respToken }, body });
    const again = await F.api('PATCH', `/public/requests/${requestId}/status`, { query: { responseToken: respToken }, body: { status: 'สถานประกอบการปฏิเสธ', company_comment: 'ใช้ซ้ำ' } });
    F.note(t, `ตอบรับ HTTP ${ok.status} status = ${ok.data && ok.data.status}, ใช้ลิงก์ซ้ำ HTTP ${again.status}`);
    assert.equal(ok.status, 200, `HTTP ${ok.status} ${F.msg(ok)}`);
    assert.equal(ok.data.status, COMPANY_ACCEPTED);
    assert.equal(again.status, 403, 'ลิงก์ตอบรับต้องใช้ได้ครั้งเดียว');
    F.saveState({ companyAcceptMark: mark });
  });

  it('Email: แอดมินได้รับแจ้งผลการตอบรับของสถานประกอบการ', async (t) => {
    const { companyAcceptMark } = F.requireState('companyAcceptMark');
    const mails = await F.mailsSince(companyAcceptMark, 2500);
    const res = F.verifyEmails('สถานประกอบการตอบรับ', mails, [{ to: admin.email, note: 'ผู้รับมาจาก ADMIN_EMAIL และบัญชี role = admin' }]);
    F.note(t, `ถึงแอดมิน = ${res[0].found}, subject = ${res[0].mail ? res[0].mail.subject : '-'}`);
    assert.ok(res[0].found, `ไม่พบอีเมลถึงแอดมิน ${admin.email}`);
  });
});

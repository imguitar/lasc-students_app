'use strict';
// ขั้นที่ 2: นักศึกษายื่นคำร้องฝึกงานทั่วไป
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const F = require('./fixtures');

const { student, company, advisor } = F.FIXTURES;

describe('02 student apply request', () => {
  let token;

  it('ล็อกอินนักศึกษา 6610014111 (ลองรหัสเริ่มต้น ถ้าไม่ได้จึงใช้โทเค็นที่เซิร์ฟเวอร์ออกให้)', async (t) => {
    const real = await F.login(student.studentId, [student.studentId, 'password123', 'Password123']);
    if (real) {
      token = real.token;
      F.note(t, `ล็อกอินจริงสำเร็จ role = ${real.user && real.user.role}`);
      assert.equal(real.user.role, 'student');
    } else {
      token = F.mint({ id: student.id, username: student.studentId, role: 'student' });
      F.note(t, 'ล็อกอินด้วยรหัสผ่านไม่สำเร็จ (ไม่ทราบรหัสผ่านจริง) ใช้โทเค็นที่ออกด้วย JWT secret แทน');
    }
    assert.ok(token);
  });

  it('ยื่นคำร้อง "การฝึกงานทั่วไป" ได้ และสถานะเริ่มต้นเป็นรออาจารย์อนุมัติ (pending) แม้ client ส่งสถานะอื่นมา', async (t) => {
    const { startDate } = F.requireState('startDate');
    const mark = F.mailMark();
    const payload = {
      studentId: student.studentId,
      studentName: student.name,
      department: student.department,
      company: company.name,
      position: 'นักศึกษาฝึกงานพัฒนาซอฟต์แวร์',
      submittedDate: `${F.today()} 09:00:00`,
      status: 'อนุมัติแล้ว',
      details: {
        student_info: {
          title: 'นาย', name: student.name, email: student.email, studentId: student.studentId, year: '4',
          lastSemesterGrade: '3.50', major: student.department,
          address: { house: '99', moo: '1', soi: '', road: 'ถนนทดสอบ', tambon: 'โพธิ์', amphur: 'เมืองศรีสะเกษ', province: 'ศรีสะเกษ', postal: '33000' },
          phone: '0940000000',
        },
        companyAddress: { house: '1', moo: '', soi: '', road: 'ถนนเทคโนโลยี', tambon: 'โพธิ์', amphur: 'เมืองศรีสะเกษ', province: 'ศรีสะเกษ', postal: '33000', detail: '' },
        contactPerson: company.mentorName,
        contactPosition: company.mentorPosition,
        contactEmail: company.mentorEmail,
        contactPhone: '0450000000',
        internshipTerm: 'term2',
        internshipType: 'internship',
        description: 'พัฒนาเว็บแอปพลิเคชันภายในองค์กร',
        skills: 'React, Node.js',
        advisorUsername: advisor.username,
        studentPhoto: null,
      },
    };
    const r = await F.api('POST', '/requests', { token, body: payload });
    const row = r.data;
    F.note(t, `HTTP ${r.status}, คำร้อง #${row && row.id}, status = ${row && row.status}, company_email = ${row && row.company_email}, วันเริ่มรอบ ${startDate}`);
    assert.equal(r.status, 201, `HTTP ${r.status} ${F.msg(r)}`);
    assert.equal(row.status, 'รออาจารย์ที่ปรึกษาอนุมัติ', 'สถานะเริ่มต้นต้องถูกกำหนดโดยเซิร์ฟเวอร์ ไม่ใช่ค่าที่ client ส่ง');
    assert.equal(row.company_email, company.mentorEmail);
    F.saveState({ requestId: row.id, submitMailMark: mark });
  });

  it('ข้อมูลถูกบันทึกในฐานข้อมูล: แอดมินอ่านคำร้องกลับมาได้ครบ', async (t) => {
    const { requestId } = F.requireState('requestId');
    const adminToken = F.mint({ id: F.FIXTURES.admin.id, username: F.FIXTURES.admin.username, role: 'admin' });
    const r = await F.api('GET', `/requests/${requestId}`, { token: adminToken });
    const row = r.data || {};
    const details = typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {});
    F.note(t, `HTTP ${r.status}, studentId = ${row.studentId}, company = ${row.company}, internshipType = ${details.internshipType}, ผู้ติดต่อ = ${details.contactEmail}`);
    assert.equal(r.status, 200);
    assert.equal(row.studentId, student.studentId);
    assert.equal(row.company, company.name);
    assert.equal(details.internshipType, 'internship');
    assert.equal(details.contactEmail, company.mentorEmail);
  });

  it('[ความปลอดภัย] นักศึกษาเปลี่ยนสถานะคำร้องตัวเองไม่ได้ (403)', async (t) => {
    const { requestId } = F.requireState('requestId');
    // ส่งค่าสถานะเดิมเพื่อไม่ให้กระทบ flow ถ้าช่องโหว่มีอยู่
    const r = await F.api('PATCH', `/requests/${requestId}/status`, { token, body: { status: 'รออาจารย์ที่ปรึกษาอนุมัติ' } });
    F.note(t, `HTTP ${r.status} ${F.msg(r)}`);
    assert.equal(r.status, 403, 'นักศึกษาเรียก PATCH /requests/:id/status ได้สำเร็จ แสดงว่าไม่มีการตรวจบทบาท');
  });

  it('Email: นักศึกษาได้รับอีเมลยืนยันการยื่นคำร้อง', async (t) => {
    const { submitMailMark } = F.requireState('submitMailMark');
    const mails = await F.mailsSince(submitMailMark, 2500);
    F.saveState({ submitMails: mails.map((m) => m.messageId) });
    const res = F.verifyEmails('ยื่นคำร้องสำเร็จ', mails, [{ to: student.email, note: 'ยืนยันการยื่นคำร้องถึงนักศึกษา' }]);
    F.note(t, `${mails.length} ฉบับในเหตุการณ์นี้, ถึงนักศึกษา = ${res[0].found}, subject = ${res[0].mail ? res[0].mail.subject : '-'}`);
    assert.ok(res[0].found, `ไม่พบอีเมลถึง ${student.email}`);
  });

  it('Email: อาจารย์ที่ปรึกษา AD034 (apichatkrompan75@gmail.com) ได้รับแจ้งคำร้องใหม่', async (t) => {
    const { submitMailMark } = F.requireState('submitMailMark');
    const mails = F.readMails().slice(submitMailMark);
    const res = F.verifyEmails('ยื่นคำร้องสำเร็จ: แจ้งอาจารย์', mails, [{ to: advisor.email, note: 'ระบบส่งตามอีเมลในตาราง user ของ AD034' }]);
    F.note(t, `ถึง ${advisor.email} = ${res[0].found}, อาจารย์ที่ได้รับแจ้งทั้งหมด = ${mails.filter((m) => /@lasc\.ac\.th/.test(m.to || '') && /รออนุมัติ/.test(m.subject || '')).map((m) => m.to).join(', ') || '-'}`);
    assert.ok(res[0].found, `ไม่พบอีเมลถึงอาจารย์ที่ ${advisor.email}`);
  });

  it('Email: พี่เลี้ยงสถานประกอบการ (apichatkrompan02668@gmail.com) ได้รับแจ้งเมื่อมีคำร้อง', async (t) => {
    const { submitMailMark } = F.requireState('submitMailMark');
    const mails = F.readMails().slice(submitMailMark);
    const res = F.verifyEmails('ยื่นคำร้องสำเร็จ: แจ้งสถานประกอบการ', mails, [{ to: company.mentorEmail, note: 'สเปกกำหนดให้แจ้งพี่เลี้ยง แต่ระบบส่งลิงก์ตอบรับผ่านแอดมินเท่านั้น' }]);
    F.note(t, `ถึงพี่เลี้ยง = ${res[0].found}`);
    assert.ok(res[0].found, `ไม่พบอีเมลถึงพี่เลี้ยง ${company.mentorEmail} ระบบไม่มีจุดส่งอีเมลหาสถานประกอบการตอนยื่นคำร้อง`);
  });
});

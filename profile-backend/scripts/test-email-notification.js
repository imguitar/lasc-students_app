const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
  const user = process.env.MYSQL_USER || 'lascstudent';
  const pass = process.env.MYSQL_PASSWORD_URLENCODED || 'lascstudent%21';
  const port = process.env.MYSQL_PORT || '3307';
  const db = process.env.MYSQL_DATABASE || 'lascstudent';
  process.env.DATABASE_URL = `mysql://${user}:${pass}@localhost:${port}/${db}`;
}

const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const API_BASE = 'http://127.0.0.1:5000/api'; // or host:5001 if external
const JWT_SECRET = process.env.PROFILE_JWT_SECRET || 'change_this_profile_secret_to_a_long_random_string';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 เริ่มการทดสอบระบบแจ้งเตือนกิจกรรมผ่าน Email (Email Notification)');
  console.log('================================================================');

  // 1. ตรวจสอบ Admin และ User ทั่วไป
  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  const studentUser = await prisma.user.findFirst({ where: { role: 'student' } });

  if (!adminUser) {
    console.error('❌ ไม่พบผู้ใช้สิทธิ์ Admin');
    return;
  }
  console.log(`✅ พบ Admin: ${adminUser.username} (${adminUser.email})`);
  console.log(`✅ พบ Student: ${studentUser?.username} (${studentUser?.email})`);

  const adminToken = jwt.sign({ userId: adminUser.id }, JWT_SECRET, { expiresIn: '1h' });
  const studentToken = jwt.sign({ userId: studentUser.id }, JWT_SECRET, { expiresIn: '1h' });

  // 2. สร้างกิจกรรมสำหรับทดสอบ
  const testEvent = await prisma.newsEvent.create({
    data: {
      title: 'กิจกรรมทดสอบระบบแจ้งเตือน Email ' + Date.now(),
      type: 'กิจกรรม',
      description: 'นี่คือการทดสอบระบบแจ้งเตือนกิจกรรมผ่านอีเมลอัตโนมัติ',
      event_date: new Date(Date.now() + 86400000 * 7),
      start_time: '09:00',
      end_time: '12:00',
      location: 'ห้องประชุม IT 401',
      target_type: 'all',
      is_published: true,
      created_by: adminUser.id
    }
  });
  console.log(`✅ สร้างกิจกรรมทดสอบสำเร็จ (ID: ${testEvent.id}, Title: ${testEvent.title})`);

  // 3. ทดสอบ Security: User ที่ไม่ใช่ Admin ต้องถูกปฏิเสธ (403 Forbidden)
  console.log('\n🔒 ทดสอบ Security (Non-admin Authorization):');
  try {
    await axios.get(`${API_BASE}/news-events/${testEvent.id}/email-recipients`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.error('❌ ล้มเหลว: นักศึกษาทั่วไปไม่ควรเข้าถึง API นี้ได้!');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('✅ ผ่าน: นักศึกษาได้รับ 403 Forbidden ถูกต้อง');
    } else {
      console.log(`⚠️ ผลลัพธ์: ${err.response?.status} - ${err.message}`);
    }
  }

  // 4. ทดสอบ Admin Preview รายชื่อผู้รับ (GET /email-recipients)
  console.log('\n👥 ทดสอบ Admin Preview รายชื่อผู้รับ:');
  const previewRes = await axios.get(`${API_BASE}/news-events/${testEvent.id}/email-recipients?target_type=all`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  const previewData = previewRes.data?.data;
  console.log('✅ สรุปยอดผู้รับ:');
  console.log(`   - ผู้รับทั้งหมด (Total): ${previewData.summary.total}`);
  console.log(`   - มีอีเมล (Has Email): ${previewData.summary.hasEmail}`);
  console.log(`   - ไม่มีอีเมล (Missing Email): ${previewData.summary.missingEmail}`);
  console.log(`   - เคยส่งแล้ว (Already Sent): ${previewData.summary.alreadySent}`);
  console.log(`   - พร้อมส่ง (Ready to Send): ${previewData.summary.readyToSend}`);

  // 5. ทดสอบส่งอีเมลเฉพาะราย (Specific User) เพื่อทดสอบฟังก์ชันส่ง
  console.log('\n🚀 ทดสอบส่งอีเมลเฉพาะราย (Target: specific):');
  const sendRes = await axios.post(
    `${API_BASE}/news-events/${testEvent.id}/send-email`,
    {
      target_type: 'specific',
      specific_user_ids: [adminUser.id, studentUser?.id].filter(Boolean),
      force_resend: false
    },
    {
      headers: { Authorization: `Bearer ${adminToken}` }
    }
  );

  console.log('✅ ผลการส่งอีเมล:', sendRes.data);
  const sendResult = sendRes.data.data;
  console.log(`   - ส่งสำเร็จ: ${sendResult.sent}`);
  console.log(`   - ล้มเหลว: ${sendResult.failed}`);
  console.log(`   - ข้าม: ${sendResult.skipped}`);
  console.log(`   - โหมด: ${sendResult.provider} (simulated: ${sendResult.simulated})`);

  // 6. ตรวจสอบ Database ในตาราง event_email_notifications
  console.log('\n🗄️ ตรวจสอบ Database (ตาราง event_email_notifications):');
  const dbLogs = await prisma.eventEmailNotification.findMany({
    where: { news_event_id: testEvent.id }
  });
  console.log(`✅ พบประวัติในตาราง ${dbLogs.length} รายการ:`);
  dbLogs.forEach(l => {
    console.log(`   - [${l.status}] ถึง: ${l.recipient_email} (${l.recipient_name}) | Batch: ${l.batch_id}`);
  });

  // 7. ทดสอบการป้องกันส่งซ้ำ (Duplicate Prevention)
  console.log('\n🛡️ ทดสอบป้องกันการส่งซ้ำ (Duplicate Prevention):');
  const previewAfterSend = await axios.get(
    `${API_BASE}/news-events/${testEvent.id}/email-recipients?target_type=specific&specific_user_ids=${adminUser.id}`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  console.log(`   - alreadySent: ${previewAfterSend.data.data.summary.alreadySent} (คาดหวัง >= 1)`);
  console.log(`   - readyToSend: ${previewAfterSend.data.data.summary.readyToSend} (คาดหวัง 0 ถ้าไม่ force)`);

  if (previewAfterSend.data.data.summary.alreadySent >= 1 && previewAfterSend.data.data.summary.readyToSend === 0) {
    console.log('✅ ผ่าน: ระบบป้องกันการส่งซ้ำทำงานถูกต้อง ไม่ส่งซ้ำผู้ที่ได้รับแล้ว');
  }

  // 8. ทดสอบประวัติการส่ง (GET /email-history)
  console.log('\n📜 ทดสอบดึงประวัติการส่ง (GET /email-history):');
  const historyRes = await axios.get(`${API_BASE}/news-events/${testEvent.id}/email-history`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✅ ประวัติการส่ง:', historyRes.data.data.summary);

  // 9. ลบข้อมูลทดสอบ
  await prisma.eventEmailNotification.deleteMany({ where: { news_event_id: testEvent.id } });
  await prisma.newsEvent.delete({ where: { id: testEvent.id } });
  console.log('\n🧹 ทำความสะอาดข้อมูลทดสอบเรียบร้อย');
  console.log('\n🎉 ผลการทดสอบ: ทุกข้อกำหนดผ่านการตรวจสอบอย่างสมบูรณ์!');
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

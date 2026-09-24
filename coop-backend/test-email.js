/**
 * ทดสอบส่งอีเมลผ่าน Gmail OAuth2 แบบ standalone
 * ใช้: node test-email.js [อีเมลปลายทาง]
 * ตัวอย่าง: node test-email.js someone@example.com
 *   หรือตั้ง TEST_EMAIL=someone@example.com ใน .env
 */
require('dotenv').config();

const to = process.argv[2] || process.env.TEST_EMAIL || 'test@example.com';

console.log('=== ตรวจสอบ .env ===');
console.log('GMAIL_USER:', process.env.GMAIL_USER || '(ไม่ได้ตั้งค่า)');
console.log('GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? `ตั้งค่าแล้ว (${process.env.GMAIL_CLIENT_ID.length} ตัว)` : '(ไม่ได้ตั้งค่า)');
console.log('GMAIL_CLIENT_SECRET:', process.env.GMAIL_CLIENT_SECRET ? 'ตั้งค่าแล้ว' : '(ไม่ได้ตั้งค่า)');
console.log('GMAIL_REFRESH_TOKEN:', process.env.GMAIL_REFRESH_TOKEN ? `ตั้งค่าแล้ว (${process.env.GMAIL_REFRESH_TOKEN.length} ตัว)` : '(ไม่ได้ตั้งค่า)');
console.log('COOP_PUBLIC_URL:', process.env.COOP_PUBLIC_URL || '(ไม่ได้ตั้งค่า)');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || '(ไม่ได้ตั้งค่า)');
console.log('');

const { sendCompanyEvaluationEmail, buildEvaluationUrl } = require('./src/utils/emailService');

sendCompanyEvaluationEmail({
  to,
  studentName: 'อภิชาติ กรมพันธ์ (ทดสอบ)',
  studentId: '6610014111',
  companyName: 'บริษัททดสอบ จำกัด',
  advisorName: 'ศุภชัย ทองสุข',
  evaluationUrl: buildEvaluationUrl(18),
}).then((result) => {
  console.log('');
  console.log('=== ผลลัพธ์ ===');
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}).catch((err) => {
  console.error('=== Fatal ===');
  console.error(err);
  process.exit(1);
});

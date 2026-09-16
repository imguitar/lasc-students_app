let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_) {
  // ไม่ควรเกิดเพราะประกาศไว้ใน package.json แล้ว — กันไว้เผื่อ install ไม่สมบูรณ์
}

const isSmtpConfigured = () =>
  Boolean(nodemailer && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

// สร้างลิงก์แบบประเมินจาก COOP_PUBLIC_URL ซึ่งรวม base path /coop ไว้แล้ว
const buildEvaluationUrl = (requestId) => {
  const base = (process.env.COOP_PUBLIC_URL || 'http://localhost:5173/coop').replace(/\/+$/, '');
  return `${base}/public/evaluate/${requestId}`;
};

const buildHtml = ({ studentName, companyName, evalUrl }) => `
  <div style="font-family: 'Kanit', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #1e3a8a; margin: 0;">มหาวิทยาลัยราชภัฏศรีสะเกษ</h2>
      <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">ระบบบริหารจัดการการฝึกประสบการณ์วิชาชีพ</p>
    </div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
    <p style="font-size: 15px; color: #334155; line-height: 1.6;">
      เรียน <strong>ผู้ดูแลการฝึกงาน / ผู้ประเมินสถานประกอบการ (${companyName || 'สถานประกอบการ'})</strong>,
    </p>
    <p style="font-size: 15px; color: #334155; line-height: 1.6;">
      เนื่องด้วยอาจารย์ที่ปรึกษาได้ดำเนินการประเมินผลการนิเทศของนักศึกษา <strong>${studentName || 'นักศึกษาฝึกงาน'}</strong> เรียบร้อยแล้ว
      ทางคณะฯ จึงขอความอนุเคราะห์จากท่านในการประเมินผลการปฏิบัติงานของนักศึกษา เพื่อนำผลการประเมินไปใช้ประกอบการสำเร็จการศึกษาต่อไป
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${evalUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block;">
        คลิกเพื่อทำแบบประเมินผลการฝึกงาน
      </a>
    </div>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      หรือคัดลอกลิงก์นี้เปิดในเบราว์เซอร์:<br />
      <a href="${evalUrl}" style="color: #2563eb; word-break: break-all;">${evalUrl}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0 15px 0;" />
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
      อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้
    </p>
  </div>
`;

/**
 * ส่งลิงก์แบบประเมินให้ผู้ประเมินฝั่งสถานประกอบการ
 *
 * คืนค่า { success, simulated, ... }
 *  - simulated = true หมายถึง "ยังไม่ได้ส่งอีเมลจริง" (ไม่ได้ตั้งค่า SMTP หรือ SMTP ล้มเหลว)
 *    ผู้เรียกต้องตรวจ flag นี้ก่อนแจ้งผู้ใช้ว่าส่งอีเมลแล้ว
 */
const sendEvaluationEmail = async ({ to, studentName, companyName, evalUrl }) => {
  if (!to || !String(to).trim()) {
    console.warn('[EmailService] ไม่มีอีเมลผู้รับ จึงไม่ส่งแบบประเมิน');
    return { success: false, simulated: false, reason: 'missing_recipient' };
  }

  const subject = `[SSKRU] แบบประเมินผลการฝึกงานของนักศึกษา ${studentName || ''} - สถานประกอบการ ${companyName || ''}`;
  const html = buildHtml({ studentName, companyName, evalUrl });

  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpFrom = process.env.SMTP_FROM || '"ฝ่ายฝึกงาน มรภ.ศรีสะเกษ" <noreply@sskru.ac.th>';

  if (isSmtpConfigured()) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      const info = await transporter.sendMail({ from: smtpFrom, to, subject, html });
      console.log(`[EmailService] ส่งแบบประเมินถึง ${to} แล้ว (MessageId: ${info.messageId})`);
      return { success: true, simulated: false, messageId: info.messageId, to, evalUrl };
    } catch (err) {
      console.error('[EmailService] ส่งผ่าน SMTP ไม่สำเร็จ:', err.message);
      return { success: false, simulated: false, reason: 'smtp_error', error: err.message, to, evalUrl };
    }
  }

  // ยังไม่ได้ตั้งค่า SMTP — log ลิงก์ไว้ให้ใช้งานระหว่างพัฒนา แต่ต้องไม่รายงานว่าส่งแล้ว
  console.log('================================================================');
  console.log('📧 [EmailService] ยังไม่ได้ตั้งค่า SMTP — ไม่ได้ส่งอีเมลจริง');
  console.log(`ผู้รับ: ${to}`);
  console.log(`หัวข้อ: ${subject}`);
  console.log(`ลิงก์แบบประเมิน: ${evalUrl}`);
  console.log('================================================================');

  return { success: false, simulated: true, reason: 'smtp_not_configured', to, evalUrl };
};

module.exports = {
  sendEvaluationEmail,
  buildEvaluationUrl,
  isSmtpConfigured,
};

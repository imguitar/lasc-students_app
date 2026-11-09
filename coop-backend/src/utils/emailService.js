let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_) {
  // ไม่ควรเกิดเพราะประกาศไว้ใน package.json แล้ว — กันไว้เผื่อ install ไม่สมบูรณ์
}

const { sendEmail, isGmailConfigured, buildCompanyEvaluationRequestHtml, getInlineImages } = require('./mailer');

const isSmtpConfigured = () =>
  Boolean(nodemailer && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

// สร้างลิงก์แบบประเมิน — อ่านจาก env เสมอ ไม่ hardcode localhost ในโค้ดจริง
// รองรับทั้ง FRONTEND_URL=https://domain.com (ไม่มี /coop) และ COOP_PUBLIC_URL=https://domain.com/coop
const buildEvaluationUrl = (requestId) => {
  let base = (process.env.COOP_PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173/coop').replace(/\/+$/, '');
  if (!base.endsWith('/coop')) base += '/coop';
  return `${base}/public/evaluate/${requestId}`;
};

/**
 * ส่งลิงก์แบบประเมินให้ผู้ประเมินฝั่งสถานประกอบการ
 *
 * ลำดับช่องทางส่ง: Gmail OAuth2 (GMAIL_*) → SMTP (SMTP_*) → simulated log
 * คืนค่า { success, simulated, ... }
 *  - simulated = true หมายถึง "ยังไม่ได้ส่งอีเมลจริง" (ไม่ได้ตั้งค่าช่องทางใดเลย)
 *    ผู้เรียกต้องตรวจ flag นี้ก่อนแจ้งผู้ใช้ว่าส่งอีเมลแล้ว
 */
const sendCompanyEvaluationEmail = async ({ to, studentName, studentId, companyName, advisorName, startDate, endDate, evaluationUrl, evalUrl }) => {
  const url = evaluationUrl || evalUrl;
  console.log('[EmailService] sendCompanyEvaluationEmail called →', JSON.stringify({
    to, studentName, studentId, companyName, advisorName, startDate, endDate, evaluationUrl: url,
    gmailConfigured: isGmailConfigured(), smtpConfigured: isSmtpConfigured(),
  }));

  if (!to || !String(to).trim()) {
    console.warn('[EmailService] ไม่มีอีเมลผู้รับ จึงไม่ส่งแบบประเมิน');
    return { success: false, simulated: false, reason: 'missing_recipient' };
  }

  const subject = `[LASC] ขอความอนุเคราะห์ประเมินผลการฝึกงานของ ${studentName || 'นักศึกษา'}`;
  const html = buildCompanyEvaluationRequestHtml({ studentName, studentId, companyName, startDate, endDate, evalUrl: url });

  // 1) Gmail API OAuth2 — ช่องทางหลัก
  if (isGmailConfigured()) {
    const result = await sendEmail({ to, subject, htmlContent: html });
    if (result.success) {
      console.log(`[EmailService] ส่งแบบประเมินถึง ${to} แล้วผ่าน Gmail OAuth2 (MessageId: ${result.messageId})`);
      return { success: true, simulated: false, via: 'gmail', messageId: result.messageId, to, evalUrl: url };
    }
    console.warn(`[EmailService] ส่งผ่าน Gmail OAuth2 ไม่สำเร็จ (${result.error || result.reason}) — ลอง fallback SMTP`);
  }

  // 2) SMTP — fallback
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

      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html,
        attachments: getInlineImages(html).map(({ cid, filename, contentType, content }) => ({
          cid,
          filename,
          contentType,
          content,
          contentDisposition: 'inline',
        })),
      });
      console.log(`[EmailService] ส่งแบบประเมินถึง ${to} แล้วผ่าน SMTP (MessageId: ${info.messageId})`);
      return { success: true, simulated: false, via: 'smtp', messageId: info.messageId, to, evalUrl: url };
    } catch (err) {
      console.error('[EmailService] ส่งผ่าน SMTP ไม่สำเร็จ:', err.message);
      return { success: false, simulated: false, reason: 'send_error', error: err.message, to, evalUrl: url };
    }
  }

  // 3) ยังไม่ได้ตั้งค่าช่องทางส่ง — log ลิงก์ไว้ให้ใช้งานระหว่างพัฒนา แต่ต้องไม่รายงานว่าส่งแล้ว
  console.log('================================================================');
  console.log('[EmailService] ยังไม่ได้ตั้งค่า Gmail/SMTP — ไม่ได้ส่งอีเมลจริง');
  console.log(`ผู้รับ: ${to}`);
  console.log(`หัวข้อ: ${subject}`);
  console.log(`ลิงก์แบบประเมิน: ${url}`);
  console.log('================================================================');

  return { success: false, simulated: true, reason: 'mail_not_configured', to, evalUrl: url };
};

// alias เดิม — คงไว้เพื่อความเข้ากันได้กับ caller เก่า
const sendEvaluationEmail = ({ to, studentName, companyName, evalUrl }) =>
  sendCompanyEvaluationEmail({ to, studentName, companyName, evaluationUrl: evalUrl });

module.exports = {
  sendCompanyEvaluationEmail,
  sendEvaluationEmail,
  buildEvaluationUrl,
  isSmtpConfigured,
};

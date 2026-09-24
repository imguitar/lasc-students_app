let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_) {
  // ไม่ควรเกิดเพราะประกาศไว้ใน package.json แล้ว — กันไว้เผื่อ install ไม่สมบูรณ์
}

const { sendEmail, isGmailConfigured } = require('./mailer');

const isSmtpConfigured = () =>
  Boolean(nodemailer && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

// สร้างลิงก์แบบประเมิน — อ่านจาก env เสมอ ไม่ hardcode localhost ในโค้ดจริง
// รองรับทั้ง FRONTEND_URL=https://domain.com (ไม่มี /coop) และ COOP_PUBLIC_URL=https://domain.com/coop
const buildEvaluationUrl = (requestId) => {
  let base = (process.env.COOP_PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173/coop').replace(/\/+$/, '');
  if (!base.endsWith('/coop')) base += '/coop';
  return `${base}/public/evaluate/${requestId}`;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildHtml = ({ studentName, studentId, companyName, advisorName, startDate, endDate, evalUrl }) => {
  const rows = [
    studentName && ['นักศึกษาฝึกงาน', escapeHtml(studentName)],
    studentId && ['รหัสนักศึกษา', escapeHtml(studentId)],
    companyName && ['สถานประกอบการ', escapeHtml(companyName)],
    startDate && endDate && ['ระยะเวลาฝึกงาน', `${escapeHtml(startDate)} ถึง ${escapeHtml(endDate)}`],
  ]
    .filter(Boolean)
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding: 10px 16px; font-size: 13px; color: #6b7280; width: 140px; vertical-align: top; border-bottom: 1px solid #ede9fe;">${label}</td>
        <td style="padding: 10px 16px; font-size: 14px; color: #1f2937; font-weight: 600; border-bottom: 1px solid #ede9fe;">${value}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="th" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>ขอความอนุเคราะห์ประเมินผลการฝึกงาน</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">

          <!-- Header: purple gradient -->
          <tr>
            <td style="background: #4f46e5; background: linear-gradient(135deg, #6366f1 0%, #7c3aed 50%, #4338ca 100%); padding: 36px 24px; text-align: center; border-radius: 20px 20px 0 0;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; font-family: 'Kanit', 'Prompt', 'Segoe UI', Arial, sans-serif; line-height: 1.5;">
                มหาวิทยาลัยราชภัฏศรีสะเกษ
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #e0e7ff; opacity: 0.95; font-family: 'Kanit', 'Prompt', 'Segoe UI', Arial, sans-serif; line-height: 1.6;">
                คณะศิลปศาสตร์และวิทยาศาสตร์ • ระบบสหกิจศึกษาและฝึกงาน LASC
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 36px; font-family: 'Kanit', 'Segoe UI', Arial, sans-serif;">
              <p style="font-size: 15px; color: #334155; line-height: 1.8; margin: 0 0 14px 0;">
                เรียน <strong>ผู้ดูแลการฝึกงาน / ผู้ประเมิน${companyName ? ` ${escapeHtml(companyName)}` : 'สถานประกอบการ'}</strong>
              </p>
              <p style="font-size: 14px; color: #475569; line-height: 1.8; margin: 0 0 24px 0;">
                อาจารย์ผู้นิเทศได้เข้าทำการนิเทศงานนักศึกษาเรียบร้อยแล้ว
                ทางคณะฯ จึงขอความอนุเคราะห์จากท่านประเมินทักษะและการปฏิบัติงานของนักศึกษาผ่านระบบออนไลน์
                เพื่อนำผลการประเมินไปใช้ประกอบการสำเร็จการศึกษาต่อไป
              </p>

              <!-- Student details box -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f3ff; border: 1px solid #ede9fe; border-radius: 14px; margin-bottom: 20px;">
                ${rows}
              </table>

              <!-- Notice: evaluation opens after internship end date -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #d97706; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <p style="font-size: 13px; color: #92400e; line-height: 1.7; margin: 0;">
                      <strong>ข้อชี้แจง:</strong> ทางสถานประกอบการสามารถเริ่มทำแบบประเมินฉบับนี้ได้<strong>หลังจากนักศึกษาเสร็จสิ้นการฝึกงานตามกำหนดการ${endDate ? ` (ตั้งแต่วันที่ ${escapeHtml(endDate)} เป็นต้นไป)` : ''}</strong> เพื่อให้ครอบคลุมการปฏิบัติงานตลอดหลักสูตร ท่านสามารถเก็บลิงก์นี้ไว้ทำแบบประเมินเมื่อนักศึกษาฝึกงานเสร็จสิ้น
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 4px 0 10px 0;">
                    <a href="${escapeHtml(evalUrl)}" target="_blank" style="display: inline-block; background: #6366f1; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 12px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35); font-family: 'Kanit', 'Prompt', 'Segoe UI', Arial, sans-serif;">
                      ทำแบบประเมินผลการฝึกงาน →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 14px 0 0 0;">
                    <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin: 0 0 6px 0;">
                      หรือคัดลอกลิงก์นี้เปิดในเบราว์เซอร์:
                    </p>
                    <p style="font-size: 12px; margin: 0;">
                      <a href="${escapeHtml(evalUrl)}" style="color: #6366f1; word-break: break-all;">${escapeHtml(evalUrl)}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; border-top: 1px solid #f1f5f9; background-color: #fbfafc;">
              <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.7; font-family: 'Kanit', 'Segoe UI', Arial, sans-serif; margin: 0;">
                อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับ<br />
                ฝ่ายสหกิจศึกษาและงานฝึกงาน คณะศิลปศาสตร์และวิทยาศาสตร์ มหาวิทยาลัยราชภัฏศรีสะเกษ
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
  const html = buildHtml({ studentName, studentId, companyName, advisorName, startDate, endDate, evalUrl: url });

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

      const info = await transporter.sendMail({ from: smtpFrom, to, subject, html });
      console.log(`[EmailService] ส่งแบบประเมินถึง ${to} แล้วผ่าน SMTP (MessageId: ${info.messageId})`);
      return { success: true, simulated: false, via: 'smtp', messageId: info.messageId, to, evalUrl: url };
    } catch (err) {
      console.error('[EmailService] ส่งผ่าน SMTP ไม่สำเร็จ:', err.message);
      return { success: false, simulated: false, reason: 'send_error', error: err.message, to, evalUrl: url };
    }
  }

  // 3) ยังไม่ได้ตั้งค่าช่องทางส่ง — log ลิงก์ไว้ให้ใช้งานระหว่างพัฒนา แต่ต้องไม่รายงานว่าส่งแล้ว
  console.log('================================================================');
  console.log('📧 [EmailService] ยังไม่ได้ตั้งค่า Gmail/SMTP — ไม่ได้ส่งอีเมลจริง');
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

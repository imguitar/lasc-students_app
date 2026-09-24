const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const pool = require('../config/db');

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const GMAIL_REDIRECT_URI =
  process.env.GMAIL_REDIRECT_URI || 'https://developers.google.com/oauthplayground';
const GMAIL_FROM_NAME = process.env.GMAIL_FROM_NAME || 'ระบบงานฝึกงาน LASC';

const isGmailConfigured = () =>
  Boolean(GMAIL_USER && GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN);

// OAuth2 Client — ต่ออายุ access token จาก refresh token อัตโนมัติ
const createOAuth2Client = () => {
  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  return oauth2Client;
};

const createTransporter = async () => {
  const oauth2Client = createOAuth2Client();
  const { token: accessToken } = await oauth2Client.getAccessToken();
  if (!accessToken) {
    throw new Error('ไม่สามารถขอ access token จาก refresh token ได้ — refresh token อาจหมดอายุหรือถูก revoke');
  }
  console.log('[Mailer] ขอ access token สำเร็จ (ยาว', accessToken.length, 'ตัวอักษร)');

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: GMAIL_USER,
      clientId: GMAIL_CLIENT_ID,
      clientSecret: GMAIL_CLIENT_SECRET,
      refreshToken: GMAIL_REFRESH_TOKEN,
      accessToken,
    },
    tls: {
      // ป้องกัน SSL handshake fail เมื่อ antivirus/firewall ดักจับ TLS บน localhost
      rejectUnauthorized: false,
    },
  });
};

/**
 * ส่งผ่าน Gmail REST API (HTTPS 443) — ใช้เมื่อ SMTP (465/587) ถูกบล็อกโดยเครือข่าย
 * สร้าง MIME message แล้ว encode เป็น base64url ตามสเปก users.messages.send
 */
const encodeHeaderUtf8 = (value) =>
  `=?UTF-8?B?${Buffer.from(String(value ?? ''), 'utf-8').toString('base64')}?=`;

const sendViaGmailApi = async ({ to, subject, htmlContent }) => {
  const oauth2Client = createOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const mime = [
    `From: ${encodeHeaderUtf8(GMAIL_FROM_NAME)} <${GMAIL_USER}>`,
    `To: ${to}`,
    `Subject: ${encodeHeaderUtf8(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(String(htmlContent || ''), 'utf-8').toString('base64'),
  ].join('\r\n');

  const raw = Buffer.from(mime, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const { data } = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });
  return data.id;
};

/**
 * ฟังก์ชันส่งอีเมลส่วนกลาง
 * @param {{ to: string, subject: string, htmlContent: string }} options
 * @returns {Promise<{success: boolean, simulated?: boolean, messageId?: string, reason?: string, error?: string}>}
 */
const sendEmail = async ({ to, subject, htmlContent }) => {
  if (!to || !String(to).trim()) {
    console.warn('[Mailer] ไม่มีอีเมลผู้รับ — ข้ามการส่ง');
    return { success: false, reason: 'missing_recipient' };
  }

  if (!isGmailConfigured()) {
    console.log('================================================================');
    console.log('📧 [Mailer] ยังไม่ได้ตั้งค่า Gmail OAuth2 — ไม่ได้ส่งอีเมลจริง');
    console.log(`ผู้รับ: ${to}`);
    console.log(`หัวข้อ: ${subject}`);
    console.log('================================================================');
    return { success: false, simulated: true, reason: 'gmail_not_configured' };
  }

  try {
    console.log(`[Mailer] เตรียมส่งอีเมล → to: ${to} | subject: ${subject}`);

    // 1) Gmail REST API (HTTPS 443) — เลี่ยงปัญหาเครือข่ายบล็อกพอร์ต SMTP
    try {
      const messageId = await sendViaGmailApi({ to, subject, htmlContent });
      console.log(`[Mailer] ส่งผ่าน Gmail API สำเร็จ → ${to} (MessageId: ${messageId})`);
      return { success: true, messageId, via: 'gmail-api' };
    } catch (apiErr) {
      console.warn(`[Mailer] Gmail API ล้มเหลว (${apiErr.message}) — ลอง SMTP transporter`);
    }

    // 2) Nodemailer SMTP + OAuth2 — fallback
    const transporter = await createTransporter();
    await transporter.verify();
    console.log('[Mailer] transporter.verify() ผ่าน — เชื่อมต่อ Gmail SMTP สำเร็จ');

    const info = await transporter.sendMail({
      from: `"${GMAIL_FROM_NAME}" <${GMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
    console.log(`[Mailer] sendMail สำเร็จ → ${to} (MessageId: ${info.messageId} | response: ${info.response})`);
    return { success: true, messageId: info.messageId, via: 'gmail-smtp' };
  } catch (err) {
    console.error('================================================================');
    console.error('[Mailer] Error sending email:', err.message);
    if (err.code) console.error('[Mailer] code:', err.code);
    if (err.response) console.error('[Mailer] response:', err.response);
    if (err.responseCode) console.error('[Mailer] responseCode:', err.responseCode);
    console.error('================================================================');
    return { success: false, reason: 'gmail_error', error: err.message };
  }
};

// ---------- เทมเพลตอีเมลแจ้งสถานะคำร้อง (ภาษาไทย) ----------

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const STATUS_THEME = {
  approved: { accent: '#059669', soft: '#ecfdf5', icon: '✅', label: 'อนุมัติแล้ว' },
  rejected: { accent: '#e11d48', soft: '#fff1f2', icon: '❌', label: 'ไม่อนุมัติ' },
  revision: { accent: '#d97706', soft: '#fffbeb', icon: '📝', label: 'ส่งกลับแก้ไข' },
  pending: { accent: '#7c3aed', soft: '#f5f3ff', icon: '📄', label: 'อยู่ระหว่างดำเนินการ' },
};

const getStatusTheme = (status = '') => {
  const s = String(status);
  if (s.includes('ไม่อนุมัติ') || s.includes('ปฏิเสธ')) return STATUS_THEME.rejected;
  if (s.includes('แก้ไข')) return STATUS_THEME.revision;
  if (
    s.includes('อนุมัติแล้ว') ||
    s.includes('ตอบรับ') ||
    s.includes('ออกฝึกงาน') ||
    s.includes('สำเร็จ')
  ) {
    return STATUS_THEME.approved;
  }
  return STATUS_THEME.pending;
};

const buildStatusEmailHtml = ({
  studentName,
  studentId,
  requestId,
  status,
  comment,
  company,
  position,
  detailUrl,
}) => {
  const theme = getStatusTheme(status);
  const safeStatus = escapeHtml(status || theme.label);
  const rows = [
    studentId && ['รหัสนักศึกษา', escapeHtml(studentId)],
    requestId && ['เลขที่คำร้อง', `#${escapeHtml(requestId)}`],
    company && ['สถานประกอบการ', escapeHtml(company)],
    position && ['ตำแหน่ง', escapeHtml(position)],
  ]
    .filter(Boolean)
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding: 8px 14px; font-size: 13px; color: #64748b; width: 140px; vertical-align: top;">${label}</td>
        <td style="padding: 8px 14px; font-size: 13px; color: #0f172a; font-weight: 600;">${value}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background-color: #f4f5fb;">
  <div style="font-family: 'Kanit', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px 12px;">
    <div style="background-color: #ffffff; border: 1px solid #e9e5f5; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6d28d9, #7c3aed); padding: 24px 28px;">
        <h1 style="color: #ffffff; font-size: 18px; margin: 0;">ระบบบริหารจัดการการฝึกประสบการณ์วิชาชีพ</h1>
        <p style="color: #ddd6fe; font-size: 13px; margin: 6px 0 0 0;">มหาวิทยาลัยราชภัฏศรีสะเกษ</p>
      </div>
      <div style="padding: 28px;">
        <p style="font-size: 15px; color: #334155; line-height: 1.7; margin: 0 0 16px 0;">
          เรียน <strong>${escapeHtml(studentName || 'นักศึกษา')}</strong>
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.7; margin: 0 0 20px 0;">
          ระบบขอแจ้งให้ทราบว่า คำร้องขอฝึกงานของท่านมีการอัปเดตสถานะดังต่อไปนี้
        </p>
        <div style="background-color: ${theme.soft}; border: 1px solid ${theme.accent}22; border-radius: 12px; padding: 16px 20px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 15px; font-weight: 700; color: ${theme.accent};">${theme.icon} ${safeStatus}</span>
        </div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border-radius: 12px;">
          ${rows}
        </table>
        ${
          comment
            ? `<div style="margin-top: 18px; padding: 14px 18px; border-left: 4px solid ${theme.accent}; background-color: #f8fafc; border-radius: 0 10px 10px 0;">
                <p style="font-size: 12px; color: #64748b; margin: 0 0 4px 0;">หมายเหตุ / ความเห็น</p>
                <p style="font-size: 14px; color: #334155; margin: 0; line-height: 1.6;">${escapeHtml(comment)}</p>
              </div>`
            : ''
        }
        ${
          detailUrl
            ? `<div style="text-align: center; margin: 26px 0 6px 0;">
                <a href="${escapeHtml(detailUrl)}" style="background-color: #7c3aed; color: #ffffff; padding: 12px 30px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 10px; display: inline-block;">ดูรายละเอียดคำร้อง</a>
              </div>`
            : ''
        }
      </div>
      <div style="padding: 16px 28px; border-top: 1px solid #f1f5f9;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
          อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

const buildRequestDetailUrl = (requestId) => {
  let base = (process.env.COOP_PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173/coop').replace(/\/+$/, '');
  if (!base.endsWith('/coop')) base += '/coop';
  return requestId ? `${base}/dashboard/request/${requestId}` : `${base}/dashboard`;
};

/**
 * ส่งอีเมลแจ้งสถานะคำร้องให้นักศึกษา
 */
const sendStatusNotifyEmail = async ({
  to,
  studentName,
  studentId,
  requestId,
  status,
  comment,
  company,
  position,
}) => {
  const subject = `[LASC] อัปเดตสถานะคำร้องฝึกงาน${requestId ? ` #${requestId}` : ''} — ${status}`;
  const htmlContent = buildStatusEmailHtml({
    studentName,
    studentId,
    requestId,
    status,
    comment,
    company,
    position,
    detailUrl: buildRequestDetailUrl(requestId),
  });
  return sendEmail({ to, subject, htmlContent });
};

/**
 * ค้นหาอีเมลนักศึกษาจากตาราง user ด้วยรหัสนักศึกษา (username)
 */
const findStudentEmail = async (studentId) => {
  if (!studentId) return null;
  const fallback = `stu${studentId}@sskru.ac.th`;
  try {
    const [rows] = await pool.query(
      'SELECT email FROM `user` WHERE username = ? OR email = ? LIMIT 1',
      [String(studentId), String(studentId)]
    );
    const email = rows[0]?.email || null;
    // ใช้อีเมลจริงถ้ามีและไม่ใช่โดเมนเดิมที่ bounce (@student.sskru.ac.th)
    if (email && !email.includes('@student.sskru.ac.th')) return email;
    return fallback;
  } catch (err) {
    console.warn('[Mailer] ค้นหาอีเมลนักศึกษาไม่สำเร็จ:', err.message);
    return fallback;
  }
};

/**
 * แจ้งเตือนแอดมินเมื่อสถานประกอบการส่งแบบประเมินผลการฝึกงาน
 */
const buildAdminEvaluationAlertHtml = ({
  studentName, studentId, companyName, evaluatorName, evaluatorPosition,
  totalScore, maxScore, comments, detailUrl,
}) => {
  const rows = [
    ['นักศึกษา', `${escapeHtml(studentName || '-')}${studentId ? ` (รหัส: ${escapeHtml(studentId)})` : ''}`],
    ['สถานประกอบการ', escapeHtml(companyName || '-')],
    ['ผู้ประเมิน', `${escapeHtml(evaluatorName || '-')}${evaluatorPosition ? ` (${escapeHtml(evaluatorPosition)})` : ''}`],
    ['คะแนนรวม', `${escapeHtml(String(totalScore ?? '-'))} / ${escapeHtml(String(maxScore ?? 100))} คะแนน`],
    ['ข้อเสนอแนะเพิ่มเติม', escapeHtml(comments || '-')],
  ]
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding: 9px 14px; font-size: 13px; color: #64748b; width: 150px; vertical-align: top; border-bottom: 1px solid #f3e8ff;">${label}</td>
        <td style="padding: 9px 14px; font-size: 13px; color: #4c1d95; font-weight: 600; border-bottom: 1px solid #f3e8ff;">${value}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="th" xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 24px 32px;">
              <h1 style="color: #ffffff; font-family: 'Kanit', 'Segoe UI', Arial, sans-serif; font-size: 17px; margin: 0;">สถานประกอบการส่งผลประเมินแล้ว</h1>
              <p style="color: #ddd6fe; font-family: 'Kanit', 'Segoe UI', Arial, sans-serif; font-size: 12px; margin: 6px 0 0 0;">ระบบสหกิจศึกษาและฝึกงาน LASC • แจ้งเตือนผู้ดูแลระบบ</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 26px 32px; font-family: 'Kanit', 'Segoe UI', Arial, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #faf5ff; border: 1px solid #f3e8ff; border-left: 4px solid #7c3aed; border-radius: 12px; margin-bottom: 24px;">
                ${rows}
              </table>
              ${
                detailUrl
                  ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr><td align="center">
                        <a href="${escapeHtml(detailUrl)}" target="_blank" style="background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff; padding: 13px 30px; font-size: 14px; font-weight: 700; font-family: 'Kanit', 'Segoe UI', Arial, sans-serif; text-decoration: none; border-radius: 10px; display: inline-block;">ดูรายงานผลคะแนนในระบบ Admin</a>
                      </td></tr>
                    </table>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; border-top: 1px solid #f1f5f9;">
              <p style="font-size: 12px; color: #94a3b8; text-align: center; font-family: 'Kanit', 'Segoe UI', Arial, sans-serif; margin: 0;">
                อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้
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

const sendAdminEvaluationAlertEmail = async ({
  to, studentName, studentId, companyName, evaluatorName, evaluatorPosition,
  totalScore, maxScore, comments, requestId,
}) => {
  const subject = `[LASC Admin] สถานประกอบการได้ประเมินผลการฝึกงานของ ${studentName || 'นักศึกษา'} เรียบร้อยแล้ว`;
  const htmlContent = buildAdminEvaluationAlertHtml({
    studentName, studentId, companyName, evaluatorName, evaluatorPosition,
    totalScore, maxScore, comments,
    detailUrl: buildRequestDetailUrl(requestId),
  });
  return sendEmail({ to, subject, htmlContent });
};

/**
 * แจ้งเตือนนักศึกษาเมื่อสถานประกอบการส่งแบบประเมิน — แจ้งเฉพาะสถานะ
 * ไม่ใส่คะแนน/เปอร์เซ็นต์/เกรด/ข้อเสนอแนะเชิงลึก (สงวนไว้ให้ admin และอาจารย์นิเทศ)
 */
const buildStudentEvaluationNoticeHtml = ({ studentName, companyName, detailUrl }) => `<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background-color: #f4f5fb;">
  <div style="font-family: 'Kanit', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px 12px;">
    <div style="background-color: #ffffff; border: 1px solid #e9e5f5; border-radius: 16px; overflow: hidden;">
      <div style="background: #4f46e5; background: linear-gradient(135deg, #6366f1 0%, #7c3aed 50%, #4338ca 100%); padding: 28px;">
        <h1 style="color: #ffffff; font-size: 18px; margin: 0;">สถานประกอบการส่งผลการประเมินแล้ว</h1>
        <p style="color: #e0e7ff; font-size: 13px; margin: 6px 0 0 0;">ระบบสหกิจศึกษาและฝึกงาน LASC • มหาวิทยาลัยราชภัฏศรีสะเกษ</p>
      </div>
      <div style="padding: 28px;">
        <p style="font-size: 15px; color: #334155; line-height: 1.7; margin: 0 0 16px 0;">
          เรียน <strong>${escapeHtml(studentName || 'นักศึกษา')}</strong>
        </p>
        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px 20px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 15px; font-weight: 700; color: #059669;">✅ สถานประกอบการบันทึกผลการประเมินเรียบร้อยแล้ว</span>
        </div>
        <p style="font-size: 14px; color: #475569; line-height: 1.8; margin: 0 0 20px 0;">
          สถานประกอบการ (<strong>${escapeHtml(companyName || '-')}</strong>) ได้ทำการบันทึกและส่งแบบประเมินผลการปฏิบัติงานของท่านเข้าสู่ระบบเรียบร้อยแล้ว ขณะนี้อยู่ระหว่างการตรวจสอบและสรุปผลร่วมกับอาจารย์นิเทศ ท่านสามารถติดตามความคืบหน้าของคำร้องได้ทางระบบสารสนเทศ
        </p>
        ${
          detailUrl
            ? `<div style="text-align: center; margin: 26px 0 6px 0;">
                <a href="${escapeHtml(detailUrl)}" target="_blank" style="background: #6366f1; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff; padding: 13px 32px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);">ดูรายละเอียดคำร้อง</a>
              </div>`
            : ''
        }
      </div>
      <div style="padding: 16px 28px; border-top: 1px solid #f1f5f9;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
          อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

const sendStudentEvaluationNoticeEmail = async ({ to, studentName, companyName, requestId }) => {
  const subject = '[LASC] แจ้งเตือน: สถานประกอบการส่งผลการประเมินการฝึกงานแล้ว';
  const htmlContent = buildStudentEvaluationNoticeHtml({
    studentName,
    companyName,
    detailUrl: buildRequestDetailUrl(requestId),
  });
  return sendEmail({ to, subject, htmlContent });
};

module.exports = {
  sendEmail,
  sendStatusNotifyEmail,
  sendAdminEvaluationAlertEmail,
  sendStudentEvaluationNoticeEmail,
  buildStatusEmailHtml,
  buildRequestDetailUrl,
  findStudentEmail,
  isGmailConfigured,
};

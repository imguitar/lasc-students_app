const fs = require('fs');
const path = require('path');
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

// รูปที่ฝังในตัวอีเมล (CID) — ไม่ต้องพึ่งโดเมนสาธารณะ ใช้ได้ทุกไคลเอนต์
const EMAIL_ASSET_DIR = path.join(__dirname, '..', 'assets', 'email');
const INLINE_IMAGES = { 'lasc-header': { file: 'header.png', contentType: 'image/png' } };

const getInlineImages = (html) =>
  Object.entries(INLINE_IMAGES)
    .filter(([cid]) => html.includes(`cid:${cid}`))
    .map(([cid, { file, contentType }]) => ({
      cid,
      filename: file,
      contentType,
      content: fs.readFileSync(path.join(EMAIL_ASSET_DIR, file)),
    }));

const wrapBase64 = (buffer) => buffer.toString('base64').match(/.{1,76}/g).join('\r\n');

const sendViaGmailApi = async ({ to, subject, htmlContent }) => {
  const oauth2Client = createOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const html = String(htmlContent || '');
  const images = getInlineImages(html);
  const headers = [
    `From: ${encodeHeaderUtf8(GMAIL_FROM_NAME)} <${GMAIL_USER}>`,
    `To: ${to}`,
    `Subject: ${encodeHeaderUtf8(subject)}`,
    'MIME-Version: 1.0',
  ];
  let mime;
  if (!images.length) {
    mime = [
      ...headers,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      wrapBase64(Buffer.from(html, 'utf-8')),
    ].join('\r\n');
  } else {
    const boundary = `lasc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    const parts = [
      ...headers,
      `Content-Type: multipart/related; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      wrapBase64(Buffer.from(html, 'utf-8')),
    ];
    for (const img of images) {
      parts.push(
        `--${boundary}`,
        `Content-Type: ${img.contentType}; name="${img.filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-ID: <${img.cid}>`,
        `Content-Disposition: inline; filename="${img.filename}"`,
        '',
        wrapBase64(img.content)
      );
    }
    parts.push(`--${boundary}--`, '');
    mime = parts.join('\r\n');
  }

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
    console.log('[Mailer] ยังไม่ได้ตั้งค่า Gmail OAuth2 — ไม่ได้ส่งอีเมลจริง');
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
      attachments: getInlineImages(String(htmlContent || '')).map(({ cid, filename, contentType, content }) => ({
        cid,
        filename,
        contentType,
        content,
        contentDisposition: 'inline',
      })),
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

// ---------- Clean Violet email layout (table-based + inline CSS สำหรับทุก email client) ----------

const EMAIL_FONT =
  "'Kanit', 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const STATUS_THEME = {
  approved: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', label: 'อนุมัติแล้ว' },
  pending: { bg: '#FEF3C7', border: '#FDE68A', text: '#D97706', label: 'อยู่ระหว่างดำเนินการ' },
  rejected: { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', label: 'ไม่อนุมัติ' },
  revision: { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', label: 'ส่งกลับแก้ไข' },
};

const getStatusTheme = (status = '') => {
  const s = String(status);
  if (s.includes('ไม่อนุมัติ') || s.includes('ปฏิเสธ') || s.includes('ยกเลิก')) return STATUS_THEME.rejected;
  if (s.includes('แก้ไข')) return STATUS_THEME.revision;
  if (s.startsWith('ยื่นคำร้อง')) return STATUS_THEME.pending;
  if (
    s.includes('อนุมัติแล้ว') ||
    s.includes('ตอบรับ') ||
    s.includes('ออกฝึกงาน') ||
    s.includes('สำเร็จ') ||
    s.includes('ฝึกงานเสร็จแล้ว') ||
    s.includes('เสร็จสิ้นสมบูรณ์')
  ) {
    return STATUS_THEME.approved;
  }
  return STATUS_THEME.pending;
};

const formatThaiDate = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const renderParagraph = (html, extraStyle = '') =>
  `<p style="margin: 0 0 12px 0; font-family: ${EMAIL_FONT}; font-size: 14px; line-height: 1.75; color: #334155; text-wrap: pretty;${extraStyle}">${html}</p>`;

const renderStatusBox = (statusText, theme, label = 'สถานะล่าสุด') => `
              <p style="margin: 10px 0 6px 0; font-family: ${EMAIL_FONT}; font-size: 12px; line-height: 1.4; color: #64748B;">${label}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 16px 0;">
                <tr>
                  <td bgcolor="${theme.bg}" style="background-color: ${theme.bg}; border: 1px solid ${theme.border}; border-radius: 9999px; padding: 4px 14px 4px 11px; font-family: ${EMAIL_FONT};">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="6" valign="middle" style="width: 6px; padding-right: 8px;">
                          <div style="width: 6px; height: 6px; line-height: 6px; font-size: 0; background-color: ${theme.text}; border-radius: 50%;">&nbsp;</div>
                        </td>
                        <td valign="middle" style="font-family: ${EMAIL_FONT}; font-size: 14px; font-weight: 700; line-height: 1.5; color: ${theme.text};">${statusText}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`;

const renderDetailTable = (rows) => {
  if (!rows.length) return '';
  const body = rows
    .map(([label, value], index) => {
      const border = index < rows.length - 1 ? ' border-bottom: 1px solid #F1F5F9;' : '';
      return `
                <tr>
                  <td width="38%" style="width: 38%; padding: 10px 8px 10px 0; font-family: ${EMAIL_FONT}; font-size: 13px; line-height: 1.6; color: #64748B; vertical-align: top;${border}">${label}</td>
                  <td width="62%" style="width: 62%; padding: 10px 0; font-family: ${EMAIL_FONT}; font-size: 13px; line-height: 1.6; font-weight: 600; color: #1E293B; vertical-align: top;${border}">${value}</td>
                </tr>`;
    })
    .join('');
  return `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 4px; border-top: 1px solid #F1F5F9;">${body}
              </table>`;
};

const renderNote = (label, text) => `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 14px; background-color: #F8FAFC; border-left: 3px solid #7C3AED; border-radius: 8px;">
                <tr>
                  <td style="padding: 12px 16px; font-family: ${EMAIL_FONT};">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748B;">${label}</p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #1E293B;">${text}</p>
                  </td>
                </tr>
              </table>`;

const renderButton = (url, label) => `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; max-width: 280px; margin: 0 auto;">
                      <tr>
                        <td align="center" bgcolor="#7C3AED" style="background-color: #7C3AED; border-radius: 12px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);">
                          <a href="${escapeHtml(url)}" target="_blank" style="display: block; background: #7C3AED; color: #FFFFFF; font-family: ${EMAIL_FONT}; font-weight: 600; font-size: 14px; line-height: 20px; min-height: 44px; padding: 12px 20px; border-radius: 12px; text-decoration: none; text-align: center; box-sizing: border-box;">${label}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`;

const renderEmailLayout = ({ title, preheader = '', content }) => `<!DOCTYPE html>
<html lang="th" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    @media only screen and (max-width: 640px) {
      .email-body { padding-left: 20px !important; padding-right: 20px !important; }
      .email-title-cell { padding-top: 24px !important; }
      .email-title { font-size: 18px !important; line-height: 1.4 !important; margin: 0 0 8px 0 !important; }
      .email-footer { padding-bottom: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFFFF;">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF" style="background-color: #FFFFFF;">
    <tr>
      <td align="center" style="padding: 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width: 640px; width: 100%; background-color: #FFFFFF;">
          <tr>
            <td style="padding: 0; font-size: 0; line-height: 0;">
              <img src="cid:lasc-header" width="640" alt="คณะศิลปศาสตร์และวิทยาศาสตร์ มหาวิทยาลัยราชภัฏศรีสะเกษ | ระบบบริหารจัดการการฝึกประสบการณ์วิชาชีพ" style="display: block; width: 100%; max-width: 640px; height: auto; border: 0; background-color: #5B21B6; color: #FFFFFF; font-family: ${EMAIL_FONT}; font-size: 16px; line-height: 1.5;" />
            </td>
          </tr>
          <tr>
            <td class="email-body email-title-cell" style="padding: 26px 36px 0 36px; font-family: ${EMAIL_FONT};">
              <h1 class="email-title" style="font-family: ${EMAIL_FONT}; font-size: 20px; font-weight: 700; line-height: 1.4; color: #0F172A; margin: 0 0 6px 0;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td class="email-body" style="padding: 10px 36px 0 36px; font-family: ${EMAIL_FONT};">${content}
            </td>
          </tr>
          <tr>
            <td class="email-body email-footer" style="padding: 0 36px 28px 36px; font-family: ${EMAIL_FONT};">
              <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #E2E8F0; text-align: center;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; font-weight: 600; color: #475569;"><span style="display: inline-block;">คณะศิลปศาสตร์และวิทยาศาสตร์</span> <span style="display: inline-block;">มหาวิทยาลัยราชภัฏศรีสะเกษ</span></p>
                <p style="margin: 4px 0 0 0; font-size: 11px; line-height: 1.6; color: #94A3B8;">อีเมลฉบับนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ Co-op LASC <span style="display: inline-block;">กรุณาอย่าตอบกลับ</span></p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 12px auto 0 auto;">
                  <tr>
                    <td style="background-color: #F5F3FF; border: 1px solid #EDE9FE; border-radius: 999px; padding: 3px 12px; font-family: ${EMAIL_FONT}; font-size: 10px; font-weight: 600; letter-spacing: 0.6px; color: #7C3AED;">LASC SSKRU Internship Platform</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ---------- เทมเพลตอีเมลแจ้งสถานะคำร้อง (ภาษาไทย) ----------

const buildStatusEmailHtml = ({
  studentName,
  studentId,
  requestId,
  status,
  comment,
  company,
  position,
  internshipStartDate,
  internshipEndDate,
  detailUrl,
}) => {
  const theme = getStatusTheme(status);
  const safeStatus = escapeHtml(status || theme.label);
  const start = formatThaiDate(internshipStartDate);
  const end = formatThaiDate(internshipEndDate);
  const period = start && end ? `${start} ถึง ${end}` : start ? `เริ่ม ${start}` : '';

  const rows = [
    studentId && ['รหัสนักศึกษา', escapeHtml(studentId)],
    requestId && ['เลขที่คำร้อง', `#${escapeHtml(requestId)}`],
    company && ['สถานประกอบการ', escapeHtml(company)],
    position && ['ตำแหน่งงาน', escapeHtml(position)],
    period && ['ช่วงเวลาฝึกงาน', escapeHtml(period)],
  ].filter(Boolean);

  const content = [
    renderParagraph(`เรียน <strong style="color: #0F172A;">${escapeHtml(studentName || 'นักศึกษา')}</strong>`, ' margin-bottom: 4px;'),
    renderParagraph('คำร้องขอฝึกงานของท่านมีการอัปเดตสถานะ <span style="display: inline-block;">รายละเอียดดังนี้</span>'),
    renderStatusBox(safeStatus, theme),
    renderDetailTable(rows),
    comment ? renderNote('หมายเหตุ / ความเห็น', escapeHtml(comment)) : '',
    detailUrl ? renderButton(detailUrl, 'เข้าสู่ระบบเพื่อดูรายละเอียดคำร้อง') : '',
  ].join('');

  return renderEmailLayout({
    title: 'อัปเดตสถานะคำร้องฝึกงาน',
    preheader: `สถานะคำร้องฝึกงานของท่าน: ${safeStatus}`,
    content,
  });
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
  internshipStartDate,
  internshipEndDate,
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
    internshipStartDate,
    internshipEndDate,
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
  ];

  const content = [
    renderParagraph('เรียน <strong style="color: #0F172A;">ผู้ดูแลระบบ</strong>', ' margin-bottom: 4px;'),
    renderParagraph('สถานประกอบการได้ส่งแบบประเมินผลการฝึกงานของนักศึกษาเข้าสู่ระบบแล้ว <span style="display: inline-block;">รายละเอียดดังนี้</span>'),
    renderDetailTable(rows),
    renderNote('ข้อเสนอแนะเพิ่มเติม', escapeHtml(comments || '-')),
    detailUrl ? renderButton(detailUrl, 'ดูรายงานผลคะแนนในระบบ Admin') : '',
  ].join('');

  return renderEmailLayout({
    title: 'สถานประกอบการส่งผลประเมินแล้ว',
    preheader: `ผลประเมินการฝึกงานของ ${escapeHtml(studentName || 'นักศึกษา')} จาก ${escapeHtml(companyName || 'สถานประกอบการ')}`,
    content,
  });
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
const buildStudentEvaluationNoticeHtml = ({ studentName, companyName, detailUrl }) => {
  const content = [
    renderParagraph(`เรียน <strong style="color: #0F172A;">${escapeHtml(studentName || 'นักศึกษา')}</strong>`, ' margin-bottom: 4px;'),
    renderParagraph('ระบบขอแจ้งความคืบหน้าการประเมินผลการฝึกงานของท่าน'),
    renderStatusBox('สถานประกอบการบันทึกผลการประเมินเรียบร้อยแล้ว', STATUS_THEME.approved),
    renderParagraph(
      `สถานประกอบการ (<strong style="color: #0F172A;">${escapeHtml(companyName || '-')}</strong>) ได้ทำการบันทึกและส่งแบบประเมินผลการปฏิบัติงานของท่านเข้าสู่ระบบเรียบร้อยแล้ว ขณะนี้อยู่ระหว่างการตรวจสอบและสรุปผลร่วมกับอาจารย์นิเทศ ท่านสามารถติดตามความคืบหน้าของคำร้องได้ทางระบบสารสนเทศ`,
      ' margin-top: 18px;'
    ),
  ].join('');

  return renderEmailLayout({
    title: 'สถานประกอบการส่งผลการประเมินแล้ว',
    preheader: 'สถานประกอบการบันทึกผลการประเมินการฝึกงานของท่านเรียบร้อยแล้ว',
    content,
  });
};

const sendStudentEvaluationNoticeEmail = async ({ to, studentName, companyName, requestId }) => {
  const subject = '[LASC] แจ้งเตือน: สถานประกอบการส่งผลการประเมินการฝึกงานแล้ว';
  const htmlContent = buildStudentEvaluationNoticeHtml({
    studentName,
    companyName,
    detailUrl: buildRequestDetailUrl(requestId),
  });
  return sendEmail({ to, subject, htmlContent });
};

// ---------- อีเมลถึงสถานประกอบการ ----------

const renderFallbackLink = (url) => `
              <p style="margin: 18px 0 4px 0; font-family: ${EMAIL_FONT}; font-size: 12px; line-height: 1.6; color: #64748B; text-align: center;">หรือคัดลอกลิงก์นี้เปิดในเบราว์เซอร์</p>
              <p style="margin: 0; font-family: ${EMAIL_FONT}; font-size: 12px; line-height: 1.6; text-align: center; word-break: break-all;"><a href="${escapeHtml(url)}" style="color: #7C3AED; text-decoration: underline;">${escapeHtml(url)}</a></p>`;

/** ขอความอนุเคราะห์ให้ผู้ประเมินฝั่งสถานประกอบการทำแบบประเมิน (หลังอาจารย์บันทึกผลนิเทศ) */
const buildCompanyEvaluationRequestHtml = ({ studentName, studentId, companyName, startDate, endDate, evalUrl }) => {
  const rows = [
    studentName && ['นักศึกษาฝึกงาน', escapeHtml(studentName)],
    studentId && ['รหัสนักศึกษา', escapeHtml(studentId)],
    companyName && ['สถานประกอบการ', escapeHtml(companyName)],
    startDate && endDate && ['ระยะเวลาฝึกงาน', `${escapeHtml(startDate)} ถึง ${escapeHtml(endDate)}`],
  ].filter(Boolean);

  const notice =
    `ทางสถานประกอบการสามารถเริ่มทำแบบประเมินฉบับนี้ได้<strong>หลังจากนักศึกษาเสร็จสิ้นการฝึกงานตามกำหนดการ${endDate ? ` (ตั้งแต่วันที่ ${escapeHtml(endDate)} เป็นต้นไป)` : ''}</strong> ` +
    'เพื่อให้ครอบคลุมการปฏิบัติงานตลอดหลักสูตร ท่านสามารถเก็บลิงก์นี้ไว้ทำแบบประเมินเมื่อนักศึกษาฝึกงานเสร็จสิ้น';

  const content = [
    renderParagraph(
      `เรียน <strong style="color: #0F172A;">ผู้ดูแลการฝึกงาน / ผู้ประเมิน ${companyName ? escapeHtml(companyName) : 'สถานประกอบการ'}</strong>`,
      ' margin-bottom: 4px;'
    ),
    renderParagraph(
      'อาจารย์ผู้นิเทศได้เข้าทำการนิเทศงานนักศึกษาเรียบร้อยแล้ว ทางคณะฯ จึงขอความอนุเคราะห์จากท่านประเมินทักษะและการปฏิบัติงานของนักศึกษาผ่านระบบออนไลน์ <span style="display: inline-block;">เพื่อนำผลการประเมินไปใช้ประกอบการสำเร็จการศึกษาต่อไป</span>'
    ),
    renderDetailTable(rows),
    renderNote('ข้อชี้แจง', notice),
    evalUrl ? renderButton(evalUrl, 'ทำแบบประเมินผลการฝึกงาน') : '',
    evalUrl ? renderFallbackLink(evalUrl) : '',
  ].join('');

  return renderEmailLayout({
    title: 'ขอความอนุเคราะห์ประเมินผลการฝึกงาน',
    preheader: `ขอความอนุเคราะห์ประเมินผลการฝึกงานของ ${escapeHtml(studentName || 'นักศึกษา')}`,
    content,
  });
};

/** ขอความอนุเคราะห์สถานประกอบการแห่งใหม่รับนักศึกษา (ขอย้ายที่ฝึก) พร้อมลิงก์ตอบรับออนไลน์ */
const buildRelocationRequestHtml = ({ companyName, studentId, acceptanceLink }) => {
  const rows = [
    studentId && ['รหัสนักศึกษา', escapeHtml(studentId)],
    companyName && ['สถานประกอบการ', escapeHtml(companyName)],
  ].filter(Boolean);

  const content = [
    renderParagraph(
      `เรียน <strong style="color: #0F172A;">ผู้ประสานงาน ${companyName ? escapeHtml(companyName) : 'สถานประกอบการ'}</strong>`,
      ' margin-bottom: 4px;'
    ),
    renderParagraph(
      'คณะศิลปศาสตร์และวิทยาศาสตร์ มหาวิทยาลัยราชภัฏศรีสะเกษ ได้ออกหนังสือขอความอนุเคราะห์ส่งนักศึกษาไปฝึกงาน ณ สถานประกอบการของท่าน'
    ),
    renderDetailTable(rows),
    renderParagraph(
      'โปรดตอบรับการฝึกงานผ่านลิงก์ออนไลน์ (ลงนามดิจิทัล ใช้ได้ครั้งเดียว)',
      ' margin-top: 18px;'
    ),
    acceptanceLink ? renderButton(acceptanceLink, 'ตอบรับการฝึกงานออนไลน์') : '',
    acceptanceLink ? renderFallbackLink(acceptanceLink) : '',
  ].join('');

  return renderEmailLayout({
    title: 'ขอความอนุเคราะห์รับนักศึกษาฝึกงาน',
    preheader: `คณะขอความอนุเคราะห์ให้ ${escapeHtml(companyName || 'สถานประกอบการ')} รับนักศึกษาเข้าฝึกงาน`,
    content,
  });
};

const sendRelocationRequestEmail = async ({ to, companyName, studentId, acceptanceLink }) =>
  sendEmail({
    to,
    subject: `[LASC] ขอความอนุเคราะห์รับนักศึกษาฝึกงาน (ย้ายจากสถานประกอบการเดิม) — ${companyName || ''}`.trim(),
    htmlContent: buildRelocationRequestHtml({ companyName, studentId, acceptanceLink }),
  });

// ---------- กติกา: สถานะไหนที่ควรส่งอีเมลหานักศึกษา ----------
// ขั้นกลางที่นักศึกษาไม่ต้องทำอะไร (รอแอดมินตรวจสอบ, รอบริษัทตอบรับ, ประเมินจากฝ่ายใดฝ่ายหนึ่ง ฯลฯ)
// ไม่ส่ง เพื่อไม่ให้ซ้ำกับการแจ้งเตือนในแอป
const shouldEmailStudentForStatus = (status) => {
  const s = String(status || '').trim();
  if (!s) return false;
  return (
    s.startsWith('ไม่อนุมัติ') ||
    s.startsWith('ปฏิเสธ') ||
    s.includes('สถานประกอบการปฏิเสธ') ||
    s.startsWith('ยกเลิก') ||
    s.includes('แก้ไข') ||
    s.startsWith('อนุมัติแล้ว') ||
    s === 'รอออกฝึกงาน' ||
    s === 'ออกฝึกงาน' ||
    s === 'กำลังออกฝึกงาน' ||
    s.startsWith('สิ้นสุดการฝึกงาน') ||
    s === 'ฝึกงานเสร็จแล้ว' ||
    s === 'เสร็จสิ้นสมบูรณ์'
  );
};

/**
 * ส่งอีเมลแจ้งสถานะให้นักศึกษา เฉพาะเมื่อสถานะเปลี่ยนจริงและเป็นสถานะที่ควรแจ้ง
 * ล้มเหลวได้โดยไม่กระทบ flow หลัก (ไม่ throw)
 */
const notifyStudentStatusChange = async ({ request, previousStatus, newStatus, comment }) => {
  try {
    if (!request || !newStatus) return { skipped: 'no_request' };
    if (previousStatus !== undefined && String(previousStatus) === String(newStatus)) return { skipped: 'unchanged' };
    if (!shouldEmailStudentForStatus(newStatus)) return { skipped: 'status_not_notified' };
    const to = await findStudentEmail(request.studentId);
    if (!to) return { skipped: 'no_recipient' };
    return await sendStatusNotifyEmail({
      to,
      studentName: request.studentName,
      studentId: request.studentId,
      requestId: request.id,
      status: newStatus,
      comment,
      company: request.company,
      position: request.position,
      internshipStartDate: request.internship_start_date,
      internshipEndDate: request.internship_end_date,
    });
  } catch (err) {
    console.error('[Mailer] ส่งอีเมลแจ้งสถานะล้มเหลว:', err.message);
    return { success: false, error: err.message };
  }
};

// ---------- อีเมลแจ้งเจ้าหน้าที่ (อาจารย์ / แอดมิน) ----------

const buildStaffDashboardUrl = (role) => {
  let base = (process.env.COOP_PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173/coop').replace(/\/+$/, '');
  if (!base.endsWith('/coop')) base += '/coop';
  return `${base}/${role === 'advisor' ? 'advisor-dashboard' : 'admin-dashboard'}`;
};

const buildStaffAlertHtml = ({
  greeting,
  intro,
  label = 'ต้องดำเนินการ',
  headline,
  theme = STATUS_THEME.pending,
  rows = [],
  noteTitle,
  note,
  detailUrl,
  buttonLabel = 'เข้าสู่ระบบเพื่อดำเนินการ',
  title,
  preheader,
}) => {
  const content = [
    renderParagraph(`เรียน <strong style="color: #0F172A;">${escapeHtml(greeting)}</strong>`, ' margin-bottom: 4px;'),
    renderParagraph(escapeHtml(intro)),
    renderStatusBox(escapeHtml(headline), theme, label),
    rows.length ? `<div style="height: 16px; line-height: 16px; font-size: 0;">&nbsp;</div>${renderDetailTable(rows)}` : '',
    note ? renderNote(noteTitle || 'หมายเหตุ', escapeHtml(note)) : '',
    detailUrl ? renderButton(detailUrl, buttonLabel) : '',
  ].join('');

  return renderEmailLayout({ title, preheader: preheader || headline, content });
};

const findAdminEmails = async () => {
  const emails = new Set();
  if (process.env.ADMIN_EMAIL) emails.add(process.env.ADMIN_EMAIL.trim());
  try {
    const [rows] = await pool.query(
      "SELECT email FROM `user` WHERE role = 'admin' AND isActive = 1 AND email IS NOT NULL AND email != ''"
    );
    rows.forEach((r) => r.email && emails.add(String(r.email).trim()));
  } catch (err) {
    console.warn('[Mailer] ค้นหาอีเมลแอดมินไม่สำเร็จ:', err.message);
  }
  return [...emails].filter(Boolean);
};

// อาจารย์ที่เห็นคำร้องของสาขานี้ — กติกาเดียวกับหน้า AdvisorDashboard (ไม่มีสาขา = เห็นทุกสาขา)
const findAdvisorEmails = async (department) => {
  try {
    const [rows] = await pool.query(
      `SELECT email FROM \`user\`
       WHERE role = 'advisor' AND isActive = 1 AND email IS NOT NULL AND email != ''
         AND (department IS NULL OR department = '' OR department = ?)`,
      [department || '']
    );
    return [...new Set(rows.map((r) => String(r.email).trim()).filter(Boolean))];
  } catch (err) {
    console.warn('[Mailer] ค้นหาอีเมลอาจารย์ไม่สำเร็จ:', err.message);
    return [];
  }
};

const requestSummaryRows = (request) => [
  ['นักศึกษา', `${escapeHtml(request.studentName || '-')}${request.studentId ? ` (รหัส: ${escapeHtml(request.studentId)})` : ''}`],
  ['เลขที่คำร้อง', request.id ? `#${escapeHtml(request.id)}` : '-'],
  ['สถานประกอบการ', escapeHtml(request.company || '-')],
  ...(request.position ? [['ตำแหน่งงาน', escapeHtml(request.position)]] : []),
];

const sendToAll = async (recipients, build) => {
  const results = [];
  for (const to of recipients) {
    try {
      results.push(await sendEmail({ to, ...build() }));
    } catch (err) {
      console.error('[Mailer] ส่งอีเมลเจ้าหน้าที่ล้มเหลว:', err.message);
      results.push({ success: false, error: err.message });
    }
  }
  return results;
};

/** มีคำร้องใหม่รออาจารย์ที่ปรึกษาอนุมัติ */
const notifyAdvisorsNewRequest = async (request) => {
  const recipients = await findAdvisorEmails(request.department);
  if (!recipients.length) return [];
  const detailUrl = buildStaffDashboardUrl('advisor');
  return sendToAll(recipients, () => ({
    subject: `[LASC] มีคำร้องฝึกงานใหม่รออนุมัติ — ${request.studentName || request.studentId || ''}`.trim(),
    htmlContent: buildStaffAlertHtml({
      greeting: 'อาจารย์ที่ปรึกษา',
      intro: 'มีนักศึกษายื่นคำร้องขอฝึกงานเข้ามาใหม่ และรอการพิจารณาจากท่าน',
      headline: 'รออาจารย์ที่ปรึกษาอนุมัติ',
      rows: requestSummaryRows(request),
      detailUrl,
      buttonLabel: 'เข้าสู่ระบบเพื่อพิจารณาคำร้อง',
      title: 'มีคำร้องฝึกงานรออนุมัติ',
      preheader: `${request.studentName || 'นักศึกษา'} ยื่นคำร้องฝึกงานใหม่ รอการพิจารณา`,
    }),
  }));
};

/** คำร้องผ่านอาจารย์แล้ว รอแอดมินตรวจสอบ */
const notifyAdminsPendingReview = async (request) => {
  const recipients = await findAdminEmails();
  if (!recipients.length) return [];
  const detailUrl = buildStaffDashboardUrl('admin');
  return sendToAll(recipients, () => ({
    subject: `[LASC Admin] คำร้องรอตรวจสอบ — ${request.studentName || request.studentId || ''}`.trim(),
    htmlContent: buildStaffAlertHtml({
      greeting: 'ผู้ดูแลระบบ',
      intro: 'คำร้องฝึกงานผ่านการอนุมัติจากอาจารย์ที่ปรึกษาแล้ว และรอการตรวจสอบจากท่าน',
      headline: 'รอผู้ดูแลระบบตรวจสอบ',
      rows: requestSummaryRows(request),
      note: request.advisor_comment || '',
      noteTitle: 'หมายเหตุจากอาจารย์',
      detailUrl,
      buttonLabel: 'เข้าสู่ระบบเพื่อตรวจสอบคำร้อง',
      title: 'มีคำร้องรอตรวจสอบ',
      preheader: `คำร้องของ ${request.studentName || 'นักศึกษา'} ผ่านอาจารย์แล้ว รอแอดมินตรวจสอบ`,
    }),
  }));
};

/** สถานประกอบการตอบรับ/ปฏิเสธผ่านลิงก์สาธารณะ */
const notifyAdminsCompanyResponse = async (request, { accepted, comment }) => {
  const recipients = await findAdminEmails();
  if (!recipients.length) return [];
  const detailUrl = buildStaffDashboardUrl('admin');
  const companyName = request.company || 'สถานประกอบการ';
  return sendToAll(recipients, () => ({
    subject: `[LASC Admin] ${companyName}${accepted ? ' ตอบรับ' : ' ปฏิเสธ'}คำร้องของ ${request.studentName || request.studentId || 'นักศึกษา'}`,
    htmlContent: buildStaffAlertHtml({
      greeting: 'ผู้ดูแลระบบ',
      intro: accepted
        ? 'สถานประกอบการตอบรับนักศึกษาเข้าฝึกงานแล้ว กรุณากำหนดวันฝึกงานและแนบใบส่งตัว'
        : 'สถานประกอบการปฏิเสธคำร้องฝึกงาน กรุณาตรวจสอบและแจ้งนักศึกษา',
      label: accepted ? 'ตอบรับแล้ว' : 'ปฏิเสธ',
      headline: accepted ? 'สถานประกอบการตอบรับแล้ว' : 'สถานประกอบการปฏิเสธ',
      theme: accepted ? STATUS_THEME.approved : STATUS_THEME.rejected,
      rows: requestSummaryRows(request),
      note: !accepted ? comment || '' : '',
      noteTitle: 'เหตุผล',
      detailUrl,
      buttonLabel: accepted ? 'เข้าสู่ระบบเพื่อกำหนดวันฝึกงาน' : 'เข้าสู่ระบบเพื่อตรวจสอบ',
      title: accepted ? 'สถานประกอบการตอบรับแล้ว' : 'สถานประกอบการปฏิเสธคำร้อง',
      preheader: `${companyName} ${accepted ? 'ตอบรับ' : 'ปฏิเสธ'}คำร้องของ ${request.studentName || 'นักศึกษา'}`,
    }),
  }));
};

module.exports = {
  buildCompanyEvaluationRequestHtml,
  buildRelocationRequestHtml,
  sendRelocationRequestEmail,
  getInlineImages,
  shouldEmailStudentForStatus,
  notifyStudentStatusChange,
  notifyAdvisorsNewRequest,
  notifyAdminsPendingReview,
  notifyAdminsCompanyResponse,
  buildStaffAlertHtml,
  findAdminEmails,
  findAdvisorEmails,
  sendEmail,
  sendStatusNotifyEmail,
  sendAdminEvaluationAlertEmail,
  sendStudentEvaluationNoticeEmail,
  buildStatusEmailHtml,
  buildAdminEvaluationAlertHtml,
  buildStudentEvaluationNoticeHtml,
  buildRequestDetailUrl,
  findStudentEmail,
  isGmailConfigured,
};

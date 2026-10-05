const axios = require('axios');
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_) {
  // Graceful fallback if nodemailer not yet installed
}

let cachedGmailToken = null;
let gmailTokenExpiresAt = 0;

const isGmailConfigured = () => {
  return Boolean(
    (process.env.GMAIL_USER || '').trim() &&
    (process.env.GMAIL_CLIENT_ID || '').trim() &&
    (process.env.GMAIL_CLIENT_SECRET || '').trim() &&
    (process.env.GMAIL_REFRESH_TOKEN || '').trim()
  );
};

const getGmailAccessToken = async () => {
  if (cachedGmailToken && Date.now() < gmailTokenExpiresAt - 60000) {
    return cachedGmailToken;
  }

  const clientId = (process.env.GMAIL_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GMAIL_CLIENT_SECRET || '').trim();
  const refreshToken = (process.env.GMAIL_REFRESH_TOKEN || '').trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('การตั้งค่า Google OAuth2 ไม่ครบถ้วน (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET หรือ GMAIL_REFRESH_TOKEN)');
  }

  const response = await axios.post(
    'https://oauth2.googleapis.com/token',
    {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    }
  );

  const { access_token, expires_in } = response.data;
  if (!access_token) {
    throw new Error('Google OAuth2 ไม่ส่ง access_token กลับมา');
  }

  cachedGmailToken = access_token;
  gmailTokenExpiresAt = Date.now() + ((expires_in || 3600) * 1000);
  return access_token;
};

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const formatThaiDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} พ.ศ. ${year}`;
};

/**
 * ตรวจสอบความพร้อมของ Email Provider
 * คืนค่า 'gmail_api' | 'resend' | 'sendgrid' | 'smtp' | 'simulated'
 */
const getActiveProvider = () => {
  const provider = (process.env.EMAIL_PROVIDER || '').toLowerCase().trim();

  if (provider === 'gmail' || provider === 'gmail_api') return 'gmail_api';
  if (provider === 'smtp') return 'smtp';
  if (provider === 'resend') return 'resend';
  if (provider === 'sendgrid') return 'sendgrid';

  // 1. Gmail API OAuth2 (ส่งผ่าน HTTPS พอร์ต 443 ไม่พึ่งพาพอร์ต SMTP ที่มักถูกบล็อก)
  if (isGmailConfigured()) {
    return 'gmail_api';
  }

  // 2. Transactional API (Resend / SendGrid)
  const apiKey = (process.env.EMAIL_API_KEY || '').trim();
  if (apiKey) {
    if (apiKey.startsWith('SG.')) return 'sendgrid';
    return 'resend';
  }

  // 3. SMTP Transport
  if (nodemailer && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return 'smtp';
  }

  // 4. Default: Simulated fallback (log ใน console)
  return 'simulated';
};

/**
 * ประกอบข้อมูลอีเมลเป็นรูปแบบ RFC 2822 base64url สำหรับ Gmail REST API
 */
const buildRawEmail = async ({ from, to, subject, html, text }) => {
  if (nodemailer) {
    const streamTransporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows',
      buffer: true
    });
    const info = await streamTransporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
      headers: {
        'X-Mailer': 'LASC Student System',
        'X-Priority': '3',
        'List-Unsubscribe': `<mailto:${process.env.GMAIL_USER || 'lasc.notication.sskru@gmail.com'}?subject=unsubscribe>`
      }
    });
    return info.message
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const mimeLines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text).toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html).toString('base64'),
    '',
    `--${boundary}--`
  ];

  return Buffer.from(mimeLines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * สร้าง HTML Template สำหรับอีเมลแจ้งเตือนกิจกรรม
 */
const buildEmailHtml = ({ recipientName, event, eventUrl }) => {
  const title = event.title || 'กิจกรรมใหม่';
  const description = event.description ? event.description.replace(/\n/g, '<br />') : 'ไม่มีรายละเอียดเพิ่มเติม';
  const eventDateStr = formatThaiDate(event.event_date);
  const endDateStr = event.end_date ? ` ถึง ${formatThaiDate(event.end_date)}` : '';
  const timeStr = event.start_time
    ? (event.end_time ? `${event.start_time} - ${event.end_time} น.` : `${event.start_time} น.`)
    : (event.time || 'ไม่ระบุเวลา');
  const locationStr = event.location ? event.location.trim() : 'ไม่ระบุสถานที่';
  const typeStr = event.type || 'กิจกรรม';

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>แจ้งเตือนกิจกรรม: ${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Kanit', Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);" cellspacing="0" cellpadding="0">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">ระบบฐานข้อมูลนักศึกษา</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">แจ้งเตือนข่าวสารและกิจกรรมมหาวิทยาลัย</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 24px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                เรียน <strong>${recipientName || 'นักศึกษา / บุคลากร'}</strong>
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                ขอแจ้งให้ท่านทราบว่ามีข่าวสาร / กิจกรรมสำคัญที่เกี่ยวข้องกับท่าน ดังนี้:
              </p>

              <!-- Activity Card Box -->
              <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="display: inline-block; background-color: #7c3aed; color: #ffffff; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 9999px; margin-bottom: 10px;">
                  ${typeStr}
                </div>
                <h2 style="margin: 0 0 14px 0; color: #581c87; font-size: 18px; font-weight: 700; line-height: 1.4;">
                  ${title}
                </h2>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #4b5563;">
                  <tr>
                    <td style="padding: 6px 0; width: 85px; font-weight: 600; color: #6b21a8;">📅 วันที่:</td>
                    <td style="padding: 6px 0; color: #1f2937;"><strong>${eventDateStr}${endDateStr}</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #6b21a8;">⏰ เวลา:</td>
                    <td style="padding: 6px 0; color: #1f2937;">${timeStr}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #6b21a8;">📍 สถานที่:</td>
                    <td style="padding: 6px 0; color: #1f2937;">${locationStr}</td>
                  </tr>
                </table>

                <hr style="border: none; border-top: 1px solid #e9d5ff; margin: 14px 0 12px 0;" />

                <div style="font-size: 13px; line-height: 1.6; color: #374151;">
                  <strong style="color: #6b21a8;">รายละเอียด:</strong><br />
                  ${description}
                </div>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin: 28px 0 20px 0;">
                <a href="${eventUrl}" style="background-color: #7c3aed; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.25);">
                  ดูรายละเอียดกิจกรรมบนระบบ
                </a>
              </div>

              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
                หากคลิกปุ่มไม่ได้ ให้คัดลอกลิงก์นี้เปิดในเบราว์เซอร์:<br />
                <a href="${eventUrl}" style="color: #7c3aed; word-break: break-all;">${eventUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
              อีเมลนี้สร้างและส่งโดยระบบอัตโนมัติจาก <strong>ระบบฐานข้อมูลนักศึกษา มหาวิทยาลัยราชภัฏศรีสะเกษ</strong><br />
              กรุณาอย่าตอบกลับอีเมลนี้
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * สร้าง Plain Text Template
 */
const buildEmailText = ({ recipientName, event, eventUrl }) => {
  const eventDateStr = formatThaiDate(event.event_date);
  const endDateStr = event.end_date ? ` ถึง ${formatThaiDate(event.end_date)}` : '';
  const timeStr = event.start_time
    ? (event.end_time ? `${event.start_time} - ${event.end_time} น.` : `${event.start_time} น.`)
    : (event.time || 'ไม่ระบุเวลา');
  const locationStr = event.location ? event.location.trim() : 'ไม่ระบุสถานที่';

  return `
เรียน ${recipientName || 'นักศึกษา / บุคลากร'}

ขอแจ้งให้ทราบว่าจะมีข่าวสาร/กิจกรรม:
หัวข้อ: ${event.title}
ประเภท: ${event.type || 'กิจกรรม'}
วันที่: ${eventDateStr}${endDateStr}
เวลา: ${timeStr}
สถานที่: ${event.location || 'ไม่ระบุสถานที่'}

รายละเอียด:
${event.description || '-'}

สามารถดูรายละเอียดเพิ่มเติมได้ที่:
${eventUrl}

---
ระบบฐานข้อมูลนักศึกษา มหาวิทยาลัยราชภัฏศรีสะเกษ (อีเมลอัตโนมัติ กรุณาอย่าตอบกลับ)
  `.trim();
};

/**
 * ส่งอีเมลแจ้งเตือนกิจกรรมรายบุคคล
 *
 * @param {Object} options
 * @param {string} options.to - อีเมลผู้รับ
 * @param {string} options.recipientName - ชื่อผู้รับ
 * @param {Object} options.event - ข้อมูลกิจกรรม NewsEvent
 * @param {string} options.clientUrl - Base URL ของระบบ Frontend เช่น http://localhost:3000
 * @returns {Promise<{success: boolean, simulated: boolean, messageId?: string, error?: string}>}
 */
const sendNewsEventEmail = async ({ to, recipientName, event, clientUrl }) => {
  if (!to || !to.trim()) {
    return {
      success: false,
      simulated: false,
      error: 'ไม่มีข้อมูลอีเมลผู้รับ'
    };
  }

  const cleanEmail = to.trim();
  const subject = `แจ้งเตือนกิจกรรม: ${event.title}`;
  const baseClientUrl = (clientUrl || process.env.PROFILE_PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const eventUrl = `${baseClientUrl}/news-events?id=${event.id}`;
  const html = buildEmailHtml({ recipientName, event, eventUrl });
  const text = buildEmailText({ recipientName, event, eventUrl });

  const fromName = (
    process.env.GMAIL_FROM_NAME ||
    process.env.EMAIL_FROM_NAME ||
    'ระบบฐานข้อมูลนักศึกษา มรภ.ศรีสะเกษ'
  ).trim();

  let fromEmail = (
    process.env.GMAIL_USER ||
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    'noreply@sskru.ac.th'
  ).trim();

  if (fromEmail.includes('<') && fromEmail.includes('>')) {
    const match = fromEmail.match(/<([^>]+)>/);
    if (match) fromEmail = match[1].trim();
  }

  const fromAddress = `"${fromName}" <${fromEmail}>`;

  const provider = getActiveProvider();

  // 1. Gmail API (OAuth2 ผ่าน HTTPS พอร์ต 443 ไม่พึ่งพอร์ต SMTP)
  if (provider === 'gmail_api') {
    try {
      const accessToken = await getGmailAccessToken();
      const raw = await buildRawEmail({
        from: fromAddress,
        to: cleanEmail,
        subject,
        html,
        text
      });

      const response = await axios.post(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        { raw },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return {
        success: true,
        simulated: false,
        messageId: response.data?.id || 'gmail-sent',
        provider: 'gmail_api'
      };
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      console.error(`[EmailService:GmailAPI] ส่งอีเมลถึง ${cleanEmail} ล้มเหลว:`, errMsg);
      return {
        success: false,
        simulated: false,
        error: errMsg,
        provider: 'gmail_api'
      };
    }
  }

  // 1. Resend API
  if (provider === 'resend') {
    try {
      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: fromAddress,
          to: [cleanEmail],
          subject,
          html,
          text
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      return {
        success: true,
        simulated: false,
        messageId: response.data?.id || 'resend-sent',
        provider: 'resend'
      };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      console.error(`[EmailService:Resend] ส่งอีเมลถึง ${cleanEmail} ล้มเหลว:`, errMsg);
      return {
        success: false,
        simulated: false,
        error: errMsg,
        provider: 'resend'
      };
    }
  }

  // 2. SendGrid API
  if (provider === 'sendgrid') {
    try {
      const response = await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [{ to: [{ email: cleanEmail, name: recipientName }] }],
          from: { email: fromEmail, name: fromName },
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      return {
        success: true,
        simulated: false,
        messageId: response.headers?.['x-message-id'] || 'sendgrid-sent',
        provider: 'sendgrid'
      };
    } catch (err) {
      const errMsg = err.response?.data?.errors?.[0]?.message || err.message;
      console.error(`[EmailService:SendGrid] ส่งอีเมลถึง ${cleanEmail} ล้มเหลว:`, errMsg);
      return {
        success: false,
        simulated: false,
        error: errMsg,
        provider: 'sendgrid'
      };
    }
  }

  // 3. SMTP via Nodemailer
  if (provider === 'smtp') {
    try {
      const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: smtpPort === 465 || process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const info = await transporter.sendMail({
        from: fromAddress,
        to: cleanEmail,
        subject,
        html,
        text
      });

      return {
        success: true,
        simulated: false,
        messageId: info.messageId,
        provider: 'smtp'
      };
    } catch (err) {
      console.error(`[EmailService:SMTP] ส่งอีเมลถึง ${cleanEmail} ล้มเหลว:`, err.message);
      return {
        success: false,
        simulated: false,
        error: err.message,
        provider: 'smtp'
      };
    }
  }

  // 4. Simulated Mode (Local / Dev fallback เมื่อยังไม่มีการตั้งค่า credentials)
  console.log('================================================================');
  console.log('📧 [EmailService:SIMULATED] จำลองการส่งอีเมลแจ้งเตือนกิจกรรม');
  console.log(`ถึง: ${cleanEmail} (${recipientName || 'ไม่ระบุชื่อ'})`);
  console.log(`หัวข้อ: ${subject}`);
  console.log(`กิจกรรม: ${event.title} (วันที่: ${formatThaiDate(event.event_date)})`);
  console.log(`ลิงก์: ${eventUrl}`);
  console.log('================================================================');

  return {
    success: true,
    simulated: true,
    messageId: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    provider: 'simulated'
  };
};

module.exports = {
  sendNewsEventEmail,
  buildEmailHtml,
  buildEmailText,
  getActiveProvider
};

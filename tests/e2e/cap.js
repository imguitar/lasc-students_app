// E2E mail capture preload.
// Loaded with `node -r /tmp/e2e/cap.js src/server.js`.
// Replaces the Gmail REST API, Google OAuth2 and nodemailer transports with an in-process
// capture so no message ever leaves the machine. Each captured message is written as
// one JSON line in MAIL_LOG and its HTML body as a separate file in MAIL_DIR.
const Module = require('module');
const fs = require('fs');
const path = require('path');

const MAIL_DIR = process.env.E2E_MAIL_DIR || '/tmp/e2e/mails';
const MAIL_LOG = path.join(MAIL_DIR, 'mails.jsonl');
fs.mkdirSync(MAIL_DIR, { recursive: true });

let seq = 0;
try {
  seq = fs.readFileSync(MAIL_LOG, 'utf8').split('\n').filter(Boolean).length;
} catch (_) { /* first run */ }

const decodeWord = (v) =>
  String(v || '').replace(/=\?UTF-8\?B\?([^?]+)\?=/gi, (_, b64) => Buffer.from(b64, 'base64').toString('utf8'));

const record = ({ via, from, to, subject, html }) => {
  seq += 1;
  const id = `e2e-${String(seq).padStart(4, '0')}`;
  const htmlFile = path.join(MAIL_DIR, `${id}.html`);
  fs.writeFileSync(htmlFile, html || '', 'utf8');
  const entry = {
    seq,
    messageId: id,
    at: new Date().toISOString(),
    via,
    from: from || null,
    to: to || null,
    subject: subject || null,
    htmlFile,
    htmlBytes: Buffer.byteLength(html || '', 'utf8'),
    hasHtmlTag: /<html[\s>]/i.test(html || ''),
  };
  fs.appendFileSync(MAIL_LOG, JSON.stringify(entry) + '\n', 'utf8');
  console.log(`[E2E-CAPTURE] ${id} via=${via} to=${entry.to} subject=${entry.subject}`);
  return id;
};

// Parse the base64url MIME message that mailer.js builds for users.messages.send.
const parseRawMime = (raw) => {
  const mime = Buffer.from(String(raw).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  const headerEnd = mime.indexOf('\r\n\r\n');
  const headerText = headerEnd >= 0 ? mime.slice(0, headerEnd) : mime;
  const header = (name) => {
    const m = headerText.match(new RegExp(`^${name}:\\s*(.*)$`, 'im'));
    return m ? decodeWord(m[1].trim()) : null;
  };
  // First text/html part, base64 transfer encoding (as built by mailer.js).
  let html = '';
  const htmlIdx = mime.search(/Content-Type: text\/html/i);
  if (htmlIdx >= 0) {
    const partBodyStart = mime.indexOf('\r\n\r\n', htmlIdx);
    if (partBodyStart >= 0) {
      const rest = mime.slice(partBodyStart + 4);
      const end = rest.search(/\r\n--|$/);
      html = Buffer.from(rest.slice(0, end === -1 ? undefined : end).replace(/\s+/g, ''), 'base64').toString('utf8');
    }
  }
  return { from: header('From'), to: header('To'), subject: header('Subject'), html };
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  const mod = originalLoad.apply(this, arguments);

  if (request === 'googleapis' && mod && mod.google && !mod.__e2eCapture) {
    const { google } = mod;
    google.auth.OAuth2 = class E2EOAuth2 {
      setCredentials() {}
      async getAccessToken() { return { token: 'e2e-capture-token' }; }
    };
    google.gmail = () => ({
      users: {
        messages: {
          send: async ({ requestBody }) => {
            const parsed = parseRawMime(requestBody && requestBody.raw);
            const id = record({ via: 'gmail-api(captured)', ...parsed });
            return { data: { id } };
          },
        },
      },
    });
    mod.__e2eCapture = true;
  }

  if (request === 'nodemailer' && mod && !mod.__e2eCapture) {
    mod.createTransport = () => ({
      verify: async () => true,
      sendMail: async (opts = {}) => {
        const id = record({
          via: 'nodemailer(captured)',
          from: opts.from,
          to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
          subject: opts.subject,
          html: opts.html,
        });
        return { messageId: id, response: '250 captured' };
      },
    });
    mod.__e2eCapture = true;
  }

  return mod;
};

console.log(`[E2E-CAPTURE] mail capture active, writing to ${MAIL_DIR}`);

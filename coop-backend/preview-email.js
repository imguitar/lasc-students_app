/**
 * Preview เทมเพลตอีเมลในเบราว์เซอร์ — ไม่ส่งอีเมลจริง
 * ใช้: node preview-email.js [port]   (ค่าเริ่มต้น 5055)
 * แล้วเปิด http://localhost:5055
 *
 * - เรนเดอร์เทมเพลตจริงจาก src/utils/mailer.js ด้วยข้อมูลตัวอย่าง
 * - แก้ mailer.js แล้วบันทึก หน้าพรีวิวจะรีโหลดเอง
 * - แสดงทั้งมุมมองเดสก์ท็อปและมือถือ
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2] || process.env.PREVIEW_PORT || 5055);
const MAILER_PATH = require.resolve('./src/utils/mailer');
const ASSETS_DIR = path.join(__dirname, 'src', 'assets', 'email');

// โหลด mailer ใหม่ทุกครั้งที่ขอ เพื่อให้เห็นผลหลังแก้ไฟล์ (ล้างเฉพาะ mailer ไม่ล้าง db pool)
const loadMailer = () => {
  delete require.cache[MAILER_PATH];
  return require(MAILER_PATH);
};

const SAMPLES = [
  {
    id: 'status-approved',
    label: 'แจ้งสถานะ — อนุมัติแล้ว (ข้อมูลครบ)',
    render: (m) =>
      m.buildStatusEmailHtml({
        studentName: 'สมชาย ใจดี',
        studentId: '6610014111',
        requestId: 18,
        status: 'อนุมัติแล้ว (รอออกฝึกงาน)',
        comment: 'ขอให้เตรียมเอกสารและติดต่อสถานประกอบการตามวันเวลาที่กำหนด',
        company: 'บริษัท ตัวอย่างเทคโนโลยี จำกัด',
        position: 'นักพัฒนาเว็บไซต์',
        internshipStartDate: '2026-06-01',
        internshipEndDate: '2026-09-30',
        detailUrl: m.buildRequestDetailUrl(18),
      }),
  },
  {
    id: 'status-pending',
    label: 'แจ้งสถานะ — ยื่นคำร้องสำเร็จ (รออาจารย์ที่ปรึกษาอนุมัติ)',
    render: (m) =>
      m.buildStatusEmailHtml({
        studentName: 'สมหญิง รักเรียน',
        studentId: '6610014112',
        requestId: 21,
        status: 'ยื่นคำร้องสำเร็จ (รออาจารย์ที่ปรึกษาอนุมัติ)',
        company: 'ห้างหุ้นส่วนจำกัด ตัวอย่างการค้า',
        position: 'ผู้ช่วยฝ่ายบัญชี',
        detailUrl: m.buildRequestDetailUrl(21),
      }),
  },
  {
    id: 'status-rejected',
    label: 'แจ้งสถานะ — ไม่อนุมัติ (มีหมายเหตุ)',
    render: (m) =>
      m.buildStatusEmailHtml({
        studentName: 'สมศักดิ์ ตั้งใจ',
        studentId: '6610014113',
        requestId: 25,
        status: 'ไม่อนุมัติ (อาจารย์)',
        comment: 'ระยะเวลาฝึกงานไม่ครบตามเกณฑ์ที่กำหนด กรุณาแก้ไขข้อมูลแล้วยื่นคำร้องใหม่อีกครั้ง',
        company: 'บริษัท ตัวอย่างเทคโนโลยี จำกัด',
        position: 'ผู้ช่วยนักวิเคราะห์ข้อมูล',
        detailUrl: m.buildRequestDetailUrl(25),
      }),
  },
  {
    id: 'admin-eval',
    label: 'แจ้ง admin — บริษัทส่งผลประเมิน',
    render: (m) =>
      m.buildAdminEvaluationAlertHtml({
        studentName: 'สมชาย ใจดี',
        studentId: '6610014111',
        companyName: 'บริษัท ตัวอย่างเทคโนโลยี จำกัด',
        evaluatorName: 'คุณวิชัย ผู้ดูแล',
        evaluatorPosition: 'ผู้จัดการฝ่ายบุคคล',
        totalScore: 88,
        maxScore: 100,
        comments: 'นักศึกษามีความรับผิดชอบดีและเรียนรู้งานได้รวดเร็ว',
        detailUrl: m.buildRequestDetailUrl(18),
      }),
  },
  {
    id: 'student-eval',
    label: 'แจ้งนักศึกษา — บริษัทส่งผลประเมิน',
    render: (m) =>
      m.buildStudentEvaluationNoticeHtml({
        studentName: 'สมชาย ใจดี',
        companyName: 'บริษัท ตัวอย่างเทคโนโลยี จำกัด',
        detailUrl: m.buildRequestDetailUrl(18),
      }),
  },
  {
    id: 'company-eval',
    label: 'แจ้งบริษัท — ขอให้ทำแบบประเมิน',
    render: (m) =>
      m.buildCompanyEvaluationRequestHtml({
        studentName: 'สมชาย ใจดี',
        studentId: '6610014111',
        companyName: 'บริษัท ตัวอย่างเทคโนโลยี จำกัด',
        startDate: '1 มิถุนายน 2569',
        endDate: '30 กันยายน 2569',
        evalUrl: 'https://example.com/coop/public/evaluate/18',
      }),
  },
  {
    id: 'relocation-company',
    label: 'แจ้งบริษัทใหม่ — ขอรับนักศึกษา (ย้ายที่ฝึก)',
    render: (m) =>
      m.buildRelocationRequestHtml({
        companyName: 'บริษัท ตัวอย่างการค้า จำกัด',
        studentId: '6610014111',
        acceptanceLink: 'https://example.com/coop/public/company-acceptance/abc123',
      }),
  },
  {
    id: 'advisor-new',
    label: 'แจ้งอาจารย์ — คำร้องใหม่รออนุมัติ',
    render: (m) =>
      m.buildStaffAlertHtml({
        greeting: 'อาจารย์ที่ปรึกษา',
        intro: 'มีนักศึกษายื่นคำร้องขอฝึกงานเข้ามาใหม่ และรอการพิจารณาจากท่าน',
        headline: 'รออาจารย์ที่ปรึกษาอนุมัติ',
        rows: [
          ['นักศึกษา', 'สมชาย ใจดี (รหัส: 6610014111)'],
          ['เลขที่คำร้อง', '#18'],
          ['สถานประกอบการ', 'บริษัท ตัวอย่างเทคโนโลยี จำกัด'],
          ['ตำแหน่งงาน', 'นักพัฒนาเว็บไซต์'],
        ],
        detailUrl: 'http://localhost:5173/coop/advisor-dashboard',
        buttonLabel: 'เข้าสู่ระบบเพื่อพิจารณาคำร้อง',
        title: 'มีคำร้องฝึกงานรออนุมัติ',
      }),
  },
  {
    id: 'admin-pending',
    label: 'แจ้งแอดมิน — รอตรวจสอบ',
    render: (m) =>
      m.buildStaffAlertHtml({
        greeting: 'ผู้ดูแลระบบ',
        intro: 'คำร้องฝึกงานผ่านการอนุมัติจากอาจารย์ที่ปรึกษาแล้ว และรอการตรวจสอบจากท่าน',
        headline: 'รอผู้ดูแลระบบตรวจสอบ',
        rows: [
          ['นักศึกษา', 'สมชาย ใจดี (รหัส: 6610014111)'],
          ['เลขที่คำร้อง', '#18'],
          ['สถานประกอบการ', 'บริษัท ตัวอย่างเทคโนโลยี จำกัด'],
        ],
        noteTitle: 'หมายเหตุจากอาจารย์',
        note: 'อนุมัติ ข้อมูลครบถ้วน',
        detailUrl: 'http://localhost:5173/coop/admin-dashboard',
        buttonLabel: 'เข้าสู่ระบบเพื่อตรวจสอบคำร้อง',
        title: 'มีคำร้องรอตรวจสอบ',
      }),
  },
  {
    id: 'company-accepted',
    label: 'แจ้งแอดมิน — บริษัทตอบรับ',
    render: (m) =>
      m.buildStaffAlertHtml({
        greeting: 'ผู้ดูแลระบบ',
        intro: 'สถานประกอบการตอบรับนักศึกษาเข้าฝึกงานแล้ว กรุณากำหนดวันฝึกงานและแนบใบส่งตัว',
        label: 'ตอบรับแล้ว',
        headline: 'สถานประกอบการตอบรับแล้ว',
        theme: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
        rows: [
          ['นักศึกษา', 'สมชาย ใจดี (รหัส: 6610014111)'],
          ['สถานประกอบการ', 'บริษัท ตัวอย่างเทคโนโลยี จำกัด'],
        ],
        detailUrl: 'http://localhost:5173/coop/admin-dashboard',
        buttonLabel: 'เข้าสู่ระบบเพื่อกำหนดวันฝึกงาน',
        title: 'สถานประกอบการตอบรับแล้ว',
      }),
  },
];

const RECIPIENTS = {
  'status-approved': ['นักศึกษา', 'เจ้าของคำร้อง', 'เมื่อสถานะเปลี่ยนเป็น อนุมัติแล้ว / ออกฝึกงาน / สิ้นสุดการฝึกงาน / ฝึกงานเสร็จแล้ว'],
  'status-pending': ['นักศึกษา', 'เจ้าของคำร้อง', 'ครั้งเดียวตอนยื่นคำร้องสำเร็จ (ยืนยันรับเรื่อง + รออาจารย์ที่ปรึกษาอนุมัติ) ไม่ส่งซ้ำเมื่อสถานะเป็น "รออาจารย์ที่ปรึกษาอนุมัติ"'],
  'status-rejected': ['นักศึกษา', 'เจ้าของคำร้อง', 'เมื่อถูกไม่อนุมัติ / ปฏิเสธ / ยกเลิก / ส่งกลับแก้ไข'],
  'admin-eval': ['ผู้ดูแลระบบ (Admin)', 'ทุกคนที่เป็น role admin + ADMIN_EMAIL', 'เมื่อสถานประกอบการส่งแบบประเมิน (มีคะแนนรวม)'],
  'student-eval': ['นักศึกษา', 'เจ้าของคำร้อง', 'เมื่อสถานประกอบการส่งแบบประเมิน (ไม่แสดงคะแนน)'],
  'company-eval': ['ผู้ประเมินสถานประกอบการ', 'อีเมลผู้ประเมิน (evaluator_email) หรืออีเมลบริษัทของคำร้อง', 'เมื่ออาจารย์บันทึกผลนิเทศ'],
  'relocation-company': ['ผู้ประสานงานสถานประกอบการแห่งใหม่', 'อีเมลปลายทางที่แอดมินกรอก (เฉพาะเลือกส่งทางอีเมล)', 'เมื่อแอดมินออกหนังสือขอความอนุเคราะห์ของการขอย้ายที่ฝึก'],
  'advisor-new': ['อาจารย์ที่ปรึกษา', 'อาจารย์ role advisor ที่สาขาตรงกับคำร้อง (หรือไม่ระบุสาขา)', 'เมื่อนักศึกษายื่นคำร้องใหม่'],
  'admin-pending': ['ผู้ดูแลระบบ (Admin)', 'ทุกคนที่เป็น role admin + ADMIN_EMAIL', 'เมื่ออาจารย์อนุมัติแล้ว สถานะเป็น รอผู้ดูแลระบบตรวจสอบ'],
  'company-accepted': ['ผู้ดูแลระบบ (Admin)', 'ทุกคนที่เป็น role admin + ADMIN_EMAIL', 'เมื่อสถานประกอบการตอบรับ (หรือปฏิเสธ) ผ่านลิงก์สาธารณะ'],
};

const recipientBar = (id) => {
  const r = RECIPIENTS[id];
  if (!r) return '';
  return `<div class="to"><span><b>ส่งถึง:</b> ${escapeAttr(r[0])}</span><span><b>ผู้รับจริง:</b> ${escapeAttr(r[1])}</span><span><b>ส่งเมื่อ:</b> ${escapeAttr(r[2])}</span></div>`;
};

const escapeAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const indexPage = (activeId) => {
  const tabs = SAMPLES.map(
    (s) =>
      `<a class="tab${s.id === activeId ? ' on' : ''}" href="/?t=${escapeAttr(s.id)}">${escapeAttr(s.label)}</a>`
  ).join('');
  const src = `/render/${escapeAttr(activeId)}`;
  return `<!DOCTYPE html>
<html lang="th"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Email Preview</title>
<style>
  body { margin: 0; font-family: 'Segoe UI', Tahoma, sans-serif; background: #E2E8F0; color: #1E293B; }
  header { background: #fff; border-bottom: 1px solid #CBD5E1; padding: 12px 20px; position: sticky; top: 0; z-index: 2; }
  header h1 { margin: 0 0 10px 0; font-size: 15px; }
  header h1 span { color: #64748B; font-weight: 400; margin-left: 8px; }
  .tabs { display: flex; flex-wrap: wrap; gap: 6px; }
  .tab { padding: 6px 12px; border-radius: 8px; font-size: 13px; text-decoration: none; color: #475569; background: #F1F5F9; }
  .tab.on { background: #7C3AED; color: #fff; }
  .to { display: flex; flex-wrap: wrap; gap: 6px 20px; margin-top: 10px; padding: 8px 12px; background: #F5F3FF; border: 1px solid #DDD6FE; border-radius: 8px; font-size: 13px; color: #4C1D95; }
  .to b { color: #6D28D9; }
  main { display: flex; gap: 24px; justify-content: center; align-items: flex-start; padding: 24px; flex-wrap: wrap; }
  figure { margin: 0; }
  figcaption { font-size: 12px; color: #64748B; margin-bottom: 8px; text-align: center; }
  iframe { border: 0; background: #fff; box-shadow: 0 2px 12px rgba(15,23,42,.12); border-radius: 8px; height: 1100px; }
  .desktop iframe { width: 680px; }
  .mobile iframe { width: 375px; }
</style></head><body>
<header><h1>Email Preview<span>ไม่ส่งอีเมลจริง — แก้ src/utils/mailer.js แล้วบันทึก หน้านี้จะรีโหลดเอง</span></h1>
<div class="tabs">${tabs}</div>${recipientBar(activeId)}</header>
<main>
  <figure class="desktop"><figcaption>เดสก์ท็อป</figcaption><iframe src="${src}"></iframe></figure>
  <figure class="mobile"><figcaption>มือถือ (375px)</figcaption><iframe src="${src}"></iframe></figure>
</main>
<script>
  let version = null;
  setInterval(async () => {
    try {
      const v = await (await fetch('/__version')).text();
      if (version !== null && v !== version) location.reload();
      version = v;
    } catch (_) {}
  }, 800);
</script>
</body></html>`;
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/__version') {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
    return res.end(String(fs.statSync(MAILER_PATH).mtimeMs));
  }

  if (url.pathname.startsWith('/assets/')) {
    const file = path.join(ASSETS_DIR, path.basename(url.pathname));
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      return res.end();
    }
    const type = file.endsWith('.png') ? 'image/png' : file.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    return fs.createReadStream(file).pipe(res);
  }

  if (url.pathname.startsWith('/render/')) {
    const sample = SAMPLES.find((s) => s.id === decodeURIComponent(url.pathname.slice(8)));
    if (!sample) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('ไม่พบเทมเพลต');
    }
    try {
      const html = sample.render(loadMailer()).replace(/cid:lasc-header/g, '/assets/header.png');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(html);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(`เรนเดอร์เทมเพลตไม่สำเร็จ:\n${err.stack || err.message}`);
    }
  }

  const active = SAMPLES.some((s) => s.id === url.searchParams.get('t'))
    ? url.searchParams.get('t')
    : SAMPLES[0].id;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(indexPage(active));
});

server.listen(PORT, () => {
  console.log(`Email preview: http://localhost:${PORT}  (ไม่ส่งอีเมลจริง — กด Ctrl+C เพื่อหยุด)`);
  console.log(`เทมเพลต: ${SAMPLES.map((s) => s.id).join(', ')}`);
  console.log(`ไฟล์ที่เฝ้าดู: ${path.relative(process.cwd(), MAILER_PATH)}`);
});

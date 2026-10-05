const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'banners');
const ALLOWED_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
const MIME_BY_EXT = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB (decoded)
const PROXY_MAX_BYTES = 8 * 1024 * 1024; // 8MB สำหรับ remote fetch
const FETCH_TIMEOUT_MS = 10000;

// hostname ที่ห้าม proxy/fetch (กัน SSRF — loopback, private, metadata, internal domains)
const isBlockedHost = (hostname) => {
  const h = String(hostname || '').toLowerCase();
  if (!h) return true;
  if (/^(localhost|0\.0\.0\.0|::1|\[::1\]|.*\.(local|internal|lan|intranet|corp))$/.test(h)) return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(h)) return true;
  const m = /^172\.(\d{1,3})\./.exec(h);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  return false;
};

// ดึงรูปภาพจาก URL ภายนอกฝั่งเซิร์ฟเวอร์ — ไม่ส่ง Referer ทำให้ผ่าน hotlink protection (เช่น fbcdn)
const fetchRemoteImage = async (url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (_) {
    throw new Error('URL รูปภาพไม่ถูกต้อง');
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('รองรับเฉพาะลิงก์ http/https');
  if (isBlockedHost(parsed.hostname)) throw new Error('ไม่อนุญาตให้ดึงรูปจากโฮสต์นี้');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const upstream = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LASC-Banner/1.0',
        'Accept': 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
      },
    });
    if (!upstream.ok) throw new Error(`ดึงรูปไม่สำเร็จ (HTTP ${upstream.status})`);
    const contentType = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/')) throw new Error('ปลายทางไม่ใช่ไฟล์รูปภาพ');
    const declared = Number(upstream.headers.get('content-length') || 0);
    if (declared > PROXY_MAX_BYTES) throw new Error('ไฟล์รูปภาพต้องไม่เกิน 8MB');

    const reader = upstream.body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > PROXY_MAX_BYTES) {
        controller.abort();
        throw new Error('ไฟล์รูปภาพต้องไม่เกิน 8MB');
      }
      chunks.push(value);
    }
    return { buffer: Buffer.concat(chunks), contentType };
  } finally {
    clearTimeout(timer);
  }
};

// เขียน buffer ลง uploads/banners/ คืน path สำหรับ image_url
const writeImageFile = (buffer, ext) => {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = `banner-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/banners/${filename}`;
};

// บันทึกรูป base64 (data URL) ลง uploads/banners/ แล้วคืน path สำหรับเก็บใน image_url
const saveBase64Image = (dataUrl) => {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) throw new Error('รูปแบบไฟล์รูปภาพไม่ถูกต้อง');
  const ext = ALLOWED_MIME[match[1]];
  if (!ext) throw new Error('รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF');
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error('ไฟล์รูปภาพต้องไม่เกิน 5MB');
  return writeImageFile(buffer, ext);
};

// self-heal: เพิ่มคอลัมน์รูปแยกอุปกรณ์ถ้ายังไม่มี (กัน env ที่ยังไม่รัน migration)
let bannerColsReady = false;
const ensureBannerColumns = async () => {
  if (bannerColsReady) return;
  await pool.query(`ALTER TABLE banners
    ADD COLUMN IF NOT EXISTS image_url_tablet VARCHAR(500) NULL COMMENT 'รูปสำหรับแท็บเล็ต 768–1023px (แนะนำ 4:3)',
    ADD COLUMN IF NOT EXISTS image_url_mobile VARCHAR(500) NULL COMMENT 'รูปสำหรับมือถือ <768px (แนะนำแนวตั้ง 3:4)'`);
  bannerColsReady = true;
};

// ลบไฟล์รูปในเครื่อง (เฉพาะที่อยู่ใต้ /uploads/banners/ เท่านั้น)
const removeLocalImage = (imageUrl) => {
  if (!imageUrl || !imageUrl.startsWith('/uploads/banners/')) return;
  const filePath = path.join(UPLOAD_DIR, path.basename(imageUrl));
  fs.unlink(filePath, () => {});
};

const sanitizeColor = (value, fallback) => {
  const v = String(value || '').trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : fallback;
};

const OVERLAY_STYLES = ['gradient_purple', 'gradient_dark', 'solid_purple', 'solid', 'custom', 'none'];
const sanitizeOverlayStyle = (value) => (OVERLAY_STYLES.includes(value) ? value : 'gradient_purple');
const sanitizeContentMode = (value) => (value === 'poster' ? 'poster' : 'standard');
const sanitizeOpacity = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 75;
};

// แปลง input รูป 1 ช่อง (base64 > ดึง remote > URL ตรง) เป็น path/URL สุดท้าย
const resolveImageInput = async ({ url, base64, fetchRemote }) => {
  let final = url || null;
  if (base64) {
    final = saveBase64Image(base64);
  } else if (fetchRemote && /^https?:\/\//.test(final || '')) {
    // ดึงรูปจากลิงก์ภายนอก (เช่น Facebook CDN ที่ URL หมดอายุ) มาเก็บในระบบถาวร
    const { buffer, contentType } = await fetchRemoteImage(final);
    const ext = ALLOWED_MIME[contentType] || '.jpg';
    if (buffer.length > MAX_IMAGE_BYTES) throw new Error('ไฟล์รูปภาพต้องไม่เกิน 5MB');
    final = writeImageFile(buffer, ext);
  }
  return final;
};

const parseBody = async (req, { requireImage }) => {
  const { title, subtitle, image_url, image_base64, fetch_remote_image, image_url_tablet, image_base64_tablet, image_url_mobile, image_base64_mobile, link_url, link_label, display_order, is_active, title_color, subtitle_color, show_text_overlay, overlay_style, overlay_color, overlay_opacity, content_mode } = req.body;
  if (!title || !String(title).trim()) {
    throw new Error('กรุณาระบุหัวข้อแบนเนอร์');
  }
  const finalImageUrl = await resolveImageInput({ url: image_url, base64: image_base64, fetchRemote: fetch_remote_image });
  // variant รูปแยกอุปกรณ์: undefined = client ไม่ได้ส่ง (คงค่าเดิมใน DB), '' / null = เคลียร์, base64/url = เซ็ตใหม่
  const hasTabletInput = 'image_url_tablet' in req.body || 'image_base64_tablet' in req.body;
  const hasMobileInput = 'image_url_mobile' in req.body || 'image_base64_mobile' in req.body;
  // variant ลิงก์ภายนอกถูกดึงมาเก็บในระบบเสมอ (fetchRemote: true) — กันลิงก์หมดอายุเหมือนรูปหลัก
  const finalTabletUrl = hasTabletInput ? await resolveImageInput({ url: image_url_tablet, base64: image_base64_tablet, fetchRemote: true }) : undefined;
  const finalMobileUrl = hasMobileInput ? await resolveImageInput({ url: image_url_mobile, base64: image_base64_mobile, fetchRemote: true }) : undefined;
  if (requireImage && !finalImageUrl) {
    throw new Error('กรุณาอัปโหลดรูปภาพหรือระบุ URL รูปภาพ');
  }
  return {
    title: String(title).trim(),
    subtitle: subtitle ? String(subtitle).trim() : null,
    image_url: finalImageUrl,
    image_url_tablet: finalTabletUrl,
    image_url_mobile: finalMobileUrl,
    link_url: link_url ? String(link_url).trim() : null,
    link_label: link_label ? String(link_label).trim() : 'ดูรายละเอียด',
    display_order: Number.isFinite(Number(display_order)) ? Number(display_order) : 0,
    is_active: is_active === undefined ? 1 : (is_active ? 1 : 0),
    title_color: sanitizeColor(title_color, '#FFFFFF'),
    subtitle_color: sanitizeColor(subtitle_color, '#E2E8F0'),
    show_text_overlay: show_text_overlay === undefined ? 1 : (show_text_overlay ? 1 : 0),
    overlay_style: sanitizeOverlayStyle(overlay_style),
    overlay_color: sanitizeColor(overlay_color, '#4c1d95'),
    overlay_opacity: sanitizeOpacity(overlay_opacity),
    content_mode: sanitizeContentMode(content_mode),
  };
};

// GET /api/public/banners (no auth — Hero Carousel หน้าแรก)
router.get('/public/banners', async (req, res) => {
  try {
    await ensureBannerColumns();
    const [rows] = await pool.query(
      'SELECT id, title, subtitle, image_url, image_url_tablet, image_url_mobile, link_url, link_label, display_order, title_color, subtitle_color, show_text_overlay, overlay_style, overlay_color, overlay_opacity, content_mode FROM banners WHERE is_active = 1 ORDER BY display_order ASC, id ASC LIMIT 10'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/public/banners/proxy?url=... (no auth) — proxy รูปภาพภายนอกฝั่งเซิร์ฟเวอร์
// แก้ปัญหา hotlink protection (เช่น scontent.*.fbcdn.net ตอบ 403 เมื่อ browser ส่ง Referer)
router.get('/public/banners/proxy', async (req, res) => {
  try {
    const url = String(req.query.url || '');
    if (!/^https?:\/\//.test(url)) {
      return res.status(400).json({ success: false, message: 'ต้องเป็น URL http/https' });
    }
    const { buffer, contentType } = await fetchRemoteImage(url);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400, immutable');
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(buffer);
  } catch (error) {
    const status = /URL รูปภาพไม่ถูกต้อง|ไม่อนุญาต|รองรับเฉพาะ/.test(error.message) ? 400 : 502;
    res.status(status).json({ success: false, message: error.message });
  }
});

// GET /api/banners (admin — all banners)
router.get('/banners', authenticate, authorize('admin'), async (req, res) => {
  try {
    await ensureBannerColumns();
    const [rows] = await pool.query('SELECT * FROM banners ORDER BY display_order ASC, id ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/banners (admin — create)
router.post('/banners', authenticate, authorize('admin'), async (req, res) => {
  try {
    await ensureBannerColumns();
    const b = await parseBody(req, { requireImage: true });
    const [result] = await pool.query(
      'INSERT INTO banners (title, subtitle, image_url, image_url_tablet, image_url_mobile, link_url, link_label, display_order, is_active, title_color, subtitle_color, show_text_overlay, overlay_style, overlay_color, overlay_opacity, content_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [b.title, b.subtitle, b.image_url, b.image_url_tablet ?? null, b.image_url_mobile ?? null, b.link_url, b.link_label, b.display_order, b.is_active, b.title_color, b.subtitle_color, b.show_text_overlay, b.overlay_style, b.overlay_color, b.overlay_opacity, b.content_mode]
    );
    const [created] = await pool.query('SELECT * FROM banners WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'สร้างแบนเนอร์สำเร็จ', data: created[0] });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/banners/:id (admin — update)
router.put('/banners/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM banners WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ success: false, message: 'ไม่พบแบนเนอร์' });
    await ensureBannerColumns();
    const previousImages = [existing[0].image_url, existing[0].image_url_tablet, existing[0].image_url_mobile];

    const b = await parseBody(req, { requireImage: true });
    const finalTablet = b.image_url_tablet === undefined ? existing[0].image_url_tablet : b.image_url_tablet;
    const finalMobile = b.image_url_mobile === undefined ? existing[0].image_url_mobile : b.image_url_mobile;
    await pool.query(
      'UPDATE banners SET title = ?, subtitle = ?, image_url = ?, image_url_tablet = ?, image_url_mobile = ?, link_url = ?, link_label = ?, display_order = ?, is_active = ?, title_color = ?, subtitle_color = ?, show_text_overlay = ?, overlay_style = ?, overlay_color = ?, overlay_opacity = ?, content_mode = ? WHERE id = ?',
      [b.title, b.subtitle, b.image_url, finalTablet, finalMobile, b.link_url, b.link_label, b.display_order, b.is_active, b.title_color, b.subtitle_color, b.show_text_overlay, b.overlay_style, b.overlay_color, b.overlay_opacity, b.content_mode, req.params.id]
    );
    [b.image_url, finalTablet, finalMobile].forEach((url, i) => {
      if (previousImages[i] && previousImages[i] !== url) removeLocalImage(previousImages[i]);
    });
    const [updated] = await pool.query('SELECT * FROM banners WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'อัปเดตแบนเนอร์สำเร็จ', data: updated[0] });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PATCH /api/banners/reorder (admin — body: { ids: [3,1,2] } → display_order = ตำแหน่ง)
router.patch('/banners/reorder', authenticate, authorize('admin'), async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
    if (!ids || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาส่งรายการ ids สำหรับจัดลำดับ' });
    }
    await Promise.all(
      ids.map((id, index) =>
        pool.query('UPDATE banners SET display_order = ? WHERE id = ?', [index + 1, id])
      )
    );
    res.json({ success: true, message: 'จัดลำดับแบนเนอร์สำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/banners/:id/toggle (admin — toggle active)
router.patch('/banners/:id/toggle', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT is_active FROM banners WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบแบนเนอร์' });
    const newStatus = rows[0].is_active ? 0 : 1;
    await pool.query('UPDATE banners SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);
    res.json({ success: true, message: newStatus ? 'เปิดแสดงแบนเนอร์แล้ว' : 'ซ่อนแบนเนอร์แล้ว', is_active: newStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/banners/:id (admin — delete + remove local image file)
router.delete('/banners/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT image_url, image_url_tablet, image_url_mobile FROM banners WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบแบนเนอร์' });
    await pool.query('DELETE FROM banners WHERE id = ?', [req.params.id]);
    removeLocalImage(rows[0].image_url);
    removeLocalImage(rows[0].image_url_tablet);
    removeLocalImage(rows[0].image_url_mobile);
    res.json({ success: true, message: 'ลบแบนเนอร์สำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

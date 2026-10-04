import { API_BASE } from '../api/axios';

/**
 * แปลงค่าที่เก็บใน DB ให้เป็น URL ไฟล์ที่เปิดได้จริงบน Production
 *
 * รองรับทุกรูปแบบที่อาจติดมาในฐานข้อมูล:
 *  - data:image/...                → คืนตรงๆ
 *  - http:// / https://            → คืนตรงๆ (ลิงก์ภายนอก)
 *  - C:\...\uploads\x.png          → ตัดเอาเฉพาะ /uploads/x.png
 *  - /var/www/.../uploads/x.png    → ตัดเอาเฉพาะ /uploads/x.png
 *  - uploads/x.png, /uploads/x.png → normalize เป็น /uploads/x.png
 *  - filename.png (ชื่อไฟล์ล้วน)    → /uploads/filename.png
 *
 * Prefix ด้วย API_BASE (เช่น https://students.sci-sskru.com/coop/api)
 * เพราะ production proxy /coop/api → coop-backend และ express mount
 * static ไว้ทั้ง /uploads, /api/uploads และ /coop/api/uploads
 * — ห้ามตัด /api ทิ้ง มิฉะนั้น URL จะชน frontend dist แล้ว 404
 */
export const getUploadUrl = (storedPath) => {
  if (!storedPath) return '';
  const s = String(storedPath).trim();
  if (s.startsWith('data:')) return s;

  // URL เต็ม: ถ้าเป็นลิงก์ไฟล์ของระบบเอง (localhost / โดเมน prod) ให้ตัดเหลือ path —
  // ค่าเก่าที่เก็บเป็น http://localhost:5002/uploads/x.png จะได้แสดงผลบน production ด้วย
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      const isSelf = ['localhost', '127.0.0.1', 'students.sci-sskru.com'].includes(u.hostname);
      if (isSelf) {
        const idx = u.pathname.indexOf('/uploads/');
        if (idx >= 0) return `${API_BASE}${u.pathname.slice(idx)}`;
      }
      return s; // ลิงก์ภายนอกจริง ๆ (เช่น fbcdn) คืนตรง ๆ
    } catch {
      return s;
    }
  }

  const norm = s.replace(/\\/g, '/');
  const idx = norm.indexOf('/uploads/');
  let rel;
  if (idx >= 0) {
    rel = norm.slice(idx); // '/uploads/...'
  } else if (norm.startsWith('uploads/')) {
    rel = `/${norm}`;
  } else {
    rel = `/uploads/${norm.split('/').pop()}`;
  }
  return `${API_BASE}${rel}`;
};

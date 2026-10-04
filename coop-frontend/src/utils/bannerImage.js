import { API_BASE } from '../api/axios';
import { getUploadUrl } from './fileUrl';

// API origin สำหรับ resolve path รูปแบนเนอร์ที่เก็บใน DB (เช่น /uploads/banners/x.png)
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export const isExternalImageUrl = (imageUrl) => /^(https?:)?\/\//.test(imageUrl || '');

// รูปภาพภายนอก (เช่น scontent.*.fbcdn.net) ผ่าน proxy ฝั่ง backend เสมอ —
// เซิร์ฟเวอร์ดึงโดยไม่ส่ง Referer จึงผ่าน hotlink protection ที่ตอบ 403 ให้ browser
export const resolveBannerSrc = (imageUrl, fallback) => {
  if (!imageUrl) return fallback || '';
  if (imageUrl.startsWith('data:')) return imageUrl;
  if (isExternalImageUrl(imageUrl)) {
    const absolute = imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl;
    return `${API_BASE}/public/banners/proxy?url=${encodeURIComponent(absolute)}`;
  }
  return getUploadUrl(imageUrl);
};

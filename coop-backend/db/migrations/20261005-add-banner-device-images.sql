-- Migration: รูปแบนเนอร์แยกตามอุปกรณ์ (แท็บเล็ต/มือถือ)
-- image_url เดิม = เดสก์ท็อป/ค่า fallback; คอลัมน์ใหม่เว้นว่างได้ ระบบจะ fallback รูปหลัก
ALTER TABLE banners
  ADD COLUMN image_url_tablet VARCHAR(500) NULL COMMENT 'รูปสำหรับแท็บเล็ต 768–1023px (แนะนำ 4:3)',
  ADD COLUMN image_url_mobile VARCHAR(500) NULL COMMENT 'รูปสำหรับมือถือ <768px (แนะนำแนวตั้ง 3:4)';

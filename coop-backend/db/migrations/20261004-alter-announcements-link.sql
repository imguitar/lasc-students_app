-- Migration: เพิ่มลิงก์แนบภายนอกให้ข่าวสาร (เช่น Google Drive / PDF ประกาศ / เพจภายนอก)
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS link_url VARCHAR(500) NULL COMMENT 'ลิงก์แนบภายนอก เช่น Google Drive, PDF, เพจภายนอก' AFTER coverImage;

-- Migration: Home Content Editor Hub — ตาราง key-value สำหรับเนื้อหาหน้าแรก
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(100) PRIMARY KEY COMMENT 'คีย์การตั้งค่า เช่น urgent_announcement',
  setting_value TEXT NULL COMMENT 'ค่าข้อมูล (String หรือ JSON)',
  description VARCHAR(255) NULL COMMENT 'คำอธิบายการตั้งค่า',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ค่าเริ่มต้น: แถบประกาศด่วน + ข้อมูลติดต่อส่วนหัวเว็บ
INSERT INTO site_settings (setting_key, setting_value, description)
VALUES
  ('urgent_announcement', JSON_OBJECT('is_active', true, 'text', 'ประกาศด่วน: ระบบเปิดรับคำร้องฝึกงานตั้งแต่วันที่ 1 สิงหาคม เป็นต้นไป', 'link_url', ''), 'แถบประกาศด่วนบนหน้าแรก'),
  ('contact_info', JSON_OBJECT('phone', '02-XXX-XXXX', 'email', 'contact@sskru.ac.th'), 'ข้อมูลติดต่อส่วนหัวเว็บ')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

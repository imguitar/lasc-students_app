-- Migration: Banner Typography & Color Picker — สีตัวอักษรและการแสดง overlay ต่อแบนเนอร์
ALTER TABLE banners
  ADD COLUMN title_color VARCHAR(20) DEFAULT '#FFFFFF' COMMENT 'รหัสสีตัวอักษรหัวข้อ HEX เช่น #FFFFFF',
  ADD COLUMN subtitle_color VARCHAR(20) DEFAULT '#E2E8F0' COMMENT 'รหัสสีคำบรรยายย่อย',
  ADD COLUMN show_text_overlay TINYINT(1) DEFAULT 1 COMMENT '1 = แสดงข้อความบนภาพ, 0 = ซ่อนข้อความ (กรณีรูปมีข้อความในตัวแล้ว)';

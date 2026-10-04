-- Migration: Hero Banner Carousel
-- ตารางแบนเนอร์ประชาสัมพันธ์หน้าแรก (/coop) — แอดมินจัดการรูป ลิงก์ และลำดับการแสดงผล
CREATE TABLE IF NOT EXISTS banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL COMMENT 'หัวข้อหลักของแบนเนอร์',
  subtitle VARCHAR(255) NULL COMMENT 'คำบรรยายสั้น หรือชื่อคณะ/หน่วยงาน',
  image_url VARCHAR(500) NOT NULL COMMENT 'URL หรือ Relative Path ของรูปภาพ',
  link_url VARCHAR(500) NULL COMMENT 'ลิงก์ภายนอก เช่น ลิงก์เพจ Facebook, Google Form',
  link_label VARCHAR(100) DEFAULT 'ดูรายละเอียด' COMMENT 'ข้อความบนปุ่มกด',
  display_order INT DEFAULT 0 COMMENT 'ลำดับการแสดงผล',
  is_active TINYINT(1) DEFAULT 1 COMMENT '1 = แสดงผล, 0 = ซ่อน',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- แบนเนอร์เริ่มต้น: อาคารจุฬาภรณวลัยลักษณ์ (ไฟล์ต้นฉบับจาก frontend assets ถูกเสิร์ฟที่ /uploads/banners/)
INSERT INTO banners (id, title, subtitle, image_url, link_url, link_label, display_order, is_active)
SELECT
  1,
  'ระบบบริหารจัดการการฝึกประสบการณ์วิชาชีพและสหกิจศึกษา',
  'คณะศิลปศาสตร์และวิทยาศาสตร์',
  '/uploads/banners/banner-chulabhorn.png',
  NULL,
  'ดูรายละเอียด',
  1,
  1
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE id = 1);

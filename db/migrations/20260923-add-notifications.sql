-- ระบบแจ้งเตือนในแอป (Notification Center) — idempotent สำหรับฐานข้อมูล lascstudent ที่มีข้อมูลอยู่แล้ว
--
-- ผูกกับ user.id ของผู้รับโดยตรง ใช้แจ้งเตือนเหตุการณ์ต่าง ๆ เช่น
-- การกำหนดอาจารย์นิเทศ/วันนิเทศ และการบันทึกผลนิเทศเสร็จสิ้น
--
-- รัน 01-schema.sql ก่อน แล้วไฟล์นี้รันซ้ำได้โดยไม่เกิดข้อผิดพลาด

USE `lascstudent`;
-- จำเป็นสำหรับข้อความภาษาไทย: ถ้า client ต่อมาด้วย charset อื่นจะถูกเข้ารหัสซ้อน
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT DEFAULT NULL,
  `link` VARCHAR(255) DEFAULT NULL,
  `request_id` INT DEFAULT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_idx` (`user_id`),
  KEY `notifications_user_unread_idx` (`user_id`, `is_read`),
  CONSTRAINT `notifications_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

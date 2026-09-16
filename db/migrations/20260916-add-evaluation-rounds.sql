-- รอบการประเมินสถานประกอบการ — idempotent สำหรับฐานข้อมูล lascstudent ที่มีข้อมูลอยู่แล้ว
--
-- ระบบ Coop ใช้ตารางนี้กำหนดช่วงเวลาที่เปิดให้สถานประกอบการทำแบบประเมิน
-- นอกช่วงเวลาของรอบที่เปิดใช้งานอยู่ ระบบจะปิดทั้งหน้าแบบประเมินและการบันทึกผล
--
-- รัน 01-schema.sql ก่อน แล้วไฟล์นี้รันซ้ำได้โดยไม่เกิดข้อผิดพลาด

USE `lascstudent`;
-- จำเป็นสำหรับข้อความภาษาไทย: ถ้า client ต่อมาด้วย charset อื่นจะถูกเข้ารหัสซ้อน
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `evaluation_rounds` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `academicYear` VARCHAR(50) DEFAULT NULL,
  `semester` VARCHAR(50) DEFAULT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `evaluation_rounds_is_active_idx` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

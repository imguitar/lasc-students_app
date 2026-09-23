-- Migration: Add student_project_files table for file attachments
-- Date: 2026-09-20
-- Scope: Profile system only (student_projects is not used by Co-op)
-- Idempotent: safe to re-run

USE `lascstudent`;
SET NAMES utf8mb4;

-- ตารางเก็บไฟล์ที่แนบกับผลงานนักศึกษา (Portfolio)
CREATE TABLE IF NOT EXISTS `student_project_files` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `project_id` INT NOT NULL,
  `file_name` VARCHAR(255) NOT NULL COMMENT 'ชื่อไฟล์บน disk (UUID-based)',
  `original_name` VARCHAR(500) NOT NULL COMMENT 'ชื่อไฟล์ต้นฉบับที่ผู้ใช้อัปโหลด',
  `file_type` VARCHAR(100) NOT NULL COMMENT 'MIME type เช่น image/jpeg, application/pdf',
  `file_size` INT NOT NULL COMMENT 'ขนาดไฟล์เป็น bytes',
  `file_path` VARCHAR(1000) NOT NULL COMMENT 'relative path ภายในโฟลเดอร์ uploads/',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `spf_project_id_idx` (`project_id`),
  CONSTRAINT `spf_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `student_projects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

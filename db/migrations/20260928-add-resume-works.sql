-- Migration: 20260928-add-resume-works.sql
-- Description: เพิ่มตาราง resumes และ resume_works สำหรับเชื่อมโยงผลงานจากแฟ้มสะสมผลงาน (Portfolio: student_projects) มาแสดงในเรซูเม่ (Resume)
-- Database: lascstudent

USE `lascstudent`;

-- 1. ตาราง resumes (เก็บข้อมูล Resume ของนักศึกษาแต่ละคน)
CREATE TABLE IF NOT EXISTS `resumes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `profile_id` VARCHAR(13) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `resumes_profile_id_key` (`profile_id`),
  KEY `resumes_profile_id_idx` (`profile_id`),
  CONSTRAINT `resumes_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profile` (`profile_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ตาราง resume_works (เก็บความสัมพันธ์ M:N ระหว่าง Resume กับ ผลงานใน Portfolio / student_projects)
CREATE TABLE IF NOT EXISTS `resume_works` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `resume_id` INT NOT NULL,
  `portfolio_work_id` INT NOT NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `resume_works_resume_id_portfolio_work_id_key` (`resume_id`, `portfolio_work_id`),
  KEY `resume_works_resume_id_idx` (`resume_id`),
  KEY `resume_works_portfolio_work_id_idx` (`portfolio_work_id`),
  CONSTRAINT `resume_works_resume_id_fkey` FOREIGN KEY (`resume_id`) REFERENCES `resumes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `resume_works_portfolio_work_id_fkey` FOREIGN KEY (`portfolio_work_id`) REFERENCES `student_projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

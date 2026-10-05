-- Migration: 20260927-student-system-enhancements.sql
-- Description: เพิ่มโครงสร้างสำหรับ Advisor หลายคน, Chat Board แยกตามสาขา, News target groups, Resume Educations, และข้อมูลที่อยู่/การฝึกงาน
-- Database: lascstudent

USE `lascstudent`;

-- 1. ตาราง project_advisors (รองรับอาจารย์ที่ปรึกษาหลายคน: ที่ปรึกษาหลัก + ที่ปรึกษาร่วม)
CREATE TABLE IF NOT EXISTS `project_advisors` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `project_id` INT NOT NULL,
  `profile_id` VARCHAR(13) NOT NULL,
  `role` ENUM('main','co') NOT NULL DEFAULT 'main',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_advisors_project_profile_key` (`project_id`, `profile_id`),
  KEY `project_advisors_project_id_idx` (`project_id`),
  KEY `project_advisors_profile_id_idx` (`profile_id`),
  CONSTRAINT `project_advisors_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `project_advisors_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profile` (`profile_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ย้ายข้อมูลอาจารย์ที่ปรึกษาเดิมเข้าตาราง project_advisors เป็นที่ปรึกษาหลัก (main) โดยไม่ทำลายข้อมูลเดิม
INSERT IGNORE INTO `project_advisors` (`project_id`, `profile_id`, `role`)
SELECT `id`, `advisor_profile_id`, 'main'
FROM `projects`
WHERE `advisor_profile_id` IS NOT NULL AND `advisor_profile_id` != '';

-- 2. ตาราง department_posts และ department_comments (Chat Board แยกตามสาขา)
CREATE TABLE IF NOT EXISTS `department_posts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `department_id` INT NOT NULL,
  `author_profile_id` VARCHAR(13) NOT NULL,
  `author_name` VARCHAR(255) NOT NULL,
  `author_role` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `department_posts_department_id_idx` (`department_id`),
  KEY `department_posts_author_profile_id_idx` (`author_profile_id`),
  CONSTRAINT `department_posts_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `department_comments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `post_id` INT NOT NULL,
  `author_profile_id` VARCHAR(13) NOT NULL,
  `author_name` VARCHAR(255) NOT NULL,
  `author_role` VARCHAR(50) NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `department_comments_post_id_idx` (`post_id`),
  KEY `department_comments_author_profile_id_idx` (`author_profile_id`),
  CONSTRAINT `department_comments_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `department_posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. เพิ่มคอลัมน์ใน news_events (กลุ่มเป้าหมายผู้รับข่าว และวันสิ้นสุดกิจกรรม)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'news_events' AND COLUMN_NAME = 'target_type'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `news_events` ADD COLUMN `target_type` VARCHAR(50) NOT NULL DEFAULT "all"', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'news_events' AND COLUMN_NAME = 'faculty_id'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `news_events` ADD COLUMN `faculty_id` INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'news_events' AND COLUMN_NAME = 'department_id'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `news_events` ADD COLUMN `department_id` INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'news_events' AND COLUMN_NAME = 'year_level'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `news_events` ADD COLUMN `year_level` INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'news_events' AND COLUMN_NAME = 'end_date'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `news_events` ADD COLUMN `end_date` DATE NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. ตาราง student_educations (ประวัติการศึกษาแบบหลายระดับ)
CREATE TABLE IF NOT EXISTS `student_educations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `profile_id` VARCHAR(13) NOT NULL,
  `level` VARCHAR(100) NOT NULL,
  `institution_name` VARCHAR(255) NOT NULL,
  `major` VARCHAR(255) DEFAULT NULL,
  `start_year` INT DEFAULT NULL,
  `end_year` INT DEFAULT NULL,
  `gpa` VARCHAR(10) DEFAULT NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `student_educations_profile_id_idx` (`profile_id`),
  CONSTRAINT `student_educations_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profile` (`profile_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. เพิ่มคอลัมน์ใน student_addresses (บ้านเลขที่, หมู่, ถนน)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_addresses' AND COLUMN_NAME = 'house_no'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `student_addresses` ADD COLUMN `house_no` VARCHAR(50) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_addresses' AND COLUMN_NAME = 'village_no'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `student_addresses` ADD COLUMN `village_no` VARCHAR(50) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_addresses' AND COLUMN_NAME = 'road'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `student_addresses` ADD COLUMN `road` VARCHAR(100) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. เพิ่มคอลัมน์ใน internships (ผลงานจากการฝึกงาน และรูปภาพ/ไฟล์แนบ)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'internships' AND COLUMN_NAME = 'project_outcome'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `internships` ADD COLUMN `project_outcome` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'internships' AND COLUMN_NAME = 'attachment_url'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `internships` ADD COLUMN `attachment_url` VARCHAR(500) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Resume / Skills / Internship — idempotent สำหรับฐานข้อมูล lascstudent ที่มีข้อมูลอยู่แล้ว
--
-- เพิ่มข้อมูลประวัติส่วนตัวใน profile และตารางใหม่ 6 ตารางสำหรับ
-- ที่อยู่ ทักษะ ผลงานรายวิชา การฝึกงาน และประวัติการทำงานของศิษย์เก่า
--
-- ไม่เพิ่ม profile.phone เพราะฐานข้อมูลนี้มีอยู่แล้วตั้งแต่ 01-schema.sql
--
-- รัน 01-schema.sql ก่อน แล้วไฟล์นี้รันซ้ำได้โดยไม่เกิดข้อผิดพลาด

USE `lascstudent`;
-- จำเป็นสำหรับข้อความภาษาไทย: ถ้า client ต่อมาด้วย charset อื่นจะถูกเข้ารหัสซ้อน
SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS `add_column_if_missing`;

DELIMITER //
CREATE PROCEDURE `add_column_if_missing`(
  IN p_table_name VARCHAR(64),
  IN p_column_name VARCHAR(64),
  IN p_alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @alter_sql = p_alter_sql;
    PREPARE alter_statement FROM @alter_sql;
    EXECUTE alter_statement;
    DEALLOCATE PREPARE alter_statement;
  END IF;
END//
DELIMITER ;

-- 1) คอลัมน์ประวัติส่วนตัวใน profile
CALL `add_column_if_missing`('profile', 'first_name_en',
  'ALTER TABLE `profile` ADD COLUMN `first_name_en` VARCHAR(100) DEFAULT NULL');
CALL `add_column_if_missing`('profile', 'last_name_en',
  'ALTER TABLE `profile` ADD COLUMN `last_name_en` VARCHAR(100) DEFAULT NULL');
CALL `add_column_if_missing`('profile', 'birth_date',
  'ALTER TABLE `profile` ADD COLUMN `birth_date` DATE DEFAULT NULL');
CALL `add_column_if_missing`('profile', 'avatar_url',
  'ALTER TABLE `profile` ADD COLUMN `avatar_url` VARCHAR(500) DEFAULT NULL');
CALL `add_column_if_missing`('profile', 'bio',
  'ALTER TABLE `profile` ADD COLUMN `bio` TEXT DEFAULT NULL');
CALL `add_column_if_missing`('profile', 'graduation_year',
  'ALTER TABLE `profile` ADD COLUMN `graduation_year` INT DEFAULT NULL');
CALL `add_column_if_missing`('profile', 'linkedin_url',
  'ALTER TABLE `profile` ADD COLUMN `linkedin_url` VARCHAR(500) DEFAULT NULL');
CALL `add_column_if_missing`('profile', 'github_url',
  'ALTER TABLE `profile` ADD COLUMN `github_url` VARCHAR(500) DEFAULT NULL');
CALL `add_column_if_missing`('profile', 'portfolio_url',
  'ALTER TABLE `profile` ADD COLUMN `portfolio_url` VARCHAR(500) DEFAULT NULL');

-- 2) ตารางใหม่
CREATE TABLE IF NOT EXISTS `student_addresses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `profile_id` VARCHAR(13) NOT NULL,
  `type` ENUM('current','registered') NOT NULL DEFAULT 'current',
  `address_line` VARCHAR(255) DEFAULT NULL,
  `subdistrict` VARCHAR(100) DEFAULT NULL,
  `district` VARCHAR(100) DEFAULT NULL,
  `province` VARCHAR(100) DEFAULT NULL,
  `postal_code` VARCHAR(10) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `student_addresses_profile_id_idx` (`profile_id`),
  CONSTRAINT `student_addresses_profile_id_fkey`
    FOREIGN KEY (`profile_id`) REFERENCES `profile` (`profile_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `skills` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `category` ENUM('programming','framework','database','tools','soft_skills','language','other') NOT NULL DEFAULT 'other',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `skills_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `student_skills` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `profile_id` VARCHAR(13) NOT NULL,
  `skill_id` INT NOT NULL,
  `level` ENUM('beginner','intermediate','advanced','expert') NOT NULL DEFAULT 'intermediate',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_skills_profile_id_skill_id_key` (`profile_id`, `skill_id`),
  KEY `student_skills_skill_id_idx` (`skill_id`),
  CONSTRAINT `student_skills_profile_id_fkey`
    FOREIGN KEY (`profile_id`) REFERENCES `profile` (`profile_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_skills_skill_id_fkey`
    FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `student_projects` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `profile_id` VARCHAR(13) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `academic_year` INT DEFAULT NULL,
  `semester` INT DEFAULT NULL,
  `course_name` VARCHAR(200) DEFAULT NULL,
  `technologies` JSON DEFAULT NULL,
  `github_url` VARCHAR(500) DEFAULT NULL,
  `demo_url` VARCHAR(500) DEFAULT NULL,
  `image_url` VARCHAR(500) DEFAULT NULL,
  `document_url` VARCHAR(500) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'completed',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `student_projects_profile_id_idx` (`profile_id`),
  CONSTRAINT `student_projects_profile_id_fkey`
    FOREIGN KEY (`profile_id`) REFERENCES `profile` (`profile_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `internships` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `profile_id` VARCHAR(13) NOT NULL,
  `company_name` VARCHAR(255) NOT NULL,
  `position` VARCHAR(100) NOT NULL,
  `department` VARCHAR(100) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `hours` INT DEFAULT 0,
  `description` TEXT DEFAULT NULL,
  `skills_used` JSON DEFAULT NULL,
  `evaluation_score` DOUBLE DEFAULT NULL,
  `evaluation_status` VARCHAR(50) DEFAULT 'pending',
  `status` ENUM('in_progress','completed','cancelled') NOT NULL DEFAULT 'in_progress',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `internships_profile_id_idx` (`profile_id`),
  CONSTRAINT `internships_profile_id_fkey`
    FOREIGN KEY (`profile_id`) REFERENCES `profile` (`profile_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `alumni_employments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `profile_id` VARCHAR(13) NOT NULL,
  `company_name` VARCHAR(255) NOT NULL,
  `position` VARCHAR(100) NOT NULL,
  `department` VARCHAR(100) DEFAULT NULL,
  `job_type` ENUM('full_time','part_time','contract','freelance','internship') DEFAULT 'full_time',
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `is_current` TINYINT(1) NOT NULL DEFAULT 1,
  `description` TEXT DEFAULT NULL,
  `location` VARCHAR(200) DEFAULT NULL,
  `company_url` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `alumni_employments_profile_id_idx` (`profile_id`),
  CONSTRAINT `alumni_employments_profile_id_fkey`
    FOREIGN KEY (`profile_id`) REFERENCES `profile` (`profile_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE `add_column_if_missing`;

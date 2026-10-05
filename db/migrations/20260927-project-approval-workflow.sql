-- Migration: 20260927-project-approval-workflow.sql
-- Description: เพิ่มระบบคำขออนุมัติโครงการ (Approval Workflow) และประวัติการอนุมัติ (Audit Log)
-- Database: lascstudent

USE `lascstudent`;

-- 1. เพิ่มคอลัมน์ใน projects สำหรับระบบคำขออนุมัติ
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'approval_status'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `projects` ADD COLUMN `approval_status` VARCHAR(30) NOT NULL DEFAULT "draft"', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'approval_requested_at'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `projects` ADD COLUMN `approval_requested_at` DATETIME(3) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'approved_at'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `projects` ADD COLUMN `approved_at` DATETIME(3) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'approved_by'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `projects` ADD COLUMN `approved_by` VARCHAR(13) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'rejected_at'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `projects` ADD COLUMN `rejected_at` DATETIME(3) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'rejected_by'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `projects` ADD COLUMN `rejected_by` VARCHAR(13) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'rejection_reason'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `projects` ADD COLUMN `rejection_reason` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- อัปเดตข้อมูลโครงงานเดิม: หากมีสถานะเดิมเป็น approved, in_progress, waiting_defense, passed_defense, completed ให้ปรับ approval_status = 'approved'
UPDATE `projects` 
SET `approval_status` = 'approved' 
WHERE `status` IN ('approved', 'in_progress', 'waiting_defense', 'passed_defense', 'completed') AND `approval_status` = 'draft';

-- 2. สร้างตาราง project_approval_history สำหรับเก็บประวัติการอนุมัติ (Audit Log)
CREATE TABLE IF NOT EXISTS `project_approval_history` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `project_id` INT NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `requested_by` VARCHAR(13) NULL,
  `requested_at` DATETIME(3) NULL,
  `acted_by` VARCHAR(13) NOT NULL,
  `acted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `rejection_reason` TEXT NULL,
  `comments` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `project_approval_history_project_id_idx` (`project_id`),
  KEY `project_approval_history_acted_by_idx` (`acted_by`),
  CONSTRAINT `project_approval_history_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

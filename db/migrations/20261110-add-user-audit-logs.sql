-- Migration: Admin User Management Audit Logs
-- Created: 2026-11-10
-- Description: Add user_audit_logs table for tracking user account creation, updates, role changes, status changes, password resets, and deletions

USE `lascstudent`;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `user_audit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `action` VARCHAR(50) NOT NULL COMMENT 'CREATE_USER | UPDATE_USER | CHANGE_ROLE | SUSPEND_USER | ACTIVATE_USER | RESET_PASSWORD | DELETE_USER',
  `actor_id` INT DEFAULT NULL COMMENT 'user.id ของ Admin ผู้ดำเนินการ',
  `actor_username` VARCHAR(191) NOT NULL COMMENT 'username ของ Admin ผู้ดำเนินการ',
  `actor_name` VARCHAR(255) DEFAULT NULL COMMENT 'ชื่อ-นามสกุลของ Admin ผู้ดำเนินการ',
  `target_user_id` INT DEFAULT NULL COMMENT 'user.id ของบัญชีเป้าหมาย',
  `target_username` VARCHAR(191) NOT NULL COMMENT 'username ของบัญชีเป้าหมาย',
  `target_name` VARCHAR(255) DEFAULT NULL COMMENT 'ชื่อ-นามสกุลของบัญชีเป้าหมาย',
  `details` JSON DEFAULT NULL COMMENT 'รายละเอียดการเปลี่ยนแปลง (ไม่เก็บรหัสผ่าน)',
  `ip_address` VARCHAR(64) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_user_audit_logs_action` (`action`),
  KEY `idx_user_audit_logs_actor_id` (`actor_id`),
  KEY `idx_user_audit_logs_target_user_id` (`target_user_id`),
  KEY `idx_user_audit_logs_target_username` (`target_username`),
  KEY `idx_user_audit_logs_created_at` (`created_at`),
  CONSTRAINT `fk_user_audit_logs_actor`
    FOREIGN KEY (`actor_id`) REFERENCES `user` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


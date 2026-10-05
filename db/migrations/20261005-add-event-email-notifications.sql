-- Migration: Event Email Notifications
-- Created: 2026-10-05
-- Description: Add event_email_notifications table for logging and tracking news & event email notifications

USE `lascstudent`;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `event_email_notifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `news_event_id` INT NOT NULL COMMENT 'รหัสข่าวกิจกรรม',
  `user_id` INT NULL COMMENT 'รหัสผู้ใช้ในตาราง user',
  `recipient_email` VARCHAR(191) NOT NULL COMMENT 'อีเมลผู้รับ',
  `recipient_name` VARCHAR(255) NULL COMMENT 'ชื่อ-นามสกุลผู้รับ',
  `recipient_role` VARCHAR(50) NULL COMMENT 'role: student | advisor | etc.',
  `status` ENUM('PENDING', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING' COMMENT 'สถานะการส่ง',
  `error_message` TEXT NULL COMMENT 'ข้อความ error กรณีล้มเหลว',
  `batch_id` VARCHAR(50) NULL COMMENT 'UUID / Batch ID ของรอบการส่ง',
  `sent_at` DATETIME(3) NULL COMMENT 'เวลาที่ส่งสำเร็จหรือล้มเหลว',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_event_email_news_event_id` (`news_event_id`),
  KEY `idx_event_email_user_id` (`user_id`),
  KEY `idx_event_email_status` (`status`),
  KEY `idx_event_email_event_user` (`news_event_id`, `user_id`),
  KEY `idx_event_email_event_email` (`news_event_id`, `recipient_email`),
  KEY `idx_event_email_batch_id` (`batch_id`),
  CONSTRAINT `fk_event_email_news_event`
    FOREIGN KEY (`news_event_id`) REFERENCES `news_events` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_event_email_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: Add news_events table for news and event management
-- Date: 2026-09-20
-- Scope: Profile system only
-- Idempotent: safe to re-run

USE `lascstudent`;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `news_events` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `type` VARCHAR(100) NOT NULL,
  `event_date` DATE NOT NULL,
  `start_time` VARCHAR(20) NULL,
  `end_time` VARCHAR(20) NULL,
  `location` VARCHAR(255) NULL,
  `image_url` VARCHAR(500) NULL,
  `attachment_url` VARCHAR(500) NULL,
  `is_pinned` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_published` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_by` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_news_events_date` (`event_date`),
  KEY `idx_news_events_type` (`type`),
  KEY `idx_news_events_published` (`is_published`),
  CONSTRAINT `news_events_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `user` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

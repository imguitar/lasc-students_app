-- Migration: Student Year Promotion System
-- Created: 2026-10-05
-- Description: Add tables for batch student year promotion with history tracking

USE `lascstudent`;
SET NAMES utf8mb4;

-- รอบการเลื่อนชั้นปี
CREATE TABLE IF NOT EXISTS `promotion_batches` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `academic_year` INT NOT NULL COMMENT 'ปีการศึกษา (พ.ศ.)',
  `from_year` INT NOT NULL COMMENT 'ชั้นปีต้นทาง (1-4)',
  `to_year` INT NOT NULL COMMENT 'ชั้นปีปลายทาง (2-4, หรือ 5 = สำเร็จการศึกษา)',
  `effective_date` DATE NOT NULL COMMENT 'วันที่มีผล',
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT 'pending | executed | cancelled',
  `notes` TEXT DEFAULT NULL,
  `total_eligible` INT NOT NULL DEFAULT 0,
  `total_promoted` INT NOT NULL DEFAULT 0,
  `created_by` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `executed_at` DATETIME(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_promotion_batches_status` (`status`),
  KEY `idx_promotion_batches_academic_year` (`academic_year`),
  CONSTRAINT `fk_promotion_batches_user`
    FOREIGN KEY (`created_by`) REFERENCES `user` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ประวัติการเลื่อนชั้นรายบุคคล
CREATE TABLE IF NOT EXISTS `promotion_histories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `batch_id` INT NOT NULL,
  `profile_id` VARCHAR(13) NOT NULL,
  `from_year` INT NOT NULL,
  `to_year` INT NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'promoted' COMMENT 'promoted | skipped',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_promotion_histories_batch` (`batch_id`),
  KEY `idx_promotion_histories_profile` (`profile_id`),
  UNIQUE KEY `uk_promotion_histories_batch_profile` (`batch_id`, `profile_id`),
  CONSTRAINT `fk_promotion_histories_batch`
    FOREIGN KEY (`batch_id`) REFERENCES `promotion_batches` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_promotion_histories_profile`
    FOREIGN KEY (`profile_id`) REFERENCES `profile` (`profile_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

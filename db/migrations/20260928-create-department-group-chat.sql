-- ==========================================================
-- Migration: Department Group Chat System
-- Date: 2026-09-28
-- Description: Creates chat_rooms, chat_messages, and chat_message_reactions tables
-- ==========================================================

USE `lascstudent`;

-- 1. Create chat_rooms table
CREATE TABLE IF NOT EXISTS `chat_rooms` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `department_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chat_rooms_department_id` (`department_id`),
  CONSTRAINT `fk_chat_rooms_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create chat_messages table
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `room_id` INT NOT NULL,
  `author_profile_id` VARCHAR(13) NOT NULL,
  `author_name` VARCHAR(255) NOT NULL,
  `author_role` VARCHAR(50) NOT NULL,
  `author_year` INT NULL,
  `message` TEXT NOT NULL,
  `file_url` VARCHAR(500) NULL,
  `file_name` VARCHAR(255) NULL,
  `file_size` INT NULL,
  `file_type` VARCHAR(100) NULL,
  `image_url` VARCHAR(500) NULL,
  `reply_to_message_id` INT NULL,
  `is_edited` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_chat_messages_room_created` (`room_id`, `created_at`),
  KEY `idx_chat_messages_author` (`author_profile_id`),
  CONSTRAINT `fk_chat_messages_room` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_messages_author` FOREIGN KEY (`author_profile_id`) REFERENCES `profile` (`profile_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_messages_reply` FOREIGN KEY (`reply_to_message_id`) REFERENCES `chat_messages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create chat_message_reactions table
CREATE TABLE IF NOT EXISTS `chat_message_reactions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `message_id` INT NOT NULL,
  `user_profile_id` VARCHAR(13) NOT NULL,
  `user_name` VARCHAR(255) NOT NULL,
  `reaction_type` VARCHAR(20) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_message_user_reaction` (`message_id`, `user_profile_id`, `reaction_type`),
  KEY `idx_reactions_message` (`message_id`),
  CONSTRAINT `fk_reactions_message` FOREIGN KEY (`message_id`) REFERENCES `chat_messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reactions_user` FOREIGN KEY (`user_profile_id`) REFERENCES `profile` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Seed / Auto-populate one chat room for each department in departments table
INSERT INTO `chat_rooms` (`department_id`, `name`, `created_at`, `updated_at`)
SELECT `id`, CONCAT('ห้องแชท', `department_name`), NOW(3), NOW(3)
FROM `departments`
WHERE `id` NOT IN (SELECT `department_id` FROM `chat_rooms`);

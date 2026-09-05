-- Canonical schema for both LASC Students applications.
-- MySQL 8.0 / database: lascstudent
-- This file contains structure only. It intentionally contains no user data.

CREATE DATABASE IF NOT EXISTS `lascstudent`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `lascstudent`;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `faculties` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `faculty_name` VARCHAR(200) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `faculty_id` INT NOT NULL,
  `department_id` VARCHAR(50) NOT NULL,
  `department_name` VARCHAR(200) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `departments_department_id_key` (`department_id`),
  KEY `departments_faculty_id_idx` (`faculty_id`),
  CONSTRAINT `departments_faculty_id_fkey`
    FOREIGN KEY (`faculty_id`) REFERENCES `faculties` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password` VARCHAR(191) NOT NULL,
  `role` ENUM('student','alumni','admin','advisor') NOT NULL DEFAULT 'student',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `studentId` VARCHAR(191) DEFAULT NULL,
  `department` VARCHAR(191) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_username_key` (`username`),
  UNIQUE KEY `user_email_key` (`email`),
  KEY `user_student_id_idx` (`studentId`),
  KEY `user_role_idx` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No faculty/department foreign keys here: the Coop app supports incomplete
-- imported profiles with faculty_id/department_id = 0.
CREATE TABLE IF NOT EXISTS `profile` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `profile_id` VARCHAR(13) NOT NULL,
  `prefix` VARCHAR(50) DEFAULT NULL,
  `firstname` VARCHAR(50) NOT NULL DEFAULT '',
  `lastname` VARCHAR(50) NOT NULL DEFAULT '',
  `faculty_id` INT NOT NULL DEFAULT 0,
  `department_id` INT NOT NULL DEFAULT 0,
  `address` TEXT DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `profile_profile_id_key` (`profile_id`),
  KEY `profile_faculty_id_idx` (`faculty_id`),
  KEY `profile_department_id_idx` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `project_id` VARCHAR(30) NOT NULL,
  `title_th` VARCHAR(500) NOT NULL,
  `title_en` VARCHAR(500) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `advisor_profile_id` VARCHAR(13) DEFAULT NULL,
  `year` INT NOT NULL,
  `document_url` VARCHAR(500) DEFAULT NULL,
  `status` ENUM('Draft','Approved','Completed') NOT NULL DEFAULT 'Draft',
  `type` ENUM('individual','group') NOT NULL DEFAULT 'individual',
  `has_award` TINYINT(1) NOT NULL DEFAULT 0,
  `tags` JSON DEFAULT NULL,
  `created_by_profile_id` VARCHAR(13) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `projects_project_id_key` (`project_id`),
  KEY `projects_advisor_profile_id_idx` (`advisor_profile_id`),
  KEY `projects_created_by_profile_id_idx` (`created_by_profile_id`),
  CONSTRAINT `projects_advisor_profile_id_fkey`
    FOREIGN KEY (`advisor_profile_id`) REFERENCES `profile` (`profile_id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `projects_created_by_profile_id_fkey`
    FOREIGN KEY (`created_by_profile_id`) REFERENCES `profile` (`profile_id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_comments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `project_id` INT NOT NULL,
  `author_profile_id` VARCHAR(13) NOT NULL,
  `message` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `project_comments_project_id_idx` (`project_id`),
  KEY `project_comments_author_profile_id_idx` (`author_profile_id`),
  CONSTRAINT `project_comments_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `project_comments_author_profile_id_fkey`
    FOREIGN KEY (`author_profile_id`) REFERENCES `profile` (`profile_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_members` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `project_id` INT NOT NULL,
  `profile_id` VARCHAR(13) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `project_members_project_id_idx` (`project_id`),
  KEY `project_members_profile_id_idx` (`profile_id`),
  UNIQUE KEY `project_members_project_profile_key` (`project_id`, `profile_id`),
  CONSTRAINT `project_members_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `project_members_profile_id_fkey`
    FOREIGN KEY (`profile_id`) REFERENCES `profile` (`profile_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `companies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `businessType` VARCHAR(255) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `province` VARCHAR(100) DEFAULT NULL,
  `contactPerson` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(100) DEFAULT NULL,
  `email` VARCHAR(191) DEFAULT NULL,
  `website` VARCHAR(255) DEFAULT NULL,
  `positions` TEXT DEFAULT NULL,
  `benefits` TEXT DEFAULT NULL,
  `imageUrl` LONGTEXT DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `department` VARCHAR(255) DEFAULT NULL,
  `departments` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `companies_name_idx` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `requests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `studentId` VARCHAR(50) NOT NULL,
  `studentName` VARCHAR(255) DEFAULT NULL,
  `department` VARCHAR(200) DEFAULT NULL,
  `company` VARCHAR(255) DEFAULT NULL,
  `position` VARCHAR(200) DEFAULT NULL,
  `submittedDate` DATETIME DEFAULT NULL,
  `status` VARCHAR(100) DEFAULT 'รออาจารย์ที่ปรึกษาอนุมัติ',
  `details` JSON DEFAULT NULL,
  `admin_comment` TEXT DEFAULT NULL,
  `advisor_comment` TEXT DEFAULT NULL,
  `company_comment` TEXT DEFAULT NULL,
  `dispatchLetter` LONGTEXT DEFAULT NULL,
  `supervisionAppointment` LONGTEXT DEFAULT NULL,
  `internship_start_date` DATE DEFAULT NULL,
  `internship_end_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `requests_student_id_idx` (`studentId`),
  KEY `requests_status_idx` (`status`),
  KEY `requests_department_idx` (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `daily_checkins` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `studentId` VARCHAR(50) NOT NULL,
  `studentName` VARCHAR(255) DEFAULT NULL,
  `date` DATE NOT NULL,
  `status` ENUM('present','late','absent') DEFAULT 'present',
  `note` TEXT DEFAULT NULL,
  `work_experience` TEXT DEFAULT NULL,
  `supervisor_signature` LONGTEXT DEFAULT NULL,
  `supervisor_name` VARCHAR(255) DEFAULT NULL,
  `supervisor_comment` TEXT DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `daily_checkins_student_date_key` (`studentId`, `date`),
  KEY `daily_checkins_student_id_idx` (`studentId`),
  KEY `daily_checkins_date_idx` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_proofs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `studentId` VARCHAR(50) NOT NULL,
  `studentName` VARCHAR(255) DEFAULT NULL,
  `date` VARCHAR(50) DEFAULT NULL,
  `status` ENUM('pending','approved','rejected') DEFAULT 'pending',
  `department` VARCHAR(200) DEFAULT NULL,
  `slipDataUrl` LONGTEXT DEFAULT NULL,
  `slipFileName` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payment_proofs_student_id_idx` (`studentId`),
  KEY `payment_proofs_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `announcements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(500) NOT NULL,
  `content` TEXT NOT NULL,
  `category` VARCHAR(100) DEFAULT 'ทั่วไป',
  `coverImage` LONGTEXT DEFAULT NULL,
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `author` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `evaluations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `requestId` INT NOT NULL,
  `studentId` VARCHAR(50) NOT NULL,
  `evaluatorName` VARCHAR(255) DEFAULT NULL,
  `evaluatorPosition` VARCHAR(255) DEFAULT NULL,
  `evaluatorDepartment` VARCHAR(255) DEFAULT NULL,
  `q1` INT DEFAULT NULL, `q2` INT DEFAULT NULL, `q3` INT DEFAULT NULL, `q4` INT DEFAULT NULL,
  `q5` INT DEFAULT NULL, `q6` INT DEFAULT NULL, `q7` INT DEFAULT NULL, `q8` INT DEFAULT NULL,
  `q9` INT DEFAULT NULL, `q10` INT DEFAULT NULL, `q11` INT DEFAULT NULL, `q12` INT DEFAULT NULL,
  `q13` INT DEFAULT NULL, `q14` INT DEFAULT NULL, `q15` INT DEFAULT NULL, `q16` INT DEFAULT NULL,
  `q17` INT DEFAULT NULL, `q18` INT DEFAULT NULL, `q19` INT DEFAULT NULL, `q20` INT DEFAULT NULL,
  `strengths` TEXT DEFAULT NULL,
  `improvements` TEXT DEFAULT NULL,
  `hireFuture` VARCHAR(50) DEFAULT NULL,
  `overallScore` VARCHAR(50) DEFAULT NULL,
  `projectUsage` VARCHAR(100) DEFAULT NULL,
  `otherComments` TEXT DEFAULT NULL,
  `signature` LONGTEXT DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `evaluations_request_id_idx` (`requestId`),
  CONSTRAINT `evaluations_request_id_fkey`
    FOREIGN KEY (`requestId`) REFERENCES `requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `advisor_evaluations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `requestId` INT NOT NULL,
  `advisorName` VARCHAR(255) DEFAULT NULL,
  `c1` INT DEFAULT NULL, `c2` INT DEFAULT NULL, `c3` INT DEFAULT NULL, `c4` INT DEFAULT NULL,
  `c5` INT DEFAULT NULL, `c6` INT DEFAULT NULL, `c7` INT DEFAULT NULL, `c8` INT DEFAULT NULL,
  `c9` INT DEFAULT NULL, `c10` INT DEFAULT NULL, `c11` INT DEFAULT NULL, `c12` INT DEFAULT NULL,
  `c13` INT DEFAULT NULL, `c14` INT DEFAULT NULL, `c15` INT DEFAULT NULL, `c16` INT DEFAULT NULL,
  `c17` INT DEFAULT NULL,
  `companyComments` TEXT DEFAULT NULL,
  `s1` INT DEFAULT NULL, `s2` INT DEFAULT NULL, `s3` INT DEFAULT NULL, `s4` INT DEFAULT NULL,
  `s5` INT DEFAULT NULL, `s6` INT DEFAULT NULL, `s7` INT DEFAULT NULL, `s8` INT DEFAULT NULL,
  `s9` INT DEFAULT NULL, `s10` INT DEFAULT NULL, `s11` INT DEFAULT NULL, `s12` INT DEFAULT NULL,
  `s13` INT DEFAULT NULL, `s14` INT DEFAULT NULL, `s15` INT DEFAULT NULL, `s16` INT DEFAULT NULL,
  `s17` INT DEFAULT NULL, `s18` INT DEFAULT NULL, `s19` INT DEFAULT NULL, `s20` INT DEFAULT NULL,
  `studentComments` TEXT DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `advisor_evaluations_request_id_idx` (`requestId`),
  CONSTRAINT `advisor_evaluations_request_id_fkey`
    FOREIGN KEY (`requestId`) REFERENCES `requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

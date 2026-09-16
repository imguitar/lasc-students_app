-- One-time, idempotent alignment for an existing lascstudent production DB.
-- Run 01-schema.sql first so any entirely missing tables are created.

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

CALL `add_column_if_missing`('user', 'studentId',
  'ALTER TABLE `user` ADD COLUMN `studentId` VARCHAR(191) DEFAULT NULL');
CALL `add_column_if_missing`('user', 'department',
  'ALTER TABLE `user` ADD COLUMN `department` VARCHAR(191) DEFAULT NULL');
CALL `add_column_if_missing`('user', 'phone',
  'ALTER TABLE `user` ADD COLUMN `phone` VARCHAR(50) DEFAULT NULL');

CALL `add_column_if_missing`('profile', 'prefix',
  'ALTER TABLE `profile` ADD COLUMN `prefix` VARCHAR(50) DEFAULT NULL');
CALL `add_column_if_missing`('profile', 'phone',
  'ALTER TABLE `profile` ADD COLUMN `phone` VARCHAR(50) DEFAULT NULL');

CALL `add_column_if_missing`('companies', 'department',
  'ALTER TABLE `companies` ADD COLUMN `department` VARCHAR(255) DEFAULT NULL');
CALL `add_column_if_missing`('companies', 'departments',
  'ALTER TABLE `companies` ADD COLUMN `departments` TEXT DEFAULT NULL');

CALL `add_column_if_missing`('daily_checkins', 'supervisor_signature',
  'ALTER TABLE `daily_checkins` ADD COLUMN `supervisor_signature` LONGTEXT DEFAULT NULL');
CALL `add_column_if_missing`('daily_checkins', 'supervisor_name',
  'ALTER TABLE `daily_checkins` ADD COLUMN `supervisor_name` VARCHAR(255) DEFAULT NULL');
CALL `add_column_if_missing`('daily_checkins', 'supervisor_comment',
  'ALTER TABLE `daily_checkins` ADD COLUMN `supervisor_comment` TEXT DEFAULT NULL');

CALL `add_column_if_missing`('requests', 'company_comment',
  'ALTER TABLE `requests` ADD COLUMN `company_comment` TEXT DEFAULT NULL');
CALL `add_column_if_missing`('requests', 'internship_start_date',
  'ALTER TABLE `requests` ADD COLUMN `internship_start_date` DATE DEFAULT NULL');
CALL `add_column_if_missing`('requests', 'internship_end_date',
  'ALTER TABLE `requests` ADD COLUMN `internship_end_date` DATE DEFAULT NULL');

UPDATE `requests`
SET `internship_start_date` = DATE(`updated_at`)
WHERE `status` = 'ออกฝึกงาน'
  AND `internship_start_date` IS NULL;

DROP PROCEDURE `add_column_if_missing`;

-- Graduation / Portfolio และการแปลงสถานะโครงงาน
-- idempotent สำหรับฐานข้อมูล lascstudent ที่มีข้อมูลอยู่แล้ว
--
-- ⚠️ ไฟล์นี้แปลงข้อมูลจริงในคอลัมน์ projects.status
--    จาก 3 ค่าตัวใหญ่ ('Draft','Approved','Completed')
--    เป็น 6 ค่าตัวเล็ก ('draft','approved','in_progress','waiting_defense','passed_defense','completed')
--    แถวเดิมจะถูก map: Draft->draft, Approved->approved, Completed->completed
--    สำรองข้อมูลด้วย mysqldump ก่อนรันเสมอ
--
-- รัน 01-schema.sql และ 20260916-add-resume-skills-internships.sql ก่อน
-- ไฟล์นี้รันซ้ำได้โดยไม่เกิดข้อผิดพลาด

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

-- 1) ข้อมูลการสำเร็จการศึกษา
CALL `add_column_if_missing`('profile', 'graduation_batch',
  'ALTER TABLE `profile` ADD COLUMN `graduation_batch` VARCHAR(50) DEFAULT NULL');
CALL `add_column_if_missing`('profile', 'graduation_date',
  'ALTER TABLE `profile` ADD COLUMN `graduation_date` DATE DEFAULT NULL');
CALL `add_column_if_missing`('profile', 'student_status',
  'ALTER TABLE `profile` ADD COLUMN `student_status` VARCHAR(30) DEFAULT ''active''');

-- 2) ข้อมูลผลงานสำหรับ portfolio
CALL `add_column_if_missing`('student_projects', 'skills_used',
  'ALTER TABLE `student_projects` ADD COLUMN `skills_used` JSON DEFAULT NULL');
CALL `add_column_if_missing`('student_projects', 'internship_company',
  'ALTER TABLE `student_projects` ADD COLUMN `internship_company` VARCHAR(255) DEFAULT NULL');
CALL `add_column_if_missing`('student_projects', 'is_published',
  'ALTER TABLE `student_projects` ADD COLUMN `is_published` TINYINT(1) NOT NULL DEFAULT 1');
CALL `add_column_if_missing`('student_projects', 'link_url',
  'ALTER TABLE `student_projects` ADD COLUMN `link_url` VARCHAR(500) DEFAULT NULL');
CALL `add_column_if_missing`('student_projects', 'year',
  'ALTER TABLE `student_projects` ADD COLUMN `year` INT DEFAULT NULL');

DROP PROCEDURE `add_column_if_missing`;

-- 3) แปลงสถานะโครงงาน
--    คลายเป็น VARCHAR ก่อน เพื่อให้เขียนค่าตัวเล็กลงไปได้ระหว่างแปลง
--    ขั้นตอนนี้รันซ้ำได้ เพราะ UPDATE ครอบคลุมทั้งค่าเดิมและค่าที่แปลงแล้ว
ALTER TABLE `projects` MODIFY `status` VARCHAR(50) NOT NULL DEFAULT 'draft';

UPDATE `projects` SET `status` = 'draft'     WHERE `status` IN ('Draft', 'draft');
UPDATE `projects` SET `status` = 'approved'  WHERE `status` IN ('Approved', 'approved');
UPDATE `projects` SET `status` = 'completed' WHERE `status` IN ('Completed', 'completed');

-- แถวที่มีค่านอกเหนือจากที่รู้จัก ให้กลับไปเป็น draft แทนที่จะกลายเป็นค่าว่างตอน MODIFY
UPDATE `projects`
SET `status` = 'draft'
WHERE `status` NOT IN ('draft','approved','in_progress','waiting_defense','passed_defense','completed');

ALTER TABLE `projects`
  MODIFY `status` ENUM('draft','approved','in_progress','waiting_defense','passed_defense','completed')
  NOT NULL DEFAULT 'draft';

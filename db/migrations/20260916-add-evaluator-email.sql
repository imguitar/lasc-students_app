-- อีเมลผู้ประเมินจากสถานประกอบการ — idempotent สำหรับฐานข้อมูล lascstudent ที่มีข้อมูลอยู่แล้ว
--
-- ระบบ Coop ใช้คอลัมน์นี้เก็บอีเมลของพี่เลี้ยง/ผู้ประเมินฝั่งสถานประกอบการ
-- เพื่อส่งลิงก์แบบประเมินให้อัตโนมัติหลังอาจารย์บันทึกผลการนิเทศ
-- ค่าเดิมที่เคยเก็บไว้ใน details.evaluatorEmail (JSON) จะถูกย้ายขึ้นมาเป็นคอลัมน์จริง
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

CALL `add_column_if_missing`('requests', 'evaluator_email',
  'ALTER TABLE `requests` ADD COLUMN `evaluator_email` VARCHAR(191) DEFAULT NULL AFTER `internship_end_date`');

-- ย้ายค่าที่เคยเก็บไว้ใน details JSON ขึ้นมาเป็นคอลัมน์ (เฉพาะแถวที่ยังว่าง)
UPDATE `requests`
SET `evaluator_email` = COALESCE(
      JSON_UNQUOTE(JSON_EXTRACT(`details`, '$.evaluatorEmail')),
      JSON_UNQUOTE(JSON_EXTRACT(`details`, '$.contactEmail'))
    )
WHERE `evaluator_email` IS NULL
  AND `details` IS NOT NULL
  AND JSON_VALID(`details`)
  AND COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(`details`, '$.evaluatorEmail')),
        JSON_UNQUOTE(JSON_EXTRACT(`details`, '$.contactEmail'))
      ) IS NOT NULL;

DROP PROCEDURE `add_column_if_missing`;

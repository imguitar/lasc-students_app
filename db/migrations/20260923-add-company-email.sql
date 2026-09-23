-- อีเมลสถานประกอบการ (company_email) ในตาราง requests
-- สำหรับบันทึกและจดจำอีเมลติดต่อล่าสุดของสถานประกอบการเมื่อมีการตอบรับเข้าฝึกงาน
--
-- รันซ้ำได้โดยไม่เกิดข้อผิดพลาด (Idempotent)

USE `lascstudent`;
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

CALL `add_column_if_missing`('requests', 'company_email',
  'ALTER TABLE `requests` ADD COLUMN `company_email` VARCHAR(191) DEFAULT NULL AFTER `evaluator_email`');

-- ย้ายค่าเดิมที่เคยเก็บไว้ใน details JSON ขึ้นมาเป็นคอลัมน์ (เฉพาะแถวที่ยังว่าง)
UPDATE `requests`
SET `company_email` = COALESCE(
      NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`details`, '$.companyEmail')), 'null'),
      NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`details`, '$.contactEmail')), 'null')
    )
WHERE `company_email` IS NULL
  AND `details` IS NOT NULL
  AND JSON_VALID(`details`)
  AND COALESCE(
        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`details`, '$.companyEmail')), 'null'),
        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`details`, '$.contactEmail')), 'null')
      ) IS NOT NULL;

DROP PROCEDURE `add_column_if_missing`;

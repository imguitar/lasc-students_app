-- ประธานสาขาวิชา (Department Head) — idempotent สำหรับฐานข้อมูล lascstudent ที่มีข้อมูลอยู่แล้ว
--
-- โมเดลกลาง: `departments`.`department_head_id` -> `profile`.`id` เป็นแหล่งความจริงเพียงแห่งเดียว
-- ทั้งระบบ Profile และ Coop อ่านค่าจากคอลัมน์นี้ (Coop join ผ่าน user.username = profile.profile_id)
-- จงใจไม่เพิ่ม `user`.`isDepartmentHead` เพื่อไม่ให้มีแหล่งความจริงซ้อนกันสองที่
--
-- รัน 01-schema.sql ก่อน เพื่อให้แน่ใจว่าตาราง departments และ profile มีอยู่แล้ว
-- ไฟล์นี้รันซ้ำได้โดยไม่เกิดข้อผิดพลาด

USE `lascstudent`;
-- จำเป็นสำหรับข้อความภาษาไทย: ถ้า client ต่อมาด้วย charset อื่นจะถูกเข้ารหัสซ้อน
SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS `add_column_if_missing`;
DROP PROCEDURE IF EXISTS `add_index_if_missing`;
DROP PROCEDURE IF EXISTS `add_foreign_key_if_missing`;

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

CREATE PROCEDURE `add_index_if_missing`(
  IN p_table_name VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND INDEX_NAME = p_index_name
  ) THEN
    SET @alter_sql = p_alter_sql;
    PREPARE alter_statement FROM @alter_sql;
    EXECUTE alter_statement;
    DEALLOCATE PREPARE alter_statement;
  END IF;
END//

CREATE PROCEDURE `add_foreign_key_if_missing`(
  IN p_table_name VARCHAR(64),
  IN p_constraint_name VARCHAR(64),
  IN p_alter_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND CONSTRAINT_NAME = p_constraint_name
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    SET @alter_sql = p_alter_sql;
    PREPARE alter_statement FROM @alter_sql;
    EXECUTE alter_statement;
    DEALLOCATE PREPARE alter_statement;
  END IF;
END//

DELIMITER ;

-- 1) คอลัมน์
CALL `add_column_if_missing`('departments', 'department_head_id',
  'ALTER TABLE `departments` ADD COLUMN `department_head_id` INT DEFAULT NULL AFTER `is_active`');

-- 2) index
CALL `add_index_if_missing`('departments', 'departments_department_head_id_idx',
  'ALTER TABLE `departments` ADD KEY `departments_department_head_id_idx` (`department_head_id`)');

-- 3) ล้างค่ากำพร้าก่อนผูก FK
--    ปกติคอลัมน์เพิ่งถูกสร้างจึงเป็น NULL ทั้งหมด แต่เผื่อกรณีรันค้างไว้รอบก่อน
UPDATE `departments` d
LEFT JOIN `profile` p ON p.`id` = d.`department_head_id`
SET d.`department_head_id` = NULL
WHERE d.`department_head_id` IS NOT NULL
  AND p.`id` IS NULL;

-- 4) foreign key
--    ON DELETE SET NULL: ลบ profile ของอาจารย์แล้วสาขายังอยู่ เพียงแต่ว่างประธาน
CALL `add_foreign_key_if_missing`('departments', 'departments_department_head_id_fkey',
  'ALTER TABLE `departments` ADD CONSTRAINT `departments_department_head_id_fkey` FOREIGN KEY (`department_head_id`) REFERENCES `profile` (`id`) ON DELETE SET NULL ON UPDATE CASCADE');

DROP PROCEDURE `add_column_if_missing`;
DROP PROCEDURE `add_index_if_missing`;
DROP PROCEDURE `add_foreign_key_if_missing`;

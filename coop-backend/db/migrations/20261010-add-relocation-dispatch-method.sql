-- เพิ่มวิธีนำส่งหนังสือ/ลิงก์ตอบรับถึงสถานประกอบการใหม่ (แอดมินส่งอีเมลตรง หรือให้นักศึกษานำส่งเอง)
-- idempotent — MySQL 8 ไม่รองรับ ADD COLUMN IF NOT EXISTS บางเวอร์ชัน จึงเช็คก่อน
SET @db := DATABASE();
SET @add_dispatch_method := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'internship_relocation_requests' AND COLUMN_NAME = 'dispatch_method');
SET @add_recipient_email := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'internship_relocation_requests' AND COLUMN_NAME = 'recipient_email');
SET @add_dispatched_at := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'internship_relocation_requests' AND COLUMN_NAME = 'dispatched_at');

SET @sql1 := IF(@add_dispatch_method = 0,
  "ALTER TABLE internship_relocation_requests ADD COLUMN dispatch_method ENUM('student_delivery','admin_email') DEFAULT 'student_delivery' AFTER relocation_round",
  'SELECT 1');
SET @sql2 := IF(@add_recipient_email = 0,
  'ALTER TABLE internship_relocation_requests ADD COLUMN recipient_email VARCHAR(255) NULL AFTER dispatch_method',
  'SELECT 1');
SET @sql3 := IF(@add_dispatched_at = 0,
  'ALTER TABLE internship_relocation_requests ADD COLUMN dispatched_at DATETIME NULL AFTER recipient_email',
  'SELECT 1');

PREPARE s1 FROM @sql1; EXECUTE s1; DEALLOCATE PREPARE s1;
PREPARE s2 FROM @sql2; EXECUTE s2; DEALLOCATE PREPARE s2;
PREPARE s3 FROM @sql3; EXECUTE s3; DEALLOCATE PREPARE s3;

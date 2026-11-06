-- ล้างข้อมูลที่ชุดทดสอบ E2E (tests/e2e/run.js) สร้างไว้ในฐานข้อมูล lascstudent
-- ลบเฉพาะข้อมูลของนักศึกษาทดสอบ 6610014111 และรอบฝึกงานที่ชื่อขึ้นต้นด้วย [E2E]
-- ใช้: docker exec -i lasc-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 lascstudent' < tests/e2e/cleanup.sql
SET NAMES utf8mb4;

DELETE FROM evaluations WHERE requestId IN (SELECT id FROM requests WHERE studentId = '6610014111');
DELETE FROM advisor_evaluations WHERE requestId IN (SELECT id FROM requests WHERE studentId = '6610014111');
DELETE FROM notifications WHERE request_id IN (SELECT id FROM requests WHERE studentId = '6610014111');
DELETE FROM daily_checkins WHERE studentId = '6610014111';
DELETE FROM payment_proofs WHERE studentId = '6610014111';
DELETE FROM requests WHERE studentId = '6610014111';
DELETE FROM internship_rounds WHERE title LIKE '[E2E]%';

-- InnoDB ตั้งค่าเป็น MAX(id)+1 ให้เองถ้าตารางยังมีข้อมูลอื่นอยู่
ALTER TABLE evaluations AUTO_INCREMENT = 1;
ALTER TABLE advisor_evaluations AUTO_INCREMENT = 1;
ALTER TABLE notifications AUTO_INCREMENT = 1;
ALTER TABLE daily_checkins AUTO_INCREMENT = 1;
ALTER TABLE payment_proofs AUTO_INCREMENT = 1;
ALTER TABLE requests AUTO_INCREMENT = 1;
ALTER TABLE internship_rounds AUTO_INCREMENT = 1;

SELECT
  (SELECT COUNT(*) FROM requests WHERE studentId = '6610014111') AS requests_left,
  (SELECT COUNT(*) FROM daily_checkins WHERE studentId = '6610014111') AS checkins_left,
  (SELECT COUNT(*) FROM payment_proofs WHERE studentId = '6610014111') AS payments_left,
  (SELECT COUNT(*) FROM internship_rounds WHERE title LIKE '[E2E]%') AS e2e_rounds_left;

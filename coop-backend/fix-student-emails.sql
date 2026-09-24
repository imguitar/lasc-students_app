-- ============================================================
-- Migration: แก้ไขอีเมลนักศึกษาโดเมนเดิม @student.sskru.ac.th
--            ให้เป็นรูปแบบทางการ stu{student_id}@sskru.ac.th
-- รัน: mysql -u <user> -p <database> < fix-student-emails.sql
-- หมายเหตุ: อีเมลจริงที่ไม่ใช่โดเมนเก่าจะไม่ถูกแตะต้อง
-- ============================================================

-- 1) ตาราง user — อีเมลนักศึกษาที่เป็นโดเมนเดิม → stu{username}@sskru.ac.th
UPDATE `user`
SET email = CONCAT('stu', username, '@sskru.ac.th')
WHERE email LIKE '%@student.sskru.ac.th'
  AND username IS NOT NULL
  AND username <> '';

-- 2) ตาราง requests — details.student_info.email → stu{studentId}@sskru.ac.th
UPDATE requests
SET details = JSON_SET(
    details,
    '$.student_info.email',
    CONCAT('stu', studentId, '@sskru.ac.th')
)
WHERE JSON_UNQUOTE(JSON_EXTRACT(details, '$.student_info.email'))
      LIKE '%@student.sskru.ac.th'
  AND studentId IS NOT NULL
  AND studentId <> '';

-- 3) ตาราง requests — details.studentPhone ไม่เกี่ยวกับอีเมล ข้าม
--    ส่วน details.contactEmail คืออีเมลสถานประกอบการ ไม่แตะต้อง

-- 4) ตรวจสอบผลหลังรัน (ควรได้ 0 ทั้งหมด)
SELECT COUNT(*) AS remaining_user_old_domain
FROM `user`
WHERE email LIKE '%@student.sskru.ac.th';

SELECT COUNT(*) AS remaining_request_old_domain
FROM requests
WHERE JSON_UNQUOTE(JSON_EXTRACT(details, '$.student_info.email'))
      LIKE '%@student.sskru.ac.th';

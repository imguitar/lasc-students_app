-- เพิ่มสถานะ 'sick','personal','holiday' (ลาป่วย/ลากิจ/วันหยุด) ให้ daily_checkins — ไม่นับเป็นวันขาดงาน
ALTER TABLE `daily_checkins`
  MODIFY COLUMN `status` ENUM('present','late','absent','sick','personal','holiday') DEFAULT 'present';

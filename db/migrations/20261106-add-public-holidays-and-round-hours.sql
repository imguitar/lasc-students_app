-- วันหยุดนักขัตฤกษ์ที่แอดมินจัดการได้ + ชั่วโมงฝึกต่อรอบ (สำหรับคำนวณวันสิ้นสุดฝึกงานอัตโนมัติ)
-- coop-backend สร้างตาราง/คอลัมน์ให้เองตอนรัน (holidayRoutes.js, internshipRoundRoutes.js)
-- ไฟล์นี้มีไว้สำหรับ deploy ด้วยมือหรือฐานข้อมูลที่ไม่ได้ให้สิทธิ์ ALTER กับแอป
-- รายการวันหยุดตั้งต้น (ปี 2568-2570) แอปเติมให้อัตโนมัติเมื่อตารางว่าง จาก coop-backend/src/utils/thaiHolidaysSeed.js

CREATE TABLE IF NOT EXISTS `public_holidays` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `public_holidays_date_key` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MySQL ไม่รองรับ ADD COLUMN IF NOT EXISTS — รันบรรทัดนี้ครั้งเดียว (ถ้าคอลัมน์มีแล้วจะ error ได้ ไม่กระทบข้อมูล)
ALTER TABLE `internship_rounds`
  ADD COLUMN `requiredHours` INT NOT NULL DEFAULT 300
  COMMENT 'ชั่วโมงฝึกตามหลักสูตร — วันสิ้นสุดคำนวณจากวันเริ่ม + วันทำการ (จ.-ศ. ไม่รวมวันหยุด)'
  AFTER `endDate`;

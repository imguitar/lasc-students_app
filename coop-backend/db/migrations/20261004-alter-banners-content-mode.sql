ALTER TABLE banners
ADD COLUMN content_mode ENUM('standard', 'poster') DEFAULT 'standard'
COMMENT 'standard = ภาพถ่ายทั่วไปที่มีข้อความทับ, poster = ภาพกราฟิกสำเร็จรูป ซ่อนข้อความทับ';

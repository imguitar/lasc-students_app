# Database initialization

โฟลเดอร์นี้เป็นแหล่ง SQL กลางเพียงแห่งเดียวของทั้งระบบ Profile และ Coop

- `01-schema.sql` สร้างฐานข้อมูลและโครงสร้างตารางทั้งหมด โดยไม่มีข้อมูลผู้ใช้
- `02-reference-data.sql` เพิ่มเฉพาะคณะและสาขาวิชาที่ระบบต้องใช้
- `migrations/20260904-align-existing-schema.sql` ปรับฐานข้อมูล production เดิมให้มีคอลัมน์ที่ระบบปัจจุบันใช้

MySQL Docker image จะรันไฟล์ตามลำดับชื่อเฉพาะตอนสร้าง data volume ครั้งแรกเท่านั้น
การแก้ไฟล์เหล่านี้จะไม่เปลี่ยนฐานข้อมูลหรือ volume ที่มีอยู่แล้วโดยอัตโนมัติ

ก่อนสร้าง volume ใหม่บน production ให้สำรองข้อมูลจริงด้วย `mysqldump` เสมอ

สำหรับฐานข้อมูลเดิม ให้สำรองข้อมูลก่อน แล้วรันตามลำดับ:

```bash
mysql -ulascstudent -p lascstudent < db/01-schema.sql
mysql -ulascstudent -p lascstudent < db/02-reference-data.sql
mysql -ulascstudent -p lascstudent < db/migrations/20260904-align-existing-schema.sql
```

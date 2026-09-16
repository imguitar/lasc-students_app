# Database initialization

โฟลเดอร์นี้เป็นแหล่ง SQL กลางเพียงแห่งเดียวของทั้งระบบ Profile และ Coop

- `01-schema.sql` สร้างฐานข้อมูลและโครงสร้างตารางทั้งหมด โดยไม่มีข้อมูลผู้ใช้
- `02-reference-data.sql` เพิ่มเฉพาะคณะและสาขาวิชาที่ระบบต้องใช้
- `migrations/20260904-align-existing-schema.sql` ปรับฐานข้อมูล production เดิมให้มีคอลัมน์ที่ระบบปัจจุบันใช้
- `migrations/20260916-add-department-head.sql` เพิ่ม `departments.department_head_id` สำหรับฟีเจอร์ประธานสาขาวิชา
- `migrations/20260916-add-evaluator-email.sql` เพิ่ม `requests.evaluator_email` สำหรับส่งแบบประเมินให้สถานประกอบการ

MySQL Docker image จะรันไฟล์ที่อยู่ในโฟลเดอร์นี้โดยตรงตามลำดับชื่อ เฉพาะตอนสร้าง data volume ครั้งแรกเท่านั้น
และจะไม่ลงไปใน `migrations/` ไฟล์ใน `migrations/` จึงต้องรันเองเสมอ
ทุกไฟล์ในโฟลเดอร์นี้เขียนให้รันซ้ำได้โดยไม่เกิดข้อผิดพลาด
การแก้ไฟล์เหล่านี้จะไม่เปลี่ยนฐานข้อมูลหรือ volume ที่มีอยู่แล้วโดยอัตโนมัติ

ก่อนสร้าง volume ใหม่บน production ให้สำรองข้อมูลจริงด้วย `mysqldump` เสมอ

สำหรับฐานข้อมูลเดิม ให้สำรองข้อมูลก่อน แล้วรันตามลำดับ:

```bash
mysql -ulascstudent -p lascstudent < db/01-schema.sql
mysql -ulascstudent -p lascstudent < db/02-reference-data.sql
mysql -ulascstudent -p lascstudent < db/migrations/20260904-align-existing-schema.sql
mysql -ulascstudent -p lascstudent < db/migrations/20260916-add-department-head.sql
mysql -ulascstudent -p lascstudent < db/migrations/20260916-add-evaluator-email.sql
```

## ประธานสาขาวิชา (Department Head)

`departments.department_head_id` -> `profile.id` เป็นแหล่งความจริงเพียงแห่งเดียวของทั้งสองระบบ

- ระบบ Profile เขียนค่าผ่าน `PUT /api/departments/:id/head`
- ระบบ Coop อ่านอย่างเดียว โดย join `user.username = profile.profile_id` แล้วต่อไปยัง `departments.department_head_id`
  (อยู่ใน `USER_SELECT_SQL` ของ `coop-backend/src/utils/helpers.js` จึงส่งออกมาเป็น `isDepartmentHead` ทุก endpoint ที่ใช้ SQL นี้)
- จงใจไม่เพิ่มคอลัมน์ `user.isDepartmentHead` เพื่อไม่ให้มีแหล่งความจริงซ้อนกันสองที่
- สิทธิ์กำหนดอาจารย์นิเทศ (`PATCH /api/requests/:id/appointment` ของ Coop) ตรวจจากฐานข้อมูลทุกครั้ง
  ไม่เก็บไว้ใน JWT เพื่อให้เปลี่ยนประธานแล้วสิทธิ์เปลี่ยนทันทีโดยไม่ต้อง login ใหม่

หนึ่งสาขามีประธานได้คนเดียว และผู้ที่จะเป็นประธานต้องมีแถวใน `profile`
ตรวจอาจารย์ที่ยังไม่มี profile ได้ด้วย:

```sql
SELECT u.id, u.username, u.department
FROM `user` u
LEFT JOIN `profile` p ON p.profile_id = u.username
WHERE u.role = 'advisor' AND p.id IS NULL;
```

## อีเมลผู้ประเมินจากสถานประกอบการ

`requests.evaluator_email` เก็บอีเมลของพี่เลี้ยง/ผู้ประเมินฝั่งสถานประกอบการ
ระบบจะส่งลิงก์แบบประเมินไปยังอีเมลนี้อัตโนมัติเมื่ออาจารย์บันทึกผลการนิเทศ

- สถานประกอบการกรอกเองตอนตอบรับนักศึกษา (หน้า public request)
- Admin และอาจารย์แก้ไขได้ภายหลัง ส่วนนักศึกษาแก้ไม่ได้
- ชื่อและตำแหน่งผู้ประเมินเก็บใน `details.evaluatorName` / `details.evaluatorPosition`
- migration จะย้ายค่าเดิมจาก `details.evaluatorEmail` และ `details.contactEmail` ขึ้นมาให้อัตโนมัติ

ต้องตั้งค่า `SMTP_*` และ `COOP_PUBLIC_URL` ใน `.env` จึงจะส่งอีเมลจริง
ถ้าไม่ตั้ง ระบบจะบันทึกผลนิเทศตามปกติแต่แจ้งว่ายังไม่ได้ส่งอีเมล และ log ลิงก์ไว้ใน console แทน

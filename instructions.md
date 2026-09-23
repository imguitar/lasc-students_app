# ข้อมูลบริบทและข้อกำหนดระบบ: LASC Cooperative Education System (Monorepo)

## 1. ขอบเขตโปรเจกต์และข้อห้ามสำคัญ
- **โฟลเดอร์ที่พัฒนาได้:** ทำงานเฉพาะภายใน `coop-frontend/` และ `coop-backend/` เท่านั้น
- **โฟลเดอร์ห้ามแตะต้อง (เด็ดขาด):** ห้ามแก้ไขไฟล์ใดๆ ใน `profile-backend/` หรือ `profile-frontend/` โดยเด็ดขาด ทั้งสองโมดูลนี้เป็นระบบของพาร์ตเนอร์ เราทำได้เพียงอ่าน Schema/Query แบบ Read-only หรือรันเซิร์ฟเวอร์เพื่อทดสอบระบบ SSO ร่วมกันเท่านั้น

## 2. Tech Stack และสภาพแวดล้อม
- **Frontend:** React + Vite + Tailwind CSS (`coop-frontend/`)
- **Backend:** Node.js + Express (`coop-backend/`)
- **ฐานข้อมูล:** MySQL (ก้อนฐานข้อมูล `lascstudent` และ `coop`)
- **Routing:** หน้าบ้านของ coop ถูกตั้งค่า Base Path ไว้ที่ `/coop/` (vite.config.js และ BrowserRouter) ต้องรักษาโครงสร้างนี้เสมอ

## 3. งานสำคัญที่ต้องพัฒนาต่อ (Priority Tasks)
1. **Requirement ข้อ 1:** ปิดกั้นไม่ให้นักศึกษามองเห็นหรือเข้าถึงปุ่ม/ลิงก์แบบประเมินในหน้า `MyRequestsPage.jsx`
2. **Requirement ข้อ 3:** เพิ่มปุ่มให้ Admin สามารถดูหรือสร้าง QR Code ลิงก์แบบตอบรับของสถานประกอบการได้ล่วงหน้าในหน้า `RequestDetailsPage.jsx` ก่อนสั่งพิมพ์เอกสาร
3. **Requirement ข้อ 7:** แก้ไขการส่งค่า `advisorId` และ `advisorName` จาก User Context ให้บันทึกลงฐานข้อมูลอย่างถูกต้องในหน้า `AdvisorSupervisionPage.jsx`
4. **ระบบส่งอีเมล:** เตรียมเปลี่ยนจากการส่งผ่าน SMTP เป็นการใช้งาน Google/Gmail API ใน `coop-backend/src/utils/emailService.js`

## 4. แนวทางการทำงาน
- หลังเขียนโค้ดเสร็จ ให้รันตรวจสอบ Build / Lint เสมอ
- ห้ามคิดเองแล้วสร้าง UI, Dropdown, ช่องค้นหา หรือช่อง Input แปลกปลอมเพิ่มเข้ามาเด็ดขาด หากไม่ได้สั่ง
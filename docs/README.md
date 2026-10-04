# 📚 ศูนย์รวมเอกสารโปรเจกต์ — LASC SSKRU Internship

สารบัญกลางสำหรับเอกสารทั้งหมดของระบบบริหารจัดการการฝึกประสบการณ์วิชาชีพและสหกิจศึกษา

---

## โครงสร้างโฟลเดอร์

| โฟลเดอร์ | วัตถุประสงค์ |
|---|---|
| [`specifications/`](./specifications/) | เอกสารสเปกและสถาปัตยกรรมระบบ — Blueprint, บริบทโปรเจกต์, Deployment |
| [`prompts/`](./prompts/) | ชุดคำสั่ง (Prompt / Task Instructions) ที่ใช้สั่งงานพัฒนาระบบ |
| [`references/`](./references/) | เอกสารอ้างอิงค่าคงที่ — สถานะคำร้อง, รหัสสาขา, มาตรฐานต่าง ๆ |

## 📐 Specifications — สเปกระบบ

| เอกสาร | เนื้อหา |
|---|---|
| [SYSTEM_BLUEPRINT.md](./specifications/SYSTEM_BLUEPRINT.md) | พิมพ์เขียวระบบทั้งหมด — workflow, roles, สถานะ, โครงสร้าง |
| [CONTEXT.md](./specifications/CONTEXT.md) | บริบทโปรเจกต์ — tech stack, ข้อกำหนด UI/Design |
| [DOCKER.md](./specifications/DOCKER.md) | สภาพแวดล้อม Docker สำหรับ development |

## 📖 References — เอกสารอ้างอิง

| เอกสาร | เนื้อหา |
|---|---|
| [STATUS_REFERENCE.md](./references/STATUS_REFERENCE.md) | ตารางสถานะคำร้องทั้งหมด + ความหมาย + flow การเปลี่ยนสถานะ |

## 📝 Prompts — ชุดคำสั่ง

| เอกสาร | เนื้อหา |
|---|---|
| [instructions.md](./prompts/instructions.md) | ข้อกำหนดและข้อห้ามหลักของระบบ (monorepo, scope, conventions) |

---

# 🗓 สรุปงานพัฒนา — 2026-10-04

> รายงาน changelog รายไฟล์ทั้งหมดถูกรวมมาไว้ในเอกสารนี้แล้ว (ลบ `docs/changelogs/` ออก)

## 1. ระบบขอเปลี่ยนสถานที่ฝึกงาน (Relocation)

- **เรียงฟิลด์ที่อยู่ใหม่** ตาม flow การเลือก: จังหวัด → อำเภอ → ตำบล → รหัสไปรษณีย์ (เติมอัตโนมัติ) — `RelocationRequestPage.jsx`
- **เอาช่องโทรศัพท์/โทรสารบริษัทออก** และผ่อนปรน backend validation ให้ใช้เบอร์หัวหน้าหน่วยงาน (`mentor_*`) แทน
- **ปุ่ม "เลือกจากรายการแนะนำ"** — modal เลือกบริษัทจาก `GET /api/public/companies` เติมชื่อ/ที่อยู่/ข้อมูลผู้ติดต่ออัตโนมัติ (parser แยกที่อยู่ชุดเดียวกับ `NewRequestPage`)
- **Autocomplete ชื่อบริษัท** — พิมพ์แล้วเด้งรายชื่อบริษัทในระบบ เลือกแล้วเติมข้อมูลทั้งชุด (`freeSolo` พิมพ์เองนอกระบบได้)
- **แสดงเฉพาะช่วงออกฝึกงานแล้ว** (สถานะ `ออกฝึกงาน` / `กำลังออกฝึกงาน`) ครบ 3 ชั้น:
  - การ์ดใน My Requests ซ่อนเมื่อยังไม่ออกฝึก (ยกเว้นมีคำร้อง relocation ค้าง — ติดตามต่อได้)
  - `RelocationRequestPage` คัดเฉพาะคำร้องสถานะออกฝึกงาน + guard หน้า
  - `POST /relocations` เช็คสถานะฝั่ง server → `400` ถ้ายังไม่ออกฝึก

## 2. Production readiness — MySQL 8 self-migration

- แก้ `ensureTable` ของ `relocationRoutes` (และรูปแบบเดียวกันใน `internshipRoundRoutes`): MySQL 8 **ไม่รองรับ** `ADD COLUMN IF NOT EXISTS` (มีเฉพาะ MariaDB) และ error เดิมถูก `.catch()` กลืน → คอลัมน์ใหม่ไม่ถูกสร้างบนตารางเก่า
- เปลี่ยนเป็นอ่าน `information_schema.COLUMNS` แล้ว `ADD COLUMN` เฉพาะที่ขาด — ทำงานได้ทั้ง MySQL/MariaDB, self-migrate อัตโนมัติ
- ตรวจแล้ว: ไม่มี localhost hardcode, uploads persist ผ่าน bind mount, ไม่มี dependency ใหม่

## 3. หน้าแรก (Homepage)

- **Hero banner** (`HomePage.jsx`) — ปุ่ม "ดูรายละเอียด" เปลี่ยนจากกล่องขาวใหญ่เป็น text link เล็กไม่มีพื้นหลัง; ข้อความ subtitle ย้ายลงใต้ title ใกล้ขอบล่างแบนเนอร์
- **Digital Journey** (`DigitalJourney.jsx`) — redesign การ์ด 4 ขั้นตอนให้เข้าสไตล์เว็บ: การ์ดขาวขอบบาง, accent bar ม่วง, เลขขั้นตอน gradient, เส้นเชื่อม, hover lift; ลบ badge เขียว "100% Paperless" และลดขนาดหัวข้อ
- **เอาการ์ดติดต่อสีม่วงออก** จากส่วน FAQ (ข้อมูลติดต่อยังอยู่ใน footer)

## 4. SSO

- `SsoLandingPage.jsx` — หลัง SSO สำเร็จเปลี่ยนปลายทางจาก role-dashboard เป็น **หน้า Home `/coop`** ทุก role (ลิงก์จากระบบ Profile เข้าสู่หน้าแรกของ coop)

## 5. Admin — สิทธิ์และ workflow

- **บล็อกหน้า "ติดตามสถานะ" ของนักศึกษา** — ซ่อนปุ่มใน `QuickActionBar` + guard `MyRequestsPage` เด้ง admin ไป `/admin-dashboard`
- **อนุมัติคำร้องต้องแนบหนังสือขอความอนุเคราะห์** (`AllRequestsOverviewPage.jsx`) — เดิมปุ่มอนุมัติเป็น confirm modal ที่ set `อนุมัติแล้ว` ตรง ๆ ข้ามขั้นแนบหนังสือ/รอบริษัทตอบรับ; แก้ให้บังคับแนบไฟล์ (PDF/JPG/PNG ≤20MB) + หมายเหตุ → set `รอสถานประกอบการตอบรับ` → เปิด QR/ลิงก์ตอบรับต่อทันที

## 6. รอบปฏิทินฝึกงาน (Internship Rounds)

- **Backend** `routes/internshipRoundRoutes.js` — CRUD รอบ (ชื่อ/เทอม 1|2|ฤดูร้อน/ปี/วันเริ่ม–สิ้นสุด/หมายเหตุ/active) + `GET /active` + `POST /:id/apply` (เติมวันให้คำร้องทั้งเทอม, มี `overwrite` flag) + self-migration MySQL 8; matching รองรับ `term1/term2/summer`, `ภาคการศึกษาที่ 1/2`, `ภาคฤดูร้อน`
- **Admin** — ปุ่ม "กำหนดรอบปฏิทินฝึกงาน" บน header dashboard → `AdminInternshipRoundsModal` (UI เดียวกับรอบการประเมิน) + ปุ่ม "นำไปใช้กับคำร้อง"
- **เติมวันอัตโนมัติ** — dispatch/schedule modal ใน `RequestDetailsPage` เติมวันจากรอบที่ตรงเทอมคำร้อง + hint แก้ไขได้
- **นักศึกษา** — เห็นรอบ active ใน `NewRequestPage` (chip ใต้ dropdown เทอม) และ `MyRequestsPage` (ช่วงเวลาฝึกตามรอบเป็นข้อมูลอ้างอิง)
- ตาราง `internship_rounds` สร้างตัวเองผ่าน `ensureTable()` (ผู้ใช้ถอด migration/schema ออกแล้ว)

## 7. หน้าบริษัทตอบรับ (Public Company Response)

- **บังคับลายเซ็นก่อนตอบรับ** 2 ชั้น:
  - Frontend `PublicRequestPage.jsx` — label มี `*` บังคับ + กดยืนยันโดยไม่เซ็น → แสดง error ไม่ยิง API
  - Backend `publicRequestRoutes.js` — middleware `requireSignatureForAccept` ปฏิเสธ `400` ถ้า action ตอบรับแต่ไม่มี `signature` (กันยิง API ข้ามหน้าเว็บ); การปฏิเสธไม่ต้องเซ็น
- **แก้ 403 อีเมลผู้ประเมิน** — `updateStatusHandler` บังคับ admin-only แต่ public path ไม่มี `req.user` → บริษัทตอบรับไม่ได้; ยกเว้นเมื่อ `isPublic` (ผ่าน response token ซึ่งถูกตรวจก่อนเสมอ)

## ตรวจสอบแล้ว

- `node --check` ผ่านทุกไฟล์ backend ที่แก้
- `vite build` ผ่าน (exit 0) — เหลือเฉพาะ warning chunk >500kB เดิม

---

**หมายเหตุ:** วันที่ในเอกสารใช้รูปแบบ ISO `YYYY-MM-DD` ตามเวลาประเทศไทย (Asia/Bangkok)

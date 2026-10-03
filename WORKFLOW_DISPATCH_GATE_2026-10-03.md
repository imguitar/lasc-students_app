# Workflow Lock: "ออกฝึกงาน" เฉพาะเมื่อแอดมินกำหนดวัน + แนบหนังสือส่งตัวแล้ว

**วันที่:** 2026-10-03

## ภาพรวม

ล็อก workflow ตามระเบียบสหกิจฯ — คำร้องเปลี่ยนเป็น "ออกฝึกงาน" อัตโนมัติได้ก็ต่อเมื่อครบ **4 เงื่อนไข**:

| # | เงื่อนไข | การตรวจสอบ |
|---|---|---|
| 1 | อนุมัติขั้นสุดท้ายแล้ว | `status IN ('อนุมัติแล้ว', 'อนุมัติแล้ว (รอออกฝึกงาน)', 'รอออกฝึกงาน')` |
| 2 | แอดมินกำหนดวันทางการ | `internship_start_date IS NOT NULL` (ตัด `details.startDate` ทิ้งถาวร) |
| 3 | ถึงวันเริ่มตามเวลาไทย | `internship_start_date <= today(Asia/Bangkok)` |
| 4 | แนบหนังสือส่งตัวแล้ว | `JSON_EXTRACT(dispatchLetter,'$.uploadedAt') IS NOT NULL` *(ใหม่รอบนี้)* |

## Files Modified

### 1. `coop-backend/src/utils/internshipAutoUpdate.js`

- เพิ่ม `DISPATCH_LETTER_EXPR` = `JSON_EXTRACT(dispatchLetter, '$.uploadedAt')` — ฟอร์ม "กำหนดวัน+แนบหนังสือส่งตัว" ของแอดมินประทับ `uploadedAt` เสมอ ใช้เป็นตัวแยกจากหนังสือขอความอนุเคราะห์ (ซึ่งเก็บคอลัมน์ `dispatchLetter` เดียวกันแต่ไม่มี `uploadedAt`)
- เพิ่มเงื่อนไข `AND ${DISPATCH_LETTER_EXPR} IS NOT NULL` ใน `findDueInternshipRequests` และ UPDATE query

### 2. `coop-backend/src/routes/requestRoutes.js` (PATCH `/requests/:id/status`)

- เพิ่ม **in-app notification** ถึงนักศึกษาเมื่ออัปเดตสถานะพร้อมแนบ `dispatchLetter`:
  - title: `คำร้องได้รับการอนุมัติแล้ว`
  - message: `คำร้อง #N ได้รับการอนุมัติแล้ว กรุณาดาวน์โหลดหนังสือส่งตัวเพื่อนำไปยื่น ณ สถานประกอบการ`
  - เงื่อนไข `startsWith('อนุมัติแล้ว') || 'รอออกฝึกงาน' || 'ออกฝึกงาน'` — ใช้ `startsWith` กันชนกับ `ไม่อนุมัติ` ที่มี substring เดียวกัน
  - (เดิมมีแค่อีเมล `sendStatusNotifyEmail` — ครบทั้ง 2 ช่องทางแล้ว)

### 3. `coop-backend/check-internship-dates.js`

- Query เพิ่ม `JSON_EXTRACT(dispatchLetter,'$.uploadedAt') AS dispatch_letter_at` — แสดงสถานะหนังสือส่งตัวต่อรายการ
- `findDueCheck` เปลี่ยนเป็นเกณฑ์ใหม่: ยึด `internship_start_date` คอลัมน์เท่านั้น + ต้องมีหนังสือส่งตัว
- Label แยกชัด `start(ทางการ)` vs `details.startDate(นักศึกษาเสนอ)` — เห็นได้ว่าแถวไหนเคยเด้งผิดเพราะวันที่นักศึกษากรอก

## ส่วนที่มีอยู่แล้ว (ตรวจยืนยัน — ไม่ต้องแก้)

**Admin flow** (`AdminDashboardPage.jsx` `adminScheduleDispatchModal`, ~line 640-700):
- บังคับกรอก `startDate`, `endDate` + อัปโหลดไฟล์ (ไม่มีไฟล์ → error `กรุณาอัปโหลดหนังสือส่งตัวนักศึกษา`)
- PATCH `/requests/:id/status` → status `อนุมัติแล้ว (รอออกฝึกงาน)` + `dispatchLetter{uploadedAt}` + เขียนคอลัมน์ `internship_start/end_date`
- เขียน `details.startDate/endDate` ซ้ำเพื่อแสดงผล (ใช้เพื่อแสดงผลเท่านั้น ไม่ใช้ตัดสิน auto-update อีกต่อไป)

**Student flow** (`DashboardPage.jsx` + `MyRequestsPage.jsx`):
- การ์ด "เอกสารหนังสือส่งตัวฝึกงาน" แสดงเมื่อมี `dispatchLetter` + ปุ่ม ดู/ดาวน์โหลด
- ทั้งคู่ใช้ `documentViewer.js` (`downloadDocument`/`openDocumentInNewTab`) — แปลง `data:` URL → Blob → object URL + delay revoke → **ไม่เสียหายทั้ง desktop/mobile** (แก้มาก่อนหน้านี้)

**Check-in gate** (`checkinRoutes.js:53,107`):
- Query เช็คชื่อ/รายงานประจำวันกรอง `status IN ('ออกฝึกงาน','กำลังออกฝึกงาน',...)` — ไม่เปิดให้เช็คอินก่อนถึงวันออกฝึกอยู่แล้ว

## Flow Verification

| สถานการณ์ | ผลลัพธ์ |
|---|---|
| บริษัทตอบรับ (startDate นักศึกษาเสนอเป็นวันนี้) | ค้าง `สถานประกอบการตอบรับแล้ว` — ไม่เด้ง ✓ |
| แอดมินกำหนดวันแต่**ยังไม่แนบหนังสือ** | ไม่เด้ง — ขาด `uploadedAt` ✓ |
| แอดมินกำหนดวัน+แนบหนังสือ, ยังไม่ถึงวัน | `อนุมัติแล้ว (รอออกฝึกงาน)` + นักศึกษาได้ notif+อีเมล ดาวน์โหลดหนังสือ ✓ |
| ครบทุกเงื่อนไข + ถึงวัน (เวลาไทย) | auto → `ออกฝึกงาน` ✓ |

**รันจริงกับ DB** (`node check-internship-dates.js`):
- คำร้องก่อนฝึกงาน: 0 รายการค้างเด้ง
- **จับ edge case จริง:** request #25 `end(ทางการ)=2027-01-30` vs `details.endDate=2027-01-31` — logic เก่าจะตัดสิ้นสุดตามวันของนักศึกษา (ผิด 1 วัน) logic ใหม่ยึดของแอดมินถูกต้อง

- `node --check` ผ่านทั้ง 3 ไฟล์

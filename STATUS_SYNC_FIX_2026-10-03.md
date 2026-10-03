# แก้ไขสถานะคำร้องขัดแย้งกันระหว่าง "คำร้องล่าสุด 5 รายการ" กับ "คำร้องทั้งหมด" (Admin Dashboard)

**วันที่:** 3 ตุลาคม 2026
**สถานะ:** ✅ แก้ไขเรียบร้อย — Syntax + Build ผ่าน, Diagnostic รันจริง

---

## Root Cause Identified

สาเหตุคือ **สถานะถูก "คำนวณทับ" เฉพาะตารางล่าง แต่ฐานข้อมูลไม่เคยถูกอัปเดตตามวันสิ้นสุดฝึกงาน**:

1. **Frontend — 2 ตารางใช้ค่าสถานะคนละชุด** (`AdminDashboardPage.jsx`)
   - ตารางบน (คำร้องล่าสุด 5 รายการ): `<StatusBadge status={request.status} />` → แสดงค่าดิบจาก DB = `กำลังออกฝึกงาน`
   - ตารางล่าง (คำร้องทั้งหมด): `getEffectiveInternshipStatus(request)` → คำนวณจาก `end_date < วันนี้` แล้วแสดง `สิ้นสุดการฝึกงาน (รอประเมิน)` ทับค่า DB
   - → คำร้องใบเดียวกันแสดง 2 สถานะในหน้าเดียวกัน

2. **Backend — helper อัปเดตอัตโนมัติครอบคลุมแค่ "วันเริ่ม"** (`internshipAutoUpdate.js`)
   - เดิมมีแต่เงื่อนไข `start_date <= today` → `ออกฝึกงาน`
   - **ไม่มีเงื่อนไข `end_date < today`** → คำร้องที่เลยวันสิ้นสุดยังค้างเป็น `กำลังออกฝึกงาน` ใน DB ตลอดไป ทุก endpoint ที่อ่านค่าดิบ (notifications, check-in, request details) จึงเห็นสถานะเก่า

## Files Modified

| ไฟล์ | การแก้ไข |
|---|---|
| `coop-backend/src/utils/internshipAutoUpdate.js` | เพิ่ม `ACTIVE_INTERNSHIP_STATUSES` (`ออกฝึกงาน`, `กำลังออกฝึกงาน`), `END_DATE_EXPR` (COALESCE `internship_end_date` + `details.endDate`), `findEndedInternshipRequests()` และขั้นตอน end-update ใน `autoUpdateInternshipStatuses()` — รัน **หลัง** start-update เพื่อจับเคสที่เลยทั้ง start+end ในครั้งเดียว, อัปเดตเป็น `สิ้นสุดการฝึกงาน (รอประเมิน)` ลง DB จริง + แจ้งเตือนนักศึกษา, return `{ updated, ended }` |
| `coop-backend/check-internship-dates.js` | ขยาย diagnostic รายงานทั้ง 2 กลุ่ม: ถึงกำหนดเริ่ม และเลยกำหนดสิ้นสุด |
| `coop-frontend/src/pages/Admin/Dashboard/AdminDashboardPage.jsx` | ตารางบนเปลี่ยน `request.status` → `getEffectiveInternshipStatus(request)` — ใช้ตัวแปรสถานะชุดเดียวกับตารางล่าง |
| `coop-frontend/src/pages/Student/Dashboard/DashboardPage.jsx` | `StatusBadge` การ์ดคำร้องเปลี่ยน raw → `getEffectiveInternshipStatus` (กันขัดกันฝั่งนักศึกษา) |
| `coop-frontend/src/pages/Student/Dashboard/MyRequestsPage.jsx` | เหมือนกัน |

**จุดที่ไม่ต้องแก้:** `autoUpdateInternshipStatuses()` ถูกเรียกอยู่แล้วจาก `GET /api/requests` (lazy update ก่อนส่งข้อมูล) และ `internshipCron.js` — endpoint ของทั้งสองตารางเป็น `/requests` เดียวกัน จึงได้การอัปเดตใหม่อัตโนมัติทุก request

## ผลกระทบ

- **DB เป็นแหล่งความจริง:** เลยวันสิ้นสุด → `สิ้นสุดการฝึกงาน (รอประเมิน)` เขียนลง DB จริง ทุก endpoint/หน้าจอ/notification เห็นตรงกัน
- **Frontend แสดง consistent ทันที:** แม้ในช่วงค้างก่อน lazy-update รัน ตารางทั้งสองใช้ helper เดียวกันจึงไม่ขัดกันอีก
- **Cron ครอบคลุม production:** ทุกคืน (Asia/Bangkok) อัปเดตเคสที่เลยกำหนดเอง ไม่ต้องรอผู้ใช้เปิดหน้าเว็บ

## Verification

### รันแล้ว (local)

```
node --check internshipAutoUpdate.js   → ผ่าน
node --check check-internship-dates.js → ผ่าน
node check-internship-dates.js         → ทำงานครบ รายงานทั้ง 2 กลุ่ม
```

ผล diagnostic บน DB จริง — คำร้อง #22 (รหัส 6610014106 ที่รายงานปัญหา) ถูกเปลี่ยนเป็น `สิ้นสุดการฝึกงาน (รอประเมิน)` ใน DB แล้ว ตารางทั้งสองจึงแสดงตรงกันโดยไม่ต้องพึ่งการคำนวณฝั่ง frontend:

```
id=22 | 6610014106 | สิ้นสุดการฝึกงาน (รอประเมิน) | end=2026-09-24
```

```
npm run build → ✓ built in 1.86s
```

### ขั้นทดสอบบนหน้าเว็บ

1. รีเฟรช `/coop/admin-dashboard` → คำร้องเดียวกันในทั้ง 2 ตารางต้องแสดงข้อความ+สีเดียวกัน
2. สร้าง/แก้คำร้องให้ `end_date < วันนี้` สถานะ `ออกฝึกงาน` → รีเฟรชหน้า (lazy update ผ่าน `GET /api/requests`) → ต้องเห็น `สิ้นสุดการฝึกงาน (รอประเมิน)` ทั้ง 2 จุด และนักศึกษาได้ notification "สิ้นสุดการฝึกงาน"
3. ฝั่งนักศึกษา: dashboard card กับหน้า "คำร้องของฉัน" ต้องแสดงสถานะเดียวกัน

## Issues Found

- ไม่มี — DB ปัจจุบันไม่มีคำร้องค้างสถานะผิดปกติแล้ว (#22 ถูกอัปเดตไปก่อนหน้าในรอบนี้)
- `statusCounts`/pie chart ยังใช้ raw status แต่ bucket `อื่นๆ` รองรับสถานะใหม่อยู่แล้ว — ไม่กระทบ

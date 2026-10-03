# Auto-update "ออกฝึกงาน" — ยึดวันจากแอดมินเท่านั้น + เวลาไทย (Asia/Bangkok)

**วันที่:** 2026-10-03

## ปัญหาเดิม

`START_DATE_EXPR` ใช้ `COALESCE(internship_start_date, details.startDate)` — เมื่อแอดมินยังไม่กำหนดวันอย่างเป็นทางการ ระบบ fallback ไปใช้ `details.startDate` ที่**นักศึกษากรอกเสนอเอง**ตอนยื่นคำร้อง ทำให้คำร้องเด้งเป็น "ออกฝึกงาน" ได้แม้ยังไม่มีวันฝึกงานทางการ

## Files Modified

### `coop-backend/src/utils/internshipAutoUpdate.js` (ไฟล์เดียว, บรรทัด 18-32)

**1. `getBangkokToday()` — ระบุ format ชัดเจนตาม spec:**

```javascript
const getBangkokToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
```

คืน `YYYY-MM-DD` ตามปฏิทินไทยเสมอ ไม่ขึ้นกับ timezone ของ Server/DB (เดิมใช้ `en-CA` เหมือนกัน แต่ระบุ parts ให้ contract ชัดเจน)

**2. `START_DATE_EXPR` — ตัด fallback วันของนักศึกษา:**

```javascript
// เดิม:
COALESCE(internship_start_date, DATE(JSON_UNQUOTE(JSON_EXTRACT(details, '$.startDate'))))
// ใหม่:
internship_start_date
```

**3. `END_DATE_EXPR` — ยึดคอลัมน์ทางการเช่นเดียวกัน:**

```javascript
// เดิม:
COALESCE(internship_end_date, DATE(JSON_UNQUOTE(JSON_EXTRACT(details, '$.endDate'))))
// ใหม่:
internship_end_date
```

*(กันช่องโหว่เดียวกัน: คำร้องที่กำลังฝึกงานจะไม่ถูก auto-end ด้วยวันสิ้นสุดที่นักศึกษากรอกเอง)*

## Logic Adjusted

เงื่อนไขเปลี่ยนเป็น "ออกฝึกงาน" อัตโนมัติครบ 2 ชั้น:

| ชั้น | เงื่อนไข |
|---|---|
| สถานะ | `status IN ('อนุมัติแล้ว', 'อนุมัติแล้ว (รอออกฝึกงาน)', 'รอออกฝึกงาน')` — ผ่านการอนุมัติขั้นสุดท้ายแล้วเท่านั้น *(แก้รอบก่อน)* |
| วันที่ | `internship_start_date IS NOT NULL AND internship_start_date <= today(BKK)` — **คอลัมน์ที่แอดมินเขียนเท่านั้น** |

`internship_start_date` เขียนโดย admin endpoints เท่านั้น (verify แล้ว):
- `PATCH /api/requests/:id/internship-period` — admin กำหนดวันฝึกงาน
- `PATCH /api/requests/batch/dates` — admin กำหนดวันพร้อมกันหลายคำร้อง
- `PATCH /api/requests/:id/status` — เมื่อแอดมินส่ง `startDate` หรือสั่ง `ออกฝึกงาน` ตรงๆ (`IFNULL(..., CURDATE())`)

นักศึกษายื่นคำร้อง → เขียนแค่ `details.startDate` (INSERT ไม่แตะคอลัมน์) — ไม่มีทางถูก auto-update นับได้อีก

## Flow Verification

| สถานการณ์ | ผลหลัง fix |
|---|---|
| นักศึกษากรอก startDate ย้อนหลัง + อนุมัติแล้ว แต่แอดมินยังไม่กำหนดวันทางการ | **ไม่เด้ง** — `internship_start_date` ยัง NULL ✓ |
| แอดมินกำหนดวันเริ่มทางการ + ถึงวัน (เวลาไทย) | auto-update → `ออกฝึกงาน` ✓ |
| Server รัน UTC (ต่างจากไทย 7 ชม.) | เทียบ `YYYY-MM-DD` ของ `Asia/Bangkok` เสมอ — เปลี่ยนวันตรงเที่ยงคืนไทย ✓ |

- `node --check` ผ่าน, `getBangkokToday()` → `2026-10-03` (BKK), whitelist ยืนยัน 3 สถานะ
- ครอบทั้ง 2 entry point: `internshipCron.js` + `GET /api/requests` inline update
- *ยืนยันจาก code path + module check — ยังไม่ได้รันกับ DB จริง*

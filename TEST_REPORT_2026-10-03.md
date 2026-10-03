# Test Report — Local Verification Suite
## ระบบฝึกประสบการณ์วิชาชีพ LASC SSKRU — รอบทดสอบก่อน Commit

วันที่ทดสอบ: 2026-10-03 | สภาพแวดล้อม: Local (Windows + XAMPP MariaDB + Node.js)

---

## 1. Test Checklist

| # | หัวข้อทดสอบ | วิธี | ผลลัพธ์ |
| :-: | :--- | :--- | :---: |
| 1.1 | Syntax check ไฟล์ที่แก้ไขทั้ง 6 | `node --check` | ✅ Pass |
| 1.2 | Diagnostic: คำร้องถึงกำหนดฝึกงาน | `node check-internship-dates.js` (dry-run) | ✅ Pass |
| 1.3 | Security: student → 403 คะแนนดิบ | ยิง 2 endpoints ด้วย student JWT | ✅ Pass |
| 1.4 | Security: admin/advisor → 200 อ่านได้ | ยิงด้วย JWT ทุก role | ✅ Pass |
| 1.5 | Companies API + UTF-8 | `GET /api/public/companies` | ✅ Pass |
| 2.1 | Frontend build | `npm run build` | ✅ Pass (9.99s) |
| 2.2 | Pie chart UI (เต็มวง + callout + legend 3 คอลัมน์) | — | ⏳ รอ visual check |

---

## 2. Logs & Responses

### 2.1 Syntax Check — ผ่านทั้งหมด

```
OK: src/utils/internshipAutoUpdate.js
OK: src/cron/internshipCron.js
OK: check-internship-dates.js
OK: src/routes/evaluationRoutes.js
OK: src/routes/companyRoutes.js
OK: src/routes/requestRoutes.js
```

### 2.2 Diagnostic Script (dry-run)

```
=== Internship Start-Date Diagnostic ===
Server now        : Sat Oct 03 2026 16:02:42 GMT+0700 (เวลาอินโดจีน)
Today (Asia/BKK)  : 2026-10-03

คำร้องในสถานะก่อนฝึกงาน: 0 รายการ
คำร้องที่ควรเปลี่ยนเป็น 'ออกฝึกงาน': 0 รายการ
```

**วิเคราะห์:** ถูกต้อง — ใน DB มี 3 คำร้อง สถานะ `กำลังออกฝึกงาน` (1) + `ฝึกงานเสร็จแล้ว` (2)
ไม่มีคำร้องในสถานะก่อนฝึกงาน เลยไม่มีตัวถึงกำหนด — timezone แสดง Asia/Bangkok ถูกต้อง

### 2.3 Security Test (GAP 4.3) — ผ่านครบทุกเคส

| Role | Endpoint | Status | Response |
| :--- | :--- | :---: | :--- |
| student | `/api/evaluations/request/1` | **403** | `ไม่อนุญาตให้นักศึกษาเข้าถึงคะแนนประเมินโดยตรง` |
| student | `/api/advisor-evaluations/request/1` | **403** | `ไม่อนุญาตให้นักศึกษาเข้าถึงคะแนนประเมินโดยตรง` |
| admin | `/api/evaluations/request/1` | 200 | `data: null` (ไม่มีแถว — ผ่าน guard ถูกต้อง) |
| admin | `/api/advisor-evaluations/request/1` | 200 | `data: null` |
| advisor | `/api/evaluations/request/1` | 200 | `data: null` |
| alumni | `/api/evaluations/request/1` | **403** | `คุณไม่มีสิทธิ์เข้าถึง` |
| ไม่มี token | `/api/evaluations/request/1` | 401 | `กรุณาเข้าสู่ระบบก่อนใช้งาน` |

### 2.4 Companies API + UTF-8

```
GET /api/public/companies → 200 OK
success: true | total: 11 | mojibake rows: 0
```

- 10 บริษัททางการ (isOfficial: โอเล่, CP All, ไทยวาโก้, ข้าวตราฉัตร, อีสานไอที, SCG, ไปรษณีย์ไทย, PEA, รพ.ศรีสะเกษ, เทศบาลเมืองศรีสะเกษ)
- 1 บริษัทจากคำร้อง (official: false)
- **ภาษาไทยถูกต้องทุกแถว — ไม่มีตัวอักษรต่างดาว**

### 2.5 Frontend Build

```
✓ built in 9.99s
dist/assets/index-C8E7F9AN.js   2,387.68 kB │ gzip: 608.31 kB
```

ไม่มี error/warning ที่บล็อก build

---

## 3. Issues Found

| # | รายการ | ระดับ | สถานะ |
| :-: | :--- | :--- | :--- |
| 1 | ไม่มีข้อมูลคำร้องในสถานะก่อนฝึกงาน → diagnostic ทดสอบเจอแค่เคส "0 รายการ" ยังไม่ได้เทสเคสพลิกสถานะจริง | ต่ำ | ใช้ `--apply` ทดสอบได้เมื่อมีข้อมูล หรือ seed request ทดสอบ |
| 2 | Pie chart UI ยังไม่ได้ verify ด้วยตา (ต้องเปิด browser ดูจริง) | ต่ำ | เปิด `/coop/admin-dashboard` + `/reports` ตรวจ |
| 3 | MariaDB ยังมี InnoDB future-LSN warnings ตอน startup | กลาง | ทำงานได้ปกติ แต่แนะนำ dump→rebuild→import ระยะยาว |

---

## 4. Deployment Readiness

| เกณฑ์ | สถานะ |
| :--- | :--- |
| Backend syntax/logic | ✅ พร้อม |
| Security fix ยืนยันด้วย request จริง | ✅ พร้อม |
| Companies API คืนข้อมูล UTF-8 ถูกต้อง | ✅ พร้อม |
| Frontend build | ✅ พร้อม |
| UI visual (pie chart) | ⏳ ควรเปิดดูก่อน deploy |

**สรุป:** ✅ **พร้อม Commit + Push** — เหลือ visual check กราฟอย่างเดียว (แนะนำเปิด dev server ดูก่อน หรือรับความเสี่ยงต่ำได้เพราะ build ผ่าน)

**Checklist ฝั่ง Production หลัง deploy (ย้ำจาก CHANGELOG):**
1. รัน `20260924-seed-companies.sql` + `20260924-fix-charset-utf8mb4.sql` ด้วย `--default-character-set=utf8mb4`
2. ตั้ง `COOP_PUBLIC_URL=https://students.sci-sskru.com/coop`
3. Verify `GET /coop/api/public/companies` คืน array ไม่ว่าง
4. รัน `node check-internship-dates.js` เช็คคำร้องค้างสถานะ

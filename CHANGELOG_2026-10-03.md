# สรุปการแก้ไขงาน (Changelog) — 2026-10-03

สรุปงานทั้งหมดที่แก้ไขในรอบนี้ (ยังไม่ commit) — สร้างจาก `git status` และประวัติการทำงานจริง

---

## ภาพรวม

| กลุ่มงาน | ไฟล์ที่แตะ | สถานะ |
| :--- | :--- | :--- |
| Auto-update สถานะ "ออกฝึกงาน" | 4 ไฟล์ backend | ✅ |
| Security fix: คะแนนประเมินดิบ | 1 ไฟล์ backend | ✅ |
| กราฟ Pie Chart (Admin Dashboard + Reports) | 2 ไฟล์ frontend | ✅ Build ผ่าน |
| บริษัทแนะนำ + seed + UTF-8 | 3 ไฟล์ | ✅ |
| เอกสารอ้างอิงระบบ | 3 ไฟล์ใหม่ | ✅ |

---

## 1. Auto-update สถานะเป็น "ออกฝึกงาน" ตามวันกำหนด

**ปัญหาเดิม:**
- `GET /api/requests` ใช้เงื่อนไข `submittedDate <= NOW() - 3 DAY` (เช็ค**วันยื่นคำร้อง** ไม่ใช่วันเริ่มฝึกงาน) และดักสถานะแค่ 2 ค่า → คำร้องไม่เปลี่ยนสถานะตาม `internship_start_date`
- `internshipCron.js` เช็คแค่ `details.startDate` — ข้ามคอลัมน์ `internship_start_date` และใช้ `new Date()` ตาม TZ server (เสี่ยงเพี้ยน 7 ชม.)

**แก้ไข:**

| ไฟล์ | เปลี่ยนแปลง |
| :--- | :--- |
| `src/utils/internshipAutoUpdate.js` **(ใหม่)** | helper กลาง: `getBangkokToday()` (Asia/Bangkok), เช็ควันจาก `COALESCE(internship_start_date, details.startDate)`, ครอบคลุมสถานะก่อนฝึกงาน 6 ค่า, UPDATE → `ออกฝึกงาน` + ส่ง notification นักศึกษา |
| `src/routes/requestRoutes.js` | แทน query `submittedDate` ผิดด้วย `autoUpdateInternshipStatuses()` |
| `src/cron/internshipCron.js` | rewrite เรียก helper เดียวกัน + `timezone: 'Asia/Bangkok'` |
| `check-internship-dates.js` **(ใหม่)** | diagnostic: `node check-internship-dates.js` (dry-run) / `--apply` (อัปเดตจริง) |

---

## 2. Security Fix — คะแนนประเมินดิบ (GAP 4.3)

**ช่องโหว่เดิม:** `GET /evaluations/request/:id` และ `GET /advisor-evaluations/request/:id` มีแค่ `authenticate` — นักศึกษาคนใดก็อ่านคะแนนดิบของ requestId ไหนก็ได้

**แก้ไข `src/routes/evaluationRoutes.js`:** เพิ่ม middleware `restrictEvaluationScores`

| Role | ผลลัพธ์ |
| :--- | :--- |
| `student` | 403 `"ไม่อนุญาตให้นักศึกษาเข้าถึงคะแนนประเมินโดยตรง"` |
| `admin` / `advisor` / `teacher` | ✅ ผ่าน |
| อื่นๆ | 403 `"คุณไม่มีสิทธิ์เข้าถึง"` |

นักศึกษายังเห็น progress ผ่าน flag `hasCompanyEval`/`hasAdvisorEval` ตามนโยบาย

---

## 3. กราฟ Pie Chart — Admin Dashboard & Reports

ไฟล์: `AdminDashboardPage.jsx`, `AdminReportsPage.jsx`

| รายการ | เดิม | ใหม่ |
| :--- | :--- | :--- |
| รูปทรง | doughnut (`innerRadius: 72%`) + overlay ตัวเลขกลางวง | **pie เต็มวง** (เอา innerRadius + overlay ออก) |
| Labels | ซ่อน (`forceHidden`) | **outer labels + callout ticks**: `{category}: {valuePercentTotal…0.0}%`, `textType:'adjusted'` |
| สี | สีตามสถานะ (เขียว/แดง/เหลือง) | **palette ใหม่ 8 เฉด** `#54b3d6 → #dca55c` (ฟ้า-คราม-ม่วง-ชมพู-ทอง) assign ตาม index |
| Legend | 2 คอลัมน์, จุดกลม | **1/2/3 คอลัมน์** (xs/sm/md), **สี่เหลี่ยมมน** `rounded-[4px]` |
| ความสูง | 220/260px | 300/360px (ให้ที่ป้ายนอกวง) |

✅ `npm run build` ผ่าน (17.89s)

---

## 4. บริษัทแนะนำ + Seed + UTF-8

| ไฟล์ | เปลี่ยนแปลง |
| :--- | :--- |
| `src/routes/companyRoutes.js` | `GET /api/public/companies` — เดิมดึงเฉพาะคำร้อง "ฝึกเสร็จ" → ใหม่ดึง**ทุกคำร้องที่ไม่ถูกปฏิเสธ** (`NOT LIKE '%ไม่อนุมัติ%' AND NOT IN ('ปฏิเสธ','ยกเลิก','ร่าง')`) |
| `db/migrations/20260924-seed-companies.sql` **(ใหม่)** | seed บริษัทตั้งต้น 10 แห่ง (idempotent — `WHERE NOT EXISTS`) |
| `db/migrations/20260924-fix-charset-utf8mb4.sql` **(ใหม่)** | ALTER DATABASE + CONVERT ทุกตาราง → `utf8mb4_unicode_ci` สำหรับ production |

**UTF-8 fix (local ทำแล้ว):** พบ seed ที่ import ผ่าน `mysql.exe` กลายเป็น mojibake (client ใช้ cp850) — ลบแถวเพี้ยน re-import ด้วย `--default-character-set=utf8mb4` + CONVERT ตาราง `companies` เป็น `utf8mb4_unicode_ci`

> ⚠️ **ค้าง deploy production:** push + deploy backend + รัน 2 migration + ตั้ง `COOP_PUBLIC_URL=https://students.sci-sskru.com/coop`

---

## 5. เอกสารอ้างอิง (ไฟล์ใหม่)

| ไฟล์ | เนื้อหา |
| :--- | :--- |
| `STATUS_REFERENCE.md` | ตารางสถานะ 25 ค่า (3 กลุ่ม: happy path / rejection / synonyms) + badge colors + trigger matrix + legacy keys + canonical plan |
| `SYSTEM_BLUEPRINT.md` | canonical 6 state groups + SQL patterns + dual-trigger M1–M11/A1–A3 + cross-module matrix + security (§4.3 อัปเดตเป็น "แก้แล้ว") |
| `CHANGELOG_2026-10-03.md` | ไฟล์นี้ |

---

## 6. รายการไฟล์ทั้งหมดใน git status

```
 M  coop-backend/src/cron/internshipCron.js
 M  coop-backend/src/routes/companyRoutes.js
 M  coop-backend/src/routes/evaluationRoutes.js
 M  coop-backend/src/routes/requestRoutes.js
 M  coop-frontend/src/pages/Admin/Dashboard/AdminDashboardPage.jsx
 M  coop-frontend/src/pages/Admin/Dashboard/AdminReportsPage.jsx
 ?? STATUS_REFERENCE.md
 ?? SYSTEM_BLUEPRINT.md
 ?? CHANGELOG_2026-10-03.md
 ?? coop-backend/check-internship-dates.js
 ?? coop-backend/src/utils/internshipAutoUpdate.js
 ?? db/migrations/20260924-fix-charset-utf8mb4.sql
 ?? db/migrations/20260924-seed-companies.sql
```

---

## 7. งานค้าง (Next Actions)

- [ ] Commit + push งานทั้งหมด
- [ ] Deploy backend → production
- [ ] รัน migration บน production DB (`--default-character-set=utf8mb4`):
  - `20260924-seed-companies.sql` (ลบแถว mojibake เก่าก่อนถ้ามี)
  - `20260924-fix-charset-utf8mb4.sql`
- [ ] ตั้ง `COOP_PUBLIC_URL=https://students.sci-sskru.com/coop` บน production `.env`
- [ ] Verify `GET /coop/api/public/companies` คืน array ไม่ว่าง
- [ ] รัน `node check-internship-dates.js` บน production เช็คคำร้องค้างสถานะ
- [ ] (ถาวร) MariaDB local ยังมี InnoDB future-LSN warnings — dump → datadir ใหม่ → import

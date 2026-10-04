# System Blueprint & Workflow Specification
## ระบบบริหารจัดการการฝึกประสบการณ์วิชาชีพและสหกิจศึกษา
### คณะศิลปศาสตร์และวิทยาศาสตร์ มหาวิทยาลัยราชภัฏศรีสะเกษ (LASC SSKRU)

เวอร์ชัน: 2.0 — อัปเดตล่าสุด 2026-10-03
สังเคราะห์จาก: `STATUS_REFERENCE.md` v2.0 + การตรวจสอบซอร์สโค้ดจริง (Frontend/Backend/Schema)

เอกสารฉบับนี้ใช้เป็นมาตรฐานกลางสำหรับการพัฒนา การเขียน Test Case และประกอบเล่มรายงานโครงงาน
เอกสารคู่ขนาน: `STATUS_REFERENCE.md` — ตารางสถานะดิบ 25 ค่า + synonym map + badge colors

---

## สารบัญ

1. [Canonical Status Mapping Dictionary](#1-canonical-status-mapping-dictionary)
2. [Dual-Trigger Transition Matrix](#2-dual-trigger-transition-matrix)
3. [Cross-Module Integration Matrix](#3-cross-module-integration-matrix)
4. [Security & Data Isolation](#4-security--data-isolation)
5. [ภาคผนวก: รายการไฟล์อ้างอิง](#5-ภาคผนวก-รายการไฟล์อ้างอิง)

---

## 1. Canonical Status Mapping Dictionary

### 1.1 บริบท

`requests.status` เป็น `VARCHAR(100)` เก็บข้อความภาษาไทยตรงๆ มีสถานะจริง ~25 ค่า
ที่เกิดจากการเติบโตของระบบ (มีคำพ้องความหมาย/legacy keys ปะปน)

เพื่อลดความซ้ำซ้อนในการเขียน query ทุก endpoint ให้ยึด **Canonical State Model 6 กลุ่ม** ต่อไปนี้

### 1.2 ตาราง Canonical Mapping

| Canonical State | ความหมาย | สถานะจริงใน DB (VARCHAR) ที่จัดอยู่ในกลุ่ม |
| :--- | :--- | :--- |
| `DRAFT_AND_SUBMITTED` | รอยื่น / ยื่นใหม่ | `ร่าง`, `ยังไม่ได้ยื่นคำร้อง`*, `รออาจารย์ที่ปรึกษาอนุมัติ` |
| `UNDER_REVIEW` | อยู่ระหว่างพิจารณาภายใน | `รออาจารย์ที่ปรึกษาอนุมัติ`**, `รอผู้ดูแลระบบตรวจสอบ`, `รอผู้ดูแลระบบอนุมัติ`, `รอตรวจสอบ`, `รออนุมัติ`, `รอดำเนินการ` |
| `COMPANY_COORDINATION` | ประสานงานกับสถานประกอบการ | `รอสถานประกอบการตอบรับ`, `สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)`, `ตอบรับแล้ว`, `รอแอดมินออกใบส่งตัว`, `รอออกใบส่งตัว`, `รอสถานประกอบการ` |
| `INTERNSHIP_ACTIVE` | อนุมัติแล้ว/กำลังฝึกงาน | `อนุมัติแล้ว`, `อนุมัติแล้ว (รอออกฝึกงาน)`, `รอออกฝึกงาน`, `รออาจารย์อนุมัติเริ่มฝึกงาน`, `รอแอดมินอนุมัติเริ่มฝึกงาน`, `รอแอดมินอนุมัติการออกฝึกงาน`, `ออกฝึกงาน`, `กำลังออกฝึกงาน` |
| `EVALUATION_AND_COMPLETION` | ช่วงประเมิน/ปิดงาน | `สิ้นสุดการฝึกงาน (รอประเมิน)`, `สิ้นสุดการฝึกงาน`, `ประเมินจากสถานประกอบการแล้ว`, `ประเมินจากอาจารย์แล้ว`, `ประเมินเสร็จแล้ว`, `ฝึกงานเสร็จแล้ว`, `เสร็จสิ้นสมบูรณ์` |
| `REJECTED_AND_CANCELLED` | ถูกปฏิเสธ/ยกเลิก | `ไม่อนุมัติ (อาจารย์)`, `ไม่อนุมัติ (Admin)`, `ไม่อนุมัติ`, `ปฏิเสธ`, `สถานประกอบการปฏิเสธคำร้องฝึกงาน`, `ยกเลิก`, `ร่าง`*** |

\* `ยังไม่ได้ยื่นคำร้อง` เป็นค่าสังเคราะห์ฝั่ง frontend (ไม่มีแถวใน DB)
\** `รออาจารย์ที่ปรึกษาอนุมัติ` อยู่ได้ทั้ง 2 กลุ่มตามบริบท — ในแง่ lifecycle คือ "ยื่นแล้ว" ในแง่การทำงานคือ "รอพิจารณา"
\*** `ร่าง` จัดไว้ท้ายกลุ่ม rejected เพราะตรรกะ exclude เดียวกันในทุก endpoint

### 1.3 SQL Pattern มาตรฐานสำหรับ Backend

คัดลอกชุด `IN (...)` เหล่านี้ไปใช้ทุก endpoint เพื่อกันข้อมูลตกหล่น:

```sql
-- DRAFT_AND_SUBMITTED
WHERE status IN ('ร่าง', 'รออาจารย์ที่ปรึกษาอนุมัติ')

-- UNDER_REVIEW (รวมค่า legacy/display variant)
WHERE status IN (
  'รออาจารย์ที่ปรึกษาอนุมัติ', 'รอผู้ดูแลระบบตรวจสอบ',
  'รอผู้ดูแลระบบอนุมัติ', 'รอตรวจสอบ', 'รออนุมัติ', 'รอดำเนินการ'
)

-- COMPANY_COORDINATION
WHERE status IN (
  'รอสถานประกอบการตอบรับ',
  'สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)',
  'ตอบรับแล้ว', 'รอแอดมินออกใบส่งตัว', 'รอออกใบส่งตัว', 'รอสถานประกอบการ'
)

-- INTERNSHIP_ACTIVE
WHERE status IN (
  'อนุมัติแล้ว', 'อนุมัติแล้ว (รอออกฝึกงาน)', 'รอออกฝึกงาน',
  'รออาจารย์อนุมัติเริ่มฝึกงาน', 'รอแอดมินอนุมัติเริ่มฝึกงาน',
  'รอแอดมินอนุมัติการออกฝึกงาน', 'ออกฝึกงาน', 'กำลังออกฝึกงาน'
)

-- EVALUATION_AND_COMPLETION
WHERE status IN (
  'สิ้นสุดการฝึกงาน (รอประเมิน)', 'สิ้นสุดการฝึกงาน',
  'ประเมินจากสถานประกอบการแล้ว', 'ประเมินจากอาจารย์แล้ว',
  'ประเมินเสร็จแล้ว', 'ฝึกงานเสร็จแล้ว', 'เสร็จสิ้นสมบูรณ์'
)

-- REJECTED_AND_CANCELLED (ใช้เป็นเงื่อนไข exclude เสมอ — ห้ามใช้ = 'rejected' ลอยๆ)
WHERE status NOT IN (
  'ไม่อนุมัติ (อาจารย์)', 'ไม่อนุมัติ (Admin)', 'ไม่อนุมัติ',
  'ปฏิเสธ', 'ยกเลิก', 'ร่าง'
) AND status NOT LIKE '%ไม่อนุมัติ%'
```

> ⚠️ **กฎการเขียน query:** ห้ามเช็คสถานะด้วย `= 'ค่าเดียว'` หรือ `LIKE '%คำเดียว%'` แบบกว้าง —
> `LIKE '%อนุมัติ%'` จะชน `ไม่อนุมัติ` เสมอ (เคยเกิดบั๊ก classification ใน dashboard แล้ว)
> ให้เช็คกลุ่ม REJECTED ก่อนเสมอ แล้วค่อยเช็คกลุ่มที่ต้องการ

---

## 2. Dual-Trigger Transition Matrix

สถานะเปลี่ยนผ่าน 2 กลไก: **Manual (API)** และ **Automated (ระบบ)** — ทดสอบต้องครอบคลุมทั้งคู่

### 2.1 Manual API Triggers (ผู้ใช้กระทำ)

| # | Actor | Endpoint / Action | From → To | หมายเหตุ |
| :-: | :--- | :--- | :--- | :--- |
| M1 | นักศึกษา | `POST /api/requests` | — → `รออาจารย์ที่ปรึกษาอนุมัติ` | DEFAULT ของตาราง; ส่งอีเมลยืนยันการยื่น |
| M2 | อาจารย์ | `PATCH /api/requests/:id/status` | `รออาจารย์ที่ปรึกษาอนุมัติ` → `รอผู้ดูแลระบบตรวจสอบ` / `ไม่อนุมัติ (อาจารย์)` | แนบ `advisor_comment` ได้ |
| M3 | แอดมิน | `PATCH /:id/status` + `dispatchLetter` | `รอผู้ดูแลระบบ*` → `รอสถานประกอบการตอบรับ` | แนบหนังสือส่งตัว + ออกลิงก์/QR ตอบรับ (token 7 วัน) |
| M4 | แอดมิน | `PATCH /:id/status` | `รอผู้ดูแลระบบ*` → `ไม่อนุมัติ (Admin)` | แนบ `admin_comment` |
| M5 | สถานประกอบการ | `PATCH /api/public/requests/:id/status?responseToken=…` | `รอสถานประกอบการตอบรับ` → `สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)` หรือ `ปฏิเสธ` | **ไม่ต้อง login** — ยึด token ใน `details.companyResponseToken`; payload มี `statusCode: 'COMPANY_ACCEPTED'` |
| M6 | แอดมิน | `PATCH /:id/internship-period` (หรือ `/batch/internship-period`) | ตั้ง `internship_start_date`/`end_date` + `details.startDate` | ไม่เปลี่ยน status โดยตรง |
| M7 | แอดมิน | `PATCH /:id/status` → `ออกฝึกงาน` | สถานะอนุมัติ → `ออกฝึกงาน` | auto-เติม `internship_start_date = CURDATE()` ถ้าว่าง |
| M8 | แอดมิน | `PATCH /:id/status` → `อนุมัติแล้ว` | `สถานประกอบการตอบรับแล้ว` → `อนุมัติแล้ว` | เฟสเตรียมออกฝึกงาน |
| M9 | บริษัท | `POST /api/public/evaluate/:requestId` | ฝั่งประเมิน → `ประเมินจากสถานประกอบการแล้ว` | public endpoint; คำนวณ totalScore ฝั่ง server |
| M10 | อาจารย์ | `POST /api/advisor-evaluations/request/:requestId` | → `ประเมินจากอาจารย์แล้ว` | authenticated |
| M11 | แอดมิน | `PATCH /batch/status` | bulk เปลี่ยนสถานะ | admin only — ใช้ระวังเพราะข้าม transition guard |

### 2.2 Automated Engine Triggers (ระบบกระทำ)

| # | Engine | เงื่อนไข | From → To | จุดเรียกใช้ |
| :-: | :--- | :--- | :--- | :--- |
| A1 | **Time-based: เริ่มฝึกงาน** | `COALESCE(internship_start_date, details.startDate) <= today (Asia/Bangkok)` และ status ∈ PRE_INTERNSHIP_STATUSES | → `ออกฝึกงาน` + notification นักศึกษา | `internshipCron.js` (00:00 BKK) + lazy ใน `GET /api/requests` — `src/utils/internshipAutoUpdate.js` |
| A2 | **Condition-based: ประเมินครบ** | มีแถวทั้ง `evaluations` และ `advisor_evaluations` ของ requestId เดียวกัน | `ออกฝึกงาน`/`กำลังออกฝึกงาน`/`ประเมินเสร็จแล้ว`/`สิ้นสุดการฝึกงาน (รอประเมิน)` → `ฝึกงานเสร็จแล้ว` | lazy ใน `GET /api/requests` (กู้สถานะค้างจาก bug เดิม) |
| A3 | **Time-based: ปิดงวดประเมิน** | `status='ประเมินเสร็จแล้ว'` และ `evaluations.createdAt <= NOW()-3 DAY` | → `ฝึกงานเสร็จแล้ว` | lazy ใน `GET /api/requests` |

> **สถาปัตยกรรม:** Automated triggers ทำงานแบบ *lazy evaluation* เป็นหลัก
> (fire เมื่อมี request เข้า `GET /api/requests`) เสริมด้วย cron เที่ยงคืน —
> หมายความว่าระบบทำงานถูกต้องแม้ cron ล่ม แต่ notification อาจมาช้ากว่ากำหนดถ้าไม่มีใครเปิดระบบ

### 2.3 Lifecycle Timeline (รวมทั้งสองกลไก)

```
ยื่นคำร้อง ─M1→ รออาจารย์ฯ ─M2→ รอผู้ดูแลตรวจสอบ ─M3→ รอบริษัทตอบรับ
                                                              │ M5 (public token)
                                                              ▼
                                          สถานประกอบการตอบรับแล้ว
                                                              │ M6/M8
                                                              ▼
                                       อนุมัติแล้ว / รออนุมัติเริ่มฝึกงาน
                                                              │ A1(auto) หรือ M7(manual)
                                                              ▼
                                          ออกฝึกงาน ─[daily_checkins]─
                                                              │
                                                              ▼
                                    สิ้นสุดการฝึกงาน (รอประเมิน)
                                          │ M9/M10 (ประเมิน 2 ฝั่ง)
                                          ▼
                              ประเมินเสร็จแล้ว ─A2/A3→ ฝึกงานเสร็จแล้ว → เสร็จสิ้นสมบูรณ์

สาขาปฏิเสธ: M2→ไม่อนุมัติ(อาจารย์) · M4→ไม่อนุมัติ(Admin) · M5→ปฏิเสธ · ทุกจุด→ยกเลิก
```

---

## 3. Cross-Module Integration Matrix

### 3.1 requests.status × โมดูลเช็คอิน (daily_checkins)

| เงื่อนไขการอนุญาต | รายละเอียด |
| :--- | :--- |
| INSERT/SELECT `daily_checkins` | `checkinRoutes.js` ค้นคำร้องของ studentId ที่ status ∈ `('ออกฝึกงาน','กำลังออกฝึกงาน','INTERNING','IN_PROGRESS','TRAINING','START_INTERNSHIP','ฝึกงานเสร็จแล้ว','ประเมินจากสถานประกอบการแล้ว','ประเมินจากอาจารย์แล้ว','เสร็จสิ้นสมบูรณ์')` |
| Guard วันที่ | `date >= internship_start_date` — ห้ามบันทึก/เซ็นย้อนหลังก่อนวันเริ่มฝึกงาน (HTTP 400) |
| ENUM ของตาราง | `present` / `late` / `absent` (default `present`) — ภาษาอังกฤษ ต่างจาก requests ที่เป็นภาษาไทย |

### 3.2 requests.status × โมดูลอื่น

| โมดูล | จุดเชื่อมโยง | ตรรกะ |
| :--- | :--- | :--- |
| `evaluations` (บริษัทประเมิน) | JOIN ด้วย `requestId` | มีแถว → `hasCompanyEval=true` ใน GET /api/requests |
| `advisor_evaluations` | JOIN ด้วย `requestId` | มีแถว → `hasAdvisorEval=true`; ครบคู่กัน → trigger A2 |
| `evaluation_rounds.isActive` | POST `/api/public/evaluate/:id` และ advisor eval | ต้องอยู่ในช่วง `startDate`–`endDate` ของรอบที่ isActive=1 มิฉะนั้นตอบ "นอกช่วงเวลาการประเมิน" |
| `companies` (แนะนำสถานประกอบการ) | `GET /api/public/companies` | รวมบริษัทจาก `requests` ที่ **ไม่อยู่ใน REJECTED_AND_CANCELLED** (`NOT LIKE '%ไม่อนุมัติ%' AND NOT IN ('ปฏิเสธ','ยกเลิก','ร่าง')`) merge กับตาราง companies |
| `internships` (ประวัติโปรไฟล์) | โมดูล profile แยกอิสระ | ENUM `in_progress/completed/cancelled` — ไม่ sync กับ requests โดยอัตโนมัติ |
| `notifications` | transition ทุกขั้น | `type='request_status'`, link `/dashboard`, ระบบ auto (A1) แจ้งนักศึกษาเมื่อเริ่มฝึกงาน |
| `payment_proofs` | ไม่ผูกกับ requests.status | ENUM `pending/approved/rejected` — workflow ชำระเงินแยก |
| `projects` (โปรไฟล์) | ไม่ผูก | ENUM draft→approved→in_progress→waiting_defense→passed_defense→completed |

---

## 4. Security & Data Isolation

### 4.1 Token-gated Company Access (สถานประกอบการภายนอก)

| มาตรการ | การใช้งานจริง |
| :--- | :--- |
| Token ในลิงก์ | `details.companyResponseToken` ออกตอนแอดมินส่งหนังสือส่งตัว (M3); ผูกกับคำร้องใบเดียว |
| อายุ token | `COMPANY_RESPONSE_TOKEN_TTL_MS = 7 วัน` (`companyResponseTokenExpiresAt`) |
| One-time use | ตอบรับ/ปฏิเสธแล้วตั้ง `companyResponseTokenUsedAt` → ลิงก์ใช้ซ้ำไม่ได้ (403) |
| Route แยก | `publicRequestRoutes.js` mount แยก — `requireCompanyResponseToken` middleware บังคับทุก request; ไม่ผ่าน `authenticate` |
| ข้อมูลที่เข้าถึงได้ | เฉพาะคำร้องที่ token ผูกอยู่ (`GET /api/public/requests/:id`, `PATCH /:id/status`) — ไม่เห็นคำร้องอื่น |
| การเพิกถอน | ลบ `companyResponseTokenUsedAt`/ออก token ใหม่ (โค้ดมี delete/regenerate logic ใน requestRoutes) |

### 4.2 Role-based Access (ผู้ใช้ภายใน)

| Endpoint | Guard | สถานะปัจจุบัน |
| :--- | :--- | :--- |
| `GET /api/requests` | `authenticate` | ✅ ทุก role เข้าได้ แต่ query filter ตามสิทธิ์ (studentId ของตัวเอง) |
| `PATCH /batch/*`, `/internship-period` | `authenticate` + `authorize('admin')` | ✅ admin only |
| `PATCH /:id/appointment` | `authenticate` + เช็ค role จาก DB (admin หรือ ประธานสาขา) | ✅ อ่าน role สดจาก DB ไม่เชื่อ JWT |
| `PATCH evaluator_email` | `authenticate` + ปฏิเสธถ้า `req.user.role==='student'` | ✅ นักศึกษาแก้อีเมลผู้ประเมินไม่ได้ (403) |
| `GET /evaluations/analytics` | `authenticate` + `req.user.role==='admin'` | ✅ admin only |
| `POST /admin/evaluation-rounds` | `authenticate` + `authorize('admin')` | ✅ admin only |

### 4.3 Raw Evaluation Scores — ✅ แก้ไขแล้ว (2026-10-03)

เดิม endpoint คะแนนดิบมีแค่ `authenticate` — นักศึกษาอ่านคะแนนของ requestId ใดก็ได้
ปัจจุบันเพิ่ม middleware `restrictEvaluationScores` ใน `evaluationRoutes.js` แล้ว:

| Endpoint | Guard | พฤติกรรม |
| :--- | :--- | :--- |
| `GET /api/evaluations/request/:requestId` | `authenticate` + `restrictEvaluationScores` | student → **403** `"ไม่อนุญาตให้นักศึกษาเข้าถึงคะแนนประเมินโดยตรง"`; role อื่นที่ไม่ใช่ admin/advisor/teacher → 403 |
| `GET /api/advisor-evaluations/request/:requestId` | เช่นเดียวกัน | เช่นเดียวกัน |

> **นโยบายที่บังคับ:** นักศึกษาเห็นเฉพาะ *progress* (`hasCompanyEval`/`hasAdvisorEval`
> ใน `GET /api/requests`) ไม่ใช่ raw scores — ตรงตามสถาปัตยกรรมแล้ว

### 4.4 Data Isolation สรุป

- **บริษัทภายนอก**: เข้าถึงได้เฉพาะผ่าน token URL — ไม่มีบัญชี ไม่เห็นข้อมูลผู้อื่น
- **นักศึกษา**: `GET /api/requests?studentId=` ใช้ filter ตัวเอง; patch evaluator_email ถูก block; **ยกเว้น** GAP 4.3 เรื่อง raw scores
- **อาจารย์**: อนุมัติ/ประเมินได้ แต่ action บางอย่าง (appointment) ต้องเป็นประธานสาขา — เช็ค role สดจาก DB ทุกครั้ง
- **แอดมิน**: full access ผ่าน `authorize('admin')`

---

## 5. ภาคผนวก: รายการไฟล์อ้างอิง

| เลเยอร์ | ไฟล์ | บทบาท |
| :--- | :--- | :--- |
| Status UI | `coop-frontend/src/components/StatusBadge.jsx` | map สถานะ→สี/label กลาง |
| Workflow | `coop-backend/src/routes/requestRoutes.js` | transitions ทั้งหมด + lazy auto-update |
| Public | `coop-backend/src/routes/publicRequestRoutes.js` | token-gated บริษัท |
| Auto-engine | `coop-backend/src/utils/internshipAutoUpdate.js` | canonical auto-update วันเริ่มฝึกงาน |
| Scheduler | `coop-backend/src/cron/internshipCron.js` | cron 00:00 Asia/Bangkok |
| Check-in | `coop-backend/src/routes/checkinRoutes.js` | gate สถานะ + วันเริ่มฝึกงาน |
| Evaluation | `coop-backend/src/routes/evaluationRoutes.js` | ประเมิน 2 ฝั่ง + รอบประเมิน |
| Schema | `db/01-schema.sql` | DEFAULT/ENUM ทุกตาราง |
| Diagnostic | `coop-backend/check-internship-dates.js` | ตรวจคำร้องค้างสถานะ (`--apply` แก้จริง) |
| Status doc | `STATUS_REFERENCE.md` | ตารางสถานะดิบ 25 ค่า |

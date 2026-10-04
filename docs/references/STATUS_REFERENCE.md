# เอกสารอ้างอิงสถานะระบบ (Comprehensive System Status Reference & Transition Matrix)
## ระบบบริหารจัดการการฝึกประสบการณ์วิชาชีพและสหกิจศึกษา
### คณะศิลปศาสตร์และวิทยาศาสตร์ มหาวิทยาลัยราชภัฏศรีสะเกษ (LASC SSKRU)

เวอร์ชัน: 2.0 — อัปเดตล่าสุด 2026-10-03
อ้างอิงข้อเท็จจริงจาก: `db/01-schema.sql`, `coop-backend/src/`, `coop-frontend/src/components/StatusBadge.jsx`
เอกสารคู่ขนาน: `SYSTEM_BLUEPRINT.md` (canonical model + security)

> **หลักการสำคัญ:** `requests.status` เป็น `VARCHAR(100)` เก็บ**ข้อความภาษาไทยตรงๆ**
> ไม่มี enum key ภาษาอังกฤษ — "ค่าสถานะใน DB" = สตริงที่บันทึกจริงทุกประการ
> ตารางโมดูลอื่น (`daily_checkins`, `projects`, ฯลฯ) ใช้ ENUM ภาษาอังกฤษ — ดู §3

---

## สารบัญ

1. [ตารางแจกแจงสถานะคำร้อง 25 ค่า](#1-ตารางแจกแจงสถานะคำร้อง-requestsstatus)
2. [State Transition Flow & Trigger Matrix](#2-state-transition-flow--trigger-matrix)
3. [สถานะโมดูลอื่น (English ENUM)](#3-ตารางสถานะของโมดูลอื่นในระบบ)
4. [Legacy Keys & Canonical Mapping](#4-legacy-keys--canonical-mapping)

---

## 1. ตารางแจกแจงสถานะคำร้อง (requests.status)

### 1.1 กลุ่มเส้นทางหลัก (Happy Path Lifecycle)

| ลำดับ | ค่าสถานะใน DB (ภาษาไทยตรง) | กลุ่มขั้นตอน | ผู้มีสิทธิ์เปลี่ยน | Badge บน UI (ข้อความ / สี) | ความหมาย |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `ยังไม่ได้ยื่นคำร้อง` | ก่อนยื่น | — (ค่าสังเคราะห์ frontend) | ยังไม่ได้ยื่นคำร้อง / slate-เทา | นักศึกษายังไม่มีแถวคำร้อง — ไม่มีค่านี้ใน DB |
| 2 | `รออาจารย์ที่ปรึกษาอนุมัติ` | ยื่นคำร้อง | นักศึกษา (ยื่น), อาจารย์ (เปลี่ยนต่อ) | เหมือน DB / amber | DEFAULT ของตาราง — จุดเริ่มต้นทุกคำร้อง |
| 3 | `รอผู้ดูแลระบบตรวจสอบ` | พิจารณาภายใน | อาจารย์ → แอดมิน | เหมือน DB / amber | อาจารย์อนุมัติแล้ว ส่งต่อแอดมินตรวจสอบ |
| 4 | `รอผู้ดูแลระบบอนุมัติ` | พิจารณาภายใน | แอดมิน | เหมือน DB / amber | variant ของ #3 — ใช้แทนกันใน UI |
| 5 | `รอสถานประกอบการตอบรับ` | ประสานบริษัท | แอดมิน → บริษัท | เหมือน DB / violet | แอดมินแนบหนังสือส่งตัว + ออกลิงก์/QR token 7 วัน |
| 6 | `สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)` | ประสานบริษัท | บริษัท (public token) | `รอแอดมินออกใบส่งตัว` / indigo | บริษัทกดตอบรับผ่านลิงก์ (payload `COMPANY_ACCEPTED`) |
| 7 | `อนุมัติแล้ว` | เตรียมออกฝึกงาน | แอดมิน | `รอแอดมินอนุมัติการออกฝึกงาน` (บางหน้าแสดง "อนุมัติแล้ว") / emerald หรือ sky | อนุมัติครบแล้ว รอกำหนด/ถึงวันเริ่ม |
| 8 | `อนุมัติแล้ว (รอออกฝึกงาน)` | เตรียมออกฝึกงาน | แอดมิน / ระบบ | อนุมัติแล้ว (รอออกฝึกงาน) / amber | กำหนดวันแล้ว รอถึงวันเริ่มจริง |
| 9 | `รออาจารย์อนุมัติเริ่มฝึกงาน` | เตรียมออกฝึกงาน | อาจารย์ | `รอแอดมินอนุมัติการออกฝึกงาน` / sky | flow อนุมัติขั้นเริ่มฝึก (variant) |
| 10 | `รอแอดมินอนุมัติเริ่มฝึกงาน` | เตรียมออกฝึกงาน | แอดมิน | `รอแอดมินอนุมัติการออกฝึกงาน` / sky | variant ของขั้นเดียวกัน |
| 11 | `รอแอดมินอนุมัติการออกฝึกงาน` | เตรียมออกฝึกงาน | แอดมิน | เหมือน DB / sky | variant — display label ของ badge เดียวกัน |
| 12 | `ออกฝึกงาน` | กำลังฝึกงาน | แอดมิน / **ระบบ (AUTO)** | `กำลังออกฝึกงาน` / emerald | ถึงวันเริ่มฝึกงาน (cron+lazy) หรือแอดมินกดอนุมัติ — auto-เติม start_date ถ้าว่าง |
| 13 | `กำลังออกฝึกงาน` | กำลังฝึกงาน | ระบบ | `กำลังออกฝึกงาน` / emerald | คีย์สำรองเทียบเท่า #12 — ใช้ใน check-in/supervision queries |
| 14 | `สิ้นสุดการฝึกงาน (รอประเมิน)` | ช่วงประเมิน | นักศึกษา/แอดมิน/ระบบ | เหมือน DB / violet | ครบกำหนดฝึกงาน รอประเมินจาก 2 ฝั่ง |
| 15 | `สิ้นสุดการฝึกงาน` | ช่วงประเมิน | ระบบ | เหมือน DB / violet | variant ไม่มีวงเล็บ — badge map รวมกับ #14 |
| 16 | `ประเมินจากสถานประกอบการแล้ว` | ช่วงประเมิน | บริษัท (public endpoint) | เหมือน DB / purple | บริษัทส่งแบบประเมินแล้ว รออาจารย์ |
| 17 | `ประเมินจากอาจารย์แล้ว` | ช่วงประเมิน | อาจารย์ | เหมือน DB / purple | อาจารย์ประเมินแล้ว รอบริษัท |
| 18 | `ประเมินเสร็จแล้ว` | ช่วงประเมิน | ระบบ/แอดมิน | เหมือน DB / purple | ประเมินครบ → auto เปลี่ยนเป็น #19 หลัง 3 วัน |
| 19 | `ฝึกงานเสร็จแล้ว` | ปิดงาน | ระบบ (AUTO) | เหมือน DB / purple | ประเมินครบ 2 ฝั่ง (A2) หรือ ประเมินเสร็จ+3 วัน (A3) |
| 20 | `เสร็จสิ้นสมบูรณ์` | ปิดงาน | แอดมิน/ระบบ | เหมือน DB / emerald | สถานะสุดท้ายของ workflow |

### 1.2 กลุ่มปฏิเสธ / ส่งกลับแก้ไข (Rejection & Revision — 4 สาขา)

| ลำดับ | ค่าสถานะใน DB | สาขา | ผู้มีสิทธิ์ | Badge / สี | ความหมาย |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 21 | `ไม่อนุมัติ (อาจารย์)` | อาจารย์ปฏิเสธ | อาจารย์ที่ปรึกษา | เหมือน DB / rose | ปฏิเสธที่ขั้นอาจารย์ — แนบ `advisor_comment` |
| 22 | `ไม่อนุมัติ (Admin)` | แอดมินปฏิเสธ | แอดมิน | เหมือน DB / rose | ปฏิเสธที่ขั้นแอดมิน — แนบ `admin_comment` |
| 23 | `ปฏิเสธ` | บริษัทปฏิเสธ | สถานประกอบการ (public token) | เหมือน DB / rose | บริษัทกดปฏิเสธผ่านลิงก์ — label ที่เกี่ยวข้อง: `สถานประกอบการปฏิเสธคำร้องฝึกงาน` |
| 24 | `ไม่อนุมัติ` | ส่งกลับแก้ไข (generic) | อาจารย์/แอดมิน | เหมือน DB / rose | รูปแบบกว้าง — UI แสดงเป็น "ไม่อนุมัติ / ส่งกลับแก้ไข" ให้นักศึกษาแก้แล้วยื่นใหม่ |
| 25 | `ยกเลิก` | ยกเลิกคำร้อง | ทุกบทบาท | เหมือน DB / rose | คำร้องถูกยกเลิก — exclude จากรายงาน/แนะนำบริษัทเสมอ |

### 1.3 กลุ่มคำพ้องความหมาย (Synonym / Variant Map)

| ชุด | ค่าที่มีความหมายเดียวกัน | หมายเหตุ |
| :---: | :--- | :--- |
| A | `ออกฝึกงาน` ≡ `กำลังออกฝึกงาน` | badge แสดง `กำลังออกฝึกงาน` เสมอ — query ต้อง IN ทั้งคู่ + legacy keys (§4) |
| B | `สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)` ≡ `ตอบรับแล้ว` ≡ `รอแอดมินออกใบส่งตัว` ≡ `รอออกใบส่งตัว` ≡ `COMPANY_ACCEPTED`* | badge แสดง `รอแอดมินออกใบส่งตัว` เสมอ |
| C | `รอผู้ดูแลระบบตรวจสอบ` ≡ `รอผู้ดูแลระบบอนุมัติ` ≡ `รอตรวจสอบ` ≡ `รออนุมัติ` | ขั้นรอแอดมินขั้นแรก |
| D | `รออาจารย์อนุมัติเริ่มฝึกงาน` ≡ `รอแอดมินอนุมัติเริ่มฝึกงาน` ≡ `รอแอดมินอนุมัติการออกฝึกงาน` ≡ `อนุมัติแล้ว` (ในบางบริบท) | badge แสดง `รอแอดมินอนุมัติการออกฝึกงาน` |
| E | `สิ้นสุดการฝึกงาน (รอประเมิน)` ≡ `สิ้นสุดการฝึกงาน` | badge map `includes('สิ้นสุดการฝึกงาน')` |
| F | `ไม่อนุมัติ (อาจารย์)` ≡ `ไม่อนุมัติ (Admin)` ≡ `ไม่อนุมัติ` ≡ `ปฏิเสธ` ≡ `สถานประกอบการปฏิเสธคำร้องฝึกงาน` | กลุ่มปฏิเสธ — badge map `includes('ไม่อนุมัติ'/'ปฏิเสธ'/'ยกเลิก')` |

\* `COMPANY_ACCEPTED` เป็น statusCode ใน payload ไม่ได้เขียนลง `requests.status` — ดู §4

### 1.4 สี Badge (จาก StatusBadge.jsx)

| สี | Tailwind classes | ใช้กับกลุ่ม |
| :--- | :--- | :--- |
| เหลืองอำพัน | `bg-amber-50 text-amber-700 border-amber-200` + dot `bg-amber-500` | รออนุมัติ/ตรวจสอบ, อนุมัติแล้ว(รอออกฝึกงาน) |
| เขียวมรกต | `bg-emerald-50 text-emerald-700 border-emerald-200` + dot `bg-emerald-500` | กำลังออกฝึกงาน, อนุมัติแล้ว, เสร็จสมบูรณ์ |
| คราม | `bg-indigo-50 text-indigo-700 border-indigo-200` + dot `bg-indigo-500` | บริษัทตอบรับแล้ว/รอใบส่งตัว |
| ม่วงอ่อน | `bg-violet-50 text-violet-700 border-violet-100/200` + dot `bg-violet-500` | รอบริษัทตอบรับ, สิ้นสุดการฝึกงาน |
| ฟ้า | `bg-sky-50 text-sky-700 border-sky-100` + dot `bg-sky-500` | รอแอดมินอนุมัติการออกฝึกงาน |
| ม่วง | `bg-purple-50 text-purple-700 border-purple-100` + dot `bg-purple-500` | กลุ่มประเมิน/ฝึกงานเสร็จ |
| แดงกุหลาบ | `bg-rose-50 text-rose-700 border-rose-100` + dot `bg-rose-500` | กลุ่มปฏิเสธ/ยกเลิก |
| เทา | `bg-slate-50 text-slate-700 border-slate-200` + dot `bg-slate-400` | fallback / ไม่ทราบสถานะ |

---

## 2. State Transition Flow & Trigger Matrix

### 2.1 แผนภาพลำดับขั้น (Lifecycle Flow)

```
                         ┌─────────────────────────────────────────┐
                         │            HAPPY PATH                    │
                         └─────────────────────────────────────────┘

 [นักศึกษายื่นคำร้อง POST /api/requests]
        │
        ▼
 รออาจารย์ที่ปรึกษาอนุมัติ ────────(M2: อาจารย์ปฏิเสธ)──────────────▶ ไม่อนุมัติ (อาจารย์) ✕
        │ (M2: อาจารย์อนุมัติ)
        ▼
 รอผู้ดูแลระบบตรวจสอบ / รอผู้ดูแลระบบอนุมัติ ──(M4: แอดมินปฏิเสธ)──▶ ไม่อนุมัติ (Admin) ✕
        │ (M3: แอดมินแนบหนังสือส่งตัว + ออก token 7 วัน)
        ▼
 รอสถานประกอบการตอบรับ ────(M5: บริษัทปฏิเสธผ่าน public token)──▶ ปฏิเสธ ✕
        │ (M5: บริษัทตอบรับ — token ใช้ครั้งเดียว)
        ▼
 สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน) / ตอบรับแล้ว
        │ (M6: แอดมินกำหนด internship_start/end_date, M8: อนุมัติ)
        ▼
 อนุมัติแล้ว / อนุมัติแล้ว (รอออกฝึกงาน) / รอ(อาจารย์|แอดมิน)อนุมัติเริ่มฝึกงาน
        │
        ├──── A1 (AUTO): internship_start_date <= วันนี้ (Asia/Bangkok)
        │       └─ cron 00:00 + lazy GET /api/requests → ออกฝึกงาน + notification
        └──── M7 (MANUAL): แอดมินกด "อนุมัติการออกฝึกงาน" + แนบหนังสือ
        ▼
 ออกฝึกงาน / กำลังออกฝึกงาน ════[daily_checkins: present/late/absent]════
        │ (ครบกำหนด / ปิดงวด)
        ▼
 สิ้นสุดการฝึกงาน (รอประเมิน)
        │ M9: บริษัทประเมิน          M10: อาจารย์ประเมิน
        ▼                             ▼
 ประเมินจากสถานประกอบการแล้ว   ประเมินจากอาจารย์แล้ว
        └──────────────┬───────────────┘
                       │ (ประเมินครบ 2 ฝั่ง)
                       ▼
               ประเมินเสร็จแล้ว ──A3: +3 วัน──┐
                       │                     ├──▶ ฝึกงานเสร็จแล้ว ──▶ เสร็จสิ้นสมบูรณ์ ✔
                       └──A2: evals ครบคู่──┘

 สาขาเสริม: ทุกสถานะ ──(ยกเลิก)──▶ ยกเลิก ✕
            ไม่อนุมัติ ──(นักศึกษาแก้ไขยื่นใหม่)──▶ รออาจารย์ที่ปรึกษาอนุมัติ (วนกลับ)
```

### 2.2 Trigger Matrix

#### Manual Triggers (API — ผู้ใช้กระทำ)

| ID | Actor | Endpoint / Action | Transition | Guard |
| :---: | :--- | :--- | :--- | :--- |
| M1 | นักศึกษา | `POST /api/requests` | — → `รออาจารย์ที่ปรึกษาอนุมัติ` | `authenticate` (student) |
| M2 | อาจารย์ | `PATCH /api/requests/:id/status` | → `รอผู้ดูแลระบบตรวจสอบ` หรือ `ไม่อนุมัติ (อาจารย์)` | `authenticate` |
| M3 | แอดมิน | `PATCH /:id/status` + `dispatchLetter` + ออก token | → `รอสถานประกอบการตอบรับ` | `authenticate` |
| M4 | แอดมิน | `PATCH /:id/status` | → `ไม่อนุมัติ (Admin)` | `authenticate` |
| M5 | บริษัท | `PATCH /api/public/requests/:id/status?responseToken=…` | → `สถานประกอบการตอบรับแล้ว (…)` หรือ `ปฏิเสธ` | `requireCompanyResponseToken` (ไม่ใช่ login) |
| M6 | แอดมิน | `PATCH /:id/internship-period` หรือ `PATCH /batch/internship-period` | ตั้ง `internship_start_date`/`end_date` (status ไม่เปลี่ยน) | `authorize('admin')` |
| M7 | แอดมิน | `PATCH /:id/status` → `ออกฝึกงาน` | → `ออกฝึกงาน` (+auto `internship_start_date=CURDATE()` ถ้าว่าง) | `authenticate` |
| M8 | แอดมิน | `PATCH /:id/status` → `อนุมัติแล้ว` | → `อนุมัติแล้ว` | `authenticate` |
| M9 | บริษัท | `POST /api/public/evaluate/:requestId` | → `ประเมินจากสถานประกอบการแล้ว` | public + evaluation round isActive |
| M10 | อาจารย์ | `POST /api/advisor-evaluations/request/:requestId` | → `ประเมินจากอาจารย์แล้ว` | `authenticate` |
| M11 | แอดมิน | `PATCH /batch/status` | bulk → status อะไรก็ได้ | `authorize('admin')` ⚠️ ข้าม transition guard |

#### Automated Triggers (ระบบกระทำ)

| ID | Engine | เงื่อนไข | Transition | จุดทำงาน |
| :---: | :--- | :--- | :--- | :--- |
| A1 | Time-based (เริ่มฝึกงาน) | `COALESCE(internship_start_date, details.startDate) <= today@Asia/Bangkok` และ status ∈ กลุ่มก่อนฝึกงาน | → `ออกฝึกงาน` + notification นักศึกษา | `cron/internshipCron.js` (00:00 BKK) + lazy `GET /api/requests` — `utils/internshipAutoUpdate.js` |
| A2 | Condition-based (ประเมินครบคู่) | มีแถวทั้ง `evaluations` และ `advisor_evaluations` | `ออกฝึกงาน`/`กำลังออกฝึกงาน`/`ประเมินเสร็จแล้ว`/`สิ้นสุดการฝึกงาน (รอประเมิน)` → `ฝึกงานเสร็จแล้ว` | lazy `GET /api/requests` (กู้สถานะค้าง) |
| A3 | Time-based (ปิดงวด) | `status='ประเมินเสร็จแล้ว'` ∧ `evaluations.createdAt <= NOW()-3 DAY` | → `ฝึกงานเสร็จแล้ว` | lazy `GET /api/requests` |

> **สถาปัตยกรรม:** Auto triggers ทำงานแบบ lazy เป็นหลัก (fire เมื่อมีคนเรียก GET /api/requests)
> เสริม cron เที่ยงคืน — cron ล่มระบบยังถูกต้อง แต่ notification อาจมาช้าถ้าไม่มีผู้ใช้เปิดระบบ

---

## 3. ตารางสถานะของโมดูลอื่นในระบบ

สถานะเหล่านี้เป็น **ENUM/VARCHAR ภาษาอังกฤษ** — ต่างจาก `requests.status` ที่เป็นภาษาไทย

| ตาราง | คอลัมน์ | ชนิด | ค่าทั้งหมด | Default | ความสัมพันธ์กับ requests |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `daily_checkins` | `status` | ENUM | `present`, `late`, `absent` | `present` | เขียนได้เฉพาะช่วง request ∈ INTERNSHIP_ACTIVE และ `date >= internship_start_date` |
| `payment_proofs` | `status` | ENUM | `pending`, `approved`, `rejected` | `pending` | workflow ชำระเงินแยกอิสระ — ไม่ผูกสถานะคำร้อง |
| `projects` | `status` | ENUM | `draft` → `approved` → `in_progress` → `waiting_defense` → `passed_defense` → `completed` | `draft` | โครงงานในระบบ profile — ไม่ผูกคำร้อง |
| `internships` | `status` | ENUM | `in_progress`, `completed`, `cancelled` | `in_progress` | ประวัติฝึกงานในโปรไฟล์ — ไม่ sync อัตโนมัติ |
| `internships` | `evaluation_status` | VARCHAR | `pending` (และอื่นๆ) | `pending` | สถานะประเมินของ record ประวัติ |
| `companies` | `status` | VARCHAR | `completed` ฯลฯ | `completed` | ใช้แยกแหล่งข้อมูลบริษัทแนะนำ |
| `profile` | `student_status` | VARCHAR | `active` ฯลฯ | `active` | สถานะนักศึกษา (ระบบ profile) |
| `evaluation_rounds` | `isActive` | TINYINT | `0`, `1` | `0` | gate การส่งแบบประเมิน — ต้องอยู่ในช่วง startDate–endDate ของรอบที่เปิด |
| `notifications` | `type` | VARCHAR | `request_status`, `evaluation`, `general` ฯลฯ | — | สร้างตาม transition ของคำร้อง |
| `requests` | `status` | VARCHAR(100) | ภาษาไทย 25 ค่า (§1) | `รออาจารย์ที่ปรึกษาอนุมัติ` | — |

---

## 4. Legacy Keys & Canonical Mapping

### 4.1 คีย์ภาษาอังกฤษสำรอง (ไม่เขียนลง requests.status แต่ query ดักไว้)

| คีย์ | ปรากฏที่ | ความหมาย / เหตุผล |
| :--- | :--- | :--- |
| `COMPANY_ACCEPTED` | payload `statusCode` ใน `PublicRequestPage.jsx` | รหัสประกอบการตอบรับ — ค่าที่บันทึกจริงคือ `สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)` |
| `INTERNING`, `IN_PROGRESS`, `TRAINING`, `START_INTERNSHIP` | `checkinRoutes.js` (SELECT status IN) | คีย์จากระบบเก่า/migration — ถูก select รวมเป็น "กำลังฝึกงาน" เพื่อความเข้ากันได้ |
| `approved`, `completed`, `rejected` | ตาราง ENUM โมดูลอื่น | คนละ namespace กับ requests — ห้ามนำไปใช้กับ requests.status |
| `pending`, `waiting_company` ฯลฯ | (ไม่มีในระบบนี้) | ระบบไม่ใช้คีย์อังกฤษกับ requests — อย่าสมมุติใน test/fixture |

### 4.2 กฎการเขียน SQL (บังคับใช้ทุก endpoint)

```sql
-- ❌ ห้าม: เช็คค่าเดียว / LIKE กว้าง — สถานะซ้ำซ้อนจะตกหล่น และ '%อนุมัติ%' ชน 'ไม่อนุมัติ'
WHERE status = 'ออกฝึกงาน'
WHERE status LIKE '%อนุมัติ%'        -- bug เคยเกิดจริงใน dashboard
WHERE status != 'rejected'           -- ระบบไม่มี 'rejected' — จะ match ทุกอย่าง

-- ✅ ต้อง: เช็คกลุ่มปฏิเสธก่อน → แล้ว IN ชุดเต็มของกลุ่มที่ต้องการ
-- "กำลังฝึกงาน" ทุกรูปแบบ:
WHERE status IN ('ออกฝึกงาน', 'กำลังออกฝึกงาน', 'INTERNING', 'IN_PROGRESS', 'TRAINING', 'START_INTERNSHIP')

-- "ไม่ถูกปฏิเสธ" (ใช้ใน company recommendation):
WHERE status NOT LIKE '%ไม่อนุมัติ%'
  AND status NOT IN ('ปฏิเสธ', 'ยกเลิก', 'ร่าง')
```

### 4.3 Canonical Status Map (เตรียม Refactor)

รวบ 25 ค่าเข้า 6 กลุ่มมาตรฐาน (นิยามเต็มอยู่ใน `SYSTEM_BLUEPRINT.md` §1):

| Canonical | ครอบคลุม |
| :--- | :--- |
| `DRAFT_AND_SUBMITTED` | `ร่าง`, `ยังไม่ได้ยื่นคำร้อง`, `รออาจารย์ที่ปรึกษาอนุมัติ` |
| `UNDER_REVIEW` | `รออาจารย์ที่ปรึกษาอนุมัติ`, `รอผู้ดูแลระบบตรวจสอบ`, `รอผู้ดูแลระบบอนุมัติ`, `รอตรวจสอบ`, `รออนุมัติ`, `รอดำเนินการ` |
| `COMPANY_COORDINATION` | `รอสถานประกอบการตอบรับ`, `สถานประกอบการตอบรับแล้ว (…)`, `ตอบรับแล้ว`, `รอแอดมินออกใบส่งตัว`, `รอออกใบส่งตัว` |
| `INTERNSHIP_ACTIVE` | `อนุมัติแล้ว`, `อนุมัติแล้ว (รอออกฝึกงาน)`, `รอ*อนุมัติ*ฝึกงาน` (ทั้ง 3 variant), `ออกฝึกงาน`, `กำลังออกฝึกงาน` |
| `EVALUATION_AND_COMPLETION` | `สิ้นสุดการฝึกงาน*`, `ประเมินจาก*แล้ว` (2 ค่า), `ประเมินเสร็จแล้ว`, `ฝึกงานเสร็จแล้ว`, `เสร็จสิ้นสมบูรณ์` |
| `REJECTED_AND_CANCELLED` | `ไม่อนุมัติ*`, `ปฏิเสธ`, `ยกเลิก`, `ร่าง` |

**แนวทาง refactor อนาคต:**
1. สร้าง `STATUS_GROUPS` constant กลางฝั่ง backend (`utils/requestStatuses.js`) export ชุด `IN (...)` ทั้ง 6 กลุ่ม — ทุก route นำเข้าใช้ แทนการเขียน literal ซ้ำๆ
2. เพิ่มคอลัมน์ `status_group` (หรือ VIEW ที่ derive จาก status) เพื่อ query เร็วโดยไม่แตะข้อมูลเดิม
3. เมื่อมั่นใจแล้วค่อย migrate `requests.status` → canonical key + เก็บ Thai label แยก

---

## 5. ไฟล์อ้างอิงหลัก

| ไฟล์ | บทบาท |
| :--- | :--- |
| `coop-frontend/src/components/StatusBadge.jsx` | map สถานะ→สี/label กลางของ UI |
| `coop-backend/src/routes/requestRoutes.js` | transitions ทั้งหมด + lazy auto-update |
| `coop-backend/src/routes/publicRequestRoutes.js` | ตอบรับ/ปฏิเสธบริษัท (token-gated) |
| `coop-backend/src/utils/internshipAutoUpdate.js` | canonical auto-update วันเริ่มฝึกงาน (Asia/Bangkok) |
| `coop-backend/src/cron/internshipCron.js` | cron 00:00 เรียก auto-update |
| `coop-backend/src/routes/checkinRoutes.js` | gate สถานะ + guard วันเริ่มฝึกงาน |
| `coop-backend/check-internship-dates.js` | diagnostic คำร้องค้างสถานะ (`--apply`) |
| `db/01-schema.sql` | DEFAULT/ENUM ทุกตาราง |
| `SYSTEM_BLUEPRINT.md` | canonical model, security matrix, GAP ที่ต้องแก้ |

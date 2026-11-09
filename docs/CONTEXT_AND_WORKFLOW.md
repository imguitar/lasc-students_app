# Context and Workflow — LASC Students App

เอกสารสรุปบริบทและขั้นตอนการทำงานของทั้งระบบ สำหรับนักพัฒนาที่เข้ามาทำงานต่อ (รวมถึง AI agent)
อ่านไฟล์นี้ไฟล์เดียวแล้วควรรู้ว่าระบบทำอะไร แต่ละส่วนอยู่ที่ไหน ทำงานต่อกันอย่างไร และต้องระวังอะไร

- อัปเดตล่าสุด: 2026-11-06 (ตรวจกับซอร์สโค้ดจริง ณ commit `d30abfc` บวกงานที่ยังไม่ commit เรื่อง seed ผู้ใช้จริง)
- เอกสารเชิงลึกที่เกี่ยวข้อง:
  - [specifications/SYSTEM_BLUEPRINT.md](specifications/SYSTEM_BLUEPRINT.md) — canonical status model, transition matrix, security
  - [references/STATUS_REFERENCE.md](references/STATUS_REFERENCE.md) — สถานะคำร้องดิบทั้ง 25 ค่า + สี badge
  - [specifications/DOCKER.md](specifications/DOCKER.md) — Docker แบบละเอียด
  - [../db/README.md](../db/README.md) — ฐานข้อมูล, migration, ประธานสาขา

---

## สารบัญ

1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [สถาปัตยกรรม](#2-สถาปัตยกรรม)
3. [Tech stack](#3-tech-stack)
4. [โครงสร้าง repository](#4-โครงสร้าง-repository)
5. [ผู้ใช้และสิทธิ์ (Roles)](#5-ผู้ใช้และสิทธิ์-roles)
6. [การยืนยันตัวตนและ SSO](#6-การยืนยันตัวตนและ-sso)
7. [ฐานข้อมูล](#7-ฐานข้อมูล)
8. [ข้อมูลผู้ใช้จริง (Seed)](#8-ข้อมูลผู้ใช้จริง-seed)
9. [ระบบ Profile — ฟีเจอร์และ workflow](#9-ระบบ-profile--ฟีเจอร์และ-workflow)
10. [ระบบ Co-op — ฟีเจอร์และ workflow](#10-ระบบ-co-op--ฟีเจอร์และ-workflow)
11. [การแจ้งเตือนและอีเมล](#11-การแจ้งเตือนและอีเมล)
12. [ไฟล์อัปโหลด](#12-ไฟล์อัปโหลด)
13. [API reference แบบย่อ](#13-api-reference-แบบย่อ)
14. [Development workflow](#14-development-workflow)
15. [Deployment (Production)](#15-deployment-production)
16. [Conventions และข้อตกลงในโค้ด](#16-conventions-และข้อตกลงในโค้ด)
17. [ปัญหาที่รู้แล้วและหนี้ทางเทคนิค](#17-ปัญหาที่รู้แล้วและหนี้ทางเทคนิค)
18. [Troubleshooting](#18-troubleshooting)
19. [ประวัติการพัฒนา](#19-ประวัติการพัฒนา)

---

## 1. ภาพรวมระบบ

ระบบบริการนักศึกษาของ **คณะศิลปศาสตร์และวิทยาศาสตร์ มหาวิทยาลัยราชภัฏศรีสะเกษ (LASC SSKRU)** เป็น monorepo ที่มี 2 ระบบ ทั้งสองระบบใช้ฐานข้อมูล MySQL ก้อนเดียวกันชื่อ `lascstudent`

| ระบบ | ชื่อเรียกในโค้ด | หน้าที่ | Production URL |
|---|---|---|---|
| ระบบฐานข้อมูลนักศึกษา | **Profile** | ทะเบียนนักศึกษา/ศิษย์เก่า/อาจารย์, โปรไฟล์ + resume, โปรเจกต์จบ, ผลงาน, ข่าวสารและกิจกรรม, แชทสาขา, เลื่อนชั้นปี | https://students.sci-sskru.com |
| ระบบศูนย์ฝึกประสบการณ์วิชาชีพ | **Co-op** | คำร้องขอฝึกงาน, ประสานสถานประกอบการ, ใบส่งตัว, เช็คชื่อรายวัน, นิเทศ, ประเมินผล, ขอย้ายสถานที่ฝึก | https://students.sci-sskru.com/coop |

**จุดเชื่อมระหว่าง 2 ระบบ**
- ใช้ตาราง `user`, `profile`, `faculties`, `departments` ร่วมกัน
- ผู้ใช้ล็อกอินที่ Profile แห่งเดียว แล้วเข้า Co-op ผ่าน SSO (หัวข้อ 6)
- ประธานสาขาเก็บไว้ที่ `departments.department_head_id` จุดเดียว Profile เป็นฝั่งเขียน ส่วน Co-op อ่านอย่างเดียว

**ขนาดข้อมูลปัจจุบัน (ฐานข้อมูล local)**: นักศึกษา 1,533, ศิษย์เก่า 692, อาจารย์ 65, admin 1, คณะ 1, สาขา 12

---

## 2. สถาปัตยกรรม

```
                        Browser
          ┌──────────────────┴───────────────────┐
          ▼                                      ▼
 profile-frontend (React/Vite :3000)    coop-frontend (React/Vite :5173, base /coop)
          │  REST + Socket.IO                    │  REST
          ▼                                      ▼
 profile-backend (Express+Prisma :5001)  coop-backend (Express+mysql2 :5002)
   ├─ JWT (PROFILE_JWT_SECRET)             ├─ JWT (COOP_JWT_SECRET)
   ├─ ออก SSO ticket (SSO_SHARED_SECRET) ──▶├─ แลก SSO ticket
   ├─ Socket.IO (แชทสาขา)                  ├─ node-cron 00:00 Asia/Bangkok
   └─ /uploads (static)                    └─ /uploads, /api/uploads, /coop/api/uploads
          │                                      │
          └──────────────┬───────────────────────┘
                         ▼
              MySQL 8 — database `lascstudent`  (+ phpMyAdmin :8080)
```

- **Profile backend** ใช้ **Prisma** (`profile-backend/prisma/schema.prisma`) และมี Socket.IO สำหรับแชท
- **Co-op backend** ใช้ **mysql2 raw SQL** (`coop-backend/src/config/db.js`) ไม่ใช้ Prisma และสร้างบางตารางเองตอนรันผ่าน `ensureTable()`
- JWT ของ 2 ระบบใช้ secret **คนละตัว** token ของระบบหนึ่งจึงใช้กับอีกระบบไม่ได้ ต้องผ่าน SSO เท่านั้น

---

## 3. Tech stack

| ส่วน | เทคโนโลยีหลัก |
|---|---|
| profile-frontend | React 18, Vite, React Router, Tailwind CSS + Radix UI (คอมโพเนนต์สไตล์ shadcn ใน `src/components/ui/`), lucide-react, Recharts, axios, socket.io-client |
| profile-backend | Node.js, Express, Prisma (`@prisma/client`), mysql2, jsonwebtoken, bcryptjs, multer, socket.io, nodemailer, xlsx, csv-parser, cheerio (scrape), express-validator |
| coop-frontend | React 18, Vite, React Router (basename `/coop`), **MUI (`@mui/material`)** + Tailwind + `@material-tailwind/react`, Heroicons/lucide, amCharts 5, jsPDF, jszip, qrcode.react, react-signature-canvas, react-to-print, react-easy-crop, thai-address-database, ฟอนต์ Kanit |
| coop-backend | Node.js, Express, mysql2, jsonwebtoken, bcryptjs, node-cron, nodemailer, googleapis (Gmail API) |
| ฐานข้อมูล | MySQL 8.0, utf8mb4 / utf8mb4_unicode_ci, timezone Asia/Bangkok |
| Infra | Docker Compose (dev), Nginx reverse proxy (production) |

> หมายเหตุ: [specifications/CONTEXT.md](specifications/CONTEXT.md) ยังเขียนว่าใช้ Tailwind อย่างเดียว ตั้งแต่ commit `d30abfc` ("MUI Clean Violet overhaul") ฝั่ง Co-op ใช้ MUI เป็นหลักแล้ว แต่ธีมม่วง-ขาวยังเหมือนเดิม

---

## 4. โครงสร้าง repository

```text
lasc-students_app/
├── profile-frontend/          React app ระบบ Profile
│   └── src/
│       ├── App.jsx            routes ทั้งหมด (ทุกหน้าอยู่ใต้ PrivateRoute + Layout)
│       ├── components/        Layout (sidebar/navbar), PrivateRoute, AITrack modals, ui/
│       ├── context/AuthContext.jsx
│       ├── pages/             Dashboard, Students, StudentPromotion, Alumni, Projects,
│       │                      NewsEvents, ChatBoard, Advisors, Profile, Departments, Portfolio, Login
│       ├── services/          api.js (axios), socket.js, *.service.js
│       └── constants/departments.js
├── profile-backend/           Express API ระบบ Profile
│   ├── server.js              mount routes ทั้งหมด + static /uploads + socket
│   ├── socket.js              Socket.IO (auth ด้วย JWT)
│   ├── prisma/schema.prisma   Prisma models (ต้องตรงกับ db/01-schema.sql)
│   ├── routes/ controllers/   แยก route กับ controller ตามโดเมน
│   ├── middleware/auth.js     auth (อ่าน user จาก DB ทุกครั้ง) + authorize(...roles)
│   ├── services/email.service.js
│   ├── utils/departments.js
│   ├── scripts/               check-db-env, generate-seed-users, migrate-student-emails ฯลฯ
│   ├── advisors.xlsx          ข้อมูลอาจารย์จริง (ต้นทาง seed)
│   └── นักศึกษา_*.xlsx         ข้อมูลนักศึกษาจริง (ต้นทาง seed)
├── coop-frontend/             React app ระบบ Co-op
│   └── src/
│       ├── App.jsx            routes ทั้งหมด (basename /coop)
│       ├── api/axios.js
│       ├── components/        Sidebar ของแต่ละ role, InternshipRequestDetailView, StatusBadge,
│       │                      SignaturePad, AttendanceCalendar, NotificationBell, Printable* ฯลฯ
│       ├── pages/Admin/ Advisor/ Student/ Public/ Home/
│       └── utils/             internshipStatus, internshipProgress, thaiHolidays, thaiAddress, sso, fileUrl ฯลฯ
├── coop-backend/              Express API ระบบ Co-op
│   ├── src/server.js          mount routes + static uploads + cron
│   ├── src/routes/            1 ไฟล์ต่อโดเมน (logic เขียนใน route โดยตรง ไม่มี controller)
│   ├── src/utils/             helpers (USER_SELECT_SQL), internshipAutoUpdate, notificationService,
│   │                          mailer, emailService, activeCompany
│   ├── src/cron/internshipCron.js
│   ├── check-internship-dates.js   diagnostic (ใส่ --apply เพื่อแก้จริง)
│   └── uploads/               ไฟล์ที่ผู้ใช้อัปโหลด (ไม่อยู่ใน git)
├── db/                        SQL กลางของทั้งระบบ (ดูหัวข้อ 7)
├── deploy/nginx-uploads-snippet.conf
├── docs/                      เอกสาร (ไฟล์นี้อยู่ที่นี่)
├── docker-compose.yml
├── .env.example               ตัวอย่าง env สำหรับ Docker
└── README.md
```

---

## 5. ผู้ใช้และสิทธิ์ (Roles)

`user.role` เป็น ENUM: `student`, `alumni`, `advisor`, `admin`

| Role | Profile | Co-op | หน้าแรกหลังเข้า Co-op |
|---|---|---|---|
| `student` | ดู/แก้โปรไฟล์ตัวเอง, resume, ผลงาน, โปรเจกต์, ทำเนียบ, แชทสาขา | ยื่นคำร้อง, ติดตามสถานะ, ชำระเงิน, เช็คชื่อ, ขอย้ายที่ฝึก | `/coop` → `/coop/dashboard` |
| `alumni` | เหมือน student + ประวัติการทำงาน (`alumni_employments`) | เข้าได้ (ตาม SSO) | `/coop` |
| `advisor` | ดูนักศึกษา, อนุมัติโปรเจกต์, สร้างข่าว | อนุมัติคำร้องขั้นอาจารย์, นิเทศ, ประเมิน, พิจารณาการย้ายที่ฝึก; ถ้าเป็น **ประธานสาขา** จะแต่งตั้งอาจารย์นิเทศได้ | `/coop/advisor-dashboard` |
| `admin` | จัดการทุกอย่าง, นำเข้า/ส่งออก, เลื่อนชั้นปี, ตั้งประธานสาขา, ส่งอีเมลกิจกรรม | จัดการคำร้องทั้งหมด, ออกหนังสือ, กำหนดวันฝึก, รอบฝึก/รอบประเมิน, บริษัท, หน้าแรก, รายงาน | `/coop/admin-dashboard` |

**ประธานสาขา (Department Head)** ไม่ใช่ role แยก ระบบรู้จากความสัมพันธ์ `departments.department_head_id → profile.id`
- Profile ตั้งค่าผ่าน `PUT /api/departments/:id/head` (admin)
- Co-op อ่านผ่าน `USER_SELECT_SQL` ใน `coop-backend/src/utils/helpers.js` แล้วส่งออกเป็นฟิลด์ `isDepartmentHead` และ `headOfDepartment`
- สิทธิ์แต่งตั้งอาจารย์นิเทศ (`PATCH /api/requests/:id/appointment`) **อ่านสดจากฐานข้อมูลทุกครั้ง** ไม่เก็บไว้ใน JWT เปลี่ยนประธานแล้วมีผลทันทีโดยไม่ต้องล็อกอินใหม่
- ตอนนี้ยังไม่มีการตั้งประธานสาขาสักคน (หลังเปลี่ยนเป็นข้อมูลจริง) admin ต้องตั้งในหน้า "ข้อมูลสาขาวิชา"

**การจับคู่ user กับ profile**: `profile.profile_id = user.username` เป็นหลัก (Co-op ยอมรับ `= user.email` หรือ `= user.studentId` ด้วย) `profile_id` ยาวได้สูงสุด **13 ตัวอักษร** ดังนั้น username ห้ามยาวเกิน 13

> โค้ดหลายจุดอ้างถึง role `teacher` (เช่น `authorize('admin','advisor','teacher')` และเมนูใน Layout) แต่ ENUM ไม่มีค่านี้ จึงเป็น role ที่ไม่มีอยู่จริง ถือว่าเป็นโค้ดตกค้าง

---

## 6. การยืนยันตัวตนและ SSO

### 6.1 ล็อกอินที่ Profile

`POST /api/auth/login` body `{ username, password }`
1. หา user จาก `username` ตรงตัว → `username.toLowerCase()` → `email` ตามลำดับ
2. ตรวจรหัสผ่านด้วย bcrypt แล้วตรวจ `isActive`
3. ออก JWT `{ userId }` ด้วย `PROFILE_JWT_SECRET` อายุตาม `JWT_EXPIRES_IN` (ค่าเริ่มต้น 7d)
4. frontend เก็บ token แล้วส่งเป็น `Authorization: Bearer <token>`

middleware `auth` ของ Profile **โหลด user จากฐานข้อมูลทุก request** ถ้าบัญชีถูกปิด (`isActive=0`) token จะใช้ไม่ได้ทันที

### 6.2 SSO จาก Profile → Co-op

```
[Profile UI] เมนู "ระบบศูนย์ฝึกประสบการณ์"
   │ POST /api/auth/sso-ticket  (Profile, ต้อง login)
   │   → ticket = JWT{ userId, username, role, purpose:'coop-sso', jti } ลงนามด้วย SSO_SHARED_SECRET อายุ 60 วินาที
   ▼
เบราว์เซอร์ไปที่ <COOP_PUBLIC_URL>/sso?ticket=...
   │ SsoLandingPage ลบ ticket ออกจาก URL ทันที
   │ POST /api/auth/sso { ticket }  (Co-op)
   │   - verify ด้วย SSO_SHARED_SECRET, ตรวจ purpose
   │   - ตรวจ jti ว่ายังไม่เคยใช้ (เก็บใน memory จนหมดอายุ — กัน replay)
   │   - โหลด user จาก DB ใหม่ (ไม่เชื่อ role ในตั๋ว), ตรวจ isActive
   │   - ออก JWT ของ Co-op { id, username, role } ด้วย COOP_JWT_SECRET
   ▼
เข้า /coop (หน้า Home) ทุก role
```

- ทั้งสอง backend ต้องตั้ง `SSO_SHARED_SECRET` ให้ตรงกัน และต้องไม่ซ้ำกับ JWT secret ใด ๆ ถ้าไม่ได้ตั้ง API จะตอบ 503
- หน้า `/coop/login` ของ Co-op (`LoginRedirect`) จะส่งผู้ใช้ไปหน้า login ของ Profile พร้อม `?redirect=<coop>/sso-landing`
- Co-op ยังมี `POST /api/auth/login` (body `{ email, password }` โดย `email` จะใส่ username ก็ได้) ไว้สำหรับเข้าตรง
- ออกจากระบบ Co-op (`utils/sso.js → logout`) ล้าง localStorage, sessionStorage และ cookie แล้วพาไปหน้า login ของ Profile

---

## 7. ฐานข้อมูล

### 7.1 ไฟล์ใน `db/`

| ไฟล์ | เนื้อหา | รันเมื่อไร |
|---|---|---|
| `01-schema.sql` | โครงสร้างตารางทั้งหมด (CREATE TABLE IF NOT EXISTS) | อัตโนมัติตอน Docker สร้าง volume ใหม่ |
| `02-reference-data.sql` | คณะ 1 แห่ง + สาขา 12 สาขา | อัตโนมัติตอนสร้าง volume ใหม่ |
| `03-seed-users.sql` | บัญชีผู้ใช้จริง 2,291 บัญชี (สร้างจากสคริปต์ ห้ามแก้ด้วยมือ) | อัตโนมัติตอนสร้าง volume ใหม่ |
| `migrations/*.sql` | การเปลี่ยน schema ของฐานข้อมูลที่มีอยู่แล้ว | **ต้องรันเอง** Docker ไม่รันโฟลเดอร์ย่อย |
| `reset-test-passwords.sql` | ตั้งรหัสผ่านทุกบัญชี (ยกเว้น 6610014111) เป็น `password123` | ใช้เฉพาะเครื่อง local — **ห้ามรันบน production** |

กฎของ MySQL Docker image: ไฟล์ใน `db/` (mount เป็น `/docker-entrypoint-initdb.d`) จะรัน**เฉพาะครั้งแรกที่ volume ว่าง** แก้ไฟล์ทีหลังจะไม่มีผลกับ volume เดิม ทุกไฟล์ต้องเขียนให้รันซ้ำได้ (idempotent) และต้องมี `SET NAMES utf8mb4;` ทุกไฟล์ที่มีภาษาไทย

### 7.2 สาขาวิชา (`departments`)

| id | ชื่อ | id | ชื่อ |
|---|---|---|---|
| 1 | วิทยาการคอมพิวเตอร์ | 7 | อาชีวอนามัยและความปลอดภัย |
| 2 | เทคโนโลยีคอมพิวเตอร์และดิจิทัล | 8 | วิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์ |
| 3 | สาธารณสุขชุมชน | 9 | วิศวกรรมโลจิสติกส์ |
| 4 | วิทยาศาสตร์การกีฬา | 10 | วิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม |
| 5 | เทคโนโลยีการเกษตร | 11 | การออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ |
| 6 | เทคโนโลยีและนวัตกรรมอาหาร | 12 | เทคโนโลยีโยธาและสถาปัตยกรรม |

(ชื่อเต็มในฐานข้อมูลขึ้นต้นด้วย "สาขาวิชา") ในโค้ดมี map ชื่อสาขาซ้ำอยู่หลายที่ ถ้าเพิ่มหรือแก้สาขาต้องแก้ทุกจุด:
`db/02-reference-data.sql`, `profile-backend/utils/departments.js`, `profile-frontend/src/constants/departments.js`, `coop-backend/src/utils/helpers.js` (`DEPARTMENT_MAP`, `DEPARTMENT_SHORT_MAP`, `DEPARTMENT_KEYWORDS`), `profile-backend/scripts/generate-seed-users.js` (`DEPARTMENTS`, `DEPT_ALIASES`)

### 7.3 กลุ่มตาราง

| กลุ่ม | ตาราง | ใช้โดย |
|---|---|---|
| แกนกลาง (ใช้ร่วม) | `user`, `profile`, `faculties`, `departments` | ทั้งสอง |
| โปรไฟล์นักศึกษา | `student_addresses`, `student_educations`, `skills`, `student_skills`, `student_projects`, `student_project_files`, `internships`, `alumni_employments`, `resumes`, `resume_works` | Profile |
| โปรเจกต์จบ | `projects`, `project_approval_history`, `project_advisors`, `project_comments`, `project_members` | Profile |
| สื่อสาร | `department_posts`, `department_comments`, `chat_rooms`, `chat_messages`, `chat_message_reactions`, `news_events`, `event_email_notifications` | Profile |
| เลื่อนชั้นปี | `promotion_batches`, `promotion_histories` | Profile |
| ฝึกงาน | `requests`, `companies`, `daily_checkins`, `payment_proofs`, `evaluation_rounds`, `evaluations`, `advisor_evaluations`, `announcements`, `notifications` | Co-op |
| สร้างเองตอนรัน (ไม่อยู่ใน `01-schema.sql`) | `internship_relocation_requests`, `internship_rounds`, `site_settings` | Co-op (`ensureTable()` ใน route ที่เกี่ยวข้อง) |

### 7.4 Prisma กับ SQL

- **SQL ใน `db/` คือแหล่งความจริง** ส่วน `profile-backend/prisma/schema.prisma` ต้องตามให้ตรง
- เปลี่ยน schema: เขียน migration SQL ใน `db/migrations/` → แก้ `01-schema.sql` ให้ตรง → แก้ `schema.prisma` (หรือ `npm run db:pull`) → `npm run db:generate`
- **หลีกเลี่ยง `npm run db:push`** บนฐานข้อมูลที่ใช้ร่วม เพราะ Prisma รู้จักเฉพาะตารางของ Profile และอาจพยายามแก้หรือลบตารางของ Co-op

### 7.5 ฟิลด์สำคัญในตาราง `requests` (Co-op)

- `status` เป็น `VARCHAR(100)` เก็บ**ข้อความภาษาไทย**ตรง ๆ ไม่มี enum (ดูหัวข้อ 10.2)
- `details` (JSON) เก็บข้อมูลฟอร์มทั้งหมด รวมถึง `student_info`, `startDate`, `companyResponseToken`, `companyResponseTokenExpiresAt`, `companyResponseTokenUsedAt`
- `dispatchLetter`, `supervisionAppointment` เป็น JSON ด้วย ให้ใช้ `parseRequestRow()` ใน helpers แปลงก่อนใช้งาน
- `internship_start_date`, `internship_end_date` คือวันฝึกอย่างเป็นทางการ ระบบอัตโนมัติอ่านค่านี้ก่อน `details.startDate`

---

## 8. ข้อมูลผู้ใช้จริง (Seed)

ตั้งแต่ 2026-11-06 ฐานข้อมูลใช้**ข้อมูลจริงทั้งหมด** บัญชี mockup เดิม (advisor01, advisor02, 6610014111, 6610014112, 6210014001) ถูกลบออกแล้ว

### 8.1 ที่มาและกติกา

| กลุ่ม | ที่มา | username | รหัสผ่านเริ่มต้น | อีเมล | สถานะ |
|---|---|---|---|---|---|
| นักศึกษา (รหัส 65–69) | `profile-backend/นักศึกษา_*.xlsx` | รหัสนักศึกษา 10 หลัก | = username | `<รหัส>@student.sskru.ac.th` | role `student`, `student_status=active` |
| ศิษย์เก่า (รหัส 63–64) | ไฟล์เดียวกัน | รหัสนักศึกษา | = username | เหมือนข้างบน | role `alumni`, `student_status=graduated`, `graduation_year` ว่าง |
| อาจารย์ | `profile-backend/advisors.xlsx` | `AD001`–`AD065` ตามลำดับในไฟล์ | = username (ตัวพิมพ์ใหญ่) | `ad001@lasc.ac.th` (ชั่วคราว) | role `advisor` |
| ผู้ดูแลระบบ | กำหนดในสคริปต์ | `admin` | `password123` | `admin@lasc.ac.th` | role `admin` |

**การแปลงข้อมูล**
- คำนำหน้านักศึกษา: ในไฟล์ต้นทางคำนำหน้าถูกตัดไป 3 ตัวอักษร ("นายxxx" → "xxx", "นางสาวxxx" → "สาวxxx") สคริปต์จึงให้ชื่อที่ขึ้นต้นด้วย "สาว" เป็น `นางสาว` และที่เหลือเป็น `นาย` (กรณีพิเศษ: "สาวิอรุณี" → นางสาว "วิอรุณี") ถ้ามีนักศึกษาที่ใช้ "นาง" จะถูกใส่เป็น "นาย" ผิด
- คำนำหน้าอาจารย์: แยกตำแหน่งวิชาการ (`ผศ.ดร.`, `รศ.ดร.`, `ศ.ดร.`, `ผศ.`, `รศ.`, `ศ.`, `ดร.`, `อ.`) ออกมาใส่ `prefix` ถ้าไม่มีก็ปล่อยว่าง
- สาขาของอาจารย์ในไฟล์ใช้ชื่อหลักสูตรเดิม จึงจับคู่ดังนี้ (สองข้อแรกยังไม่ได้ยืนยัน):
  - เทคโนโลยีสารสนเทศ → 2
  - วิทยาศาสตร์สิ่งแวดล้อม → 10
  - การจัดการอุตสาหกรรม → 10
  - ออกแบบผลิตภัณฑ์อุตสาหกรรม → 11
  - เทคโนโลยีก่อสร้าง → 12
  - วิทยาศาสตร์และเทคโนโลยีการอาหาร → 6
- ฝั่งนักศึกษา: "วิศวกรรมซอฟต์แวร์" → 8, "นวัตกรรมวัสดุและการออกแบบผลิตภัณฑ์" → 11

### 8.2 สร้าง seed ใหม่เมื่อไฟล์ Excel เปลี่ยน

```bash
cd profile-backend
node scripts/generate-seed-users.js [path/to/students.xlsx] [path/to/advisors.xlsx]
# ใช้เวลาประมาณ 2.5 นาที (bcrypt cost 10 ทีละบัญชี) แล้วเขียนทับ db/03-seed-users.sql
```

ลงฐานข้อมูลที่มีอยู่แล้ว (รันซ้ำได้ **ไม่เขียนทับรหัสผ่าน**ของบัญชีที่มีอยู่ แต่อัปเดตชื่อ สาขา role และสถานะ):

```bash
docker exec -i lasc-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4' < db/03-seed-users.sql
```

ข้อควรระวัง: ลำดับ `AD###` ขึ้นกับลำดับแถวใน `advisors.xlsx` ถ้าแทรกแถวกลางไฟล์ username ของอาจารย์คนอื่นจะเลื่อนตาม **ให้เพิ่มอาจารย์ใหม่ต่อท้ายไฟล์เท่านั้น**

---

## 9. ระบบ Profile — ฟีเจอร์และ workflow

### 9.1 หน้าจอ (profile-frontend)

ทุกหน้าอยู่หลัง `PrivateRoute` + `Layout` (sidebar แสดงเมนูตาม role)

| Path | หน้า | Role ที่เห็นเมนู |
|---|---|---|
| `/` | แดชบอร์ด (สถิติ, กราฟ) | ทุก role |
| `/students` | จัดการนักศึกษา / ทำเนียบนักศึกษา | ทุก role (admin/advisor แก้ได้) |
| `/student-promotion` | จัดการเลื่อนชั้นปี | admin |
| `/alumni` | ทำเนียบศิษย์เก่า | ทุก role |
| `/projects` | จัดการโปรเจกต์จบ | ทุก role |
| `/news-events` | ข่าวสารและกิจกรรม | ทุก role |
| `/chat-board` | แชทสาขาวิชา (real-time) | ทุก role |
| `/advisors` | ทำเนียบอาจารย์ | admin, advisor, student |
| `/portfolio` | ผลงานนักศึกษา | ทุก role |
| `/departments` | ข้อมูลสาขาวิชา + ตั้งประธานสาขา | admin, advisor |
| `/profile` | โปรไฟล์ของฉัน (แท็บ resume, ทักษะ, การศึกษา, ฝึกงาน, ผลงาน) | ทุก role |
| `/login` | เข้าสู่ระบบ (รองรับ `?redirect=` สำหรับ SSO) | — |

### 9.2 Workflow: โปรเจกต์จบ (approval)

```
สร้างโปรเจกต์ (approval_status = draft)
   │ POST /api/projects/:id/submit-approval        (student/alumni/admin)
   ▼
pending_approval ── (แก้ไขไม่ได้ระหว่างรออนุมัติ)
   ├─ POST /:id/approve (admin/advisor) → approved; ถ้า status เป็น draft จะเปลี่ยนเป็น approved
   └─ POST /:id/reject  (admin/advisor) → rejected + rejection_reason → แก้แล้วส่งใหม่ได้
ทุกการกระทำบันทึกลง project_approval_history
```

ความคืบหน้าโปรเจกต์ (`projects.status`): `draft → approved → in_progress → waiting_defense → passed_defense → completed` เปลี่ยนผ่าน `PUT /api/projects/:id/status`

### 9.3 Workflow: เลื่อนชั้นปี (Student Promotion, admin)

1. **Preview** `POST /api/admin/student-promotion/preview` `{ academic_year, from_year, to_year, department_id? }`
   - ระบบคำนวณ prefix ของรหัสนักศึกษาจากปีเข้า: `entryBE = academic_year - from_year + 1`, `prefix = entryBE - 2500` (เช่นปีการศึกษา 2569 ชั้นปี 1 → รหัสขึ้นต้น `69`)
   - คัดเฉพาะ `student_status = 'active'` และกันการเลื่อนซ้ำในปีการศึกษาเดียวกัน
   - `from_year = 'all'` คือเลื่อนทุกชั้นปีพร้อมกัน
2. **Execute** `POST /execute` `{ ..., effective_date, notes, selected_profile_ids }` → สร้าง `promotion_batches` และ `promotion_histories`
3. **History** `GET /history`, `GET /history/:id`
4. **Rollback** `DELETE /batch/:id` → ย้อนการเลื่อนทั้ง batch

ถ้าจะเปลี่ยนนักศึกษาเป็นศิษย์เก่ารายคน ใช้ `POST /api/students/:id/promote` (admin)

### 9.4 Workflow: ข่าวสารและกิจกรรม + อีเมลแจ้งเตือน

1. admin/advisor สร้างข่าวด้วย `POST /api/news-events` (แนบรูปผ่าน `/api/upload/news-image`, `/news-attachment`)
2. ปักหมุดด้วย `PATCH /:id/pin` เผยแพร่หรือซ่อนด้วย `PATCH /:id/publish`
3. admin ส่งอีเมลแจ้งกิจกรรม:
   - `GET /:id/email-recipients` ดูรายชื่อผู้รับ
   - `POST /:id/send-email` ส่งเป็น batch ผลของแต่ละคนบันทึกลง `event_email_notifications`
   - `GET /:id/email-history` ดูประวัติ
   - `POST /:id/retry-failed-email` ส่งซ้ำเฉพาะรายการที่ล้มเหลว
4. เวลาในฟอร์มใช้ตัวเลือกเวลาแบบไทย 24 ชั่วโมง

### 9.5 แชทสาขาวิชา

- REST `/api/chat-board/*` ใช้กับห้อง ข้อความ (แก้/ลบ) reaction แนบไฟล์ และโพสต์/คอมเมนต์ของสาขา
- Socket.IO (`profile-backend/socket.js`) ส่งข้อความแบบ real-time โดย handshake ต้องส่ง token ใน `auth.token` หรือ header `Authorization`

### 9.6 นำเข้า/ส่งออกข้อมูล (admin)

- ส่งออก: `GET /api/data/export/students|alumni|projects?format=csv|xlsx` ใช้ได้ปกติ
- นำเข้า: `POST /api/data/import/students|alumni|advisors` **ใช้งานไม่ได้ในปัจจุบัน** (ดูหัวข้อ 17) ถ้าจะเพิ่มผู้ใช้จำนวนมากให้ใช้สคริปต์ seed ในหัวข้อ 8.2 แทน
- `GET /api/scrape/preview`, `/api/scrape/advisors/preview` ดึงรายชื่อจากเว็บคณะมาแสดงตัวอย่าง (cheerio)

---

## 10. ระบบ Co-op — ฟีเจอร์และ workflow

### 10.1 หน้าจอ (coop-frontend, base path `/coop`)

| กลุ่ม | Path | หน้าที่ |
|---|---|---|
| สาธารณะ | `/`, `/news`, `/news/:id`, `/companies` | หน้าแรก (แบนเนอร์, ประกาศ, Digital Journey, FAQ), ข่าว, รายชื่อสถานประกอบการ |
| SSO | `/sso`, `/sso-landing`, `/login` | แลกตั๋ว SSO / ส่งไปหน้า login ของ Profile |
| นักศึกษา | `/dashboard`, `/dashboard/new-request`, `/dashboard/edit-request/:id`, `/dashboard/my-requests`, `/dashboard/request/:id`, `/dashboard/payment-proof`, `/dashboard/check-in` (= `/daily-reports`), `/dashboard/relocation-request`, `/dashboard/notifications`, `/dashboard/profile` | ยื่นคำร้อง, ติดตาม, ชำระเงิน, เช็คชื่อ, ขอย้ายที่ฝึก |
| แอดมิน | `/admin-dashboard`, `/requests`, `/students`, `/companies`, `/checkins`, `/reports`, `/relocations`, `/relocations/:id`, `/home-editor`, `/notifications`, `/profile` | จัดการทั้งหมด (`/users`, `/announcements`, `/banners`, `/attendance-overview` redirect ไปหน้าใหม่) |
| อาจารย์ | `/advisor-dashboard`, `/students`, `/supervision`, `/supervision/evaluate/:id`, `/progress`, `/relocations`, `/profile` | อนุมัติ, นิเทศ, ประเมิน, ติดตามความคืบหน้า |
| ลิงก์ภายนอก (ไม่ต้อง login ใช้ token) | `/public/request/:id`, `/public/evaluate/:id`, `/public/relocation-approval/:token`, `/public/relocation-dean/:token`, `/public/company-acceptance/:token` | บริษัทตอบรับ/ประเมิน, บริษัทเดิมยินยอมให้ย้าย, คณบดีลงนาม, บริษัทใหม่ตอบรับ |

หน้ารายละเอียดคำร้องใช้คอมโพเนนต์กลาง `components/InternshipRequestDetailView.jsx` ร่วมกันทุก role

### 10.2 Workflow หลัก: คำร้องขอฝึกงาน

ค่าสถานะเป็น**ภาษาไทย**ใน `requests.status` ตารางเต็มและคำพ้องอยู่ใน [STATUS_REFERENCE.md](references/STATUS_REFERENCE.md)

```
[นักศึกษา] NewRequestPage → POST /api/requests
   ▼
รออาจารย์ที่ปรึกษาอนุมัติ ──(อาจารย์ปฏิเสธ)──▶ ไม่อนุมัติ (อาจารย์)
   │ อาจารย์อนุมัติ  PATCH /api/requests/:id/status
   ▼
รอผู้ดูแลระบบตรวจสอบ ──(แอดมินปฏิเสธ)──▶ ไม่อนุมัติ (Admin)
   │ แอดมินอนุมัติ: ต้องแนบ "หนังสือขอความอนุเคราะห์" (PDF/JPG/PNG ≤ 20MB) + หมายเหตุ
   │ ระบบออก companyResponseToken (อายุ 7 วัน ใช้ครั้งเดียว) → QR/ลิงก์ให้บริษัท
   ▼
รอสถานประกอบการตอบรับ ──(บริษัทปฏิเสธ)──▶ ปฏิเสธ
   │ บริษัทเปิด /coop/public/request/:id?responseToken=...
   │ กด "ตอบรับ" ต้องเซ็นลายเซ็นดิจิทัล (บังคับทั้ง frontend และ backend: requireSignatureForAccept)
   │ + สิ่งที่อยากให้นักศึกษาเตรียม + อีเมลผู้ติดต่อ/ผู้ประเมิน
   ▼
สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)   ← ส่งกลับมาที่แอดมินเท่านั้น ห้ามข้ามขั้น
   │ แอดมินกำหนด internship_start_date / end_date
   │   (PATCH /:id/internship-period, /batch/internship-period หรือเติมจาก "รอบปฏิทินฝึกงาน")
   │ + แนบใบส่งตัว (dispatch) → นักศึกษาดาวน์โหลดได้ทันที
   ▼
อนุมัติแล้ว / อนุมัติแล้ว (รอออกฝึกงาน)
   │ อัตโนมัติ: วันนี้ (Asia/Bangkok) ≥ วันเริ่ม  → cron 00:00 + lazy update ตอนเรียก GET /api/requests
   │ หรือแอดมินกดเอง → ออกฝึกงาน (เติม start_date = วันนี้ ถ้ายังว่าง)
   ▼
ออกฝึกงาน / กำลังออกฝึกงาน   ══ เช็คชื่อรายวัน (daily_checkins) ══ นิเทศ ══ ขอย้ายที่ฝึกได้ (10.5)
   │ อัตโนมัติ: เลยวันสิ้นสุด
   ▼
สิ้นสุดการฝึกงาน (รอประเมิน)
   │ บริษัทประเมิน (public, ต้องอยู่ในรอบประเมินที่เปิด) → ประเมินจากสถานประกอบการแล้ว
   │ อาจารย์ประเมิน                               → ประเมินจากอาจารย์แล้ว
   ▼
ครบทั้งสองฝั่ง → ฝึกงานเสร็จแล้ว (อัตโนมัติ) → เสร็จสิ้นสมบูรณ์
```

**กฎสำคัญ**
- สถานะการฝึกงานขึ้นกับวันที่จริงของระบบ (เวลาไทย) เท่านั้น:
  - วันนี้ก่อนวันเริ่ม → "อนุมัติแล้ว (รอออกฝึกงาน)"
  - วันนี้อยู่ระหว่างวันเริ่มถึงวันสิ้นสุด → "กำลังออกฝึกงาน"
  - วันนี้เลยวันสิ้นสุด → "สิ้นสุดการฝึกงาน (รอประเมิน)"
- ระบบอัตโนมัติเปลี่ยนเป็น "ออกฝึกงาน" ได้เฉพาะจาก `อนุมัติแล้ว`, `อนุมัติแล้ว (รอออกฝึกงาน)`, `รอออกฝึกงาน` เท่านั้น (`PRE_INTERNSHIP_STATUSES` ใน `internshipAutoUpdate.js`) **ห้ามกระโดดข้ามขั้นอนุมัติ**
- `PATCH /batch/status` ข้าม transition guard ทั้งหมด ใช้ด้วยความระวัง
- นักศึกษาเห็นแค่ความคืบหน้าการประเมิน (`hasCompanyEval`, `hasAdvisorEval`) **ไม่เห็นคะแนนดิบ** (`restrictEvaluationScores` ตอบ 403)
- นักศึกษาแก้อีเมลผู้ประเมินไม่ได้
- ปุ่ม/ลิงก์แบบประเมินต้องไม่แสดงให้นักศึกษาเห็น
- หน้า "ติดตามสถานะ" ของนักศึกษาจะส่ง admin ไปที่ `/admin-dashboard`

### 10.3 รอบปฏิทินฝึกงานและรอบประเมิน

| รอบ | ตาราง | API (admin) | ผล |
|---|---|---|---|
| รอบปฏิทินฝึกงาน | `internship_rounds` (สร้างเอง) | `GET/POST/PUT/DELETE /api/admin/internship-rounds`, `POST /:id/apply` (มี flag `overwrite`) | เติมวันเริ่ม/สิ้นสุดให้คำร้องทั้งเทอม (term1/term2/summer); นักศึกษาเห็นรอบ active ในฟอร์มยื่นคำร้อง |
| รอบประเมิน | `evaluation_rounds` | `/api/admin/evaluation-rounds`, `GET /api/evaluation-rounds/active` | บริษัท/อาจารย์ประเมินได้เฉพาะช่วง `startDate–endDate` ของรอบที่ `isActive=1` นอกช่วงจะได้ข้อความ "นอกช่วงเวลาการประเมิน" |

### 10.4 เช็คชื่อรายวัน (Check-in)

- เช็คชื่อได้เมื่อคำร้องล่าสุดอยู่ในสถานะกลุ่มฝึกงาน/ประเมิน/ปิดงาน (`CHECKIN_REQUEST_STATUSES` ใน `checkinRoutes.js`)
- กลุ่ม "อนุมัติแล้วรอออกฝึก" เช็คได้ก็ต่อเมื่อกำหนด `internship_start_date` อย่างเป็นทางการแล้ว
- ห้ามเช็คชื่อล่วงหน้า และห้ามเช็คย้อนก่อนวันเริ่มฝึก (HTTP 400) แต่เซ็นย้อนหลังในช่วงประเมินได้
- สถานะ: `present`, `late`, `absent`, `sick`, `personal`, `holiday`
- วันหยุดนักขัตฤกษ์อยู่ที่ `coop-frontend/src/utils/thaiHolidays.js` (ปี 2568–2570) **ต้องอัปเดตทุกปี** วันหยุดทางจันทรคติของปี 2570 ยังเป็นค่าประมาณ
- ผู้ควบคุมงานเซ็นรับรองได้ทีละหลายวัน (`PATCH /api/checkins/batch-sign`)
- แอดมินดูภาพรวมที่ `/admin-dashboard/checkins` (`GET /api/checkins/overview`)

### 10.5 ขอย้ายสถานที่ฝึกงาน (Relocation)

ยื่นได้เฉพาะคำร้องที่อยู่ในสถานะออกฝึกงานแล้ว ระบบตรวจทั้งที่ UI และ server (ไม่ผ่านจะตอบ 400) และรองรับการย้ายหลายรอบ

```
submitted_waiting_company        นักศึกษายื่น (เหตุผล, บริษัทใหม่, ลายเซ็น) → ลิงก์ one-time ให้บริษัทเดิม
   │ บริษัทเดิมลงนามยินยอม (/public/relocation-approval/:token)
   ▼
company_approved_waiting_advisor  (ฟอร์มรุ่นเก่าใช้ submitted_waiting_advisor)
   │ PATCH /:id/advisor-review  อาจารย์ลงนาม / ปฏิเสธ → rejected
   ▼
advisor_approved_waiting_admin
   │ แอดมินส่งลิงก์ให้คณบดี (POST /:id/dean-link) → คณบดีลงนาม allow/deny (/public/relocation-dean/:token)
   │ (หรือแอดมินอนุมัติเองผ่าน admin-approve / admin-approve-legacy)
   ▼
admin_approved_generating_request_letter
   │ PATCH /:id/request-letter  แนบหนังสือขอความอนุเคราะห์ถึงบริษัทใหม่ → ออกลิงก์ตอบรับ
   ▼
waiting_company_acceptance
   │ บริษัทใหม่ตอบรับและอัปโหลดหนังสือ (/public/company-acceptance/:token) หรือแอดมินบันทึกเอง (PATCH /:id/acceptance)
   ▼
company_accepted_generating_dispatch_letter
   │ PATCH /:id/dispatch-letter  แนบใบส่งตัวใหม่
   ▼
completed   (PATCH /:id/training-dates ปรับวันฝึกได้)
```

- ทุกขั้นปฏิเสธได้ → `rejected` (แอดมินใช้ `PATCH /:id/admin-reject`)
- อาจารย์ได้รับแจ้งเตือนเมื่อมีคำร้องย้ายที่ฝึก
- หลังย้ายสำเร็จ ข้อมูล "บริษัทปัจจุบัน" ของนักศึกษาจะอ่านจากคำร้องย้ายล่าสุดที่ `completed` (`utils/activeCompany.js`)

### 10.6 การนิเทศและแต่งตั้งอาจารย์นิเทศ

- ประธานสาขาหรือ admin แต่งตั้งอาจารย์นิเทศด้วย `PATCH /api/requests/:id/appointment` (ตรวจสิทธิ์สดจาก DB)
- อาจารย์อัปโหลดเอกสารนิเทศด้วย `POST /:id/supervision-documents` และลบด้วย `DELETE /:id/supervision-documents/:docId`
- หน้าที่เกี่ยวข้อง: `AdvisorSupervisionPage.jsx`, `AdvisorProgressCheckPage.jsx`

### 10.7 ชำระเงิน, สถานประกอบการ, หน้าแรก

- **ชำระเงิน**: นักศึกษาอัปโหลดหลักฐาน (`POST /api/payments`) แอดมิน approve/reject (`pending/approved/rejected`) workflow นี้แยกจากสถานะคำร้อง
- **สถานประกอบการ**: `GET /api/public/companies` รวมข้อมูลจากตาราง `companies` กับบริษัทในคำร้องของรุ่นพี่ (ตัดคำร้องที่ถูกปฏิเสธหรือยกเลิกออก) และใช้ทำ autocomplete ในฟอร์มยื่นคำร้องและฟอร์มย้ายที่ฝึก แอดมินจัดการที่ `/admin-dashboard/companies` (มีนำเข้าเป็นชุด)
- **หน้าแรก**: แอดมินแก้แบนเนอร์และประกาศที่ `/admin-dashboard/home-editor` ค่าทั่วไปเก็บใน `site_settings` (`/api/settings`)
- ถ้ายังไม่ได้กำหนดกรอบเวลา ให้แสดง empty state "ยังไม่มีการประกาศกำหนดการ" และห้ามแสดงข้อมูล mockup

---

## 11. การแจ้งเตือนและอีเมล

| ช่องทาง | ระบบ | รายละเอียด |
|---|---|---|
| In-app notification | Co-op | ตาราง `notifications` สร้างผ่าน `utils/notificationService.js` (`type='request_status'` ฯลฯ) และแสดงผลด้วย `NotificationBell` และหน้า notifications ของแต่ละ role |
| อีเมล (Co-op) | Co-op | `utils/mailer.js` / `emailService.js`: ยืนยันการยื่น, ส่งแบบประเมินให้ผู้ประเมินของบริษัท (`evaluator_email`), แจ้ง admin เมื่อบริษัทส่งแบบประเมิน (`ADMIN_EMAIL` + อีเมล admin ใน DB) |
| อีเมล (Profile) | Profile | `services/email.service.js`: แจ้งข่าวและกิจกรรมเป็น batch |

**ลำดับผู้ให้บริการอีเมล** (`EMAIL_PROVIDER` เว้นว่างไว้ระบบจะเลือกเอง):
1. Gmail API OAuth2 (`GMAIL_*`) ส่งผ่าน HTTPS 443 ไม่พึ่งพอร์ต SMTP (แนะนำสำหรับ production)
2. SMTP (`SMTP_*`)
3. Resend/SendGrid (`EMAIL_API_KEY`)

ถ้าไม่ได้ตั้งค่าอะไรเลย ระบบจะไม่ส่งอีเมลจริง แต่จะ log ลิงก์ไว้ใน console แทน ทดสอบได้ด้วย `coop-backend/test-email.js` และ `profile-backend/scripts/test-email-notification.js`

---

## 12. ไฟล์อัปโหลด

| ระบบ | ที่เก็บ | URL ที่เสิร์ฟ | หมายเหตุ |
|---|---|---|---|
| Profile | `profile-backend/uploads/` | `/uploads/...` | avatar, ไฟล์ผลงาน, รูป/ไฟล์แนบข่าว, ไฟล์แชท |
| Co-op | `coop-backend/uploads/` (`banners/`, `relocations/` ฯลฯ) | `/uploads`, `/api/uploads`, `/coop/api/uploads` | frontend ต่อ URL ด้วย `API_BASE` ผ่าน `utils/fileUrl.js` |

- ทั้งสองโฟลเดอร์อยู่นอก git และใน Docker เป็น bind mount ต้องสำรองแยกต่างหาก
- ลายเซ็นดิจิทัลเก็บเป็น data-URL PNG ในคอลัมน์ `LONGTEXT` ไม่ได้เก็บเป็นไฟล์
- การเปิดเอกสาร: บนเดสก์ท็อปเปิด PDF ในแท็บใหม่ (`window.open`) บนมือถือดาวน์โหลดตรง (`utils/documentViewer.js`) ไม่ใช้ modal preview
- Nginx เสิร์ฟไฟล์ตรงจาก disk ได้ ดู `deploy/nginx-uploads-snippet.conf`

---

## 13. API reference แบบย่อ

### 13.1 Profile (`http://localhost:5001/api`)

| Prefix | ใช้ทำอะไร |
|---|---|
| `/auth` | `login`, `register`, `me`, `profile` (PUT), `sso-ticket` |
| `/students` | CRUD นักศึกษา, `code/:student_id`, sub-resources `:id/resume`, `/resume/works`, `/skills`, `/educations`, `/internships`, `/projects`, `:id/promote` |
| `/alumni` | CRUD ศิษย์เก่า + `employment` |
| `/advisors` | CRUD อาจารย์ + `next-id/generate` |
| `/projects` | CRUD โปรเจกต์, `approval/pending`, `:id/submit-approval`, `/approve`, `/reject`, `/status` |
| `/student-projects` | รายการผลงานทั้งหมด (portfolio) |
| `/departments` | รายการ, `counts`, `:id/stats`, `:id/head` (PUT) |
| `/faculties`, `/skills` | ข้อมูลอ้างอิง |
| `/dashboard` | `stats`, `alumni-by-faculty`, `alumni-by-year`, `students-by-faculty`, `recent-alumni`, `awarded-projects`, `student-report`, `project-report` |
| `/news-events` | CRUD, `pin`, `publish`, `email-recipients`, `send-email`, `email-history`, `retry-failed-email` |
| `/chat-board` | `rooms`, `messages`, `reactions`, `upload`, `posts`, `comments` |
| `/admin/student-promotion` | `preview`, `execute`, `history`, `batch/:id` (DELETE) |
| `/data` | `import/*`, `export/*`, `template/:type` |
| `/upload` | `avatar`, `project-file`, `news-image`, `news-attachment` |
| `/scrape` | `preview`, `advisors/preview` |

### 13.2 Co-op (`http://localhost:5002/api`)

| Prefix | ใช้ทำอะไร |
|---|---|
| `/auth` | `login`, `me`, `sso` |
| `/users` | CRUD ผู้ใช้ + `import` (admin) |
| `/requests` | list/get/create/update/delete, `:id/status`, `:id/internship-period`, `:id/appointment`, `:id/response-qr`, `:id/supervision-documents`, `batch/status`, `batch/internship-period` |
| `/public/requests` | `:id` (GET), `:id/status` (PATCH) ต้องมี `responseToken` |
| `/relocations` | ดูหัวข้อ 10.5 + `/public/relocations/*` สำหรับลิงก์ one-time |
| `/checkins` | list, `overview`, CRUD, `batch-sign`, `student/:studentId` (DELETE) |
| `/payments` (= `/payment-proofs`) | list/get/create, `approve`, `reject` |
| `/public/evaluate/*`, `/evaluations/*`, `/advisor-evaluations/*`, `/evaluation-rounds`, `/admin/evaluation-rounds` | ประเมินผลและรอบประเมิน |
| `/internship-rounds`, `/admin/internship-rounds` | รอบปฏิทินฝึกงาน |
| `/public/companies`, `/public/stats`, `/public/contact` | แคตตาล็อกบริษัทและสถิติหน้าแรก |
| `/public/announcements`, `/announcements` | ประกาศ |
| `/public/banners`, `/banners` | แบนเนอร์ |
| `/public/settings`, `/settings/:key` | ค่าตั้งค่าหน้าเว็บ |
| `/notifications` | list, `read-all`, `:id/read` |
| `/internship` | `status-notify`, `status-notify/config` |
| `/admin/delete-student-data` | ลบข้อมูลฝึกงานของนักศึกษา (admin) |

รูปแบบ response ทั้งสองระบบ: `{ success: boolean, message?: string, data?: any }` (Co-op บาง endpoint ส่ง `token`/`user` ที่ระดับบนสุด)

---

## 14. Development workflow

### 14.1 เริ่มต้นครั้งแรก

```bash
git clone <repo> && cd lasc-students_app
cp .env.example .env               # แก้ secret ถ้าจำเป็น
docker compose up -d --build
docker compose ps                  # รอ lasc-mysql เป็น healthy
```

| Service | URL |
|---|---|
| Profile frontend | http://localhost:3000 |
| Profile API | http://localhost:5001/api |
| Co-op frontend | http://localhost:5173/coop |
| Co-op API | http://localhost:5002/api |
| phpMyAdmin | http://localhost:8080 |
| MySQL | `localhost:3307` (ในเครือข่าย Docker ใช้ `mysql:3306`) |

บัญชีทดสอบ:
- `admin` / `password123`
- นักศึกษา: รหัสนักศึกษา / รหัสนักศึกษา เช่น `6917796110`
- อาจารย์: `AD001` / `AD001`

### 14.2 งานประจำวัน

- โค้ดถูก mount เข้า container และใช้ nodemon/Vite HMR (`CHOKIDAR_USEPOLLING=true`) แก้แล้วเห็นผลทันที
- เพิ่ม dependency: `docker compose up -d --build <service>` (node_modules อยู่ใน named volume)
- ดู log: `docker compose logs -f <service>`
- เข้า MySQL: `docker exec -it lasc-mysql mysql -uroot -p lascstudent` หรือใช้ phpMyAdmin
- **ทุก query ที่มีภาษาไทยต้องใช้ `--default-character-set=utf8mb4`** ไม่อย่างนั้นจะเห็นเป็น `???` หรือเขียนข้อมูลเพี้ยน

### 14.3 เปลี่ยน schema

1. สำรองข้อมูลก่อน: `docker exec lasc-mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 lascstudent' > backup.sql`
2. สร้าง `db/migrations/YYYYMMDD-<ชื่อ>.sql` ให้ idempotent (MySQL 8 **ไม่รองรับ** `ADD COLUMN IF NOT EXISTS` ให้เช็คจาก `information_schema.COLUMNS` ก่อน) และใส่ `SET NAMES utf8mb4;`
3. แก้ `db/01-schema.sql` ให้ตรง เพื่อให้ volume ใหม่ได้โครงสร้างล่าสุด
4. ถ้ากระทบตารางของ Profile ให้แก้ `prisma/schema.prisma` แล้วรัน `npx prisma generate` (container รันให้ตอน `postinstall`)
5. เพิ่มชื่อไฟล์ migration ลงในรายการของ `db/README.md`
6. รัน migration: `docker exec -i lasc-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 lascstudent' < db/migrations/<file>.sql`

### 14.4 ตรวจงานก่อน commit

ยังไม่มี automated test (`npm test` ของ profile-backend ไม่มีอะไร) ให้ตรวจด้วยมือดังนี้:
- Backend: `node --check <ไฟล์ที่แก้>` แล้วเรียก API จริงด้วย curl
- Frontend: `npm run build` ในโฟลเดอร์ที่แก้ (Co-op มี `npm run lint` ด้วย) warning chunk > 500kB ของ Co-op เป็นของเดิม
- ทดสอบ flow จริงด้วยบัญชีของแต่ละ role (admin, AD###, รหัสนักศึกษา) โดยเฉพาะงานที่เปลี่ยนสถานะ
- ตรวจคำร้องที่สถานะค้าง: `node coop-backend/check-internship-dates.js` (ใส่ `--apply` เพื่อแก้จริง)

### 14.5 Git

- branch หลักคือ `main` และมี remote ที่ `github.com/imguitar/lasc-students_app`
- รูปแบบ commit message: `feat: ...`, `fix: ...`, `feat(coop): ...`, `fix(db): ...`
- ห้าม commit `.env*`, ฐานข้อมูล dump (`db/*dump*.sql`, `db/backup_*.sql`) และโฟลเดอร์ `uploads/`

---

## 15. Deployment (Production)

1. สร้าง `.env.production` บนเซิร์ฟเวอร์ (ไม่อยู่ใน git) โดยตั้งค่าต่อไปนี้ให้ครบ:
   - secret ใหม่ทั้ง 3 ตัว: `PROFILE_JWT_SECRET`, `COOP_JWT_SECRET`, `SSO_SHARED_SECRET` (ต้องต่างกันทั้งหมด)
   - URL production: `PROFILE_API_URL`, `COOP_API_URL`, `COOP_PUBLIC_URL`, `CORS_ORIGIN`
   - ค่า Gmail API (`GMAIL_*`) และ `ADMIN_EMAIL`
   - `MYSQL_PASSWORD_URLENCODED` (เข้ารหัสอักขระพิเศษ เช่น `!` เป็น `%21`)
2. `docker compose --env-file .env.production up -d --build`
3. Nginx reverse proxy:
   - `/` → profile-frontend
   - `/api` → profile-backend
   - `/coop` → coop-frontend
   - `/coop/api` → coop-backend (รวมถึง uploads ดู `deploy/nginx-uploads-snippet.conf`)
4. **ก่อนสร้าง volume ใหม่หรือรัน migration บน production ต้อง `mysqldump` เก็บไว้ก่อนทุกครั้ง**
5. ถ้าเป็น volume ใหม่ ระบบจะรัน `01` → `02` → `03` ให้อัตโนมัติ จะได้บัญชีจริงทั้งหมดพร้อม `admin/password123` **ต้องเปลี่ยนรหัสผ่าน admin ทันที**
6. ถ้าเป็นฐานข้อมูลเดิม ให้รัน migration ที่ยังไม่ได้รันตามลำดับชื่อไฟล์ และรัน `03-seed-users.sql` เองถ้าต้องการเพิ่มผู้ใช้
7. ห้ามรัน `db/reset-test-passwords.sql` บน production

---

## 16. Conventions และข้อตกลงในโค้ด

**UI/Design**
- ธีม Modern Minimalist ม่วง-ขาว: สีหลัก `violet-600`, พื้นหลังและเส้นขอบ `violet-50/100`, สีเน้นสถานะ `amber` และ `emerald`
- **ห้ามใช้อิโมจิในหน้าเว็บเด็ดขาด** ให้ใช้ SVG icon (lucide หรือ heroicons) และไม่ใช้ปุ่มสีดำทึบ
- การ์ดโค้งมน (`rounded-[28px]` ในหน้าเดิม) และทุกหน้าต้องใช้งานบนมือถือได้ (responsive)
- ห้ามเพิ่ม UI, dropdown, ช่องค้นหา หรือ input ที่ไม่ได้รับคำสั่ง
- สี badge สถานะใช้จาก `StatusBadge.jsx` เท่านั้น

**Backend**
- ข้อความ error และ response ที่ผู้ใช้เห็นเขียนเป็นภาษาไทย
- วันที่เทียบตามเวลา `Asia/Bangkok` เสมอ (`toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })`) เพราะเซิร์ฟเวอร์อาจตั้งเป็น UTC
- เช็คสถานะคำร้องด้วยรายการ `IN (...)` ตาม canonical group ใน SYSTEM_BLUEPRINT **ห้ามใช้ `LIKE '%อนุมัติ%'`** เพราะจะไปตรงกับ "ไม่อนุมัติ" ด้วย และให้ตัดกลุ่มปฏิเสธออกก่อนทุกครั้ง
- Endpoint สาธารณะของบริษัทต้องตรวจ token ที่ผูกกับคำร้องใบนั้น อายุจำกัด และใช้ได้ครั้งเดียว
- สิทธิ์ที่เปลี่ยนได้ เช่นประธานสาขา ให้อ่านจาก DB ทุกครั้ง ไม่เก็บใน JWT
- Co-op: เขียน logic ในไฟล์ route ได้ตรง ๆ ใช้ `pool.query` กับ placeholder `?` เสมอ ตารางที่สร้างเองตอนรันต้องใช้ `ensureTable()` แบบ idempotent
- Profile: แยก route กับ controller และใช้ Prisma

**ภาษาและเอกสาร**
- เอกสารและ comment ส่วนใหญ่เขียนเป็นภาษาไทย วันที่ใช้รูปแบบ ISO `YYYY-MM-DD`

**ขอบเขตงาน** — [prompts/instructions.md](prompts/instructions.md) เคยกำหนดว่าห้ามแก้ `profile-*` เพราะเป็นของทีมพาร์ตเนอร์ ปัจจุบันทั้งสองระบบพัฒนาอยู่ใน repo เดียวกันแล้ว แต่ถ้าจะแก้ฝั่ง Profile ควรยืนยันกับเจ้าของงานก่อน

---

## 17. ปัญหาที่รู้แล้วและหนี้ทางเทคนิค

ตรวจสอบกับโค้ด ณ วันที่ 2026-11-06 เรียงจากสำคัญมากไปน้อย

| # | ปัญหา | ตำแหน่ง | ผลกระทบ / แนวทาง |
|---|---|---|---|
| 1 | API จัดการบริษัท (`POST/PUT/DELETE /api/public/companies`, `/companies/import`, `/companies/batch-delete`) **ไม่มี authentication** | `coop-backend/src/routes/companyRoutes.js` | ใครก็เพิ่ม แก้ หรือลบบริษัทได้ ควรใส่ `authenticate, authorize('admin')` เฉพาะ route ที่เขียนข้อมูล |
| 2 | ข้อมูลส่วนบุคคลจริง (ชื่อและรหัสนักศึกษา 2,290 คน) อยู่ใน git ทั้งไฟล์ `.xlsx` และ `db/03-seed-users.sql` | `profile-backend/*.xlsx`, `db/` | ถ้า repo เป็น public หรือแชร์ออกไป ต้องเอาออกจาก git (รวมถึงประวัติ) |
| 3 | รหัสผ่านเริ่มต้นเท่ากับ username | seed | ใครรู้รหัสนักศึกษาก็เข้าบัญชีได้ ควรบังคับเปลี่ยนรหัสผ่านตอนล็อกอินครั้งแรก |
| 4 | Co-op ใช้ JWT secret สำรอง `'your_jwt_secret_key'` ถ้าไม่ได้ตั้ง env | `coop-backend/src/middlewares/auth.js`, `authRoutes.js` | ถ้าลืมตั้ง env บน production จะปลอม token ได้ ควรให้ระบบไม่ยอมเริ่มทำงานถ้าไม่มี secret |
| 5 | Endpoint นำเข้า students/alumni/advisors เรียก `prisma.student`, `prisma.alumni`, `prisma.advisor` ซึ่งไม่มีใน schema | `profile-backend/controllers/importExport.controller.js` | นำเข้าจะ error ทุกแถว ต้องเขียนใหม่ให้สร้าง `user` + `profile` |
| 6 | role `teacher` ถูกอ้างถึงในโค้ดแต่ไม่มีใน ENUM | หลาย route และ Layout | เป็นโค้ดตกค้าง ไม่มีผลเสีย แต่ทำให้อ่านโค้ดสับสน |
| 7 | ตาราง `internship_relocation_requests`, `internship_rounds`, `site_settings` ไม่อยู่ใน `01-schema.sql` (สร้างตอนรันแทน) | coop routes | ดูโครงสร้างจากไฟล์ SQL อย่างเดียวจะไม่ครบ |
| 8 | ตัวกัน SSO replay (`usedTicketIds`) เก็บใน memory | `coop-backend/src/routes/authRoutes.js` | ถ้ารันหลาย instance หรือ restart ภายใน 60 วินาที ตั๋วอาจใช้ซ้ำได้ ความเสี่ยงต่ำ |
| 9 | ค่าสถานะคำร้องมีคำพ้องและ legacy key มาก (~25 ค่า) | `requests.status` | ต้องใช้รายการ canonical ทุกครั้ง ถ้ามีเวลาควรทำ normalization |
| 10 | วันหยุดนักขัตฤกษ์ hardcode ถึงปี 2570 | `coop-frontend/src/utils/thaiHolidays.js` | ต้องอัปเดตทุกปี |
| 11 | ยังไม่ได้ตั้งประธานสาขาหลังเปลี่ยนเป็นข้อมูลจริง และการจับคู่สาขาของอาจารย์บางสาขายังไม่ได้ยืนยัน | ข้อมูล | admin ต้องตั้งประธานสาขา แล้วตรวจสาขาของอาจารย์ใน `DEPT_ALIASES` |
| 12 | ไม่มี automated test | ทั้ง repo | ทุกการเปลี่ยนแปลงต้องทดสอบด้วยมือ |
| 13 | เอกสารเก่าบางส่วนไม่ตรงกับโค้ดปัจจุบัน | `specifications/CONTEXT.md` (Tailwind), `prompts/instructions.md` (ขอบเขต) | เอกสารนี้อัปเดตกว่า |

---

## 18. Troubleshooting

| อาการ | สาเหตุที่พบบ่อย | วิธีแก้ |
|---|---|---|
| ภาษาไทยเป็น `???` หรือตัวอักษรเพี้ยน | client ต่อ MySQL ด้วย charset อื่น | ใช้ `--default-character-set=utf8mb4` และใส่ `SET NAMES utf8mb4;` ทุกไฟล์ SQL |
| แก้ไฟล์ใน `db/` แล้วไม่มีผล | init script รันเฉพาะตอน volume ว่าง | รันไฟล์นั้นเองด้วย `docker exec -i lasc-mysql ...` หรือลบ volume (`docker compose down -v` — **ข้อมูลหายหมด** ต้องสำรองก่อน) |
| เมนู "ระบบศูนย์ฝึก" แจ้งว่าเชื่อมไม่ได้ / 503 | ไม่ได้ตั้ง `SSO_SHARED_SECRET` หรือสองฝั่งตั้งไม่ตรงกัน | ตั้งค่าให้ตรงกันใน `.env` แล้ว restart ทั้งสอง backend |
| SSO ตอบ "ตั๋วถูกใช้ไปแล้ว" | รีเฟรชหน้า `/sso` หรือกดย้อนกลับ | กดเมนูจาก Profile ใหม่เพื่อออกตั๋วใบใหม่ |
| Prisma error เรื่องรหัสผ่านใน URL | อักขระพิเศษใน `DATABASE_URL` | ตั้ง `MYSQL_PASSWORD_URLENCODED` (`!` → `%21`) |
| คำร้องไม่เปลี่ยนเป็น "ออกฝึกงาน" ตามวัน | ไม่มี `internship_start_date` หรือสถานะไม่อยู่ใน `PRE_INTERNSHIP_STATUSES` | กำหนดวันฝึกและตรวจว่าผ่านขั้นอนุมัติครบแล้ว รัน `node coop-backend/check-internship-dates.js` |
| นักศึกษาเช็คชื่อไม่ได้ | คำร้องยังไม่ถึงช่วงฝึก หรือยังไม่ได้กำหนดวันเริ่มทางการ | ดูข้อความ error จาก `getCheckinGuard` |
| บริษัทเปิดลิงก์ตอบรับแล้วได้ 403 | token หมดอายุ (7 วัน) หรือใช้ไปแล้ว | admin ออก QR หรือลิงก์ใหม่ด้วย `POST /api/requests/:id/response-qr` |
| ประเมินไม่ได้ "นอกช่วงเวลาการประเมิน" | ไม่มีรอบประเมินที่ active หรือวันนี้อยู่นอกช่วง | admin เปิดรอบประเมินที่ dashboard |
| ADD COLUMN ใน migration error บน MySQL 8 | ใช้ `IF NOT EXISTS` ซึ่งรองรับเฉพาะ MariaDB | เช็ค `information_schema.COLUMNS` ก่อน ADD |
| พอร์ต 3306 หรือ 5000 ชน | มี MySQL local อยู่แล้ว / macOS AirPlay ใช้พอร์ต 5000 | ระบบ map เป็น 3307 และ 5001 อยู่แล้ว เปลี่ยนได้ใน `.env` |

---

## 19. ประวัติการพัฒนา

ไล่จากเก่าไปใหม่ (รายละเอียดดูได้จาก `git log`)

1. **ฐานรวม**: รวม Profile กับ Co-op เข้า monorepo ใช้ฐานข้อมูลร่วม และแก้ charset ไทย (`SET NAMES utf8mb4`)
2. **ประธานสาขา**: เก็บไว้ที่ `departments` จุดเดียว Co-op อ่านจาก Profile
3. **Co-op**: ส่งแบบประเมินให้ผู้ประเมินทางอีเมล และเพิ่มรอบประเมิน
4. **Profile**: เพิ่ม resume, ทักษะ, ฝึกงาน, portfolio, การสำเร็จการศึกษา
5. **SSO**: ล็อกอินที่ Profile ครั้งเดียวแล้วเข้า Co-op ได้
6. **Co-op UI ม่วง-ขาว**: ศูนย์รวมการแจ้งเตือน, ปฏิทินบันทึกรายวัน, แก้ workflow
7. **ข่าวสารและกิจกรรม** (Profile) และแก้ SSO บน production
8. **Workflow fixes**: เติมข้อมูลติดต่อบริษัทอัตโนมัติ, กราฟวงกลมของ admin, กลไกเริ่มฝึกงานอัตโนมัติ, ป้องกันคะแนนประเมิน, seed บริษัท
9. **Lockdown workflow ฝึกงาน**: ปุ่ม logout ใน sidebar, badge สาขา, ลบอิโมจิออก
10. **ย้ายที่ฝึก (Relocation)**, คุมการออกใบส่งตัว, รอบปฏิทินฝึกงาน, เติมข้อมูลการเข้างานย้อนหลัง
11. Relocation: อัปโหลดหนังสือตอบรับ, แจ้งเตือนอาจารย์, ย้ายได้หลายรอบ, รวมหน้า check-in เป็นหน้าเดียว, วันหยุดไทย
12. **อีเมลแจ้งกิจกรรม** ผ่าน Gmail OAuth2 และตัวเลือกเวลาไทย 24 ชั่วโมง (Profile)
13. **MUI Clean Violet overhaul** (Co-op), หน้ารายละเอียดคำร้องใช้ร่วมกันทุก role, รองรับมือถือ (commit `d30abfc`)
14. **(ยังไม่ commit — 2026-11-06)**:
    - เปลี่ยน seed จาก mockup เป็นผู้ใช้จริง 2,291 บัญชี พร้อมสคริปต์ `generate-seed-users.js`
    - เพิ่มคอลัมน์ที่อยู่ (`house_no`, `village_no`, `road`) และตาราง `student_educations`, `student_project_files`
    - เพิ่ม approval workflow ของโปรเจกต์ใน `01-schema.sql`

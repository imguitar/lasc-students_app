# LASC Students App

Monorepo สำหรับระบบบริการนักศึกษา คณะศิลปศาสตร์และวิทยาศาสตร์ ประกอบด้วยระบบฐานข้อมูลนักศึกษาและระบบศูนย์ฝึกนักศึกษา โดยทั้งสองระบบใช้ฐานข้อมูล MySQL ร่วมกัน

## ระบบภายในโครงการ

| ระบบ | Frontend | Backend API |
|---|---|---|
| ฐานข้อมูลนักศึกษา (Profile) | `profile-frontend` | `profile-backend` |
| ศูนย์ฝึกนักศึกษา (Co-op) | `coop-frontend` | `coop-backend` |

โครงสร้างหลักของ repository:

```text
.
├── profile-frontend/   # React + Vite
├── profile-backend/    # Express + Prisma
├── coop-frontend/      # React + Vite
├── coop-backend/       # Express + MySQL
├── db/                 # Schema, reference data และ migration
├── docker-compose.yml
└── DOCKER.md           # คู่มือ Docker ฉบับละเอียด
```

## เริ่มใช้งานด้วย Docker

สิ่งที่ต้องติดตั้ง:

- Docker Desktop หรือ Docker Engine พร้อม Docker Compose
- Git

เตรียม environment และเริ่มทุก service:

```bash
cp .env.example .env
docker compose up -d --build
```

ตรวจสอบสถานะ:

```bash
docker compose ps
docker compose logs -f
```

เมื่อ MySQL เริ่มด้วย data volume ใหม่ ระบบจะนำเข้า schema และข้อมูลอ้างอิงจาก `db/` โดยอัตโนมัติ

## URL สำหรับ Local Development

| Service | URL |
|---|---|
| Profile frontend | http://localhost:3000 |
| Profile API | http://localhost:5001/api |
| Co-op frontend | http://localhost:5173/coop |
| Co-op API | http://localhost:5002/api |
| phpMyAdmin | http://localhost:8080 |
| MySQL | `localhost:3307` |

พอร์ตและค่าการเชื่อมต่อสามารถแก้ไขได้ในไฟล์ `.env`

## คำสั่งที่ใช้บ่อย

```bash
docker compose up -d
docker compose down
docker compose restart <service>
docker compose logs -f <service>
docker compose up -d --build <service>
```

ชื่อ service ที่ใช้งานได้ ได้แก่ `mysql`, `phpmyadmin`, `profile-backend`, `profile-frontend`, `coop-backend` และ `coop-frontend`

## พัฒนาโดยไม่ใช้ Docker

แต่ละแอปจัดการ dependency แยกกัน ตัวอย่าง:

```bash
cd profile-frontend
npm install
npm run dev
```

คำสั่งหลักของแต่ละแอป:

| โฟลเดอร์ | Development | Production build/start |
|---|---|---|
| `profile-frontend` | `npm run dev` | `npm run build` |
| `profile-backend` | `npm run dev` | `npm start` |
| `coop-frontend` | `npm run dev` | `npm run build` |
| `coop-backend` | `npm run dev` | `npm start` |

ก่อนเปิด backend โดยไม่ใช้ Docker ต้องตั้งค่า database และ environment ตามไฟล์ `.env.example` ภายในแต่ละโฟลเดอร์

## ฐานข้อมูล

- `db/01-schema.sql` — โครงสร้างฐานข้อมูลกลาง
- `db/02-reference-data.sql` — ข้อมูลคณะและสาขาวิชาที่ระบบต้องใช้
- `db/migrations/` — migration สำหรับฐานข้อมูลเดิม

## เข้าสู่ระบบครั้งเดียว (SSO)

ผู้ใช้ล็อกอินที่ระบบฐานข้อมูลนักศึกษาเท่านั้น แล้วเลือกเมนู **ระบบศูนย์ฝึกประสบการณ์**
ในแถบเมนูด้านซ้ายเพื่อเข้าระบบศูนย์ฝึกต่อได้ทันทีโดยไม่ต้องกรอกรหัสผ่านซ้ำ ใช้ได้กับทุก role

ขั้นตอนเบื้องหลัง:

1. `POST /api/auth/sso-ticket` (ระบบ Profile) ออกตั๋วอายุ 60 วินาที ใช้ได้ครั้งเดียว
2. เบราว์เซอร์ไปที่ `<COOP_PUBLIC_URL>/sso?ticket=...`
3. `POST /api/auth/sso` (ระบบ Coop) ตรวจตั๋ว อ่านผู้ใช้จากตาราง `user` ที่ใช้ร่วมกัน
   แล้วออก token ของระบบศูนย์ฝึกให้

ตั๋วไม่ใช่ session token และหน้า `/sso` จะลบตั๋วออกจาก URL ทันทีที่แลกเสร็จ
ต้องตั้ง `SSO_SHARED_SECRET` ให้ตรงกันทั้งสอง backend มิฉะนั้นเมนูนี้จะแจ้งว่ายังเชื่อมระบบไม่ได้

หน้า login ของระบบศูนย์ฝึก (`/coop/login`) ยังใช้งานได้ตามปกติสำหรับกรณีเข้าตรง

ทั้ง Profile และ Co-op ใช้ฐานข้อมูล `lascstudent` ร่วมกัน กรุณาสำรองข้อมูลก่อนรัน migration หรือสร้าง volume ใหม่ใน production

## เอกสารเพิ่มเติม

- [คู่มือ Docker และการ deploy](DOCKER.md)
- [คู่มือฐานข้อมูล](db/README.md)
- [Profile Backend](profile-backend/README.md)
- [Co-op Backend](coop-backend/README.md)
- [Co-op Frontend](coop-frontend/README.md)

## Production

- Profile: https://students.sci-sskru.com
- Co-op: https://students.sci-sskru.com/coop

สำหรับ production ให้สร้าง `.env.production` ที่มีค่าจริงและเก็บ secret ไว้นอก Git จากนั้นรัน:

```bash
docker compose --env-file .env.production up -d --build
```

ดูรายละเอียด reverse proxy, database initialization และข้อควรระวังเพิ่มเติมใน [DOCKER.md](DOCKER.md)

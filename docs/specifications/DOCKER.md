# LASC Students App — Docker Development Environment

รวม 2 แอปที่ใช้ฐานข้อมูล MySQL ตัวเดียวกัน (`lascstudent`) พร้อม phpMyAdmin

URL สำหรับ production:

- ระบบฐานข้อมูลนักศึกษา (Profile): `https://students.sci-sskru.com`
- ระบบศูนย์ฝึกนักศึกษา: `https://students.sci-sskru.com/coop`
- Profile API: `https://students.sci-sskru.com/api`
- ศูนย์ฝึก API: `https://students.sci-sskru.com/coop/api`

| แอป | ส่วน | โฟลเดอร์ | URL |
|---|---|---|---|
| ระบบฐานข้อมูลนักศึกษา | Frontend | `profile-frontend` | http://localhost:3000 |
| ระบบฐานข้อมูลนักศึกษา | Backend API | `profile-backend` | http://localhost:5001 |
| ระบบศูนย์ฝึกนักศึกษา | Frontend | `coop-frontend` | http://localhost:5173/coop |
| ระบบศูนย์ฝึกนักศึกษา | Backend API | `coop-backend` | http://localhost:5002 |
| ฐานข้อมูล | MySQL 8.0 | `db/01-schema.sql` | localhost:3307 |
| จัดการ DB | phpMyAdmin | — | http://localhost:8080 |

> **ทำไมไม่ใช้พอร์ตมาตรฐาน?**
> - `5000` บน macOS ถูก AirPlay Receiver (Control Center) ใช้อยู่ → backend จึง map เป็น `5001` / `5002`
> - `3306` มี MySQL ที่ติดตั้งบนเครื่องใช้อยู่ → MySQL ใน docker จึง map เป็น `3307`
>
> เปลี่ยนได้ทั้งหมดในไฟล์ `.env` (ภายใน container ยังเป็นพอร์ตเดิม 5000/3306)

---

## เริ่มใช้งาน

### Local Docker (ค่าเริ่มต้น)

```bash
cp .env.example .env      # ครั้งแรกเท่านั้น
docker compose up -d --build
```

`.env` ใช้ URL local โดย frontend จะเรียก API ที่ `localhost:5001` และ `localhost:5002`
ส่วน backend อนุญาต CORS จาก `localhost:3000` และ `localhost:5173`

### Production Docker

```bash
docker compose --env-file .env.production up -d --build
```

ไฟล์ `.env.production` ใช้โดเมน `students.sci-sskru.com` และถูก ignore จาก Git เพราะมี secret

ครั้งแรกจะ import schema และข้อมูลอ้างอิงจากโฟลเดอร์ `db/` เข้า MySQL ให้อัตโนมัติ
ดูสถานะ / รอจนพร้อม:

```bash
docker compose ps
docker compose logs -f
```

## บัญชีทดสอบแต่ละ Role (Local)

บัญชีต่อไปนี้ใช้ทดสอบได้กับทั้งระบบฐานข้อมูลนักศึกษาและระบบศูนย์ฝึกนักศึกษา เนื่องจากทั้งสองระบบใช้ตารางผู้ใช้ร่วมกัน:

| Role | Username | Password |
|---|---|---|
| ผู้ดูแลระบบ (`admin`) | `admin1` | `password123` |
| อาจารย์ที่ปรึกษา (`advisor`) | `advisor1` | `password123` |
| นักศึกษา (`student`) | `student1` | `password123` |
| ศิษย์เก่า (`alumni`) | `alumni1` | `password123` |

หน้าเข้าสู่ระบบสำหรับทดสอบ:

- ระบบฐานข้อมูลนักศึกษา: http://localhost:3000/login
- ระบบศูนย์ฝึกนักศึกษา: http://localhost:5173/coop/login

> บัญชีเหล่านี้ใช้สำหรับ local/testing เท่านั้น ห้ามนำรหัสผ่านตัวอย่างไปใช้บน production
> และบัญชีจะไม่ถูกสร้างอัตโนมัติเมื่อเริ่มฐานข้อมูลใหม่จากไฟล์ใน `db/` เพื่อป้องกันบัญชีรหัสผ่านคงที่หลุดไปยัง production

## คำสั่งที่ใช้บ่อย

```bash
docker compose up -d              # เปิดทั้งหมด
docker compose down               # ปิด (ข้อมูล DB ยังอยู่)
docker compose down -v            # ปิด + ลบข้อมูล DB ทั้งหมด (จะ import ใหม่ตอนเปิดครั้งถัดไป)
docker compose restart coop-backend
docker compose logs -f profile-backend
docker compose exec profile-backend sh     # เข้า shell ใน container
```

## แก้โค้ดแล้วเห็นผลทันที

โค้ดทุกโปรเจกต์ถูก bind-mount เข้า container:
- Backend ทั้งสองตัวรันด้วย `nodemon` → แก้ไฟล์แล้ว restart เอง
- Frontend ทั้งสองตัวรันด้วย Vite dev server → HMR ทำงานปกติ

**ยกเว้น** เมื่อเพิ่ม/ลบ dependency ใน `package.json` ต้อง build ใหม่:

```bash
docker compose up -d --build <service>
```

## ฐานข้อมูล

- Database: `lascstudent` — ใช้ร่วมกันทั้ง 2 แอป (ตาราง `user`, `profile`, `requests`, `daily_checkins`,
  `payment_proofs`, `announcements`, `evaluations`, `advisor_evaluations`, `companies`,
  `faculties`, `departments`, `projects`, `project_members`, `project_comments`)
- App user: `lascstudent` / Password: `lascstudent!`
- phpMyAdmin ล็อกอินอัตโนมัติด้วย app user ข้างต้น

เชื่อมต่อจากเครื่อง host (เช่น DBeaver / TablePlus):

```
Host: 127.0.0.1   Port: 3307   User: lascstudent   Password: lascstudent!   DB: lascstudent
```

สร้าง schema และข้อมูลอ้างอิงในฐานข้อมูลว่าง:

```bash
docker compose exec -T mysql mysql -ulascstudent -p'lascstudent!' < db/01-schema.sql
docker compose exec -T mysql mysql -ulascstudent -p'lascstudent!' < db/02-reference-data.sql
```

Backup:

```bash
docker compose exec -T mysql mysqldump -ulascstudent -p'lascstudent!' lascstudent > db/backup_$(date +%F).sql
```

## หมายเหตุ

- SQL โครงสร้างทั้งหมดอยู่ใน `db/01-schema.sql` และไม่มีข้อมูลผู้ใช้จริงปะปน
- ข้อมูลคณะและสาขาวิชาที่ระบบจำเป็นต้องใช้เท่านั้นอยู่ใน `db/02-reference-data.sql`
- เมื่อแก้ schema กลาง ให้ใช้ `npm run db:pull` ใน `profile-backend` เพื่อ sync `schema.prisma`
- ค่า `VITE_API_URL` / `VITE_API_BASE_URL` ถูกส่งจาก `docker-compose.yml` ตาม `PROFILE_API_URL` และ
  `COOP_API_URL` ใน `.env`
- หากเปลี่ยนระหว่าง local และ production ต้อง recreate frontend containers เพราะ Vite อ่านค่า environment
  ตอนเริ่ม process/build
- Reverse proxy บน production ต้องส่ง `/api` ไป `profile-backend:5000` และส่ง `/coop/api` ไป
  `coop-backend:5000` โดยตัด prefix `/coop` ออก ส่วน `/` และ `/coop` ส่งไป frontend ของแต่ละระบบ
- `MYSQL_USER` / `MYSQL_PASSWORD` จะถูกสร้างโดย MySQL image เฉพาะตอน initialize volume ใหม่เท่านั้น
  หากมี volume เดิมอยู่แล้ว ต้องสร้าง/แก้ user และ grant ในฐานข้อมูลเดิม หรือสำรองข้อมูลแล้วสร้าง volume ใหม่

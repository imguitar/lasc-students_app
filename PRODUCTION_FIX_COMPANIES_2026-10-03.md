# Production Fix Report — บริษัทแนะนำแสดง 0 รายการ
## students.sci-sskru.com | วันที่ตรวจสอบ: 2026-10-03

---

## Root Cause Identified

ยิงทดสอบจริงจากภายนอก:

```
GET https://students.sci-sskru.com/coop/api/public/companies
→ 200 OK  {"success":true,"data":[]}
GET https://students.sci-sskru.com/coop/api/health → 200 OK
```

**สรุป:** endpoint ทำงานปกติ (ไม่ใช่ 404/CORS/Frontend path ผิด) แต่คืน array ว่าง
ต้นตอคือ **2 สาเหตุร่วมกัน** บน server:

| # | สาเหตุ | หลักฐาน |
| :-: | :--- | :--- |
| 1 | **ตาราง `companies` บน Production ว่าง** — seed 10 บริษัทยังไม่ถูก import | local มี 11 แถว, prod คืน `[]` |
| 2 | **โค้ด Backend บน Production เป็นเวอร์ชันเก่า** — query ดักเฉพาะคำร้องสถานะ "ฝึกงานเสร็จแล้ว" เท่านั้น คำร้องที่กำลังดำเนินการ (เช่น "โอเล่จำกัด") ไม่ถูกนับ | local แก้แล้วเป็น `NOT LIKE '%ไม่อนุมัติ%' AND NOT IN ('ปฏิเสธ','ยกเลิก','ร่าง')` — ยังไม่ commit/push |
| 3 | ✅ Frontend path **ไม่ใช่สาเหตุ** — `src/api/axios.js` fallback คือ prod URL อยู่แล้ว และ request ถึง server จริง (200) | — |

---

## Actions Taken / Runbook สำหรับ Production

ดำเนินการบน server ตามลำดับ (สมมุติ code deploy ผ่าน git + pm2 — ปรับตามของจริง):

### Step 1: Deploy โค้ดใหม่ (ต้องทำก่อน — ตอนนี้ยังไม่ได้ push)

```bash
# บนเครื่อง local — commit + push งานที่ยังค้าง
git add -A && git commit -m "feat: pie charts, internship auto-update, eval security, company seed" && git push

# บน production server
cd /path/to/lasc-students_app
git pull
```

### Step 2: Import seed + แปลง charset (บังคับ utf8mb4 ทุกครั้ง)

```bash
cd /path/to/lasc-students_app

mysql -u <db_user> -p <db_name> --default-character-set=utf8mb4 \
  < db/migrations/20260924-fix-charset-utf8mb4.sql

mysql -u <db_user> -p <db_name> --default-character-set=utf8mb4 \
  < db/migrations/20260924-seed-companies.sql
```

> ⚠️ **ถ้า seed เคยถูก import ผิด encoding มาก่อน** (ชื่อบริษัทเป็นตัวอักษรต่างดาว):
> ```sql
> DELETE FROM companies WHERE source = 'seed';   -- หรือตามเงื่อนไขที่ระบุแถว seed ได้
> ```
> แล้วค่อย import ใหม่ — `CONVERT TO` แก้ collation ตาราง แต่**ไม่ซ่อมข้อมูลที่ double-encoded แล้ว**

### Step 3: Verify DB

```sql
SELECT COUNT(*) FROM companies;                       -- ต้อง >= 10
SELECT name, province FROM companies LIMIT 5;         -- ภาษาไทยต้องอ่านได้
SHOW TABLE STATUS LIKE 'companies'\G                  -- Collation: utf8mb4_unicode_ci
```

### Step 4: Restart Backend

```bash
pm2 restart all          # หรือชื่อ process ที่ใช้
# หรือ: sudo systemctl restart <service-name>
```

### Step 5: ตั้งค่า env (ถ้ายังไม่ได้ตั้ง)

```bash
# .env บน production
COOP_PUBLIC_URL=https://students.sci-sskru.com/coop
# อย่าลืม VITE_API_BASE_URL ตอน build frontend (default fallback เป็น prod URL อยู่แล้ว)
```

---

## Verification Results

### ก่อนแก้ (สถานะปัจจุบัน — เช็คจริงจากภายนอก)

| Test | ผล |
| :--- | :--- |
| `GET /coop/api/public/companies` | 200 แต่ `data: []` |
| `GET /coop/api/health` | 200 — server/DB ทำงานปกติ |
| Frontend path | ✅ ถูกต้อง (`/coop/api/...` — ไม่ชี้ localhost) |

### หลังแก้ — เกณฑ์ที่ต้องผ่าน (run เมื่อ deploy เสร็จ)

```bash
# 1. API ต้องคืน >= 10 รายการ
curl -s https://students.sci-sskru.com/coop/api/public/companies | python -c \
  "import json,sys; d=json.load(sys.stdin)['data']; print(len(d), 'รายการ')"

# 2. ตัวอักษรไทยต้องอ่านได้ (ไม่มี ó/Ã/�)
curl -s https://students.sci-sskru.com/coop/api/public/companies | head -c 500
```

| จุดตรวจ | ผลที่คาดหวัง |
| :--- | :--- |
| `/coop/companies` | แสดง ≥10 สถานประกอบการ |
| Modal หน้า new-request | Autocomplete/dropdown มีรายการ |
| F12 → Network | `public/companies` → 200 + JSON array ไม่ว่าง |

---

## สรุปสถานะ

- ✅ **Local**: ทำงานครบ (11 รายการ, UTF-8 ถูก, query ใหม่)
- ⏳ **Production**: รอ 3 อย่าง — **push+pull โค้ด** → **import 2 migrations** → **restart backend**
- ไม่มีปัญหา frontend/CORS/proxy — path และ response ถึง server ถูกต้องแล้ว

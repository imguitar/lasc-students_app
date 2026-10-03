# Critical Workflow Fix: ล็อกเด็ดขาด "ออกฝึกงาน" ต้องผ่านแอดมินรอบ 2 เท่านั้น

**วันที่:** 2026-10-03

## สืบสวนต้นตอ (Request #25 — นักศึกษา 6610014105)

Query จริงจาก DB:

| Field | ค่า | บอกอะไร |
|---|---|---|
| `submittedDate` | 2026-10-03 10:40 | ยื่นวันนี้ |
| `status` | `ออกฝึกงาน` | เด้งภายใน 6 นาที |
| `internship_start_date` | 2026-10-01 | วันของนักศึกษารั่วเข้าคอลัมน์ทางการ |
| `dispatchLetter` | **`RESUME_APHICHAT.pdf`** (138KB) | เป็นเรซูเม่นักศึกษา ไม่ใช่หนังสือส่งตัว! |
| `uploadedAt` | `null` | ผ่าน flow ที่ไม่ประทับเวลา |

**รูทคอส 3 ชั้น:**

1. **จุดรั่วใหญ่สุด** — `handleApproveStartInternship` / dispatchModal ตั้ง `'ออกฝึกงาน'` ตรงๆ (`isStartInternship → 'ออกฝึกงาน'`) **ข้าม date gate ทั้งหมด** — ทั้ง `AdminDashboardPage.jsx` และ `RequestDetailsPage.jsx`
2. **Data leak** — `parseRequestRow` ใน `helpers.js` sync `details.startDate` → `internship_start_date` **ใน response ทุกครั้งที่อ่าน** ทำให้วันของนักศึกษาปลอมเป็นวันทางการตลอด
3. **Display leak** — `internshipStatus.js` `unapprovedStatuses` ขาด `'ยื่นคำร้องแล้ว'` กับ `'สถานประกอบการตอบรับแล้ว'` (แบบไม่มีวงเล็บ) → frontend คำนวณสถานะเด้งเอง

*(auto-update เองถูกล็อกไว้แล้วในรอบก่อน — whitelist 3 สถานะ + คอลัมน์แอดมินเท่านั้น + ต้องมีหนังสือส่งตัว)*

## Files Modified

### 1. `coop-backend/src/routes/requestRoutes.js` (POST `/api/requests`, ~line 232)

**§2 — Hardcode สถานะเริ่มต้น:**
```javascript
const initialStatus = req.user?.role === 'admin'
  ? (status || 'รอผู้ดูแลระบบตรวจสอบ')
  : 'รออาจารย์ที่ปรึกษาอนุมัติ';
```
เดิม `status || 'รออาจารย์ที่ปรึกษาอนุมัติ'` เชื่อค่าจาก client — นักศึกษาส่ง `status: 'ออกฝึกงาน'` มาได้เลย ตอนนี้นักศึกษาถูกบังคับ flow แรกเสมอ (INSERT ไม่เขียน `internship_start_date`/`dispatchLetter` — schema `DEFAULT NULL` อยู่แล้ว)

### 2. `coop-frontend/src/pages/Admin/Dashboard/AdminDashboardPage.jsx` (~line 803-825)

**§3 — ปิดช่อง jump ตรง:**
```javascript
// เดิม: isStartInternship ? 'ออกฝึกงาน' : ...
// ใหม่: ตั้ง 'อนุมัติแล้ว (รอออกฝึกงาน)' เสมอ — auto-update ตัดสินตามวันจริง
const newStatus = isStartInternship ? 'อนุมัติแล้ว (รอออกฝึกงาน)' : 'รอสถานประกอบการตอบรับ';
```
+ เพิ่ม `uploadedAt` ใน `dispatchLetter` object (จำเป็นสำหรับ letter-gate ของ auto-update) + local state ใช้ `payload.dispatchLetter` ครบ

### 3. `coop-frontend/src/pages/Admin/Shared/RequestDetailsPage.jsx` (~line 241-262)

แก้เหมือนข้อ 2 ทุกประการ — `'ออกฝึกงาน'` → `'อนุมัติแล้ว (รอออกฝึกงาน)'` + `uploadedAt` stamp

### 4. `coop-frontend/src/utils/internshipStatus.js` (~line 26)

เพิ่ม early statuses ที่ขาดใน `unapprovedStatuses`:
- `'ยื่นคำร้องแล้ว'`
- `'สถานประกอบการตอบรับแล้ว'` (แบบไม่มีวงเล็บ — เดิมมีแค่แบบ `(รอผู้ดูแลระบบกำหนดวัน)`)

### 5. `coop-backend/src/utils/helpers.js` (`parseRequestRow`, ~line 149)

**ตัด sync กลับทิ้ง** — เดิม `details.startDate → parsed.internship_start_date` รั่วทุก response เหลือ sync ทางเดียว (คอลัมน์→details เพื่อแสดงผลเท่านั้น):
```javascript
// ห้าม sync กลับ details→คอลัมน์ — details.startDate คือวันที่นักศึกษาเสนอ
```
*(consumers ทุกจุดมี fallback ของตัวเองอยู่แล้ว — internshipStatus.js, evaluationRoutes, checkinRoutes ใช้ raw column — ปลอดภัย)*

## §4 — แก้ข้อมูลที่เสียใน DB

```sql
UPDATE requests SET status = 'รออาจารย์ที่ปรึกษาอนุมัติ'
WHERE id = 25 AND status IN ('ออกฝึกงาน', 'กำลังออกฝึกงาน');
```

- `BEFORE: ออกฝึกงาน → AFTER: รออาจารย์ที่ปรึกษาอนุมัติ` ✓ (รันจริงแล้ว)
- สแกนคำร้อง post-approval ทั้งตาราง → **ไม่มีตัวอื่นเด้งผิด** (empty set)

## Workflow หลังล็อก (ครบทุกชั้น)

```
นักศึกษายื่น → 'รออาจารย์ที่ปรึกษาอนุมัติ' (hardcode, client กำหนดเองไม่ได้)
      ↓ อาจารย์/แอดมินอนุมัติตาม flow
      ↓ บริษัทตอบรับ → 'สถานประกอบการตอบรับแล้ว' (อยู่ตรงนี้ได้แม้วันเลย)
      ↓ แอดมินรอบ 2: กำหนดวันทางการ + อัปโหลดหนังสือส่งตัว (uploadedAt)
      → 'อนุมัติแล้ว (รอออกฝึกงาน)' + แจ้งเตือน+อีเมลให้นักศึกษาโหลดหนังสือ
      ↓ auto-update เมื่อครบทุกเงื่อนไข:
        status whitelisted ✓ internship_start_date(แอดมิน) ✓
        letter uploadedAt ✓ DATE <= today(Asia/Bangkok) ✓
      → 'ออกฝึกงาน'
```

- `node --check` backend ผ่านทุกไฟล์, `npm run build` frontend ผ่าน
- *ยืนยันจาก code path + DB query จริง — #25 ถูก revert เรียบร้อย*

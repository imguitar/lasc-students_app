# Badge ชื่อย่อสาขาวิชาใน User Profile Dropdown — ดึง Dynamic จากฐานข้อมูล

**วันที่:** 2026-10-03

## ปัญหาเดิม

`getMajorLabel()` ใน `UserProfileMenu.jsx` มี fallback ท้ายสายเป็น **`return 'SE'`** — badge แสดง "SE" ตายตัวกับทุก user ที่ไม่เข้าเงื่อนไข keyword ไม่ว่าสาขาจริงจะเป็นอะไร

## Files Modified

### 1. `coop-backend/src/utils/helpers.js`

- เพิ่ม **`DEPARTMENT_SHORT_MAP`** (id → รหัสย่อ) + **`DEPARTMENT_NAME_TO_SHORT`** (ชื่อสาขา normalize → รหัสย่อ) + helper `normalizeDeptName` (ตัด `สาขาวิชา` + ช่องว่าง)
- **`toFrontendUser`** เพิ่มฟิลด์ **`major_short`** ใน user object — resolve 3 ทาง: `department_id` ตัวเลข → `DEPARTMENT_SHORT_MAP`, ชื่อสาขา → `DEPARTMENT_NAME_TO_SHORT`, และ `department_id` แบบ `'DEPT-n'` (คอลัมน์จริงใน `departments`) → parse n
- Export `DEPARTMENT_SHORT_MAP` / `DEPARTMENT_NAME_TO_SHORT`

แก้จุดเดียวครอบทุก endpoint: `POST /auth/login`, `GET /auth/me`, `POST /auth/sso`, `GET/POST/PUT /api/users` — ทุกตัวคืน `toFrontendUser`

### 2. `coop-frontend/src/components/UserProfileMenu.jsx`

- เพิ่ม `DEPARTMENT_SHORT_CODES` (module-level, mirror backend map) เป็น fallback สำหรับ session เก่าใน localStorage ที่ยังไม่มี `major_short`
- `getMajorLabel()` ลำดับใหม่:
  1. `u.major_short` (จาก backend โดยตรง)
  2. จับคู่ `major`/`department`/`department_name` กับ 12 ชื่อสาขา (normalize เทียบ)
  3. keyword fallback เดิม (ซอฟต์แวร์→SE, โลจิสติกส์→LE, คอมพิวเตอร์→CS)
  4. `department_code` — เฉพาะที่ไม่ใช่รูปแบบ `DEPT-n` (ค่า surrogate ไม่ใช่รหัสสาขา)
  5. **`''` — ไม่ hardcode 'SE' อีกต่อไป**
- Badge render เป็น conditional `{getMajorLabel(user) && ...}` — **ซ่อน badge เมื่อไม่มีข้อมูล** แทนการแสดงค่าผิด

## Data Source & Mapping

ข้อมูลสาขาเดินทาง: `profile.department_id` (VARCHAR `'DEPT-n'`) / `user.department` (ชื่อเต็มไทย) → `toFrontendUser` → `major_short` → `localStorage.user` → Badge

| department_id | สาขาวิชา | Badge |
|---|---|---|
| 1 | วิทยาการคอมพิวเตอร์ | `CS` |
| 2 | เทคโนโลยีคอมพิวเตอร์และดิจิทัล | `CT` |
| 3 | สาธารณสุขชุมชน | `PH` |
| 4 | วิทยาศาสตร์การกีฬา | `SS` |
| 5 | เทคโนโลยีการเกษตร | `AG` |
| 6 | เทคโนโลยีและนวัตกรรมอาหาร | `FT` |
| 7 | อาชีวอนามัยและความปลอดภัย | `OSH` |
| 8 | วิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์ | `SE` |
| 9 | วิศวกรรมโลจิสติกส์ | `LE` |
| 10 | วิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม | `IE` |
| 11 | การออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ | `PD` |
| 12 | เทคโนโลยีโยธาและสถาปัตยกรรม | `CA` |

*ตาราง `departments` ไม่มีคอลัมน์ชื่อย่อภาษาอังกฤษ (มีแค่ `department_id` = `DEPT-n`) — mapping จึงอยู่ที่ `helpers.js` เป็น single source แก้จุดเดียวทั้งระบบ*

## Verification

ทดสอบ `toFrontendUser` จริงด้วย Node:

| Input | `major_short` |
|---|---|
| `department: 'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์'` | `SE` ✓ |
| `department: 'สาขาวิชาวิศวกรรมโลจิสติกส์'` | `LE` ✓ |
| `department_id: 'DEPT-9'` (โลจิสติกส์) | `LE` ✓ |
| admin (ไม่มีสาขา) | `''` → badge ซ่อน ✓ |

- `node --check` backend ผ่าน, `npm run build` frontend ผ่าน
- **หมายเหตุ session เก่า:** user ที่ login ค้างไว้ใน localStorage จะใช้ fallback mapping ฝั่ง frontend ทันที (ไม่ต้อง re-login); ค่า `major_short` จะมาครบหลัง login รอบถัดไปหรือเมื่อ profile ถูก refresh ผ่าน API
- *ยืนยันจาก unit test + build — ยังไม่ได้ทดสอบบนเบราว์เซอร์จริง*

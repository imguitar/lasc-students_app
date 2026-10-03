# Polish Modal ประวัติรายงานประจำวัน — Layout Shift, Tooltip, Action Verification

**วันที่:** 3 ตุลาคม 2026
**สถานะ:** ✅ แก้ไข+ตรวจสอบเรียบร้อย — Build ผ่าน

---

## Files Modified

| ไฟล์ | การแก้ไข |
|---|---|
| `coop-frontend/src/components/AttendanceCalendar.jsx` | ปรับ min-height กล่อง detail + แก้ Tooltip placement |
| `coop-frontend/src/pages/Admin/Dashboard/AdminAttendanceOverviewPage.jsx` | กัน `Invalid Date` ในคอลัมน์เวลาเช็คของแท็บตาราง (+ `minHeight` DialogContent จากรอบก่อน) |

## UI Fixes Applied

### Layout Shift
- กล่อง "รายละเอียดวันที่..." ล็อก `minHeight: { sm: 175 }` + `flex column` + เนื้อหา `flex: 1` — คลิกสลับวันแล้วกรอบไม่ยืดหด
- Header row (วันที่ + chips + ปุ่มเซ็น): `minHeight: 40` + `alignItems: flex-start` — ป้าย `วันเริ่มต้นฝึกงาน` โผล่/หายไม่กระทบความสูง
- `DialogContent` มี `minHeight: { sm: 640 }` บน desktop ลดช่องว่างตอนยังไม่เลือกวัน

### Tooltip
```jsx
<Tooltip placement="top" disableInteractive enterDelay={200} arrow>
```
- เดิม MUI ใช้ `placement="bottom"` (default) → tooltip ลอยทับ**ช่องวันที่แถวถัดไป** ดูเหมือนหลุดตำแหน่ง — เปลี่ยนเป็น `top` ลอยเหนือช่องตัวเอง
- `disableInteractive` กัน tooltip ค้างเมื่อเมาส์เลื่อนเข้าไปโดน tooltip
- `enterDelay={200}` กัน tooltip เด้งรัวตอนเลื่อนเมาส์ผ่านหลายช่อง

### Scrollbar
- MUI `Dialog` มี `maxHeight: calc(100% - 64px)` เป็นค่าเริ่มต้น — modal พอดี viewport เสมอ, scrollbar ขึ้นเฉพาะเมื่อเนื้อหาล้นจริง ไม่มี scrollbar ด้านข้างผิดปกติ

## Functionality Verification

### ปุ่ม "ให้พี่เลี้ยงเซ็นรับรองวันนี้" ✅ (ตรวจจากโค้ด — flow ครบ)

```
กดปุ่ม → handleOpenSignModal(dateKey) → Dialog + SignatureCanvas
→ handleSubmitBatchSign → PATCH /api/checkins/batch-sign
   payload: { studentId, studentName, dates[], supervisorSignature, supervisorName, supervisorComment }
```

**Backend** (`checkinRoutes.js` ~line 91) ทำงานถูกต้อง:
- validate: ต้องมีลายเซ็น + ≥1 วัน → 400 พร้อมข้อความไทย
- **กรองวันก่อน `internship_start_date` ออกอัตโนมัติ** (query request ของนักศึกษา)
- UPDATE ถ้ามี checkin อยู่แล้ว / INSERT `present` + note "บันทึกและลงชื่อรับรองย้อนหลังโดยพี่เลี้ยง" ถ้าไม่มี (ON DUPLICATE KEY UPDATE)
- คืน `daily_checkins` ทั้งชุด → frontend `onBatchSign` อัปเดต modal + `loadCheckinData()` refresh หน้าหลัก

> หมายเหตุ: flow นี้ให้ admin/นักศึกษาเซ็นแทนพี่เลี้ยงผ่าน canvas ในหน้าเดียวกัน ไม่มี token link ให้พี่เลี้ยงเซ็นเอง — ถ้าต้องการ "คัดลอกลิงก์ให้พี่เลี้ยงเซ็นเอง" จริง เป็นฟีเจอร์ใหม่ต้องออกแบบ route สาธารณะเพิ่ม (เหมือน company-response token) — แจ้งได้ถ้าต้องการ

### แท็บ "ปฏิทิน / ตาราง" ✅
- `ToggleButtonGroup` สลับ `modalViewMode` — guard `if (nextView)` กันค่า null ตอนกดแท็บเดิมซ้ำ
- ตารางใช้ `sortedDetailEntries` เรียงวันที่ใหม่→เก่า แสดงครบ: วันที่ / สถานะ (chip สี) / กิจกรรม (fallback `work_experience`→`workExperience`→`note`→`-`) / ลายเซ็นรูป / เวลาเช็ค
- แก้เพิ่ม: `entry.createdAt` ว่าง → แสดง `-` แทน `Invalid Date`
- Empty state: "ไม่มีข้อมูลรายงานประจำวัน" colSpan 5 ถูก

## Build

```
npm run build → ✓ built in 2.05s
```

## ขั้นทดสอบบนหน้าเว็บ

1. `/coop/admin-dashboard/attendance-overview` → เปิด modal นักศึกษา → คลิกสลับหลายวัน → กรอบนิ่ง
2. Hover ช่องวันที่ → tooltip ลอย**เหนือ**ช่องตัวเอง ไม่ทับแถวล่าง
3. เลือกวันที่มี checkin → กด "ให้พี่เลี้ยงเซ็นรับรองวันนี้" → วาดลายเซ็น → ยืนยัน → toast สำเร็จ + ช่องวันมีจุดลายเซ็น + ตารางโชว์รูปลายเซ็น
4. กดแท็บ "ตาราง" → เห็นรายการย้อนหลังเรียงวันล่าสุดก่อน

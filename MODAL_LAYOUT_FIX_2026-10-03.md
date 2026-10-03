# แก้ไข Layout Shift — Modal ประวัติรายงานประจำวันยืดหดตอนคลิกสลับวันที่

**วันที่:** 3 ตุลาคม 2026
**สถานะ:** ✅ แก้ไขเรียบร้อย — Build ผ่าน

---

## Files Modified

| ไฟล์ | การแก้ไข |
|---|---|
| `coop-frontend/src/components/AttendanceCalendar.jsx` | ล็อก min-height + flex layout ของกล่อง "รายละเอียดวันที่..." และ header row ของมัน |
| `coop-frontend/src/pages/Admin/Dashboard/AdminAttendanceOverviewPage.jsx` | กำหนด `minHeight` ให้ `DialogContent` ของ Modal บนหน้าจอ desktop |

## CSS / Layout Rules Applied

### 1. กล่องรายละเอียดด้านล่าง (AttendanceCalendar.jsx ~line 803)

```jsx
sx={{
  minHeight: { xs: 0, sm: 200 },   // พื้นที่ขั้นต่ำคงที่ — ไม่หดตามเนื้อหา
  display: 'flex',
  flexDirection: 'column',
}}
```

- **Header row** (วันที่ + Chips + ปุ่มเซ็นรับรอง): `minHeight: { sm: 40 }` + `alignItems: 'flex-start'` — ไม่ว่าป้าย `วันเริ่มต้นฝึกงาน` จะโผล่หรือไม่ แถว header กินพื้นที่เท่าเดิม
- **บล็อกเนื้อหา** (ประสบการณ์/หมายเหตุ/ลายเซ็น): `flex: 1` + `alignContent: 'start'` — ดูดซับพื้นที่ว่างที่เหลือ ทำให้กล่องรวมไม่หดเมื่อเนื้อหาสั้น ข้อความยาวก็ดันลงตามปกติโดยไม่กระทบ baseline
- **Empty state** (ไม่มีบันทึกเช็คชื่อ): `flex: 1` เช่นกัน — วันที่ไม่มีข้อมูลกินพื้นที่เท่าวันที่มีข้อมูล

### 2. Modal โดยรวม (AdminAttendanceOverviewPage.jsx line 548)

```jsx
<DialogContent sx={{ p: { xs: 1, sm: 2 }, minHeight: { sm: 640 } }}>
```

- บน desktop Modal มีความสูงขั้นต่ำคงที่ — ตอนเปิดครั้งแรก (ยังไม่เลือกวัน) กับหลังเลือกวันไม่กระโดดมาก
- มือถือ (`xs`) ไม่บังคับความสูง — layout ยืดหยุ่นตามหน้าจอ

### 3. ตารางปฏิทิน — นิ่งอยู่แล้ว (ไม่ต้องแก้)

- Grid สร้าง **42 ช่องเสมอ** (6 แถวเต็ม รวม padding เดือนก่อน/หลัง) — ความสูงปฏิทินคงที่โดยโครงสร้าง
- แต่ละช่อง `minHeight: { sm: 70 }` + `aspectRatio` บนมือถือ — ขนาดไม่ยืดตามเนื้อหา

## ผลกระทบข้ามหน้า

`AttendanceCalendar` เป็น shared component ใช้ 3 จุด — ได้ fix พร้อมกันทั้งหมด:
- Admin: `/coop/admin-dashboard/attendance-overview` (Modal ที่รายงาน)
- Advisor: `AdvisorProgressCheckPage`
- Student: `StudentCheckInPage`

## Visual Verification

- `npm run build` → ✓ built in 1.84s
- **ทดสอบบนหน้าเว็บ:** เปิด `/coop/admin-dashboard/attendance-overview` → กดดูประวัตินักศึกษา → คลิกสลับระหว่างวันที่มีข้อมูลมาก (เช่น วันเริ่มฝึก + มีลายเซ็น) กับวันที่ไม่มีบันทึก → กรอบ Modal, ตารางปฏิทิน และกล่องรายละเอียดต้อง**นิ่งสนิท** ไม่ยืดหด — มีผลเฉพาะเนื้อหาด้านในกล่องที่เปลี่ยน
- เหลือช่องว่างด้านล่างข้อความสั้นในกล่องรายละเอียด (ตั้งใจ — พื้นที่สำรองกัน shift) ลายเซ็นพี่เลี้ยงยังแสดงปกติ

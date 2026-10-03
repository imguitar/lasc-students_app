# แก้ไข Layout Shift Modal ประวัติรายงานประจำวัน — Fixed Height + Stable Scrollbar

**วันที่:** 3 ตุลาคม 2026
**สถานะ:** ✅ แก้ไขเรียบร้อย — Build ผ่าน

---

## Root Cause (จากวิดีโอ)

การแก้รอบก่อนใช้ `minHeight` เท่านั้น — ยังมีช่องโหว่ 2 จุด:

1. **วันที่เนื้อหาเกิน min-height** (ข้อความยาว + ป้าย "วันเริ่มต้นฝึกงาน" + รูปลายเซ็น ~90px + ชื่อพี่เลี้ยง + ความคิดเห็น) → กล่องยังยืดตามจริง → Modal สูงเปลี่ยนทุกครั้ง
2. **Scrollbar เด้งเข้า-ออก** → ความกว้าง content เปลี่ยน ~15px ทุกครั้งที่ scrollbar โผล่/หาย → ตารางปฏิทินขยับด้านข้าง (visual jitter ที่เห็น)
3. **กล่อง detail ปรากฏเฉพาะตอนเลือกวัน** → คลิกครั้งแรก Modal โตขึ้นกะทันหัน

## Files Modified

| ไฟล์ | การแก้ไข |
|---|---|
| `coop-frontend/src/components/AttendanceCalendar.jsx` | กล่อง detail → **fixed height** + scroll ภายใน + render ตลอดพร้อม placeholder |
| `coop-frontend/src/pages/Admin/Dashboard/AdminAttendanceOverviewPage.jsx` | `DialogContent` → **fixed height** + `scrollbarGutter: 'stable'` |

## CSS / Layout Solutions

### 1. Detail Container — Fixed Height (AttendanceCalendar.jsx)

```jsx
height: { xs: 'auto', sm: 220 },
overflowY: { xs: 'visible', sm: 'auto' },
flexShrink: 0,
display: 'flex', flexDirection: 'column',
```

- **สูงตายตัว 220px บน desktop เสมอ** — วันไหนเนื้อหาเกินก็ scroll **ภายในกล่อง** แทนที่จะดัน Modal
- `flexShrink: 0` — ไม่ให้ flex parent บีบกล่องนี้
- มือถือ (`xs`) ยัง auto — จอเล็ก scroll หน้าอยู่แล้ว ไม่กระทบ

### 2. Render ตลอด + Placeholder (กันกระโดดตอนคลิกแรก)

```
{!isBatchMode && <Paper fixed>        // กล่องแสดงเสมอ (เดิมแสดงเฉพาะ selectedDay)
  {!selectedDay ? "คลิกเลือกวันที่..."  // placeholder กลางกล่อง
               : <เนื้อหาเดิมทั้งหมด>}
</Paper>}
```

→ Modal มีความสูงคงที่ตั้งแต่เปิด ไม่มี "เติบโตครั้งแรก"

### 3. Modal — Fixed Height + Stable Scrollbar (DialogContent)

```jsx
height: { sm: 720 },
scrollbarGutter: 'stable',
```

- `height: 720` คงที่ (MUI ยัง cap ที่ `calc(100% - 64px)` บนจอเตี้ย) → โครง Modal ไม่เคยยืดหด
- `scrollbar-gutter: stable` → **จองพื้นที่ scrollbar ถาวร** แม้เนื้อหาไม่ล้น — ความกว้าง content ไม่เปลี่ยนอีกต่อไป

### 4. ส่วนที่นิ่งอยู่แล้ว (ไม่ต้องแก้)

- **ปฏิทิน:** grid 42 ช่องเสมอ + ช่องละ `minHeight: 70` + `aspectRatio` มือถือ — ไม่ยืดตามเนื้อหา
- **Tooltip:** MUI Tooltip render ผ่าน Popper/Portal (absolute ที่ body) — ไม่กระทบ document flow ของตารางอยู่แล้ว + `placement="top"` + `disableInteractive` จากรอบก่อน

## Verification

- `npm run build` → ✓ built in 1.83s
- **ทดสอบบนหน้าเว็บ:** `/coop/admin-dashboard/attendance-overview` → เปิด modal → คลิกต่อเนื่อง 24 → 25 → 28 → 29 → 30
  - Modal + ปฏิทิน **นิ่ง 100%** — เฉพาะเนื้อหาในกล่อง detail เปลี่ยน
  - วันที่เนื้อหายาว → scroll **ภายในกล่อง 220px** (ไม่ดัน modal)
  - Scrollbar จองที่ถาวร — ความกว้างไม่สั่น
- หมายเหตุ: fix ครอบคลุม `AdvisorProgressCheckPage` + `StudentCheckInPage` (shared component)

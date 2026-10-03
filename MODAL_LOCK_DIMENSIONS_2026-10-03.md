# ล็อกขนาด Modal ประวัติรายงานประจำวันคงที่ 100% (Fixed Dimensions)

**วันที่:** 3 ตุลาคม 2026
**สถานะ:** ✅ แก้ไขเรียบร้อย — Build ผ่าน

---

## Root Cause (รอบนี้)

ล็อกความสูง content ไปแล้ว แต่**กรอบ Modal เองไม่ได้ล็อกความกว้าง**:

```jsx
// เดิม — บั๊กตัวจริง
width: { xs: 'calc(100% - 16px)', sm: 'auto' }
```

`width: 'auto'` บน desktop ทับ `fullWidth` ของ MUI Dialog → Paper **ย่อขนาดตามเนื้อหา (intrinsic sizing)** → เมื่อกล่อง detail มี chips/ข้อความกว้างต่างกัน กรอบกว้างเปลี่ยนตาม → ปฏิทิน (grid `repeat(7,1fr)`) คำนวณความกว้างช่องใหม่ทุกครั้ง → **กระตุกทั้งแนวนอนและดูเหมือนแนวตั้ง**

## Files Modified

| ไฟล์ | ตำแหน่ง | การแก้ไข |
|---|---|---|
| `AdminAttendanceOverviewPage.jsx` | `Dialog > PaperProps` | `width: { sm: 'auto' }` → **`width: { sm: 720 }` ตายตัว** + `height: { sm: 780 }` + `maxHeight: 'calc(100% - 32px)'` + `display:'flex', flexDirection:'column', overflow:'hidden'` |
| 同上 | `DialogTitle` | `flexShrink: 0` — header ไม่ขยับ |
| 同上 | `DialogContent` | `height:720` → `flex: 1, minHeight: 0` (เติมเต็มระหว่าง header/footer ในกรอบ fixed) + `overflowY:'auto'` + `scrollbarGutter:'stable'` |
| 同上 | `DialogActions` | `flexShrink: 0` — footer ไม่ขยับ |
| `AttendanceCalendar.jsx` | Detail Paper (จากรอบก่อน) | `height: { sm: 220 }` fixed + `overflowY:'auto'` ภายใน + render ตลอดพร้อม placeholder |

## CSS / Dimension Settings

### กรอบ Modal (Paper)
| Property | ค่า | ผล |
|---|---|---|
| `width` | `{ xs: 'calc(100% - 16px)', sm: 720 }` | กว้างตายตัว 720px บน desktop — ไม่ย่อตามเนื้อหาอีก |
| `height` | `{ sm: 780 }` + `maxHeight: calc(100% - 32px)` | สูงคงที่ 780px (cap จอเตี้ย) |
| `display` | `flex / column` + `overflow: hidden` | โครง rigid — เนื้อหาไม่ดันกรอบ |

### Flex ภายใน (Rigid Structure)
- **Header** `DialogTitle`: `flexShrink: 0` — คงที่
- **Body** `DialogContent`: `flex: 1` เติมเต็มที่เหลือ + `scrollbarGutter: 'stable'` — จองร่อง scrollbar ถาวร ไม่ให้ความกว้างสั่นตอน scroll โผล่/หาย
- **Footer** `DialogActions`: `flexShrink: 0` — คงที่

### ปฏิทิน (คงที่ตามกรอบ 720px)
- Grid `repeat(7, 1fr)` บนความกว้างคงที่ → **ขนาดช่องคงที่ทุกช่องโดยนิยาม** — ไม่มี `1fr` บนความกว้างผันแปรอีก
- ช่องละ `minHeight: 70` (sm) / `aspectRatio 1:1` (xs)

### Detail Box
- `height: 220` fixed + `overflowY: auto` ภายใน — วันไหน chips เยอะ/ข้อความยาวก็ scroll ในกล่อง ไม่ดัน layout
- Render ตลอดพร้อม placeholder — ไม่มีกระโดดตอนคลิกแรก

### Tooltip
- MUI Tooltip → Popper portal (absolute นอก document flow) + `placement="top"` + `disableInteractive` + `enterDelay 200` — ไม่ดัน grid อยู่แล้ว

## Verification

- `npm run build` → ✓ built in 1.91s
- **ทดสอบบนหน้าเว็บ:** เปิด modal → คลิกสลับวันที่ 24 ↔ 25 ↔ 28–30 ต่อเนื่อง
  - กรอบ Modal **720×780 px คงที่ทุกพิกเซล** — ไม่ขยาย/หดทั้งสองแกน
  - ช่องปฏิทินขนาดคงที่ (container 720px นิ่ง → cell นิ่ง)
  - เนื้อหาล้น → scroll ภายใน `DialogContent` / ภายในกล่อง detail เท่านั้น
  - Scrollbar gutter จองถาวร → ไม่มี width jitter จาก scrollbar

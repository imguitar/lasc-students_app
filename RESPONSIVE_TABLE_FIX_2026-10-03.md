# Fix Report — Responsive Table หน้า /coop/admin-dashboard/requests

วันที่: 2026-10-03 | ไฟล์: `coop-frontend/src/pages/Admin/Dashboard/AllRequestsOverviewPage.jsx`

---

## Files Modified

| ไฟล์ | เปลี่ยนแปลง |
| :--- | :--- |
| `AllRequestsOverviewPage.jsx` | โครงสร้างตาราง desktop (`hidden md:block`) ทั้งบล็อก — จอ <768px ใช้ mobile card view เดิมอยู่แล้ว |

---

## Key Layout Adjustments

### 1. Full Width + Scroll Container
- ตรวจสอบแล้ว container เป็น `w-full` อยู่แล้ว (ไม่มี max-w-* จำกัด) — เปลี่ยนที่สำคัญ: `overflow-hidden` → **`overflow-x-auto`** ทำให้ตารางเลื่อนแนวนอนได้แทนที่จะบีบจนคอลัมน์ขวาตกจอ
- ตาราง: `table-auto` + **`min-w-[860px]`** — ไม่บีบโครงสร้างต่ำกว่านี้ เลื่อนเอา

### 2. Data Consolidation (7 คอลัมน์ → 6 คอลัมน์)
- **รวม รหัสนักศึกษา + ชื่อ-นามสกุล** เป็นคอลัมน์เดียว "นักศึกษา":
  - บน: `font-medium text-slate-800` (ชื่อ)
  - ล่าง: `text-xs text-slate-500 font-mono` (รหัส)
- **สาขา:** `max-w-[160px] truncate` + `title` tooltip — ชื่อสาขายาวไม่ดันคอลัมน์อื่น

### 3. Sticky Action Columns (สถานะ + จัดการ)
- `จัดการ`: `sticky right-0 w-[68px]` — ปุ่ม ⋮ มองเห็นตลอดแม้เลื่อนตาราง
- `สถานะ`: `sticky right-[68px]` + `shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.08)]` — badge สถานะลอยอยู่ข้างปุ่มจัดการ
- พื้นหลัง sticky: `bg-white` (td) / `bg-slate-50` (th) + `group-hover:bg-slate-50` ให้ hover แถวยังเนียน

### 4. Compact Typography & Padding
- `py-3 px-4` → **`px-3 py-2.5`**
- `text-[0.8125rem]` → **`text-xs sm:text-sm`** (เล็กบนจอแคบ ใหญ่ขึ้นเมื่อมีที่)

---

## Visual Verification (1024px – 1280px / Split Screen)

| ช่วงจอ | พฤติกรรม |
| :--- | :--- |
| ≥1280px | ตารางเต็ม 6 คอลัมน์ ไม่ต้อง scroll — เหมือนเดิมแต่กระชับกว่า |
| 1024–1280px | ตารางอาจ scroll เล็กน้อย — **สถานะ+จัดการ sticky ขวา เห็นตลอด**, สาขา truncate ไม่ดัน layout |
| 768–1024px (split screen) | scroll แนวนอนได้ — คอลัมน์สำคัญขวาไม่หาย, รหัสอยู่ใต้ชื่อประหยัดแนวนอน |
| <768px | ใช้ mobile card view เดิม (ไม่ได้แตะ) |

`npm run build` ✅ ผ่าน (1.88s)

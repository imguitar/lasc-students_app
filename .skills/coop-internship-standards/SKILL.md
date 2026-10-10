---
name: coop-internship-standards
description: Global design system utilizing MUI (Material-UI) button/interactive components customized with Clean Violet (#7C3AED) palette, strict Zero-Emoji policy (Lucide icons only), and zero horizontal scroll standard.
---

# LASC SSKRU Internship Platform - Agent Skill & Standards

This specification dictates all frontend and backend conventions for the Cooperative Education / Internship Management Platform (Faculty of Liberal Arts and Sciences, Sisaket Rajabhat University).

---

## 1. TECH STACK & SYSTEM ARCHITECTURE
- **Frontend:** React (Vite), Material-UI (`@mui/x-date-pickers`), Tailwind CSS, Lucide React (`lucide-react`).
- **Backend:** Node.js, Express REST API, Prisma ORM, MySQL.
- **Date Handling:** Standard CE (`YYYY-MM-DD`) for storage/APIs; Buddhist Era (2569+) for display strings.

---

## 2. STRICT UI/UX & STYLING RULES

### A. Strict Icon Policy (NO EMOJIS ALLOWED)
- **Zero-Emoji Rule:** ห้ามใช้ Emoji (เช่น 📅, 📄, 👤, 🏢, ⚠️, 🟢, ✕, 👁️) ในข้อความ, Label, Tooltip, ปุ่ม หรือ Badge เด็ดขาด
- **SVG / Lucide Icons Only:** ให้ใช้ Icon Component จากไลบรารี `lucide-react` เท่านั้น เช่น:
  - วันที่/ปฏิทิน: `<Calendar className="w-4 h-4" />`
  - เอกสาร: `<FileText className="w-4 h-4" />`
  - ผู้ใช้งาน/นักศึกษา: `<User className="w-4 h-4" />`
  - สถานประกอบการ: `<Building2 className="w-4 h-4" />`
  - สำเร็จ/อนุมัติ: `<CheckCircle2 className="w-4 h-4 text-emerald-600" />`
  - แจ้งเตือน/รอตรวจสอบ: `<AlertCircle className="w-4 h-4 text-amber-500" />`
  - ปิด/ยกเลิก/ปฏิเสธ: `<X className="w-4 h-4" />`
  - อัปโหลดไฟล์: `<UploadCloud className="w-4 h-4" />`
  - เมนูตัวเลือก: `<MoreVertical className="w-4 h-4" />`

### B. Mobile-First & No Horizontal Scroll Rule (MANDATORY)
- **Viewport `< 768px`:** ห้ามมี `overflow-x-auto` หรือตารางที่ต้องเลื่อนแนวนอน
- หน้าตารางทั้งหมดต้องสลับมุมมอง:
  - Desktop (`hidden md:block`): แสดงตาราง `<table>` ตามปกติ
  - Mobile (`block md:hidden`): แสดงผลเป็นการ์ดแนวตั้ง (Card Stack) เต็มความกว้างหน้าจอ:
    - Container: `bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3 mb-3.5`
    - กล่องข้อมูล Metadata: `bg-slate-50 rounded-xl p-3 text-xs space-y-1.5`
    - ปุ่ม Action ด้านล่าง: ขยายเต็มความกว้างและสูงอย่างน้อย 44px (`w-full h-11 rounded-xl text-xs font-medium`) แตะง่าย

### C. Color Palette & Button Guidelines (Clean Violet Theme)
- **Primary Brand:** Violet `#7C3AED` (`bg-violet-600` hover `bg-violet-700` text-white)
- **Canvas & Surface:** พื้นหลังเว็บ `bg-slate-50`, พื้นหลังการ์ด `bg-white`, ขอบ `border-slate-200`
- **ปุ่มอนุมัติ / ยืนยัน (Approve/Confirm):** 
  - สไตล์ Soft Emerald: `bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 rounded-xl h-11 px-4 text-xs font-semibold`
  - หรือ Solid Violet: `bg-violet-600 text-white hover:bg-violet-700 rounded-xl h-11 px-4 text-xs font-semibold`
- **ปุ่มปฏิเสธ / ตีกลับ (Reject/Return):**
  - สไตล์ Subtle Rose Outline: `bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl h-11 px-4 text-xs font-medium`
- **ปุ่มทั่วไป / ยกเลิก (Secondary/Cancel):**
  - สไตล์ Neutral Slate Outline: `bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl h-11 px-4 text-xs font-medium`
- **Action Menus & Popups:** ใช้ Portal Dropdown / Floating UI ผูกกับ document body พร้อม auto-placement กันเมนูโดนตัดใน container

### D. MUI THEME & BUTTON SYSTEM (MANDATORY)

ระบบใช้ Material-UI (`@mui/material`) เป็นมาตรฐานของปุ่มและแท็บทั้งหมด โดยต้องหุ้มหรือตั้งค่า Custom Theme Palette ให้ตรงกับ Clean Violet **ห้ามใช้ปุ่มดิบที่ไม่ได้มาตรฐานหรือผิดไปจาก Palette เด็ดขาด**

#### Theme Palette Configuration
```typescript
// Theme setup for MUI (@mui/material/styles)
primary: {
  main: '#7C3AED',       // Violet-600
  light: '#EDE9FE',      // Violet-100
  dark: '#6D28D9',       // Violet-700
  contrastText: '#FFFFFF',
},
secondary: {
  main: '#64748B',       // Slate-500
  light: '#F1F5F9',      // Slate-100
  dark: '#334155',       // Slate-700
}
```

---

## 3. STRICT TABLE & ACTION BAR CONVENTIONS (MANDATORY)

### A. ปุ่ม Action สามจุดแบบไร้กรอบ (Ghost 3-Dots Style Only)
- ทุกตารางในระบบที่มีคอลัมน์ `จัดการ` หรือ `ACTION` **ต้องใช้ปุ่ม 3 จุดแนวตั้งสไตล์ Ghost Minimalist เท่านั้น**
- **ข้อห้ามเด็ดขาด:**
  - ห้ามใส่กรอบสี่เหลี่ยมครอบปุ่ม (`border-none`)
  - ห้ามใส่พื้นหลังทึบหรือสีขาวในสถานะปกติ
  - ห้ามใส่เงา (`shadow-none`)
- **โค้ดมาตรฐาน MUI `IconButton` + lucide `MoreVertical`:**
  ```tsx
  <IconButton
    size="small"
    aria-label="จัดการ"
    title="จัดการ"
    onClick={(e) => {
      e.stopPropagation();
      handleOpenMenu(e, item);
    }}
    sx={{
      p: 0.75,
      color: '#94a3b8',
      '&:hover': { bgcolor: 'rgba(241,245,249,0.8)', color: '#475569' },
      '&:active': { bgcolor: 'rgba(226,232,240,0.6)' },
    }}
  >
    <MoreVertical className="w-4 h-4" />
  </IconButton>
  ```
- เมนูที่เปิดออกมาให้ใช้ **floating/portal dropdown** (คำนวณตำแหน่งจากปุ่ม ปิดเมื่อคลิกนอก/scroll) ไม่ใช่เมนูที่ถูก clipping โดย `overflow` ของ container
- ตารางห้ามมี horizontal scrollbar — ปรับสัดส่วนคอลัมน์ให้พอดี container เสมอ (มือถือ `< 768px` ใช้ card view ตามกฎ Mobile-First เดิม)

---

## 4. STRICT MULTI-DEVICE RESPONSIVE LAYOUT STANDARDS (MANDATORY)

ทุกการสร้างหรือปรับแต่งหน้าจอ (UI Modification) ตัว Agent ต้องทดสอบและรับประกันการแสดงผลบน 3 กลุ่มอุปกรณ์หลักเสมอ:
1. **Desktop / Laptop (≥ 1024px):** จอใหญ่ มี Sidebar ด้านข้าง
2. **Tablet / iPad (768px – 1023px):** จอแนวตั้ง/แนวนอน พื้นที่กลางจำกัด
3. **Mobile Phone (< 768px, เช่น iPhone 390px):** จอสัมผัสขนาดเล็ก

### A. กฎการแปลงตารางบนมือถือ (Strict Table-to-Card Transformation)
- **ห้ามฝืนแสดงแท็ก `<table>` บนจอขนาดเล็กกว่า 768px เด็ดขาด** — ตารางบนมือถือทำตัวอักษรแตกแถวแนวตั้งและข้อมูลพังทันที
- **Pattern บังคับใช้:**
  ```tsx
  {/* 1. Desktop & iPad Table View */}
  <div className="hidden md:block w-full overflow-hidden">
    <table className="w-full table-fixed ...">
      {/* หัวตารางและแถวข้อมูลปกติ */}
    </table>
  </div>

  {/* 2. Mobile Card Stack View */}
  <div className="block md:hidden space-y-3">
    {data.map((item) => (
      <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        {/* หัวการ์ด: ข้อมูลหลัก + Action 3 จุด */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">{item.title}</p>
            <p className="text-xs text-slate-500">{item.subtitle}</p>
          </div>
          <IconButton size="small" onClick={...}>
            <MoreVertical className="w-4 h-4 text-slate-400" />
          </IconButton>
        </div>

        {/* เนื้อหาการ์ด: รายละเอียดสำคัญจัดบรรทัดเรียบร้อย */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
          <div>...</div>
          <div>...</div>
        </div>

        {/* ปุ่มหลักท้ายการ์ด (Full-Width Touch Target) */}
        <Button
          fullWidth
          variant="contained"
          onClick={...}
          sx={{ minHeight: '44px', borderRadius: '12px', textTransform: 'none' }}
        >
          {item.actionLabel}
        </Button>
      </div>
    ))}
  </div>
  ```

### B. กฎการจัดระยะและการตัดคำ (Typography & Overflow Policy)
1. **ห้ามใช้พิกเซลฟิกซ์ความกว้างขนาดใหญ่:** ห้ามใช้ `w-[600px]` หรือข้อความแถวยาวโดยไม่มีการควบคุม
2. **การตัดคำบนจอแคบ:** ใช้ `break-words` ร่วมกับ `line-clamp-2` เพื่อป้องกันข้อความดันโครงสร้างหน้าจอจนบิดเบี้ยว
3. **ขนาดพื้นที่สัมผัส (Touch Targets):**
   - ปุ่มกดสำหรับมือถือ ต้องมีความสูงไม่น้อยกว่า `44px` (`minHeight: '44px'` หรือ `h-11`)
   - ปุ่มไอคอน ต้องมี Padding รอบตัวอย่างน้อย `8px` (`size="small"` บน MUI)

---

## 5. CORE BUSINESS LOGIC

### A. Daily Reports & Attendance (/checkins)
- Student-centric overview grouped by student พร้อม aggregated progress + check-in summary
- ปุ่ม "ดูสมุดบันทึก" เปิด calendar view (ใช้ `AttendanceCalendar` ตัวกลาง) ไฮไลต์ present / late / absent / holiday
- รองรับสถานะ `holiday`: auto-flag วันหยุดนักขัตฤกษ์ (`THAI_PUBLIC_HOLIDAYS` ใน `utils/thaiHolidays.js`), bypass validation เนื้องานและลายเซ็นพี่เลี้ยง, ไม่นับเป็นวันขาด

### B. Relocation Workflow (คำร้องขอย้ายแหล่งฝึก)
- อนุญาตหลายรอบการย้ายตลอดการฝึกงาน ตราบใดที่คำร้องก่อนหน้าจบ (completed/rejected) แล้ว — เก็บประวัติเดิมไว้เสมอ ไม่ overwrite
- Advisor dashboard action menu ต้องมี "พิจารณาคำร้องขอย้ายที่ฝึกงาน" เมื่อมีคำร้องรอพิจารณา → deep-link `/advisor-dashboard/relocations?focus={id}` auto-open review dialog
- หลังอาจารย์พิจารณาแล้ว badge/ปุ่มเปลี่ยนเป็นสถานะผล (อนุมัติ→เขียว / ตีกลับ→แดง) ปุ่มพิจารณาหาย เหลือปุ่มดูผลแบบ read-only
- การแนบเอกสารคำร้องเป็น optional ฝั่งนักศึกษา; มี dropzone แนบไฟล์เสริมในหน้าตอบรับของสถานประกอบการ

---

## 6. DEVELOPMENT ROADMAP
- Phase 1: Mobile-First Foundation & Table Conversion.
- Phase 2: Attendance, Calendar & Thai Holidays Integration.
- Phase 3: Multi-Relocation Workflow & Advisor/Admin Approvals.
- Phase 4: Document Generation & Security Finalization.

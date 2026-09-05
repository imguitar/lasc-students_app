# Professional Internship Frontend

เว็บแอปพลิเคชันระบบบริหารจัดการการฝึกงานนักศึกษา (Professional Internship Management System) พัฒนาด้วย **React + Vite + Material UI + Tailwind CSS** รองรับการทำงานแบบ Multi-role สำหรับ **นักศึกษา (Student)**, **อาจารย์ที่ปรึกษา (Advisor)**, **ผู้ดูแลระบบ (Admin)** และ **สถานประกอบการ (Company/Public)**

---

## 🌟 จุดเด่นของระบบ (Highlights)

- 🎨 **Modern & Premium UI**: ออกแบบด้วย Material UI (MUI v5/v6) ผสาน Tailwind CSS รองรับ Dark/Light theme และ Responsive ทุกขนาดหน้าจอ
- 🔄 **Multi-Role Dynamic Dashboard**: เมนูและหน้าควบคุมจะปรับเปลี่ยนตามบทบาทของผู้ใช้งานอัตโนมัติ
- 📋 **End-to-End Lifecycle Tracking**: ระบบติดตามขั้นตอนคำร้องฝึกงานแบบเรียลไทม์ (Process Tracker)
- 📝 **Public Evaluation Portal**: สถานประกอบการสามารถประเมินผลนักศึกษาผ่านลิงก์เฉพาะโดยไม่ต้องสร้างบัญชี
- 🕒 **Daily Check-in & Work Log**: ระบบลงเวลาเข้าฝึกงานและบันทึกรายงานการปฏิบัติงานรายวัน
- 📊 **Interactive Analytics**: กราฟแสดงสถิติผลการประเมินและอัตราการรับเข้าทำงานแยกตามสาขาวิชา

---

## 📁 โครงสร้างโฟลเดอร์โปรเจกต์ (Project Structure)

```text
Professional-Internship-Frontend/
├── src/
│   ├── assets/               # รูปภาพ, ไอคอน, โลโก้มหาวิทยาลัย
│   ├── components/           # Reusable UI Components (Sidebar, Navbar, ProcessTracker, Modals)
│   ├── pages/
│   │   ├── Home/             # หน้าแรกและข่าวประชาสัมพันธ์
│   │   │   └── HomePage.jsx
│   │   ├── LoginPage.jsx     # หน้าเข้าสู่ระบบ
│   │   │
│   │   ├── Student/          # ส่วนของนักศึกษา
│   │   │   ├── NewRequestPage.jsx       # ยื่นคำร้องขอฝึกงานใหม่
│   │   │   └── Dashboard/
│   │   │       ├── DashboardPage.jsx     # หน้าแดชบอร์ดนักศึกษา
│   │   │       ├── ProfilePage.jsx       # ข้อมูลโปรไฟล์นักศึกษา
│   │   │       ├── MyRequestsPage.jsx    # ประวัติคำร้องของฉัน
│   │   │       ├── StudentCheckInPage.jsx# บันทึกเวลาเข้างานรายวัน
│   │   │       └── PaymentProofPage.jsx  # อัปโหลดหลักฐานชำระเงิน
│   │   │
│   │   ├── Advisor/          # ส่วนของอาจารย์ที่ปรึกษา
│   │   │   ├── AdvisorDashboardPage.jsx    # แดชบอร์ดคำร้องนักศึกษาในความดูแล
│   │   │   ├── AdvisorStudentListPage.jsx  # รายชื่อนักศึกษาในสาขา
│   │   │   ├── AdvisorSupervisionPage.jsx  # วางแผนและนัดหมายวันนิเทศงาน
│   │   │   ├── AdvisorEvaluationPage.jsx   # แบบประเมินการนิเทศงาน
│   │   │   └── AdvisorProgressCheckPage.jsx# ติดตามการเช็คชื่อของนักศึกษา
│   │   │
│   │   ├── Admin/            # ส่วนของผู้ดูแลระบบ
│   │   │   ├── Dashboard/
│   │   │   │   ├── AdminDashboardPage.jsx           # แดชบอร์ดภาพรวมคณะ
│   │   │   │   ├── StudentListPage.jsx              # จัดการคำร้องและออกหนังสือส่งตัว
│   │   │   │   ├── AdminUserManagementPage.jsx      # จัดการผู้ใช้และโปรไฟล์
│   │   │   │   ├── AdminAttendanceOverviewPage.jsx  # ภาพรวมสถิติการเช็คชื่อ
│   │   │   │   ├── AdminCheckInPage.jsx             # ตารางเช็คชื่อรายวัน
│   │   │   │   ├── AdminReportsPage.jsx             # สถิติและผลการประเมิน
│   │   │   │   ├── AdminAnnouncementsPage.jsx       # จัดการข่าวสารและประกาศ
│   │   │   │   └── AdminProfilePage.jsx             # ข้อมูลโปรไฟล์แอดมิน
│   │   │   └── Shared/
│   │   │       ├── RequestDetailsPage.jsx           # รายละเอียดคำร้อง
│   │   │       └── StudentDetailsPage.jsx           # รายละเอียดประวัตินักศึกษา
│   │   │
│   │   └── Public/           # ส่วนสำหรับบุคคลทั่วไปและสถานประกอบการ
│   │       ├── PublicEvaluationPage.jsx   # แบบประเมินนักศึกษาสำหรับบริษัท
│   │       ├── PublicRequestPage.jsx      # หน้าตอบรับการฝึกงานของสถานประกอบการ
│   │       └── AnnouncementDetailPage.jsx # รายละเอียดข่าวสาร
│   │
│   ├── utils/                # apiFetch, auth helpers, formatters
│   ├── App.jsx               # การจัดการ Route ทั้งหมด
│   └── main.jsx              # Entry Point
│
├── index.html
├── package.json
└── vite.config.js
```

---

## ⚙️ ความต้องการของระบบ (Prerequisites)

- **Node.js**: v18 LTS ขึ้นไป (แนะนำ Node.js v20 หรือ v22)
- **npm**: v9+ หรือ **pnpm** / **yarn**

---

## 🚀 การติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables
สร้างไฟล์ `.env` ที่โฟลเดอร์หลัก:
```env
VITE_API_BASE_URL=https://students.sci-sskru.com/coop/api
```

### 3. รันโหมดพัฒนา (Development Mode)
```bash
npm run dev
```
เว็บแอปจะพร้อมใช้งานที่ `http://localhost:5173`

### 4. การ Build สำหรับ Production
```bash
# Build ไฟล์
npm run build

# พรีวิว Production Build ในเครื่อง
npm run preview
```

---

## 🌐 การ Deploy บน Railway / Vercel / Netlify

### การตั้งค่า Environment Variable บน Cloud
กำหนดตัวแปรในหน้า Dashboard ของโฮสติ้งก่อนทำการ Build:
```env
VITE_API_BASE_URL=https://students.sci-sskru.com/coop/api
```

> ⚠️ **ข้อสำคัญ**: Vite จะฝังค่า `VITE_API_BASE_URL` ลงในโค้ด JavaScript ในขั้นตอน `npm run build` จึงต้องตั้งค่านี้บน Server ให้ถูกต้องก่อนเริ่ม Deploy

---

## 🔑 บัญชีสำหรับทดสอบระบบ (Test Accounts)

| บทบาท (Role) | Username | Password | ความสามารถ |
|---|---|---|---|
| **Student** | `student6501` | `student123` | ยื่นคำร้อง, เช็คชื่อประจำวัน, อัปโหลดสลิป |
| **Advisor** | `advisor01` | `advisor123` | อนุมัติคำร้อง, นัดหมายนิเทศ, ประเมินการนิเทศ |
| **Admin** | `admin` | `admin123` | จัดการผู้ใช้, ออกหนังสือส่งตัว, อนุมัติสลิป, ดู Analytics |

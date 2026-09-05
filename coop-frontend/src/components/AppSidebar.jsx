import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  UserIcon,
  ArrowLeftOnRectangleIcon,
  AcademicCapIcon,
  UsersIcon,
  DocumentTextIcon,
  MegaphoneIcon,
  IdentificationIcon,
  CheckCircleIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';

const MENU_CONFIG = {
  student: {
    title: 'นักศึกษา',
    items: [
      { path: '/dashboard', label: 'หน้าหลัก', icon: HomeIcon },
      { path: '/dashboard/new-request', label: 'ยื่นคำร้องใหม่', icon: DocumentPlusIcon },
      { path: '/dashboard/my-requests', label: 'คำร้องของฉัน', icon: ClipboardDocumentListIcon },
      { path: '/dashboard/payment-proof', label: 'หลักฐานการชำระออกฝึก', icon: CurrencyDollarIcon },
      { path: '/dashboard/check-in', label: 'รายงานประจำวัน', icon: CalendarDaysIcon },
      { path: '/dashboard/profile', label: 'โปรไฟล์', icon: UserIcon },
    ],
  },
  advisor: {
    title: 'อาจารย์ที่ปรึกษา',
    items: [
      { path: '/advisor-dashboard', label: 'หน้าหลัก', icon: HomeIcon },
      { path: '/advisor-dashboard/students', label: 'รายชื่อนักศึกษาฝึกงาน', icon: AcademicCapIcon },
      { path: '/advisor-dashboard/supervision', label: 'ตารางนิเทศงาน', icon: CalendarDaysIcon },
      { path: '/advisor-dashboard/progress', label: 'เช็ค Progress', icon: CheckCircleIcon },
    ],
  },
  admin: {
    title: 'ผู้ดูแลระบบ',
    items: [
      { path: '/admin-dashboard', label: 'หน้าหลัก', icon: HomeIcon },
      { path: '/admin-dashboard/students', label: 'นักศึกษา', icon: AcademicCapIcon },
      { path: '/admin-dashboard/users', label: 'จัดการผู้ใช้', icon: UsersIcon },
      { path: '/admin-dashboard/companies', label: 'สถานประกอบการ', icon: BuildingOffice2Icon },
      { path: '/admin-dashboard/checkins', label: 'รายงานประจำวัน', icon: CalendarDaysIcon },
      { path: '/admin-dashboard/attendance-overview', label: 'ภาพรวมรายบุคคล', icon: UserIcon },
      { path: '/admin-dashboard/reports', label: 'รายงาน', icon: DocumentTextIcon },
      { path: '/admin-dashboard/announcements', label: 'ข่าวประชาสัมพันธ์', icon: MegaphoneIcon },
      { path: '/admin-dashboard/profile', label: 'โปรไฟล์', icon: IdentificationIcon },
    ],
  },
};

const getDetectedRole = () => {
  const savedRole = localStorage.getItem('userRole') || localStorage.getItem('role');
  if (savedRole === 'advisor' || savedRole === 'teacher') return 'advisor';
  if (savedRole === 'admin') return 'admin';
  return 'student';
};

const AppSidebar = ({
  role,
  isMenuOpen = false,
  setIsMenuOpen = () => {},
  currentPath,
  handleLogout,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeRole = role || getDetectedRole();
  const roleConfig = MENU_CONFIG[activeRole] || MENU_CONFIG.student;
  const activePath = currentPath || location.pathname;

  const onLogout = (e) => {
    if (typeof handleLogout === 'function') {
      handleLogout(e);
      return;
    }
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMenuOpen(false)}
      ></div>
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div
          className="sidebar-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <h2 style={{ margin: 0 }}>{roleConfig.title}</h2>
        </div>
        <nav className="sidebar-nav">
          {roleConfig.items.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <Icon style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button
            onClick={onLogout}
            className="logout-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <ArrowLeftOnRectangleIcon
              style={{ width: 20, height: 20, flexShrink: 0, strokeWidth: 2 }}
            />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;

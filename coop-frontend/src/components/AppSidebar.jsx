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
      { path: '/advisor-dashboard/profile', label: 'โปรไฟล์', icon: IdentificationIcon },
    ],
  },
  admin: {
    title: 'ผู้ดูแลระบบ',
    items: [
      { path: '/admin-dashboard', label: 'หน้าหลัก', icon: HomeIcon },
      { path: '/admin-dashboard/students', label: 'นักศึกษา', icon: AcademicCapIcon },
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
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('request-logout-confirm'));
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMenuOpen(false)}
      ></div>
      <aside
        className={`sidebar ${isMenuOpen ? 'open' : ''} w-[260px] min-w-[260px] bg-white border-r border-slate-100 flex flex-col`}
        style={{ width: '260px', minWidth: '260px' }}
      >
        <div
          className="sidebar-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem 1rem',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <h2 className="font-extrabold text-slate-900 tracking-tight text-base" style={{ margin: 0 }}>
            {roleConfig.title}
          </h2>
        </div>
        <nav className="sidebar-nav" style={{ flex: 1, padding: '0.75rem 0.625rem', overflowY: 'auto' }}>
          {roleConfig.items.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item flex items-center justify-between px-3.5 py-2.5 my-0.5 rounded-xl transition-all duration-200 text-sm ${
                  isActive
                    ? 'bg-purple-50 text-purple-600 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
                style={{
                  textDecoration: 'none',
                  backgroundColor: isActive ? '#faf5ff' : undefined,
                  color: isActive ? '#7c3aed' : undefined,
                  padding: '10px 14px',
                }}
                onClick={() => setIsMenuOpen(false)}
              >
                <div
                  className="flex items-center gap-3 min-w-0"
                  style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <Icon
                    style={{ width: 18, height: 18, flexShrink: 0, strokeWidth: 2 }}
                    className={isActive ? 'text-purple-600 shrink-0' : 'text-slate-400 shrink-0'}
                  />
                  <span className="whitespace-nowrap text-sm" style={{ whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                </div>
                {isActive && (
                  <span
                    className="active-dot shrink-0 ml-2"
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '9999px',
                      backgroundColor: '#7c3aed',
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer" style={{ padding: '1rem 0.75rem', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={onLogout}
            className="logout-btn flex items-center gap-2 justify-center w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors text-sm font-medium border border-transparent hover:border-rose-100 cursor-pointer"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '0.625rem 1rem',
              borderRadius: '0.75rem',
            }}
          >
            <ArrowLeftOnRectangleIcon
              style={{ width: 18, height: 18, flexShrink: 0, strokeWidth: 2 }}
            />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;

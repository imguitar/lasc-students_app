import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  FilePlus2,
  ClipboardList,
  Banknote,
  CalendarDays,
  UserRound,
  GraduationCap,
  RefreshCw,
  CheckCircle2,
  Building2,
  FileText,
  LayoutTemplate,
  Bell,
  CalendarRange,
} from 'lucide-react';
import MobileNavDrawer from './MobileNavDrawer';
import UtilityBar from './UtilityBar';
import SubNav from './SubNav';
import MobileTabBar from './MobileTabBar';
import {
  HomeIcon,
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  UserIcon,
  ArrowLeftOnRectangleIcon,
  AcademicCapIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  HomeModernIcon,
  IdentificationIcon,
  CheckCircleIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';

const MENU_CONFIG = {
  student: {
    title: 'นักศึกษา',
    chip: 'LASC SSKRU',
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
    chip: 'LASC SSKRU',
    items: [
      { path: '/advisor-dashboard', label: 'หน้าหลัก', icon: HomeIcon },
      { path: '/advisor-dashboard/students', label: 'รายชื่อนักศึกษาฝึกงาน', icon: AcademicCapIcon },
      { path: '/advisor-dashboard/supervision', label: 'ตารางนิเทศงาน', icon: CalendarDaysIcon },
      { path: '/advisor-dashboard/relocations', label: 'คำร้องย้ายที่ฝึกงาน', icon: ArrowPathIcon },
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
      { path: '/admin-dashboard/checkins', label: 'รายงานและการเข้าฝึกงาน', icon: CalendarDaysIcon },
      { path: '/admin-dashboard/reports', label: 'รายงาน', icon: DocumentTextIcon },
      { path: '/admin-dashboard/relocations', label: 'คำร้องย้ายที่ฝึกงาน', icon: ArrowPathIcon },
      { path: '/admin-dashboard/home-editor', label: 'จัดการหน้าแรก', icon: HomeModernIcon },
      { path: '/admin-dashboard/schedules', label: 'จัดการกำหนดการ', icon: CalendarRange },
      { path: '/admin-dashboard/profile', label: 'โปรไฟล์', icon: IdentificationIcon },
    ],
  },
};

// ไอคอน Lucide สำหรับ Drawer เต็มจอบนมือถือ (เมนู Desktop ยังใช้ชุดเดิมด้านบน)
const MOBILE_ICONS = {
  '/dashboard': Home,
  '/dashboard/new-request': FilePlus2,
  '/dashboard/my-requests': ClipboardList,
  '/dashboard/payment-proof': Banknote,
  '/dashboard/check-in': CalendarDays,
  '/dashboard/profile': UserRound,
  '/advisor-dashboard': Home,
  '/advisor-dashboard/students': GraduationCap,
  '/advisor-dashboard/supervision': CalendarDays,
  '/advisor-dashboard/relocations': RefreshCw,
  '/advisor-dashboard/progress': CheckCircle2,
  '/advisor-dashboard/profile': UserRound,
  '/admin-dashboard': Home,
  '/admin-dashboard/students': GraduationCap,
  '/admin-dashboard/companies': Building2,
  '/admin-dashboard/checkins': CalendarDays,
  '/admin-dashboard/reports': FileText,
  '/admin-dashboard/relocations': RefreshCw,
  '/admin-dashboard/home-editor': LayoutTemplate,
  '/admin-dashboard/profile': UserRound,
  '/admin-dashboard/schedules': CalendarRange,
};

// ป้ายสั้นบนแถบล่างมือถือ (ไม่ตัดคำ) — เมนูอื่นใช้ชื่อเต็มจาก MENU_CONFIG
const MOBILE_TAB_LABELS = {
  '/admin-dashboard': 'หน้าหลัก',
  '/admin-dashboard/students': 'นักศึกษา',
  '/admin-dashboard/checkins': 'การเข้าฝึกงาน',
  '/admin-dashboard/schedules': 'กำหนดการ',
};

// เมนูหลัก 4 รายการที่แสดงบน Mobile Tab Bar (ที่เหลืออยู่ในปุ่ม "เมนู")
const TAB_PATHS = {
  student: ['/dashboard', '/dashboard/new-request', '/dashboard/my-requests', '/dashboard/check-in'],
  advisor: ['/advisor-dashboard', '/advisor-dashboard/students', '/advisor-dashboard/supervision', '/advisor-dashboard/relocations'],
  admin: ['/admin-dashboard', '/admin-dashboard/students', '/admin-dashboard/checkins', '/admin-dashboard/schedules'],
};

const NOTIFICATION_PATHS = {
  student: '/dashboard/notifications',
  admin: '/admin-dashboard/notifications',
};

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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
    setIsMenuOpen(false);
    window.dispatchEvent(new CustomEvent('request-logout-confirm'));
  };

  // อ่านข้อมูลผู้ใช้ใหม่ทุกครั้งที่เปิด Drawer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const drawerUser = useMemo(() => readStoredUser(), [isMenuOpen]);

  const drawerSubline =
    activeRole === 'student'
      ? (drawerUser?.studentId || drawerUser?.student_id || drawerUser?.username || '')
      : (drawerUser?.department || drawerUser?.major || '');

  const drawerItems = [
    ...roleConfig.items.map((item) => ({
      key: item.path,
      label: item.label,
      Icon: MOBILE_ICONS[item.path] || Home,
      to: item.path,
      active: activePath === item.path,
    })),
    ...(NOTIFICATION_PATHS[activeRole]
      ? [{
          key: 'notifications',
          label: 'การแจ้งเตือน',
          Icon: Bell,
          to: NOTIFICATION_PATHS[activeRole],
          active: activePath === NOTIFICATION_PATHS[activeRole],
        }]
      : []),
  ];

  const tabItems = (TAB_PATHS[activeRole] || [])
    .map((path) => roleConfig.items.find((item) => item.path === path))
    .filter(Boolean)
    .map((item) => ({
      key: item.path,
      label: MOBILE_TAB_LABELS[item.path] || item.label,
      Icon: MOBILE_ICONS[item.path] || Home,
      to: item.path,
      active: activePath === item.path,
    }));
  const menuActive = !tabItems.some((item) => item.active);

  return (
    <>
      <UtilityBar variant="fixed" />
      <SubNav variant="fixed" />
      <MobileTabBar items={tabItems} onOpenMenu={() => setIsMenuOpen(true)} menuActive={menuActive} />
      {/* Drawer เต็มจอ — แสดงเฉพาะจอเล็ก (< 1024px) ควบคุมด้วย CSS ใน index.css */}
      <MobileNavDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        user={drawerUser}
        roleLabel={roleConfig.title}
        subline={drawerSubline}
        items={drawerItems}
        onLogout={onLogout}
      />

      <div
        className={`sidebar-overlay ${isMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMenuOpen(false)}
      ></div>
      <aside
        className={`sidebar ${isMenuOpen ? 'open' : ''} w-[260px] min-w-[260px] bg-white border-r border-slate-100 flex flex-col`}
        style={{ width: '260px', minWidth: '260px' }}
      >
        <div className="sidebar-header">
          <div className="sidebar-role">
            <h2 className="sidebar-role-title">{roleConfig.title}</h2>
          </div>
          {roleConfig.chip && <span className="sidebar-role-chip">{roleConfig.chip}</span>}
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
                    ? 'is-active bg-purple-50 text-purple-600 font-semibold shadow-xs'
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
            data-skip-logout-confirm="1"
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

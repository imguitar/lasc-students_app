import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Home as HomeLucide, LayoutDashboard, Newspaper, Search, LogIn } from 'lucide-react';
import logo from '../assets/LASC-SSKRU-1.png';
import MobileNavDrawer from './MobileNavDrawer';
import MobileTabBar from './MobileTabBar';
import NotificationBell from './NotificationBell';
import UserProfileMenu from './UserProfileMenu';
import { redirectToProfileLogin } from '../utils/sso';

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

/**
 * ส่วนหัวกลางของหน้าสาธารณะ (ข่าวสาร / ค้นหาสถานประกอบการ) ให้เหมือนหน้าหลัก:
 * Navbar เดียวกัน, Drawer เต็มจอจากขวาเมื่อจอ < 1024px, และ MobileTabBar ด้านล่าง
 */
const PublicSiteHeader = () => {
  const { pathname } = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const user = readUser();
  const role = String(user?.role || '').toLowerCase();

  const dashboardTo = role === 'admin'
    ? '/admin-dashboard'
    : (role === 'advisor' || role === 'teacher')
      ? '/advisor-dashboard'
      : '/dashboard';
  const roleLabel = role === 'admin' ? 'ผู้ดูแลระบบ'
    : (role === 'advisor' || role === 'teacher') ? 'อาจารย์ที่ปรึกษา'
      : user ? 'นักศึกษา' : '';

  const tabItems = [
    { key: 'home', label: 'หน้าหลัก', Icon: HomeLucide, to: '/', active: pathname === '/' },
    user
      ? { key: 'dashboard', label: 'แดชบอร์ด', Icon: LayoutDashboard, to: dashboardTo, active: false }
      : { key: 'login', label: 'เข้าสู่ระบบ', Icon: LogIn, to: '/login', active: false },
    { key: 'companies', label: 'ที่ฝึกงาน', Icon: Search, to: '/companies', active: pathname.startsWith('/companies') },
    { key: 'news', label: 'ข่าวสาร', Icon: Newspaper, to: '/news', active: pathname.startsWith('/news') },
  ];

  const drawerItems = [
    { key: 'home', label: 'หน้าหลัก', Icon: HomeLucide, to: '/' },
    ...(user ? [{ key: 'dashboard', label: 'แดชบอร์ด', Icon: LayoutDashboard, to: dashboardTo }] : []),
    { key: 'news', label: 'ข่าวสารและประกาศ', Icon: Newspaper, to: '/news' },
    { key: 'companies', label: 'ค้นหาที่ฝึกงาน', Icon: Search, to: '/companies' },
  ];

  return (
    <>
      <nav className="site-navbar sticky top-0 z-40">
        <div className="w-full px-3 sm:px-6 h-full flex items-center justify-between gap-3">
          <Link to="/" className="mobile-top-logo flex items-center min-w-0 flex-shrink gap-2 sm:gap-2.5 md:gap-3 no-underline">
            <img src={logo} alt="LASC Logo" className="w-7 h-7 min-[390px]:w-8 min-[390px]:h-8 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 object-contain shrink-0" />
            <span
              className="site-nav-title block font-extrabold text-white text-sm min-[390px]:text-base md:text-lg lg:text-xl leading-tight whitespace-nowrap tracking-tight"
              style={{ fontFamily: '"Prompt", "Kanit", "Inter", sans-serif' }}
            >
              ระบบฝึกประสบการณ์วิชาชีพ
            </span>
          </Link>

          {/* จอ < 1024px: เหลือปุ่มแฮมเบอร์เกอร์ */}
          <button
            type="button"
            className="site-hamburger lg:hidden shrink-0"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="เปิดเมนู"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            {!user ? (
              <button type="button" onClick={() => redirectToProfileLogin()} className="site-nav-cta rounded-xl text-xs font-bold px-5 py-2.5 text-white">
                เข้าสู่ระบบ
              </button>
            ) : (
              <>
                <Link to={dashboardTo} className="site-nav-cta rounded-xl text-xs font-bold px-5 py-2.5 text-white no-underline">
                  แดชบอร์ด
                </Link>
                <NotificationBell />
                <UserProfileMenu user={user} compact={true} />
              </>
            )}
          </div>
        </div>
      </nav>

      <MobileNavDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        roleLabel={roleLabel}
        subline={user && role === 'student' ? (user.studentId || user.student_id || user.username || '') : ''}
        items={drawerItems}
        onLogout={() => window.dispatchEvent(new CustomEvent('request-logout-confirm'))}
        onLogin={() => redirectToProfileLogin()}
      />

      <MobileTabBar items={tabItems} onOpenMenu={() => setIsDrawerOpen(true)} menuActive={isDrawerOpen} />
    </>
  );
};

export default PublicSiteHeader;

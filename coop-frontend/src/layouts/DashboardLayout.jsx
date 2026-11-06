import { useState, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import lascLogo from '../assets/LASC-SSKRU-1.png';
import AppSidebar from '../components/AppSidebar';
import UserProfileMenu from '../components/UserProfileMenu';
import NotificationBell from '../components/NotificationBell';
import DateTimeIndicator from '../components/DateTimeIndicator';
import asyncStorage from '../utils/asyncStorage';
import { Menu as MenuIcon } from 'lucide-react';
import '../pages/Admin/Dashboard/AdminDashboardPage.css';
import '../pages/Student/Dashboard/DashboardPage.css';

/** เลือกบทบาทจาก path ปัจจุบัน (ใช้ Layout ตัวเดียวสำหรับทุกบทบาท) */
const roleFromPath = (pathname) => {
  if (pathname.startsWith('/admin-dashboard')) return 'admin';
  if (pathname.startsWith('/advisor-dashboard')) return 'advisor';
  return 'student';
};

const DashboardLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const role = roleFromPath(location.pathname);

  const handleLogout = useCallback(async () => {
    await asyncStorage.removeItem('user');
    navigate('/');
  }, [navigate]);

  return (
    <div className={`${role === 'student' ? 'dashboard-container' : 'admin-dashboard-container'} bg-[#f8f9fc] min-h-screen`}>
      {/* Top Mobile & Desktop Navbar — Persistent across every role */}
      <div className="mobile-top-navbar flex w-full items-center justify-between px-3 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
          <button
            className="mobile-menu-btn shrink-0"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <Link to="/" className="mobile-top-logo flex items-center min-w-0 flex-shrink gap-2 sm:gap-2.5 md:gap-3 no-underline" aria-label="LASC Home">
            <img
              src={lascLogo}
              alt="LASC Logo"
              className="w-7 h-7 min-[390px]:w-8 min-[390px]:h-8 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 object-contain shrink-0"
            />
            <span
              className="text-sm min-[390px]:text-base md:text-lg lg:text-xl xl:text-[22px] 2xl:text-2xl font-extrabold text-white leading-tight whitespace-nowrap tracking-tight truncate"
              style={{ fontFamily: '"Prompt", "Kanit", "Inter", sans-serif' }}
            >
              ระบบฝึกประสบการณ์วิชาชีพ
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <DateTimeIndicator />
          <NotificationBell />
          <UserProfileMenu />
        </div>
      </div>

      {/* Persistent Sidebar — Rendered once and never remounted on route changes */}
      <AppSidebar
        role={role}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath={location.pathname}
        handleLogout={handleLogout}
      />

      {/* Main Content Area via Router Outlet */}
      <Outlet />
    </div>
  );
};

export default DashboardLayout;


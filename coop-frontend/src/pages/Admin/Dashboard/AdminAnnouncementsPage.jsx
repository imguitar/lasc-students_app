import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import '../Dashboard/AdminDashboardPage.css';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';
import AnnouncementManager from '../../../components/admin/AnnouncementManager';
import { MegaphoneIcon } from '@heroicons/react/24/outline';

const AdminAnnouncementsPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/')); return; }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') { navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/')); return; }
  }, [navigate]);

  const handleLogout = () => { localStorage.removeItem('user'); navigate('/'); };

  return (
    <div className="admin-dashboard-container">
      <div className="mobile-top-navbar flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" style={{ width: 24, height: 24, display: "block" }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg></button>
          <Link to="/" className="mobile-top-logo flex items-center shrink-0" aria-label="LASC Home">
            <img src={lascLogo} alt="LASC Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
            <span className="hidden sm:inline text-base md:text-lg font-extrabold text-slate-900 tracking-tight whitespace-nowrap ml-2" style={{ fontFamily: '"Prompt", "Kanit", "Inter", sans-serif' }}>
              ระบบฝึกประสบการณ์วิชาชีพ
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <DateTimeIndicator />
          <NotificationBell />
          <UserProfileMenu />
        </div>
      </div>
      <AdminSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/admin-dashboard/announcements"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1 style={{display:'flex', alignItems:'center', gap:'8px'}}><MegaphoneIcon style={{width: 32, height: 32}} /> ข่าวประชาสัมพันธ์</h1>
            <p>จัดการข่าวสำหรับแสดงบนหน้าแรก เช่น บริษัท/โรงพยาบาลที่เปิดรับฝึกงาน</p>
          </div>
        </header>

        <AnnouncementManager />
      </main>
    </div>
  );
};

export default AdminAnnouncementsPage;

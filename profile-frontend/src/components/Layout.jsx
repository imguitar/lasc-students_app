import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { coopSsoService } from '../services';
import { Button } from '../components/ui/button';
import NotificationBell from './NotificationBell';
import DashboardFooter from './DashboardFooter';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FolderKanban,
  UserCircle,
  Briefcase,
  Building2,
  Building,
  ExternalLink,
  LogOut,
  Menu,
  X,
  User,
  ChevronRight,
  Megaphone,
  MessageSquare,
  ArrowUpCircle,
  ShieldCheck
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [openingCoop, setOpeningCoop] = React.useState(false);
  const [coopError, setCoopError] = React.useState('');

  // เปิดระบบศูนย์ฝึกโดยไม่ต้องล็อกอินใหม่ — ขอตั๋วอายุสั้นจาก backend ก่อนแล้วค่อยพาไป
  const handleOpenCoop = async () => {
    setCoopError('');
    setOpeningCoop(true);
    try {
      const url = await coopSsoService.openCoopSystem();
      setSidebarOpen(false);
      window.location.assign(url);
    } catch (error) {
      setCoopError(error.response?.data?.message || error.message || 'ไม่สามารถเปิดระบบศูนย์ฝึกได้');
    } finally {
      setOpeningCoop(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'advisor';

  const menuGroups = [
    {
      title: 'ภาพรวมระบบ',
      items: [
        { path: '/', label: 'แดชบอร์ด', icon: LayoutDashboard, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
      ]
    },
    {
      title: 'นักศึกษาและบุคลากร',
      items: [
        { path: '/students', label: isAdminOrStaff ? 'จัดการนักศึกษา' : 'ทำเนียบนักศึกษา', icon: Users, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
        { path: '/alumni', label: 'ทำเนียบศิษย์เก่า', icon: GraduationCap, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
        { path: '/advisors', label: 'ทำเนียบอาจารย์', icon: UserCircle, roles: ['admin', 'teacher', 'advisor', 'student'] },
      ]
    },
    {
      title: 'วิชาการและผลงาน',
      items: [
        { path: '/projects', label: 'จัดการโปรเจคจบ', icon: FolderKanban, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
        { path: '/portfolio', label: 'ผลงานนักศึกษา', icon: Briefcase, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
        { path: '/departments', label: 'ข้อมูลสาขาวิชา', icon: Building2, roles: ['admin', 'teacher', 'advisor'] },
      ]
    },
    {
      title: 'ข่าวสารและชุมชน',
      items: [
        { path: '/news-events', label: 'ข่าวสารและกิจกรรม', icon: Megaphone, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
        { path: '/chat-board', label: 'แชทสาขาวิชา', icon: MessageSquare, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
      ]
    },
    {
      title: 'ตั้งค่าและบริหารระบบ',
      items: [
        { path: '/user-management', label: 'จัดการผู้ใช้งาน', icon: ShieldCheck, roles: ['admin'] },
        { path: '/student-promotion', label: 'จัดการเลื่อนชั้นปี', icon: ArrowUpCircle, roles: ['admin'] },
        { path: '/profile', label: 'โปรไฟล์ของฉัน', icon: User, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
      ]
    }
  ];

  const visibleMenuGroups = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.roles.includes(user?.role))
    }))
    .filter(group => group.items.length > 0);

  // Get initials for profile avatar
  const getInitials = () => {
    if (!user) return 'U';
    const first = (user.profile?.firstname || user.firstName || user.username || '').charAt(0);
    const last = (user.profile?.lastname || user.lastName || '').charAt(0);
    return (first + last).toUpperCase() || 'U';
  };

  // ชื่อที่แสดงบน navbar — ไล่จากข้อมูลที่สมบูรณ์ที่สุดลงไป
  const userDisplayName =
    (user?.profile?.firstname
      ? `${user.profile.prefix ? user.profile.prefix + ' ' : ''}${user.profile.firstname} ${user.profile.lastname || ''}`.trim()
      : '')
    || (user?.firstName || user?.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '')
    || user?.name
    || user?.username
    || 'ผู้ใช้';

  const getRoleLabel = (role) => {
    // ประธานสาขามาจาก departments.department_head_id ฝั่ง backend
    if (user?.is_department_head) {
      return '👑 ประธานสาขา';
    }
    switch(role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'teacher':
      case 'advisor': return 'อาจารย์';
      case 'student': return 'นักศึกษา';
      case 'alumni': return 'ศิษย์เก่า';
      default: return 'ผู้ใช้';
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9fe]">
      {/* Navbar - Purple Theme like Coop System */}
      <nav className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-950 border-b-2 border-amber-400 shadow-md fixed w-full top-0 z-50 transition-all duration-300 text-white">
        <div className="px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden mr-2 sm:mr-3 p-1.5 sm:p-2 rounded-xl text-white hover:bg-white/15 bg-white/10 transition-colors shrink-0"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="flex items-center space-x-1.5 sm:space-x-2.5 min-w-0">
                <img src="/logo.png" alt="Logo" className="h-8 w-8 sm:h-9 sm:w-9 object-contain shrink-0" />
                <h1 className="text-sm sm:text-base md:text-lg font-extrabold text-white tracking-tight whitespace-nowrap" style={{ fontFamily: '"Prompt", "Kanit", "Inter", sans-serif' }}>
                  ระบบฐานข้อมูลนักศึกษา
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
              <NotificationBell dark={true} />
              <Link
                to="/profile"
                className="flex items-center space-x-2 sm:space-x-3 pr-0.5 sm:pr-3 sm:border-r border-white/20 hover:bg-white/10 p-1 sm:p-1.5 rounded-xl transition-colors cursor-pointer group"
                title="โปรไฟล์ของฉัน"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm group-hover:bg-white/30 transition-colors shrink-0">
                  {getInitials()}
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <div className="font-semibold text-sm text-white group-hover:text-amber-300 transition-colors">{userDisplayName}</div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-purple-950 shadow-xs mt-0.5">
                    {getRoleLabel(user?.role)}
                  </span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="w-8 h-8 sm:w-9 sm:h-9 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-all duration-200"
                title="ออกจากระบบ"
              >
                <LogOut size={18} className="sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar for mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-purple-950/20 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside
          className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-gradient-to-b from-[#3b0764] via-purple-950 to-[#2e1065] text-white border-r border-purple-900/60 transition-all duration-300 ease-in-out z-40 overflow-y-auto custom-scrollbar flex flex-col shadow-2xl md:shadow-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } w-64`}
        >
          <nav className="p-4 space-y-1.5 flex-1 pb-10">
            {/* User Profile Card for Mobile Drawer */}
            <Link
              to="/profile"
              onClick={() => setSidebarOpen(false)}
              className="flex md:hidden items-center space-x-3 p-3 mb-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 shadow-xs transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-purple-950 flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
                {getInitials()}
              </div>
              <div className="text-left leading-tight flex-1 min-w-0">
                <div className="font-bold text-sm text-white group-hover:text-amber-300 truncate transition-colors">
                  {userDisplayName}
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-purple-950 mt-1 shadow-xs">
                  {getRoleLabel(user?.role)}
                </span>
              </div>
              <ChevronRight size={16} className="text-purple-300 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>

            <div className="space-y-4">
              {visibleMenuGroups.map((group, groupIdx) => (
                <div
                  key={group.title}
                  className={groupIdx > 0 ? 'pt-3 border-t border-purple-800/60 space-y-1' : 'space-y-1'}
                >
                  <div className="px-3 pb-1 text-[11px] font-bold text-purple-300/70 uppercase tracking-wider">
                    {group.title}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative ${
                          isActive
                            ? 'bg-white/20 text-white font-bold shadow-xs border border-white/20'
                            : 'text-purple-100/80 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Icon
                          size={18}
                          className={`transition-transform duration-200 group-hover:scale-110 ${
                            isActive ? 'text-amber-300' : 'text-purple-300 group-hover:text-white'
                          }`}
                        />
                        <span className="text-sm">{item.label}</span>
                        {isActive && (
                          <span className="absolute right-4 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm animate-pulse" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* ข้ามไปยังระบบศูนย์ฝึก โดยใช้สิทธิ์เดิมที่ล็อกอินไว้แล้ว */}
            <div className="pt-3 mt-3 border-t border-purple-800/60">
              <div className="px-3 pb-2 text-[11px] font-bold text-purple-300/70 uppercase tracking-wider">
                ระบบอื่น
              </div>
              <button
                type="button"
                onClick={handleOpenCoop}
                disabled={openingCoop}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group text-purple-100/90 hover:text-white hover:bg-white/10 disabled:opacity-60 disabled:cursor-wait cursor-pointer"
              >
                <Building size={18} className="text-amber-300 group-hover:text-amber-200 transition-transform duration-200 group-hover:scale-110" />
                <span className="text-sm text-left flex-1 font-medium">
                  {openingCoop ? 'กำลังเปิดระบบ...' : 'ระบบศูนย์ฝึกประสบการณ์'}
                </span>
                <ExternalLink size={14} className="text-purple-300 group-hover:text-white" />
              </button>
              {coopError && (
                <p className="px-4 pt-1 text-xs text-rose-300">{coopError}</p>
              )}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main
          className={`flex-1 flex flex-col ${
            location.pathname.startsWith('/chat-board')
              ? 'p-0 sm:p-3 md:p-6 lg:p-8 h-[calc(100dvh-4rem)] overflow-hidden'
              : 'min-h-[calc(100vh-4rem)] overflow-y-auto'
          }`}
        >
          <div
            className={`flex-1 ${
              location.pathname.startsWith('/chat-board')
                ? 'w-full h-full flex flex-col'
                : 'p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6'
            }`}
          >
            <Outlet />
          </div>

          {(location.pathname === '/' || location.pathname === '/dashboard') && <DashboardFooter />}
        </main>
      </div>
    </div>
  );
};

export default Layout;

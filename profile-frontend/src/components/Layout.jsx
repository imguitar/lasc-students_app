import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { coopSsoService } from '../services';
import { Button } from '../components/ui/button';
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
  Megaphone
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

  const menuItems = [
    { path: '/', label: 'แดชบอร์ด', icon: LayoutDashboard, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
    { path: '/students', label: (user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'advisor') ? 'จัดการนักศึกษา' : 'ทำเนียบนักศึกษา', icon: Users, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
    { path: '/alumni', label: 'ทำเนียบศิษย์เก่า', icon: GraduationCap, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
    { path: '/projects', label: 'จัดการโปรเจคจบ', icon: FolderKanban, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
    { path: '/news-events', label: 'ข่าวสารและกิจกรรม', icon: Megaphone, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
    { path: '/advisors', label: 'ทำเนียบอาจารย์', icon: UserCircle, roles: ['admin', 'teacher', 'advisor', 'student'] },
    { path: '/portfolio', label: 'ผลงานนักศึกษา', icon: Briefcase, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
    { path: '/departments', label: 'ข้อมูลสาขาวิชา', icon: Building2, roles: ['admin', 'teacher', 'advisor'] },
    { path: '/profile', label: 'โปรไฟล์ของฉัน', icon: User, roles: ['admin', 'teacher', 'advisor', 'student', 'alumni'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

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
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-purple-100/50 fixed w-full top-0 z-50 transition-all duration-300">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden mr-3 p-2 rounded-lg text-purple-950 hover:text-purple-700 hover:bg-purple-100/50 transition-colors"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="flex items-center space-x-2">
                <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
                <h1 className="text-lg font-bold text-slate-900">
                  ระบบฐานข้อมูล<span className="text-purple-600 font-extrabold">นักศึกษา</span>
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                to="/profile"
                className="flex items-center space-x-2 sm:space-x-3 pr-1 sm:pr-3 sm:border-r border-gray-100 hover:bg-purple-50/50 p-1 sm:p-1.5 rounded-xl transition-colors cursor-pointer group"
                title="โปรไฟล์ของฉัน"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm shadow-sm group-hover:bg-purple-100 transition-colors shrink-0">
                  {getInitials()}
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <div className="font-semibold text-sm text-gray-800 group-hover:text-purple-700">{userDisplayName}</div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-100 mt-0.5">
                    {getRoleLabel(user?.role)}
                  </span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-purple-950 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                title="ออกจากระบบ"
              >
                <LogOut size={20} />
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
          className={`fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] bg-white/70 backdrop-blur-md border-r border-purple-100/40 transition-all duration-300 ease-in-out z-40 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } w-64`}
        >
          <nav className="p-4 space-y-1.5">
            {/* User Profile Card for Mobile Drawer */}
            <Link
              to="/profile"
              onClick={() => setSidebarOpen(false)}
              className="flex md:hidden items-center space-x-3 p-3 mb-3 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50/60 border border-purple-100/80 shadow-2xs hover:bg-purple-100/50 transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
                {getInitials()}
              </div>
              <div className="text-left leading-tight flex-1 min-w-0">
                <div className="font-bold text-sm text-gray-900 group-hover:text-purple-700 truncate">
                  {userDisplayName}
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-100 mt-1">
                  {getRoleLabel(user?.role)}
                </span>
              </div>
              <ChevronRight size={16} className="text-purple-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>

            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              เมนูหลัก
            </div>
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-purple-100/60 text-purple-800 font-semibold shadow-sm'
                      : 'text-purple-950/80 hover:text-purple-700 hover:bg-purple-100/30'
                  }`}
                >
                  <Icon size={18} className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-purple-700' : 'text-purple-950/60 group-hover:text-purple-700'}`} />
                  <span className="text-sm">{item.label}</span>
                  {isActive && (
                    <span className="absolute right-4 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm animate-pulse" />
                  )}
                </Link>
              );
            })}

            {/* ข้ามไปยังระบบศูนย์ฝึก โดยใช้สิทธิ์เดิมที่ล็อกอินไว้แล้ว */}
            <div className="pt-3 mt-3 border-t border-purple-100/60">
              <div className="px-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                ระบบอื่น
              </div>
              <button
                type="button"
                onClick={handleOpenCoop}
                disabled={openingCoop}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group text-purple-950/80 hover:text-purple-700 hover:bg-purple-100/30 disabled:opacity-60 disabled:cursor-wait"
              >
                <Building size={18} className="text-purple-950/60 group-hover:text-purple-700 transition-transform duration-200 group-hover:scale-110" />
                <span className="text-sm text-left flex-1">
                  {openingCoop ? 'กำลังเปิดระบบ...' : 'ระบบศูนย์ฝึกประสบการณ์'}
                </span>
                <ExternalLink size={14} className="text-purple-950/40 group-hover:text-purple-700" />
              </button>
              {coopError && (
                <p className="px-4 pt-1 text-xs text-rose-600">{coopError}</p>
              )}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8 min-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

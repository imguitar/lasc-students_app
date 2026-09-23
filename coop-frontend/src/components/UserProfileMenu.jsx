import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  User,
  LogOut,
  FileText,
  CalendarCheck,
  KeyRound,
} from 'lucide-react';
import { logout } from '../utils/sso';

const UserProfileMenu = ({ user: propUser, compact = false } = {}) => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [user, setUser] = useState(() => {
    if (propUser) return propUser;
    try {
      const rawUser = localStorage.getItem('user');
      return rawUser ? JSON.parse(rawUser) : null;
    } catch {
      return null;
    }
  });
  const [open, setOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    const handleExternalLogoutConfirm = () => {
      setOpen(false);
      setIsLogoutModalOpen(true);
    };
    window.addEventListener('request-logout-confirm', handleExternalLogoutConfirm);
    return () => window.removeEventListener('request-logout-confirm', handleExternalLogoutConfirm);
  }, []);

  useEffect(() => {
    if (propUser) {
      setUser(propUser);
    }
  }, [propUser]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleCloseOther = (e) => {
      if (e.detail !== 'profile') {
        setOpen(false);
      }
    };
    window.addEventListener('close-navbar-dropdown', handleCloseOther);
    return () => window.removeEventListener('close-navbar-dropdown', handleCloseOther);
  }, []);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        window.dispatchEvent(new CustomEvent('close-navbar-dropdown', { detail: 'profile' }));
      }
      return next;
    });
  };

  const handleLogoutClick = () => {
    setOpen(false);
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach((c) => {
          document.cookie = c
            .replace(/^ +/, '')
            .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
        });
      }
    } catch (e) {
      console.error('Error clearing storage on logout:', e);
    }
    logout();
  };

  const handleCancelLogout = () => {
    setIsLogoutModalOpen(false);
  };

  const getRoleLabel = (r) => {
    if (r === 'admin') return 'ผู้ดูแลระบบ';
    if (r === 'advisor' || r === 'teacher') return 'อาจารย์ที่ปรึกษา';
    return 'นักศึกษา';
  };

  const getMajorLabel = (u) => {
    if (u?.major_short) return u.major_short;
    if (u?.major?.toLowerCase().includes('software') || u?.major?.includes('ซอฟต์แวร์')) return 'SE';
    if (u?.major?.toLowerCase().includes('computer') || u?.major?.includes('คอมพิวเตอร์')) return 'CS';
    if (u?.department_code) return u.department_code;
    return 'SE';
  };

  const getProfileLink = () => {
    if (user?.role === 'admin') return '/admin-dashboard/profile';
    if (user?.role === 'student') return '/dashboard/profile';
    return null;
  };

  const profileLink = getProfileLink();
  const userRole = String(
    user?.role || localStorage.getItem('userRole') || localStorage.getItem('role') || 'student'
  ).toLowerCase();
  const isStudent = userRole === 'student';
  const displayName =
    user?.name ||
    user?.full_name ||
    (user?.profile?.firstname
      ? `${user.profile.firstname} ${user.profile.lastname || ''}`.trim()
      : '') ||
    user?.username ||
    'นายอภิชาติ กรมพันธ์';

  const studentId =
    user?.studentId ||
    user?.student_id ||
    user?.student_code ||
    user?.username ||
    '6610014111';

  // ตัวอักษร Avatar อิงตามตัวแรกของชื่อ เช่น "น" ตามรูปอ้างอิง 100%
  const avatarLetter = (
    user?.name?.trim()?.charAt(0) ||
    user?.profile?.firstname?.trim()?.charAt(0) ||
    user?.firstname?.trim()?.charAt(0) ||
    displayName?.trim()?.charAt(0) ||
    'น'
  );

  const handleMenuClick = (action) => {
    setOpen(false);
    if (action === 'my-requests') {
      navigate('/dashboard/my-requests');
    } else if (action === 'daily-reports') {
      navigate('/dashboard/daily-reports');
    } else if (action === 'profile') {
      if (profileLink) navigate(profileLink);
      else navigate('/dashboard/profile');
    } else if (action === 'password') {
      if (profileLink) navigate(`${profileLink}?action=password`);
      else navigate('/dashboard/profile?action=password');
    }
  };

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      {/* 2. ปุ่มแคปซูลโปรไฟล์ด้านนอก (Responsive Profile Trigger / Compact mode) */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="โปรไฟล์ผู้ใช้งาน"
        className={
          compact
            ? `h-9 w-9 rounded-full transition cursor-pointer focus:outline-none flex items-center justify-center p-0 border-none outline-none ${
                open ? 'ring-2 ring-violet-400 ring-offset-1' : 'hover:opacity-90'
              }`
            : `flex items-center rounded-full bg-white p-0.5 sm:py-1 sm:pl-1 sm:pr-3.5 shadow-xs transition cursor-pointer focus:outline-none ${
                open
                  ? 'border-2 border-violet-300'
                  : 'border border-slate-200 hover:border-slate-300'
              }`
        }
        style={
          compact
            ? { border: 'none', background: 'transparent', padding: 0 }
            : {
                borderColor: open ? '#c4b5fd' : '#e2e8f0',
                borderWidth: open ? '2px' : '1px',
                borderStyle: 'solid',
              }
        }
      >
        <div
          className={`${compact ? 'h-9 w-9 min-w-[36px] min-h-[36px]' : 'h-8 w-8 min-w-[32px] min-h-[32px]'} shrink-0 rounded-full text-white font-bold text-xs flex items-center justify-center shadow-xs`}
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #d946ef 50%, #ea580c 100%)' }}
        >
          {avatarLetter}
        </div>
        {!compact && (
          <>
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-700 ml-2 mr-1.5 max-w-[120px] truncate">
              {displayName}
            </span>
            {open ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400 hidden sm:inline-block shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline-block shrink-0" />
            )}
          </>
        )}
      </button>

      {/* 3. การ์ด Dropdown Menu เมนูโปรไฟล์ (เมื่อคลิกเปิด) */}
      {open && (
        <div
          className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-12.5 z-50 w-72 rounded-[24px] border border-slate-100 bg-white p-2.5 shadow-xl text-left"
          style={{ backgroundColor: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
        >
          {/* ข้อมูลส่วนหัว: Avatar squircle ฝั่งซ้าย และข้อมูลฝั่งขวา (flex-row) */}
          <div className="flex flex-row items-center gap-3 p-2 mb-1 text-left">
            <div
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-[16px] text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #d946ef 50%, #ea580c 100%)' }}
            >
              {avatarLetter}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-bold text-slate-900 leading-snug truncate">
                {displayName}
              </div>
              <div className="text-xs text-slate-500 font-normal mt-0.5">
                รหัส: {studentId}
              </div>
              <div className="flex flex-row items-center gap-1.5 mt-1.5">
                <span className="bg-violet-50 text-violet-600 border border-violet-200 rounded-lg text-[10px] font-bold px-2 py-0.5">
                  {getRoleLabel(user?.role)}
                </span>
                <span className="bg-white text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold px-2 py-0.5">
                  {getMajorLabel(user)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 my-1" />

          {/* รายการเมนูสำหรับระบบฝึกงาน */}
          <div className="space-y-0.5 py-0.5">
            {/* เมนูเฉพาะนักศึกษาเท่านั้น — ซ่อนสำหรับ admin / advisor / teacher */}
            {isStudent && (
              <>
                <button
                  type="button"
                  onClick={() => handleMenuClick('my-requests')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition cursor-pointer text-left border-0 bg-transparent outline-none"
                  style={{ border: 'none', background: 'transparent' }}
                >
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>คำร้องของฉัน</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMenuClick('daily-reports')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition cursor-pointer text-left border-0 bg-transparent outline-none"
                  style={{ border: 'none', background: 'transparent' }}
                >
                  <CalendarCheck className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>รายงานการฝึกงานประจำวัน</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => handleMenuClick('profile')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition cursor-pointer text-left border-0 bg-transparent outline-none"
              style={{ border: 'none', background: 'transparent' }}
            >
              <User className="w-4 h-4 text-slate-500 shrink-0" />
              <span>โปรไฟล์ส่วนตัว</span>
            </button>

            <button
              type="button"
              onClick={() => handleMenuClick('password')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition cursor-pointer text-left border-0 bg-transparent outline-none"
              style={{ border: 'none', background: 'transparent' }}
            >
              <KeyRound className="w-4 h-4 text-slate-500 shrink-0" />
              <span>เปลี่ยนรหัสผ่าน</span>
            </button>
          </div>

          {/* เส้นคั่นก่อนออกจากระบบ */}
          <div className="border-t border-slate-100 my-1.5" />

          {/* ปุ่มล่างสุด: "ออกจากระบบ (Log out)" */}
          <button
            type="button"
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer text-left border-0 bg-transparent outline-none"
            style={{ border: 'none', background: 'transparent' }}
          >
            <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
            <span>ออกจากระบบ (Log out)</span>
          </button>
        </div>
      )}

      {/* Logout Confirmation Dialog (ธีมโมเดิร์นคลีน ม่วง-ขาว / Rose) */}
      {isLogoutModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleCancelLogout}
        >
          <div
            className="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-slate-100 text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100/80 flex items-center justify-center text-rose-500">
              <LogOut className="w-6 h-6 stroke-[2]" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-800 m-0">ยืนยันการออกจากระบบ</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[240px] mt-1.5 mb-0 mx-auto">
                คุณต้องการออกจากระบบการฝึกประสบการณ์วิชาชีพใช่หรือไม่?
              </p>
            </div>

            <div className="flex w-full gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCancelLogout}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer bg-white outline-none"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer border-none outline-none"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileMenu;

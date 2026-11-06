import React from 'react';
import { Link } from 'react-router-dom';
import lascLogo from '../assets/LASC-SSKRU-1.png';
import NotificationBell from './NotificationBell';
import UserProfileMenu from './UserProfileMenu';
import DateTimeIndicator from './DateTimeIndicator';

const TopNavbar = ({ onToggleMenu, homeLink = '/', user }) => {
  return (
    <header className="mobile-top-navbar flex w-full items-center justify-between px-3 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
      {/* ฝั่งซ้าย: รวมปุ่ม Hamburger และ โลโก้ ให้อยู่ใน div เดียวกัน */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
        {onToggleMenu && (
          <button
            type="button"
            className="mobile-menu-btn shrink-0"
            onClick={onToggleMenu}
            aria-label="Toggle menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" style={{ width: 24, height: 24, display: 'block' }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
          </button>
        )}
        <Link to={homeLink} className="mobile-top-logo flex items-center min-w-0 flex-shrink gap-2 sm:gap-2.5 md:gap-3 no-underline" aria-label="LASC Home">
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

      {/* ฝั่งขวา: รวมปุ่มกระดิ่งและปุ่มโปรไฟล์ไว้ด้วยกัน */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <DateTimeIndicator />
        <NotificationBell />
        <UserProfileMenu user={user} />
      </div>
    </header>
  );
};

export default TopNavbar;

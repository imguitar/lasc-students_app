import React from 'react';
import { Link } from 'react-router-dom';
import lascLogo from '../assets/LASC-SSKRU-1.png';
import NotificationBell from './NotificationBell';
import UserProfileMenu from './UserProfileMenu';
import DateTimeIndicator from './DateTimeIndicator';

const TopNavbar = ({ onToggleMenu, homeLink = '/', user }) => {
  return (
    <header className="mobile-top-navbar flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
      {/* ฝั่งซ้าย: รวมปุ่ม Hamburger และ โลโก้ ให้อยู่ใน div เดียวกัน */}
      <div className="flex items-center gap-3">
        {onToggleMenu && (
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onToggleMenu}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        )}
        <Link to={homeLink} className="mobile-top-logo flex items-center shrink-0" aria-label="LASC Home">
          <img
            src={lascLogo}
            alt="LASC Logo"
            className="h-9 w-auto object-contain"
            style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
          />
        </Link>
      </div>

      {/* ฝั่งขวา: รวมปุ่มกระดิ่งและปุ่มโปรไฟล์ไว้ด้วยกัน */}
      <div className="flex items-center gap-2 sm:gap-3">
        <DateTimeIndicator />
        <NotificationBell />
        <UserProfileMenu user={user} />
      </div>
    </header>
  );
};

export default TopNavbar;

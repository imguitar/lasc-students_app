import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, LogOut, LogIn, Phone, Mail } from 'lucide-react';
import DateTimeIndicator from './DateTimeIndicator';
import FacebookIcon from './icons/FacebookIcon';
import { useContactInfo, normalizeFacebookHref } from '../utils/useContactInfo';

/**
 * Drawer เมนูเต็มจอสำหรับจอ < 1024px (เลื่อนเข้าจากขวา) — ใช้ร่วมกันทั้งหน้า Home และ Dashboard
 * ธีม Deep Violet + Gold Accent (สไตล์อยู่ใน index.css ส่วน .m-drawer)
 * items: [{ key, label, Icon, to?, active?, onClick? }]
 */
const MobileNavDrawer = ({ isOpen, onClose, user, roleLabel, subline, items, onLogout, onLogin }) => {
  const contact = useContactInfo();

  useEffect(() => {
    document.body.classList.toggle('m-drawer-open', Boolean(isOpen));
    return () => document.body.classList.remove('m-drawer-open');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const name =
    user?.name ||
    user?.full_name ||
    (user?.profile?.firstname ? `${user.profile.firstname} ${user.profile.lastname || ''}`.trim() : '') ||
    user?.username ||
    '';
  const initial = name.trim().charAt(0) || 'ผ';
  const facebookHref = normalizeFacebookHref(contact.facebook_url);

  return (
    <div
      className={`m-drawer ${isOpen ? 'open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="เมนูนำทาง"
      aria-hidden={!isOpen}
    >
      <div className="m-drawer-head flex items-center justify-between h-16 px-4 shrink-0">
        <span className="m-drawer-title text-base font-extrabold">เมนู</span>
        <button type="button" onClick={onClose} className="m-drawer-close" aria-label="ปิดเมนู">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4">
        {user && (
          <div className="m-drawer-card flex items-center gap-3 p-4 min-w-0">
            <div className="m-drawer-avatar w-12 h-12 min-w-[48px] text-lg flex items-center justify-center shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-sm font-bold truncate m-drawer-name">{name || 'ผู้ใช้งาน'}</p>
              {roleLabel && <span className="m-drawer-role inline-block mt-1 px-2.5 py-0.5 text-[11px] font-semibold">{roleLabel}</span>}
              {subline && <p className="m-0 mt-1 text-xs truncate m-drawer-sub">{subline}</p>}
            </div>
          </div>
        )}

        <div className={user ? 'mt-3' : ''}>
          <DateTimeIndicator className="w-full justify-center py-2" />
        </div>

        <nav className="mt-4 flex flex-col gap-2">
          {items.map((item) => {
            const { key, label, to, active, onClick } = item;
            const Icon = item.Icon;
            const className = `m-drawer-link ${active ? 'is-active' : ''} w-full flex items-center gap-3 min-h-[48px] px-4 no-underline text-sm min-w-0 text-left cursor-pointer`;
            return to ? (
              <Link key={key} to={to} onClick={onClose} className={className}>
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            ) : (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onClose();
                  if (onClick) onClick();
                }}
                className={className}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="m-drawer-card mt-5 p-4">
          <p className="m-0 mb-2 text-xs font-bold m-drawer-sub">ติดต่อคณะ</p>
          <div className="flex flex-col gap-2 text-sm min-w-0 m-drawer-contact">
            <span className="inline-flex items-center gap-2 min-w-0">
              <Phone className="w-4 h-4 shrink-0 m-drawer-gold" />
              <span className="truncate">{contact.phone || '02-XXX-XXXX'}</span>
            </span>
            <span className="inline-flex items-center gap-2 min-w-0">
              <Mail className="w-4 h-4 shrink-0 m-drawer-gold" />
              <span className="truncate">{contact.email || 'contact@example.com'}</span>
            </span>
            {facebookHref && (
              <a
                href={facebookHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 min-w-0 no-underline"
              >
                <FacebookIcon className="w-4 h-4 shrink-0 m-drawer-gold" />
                <span className="truncate">{contact.facebook_name || 'Facebook'}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="m-drawer-foot shrink-0 px-4 pt-3" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        {user ? (
          <button
            type="button"
            onClick={onLogout}
            data-skip-logout-confirm="1"
            className="m-drawer-logout w-full min-h-[48px] flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            ออกจากระบบ
          </button>
        ) : (
          <button
            type="button"
            onClick={onLogin}
            className="m-drawer-login w-full min-h-[48px] flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer"
          >
            <LogIn className="w-5 h-5" />
            เข้าสู่ระบบ
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileNavDrawer;

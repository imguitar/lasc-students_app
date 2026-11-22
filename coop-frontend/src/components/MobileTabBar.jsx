import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Mobile Tab Bar ด้านล่างจอ (< 1024px) ทดแทน Sidebar บนมือถือ/แท็บเล็ต ใช้ร่วมกันทุก role
 * items: [{ key, label, Icon, to, onClick, active }] — สูงสุด 5 ช่อง (ช่องสุดท้าย = โปรไฟล์) เมนูทั้งหมดเปิดจากปุ่มแฮมเบอร์เกอร์ที่ Top Navbar
 *
 * โครงสร้างความสูง: <nav> เผื่อเฉพาะ safe-area-inset-bottom, กล่องปุ่มสูงคงที่ h-14 (56px)
 * ห้ามใช้ transition-all กับ <nav> (fixed) และห้ามขยับตำแหน่งด้วย JS ตอน scroll (ทำให้ iOS Safari ดีด)
 */
const ITEM_CLASS =
  'flex flex-col items-center justify-center h-full w-full min-w-0 gap-0.5 px-1 no-underline border-none bg-transparent cursor-pointer transition-colors focus:outline-none';

const TabContent = ({ label, active, Icon: IconComponent }) => {
  const TabIcon = IconComponent;
  return (
    <>
      <span
        className={`flex items-center justify-center w-10 h-6 rounded-full transition-colors ${
          active
            ? 'bg-white/15 border border-amber-300/40 text-amber-300'
            : 'border border-transparent text-purple-200/80'
        }`}
      >
        <TabIcon className="w-4 h-4 stroke-[2]" aria-hidden="true" />
      </span>
      <span
        className={`text-[10px] leading-tight truncate max-w-full ${
          active ? 'font-bold text-amber-200' : 'font-medium text-purple-200/80'
        }`}
      >
        {label}
      </span>
    </>
  );
};

/* ลวดลายโปร่งแสง: เส้นโค้งแสงสีทอง + ประกายดาว (ไม่รับ pointer, ไม่บังตัวอักษร) */
const Sparkle = ({ x, y, r, fill }) => (
  <path
    d={`M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z`}
    fill={fill}
  />
);

const BarPattern = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
    viewBox="0 0 360 56"
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <linearGradient id="m-tabbar-curve" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#FDE047" stopOpacity="0" />
        <stop offset="0.5" stopColor="#FDE047" stopOpacity="0.9" />
        <stop offset="1" stopColor="#FDE047" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M-10 44 C 80 8, 170 60, 250 26 S 340 8, 372 20" fill="none" stroke="url(#m-tabbar-curve)" strokeWidth="1.2" />
    <path d="M-10 52 C 100 22, 200 58, 372 34" fill="none" stroke="url(#m-tabbar-curve)" strokeWidth="0.8" opacity="0.7" />
    <Sparkle x={36} y={14} r={3} fill="#FDE047" />
    <Sparkle x={118} y={42} r={2} fill="#E9D5FF" />
    <Sparkle x={204} y={12} r={2.5} fill="#E9D5FF" />
    <Sparkle x={282} y={44} r={3} fill="#FDE047" />
    <Sparkle x={338} y={16} r={2} fill="#E9D5FF" />
  </svg>
);

const MobileTabBar = ({ items = [] }) => (
  <nav
    aria-label="เมนูหลัก"
    className="m-tabbar fixed bottom-0 inset-x-0 z-[1070] lg:hidden overflow-hidden bg-[linear-gradient(90deg,#280546_0%,#4C1D95_50%,#3B0764_100%)] border-t border-amber-400/40 shadow-[0_-6px_18px_rgba(40,5,70,0.35)] pb-[env(safe-area-inset-bottom,0px)] transform-gpu will-change-transform select-none"
  >
    {/* เส้นแสงทองชิดขอบบน */}
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent_0%,#FDE047_50%,transparent_100%)] opacity-80"
    />
    <BarPattern />
    <div
      className="relative grid h-14 w-full items-center"
      style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const content = <TabContent Icon={item.Icon} label={item.label} active={item.active} />;
        const common = {
          className: ITEM_CLASS,
          'aria-current': item.active ? 'page' : undefined,
        };
        return item.onClick ? (
          <button key={item.key} type="button" onClick={item.onClick} {...common}>
            {content}
          </button>
        ) : (
          <Link key={item.key} to={item.to} {...common}>
            {content}
          </Link>
        );
      })}
    </div>
  </nav>
);

export default MobileTabBar;

import React from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';

/**
 * Mobile Tab Bar ด้านล่างจอ (< 1024px) ทดแทน Sidebar บนมือถือ/แท็บเล็ต
 * items: [{ key, label, Icon, to, active }] — แสดงสูงสุด 4 รายการหลัก + ปุ่ม "เมนู" เปิด Drawer เต็มจอสำหรับเมนูที่เหลือ
 * ธีม Deep Violet + Gold Accent (สไตล์อยู่ใน index.css ส่วน .m-tabbar)
 */
const MobileTabBar = ({ items, onOpenMenu, menuActive = false }) => {
  const tabClass = (active) =>
    `m-tab ${active ? 'is-active' : ''} flex-1 min-w-0 min-h-[56px] flex flex-col items-center justify-center gap-0.5 px-1 no-underline border-none bg-transparent cursor-pointer`;

  return (
    <nav className="m-tabbar" aria-label="เมนูหลัก">
      {items.map((item) => {
        const Icon = item.Icon;
        if (item.onClick) {
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={tabClass(item.active)}
              aria-current={item.active ? 'page' : undefined}
            >
              <span className="m-tab-icon flex items-center justify-center h-7 w-12 rounded-full">
                <Icon className="w-5 h-5" />
              </span>
              <span className="m-tab-label w-full text-center text-[10px] leading-tight truncate">{item.label}</span>
            </button>
          );
        }
        return (
          <Link
            key={item.key}
            to={item.to}
            className={tabClass(item.active)}
            aria-current={item.active ? 'page' : undefined}
          >
            <span className="m-tab-icon flex items-center justify-center h-7 w-12 rounded-full">
              <Icon className="w-5 h-5" />
            </span>
            <span className="m-tab-label w-full text-center text-[10px] leading-tight truncate">{item.label}</span>
          </Link>
        );
      })}
      <button type="button" onClick={onOpenMenu} className={tabClass(menuActive)} aria-label="เปิดเมนูทั้งหมด">
        <span className="m-tab-icon flex items-center justify-center h-7 w-12 rounded-full">
          <Menu className="w-5 h-5" />
        </span>
        <span className="m-tab-label w-full text-center text-[10px] leading-tight">เมนู</span>
      </button>
    </nav>
  );
};

export default MobileTabBar;

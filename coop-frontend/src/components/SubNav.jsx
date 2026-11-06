import React, { useEffect } from 'react';

/**
 * Subnav แถบม่วงสูง 32px สำหรับตกแต่งต่อจาก Navbar — ไม่มีข้อความ ใช้ทุกหน้าเหมือนหน้าโฮม
 * - variant="inline": อยู่ในลำดับเอกสาร (หน้าโฮม/หน้า Public)
 * - variant="fixed": ตรึงใต้ Navbar ของหน้าแดชบอร์ด และดันเนื้อหา/Sidebar ลงด้วยตัวแปร --subnav-h
 */
const SubNav = ({ variant = 'inline' }) => {
  useEffect(() => {
    if (variant !== 'fixed') return undefined;
    document.body.classList.add('has-subnav');
    return () => document.body.classList.remove('has-subnav');
  }, [variant]);

  return (
    <div
      className={`site-subnav ${variant === 'fixed' ? 'site-subnav-fixed' : ''}`}
      style={{ height: 32 }}
      aria-hidden="true"
    />
  );
};

export default SubNav;

import React from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * ปุ่มย้อนกลับมาตรฐาน (ธีม Deep Violet & Gold) — สไตล์อยู่ใน index.css ส่วน .icon-btn
 * variant="light": พื้นที่เนื้อหาสีสว่าง (ค่าเริ่มต้น) | variant="dark": บน Navbar/Banner สีม่วงเข้ม
 */
const BackButton = ({ onClick, label = 'ย้อนกลับ', variant = 'light', className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`icon-btn icon-btn--back icon-btn--${variant} ${className}`.trim()}
  >
    <ArrowLeft className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
  </button>
);

export default BackButton;

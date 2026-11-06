import React from 'react';

/**
 * ปุ่มมาตรฐานของระบบ (สเปก 2.1) — สูง 44px, มุม rounded-xl, ตัวอักษร 14px ตัวหนาปานกลาง
 * variant:
 *  - primary   ปุ่มยืนยันหลัก (ไล่เฉดม่วง)
 *  - success   ปุ่มยืนยัน/อนุมัติ (ไล่เฉดเขียวมรกต)
 *  - secondary ปุ่มยกเลิก/ปิด (พื้นเทาอ่อน กรอบเทา)
 *  - danger    ปุ่มปฏิเสธ/ลบ (ไล่เฉดแดง)
 */
const VARIANTS = {
  primary:
    'bg-gradient-to-r from-purple-900 to-indigo-800 text-white border-0 shadow-md shadow-purple-900/25 hover:shadow-lg hover:shadow-purple-900/35',
  success:
    'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30',
  secondary:
    'bg-[#F8FAFC] border border-slate-200 text-slate-600 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700',
  danger:
    'bg-gradient-to-r from-rose-600 to-red-600 text-white border-0 shadow-md shadow-rose-500/20',
};

const BASE =
  'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer ' +
  'transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

const Button = ({
  variant = 'primary',
  type = 'button',
  icon: Icon,
  loading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={`${BASE} ${VARIANTS[variant] || VARIANTS.primary} ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
    {...rest}
  >
    {loading ? (
      <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
    ) : (
      Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
    )}
    {children}
  </button>
);

export default Button;

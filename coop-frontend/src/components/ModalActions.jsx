import { Loader2 } from 'lucide-react';

/**
 * ชุดปุ่มมาตรฐานสำหรับ Modal / Dialog / Drawer form ทั้งระบบ
 * - รูปทรง rounded-xl (12px) สูง 44px (h-11) ตัวอักษร text-sm font-semibold
 * - ปุ่มยืนยันมี 3 โทน: approve (เขียว), confirm (ม่วง), danger (แดง)
 * - ปุ่มยกเลิกเป็นพื้นขาวเทา ขอบบาง hover เป็นม่วงอ่อน
 * - บนมือถือ (< 768px) เรียงเป็น 2 คอลัมน์เท่ากัน, บน desktop ชิดขวา
 */

const BASE =
  'h-11 min-w-[100px] px-5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5 ' +
  'transition-all duration-200 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ' +
  'hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2';

const TONES = {
  approve: {
    className: 'border-0 text-white',
    style: {
      background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
      boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.3)',
    },
  },
  confirm: {
    className: 'border-0 text-white',
    style: {
      background: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 100%)',
      boxShadow: '0 4px 14px 0 rgba(109, 40, 217, 0.3)',
    },
  },
  danger: {
    className: 'border-0 text-white',
    style: {
      background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
      boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.3)',
    },
  },
};

const CANCEL_CLASS =
  'bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] font-medium hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700';

export const ModalCancelButton = ({ children = 'ยกเลิก', className = '', ...props }) => (
  <button type="button" className={`${BASE} ${CANCEL_CLASS} ${className}`} {...props}>
    {children}
  </button>
);

export const ModalConfirmButton = ({ tone = 'confirm', loading = false, children = 'ยืนยัน', className = '', disabled, ...props }) => {
  const t = TONES[tone] || TONES.confirm;
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`${BASE} ${t.className} ${className}`}
      style={t.style}
      {...props}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
};

/** กล่องจัดวางปุ่ม: children ควรเป็น [ปุ่มยกเลิก, ปุ่มยืนยัน] */
export const ModalActions = ({ children, className = '' }) => (
  <div
    className={`grid grid-cols-2 gap-3 w-full pt-4 mt-2 border-t border-slate-100 [&>:only-child]:col-span-2 md:flex md:w-auto md:ml-auto md:justify-end ${className}`}
  >
    {children}
  </div>
);

export default ModalActions;

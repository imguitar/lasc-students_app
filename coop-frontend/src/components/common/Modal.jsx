import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal กลางของระบบ (สเปก 2.2)
 * - มือถือ: Bottom Sheet เต็มความกว้าง ขอบมนด้านบน มีแถบจับลาก และสไลด์ขึ้นจากด้านล่าง
 * - เดสก์ท็อป (>= 768px): กล่องกลางจอ กว้างสูงสุด max-w-xl มุมโค้ง 16px และเฟดเข้า
 * - actions: ปุ่มด้านล่าง (เช่น <Button variant="secondary" /> กับ <Button />) จะถูกวางในแถบติดก้นแบบ 2 คอลัมน์
 *
 * ตัว overlay ใช้คลาส .ui-sheet-overlay แทน items-end/items-center
 * เพื่อไม่ให้กฎ modal เดิมใน index.css (div.fixed.inset-0.items-*) มาทับสไตล์
 */
const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  maxWidthClass = 'md:max-w-xl',
  closeOnOverlay = true,
}) => {
  const [visible, setVisible] = useState(false);
  // เก็บ onClose ล่าสุดไว้ใน ref เพื่อไม่ให้ effect รันใหม่ทุกครั้งที่ parent ส่งฟังก์ชันใหม่มา
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // เปิด: เรนเดอร์ก่อน แล้วค่อยใส่สถานะ visible ในเฟรมถัดไปให้แอนิเมชันทำงาน / ปิด: รีเซ็ตใน cleanup
  useEffect(() => {
    if (!open) return undefined;
    const frame = requestAnimationFrame(() => setVisible(true));
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      setVisible(false);
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={`ui-sheet-overlay fixed inset-0 z-50 flex justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={closeOnOverlay ? onClose : undefined}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={`w-full ${maxWidthClass} rounded-t-[28px] rounded-b-none md:rounded-2xl max-h-[90vh] flex flex-col bg-white overflow-hidden shadow-2xl transition-transform duration-300 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* แถบจับลาก (มือถือเท่านั้น) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
          <span className="bg-slate-300 w-10 h-1.5 rounded-full" />
        </div>

        {(title || onClose) && (
          <div className="flex items-start justify-between gap-3 px-6 pt-3 md:pt-5 pb-2">
            <div className="flex items-start gap-3 min-w-0">
              {Icon && (
                <span className="w-10 h-10 rounded-xl bg-purple-50 border border-[#E9E5F5] text-purple-800 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0">
                {title && <h3 className="m-0 text-base md:text-lg font-bold text-slate-900 leading-snug">{title}</h3>}
                {subtitle && <p className="m-0 mt-0.5 text-xs md:text-sm text-slate-500 leading-relaxed">{subtitle}</p>}
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="ปิดหน้าต่าง"
                className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-0 bg-transparent cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">{children}</div>

        {actions && (
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-md px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 grid grid-cols-2 gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;

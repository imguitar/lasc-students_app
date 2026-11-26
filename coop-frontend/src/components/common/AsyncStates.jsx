import { Skeleton, Button } from '@mui/material';
import { AlertCircle, RotateCw } from 'lucide-react';

const SKELETON_SX = { bgcolor: 'rgba(139, 92, 246, 0.10)' };

/**
 * สถานะกำลังโหลด (ธีมม่วง) — ใช้แทน Empty State ระหว่างรอข้อมูล
 * variant: 'list' แถวรายการ | 'table' แถวตาราง | 'cards' การ์ดตาราง 2 คอลัมน์
 */
export const LoadingBlock = ({ rows = 4, variant = 'list', label = 'กำลังโหลดข้อมูล...', className = '' }) => (
  <div className={`w-full ${className}`} role="status" aria-live="polite" aria-busy="true">
    <span className="sr-only">{label}</span>
    {variant === 'cards' ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={84} sx={SKELETON_SX} animation="wave" />
        ))}
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            {variant === 'list' && <Skeleton variant="circular" width={36} height={36} sx={SKELETON_SX} animation="wave" />}
            <div className="flex-1 min-w-0">
              <Skeleton variant="text" width={i % 2 ? '55%' : '72%'} height={variant === 'table' ? 22 : 20} sx={SKELETON_SX} animation="wave" />
              {variant === 'list' && <Skeleton variant="text" width="38%" height={14} sx={SKELETON_SX} animation="wave" />}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

/** โหลดไม่สำเร็จ: แจ้งสาเหตุสั้นๆ + ปุ่มลองใหม่อีกครั้ง */
export const ErrorRetry = ({ message = 'โหลดข้อมูลไม่สำเร็จ', onRetry, className = '' }) => (
  <div
    role="alert"
    className={`w-full flex flex-col items-center justify-center text-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-8 ${className}`}
  >
    <span className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
      <AlertCircle className="w-6 h-6" aria-hidden="true" />
    </span>
    <p className="m-0 text-sm font-semibold text-slate-700">{message}</p>
    <p className="m-0 text-xs text-slate-500">ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง</p>
    {onRetry && (
      <Button
        onClick={onRetry}
        variant="contained"
        disableElevation
        startIcon={<RotateCw className="w-4 h-4" aria-hidden="true" />}
        sx={{ height: 44, px: 3, borderRadius: '12px', fontWeight: 600, textTransform: 'none', bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' } }}
      >
        ลองใหม่อีกครั้ง
      </Button>
    )}
  </div>
);

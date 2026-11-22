import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import { Lock, Pencil } from 'lucide-react';

/**
 * ช่องข้อมูลโปรไฟล์มาตรฐาน (นักศึกษา / อาจารย์ / ผู้ดูแลระบบ)
 * - locked   : ข้อมูลจากระบบทะเบียน/SSO แก้ไขไม่ได้ -> พื้นเทาจาง ตัวอักษรหม่น ไอคอน Lock
 * - editable : ช่องที่แก้ได้ -> พื้นขาว ขอบชัด ป้าย "แก้ไขได้"; เมื่อ editing ขอบเป็นม่วง + ring
 */
// สไตล์ช่องข้อมูลของหน้านี้ (Clean Violet)
// - locked   : ข้อมูลจากระบบทะเบียน แก้ไขไม่ได้ -> พื้นเทาจาง ตัวอักษรหม่น เคอร์เซอร์ห้าม + ไอคอน Lock
// - editable : ช่องที่แก้ได้ (เบอร์โทร/ที่อยู่) -> พื้นขาว ตัวอักษรเข้ม ขอบชัด; เมื่อกดแก้ไขขอบเป็นม่วง + ring
// ต้องใช้ !important เพราะ index.css ตั้งสไตล์ .MuiOutlinedInput-root ทั้งระบบด้วย !important
const baseRoot = {
  borderRadius: '12px !important',
  fontSize: '0.9rem !important',
  transition: 'box-shadow 0.15s ease, border-color 0.15s ease !important',
};

const lockedSx = {
  '& .MuiOutlinedInput-root': {
    ...baseRoot,
    backgroundColor: 'rgba(241, 245, 249, 0.8) !important',
    opacity: 0.75,
    cursor: 'not-allowed',
    boxShadow: 'none !important',
    '& fieldset': { borderColor: '#e2e8f0 !important' },
    '&:hover fieldset': { borderColor: '#e2e8f0 !important' },
    '&.Mui-focused': { backgroundColor: 'rgba(241, 245, 249, 0.8) !important', boxShadow: 'none !important' },
    '&.Mui-focused fieldset': { borderColor: '#e2e8f0 !important', borderWidth: '1px !important' },
  },
  '& .MuiInputBase-input': { color: '#64748b !important', WebkitTextFillColor: '#64748b', cursor: 'not-allowed', textOverflow: 'ellipsis' },
};

const editableSx = (editing) => ({
  '& .MuiOutlinedInput-root': {
    ...baseRoot,
    backgroundColor: '#ffffff !important',
    boxShadow: editing ? '0 0 0 3px rgba(139, 92, 246, 0.15) !important' : 'none !important',
    '& fieldset': { borderColor: (editing ? '#8b5cf6' : '#cbd5e1') + ' !important', borderWidth: (editing ? '1.5px' : '1px') + ' !important' },
    '&:hover fieldset': { borderColor: (editing ? '#8b5cf6' : '#94a3b8') + ' !important' },
    '&.Mui-focused': { backgroundColor: '#ffffff !important', boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.2) !important' },
    '&.Mui-focused fieldset': { borderColor: '#8b5cf6 !important', borderWidth: '1.5px !important' },
  },
  '& .MuiInputBase-input': { color: '#1e293b !important', WebkitTextFillColor: '#1e293b', textOverflow: 'ellipsis' },
});

/**
 * ช่องข้อมูลพร้อมป้ายกำกับ: locked = แก้ไขไม่ได้ (ไอคอน Lock), ไม่ใส่ = แก้ไขได้ (ป้าย "แก้ไขได้" + ไอคอน Pencil)
 * label แยกออกมาเป็นบรรทัดของตัวเองเพื่อให้ป้ายสถานะไม่ทับ/ไม่ถูกตัดใน TextField
 */
export const ProfileField = ({ label, locked = false, editing = false, className = '', inputProps, InputProps, ...props }) => {
  const id = React.useId();
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 mb-1.5">
        <label htmlFor={id} className={`text-xs font-bold ${locked ? 'text-slate-500' : 'text-slate-700'}`}>
          {label}
        </label>
        {!locked && (
          <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
            <Pencil className="w-3 h-3" aria-hidden="true" /> แก้ไขได้
          </span>
        )}
      </div>
      <TextField
        id={id}
        fullWidth
        size="small"
        variant="outlined"
        sx={locked ? lockedSx : editableSx(editing)}
        inputProps={{ ...inputProps, readOnly: locked || !editing, 'aria-readonly': locked || !editing }}
        InputProps={{
          ...InputProps,
          ...(locked
            ? {
                endAdornment: (
                  <InputAdornment position="end">
                    <Lock className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  </InputAdornment>
                ),
              }
            : {}),
        }}
        {...props}
      />
    </div>
  );
};

export const ProfileSectionTitle = ({ children, hint }) => (
  <div className="sm:col-span-2 pt-2 first:pt-0">
    <h4 className="m-0 text-sm font-bold text-violet-900">{children}</h4>
    {hint && <p className="m-0 mt-0.5 text-xs text-slate-500">{hint}</p>}
    <div className="h-px bg-violet-100 mt-2" />
  </div>
);

export default ProfileField;

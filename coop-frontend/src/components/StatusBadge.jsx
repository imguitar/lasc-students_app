import React from 'react';

const getStatusBadgeStyle = (status) => {
  const s = String(status || '').trim();

  if (
    s === 'อนุมัติแล้ว (รอออกฝึกงาน)' ||
    s.includes('รอออกฝึกงาน')
  ) {
    return {
      className: 'bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5',
      dotClass: 'bg-amber-500',
      label: 'อนุมัติแล้ว (รอออกฝึกงาน)',
    };
  }

  if (
    s === 'กำลังออกฝึกงาน' ||
    s === 'ออกฝึกงาน'
  ) {
    return {
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5',
      dotClass: 'bg-emerald-500',
      label: 'กำลังออกฝึกงาน',
    };
  }

  if (
    s === 'สิ้นสุดการฝึกงาน (รอประเมิน)' ||
    s.includes('สิ้นสุดการฝึกงาน')
  ) {
    return {
      className: 'bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5',
      dotClass: 'bg-violet-500',
      label: 'สิ้นสุดการฝึกงาน (รอประเมิน)',
    };
  }

  if (s === 'อนุมัติแล้ว' || s.includes('เสร็จสมบูรณ์')) {
    return {
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5',
      dotClass: 'bg-emerald-500',
      label: s === 'อนุมัติแล้ว' ? 'อนุมัติแล้ว' : s,
    };
  }

  if (
    s.includes('รออนุมัติ') ||
    s.includes('รอดำเนินการ') ||
    s === 'รอผู้ดูแลระบบตรวจสอบ' ||
    s === 'รอผู้ดูแลระบบอนุมัติ' ||
    s === 'รออาจารย์ที่ปรึกษาอนุมัติ'
  ) {
    return {
      className: 'bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5',
      dotClass: 'bg-amber-500',
      label: s,
    };
  }

  if (
    s === 'COMPANY_ACCEPTED' ||
    s.includes('สถานประกอบการตอบรับแล้ว') ||
    s.includes('รอผู้ดูแลระบบกำหนดวัน') ||
    s.includes('รอแอดมินออกใบส่งตัว') ||
    s.includes('รอออกใบส่งตัว') ||
    s === 'ตอบรับแล้ว'
  ) {
    return {
      className: 'bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs',
      dotClass: 'bg-indigo-500',
      label: 'รอแอดมินออกใบส่งตัว',
    };
  }

  if (s === 'รอสถานประกอบการตอบรับ') {
    return {
      className: 'bg-violet-50 text-violet-700 border border-violet-100 rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5',
      dotClass: 'bg-violet-500',
      label: s,
    };
  }

  if (s.includes('รอแอดมินอนุมัติ') || s.includes('รออาจารย์อนุมัติเริ่ม')) {
    return {
      className: 'bg-sky-50 text-sky-700 border border-sky-100 rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5',
      dotClass: 'bg-sky-500',
      label: 'รอแอดมินอนุมัติการออกฝึกงาน',
    };
  }

  if (s === 'ออกฝึกงาน') {
    return {
      className: 'bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5',
      dotClass: 'bg-blue-500',
      label: s,
    };
  }

  if (s.includes('ประเมิน') || s.includes('เสร็จ')) {
    return {
      className: 'bg-purple-50 text-purple-700 border border-purple-100 rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5',
      dotClass: 'bg-purple-500',
      label: s,
    };
  }

  if (s.includes('ไม่อนุมัติ') || s.includes('ปฏิเสธ') || s.includes('ยกเลิก')) {
    return {
      className: 'bg-rose-50 text-rose-700 border border-rose-100 rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5',
      dotClass: 'bg-rose-500',
      label: s,
    };
  }

  return {
    className: 'bg-slate-50 text-slate-700 border border-slate-200 rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5',
    dotClass: 'bg-slate-400',
    label: s || 'ไม่ทราบสถานะ',
  };
};

const StatusBadge = ({ status, style = {}, className = '' }) => {
  const { className: badgeClass, dotClass, label } = getStatusBadgeStyle(status);

  return (
    <span
      className={`${badgeClass} ${className}`}
      style={style}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;

import React from 'react';

const STATUS_STYLES = {
  'รออาจารย์ที่ปรึกษาอนุมัติ': { bg: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 100%)', color: '#78350f' },
  'รอผู้ดูแลระบบตรวจสอบ': { bg: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 100%)', color: '#ffffff' },
  'รอผู้ดูแลระบบอนุมัติ': { bg: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 100%)', color: '#ffffff' },
  'รอสถานประกอบการตอบรับ': { bg: 'linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 100%)', color: '#ffffff' },
  'รออาจารย์อนุมัติเริ่มฝึกงาน': { bg: 'linear-gradient(135deg, #a7f3d0 0%, #34d399 100%)', color: '#064e3b', label: 'รอแอดมินอนุมัติการออกฝึกงาน' },
  'รอแอดมินอนุมัติเริ่มฝึกงาน': { bg: 'linear-gradient(135deg, #a7f3d0 0%, #34d399 100%)', color: '#064e3b', label: 'รอแอดมินอนุมัติการออกฝึกงาน' },
  'อนุมัติแล้ว': { bg: 'linear-gradient(135deg, #a7f3d0 0%, #34d399 100%)', color: '#064e3b', label: 'รอแอดมินอนุมัติการออกฝึกงาน' },
  'ประเมินเสร็จแล้ว': { bg: 'linear-gradient(135deg, #c7d2fe 0%, #6366f1 100%)', color: '#1e1b4b' },
  'ไม่อนุมัติ (อาจารย์)': { bg: 'linear-gradient(135deg, #fda4af 0%, #f43f5e 100%)', color: '#ffffff' },
  'ไม่อนุมัติ (Admin)': { bg: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)', color: '#ffffff' },
  'ปฏิเสธ': { bg: 'linear-gradient(135deg, #fb7185 0%, #be123c 100%)', color: '#ffffff' },
  'ออกฝึกงาน': { bg: 'linear-gradient(135deg, #67e8f9 0%, #0ea5e9 100%)', color: '#083344' },
  'ฝึกงานเสร็จแล้ว': { bg: 'linear-gradient(135deg, #f9a8d4 0%, #ec4899 100%)', color: '#831843' }
};

const StatusBadge = ({ status, style = {}, className = '' }) => {
  const normalizedStatus = String(status || '').trim();
  const statusInfo = STATUS_STYLES[normalizedStatus] || { bg: 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)', color: '#111827' };
  const displayLabel = statusInfo.label || normalizedStatus;

  return (
    <span
      className={className}
      style={{
        background: statusInfo.bg,
        color: statusInfo.color,
        display: 'inline-block',
        padding: '6px 12px',
        borderRadius: '999px',
        fontSize: '0.875rem',
        fontWeight: '600',
        lineHeight: 1.2,
        ...style
      }}
    >
      {displayLabel || 'ไม่ทราบสถานะ'}
    </span>
  );
};

export default StatusBadge;

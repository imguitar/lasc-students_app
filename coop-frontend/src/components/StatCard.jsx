import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';

const getBadgeClasses = (title) => {
  const t = String(title || '').toLowerCase();

  // หมวดสำเร็จการศึกษา / ศิษย์เก่า / สถานประกอบการ
  if (t.includes('สำเร็จ') || t.includes('ศิษย์เก่า') || t.includes('บริษัท') || t.includes('สถานประกอบการ')) {
    return 'bg-blue-50 text-blue-600 border border-blue-100/80 rounded-xl p-2.5';
  }

  // หมวดโครงการ / ปริญญานิพนธ์ / ไม่อนุมัติ / แจ้งเตือน
  if (t.includes('โครง') || t.includes('นิพนธ์') || t.includes('ไม่อนุมัติ') || t.includes('ปฏิเสธ') || t.includes('ขาด') || t.includes('สาย')) {
    return 'bg-rose-50 text-rose-600 border border-rose-100/80 rounded-xl p-2.5';
  }

  // หมวดฝึกงาน / สหกิจ / แหล่งฝึก / อนุมัติ / เริ่มฝึก
  if (t.includes('ฝึกงาน') || t.includes('สหกิจ') || t.includes('แหล่งฝึก') || t.includes('อนุมัติ') || t.includes('ผ่าน') || t.includes('เสร็จ')) {
    return 'bg-emerald-50 text-emerald-600 border border-emerald-100/80 rounded-xl p-2.5';
  }

  // หมวดนักศึกษา / ข้อมูลหลัก / ทั่วไป
  return 'bg-purple-50 text-purple-600 border border-purple-100/80 rounded-xl p-2.5';
};

const StatCard = ({
  title,
  label,
  value,
  icon,
  color,
  isText = false,
  onClick,
}) => {
  const cardTitle = title || label;
  const badgeClass = getBadgeClasses(cardTitle);

  return (
    <Card
      elevation={0}
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]"
      sx={{
        borderRadius: '1rem',
        bgcolor: '#ffffff',
        border: '1px solid #f1f5f9',
        boxShadow: '0 2px 15px -3px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: '#e2e8f0',
          boxShadow: '0 8px 20px -4px rgba(0,0,0,0.06)',
        },
      }}
    >
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
          {icon && (
            <div className={`flex items-center justify-center shrink-0 text-xl font-bold ${badgeClass}`}>
              {icon}
            </div>
          )}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: '#94a3b8',
                fontWeight: 600,
                fontSize: '0.8125rem',
                mb: 0.25,
              }}
            >
              {cardTitle}
            </Typography>
            <Typography
              variant={isText ? 'subtitle1' : 'h4'}
              sx={{
                fontWeight: 800,
                color: '#0f172a',
                fontSize: isText ? '1.1rem' : '1.75rem',
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                wordBreak: 'break-word',
              }}
            >
              {value}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;

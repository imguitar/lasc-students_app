import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];
const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const formatThaiDateTimeDisplay = (date, compact = false) => {
  const day = date.getDate();
  const month = compact ? THAI_MONTHS_SHORT[date.getMonth()] : THAI_MONTHS_FULL[date.getMonth()];
  const year = date.getFullYear() + 543;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  if (compact) return `${day} ${month} ${String(year).slice(-2)} • ${hours}:${minutes}`;
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day} ${month} ${year} • ${hours}:${minutes}:${seconds} น.`;
};

const DateTimeIndicator = ({ className = '' }) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50/70 border border-violet-100/90 text-slate-700 text-[11px] sm:text-xs shrink-0 select-none ${className}`}
      title={`วันเวลาปัจจุบันของระบบ: ${formatThaiDateTimeDisplay(currentDate)}`}
      aria-label={`วันเวลาปัจจุบันของระบบ: ${formatThaiDateTimeDisplay(currentDate)}`}
    >
      <Calendar className="w-3.5 h-3.5 text-violet-600 shrink-0" aria-hidden="true" />
      <span className="font-medium whitespace-nowrap md:hidden" aria-hidden="true">
        {formatThaiDateTimeDisplay(currentDate, true)}
      </span>
      <span className="hidden font-medium whitespace-nowrap md:inline" aria-hidden="true">
        {formatThaiDateTimeDisplay(currentDate)}
      </span>
    </div>
  );
};

export default DateTimeIndicator;

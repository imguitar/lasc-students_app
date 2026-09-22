import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { newsEventService } from '../services';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Pin,
  ChevronRight,
  ExternalLink,
  FileText,
  Sparkles,
  RotateCcw,
  Plus,
  X,
  Megaphone,
  Download,
  AlertCircle
} from 'lucide-react';

export const THAI_MONTHS = [
  { value: 1, label: 'มกราคม' },
  { value: 2, label: 'กุมภาพันธ์' },
  { value: 3, label: 'มีนาคม' },
  { value: 4, label: 'เมษายน' },
  { value: 5, label: 'พฤษภาคม' },
  { value: 6, label: 'มิถุนายน' },
  { value: 7, label: 'กรกฎาคม' },
  { value: 8, label: 'สิงหาคม' },
  { value: 9, label: 'กันยายน' },
  { value: 10, label: 'ตุลาคม' },
  { value: 11, label: 'พฤศจิกายน' },
  { value: 12, label: 'ธันวาคม' }
];

export const EVENT_TYPE_COLORS = {
  'ประกาศ': 'bg-blue-50 text-blue-700 border-blue-200',
  'กิจกรรม': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'การเรียน': 'bg-purple-50 text-purple-700 border-purple-200',
  'ฝึกงาน': 'bg-amber-50 text-amber-700 border-amber-200',
  'การแข่งขัน': 'bg-rose-50 text-rose-700 border-rose-200',
  'อบรม/สัมมนา': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'กำหนดการสำคัญ': 'bg-red-50 text-red-700 border-red-200',
  'อื่น ๆ': 'bg-gray-50 text-gray-700 border-gray-200'
};

export const formatThaiDate = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()]?.label || '';
  const beYear = d.getFullYear() + 543;
  return `${day} ${month} ${beYear}`;
};

export const formatThaiShortDate = (dateString) => {
  if (!dateString) return { day: '-', month: '-', year: '-' };
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return { day: '-', month: '-', year: '-' };
  const shortMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return {
    day: d.getDate(),
    month: shortMonths[d.getMonth()],
    year: d.getFullYear() + 543
  };
};

const MonthlyNewsSection = () => {
  const { user } = useAuth();
  const currentDate = new Date();
  const currentCEYear = currentDate.getFullYear();
  const currentBEYear = currentCEYear + 543;
  const currentMonthNum = currentDate.getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
  const [selectedYear, setSelectedYear] = useState(currentBEYear);
  const [newsEvents, setNewsEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Generate 7 years around current BE year (current - 3 to current + 3)
  const availableYears = [];
  for (let i = currentBEYear - 3; i <= currentBEYear + 3; i++) {
    availableYears.push(i);
  }

  const fetchNewsEvents = async () => {
    setLoading(true);
    try {
      const res = await newsEventService.getAll({
        month: selectedMonth,
        year: selectedYear
      });
      if (res.success) {
        setNewsEvents(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching monthly news & events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsEvents();
  }, [selectedMonth, selectedYear]);

  const handleResetToCurrent = () => {
    setSelectedMonth(currentMonthNum);
    setSelectedYear(currentBEYear);
  };

  const isCurrentMonthSelected = selectedMonth === currentMonthNum && selectedYear === currentBEYear;

  return (
    <div className="space-y-4">
      <Card className="border border-purple-100/50 shadow-sm rounded-2xl bg-white overflow-hidden">
        {/* Header with Filters */}
        <CardHeader className="border-b border-gray-100/80 pb-4 bg-gradient-to-r from-purple-50/40 via-white to-indigo-50/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shadow-purple-200">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span>ข่าวสารและกิจกรรมประจำเดือน</span>
                    {newsEvents.length > 0 && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {newsEvents.length} รายการ
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    ติดตามข่าวสาร ประกาศ กิจกรรม และกำหนดการสำคัญสำหรับนักศึกษาและบุคลากร
                  </CardDescription>
                </div>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Month Selector */}
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-sm text-xs">
                <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent text-gray-700 font-semibold focus:outline-none cursor-pointer text-xs"
                >
                  {THAI_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-sm text-xs">
                <span className="text-gray-400 font-medium">พ.ศ.</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-gray-700 font-semibold focus:outline-none cursor-pointer text-xs"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset to Current Month Button */}
              {!isCurrentMonthSelected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetToCurrent}
                  className="h-8 px-2.5 text-xs text-purple-600 border-purple-200 hover:bg-purple-50 rounded-xl flex items-center gap-1"
                  title="กลับไปยังเดือนปัจจุบัน"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>เดือนนี้</span>
                </Button>
              )}

              {/* Link to Full Page */}
              <Link to="/news-events">
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center gap-1 shadow-sm shadow-purple-200"
                >
                  <span>ดูทั้งหมด</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>

        {/* Content Body */}
        <CardContent className="pt-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">กำลังโหลดข้อมูลข่าวสารและกิจกรรม...</span>
            </div>
          ) : newsEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {newsEvents.map((item) => {
                const dateParts = formatThaiShortDate(item.event_date);
                const typeStyle = EVENT_TYPE_COLORS[item.type] || EVENT_TYPE_COLORS['อื่น ๆ'];

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="group relative bg-white border border-gray-100 hover:border-purple-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer overflow-hidden"
                  >
                    {/* Top Accent bar for pinned */}
                    {item.is_pinned && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-purple-500 to-indigo-500" />
                    )}

                    <div className="space-y-3">
                      {/* Top Badges: Date Badge + Type + Pin */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {/* Modern Date Tile */}
                          <div className="w-12 h-13 rounded-xl bg-purple-50 border border-purple-100 flex flex-col items-center justify-center text-purple-900 shrink-0 shadow-xs group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <span className="text-base font-extrabold leading-none">{dateParts.day}</span>
                            <span className="text-[10px] font-medium leading-tight mt-0.5">{dateParts.month}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${typeStyle}`}>
                                {item.type}
                              </span>
                              {item.is_pinned && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                  <Pin className="w-2.5 h-2.5 fill-amber-500 text-amber-600 rotate-45" />
                                  ปักหมุด
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 block">
                              พ.ศ. {dateParts.year}
                            </span>
                          </div>
                        </div>

                        {/* Optional thumbnail preview */}
                        {item.image_url && (
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                            <img
                              src={item.image_url.startsWith('http') ? item.image_url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${item.image_url}`}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Title & Short Description */}
                      <div>
                        <h4 className="font-bold text-sm text-gray-800 line-clamp-2 group-hover:text-purple-700 transition-colors leading-snug">
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 leading-relaxed font-normal">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer Info: Time, Location, Attachment Indicator */}
                    <div className="pt-3 mt-3 border-t border-gray-50 text-xs text-gray-500 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-[11px] text-gray-500 truncate">
                          {(item.start_time || item.end_time) && (
                            <span className="inline-flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3 text-purple-500" />
                              {item.start_time || ''}{item.end_time ? ` - ${item.end_time}` : ''} น.
                            </span>
                          )}
                          {item.location && (
                            <span className="inline-flex items-center gap-1 truncate" title={item.location}>
                              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                              <span className="truncate">{item.location}</span>
                            </span>
                          )}
                        </div>

                        {item.attachment_url && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                            <FileText className="w-2.5 h-2.5" />
                            ไฟล์แนบ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="py-12 px-4 text-center rounded-2xl bg-purple-50/20 border border-dashed border-purple-100/80 flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-400">
                <Calendar className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-700">ยังไม่มีข่าวสารหรือกิจกรรมในเดือนนี้</h4>
                <p className="text-xs text-gray-400 max-w-sm">
                  ไม่พบข้อมูลข่าวสารหรือกิจกรรมในเดือน {THAI_MONTHS.find(m => m.value === selectedMonth)?.label} พ.ศ. {selectedYear}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {!isCurrentMonthSelected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetToCurrent}
                    className="text-xs text-purple-600 border-purple-200 rounded-xl"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    ดูเดือนปัจจุบัน
                  </Button>
                ) : user?.role === 'admin' ? (
                  <Link to="/news-events">
                    <Button
                      size="sm"
                      className="text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มข่าวสารหรือกิจกรรมใหม่</span>
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-start justify-between gap-4 z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${EVENT_TYPE_COLORS[selectedItem.type] || EVENT_TYPE_COLORS['อื่น ๆ']}`}>
                    {selectedItem.type}
                  </span>
                  {selectedItem.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      <Pin className="w-3 h-3 fill-amber-500 text-amber-600 rotate-45" />
                      ปักหมุด
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  {selectedItem.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Event Image */}
              {selectedItem.image_url && (
                <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100 max-h-72 flex items-center justify-center">
                  <img
                    src={selectedItem.image_url.startsWith('http') ? selectedItem.image_url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${selectedItem.image_url}`}
                    alt={selectedItem.title}
                    className="w-full h-full object-contain max-h-72"
                  />
                </div>
              )}

              {/* Event Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/40 border border-purple-100/60 rounded-xl p-3.5 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px]">วันที่จัดกิจกรรม</span>
                    <span className="font-semibold">{formatThaiDate(selectedItem.event_date)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px]">เวลา</span>
                    <span className="font-semibold">
                      {selectedItem.start_time ? `${selectedItem.start_time}${selectedItem.end_time ? ` - ${selectedItem.end_time}` : ''} น.` : 'ไม่ระบุเวลา'}
                    </span>
                  </div>
                </div>

                {selectedItem.location && (
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    <div>
                      <span className="text-gray-400 block text-[10px]">สถานที่</span>
                      <span className="font-semibold">{selectedItem.location}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">รายละเอียด</h4>
                  <div className="text-sm text-gray-600 whitespace-pre-line leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    {selectedItem.description}
                  </div>
                </div>
              )}

              {/* Attachment */}
              {selectedItem.attachment_url && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">เอกสารแนบ</h4>
                  <a
                    href={selectedItem.attachment_url.startsWith('http') ? selectedItem.attachment_url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${selectedItem.attachment_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-purple-100 bg-purple-50/30 hover:bg-purple-50 transition-colors text-xs font-semibold text-purple-900 group"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>{selectedItem.attachment_name || 'ดาวน์โหลดเอกสารแนบ'}</span>
                    </div>
                    <Download className="w-4 h-4 text-purple-500 group-hover:translate-y-0.5 transition-transform" />
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span>
                {selectedItem.creator ? `โพสต์โดย: ${selectedItem.creator.username}` : ''}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedItem(null)}
                className="text-xs"
              >
                ปิด
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyNewsSection;

import React, { useState, useEffect, useRef } from 'react';
import { newsEventService } from '../services';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Pin,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  FileText,
  Download,
  X,
  Plus,
  Megaphone,
  Sparkles
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

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${cleanPath}`;
};

const MonthlyNewsSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newsEvents, setNewsEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeNewsDot, setActiveNewsDot] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const carouselRef = useRef(null);

  const fetchNewsEvents = async () => {
    setLoading(true);
    try {
      const res = await newsEventService.getAll({
        is_published: true
      });
      if (res?.success) {
        // Sort: Pinned first, then newest date/created_at
        const sorted = (res.data || []).sort((a, b) => {
          const aPinned = a.is_pinned === true || a.is_pinned === 1 ? 1 : 0;
          const bPinned = b.is_pinned === true || b.is_pinned === 1 ? 1 : 0;
          if (aPinned !== bPinned) return bPinned - aPinned;
          const dateA = new Date(a.event_date || a.created_at || 0).getTime();
          const dateB = new Date(b.event_date || b.created_at || 0).getTime();
          return dateB - dateA;
        });
        setNewsEvents(sorted);
      }
    } catch (error) {
      console.error('Error fetching news & events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsEvents();
  }, []);

  const handleNewsScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const cardNode = el.querySelector('.news-card');
    const step = cardNode ? cardNode.offsetWidth + 20 : 310;
    setActiveNewsDot(Math.max(0, Math.min(newsEvents.length - 1, Math.round(el.scrollLeft / step))));
  };

  const scrollToNewsIndex = (idx) => {
    const el = carouselRef.current;
    if (!el) return;
    const cardNode = el.querySelector('.news-card');
    const step = cardNode ? cardNode.offsetWidth + 20 : 310;
    el.scrollTo({ left: idx * step, behavior: 'smooth' });
    setActiveNewsDot(idx);
  };

  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    const cardNode = carouselRef.current.querySelector('.news-card');
    const scrollAmount = cardNode ? cardNode.offsetWidth + 20 : 310;

    if (direction === 'left') {
      if (scrollLeft <= 10) {
        carouselRef.current.scrollTo({ left: scrollWidth, behavior: 'smooth' });
      } else {
        carouselRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      }
    } else {
      if (scrollLeft + clientWidth >= scrollWidth - 10) {
        carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  // Auto scroll every 6s unless hovered
  useEffect(() => {
    if (isCarouselHovered || newsEvents.length <= 3) return;
    const timer = setInterval(() => {
      scrollCarousel('right');
    }, 6000);
    return () => clearInterval(timer);
  }, [isCarouselHovered, newsEvents.length]);

  return (
    <section className="bg-white rounded-2xl border border-gray-100/90 shadow-xs p-5 sm:p-6 transition-all">
      {/* Header with Title, Count badge, and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 m-0">ข่าวสารและประกาศ</h2>
              {newsEvents.length > 0 && (
                <span className="text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">
                  {newsEvents.length} รายการ
                </span>
              )}
            </div>
            <div className="w-10 h-0.5 bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full mt-1" />
          </div>
        </div>

        {/* View all link + arrow buttons */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Link
            to="/news-events"
            className="text-purple-600 hover:text-purple-700 text-xs font-semibold flex items-center gap-1 no-underline transition-colors mr-1"
          >
            <span>ดูข่าวทั้งหมด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          {newsEvents.length > 2 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollCarousel('left')}
                aria-label="เลื่อนซ้าย"
                className="w-7 h-7 rounded-xl border border-purple-100 bg-purple-50/50 hover:bg-purple-100 flex items-center justify-center text-purple-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel('right')}
                aria-label="เลื่อนขวา"
                className="w-7 h-7 rounded-xl border border-purple-100 bg-purple-50/50 hover:bg-purple-100 flex items-center justify-center text-purple-700 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">กำลังโหลดข้อมูลข่าวสารและประกาศ...</span>
        </div>
      ) : newsEvents.length > 0 ? (
        <div>
          {/* Card Carousel */}
          <div
            className="news-carousel-container flex overflow-x-auto gap-5 pb-3 pt-1 px-0.5"
            ref={carouselRef}
            onMouseEnter={() => setIsCarouselHovered(true)}
            onMouseLeave={() => setIsCarouselHovered(false)}
            onScroll={handleNewsScroll}
            style={{
              scrollBehavior: 'smooth',
              scrollSnapType: 'x mandatory',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none'
            }}
          >
            {newsEvents.map((item) => {
              const isPinned = item.is_pinned === true || item.is_pinned === 1;
              const authorName = item.creator?.username || item.author || 'admin';
              const formattedDate = formatThaiDate(item.event_date || item.created_at);
              const imgUrl = getImageUrl(item.image_url);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="news-card group rounded-2xl border border-gray-100/90 bg-white hover:border-purple-200/90 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer relative shrink-0 w-[270px] sm:w-[300px] snap-start"
                >
                  {/* Cover Image or Graphic Banner */}
                  <div className="relative w-full h-36 sm:h-38 overflow-hidden bg-gradient-to-br from-purple-50 via-indigo-50/60 to-purple-100/50">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextSibling) {
                            e.currentTarget.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}

                    {/* Illustrated Aesthetic Placeholder */}
                    <div
                      className={`w-full h-full flex flex-col items-center justify-center relative overflow-hidden ${
                        imgUrl ? 'hidden' : 'flex'
                      }`}
                    >
                      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-purple-200/30 rounded-full blur-xl pointer-events-none" />
                      <div className="absolute -left-6 -top-6 w-20 h-20 bg-indigo-200/30 rounded-full blur-lg pointer-events-none" />

                      <div className="w-11 h-11 rounded-2xl bg-white/95 shadow-xs border border-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative z-1">
                        <Megaphone className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="text-[11px] font-medium text-purple-800/70 mt-2 relative z-1">
                        ข่าวสารคณะ
                      </span>
                    </div>

                    {/* Category Type Badge */}
                    {item.type && (
                      <span className="absolute top-2.5 left-2.5 z-10 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/95 text-purple-800 border border-purple-100 shadow-2xs backdrop-blur-xs">
                        {item.type}
                      </span>
                    )}

                    {/* Pinned Badge */}
                    {isPinned && (
                      <span className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                        <Pin className="w-2.5 h-2.5 fill-white rotate-45" /> ปักหมุด
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex flex-col flex-1 justify-between">
                    <div>
                      {/* Meta Date & Author */}
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium mb-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="text-gray-500">{formattedDate}</span>
                        <span>•</span>
                        <span className="truncate max-w-[100px]">{authorName}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-gray-800 group-hover:text-purple-700 line-clamp-2 leading-snug m-0 mb-1.5 transition-colors">
                        {item.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 m-0 mb-3">
                        {item.description || 'คลิกเพื่ออ่านรายละเอียดประกาศและข้อมูลเพิ่มเติม'}
                      </p>
                    </div>

                    {/* Footer Row */}
                    <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between mt-auto">
                      <span className="text-xs font-semibold text-purple-600 group-hover:text-purple-800 inline-flex items-center gap-1 transition-colors">
                        อ่านต่อ <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                      {item.attachment_url && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded">
                          <FileText className="w-2.5 h-2.5" /> ไฟล์แนบ
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Pagination dots (Only if more than 2 items) */}
          {newsEvents.length > 2 && (
            <div className="flex items-center justify-center gap-1.5 pt-3">
              {newsEvents.slice(0, 10).map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => scrollToNewsIndex(idx)}
                  aria-label={`ไปข่าวที่ ${idx + 1}`}
                  className={`h-1.5 rounded-full border-0 cursor-pointer p-0 transition-all duration-300 shrink-0 ${
                    idx === activeNewsDot ? 'w-4 bg-purple-600' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="py-12 px-4 text-center rounded-2xl bg-purple-50/20 border border-dashed border-purple-100 flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-400">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-gray-700">ยังไม่มีข่าวสารหรือประกาศในขณะนี้</h4>
            <p className="text-xs text-gray-400 max-w-sm">
              เมื่อมีข่าวสารหรือประกาศใหม่จะปรากฏให้เห็นที่นี่
            </p>
          </div>
          {user?.role === 'admin' && (
            <Link to="/news-events">
              <button
                type="button"
                className="mt-2 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-3.5 py-2 font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มข่าวสารหรือประกาศ</span>
              </button>
            </Link>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-start justify-between gap-4 z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedItem.type && (
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${EVENT_TYPE_COLORS[selectedItem.type] || EVENT_TYPE_COLORS['อื่น ๆ']}`}>
                      {selectedItem.type}
                    </span>
                  )}
                  {(selectedItem.is_pinned === true || selectedItem.is_pinned === 1) && (
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
                type="button"
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
                    src={getImageUrl(selectedItem.image_url)}
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
                    <span className="text-gray-400 block text-[10px]">วันที่ประกาศ/กิจกรรม</span>
                    <span className="font-semibold">{formatThaiDate(selectedItem.event_date || selectedItem.created_at)}</span>
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
                {selectedItem.creator?.username ? `โพสต์โดย: ${selectedItem.creator.username}` : ''}
              </span>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium cursor-pointer transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default MonthlyNewsSection;


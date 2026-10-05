import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { resolveBannerSrc } from '../../utils/bannerImage';
import './HomePage.css';
import logo from '../../assets/LASC-SSKRU-1.png';
import sskruBg from '../../assets/SSKRU_BG.png';
import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  MegaphoneIcon,
  AcademicCapIcon,
  BookOpenIcon,
  StarIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { redirectToProfileLogin } from '../../utils/sso';
import NotificationBell from '../../components/NotificationBell';
import UserProfileMenu from '../../components/UserProfileMenu';
import QuickActionBar from '../../components/QuickActionBar';
import FacebookIcon from '../../components/icons/FacebookIcon';
import DigitalJourney from '../../components/home/DigitalJourney';
import FaqAccordion from '../../components/home/FaqAccordion';
import HomeFooter from '../../components/home/HomeFooter';

const DEFAULT_BANNER = {
  id: 'default',
  title: 'ระบบบริหารจัดการการฝึกประสบการณ์วิชาชีพและสหกิจศึกษา',
  subtitle: 'คณะศิลปศาสตร์และวิทยาศาสตร์',
  image_url: null, // ใช้ sskruBg เป็น fallback
  link_url: null,
  link_label: 'ดูรายละเอียด',
};

// แปลง HEX เป็น rgba() สำหรับสร้าง overlay จากค่าที่แอดมินตั้งไว้ต่อแบนเนอร์
const hexToRgba = (hex, alpha) => {
  const v = String(hex || '').replace('#', '');
  const full = v.length === 3 ? v.split('').map(c => c + c).join('') : v.padEnd(6, '0').slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

// คำนวณ CSS background ของ overlay จาก overlay_style/color/opacity ใน DB
const bannerOverlayBackground = (banner) => {
  const opacity = Math.max(0, Math.min(100, Number(banner.overlay_opacity ?? 75))) / 100;
  const color = banner.overlay_color || '#4c1d95';
  const style = banner.overlay_style || 'gradient_purple';
  if (style === 'none' || opacity === 0) return 'none';
  if (style.startsWith('solid')) return hexToRgba(color, opacity);
  // gradient_* / custom — ไล่เข้มด้านล่างจางด้านบนให้อ่านข้อความง่าย
  return `linear-gradient(to top, ${hexToRgba(color, opacity)} 0%, ${hexToRgba(color, opacity * 0.55)} 55%, transparent 100%)`;
};

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({ companies: 0, activeStudents: 0, completedStudents: 0 });
  const [banners, setBanners] = useState([DEFAULT_BANNER]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [urgentAnnouncement, setUrgentAnnouncement] = useState({
    is_active: true,
    text: 'ประกาศด่วน: ระบบเปิดรับคำร้องฝึกงานตั้งแต่วันที่ 1 สิงหาคม เป็นต้นไป',
    link_url: '',
  });
  const carouselRef = useRef(null);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      const cardNode = carouselRef.current.querySelector('.news-card');
      const scrollAmount = cardNode ? cardNode.offsetWidth + 24 : 344;

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
    }
  };

  const [contactInfo, setContactInfo] = useState({
    phone: '',
    email: '',
    name: '',
    facebook_url: '',
    facebook_name: ''
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    api.get('/public/announcements')
      .then(res => setAnnouncements(res.data.data || []))
      .catch(() => setAnnouncements([]));

    api.get('/public/stats')
      .then(res => {
        const d = res.data.data || {};
        setStats({
          companies: d.companies || 0,
          activeStudents: d.activeStudents || 0,
          completedStudents: d.completedStudents || 0,
        });
      })
      .catch(() => {});

    api.get('/public/contact')
      .then(res => {
        if (res.data && res.data.data) {
          setContactInfo(res.data.data);
        }
      })
      .catch(() => {});

    api.get('/public/banners')
      .then(res => {
        const list = res.data?.data || [];
        if (list.length > 0) setBanners(list);
      })
      .catch(() => {});

    api.get('/public/settings')
      .then(res => {
        const announcement = res.data?.data?.urgent_announcement;
        if (announcement && typeof announcement === 'object') {
          setUrgentAnnouncement({
            is_active: !!announcement.is_active,
            text: announcement.text || '',
            link_url: announcement.link_url || '',
          });
        }
      })
      .catch(() => {});
  }, []);

  // Autoplay Hero Banner Carousel (หยุดเมื่อ hover) — สไลด์เดียวไม่ต้องหมุน
  useEffect(() => {
    if (isHeroHovered || banners.length <= 1) return undefined;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isHeroHovered, banners.length]);

  const goToSlide = (index) => setActiveSlide((index + banners.length) % banners.length);

  // Autoplay News Carousel Effect
  useEffect(() => {
    let interval;
    if (!isCarouselHovered && announcements.length > 0) {
      interval = setInterval(() => {
        scrollCarousel('right');
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isCarouselHovered, announcements]);

  const normalizedRole = String(user?.role || '').toLowerCase();
  const navAction = !user
    ? { label: 'เข้าสู่ระบบ', to: null }
    : normalizedRole === 'admin'
      ? { label: 'แดชบอร์ด', to: '/admin-dashboard' }
      : (normalizedRole === 'advisor' || normalizedRole === 'teacher')
        ? { label: 'แดชบอร์ด', to: '/advisor-dashboard' }
        : { label: 'แดชบอร์ด', to: '/dashboard' };

  const navButtonClass = 'rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold p-2.5 md:px-5 md:py-2.5 flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition cursor-pointer border-none no-underline';


  // ตัดคำนำหน้า "ประกาศด่วน:" ออกเพราะมี badge กำกับแล้ว
  const announcementText = (urgentAnnouncement.text || '').replace(/^ประกาศด่วน\s*[:：]?\s*/, '');

  // normalize ลิงก์เพจ — เติม https:// ให้อัตโนมัติ และปล่อยเฉพาะโปรโตคอล http/https (กัน javascript:)
  const facebookHref = (() => {
    const raw = (contactInfo.facebook_url || '').trim();
    if (!raw) return '';
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  })();

  return (
    <div className="home-container bg-slate-50/50">
      {/* Utility Bar */}
      <div className="bg-purple-950 text-purple-200 text-xs py-2 px-4 md:px-6 flex justify-end items-center gap-4">
        {facebookHref ? (
          <a href={facebookHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-purple-200 hover:text-white transition-colors no-underline">
            <FacebookIcon className="w-3.5 h-3.5 text-amber-300" />
            {contactInfo.facebook_name || 'Facebook'}
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <PhoneIcon className="w-3.5 h-3.5 text-amber-300" />
            {contactInfo.phone ? `ติดต่อสอบถาม ${contactInfo.phone}` : 'ติดต่อสอบถาม 02-XXX-XXXX'}
          </span>
        )}
        <span className="hidden sm:inline-flex items-center gap-1.5">
          <EnvelopeIcon className="w-3.5 h-3.5 text-amber-300" />
          {contactInfo.email || 'contact@example.com'}
        </span>
      </div>

      {/* Navbar — glassmorphism sticky */}
      <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-purple-100/60 shadow-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 min-w-0 no-underline">
            <img src={logo} alt="LASC Logo" className="h-10 sm:h-12 w-auto object-contain shrink-0" />
            <span className="hidden sm:block font-extrabold text-slate-900 text-base md:text-lg whitespace-nowrap" style={{ fontFamily: '"Prompt", "Kanit", "Inter", sans-serif' }}>
              ระบบฝึกประสบการณ์วิชาชีพ
            </span>
          </Link>

          <div className="flex items-center gap-2.5 shrink-0">
            {!user ? (
              <button type="button" onClick={() => redirectToProfileLogin()} className={navButtonClass}>
                <span>{navAction.label}</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <Link to={navAction.to} className={navButtonClass} aria-label="ไปยังแดชบอร์ด" title="ไปยังแดชบอร์ด">
                  <Squares2X2Icon className="w-4 h-4 md:hidden" />
                  <span className="hidden md:inline">{navAction.label}</span>
                  <ArrowRightIcon className="hidden md:inline w-3.5 h-3.5" />
                </Link>
                <NotificationBell />
                <UserProfileMenu user={user} compact={true} />
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Slim Announcement Bar — sub-navbar แนบใต้ navbar (เนื้อหาจาก site_settings.urgent_announcement) */}
      {urgentAnnouncement.is_active && urgentAnnouncement.text && (
        <div className="bg-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-center gap-2.5 text-xs">
            <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
              <MegaphoneIcon className="w-3 h-3" />
              ประกาศด่วน
            </span>
            {urgentAnnouncement.link_url ? (
              <a
                href={urgentAnnouncement.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-purple-700 hover:underline no-underline truncate"
              >
                {announcementText}
              </a>
            ) : (
              <span className="text-slate-600 truncate">{announcementText}</span>
            )}
          </div>
        </div>
      )}

      {/* Hero Banner Carousel — สไลด์ประชาสัมพันธ์จากระบบ (fallback = อาคารจุฬาภรณวลัยลักษณ์) */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-2">
        <div
          className="relative h-[calc(100svh-255px)] min-h-[320px] md:h-auto md:aspect-[21/9] rounded-2xl md:rounded-3xl overflow-hidden shadow-md md:shadow-2xl border border-purple-100/50 bg-slate-100"
          onMouseEnter={() => setIsHeroHovered(true)}
          onMouseLeave={() => setIsHeroHovered(false)}
        >
          {banners.map((banner, index) => {
            // โหมดโปสเตอร์ = ภาพมีข้อความในตัวแล้ว → ซ่อนข้อความทับ/overlay ทั้งหมด
            const isPoster = banner.content_mode === 'poster';
            const showText = !isPoster && banner.show_text_overlay !== 0 && banner.show_text_overlay !== false;
            const bannerImage = (
              <picture className="block w-full h-full">
                {banner.image_url_mobile && (
                  <source media="(max-width: 767px)" srcSet={resolveBannerSrc(banner.image_url_mobile, '')} />
                )}
                {banner.image_url_tablet && (
                  <source media="(min-width: 768px) and (max-width: 1023px)" srcSet={resolveBannerSrc(banner.image_url_tablet, '')} />
                )}
                <img
                  src={resolveBannerSrc(banner.image_url, sskruBg)}
                  referrerPolicy="no-referrer"
                  alt={banner.title || 'แบนเนอร์ประชาสัมพันธ์'}
                  onError={(e) => {
                    if (e.currentTarget.src !== sskruBg) e.currentTarget.src = sskruBg;
                  }}
                  className="w-full h-full object-cover object-center transition-transform duration-700"
                />
              </picture>
            );
            return (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ${index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              aria-hidden={index !== activeSlide}
            >
              {isPoster && banner.link_url ? (
                <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full cursor-pointer" aria-label={banner.link_label || 'ดูรายละเอียด'}>
                  {bannerImage}
                </a>
              ) : bannerImage}
              {/* Overlay — สี/รูปแบบ/ความทึบตั้งค่าได้ต่อแบนเนอร์จากหน้า admin */}
              {showText && (
                <div className="absolute inset-0" style={{ background: bannerOverlayBackground(banner) }} />
              )}
              {/* เงาดำจางด้านล่าง — ให้อ่านตัวหนังสือชัดโดยไม่ต้องขยายฟอนต์ */}
              {showText && (
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
              )}
              {showText && (
                <div className="absolute inset-x-0 bottom-0 p-4 pb-8 md:p-8 md:pb-10 text-white">
                  <h1
                    className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-snug sm:leading-tight drop-shadow-sm text-white m-0"
                    style={banner.title_color ? { color: banner.title_color } : undefined}
                  >
                    {banner.title}
                  </h1>
                  {index === 0 && banner.id === 'default' && (
                    <p className="mt-1.5 text-purple-100/90 text-xs sm:text-sm md:text-base max-w-2xl font-light leading-relaxed m-0">
                      เชื่อมโยงนักศึกษา อาจารย์ และสถานประกอบการชั้นนำ ยกระดับทักษะสู่วิชาชีพในอนาคต
                    </p>
                  )}
                  {banner.subtitle && (
                    <p
                      className="mt-1 text-xs sm:text-sm md:text-base text-slate-100/90 max-w-2xl leading-relaxed m-0 drop-shadow-sm"
                      style={banner.subtitle_color ? { color: banner.subtitle_color } : undefined}
                    >
                      {banner.subtitle}
                    </p>
                  )}
                  {banner.link_url && (
                    <a
                      href={banner.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-white/90 hover:text-white underline underline-offset-4 transition no-underline drop-shadow-sm"
                    >
                      {banner.link_label || 'ดูรายละเอียด'}
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
            );
          })}

          {/* Carousel controls — แสดงเมื่อมีมากกว่า 1 สไลด์ */}
          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => goToSlide(activeSlide - 1)}
                aria-label="สไลด์ก่อนหน้า"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 p-1 bg-transparent hover:bg-transparent text-white/80 hover:text-white transition-all border-0 shadow-none appearance-none outline-none focus:outline-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] cursor-pointer"
              >
                <ChevronLeftIcon className="w-3 h-3 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => goToSlide(activeSlide + 1)}
                aria-label="สไลด์ถัดไป"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 p-1 bg-transparent hover:bg-transparent text-white/80 hover:text-white transition-all border-0 shadow-none appearance-none outline-none focus:outline-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] cursor-pointer"
              >
                <ChevronRightIcon className="w-3 h-3 stroke-[2.5]" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => goToSlide(index)}
                    aria-label={`ไปสไลด์ที่ ${index + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer border-0 ${index === activeSlide ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/75'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions — ทางลัดยื่นคำร้อง/ติดตามสถานะ/ค้นหาบริษัท/ดาวน์โหลดฟอร์ม */}
      <QuickActionBar />

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <section className="pt-4 pb-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-4 sm:mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 m-0">ข่าวสารและประกาศ</h2>
                <div className="w-14 h-1 bg-purple-600 rounded-full mt-2.5" />
              </div>
              <div className="flex items-center gap-4">
                <Link to="/news" className="text-sm font-semibold text-purple-700 hover:text-purple-900 no-underline">
                  ดูข่าวทั้งหมด →
                </Link>
                <div className="flex gap-2">
                  <button
                    onClick={() => scrollCarousel('left')}
                    className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center cursor-pointer text-gray-500 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all"
                    aria-label="เลื่อนซ้าย"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => scrollCarousel('right')}
                    className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center cursor-pointer text-gray-500 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all"
                    aria-label="เลื่อนขวา"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div
              className="news-carousel-container flex overflow-x-auto gap-6 pb-4"
              ref={carouselRef}
              onMouseEnter={() => setIsCarouselHovered(true)}
              onMouseLeave={() => setIsCarouselHovered(false)}
              style={{ scrollBehavior: 'smooth', scrollSnapType: 'x mandatory', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
            >
              {announcements.slice(0, 10).map((news) => (
                <div
                  key={news.id}
                  className="news-card group rounded-2xl border border-gray-100 bg-white hover:border-purple-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer relative"
                  onClick={() => navigate(`/news/${news.id}`)}
                  style={{ flex: '0 0 auto', width: 'calc((100% - 48px) / 3)', minWidth: '280px', scrollSnapAlign: 'start' }}
                >
                  {news.is_pinned === 1 && (
                    <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 border border-amber-200/50 backdrop-blur-sm text-[11px] font-bold px-2.5 py-1 rounded-full">
                      <MapPinIcon className="w-3 h-3" /> ปักหมุด
                    </span>
                  )}
                  {news.coverImage ? (
                    <img src={news.coverImage} alt={news.title} referrerPolicy="no-referrer" className="w-full aspect-[3/2] object-cover" />
                  ) : (
                    <div className="w-full aspect-[3/2] bg-gradient-to-br from-purple-100 via-indigo-50 to-purple-50 flex items-center justify-center">
                      <span className="text-purple-300 text-sm font-medium">ไม่มีรูปภาพ</span>
                    </div>
                  )}

                  <div className="p-5 flex flex-col flex-1">
                    <p className="text-xs text-gray-400 mb-2 m-0">
                      {news.author || 'admin'} — {new Date(news.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <h3 className="text-base font-bold text-gray-800 group-hover:text-purple-700 line-clamp-2 leading-snug m-0 mb-2 transition-colors">
                      {news.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 m-0 flex-1">
                      {news.content}
                    </p>
                    <span className="text-sm font-bold text-purple-600 group-hover:text-purple-800 mt-4 inline-flex items-center gap-1 transition-colors">
                      อ่านต่อ <ArrowRightIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ขั้นตอนดิจิทัล 100% Paperless */}
      <DigitalJourney />

      {/* Recommended Companies Gateway */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            onClick={() => navigate('/companies')}
            className="group bg-white border border-gray-100 hover:border-purple-200 rounded-3xl p-8 sm:p-10 flex flex-wrap items-center justify-between gap-6 cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-center gap-5 flex-1 min-w-[280px]">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <BuildingOffice2Icon className="w-8 h-8" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-purple-700 bg-purple-50 border border-purple-200/70 px-3 py-1 rounded-full text-xs font-bold mb-2">
                  <SparklesIcon className="w-3.5 h-3.5" /> แนะนำที่ฝึกงานจากรุ่นพี่
                </div>
                <h3 className="m-0 mb-1.5 text-2xl font-extrabold text-slate-900 tracking-tight">
                  สถานประกอบการแนะนำ
                </h3>
                <p className="m-0 text-sm text-slate-500 leading-relaxed max-w-xl">
                  ค้นหาและดูรายชื่อสถานที่ฝึกงานจริงจากรุ่นพี่ที่ผ่านการฝึกงาน เพื่อเป็นแนวทางในการเลือกสถานที่ฝึกประสบการณ์วิชาชีพ
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:from-purple-700 group-hover:to-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md shadow-purple-500/20 transition-all">
              ดูสถานประกอบการทั้งหมด
              <ArrowRightIcon className="w-4 h-4" />
            </span>
          </div>
        </div>
      </section>

      {/* Impact Stats + Resources Hub */}
      <section className="py-12 sm:py-16 border-t border-purple-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stats Grid */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 m-0">ภาพรวมความสำเร็จของระบบ</h2>
            <div className="h-1 w-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mt-2.5 mb-0" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-12">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all p-6">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <BuildingOffice2Icon className="w-6 h-6" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {stats.companies > 0 ? `${stats.companies}+` : '50+'}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">สถานประกอบการชั้นนำที่ร่วมมือ</div>
            </div>

            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all p-6">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <AcademicCapIcon className="w-6 h-6" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {stats.activeStudents > 0 ? `${stats.activeStudents}+` : '200+'}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">นักศึกษาที่กำลังฝึกประสบการณ์</div>
              {stats.completedStudents > 0 && (
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">(สำเร็จการฝึกงานแล้วสะสม {stats.completedStudents} คน)</div>
              )}
            </div>

            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all p-6">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <BookOpenIcon className="w-6 h-6" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">12</div>
              <div className="text-xs text-slate-500 font-medium mt-1">สาขาวิชา ครอบคลุมทุกหลักสูตรในคณะ</div>
            </div>

            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all p-6">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <StarIcon className="w-6 h-6" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">98%</div>
              <div className="text-xs text-slate-500 font-medium mt-1">ผลการประเมินระดับดีเยี่ยม</div>
            </div>
          </div>

          {/* FAQ Accordion */}
          <FaqAccordion />
        </div>
      </section>

      {/* Official University Footer */}
      <HomeFooter contactInfo={contactInfo} facebookHref={facebookHref} />
    </div>
  );
};

export default HomePage;

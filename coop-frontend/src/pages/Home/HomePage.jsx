import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { resolveBannerSrc } from '../../utils/bannerImage';
import './HomePage.css';
import logo from '../../assets/LASC-SSKRU-1.png';
import sskruBg from '../../assets/SSKRU_BG.png';
import {
  MapPinIcon,
  ArrowRightIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  AcademicCapIcon,
  BookOpenIcon,
  StarIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import {
  ArrowRight, ChevronLeft, ChevronRight, Menu, Home as HomeLucide, LayoutDashboard, Newspaper,
  Search, HelpCircle, ClipboardList, FilePlus2, Bell,
} from 'lucide-react';
import MobileNavDrawer from '../../components/MobileNavDrawer';
import { redirectToProfileLogin } from '../../utils/sso';
import NotificationBell from '../../components/NotificationBell';
import UserProfileMenu from '../../components/UserProfileMenu';
import UtilityBar from '../../components/UtilityBar';
import SubNav from '../../components/SubNav';
import DigitalJourney from '../../components/home/DigitalJourney';
import FaqAccordion from '../../components/home/FaqAccordion';
import HomeFooter from '../../components/home/HomeFooter';
import QuickActionBar from '../../components/QuickActionBar';
import MobileTabBar from '../../components/MobileTabBar';

const DEFAULT_BANNER = {
  id: 'default',
  title: 'ระบบบริหารจัดการการฝึกประสบการณ์วิชาชีพและสหกิจศึกษา',
  subtitle: 'คณะศิลปศาสตร์และวิทยาศาสตร์',
  image_url: null, // ใช้ sskruBg เป็น fallback
  link_url: null,
  link_label: 'ดูรายละเอียด',
};

// สไลด์สำรองจากไฟล์ใน public/banners (ใช้เมื่อยังไม่มีแบนเนอร์ในฐานข้อมูล) — ข้อความอยู่ในชั้น HTML ไม่ฝังในรูป
const BANNER_BASE = import.meta.env.BASE_URL || '/';
const MOCK_BANNERS = [
  {
    id: 'mock-1',
    title: 'รับสมัครที่ฝึกงานประจำปีการศึกษา 2569',
    subtitle: 'ยื่นคำร้องออนไลน์ ติดตามสถานะได้ทุกขั้นตอน',
    static_src: `${BANNER_BASE}banners/hero-auditorium.png`,
    link_url: null,
    link_label: 'ดูรายละเอียด',
    show_text_overlay: 1,
    content_mode: 'overlay',
  },
  {
    id: 'mock-2',
    title: 'ร่วมเรียนรู้และก้าวสู่อาชีพ',
    subtitle: 'มหาวิทยาลัยราชภัฏศรีสะเกษ คณะศิลปศาสตร์และวิทยาศาสตร์',
    static_src: `${BANNER_BASE}banners/hero-triptych.png`,
    link_url: null,
    link_label: 'ดูรายละเอียด',
    show_text_overlay: 1,
    content_mode: 'overlay',
  },
];

// ข่าวสำรองสำหรับดูหน้าตา (ใช้เมื่อยังไม่มีประกาศในฐานข้อมูล) — รูปปกอยู่ใน public/news
const MOCK_NEWS = [
  { id: 'mock-news-1', isMock: true, title: 'เปิดรับคำร้องฝึกประสบการณ์วิชาชีพ ภาคการศึกษาที่ 1/2569', content: 'ตั้งแต่วันนี้ถึง 20 พฤศจิกายน 2569 นักศึกษาสามารถยื่นคำร้องฝึกประสบการณ์วิชาชีพผ่านระบบออนไลน์', coverImage: `${BANNER_BASE}news/news-people-1.svg`, created_at: '2026-11-03', is_pinned: 1, category: 'ประกาศ' },
  { id: 'mock-news-2', isMock: true, title: 'กำหนดการอบรมเตรียมความพร้อมก่อนออกฝึกงาน', content: 'นักศึกษาที่จะออกฝึกงานต้องเข้าร่วมกิจกรรมเตรียมความพร้อมตามกำหนดการที่แจ้งไว้', coverImage: `${BANNER_BASE}news/news-people-2.svg`, created_at: '2026-11-01', is_pinned: 0, category: 'กิจกรรม' },
  { id: 'mock-news-3', isMock: true, title: 'อัปเดตขั้นตอนการส่งหนังสือตอบรับจากสถานประกอบการ', content: 'สถานประกอบการตอบรับนักศึกษาผ่านลิงก์ทางอีเมล กรุณาตรวจสอบกล่องจดหมายของท่าน', coverImage: `${BANNER_BASE}news/news-people-3.svg`, created_at: '2026-10-28', is_pinned: 0, category: 'แจ้งเตือน' },
  { id: 'mock-news-4', isMock: true, title: 'อาจารย์ที่ปรึกษานัดนิเทศนักศึกษาฝึกงานรอบเดือนพฤศจิกายน', content: 'อาจารย์ที่ปรึกษาจะเข้านิเทศนักศึกษาตามตารางที่ประสานไว้ล่วงหน้า', coverImage: `${BANNER_BASE}news/news-people-4.svg`, created_at: '2026-10-25', is_pinned: 0, category: 'นิเทศ' },
  { id: 'mock-news-5', isMock: true, title: 'ขอบคุณสถานประกอบการที่ร่วมรับนักศึกษาฝึกงานปีการศึกษา 2569', content: 'ขอขอบคุณสถานประกอบการทุกแห่งที่ให้โอกาสนักศึกษาได้เรียนรู้และพัฒนาทักษะในการทำงานจริง', coverImage: `${BANNER_BASE}news/news-people-5.svg`, created_at: '2026-10-20', is_pinned: 0, category: 'ขอบคุณ' },
];

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({ companies: 0, activeStudents: 0, completedStudents: 0 });
  const [banners, setBanners] = useState([DEFAULT_BANNER, ...MOCK_BANNERS]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const carouselRef = useRef(null);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const [activeNewsDot, setActiveNewsDot] = useState(0);
  const newsSectionRef = useRef(null);
  const [newsInView, setNewsInView] = useState(false);
  useEffect(() => {
    const el = newsSectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setNewsInView(true); return undefined; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNewsInView(true); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [announcements.length]);

  // แถบข่าว: เลื่อนด้วย transform บน track (ลื่นกว่า scroll) — ระยะขยับวัดจากการ์ดจริงใน DOM
  const [newsStep, setNewsStep] = useState(0);
  const [newsVisible, setNewsVisible] = useState(1);
  const [newsIndex, setNewsIndex] = useState(0);
  const [newsAnimate, setNewsAnimate] = useState(true);
  const newsCount = announcements.slice(0, 10).length;
  const newsMaxIndex = Math.max(0, newsCount - newsVisible);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return undefined;
    const measure = () => {
      const track = el.querySelector('.news-track');
      const first = track?.querySelector('.home-news-slide');
      if (!track || !first) return;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const step = first.offsetWidth + gap;
      setNewsStep(step);
      setNewsVisible(Math.max(1, Math.floor((el.clientWidth + gap) / step)));
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [announcements.length]);

  useEffect(() => {
    setNewsIndex((i) => Math.min(i, newsMaxIndex));
  }, [newsMaxIndex]);

  const slideTo = (idx) => {
    setNewsAnimate(true);
    setNewsIndex(Math.max(0, Math.min(idx, newsMaxIndex)));
  };
  // วนกลับโดยไม่แอนิเมชันย้อนกลับ แล้วเปิดแอนิเมชันคืนหลังเฟรมถัดไป
  const jumpWithoutAnimation = (idx) => {
    setNewsAnimate(false);
    setNewsIndex(idx);
    requestAnimationFrame(() => requestAnimationFrame(() => setNewsAnimate(true)));
  };
  // เลื่อนไปข้างหน้าต่อเนื่อง: ถึงสไลด์สุดท้ายแล้วเลื่อนต่อไปยังสำเนาของสไลด์แรก
  const goNext = () => {
    if (newsIndex > newsMaxIndex) return;
    setNewsAnimate(true);
    setNewsIndex(newsIndex + 1);
  };
  // เมื่อเลื่อนมาถึงสำเนาแล้ว รอให้แอนิเมชันจบ แล้วกระโดดกลับสไลด์จริงแรกโดยไม่มีแอนิเมชัน
  useEffect(() => {
    if (newsIndex <= newsMaxIndex) return undefined;
    const t = setTimeout(() => jumpWithoutAnimation(0), 1050);
    return () => clearTimeout(t);
  }, [newsIndex, newsMaxIndex]);
  const goPrev = () => {
    if (newsIndex <= 0) jumpWithoutAnimation(newsMaxIndex);
    else slideTo(newsIndex - 1);
  };

  // เลื่อนอัตโนมัติทุก 4 วินาที หยุดเมื่อเอาเมาส์ชี้
  useEffect(() => {
    if (isCarouselHovered || newsMaxIndex === 0) return undefined;
    const t = setInterval(goNext, 4000);
    return () => clearInterval(t);
  }, [isCarouselHovered, newsIndex, newsMaxIndex]);

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
      .then(res => {
        const list = res.data?.data || [];
        setAnnouncements(list.length > 0 ? list : MOCK_NEWS);
      })
      .catch(() => setAnnouncements(MOCK_NEWS));

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

  }, []);

  // Autoplay Hero Banner Carousel (หยุดเมื่อ hover) — สไลด์เดียวไม่ต้องหมุน
  useEffect(() => {
    if (isHeroHovered || banners.length <= 1) return undefined;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isHeroHovered, banners.length, activeSlide]);

  const goToSlide = (index) => setActiveSlide((index + banners.length) % banners.length);


  const normalizedRole = String(user?.role || '').toLowerCase();
  const navAction = !user
    ? { label: 'เข้าสู่ระบบ', to: null }
    : normalizedRole === 'admin'
      ? { label: 'แดชบอร์ด', to: '/admin-dashboard' }
      : (normalizedRole === 'advisor' || normalizedRole === 'teacher')
        ? { label: 'แดชบอร์ด', to: '/advisor-dashboard' }
        : { label: 'แดชบอร์ด', to: '/dashboard' };

  const homeRoleLabel =
    normalizedRole === 'admin' ? 'ผู้ดูแลระบบ'
      : (normalizedRole === 'advisor' || normalizedRole === 'teacher') ? 'อาจารย์ที่ปรึกษา'
        : user ? 'นักศึกษา' : '';

  const notificationsPath = normalizedRole === 'admin'
    ? '/admin-dashboard/notifications'
    : normalizedRole === 'student' ? '/dashboard/notifications' : null;

  // แถบล่าง (MobileTabBar) — แสดงคู่กับแฮมเบอร์เกอร์ (จอ < 1024px) เพื่อให้เข้าเมนูหลักได้จากนิ้วโป้ง
  const { pathname } = useLocation();
  const tabItems = [
    { key: 'home', label: 'หน้าหลัก', Icon: HomeLucide, to: '/', active: pathname === '/' },
    user
      ? { key: 'dashboard', label: 'แดชบอร์ด', Icon: LayoutDashboard, to: navAction.to, active: false }
      : { key: 'login', label: 'เข้าสู่ระบบ', Icon: ArrowRightIcon, to: '/login', active: false },
    { key: 'companies', label: 'ที่ฝึกงาน', Icon: Search, to: '/companies', active: pathname.startsWith('/companies') },
    {
      key: 'news',
      label: 'ข่าวสาร',
      Icon: Newspaper,
      to: '/news',
      active: false,
      onClick: () => {
        const el = document.getElementById('home-news');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else navigate('/news');
      },
    },
  ];

  // เมนูใน Drawer (จอ < 1024px) — รวมปุ่ม "แดชบอร์ด" และลิงก์หลักที่ถูกซ่อนจาก Navbar
  const drawerItems = [
    { key: 'home', label: 'หน้าหลัก', Icon: HomeLucide, to: '/', active: true },
    ...(user ? [{ key: 'dashboard', label: 'แดชบอร์ด', Icon: LayoutDashboard, to: navAction.to }] : []),
    ...(user && normalizedRole === 'student'
      ? [
          { key: 'new-request', label: 'ยื่นคำร้องใหม่', Icon: FilePlus2, to: '/dashboard/new-request' },
          { key: 'my-requests', label: 'คำร้องของฉัน', Icon: ClipboardList, to: '/dashboard/my-requests' },
        ]
      : []),
    { key: 'news', label: 'ข่าวสารและประกาศ', Icon: Newspaper, to: '/news' },
    { key: 'companies', label: 'ค้นหาที่ฝึกงาน', Icon: Search, to: '/companies' },
    {
      key: 'faq',
      label: 'คำถามพบบ่อย',
      Icon: HelpCircle,
      onClick: () => document.getElementById('home-faq')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    },
    ...(user && notificationsPath ? [{ key: 'notifications', label: 'การแจ้งเตือน', Icon: Bell, to: notificationsPath }] : []),
  ];

  const navButtonClass ='site-nav-cta rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold p-2.5 md:px-5 md:py-2.5 flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition cursor-pointer border-none no-underline';



  // normalize ลิงก์เพจ — เติม https:// ให้อัตโนมัติ และปล่อยเฉพาะโปรโตคอล http/https (กัน javascript:)
  const facebookHref = (() => {
    const raw = (contactInfo.facebook_url || '').trim();
    if (!raw) return '';
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  })();

  return (
    <div className="home-container home-theme bg-slate-50/50">
      <UtilityBar />

      {/* Navbar — glassmorphism sticky */}
      <nav className="site-navbar sticky top-0 z-40">
        <div className="w-full px-3 sm:px-6 h-full flex items-center justify-between gap-3">
          <Link to="/" className="mobile-top-logo flex items-center min-w-0 flex-shrink gap-2 sm:gap-2.5 md:gap-3 no-underline">
            <img
              src={logo}
              alt="LASC Logo"
              className="w-7 h-7 min-[390px]:w-8 min-[390px]:h-8 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 object-contain shrink-0"
            />
            <span
              className="site-nav-title block font-extrabold text-white text-sm min-[390px]:text-base md:text-lg lg:text-xl xl:text-[22px] 2xl:text-2xl leading-tight whitespace-nowrap tracking-tight truncate"
              style={{ fontFamily: '"Prompt", "Kanit", "Inter", sans-serif' }}
            >
              ระบบฝึกประสบการณ์วิชาชีพ
            </span>
          </Link>

          {/* จอ < 1024px: ซ่อนวิดเจ็ตฝั่งขวาทั้งหมด เหลือเฉพาะปุ่มแฮมเบอร์เกอร์ — ทุกอย่างย้ายไปอยู่ใน Drawer */}
          <button
            type="button"
            className="site-hamburger lg:hidden shrink-0"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="เปิดเมนู"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
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

      <MobileNavDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
        roleLabel={homeRoleLabel}
        subline={user && normalizedRole === 'student' ? (user.studentId || user.student_id || user.username || '') : ''}
        items={drawerItems}
        onLogout={() => window.dispatchEvent(new CustomEvent('request-logout-confirm'))}
        onLogin={() => redirectToProfileLogin()}
      />

      <SubNav />

      <MobileTabBar items={tabItems} onOpenMenu={() => setIsDrawerOpen(true)} menuActive={isDrawerOpen} />

      {/* Hero Banner Carousel — สไลด์ประชาสัมพันธ์จากระบบ (fallback = อาคารจุฬาภรณวลัยลักษณ์) */}
      <div className="relative mx-auto max-w-7xl px-0 sm:px-6 lg:px-8 mt-0 sm:mt-8">
        <div
          className="home-hero-frame relative h-[44svh] min-h-[240px] sm:h-[calc(100svh-255px)] sm:min-h-[320px] md:h-auto md:aspect-[21/9] rounded-none sm:rounded-2xl md:rounded-3xl overflow-hidden shadow-md md:shadow-2xl sm:border sm:border-purple-100/50 bg-slate-100"
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
                  src={banner.static_src || resolveBannerSrc(banner.image_url, sskruBg)}
                  referrerPolicy="no-referrer"
                  alt={banner.title || 'แบนเนอร์ประชาสัมพันธ์'}
                  onError={(e) => {
                    if (e.currentTarget.src !== sskruBg) e.currentTarget.src = sskruBg;
                  }}
                  className={`w-full h-full object-cover object-center transition-transform duration-700 ${index === activeSlide ? 'home-ken-burns' : ''}`}
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
                <div className="home-hero-tint absolute inset-0" style={{ background: bannerOverlayBackground(banner) }} />
              )}
              {/* เงาดำจางด้านล่าง — ให้อ่านตัวหนังสือชัดโดยไม่ต้องขยายฟอนต์ */}
              {showText && (
                <div className="home-hero-tint absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
              )}
              {showText && (
                <div className="hidden absolute inset-x-0 bottom-0 p-4 pb-8 md:p-8 md:pb-10 text-white">
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

          {/* แถบเวลาบอกรอบสไลด์ 5 วินาที — รีสตาร์ตทุกครั้งที่เปลี่ยนสไลด์ และหยุดเมื่อเอาเมาส์ชี้ */}
          {banners.length > 1 && (
            <div className="home-hero-progress-track" aria-hidden="true">
              <div key={activeSlide} className={`home-hero-progress-bar ${isHeroHovered ? 'is-paused' : ''}`} />
            </div>
          )}

          {/* Carousel controls — แสดงเมื่อมีมากกว่า 1 สไลด์ */}
          {banners.length > 1 && (
            <>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => goToSlide(index)}
                    aria-label={`ไปสไลด์ที่ ${index + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer border-0 p-0 ${index === activeSlide ? 'w-7 bg-[#EAB308]' : 'w-1.5 bg-[#DDD6FE] hover:bg-white'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>


      {/* Quick Actions — ทางลัดยื่นคำร้อง/ติดตามสถานะ/ค้นหาบริษัท/คำถามพบบ่อย */}
      <QuickActionBar />

      {/* Announcements Section — แถบข่าวแบบ track + transform ตามแบบอ้างอิง */}
      {announcements.length > 0 && (
        <section id="home-news" ref={newsSectionRef} className="pt-8 pb-10 sm:pt-12 sm:pb-16 scroll-mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4 mb-5 sm:mb-7">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 m-0">ข่าวสารและประกาศ</h2>
              <div className="flex items-center gap-5 sm:gap-6 shrink-0">
                <button type="button" onClick={() => navigate('/news')} className="news-more-link">
                  ดูข่าวทั้งหมด
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={goPrev} aria-label="ก่อนหน้า" className="news-nav-btn">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={goNext} aria-label="ถัดไป" className="news-nav-btn">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div
              className="w-full overflow-hidden"
              ref={carouselRef}
              onMouseEnter={() => setIsCarouselHovered(true)}
              onMouseLeave={() => setIsCarouselHovered(false)}
            >
              <div
                className="news-track flex items-stretch gap-5 md:gap-[30px] will-change-transform"
                style={{
                  transform: `translate3d(-${newsIndex * newsStep}px, 0, 0)`,
                  transition: newsAnimate ? 'transform 1000ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
                }}
              >
                {[...announcements.slice(0, 10), ...(newsMaxIndex > 0 ? announcements.slice(0, newsVisible) : [])].map((news, idx) => (
                  <div
                    key={idx < newsCount ? news.id : news.id + '-clone'}
                    className={'home-news-slide shrink-0' + (newsInView ? ' is-in' : '')}
                    style={{ transitionDelay: (idx * 80) + 'ms' }}
                  >
                    <article
                      className="home-news-card group flex flex-col min-h-[480px] sm:min-h-[540px] lg:min-h-[587px] h-full overflow-hidden cursor-pointer"
                      onClick={() => navigate(news.isMock ? '/news' : '/news/' + news.id)}
                    >
                      <div className="relative h-[240px] sm:h-[300px] lg:h-[360px] w-full shrink-0 overflow-hidden bg-slate-100">
                        {news.coverImage ? (
                          <img
                            src={news.coverImage}
                            alt={news.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">ไม่มีรูปภาพ</div>
                        )}
                        {news.is_pinned === 1 && (
                          <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-violet-100 bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm">
                            <MapPinIcon className="w-4 h-4 text-violet-600" />
                            <span className="text-[11px] font-medium text-slate-800">ปักหมุด</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4 sm:p-6">
                        <div className="mb-4 inline-flex w-fit max-w-full items-center gap-2 bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          <span className="truncate">{news.author || 'ผู้ดูแลระบบ'}</span>
                          <span className="h-4 w-px shrink-0 bg-slate-300" aria-hidden="true" />
                          <span className="shrink-0">{new Date(news.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <h3 className="home-news-title mb-4 line-clamp-2 min-h-[3.25rem] text-lg sm:text-xl font-bold leading-snug text-slate-900 transition-colors group-hover:text-violet-700">
                          {news.title}
                        </h3>
                        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500">{news.content}</p>
                        <div className="mt-auto pt-2 text-sm font-semibold text-slate-900 transition-colors group-hover:text-violet-700">
                          <span>อ่านต่อ</span>
                        </div>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </div>

            {/* จุดบอกตำแหน่ง — ตำแหน่งที่แสดงอยู่เป็นแคปซูลทอง */}
            {newsMaxIndex > 0 && (
              <div className="flex items-center gap-1.5 mt-5">
                {Array.from({ length: newsMaxIndex + 1 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => slideTo(i)}
                    aria-label={`ไปตำแหน่งที่ ${i + 1}`}
                    className={`h-1.5 rounded-full border-0 cursor-pointer p-0 transition-all duration-300 shrink-0 ${i === Math.min(newsIndex, newsMaxIndex) ? 'w-7 bg-[#EAB308]' : 'w-1.5 bg-[#DDD6FE] hover:bg-violet-400'}`}
                  />
                ))}
              </div>
            )}
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
            className="home-cta-card group rounded-3xl p-8 sm:p-10 flex flex-wrap items-center justify-between gap-6 cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-center gap-5 flex-1 min-w-[280px]">
              <div className="w-16 h-16 rounded-2xl bg-[#3B0764] text-[#FDE68A] shadow-lg shadow-purple-900/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <BuildingOffice2Icon className="w-8 h-8" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[#854D0E] bg-[#FEF9C3] border border-[#FDE68A] px-3 py-1 rounded-full text-xs font-bold mb-2">
                  <SparklesIcon className="w-3.5 h-3.5" /> แนะนำที่ฝึกงานจากรุ่นพี่
                </div>
                <h3 className="m-0 mb-1.5 text-2xl font-extrabold text-[#3B0764] tracking-tight">
                  สถานประกอบการแนะนำ
                </h3>
                <p className="m-0 text-sm text-slate-500 leading-relaxed max-w-xl">
                  ค้นหาและดูรายชื่อสถานที่ฝึกงานจริงจากรุ่นพี่ที่ผ่านการฝึกงาน เพื่อเป็นแนวทางในการเลือกสถานที่ฝึกประสบการณ์วิชาชีพ
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 bg-[#3B0764] group-hover:bg-[#4c1d95] text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md shadow-purple-900/25 transition-all">
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
            <div className="home-accent-bar h-1 w-12 rounded-full mt-2.5 mb-0" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-12">
            <div className="home-stat-card rounded-2xl transition-all p-6">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <BuildingOffice2Icon className="w-6 h-6" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {stats.companies > 0 ? `${stats.companies}+` : '50+'}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">สถานประกอบการชั้นนำที่ร่วมมือ</div>
            </div>

            <div className="home-stat-card rounded-2xl transition-all p-6">
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

            <div className="home-stat-card rounded-2xl transition-all p-6">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <BookOpenIcon className="w-6 h-6" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">12</div>
              <div className="text-xs text-slate-500 font-medium mt-1">สาขาวิชา ครอบคลุมทุกหลักสูตรในคณะ</div>
            </div>

            <div className="home-stat-card rounded-2xl transition-all p-6">
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

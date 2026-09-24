import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
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
  DocumentArrowDownIcon,
  QuestionMarkCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { redirectToProfileLogin } from '../../utils/sso';
import NotificationBell from '../../components/NotificationBell';
import UserProfileMenu from '../../components/UserProfileMenu';

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({ companies: 0, students: 0 });
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
    name: ''
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

    api.get('/public/companies')
      .then(res => {
        const list = res.data.data || [];
        setStats({
          companies: list.length,
          students: list.reduce((sum, c) => sum + (c.studentCount || 0), 0),
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
  }, []);

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
        : { label: 'ยื่นคำร้อง', to: '/dashboard/new-request' };

  const navButtonClass = 'rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold px-5 py-2.5 flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition cursor-pointer border-none no-underline';

  return (
    <div className="home-container bg-slate-50/50">
      {/* Utility Bar */}
      <div className="bg-purple-950 text-purple-200 text-xs py-2 px-4 md:px-6 flex justify-end items-center gap-4">
        <span className="inline-flex items-center gap-1.5">
          <PhoneIcon className="w-3.5 h-3.5 text-amber-300" />
          {contactInfo.phone ? `ติดต่อสอบถาม ${contactInfo.phone}` : 'ติดต่อสอบถาม 02-XXX-XXXX'}
        </span>
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
                <Link to={navAction.to} className={navButtonClass}>
                  <span>{navAction.label}</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
                <NotificationBell />
                <UserProfileMenu user={user} compact={true} />
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Ticker Banner — pill */}
      <div className="px-4 flex justify-center">
        <div className="bg-purple-50 border border-purple-200/70 text-purple-900 text-xs sm:text-sm py-2 px-5 rounded-full max-w-4xl text-center shadow-xs my-3 inline-flex items-center justify-center gap-2">
          <MegaphoneIcon className="w-4 h-4 text-purple-500 shrink-0" />
          <span className="font-medium">ประกาศด่วน: ระบบเปิดรับคำร้องฝึกงานตั้งแต่วันที่ 1 สิงหาคม เป็นต้นไป</span>
        </div>
      </div>

      {/* Hero — rounded image card with purple gradient overlay */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-2">
        <div className="relative h-[380px] sm:h-[460px] rounded-3xl overflow-hidden shadow-2xl border border-purple-100/50">
          <img
            src={sskruBg}
            alt="อาคารจุฬาภรณวลัยลักษณ์"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-950/90 via-purple-900/40 to-transparent" />
          <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-8 right-6 sm:right-8 text-white">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md border border-white/25 text-purple-100 mb-3">
              คณะศิลปศาสตร์และวิทยาศาสตร์
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm text-white m-0">
              ระบบบริหารจัดการการฝึกประสบการณ์วิชาชีพและสหกิจศึกษา
            </h1>
            <p className="mt-2 text-purple-100/90 text-sm sm:text-base max-w-2xl font-light leading-relaxed m-0">
              เชื่อมโยงนักศึกษา อาจารย์ และสถานประกอบการชั้นนำ ยกระดับทักษะสู่วิชาชีพในอนาคต
            </p>
          </div>
        </div>
      </div>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 m-0">ข่าวสารและประกาศ</h2>
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
                    <img src={news.coverImage} alt={news.title} className="w-full aspect-[3/2] object-cover" />
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
                {stats.students > 0 ? `${stats.students}+` : '200+'}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">นักศึกษาที่สำเร็จการฝึกประสบการณ์</div>
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

          {/* Resources & Support Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Documents */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-7">
              <h3 className="text-lg font-bold text-gray-900 m-0">เอกสารและแบบฟอร์มที่เกี่ยวข้อง</h3>
              <div className="h-1 w-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mt-2.5 mb-5" />
              <div className="flex flex-col gap-3">
                {[
                  { icon: DocumentArrowDownIcon, title: 'คู่มือการใช้งานระบบฝึกประสบการณ์วิชาชีพออนไลน์', meta: 'PDF' },
                  { icon: DocumentArrowDownIcon, title: 'แบบฟอร์มบันทึกการปฏิบัติงานประจำวัน', meta: 'Logbook Template' },
                  { icon: DocumentArrowDownIcon, title: 'เกณฑ์และข้อกำหนดการฝึกงานและสหกิจศึกษาของคณะ', meta: 'เอกสารประกอบ' },
                ].map((doc, i) => (
                  <div
                    key={i}
                    className="group flex items-center gap-3.5 rounded-xl border border-gray-100 hover:border-purple-200 bg-slate-50/60 hover:bg-purple-50/40 p-4 transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white border border-purple-100 text-purple-500 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 transition-all">
                      <doc.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-700 group-hover:text-purple-800 transition-colors leading-snug">
                        {doc.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{doc.meta}</div>
                    </div>
                    <DocumentArrowDownIcon className="w-5 h-5 text-slate-300 group-hover:text-purple-600 shrink-0 transition-colors" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: FAQ & Contact */}
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-7 flex-1">
                <h3 className="text-lg font-bold text-gray-900 m-0">มีข้อสงสัยเกี่ยวกับการฝึกงาน?</h3>
                <div className="h-1 w-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mt-2.5 mb-5" />
                <div className="flex flex-col gap-3">
                  {[
                    'หากต้องการเปลี่ยนสถานที่ฝึกงานต้องทำอย่างไร? — ติดต่ออาจารย์ที่ปรึกษาเพื่อยื่นคำร้องฉบับใหม่ผ่านระบบ',
                    'ช่องทางการส่งเล่มรายงานฝึกงาน — ส่งผ่านระบบเมนู "รายงานการฝึกงานประจำวัน" หลังสิ้นสุดการฝึก',
                  ].map((faq, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl bg-slate-50/60 border border-gray-100 p-4">
                      <QuestionMarkCircleIcon className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                      <p className="m-0 text-xs text-slate-600 leading-relaxed">{faq}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-purple-700 via-indigo-700 to-purple-800 text-white shadow-md p-6 sm:p-7">
                <h3 className="text-base font-bold text-white m-0 mb-4">ติดต่อฝ่ายฝึกประสบการณ์วิชาชีพ</h3>
                <div className="flex flex-col gap-2.5 text-sm">
                  <span className="inline-flex items-center gap-2.5 text-purple-100">
                    <PhoneIcon className="w-4 h-4 text-amber-300 shrink-0" />
                    {contactInfo.phone || '02-XXX-XXXX'}
                  </span>
                  <span className="inline-flex items-center gap-2.5 text-purple-100">
                    <EnvelopeIcon className="w-4 h-4 text-amber-300 shrink-0" />
                    {contactInfo.email || 'coop@sskru.ac.th'}
                  </span>
                  <span className="inline-flex items-center gap-2.5 text-purple-100">
                    <ClockIcon className="w-4 h-4 text-amber-300 shrink-0" />
                    จันทร์ - ศุกร์ 08:30 - 16:30 น.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; 2026 ระบบคำร้องฝึกงานวิชาชีพ. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;

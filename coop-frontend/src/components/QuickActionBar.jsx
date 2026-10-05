import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PencilSquareIcon,
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { redirectToProfileLogin } from '../utils/sso';

const QuickActionBar = () => {
  const navigate = useNavigate();

  // role ผู้ใช้ปัจจุบัน — admin/advisor เห็น CTA แดชบอร์ดของตัวเองแทนปุ่มส่งคำร้องนักศึกษา
  const role = (() => {
    try {
      return String(JSON.parse(localStorage.getItem('user') || '{}').role || '').toLowerCase();
    } catch {
      return '';
    }
  })();
  const isAdmin = role === 'admin';
  const isAdvisor = role === 'advisor';

  const cta = isAdmin
    ? {
        icon: ShieldCheckIcon,
        title: 'ศูนย์จัดการคำร้องและเอกสารฝึกงาน',
        subtitle: 'มีคำร้องรอตรวจสอบและออกหนังสือส่งตัว ติดตามสถานะได้ทันที',
        buttonMobile: 'จัดการคำร้อง',
        buttonDesktop: 'เข้าสู่ระบบจัดการคำร้อง',
        path: '/admin-dashboard/requests',
      }
    : isAdvisor
    ? {
        icon: AcademicCapIcon,
        title: 'ติดตามและตรวจรับรองนักศึกษาในที่ปรึกษา',
        subtitle: 'ตรวจสอบคำร้อง บันทึกความเห็น และติดตามความคืบหน้าของนักศึกษา',
        buttonMobile: 'แดชบอร์ด',
        buttonDesktop: 'ไปที่แดชบอร์ดอาจารย์',
        path: '/advisor-dashboard',
      }
    : {
        icon: PencilSquareIcon,
        title: 'พร้อมออกฝึกงานแล้วหรือยัง?',
        subtitle: 'กรอกข้อมูลสถานประกอบการและส่งคำร้องฝึกประสบการณ์วิชาชีพ',
        buttonMobile: 'ส่งคำร้อง',
        buttonDesktop: 'ไปส่งคำร้องขอฝึกงาน',
        path: '/dashboard/new-request',
      };
  const CtaIcon = cta.icon;

  const handleActionClick = (path, requiresAuth) => {
    const isLoggedIn = !!localStorage.getItem('user');
    if (requiresAuth && !isLoggedIn) {
      redirectToProfileLogin();
      return;
    }
    navigate(path);
  };

  const scrollToFaq = () => {
    document.getElementById('home-faq')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="my-3 sm:my-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* การ์ดหลักยื่นคำร้อง — slim แนวนอนเสมอ */}
        <div className="w-full bg-gradient-to-t from-purple-100/70 via-purple-50/40 to-white border border-purple-200/60 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center shrink-0">
              <CtaIcon className="w-4 h-4 text-purple-700" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold m-0 leading-tight truncate text-slate-800">{cta.title}</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-light m-0 mt-0.5 truncate">
                {cta.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleActionClick(cta.path, true)}
            className="inline-flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white text-[11px] sm:text-xs font-medium px-3.5 py-2 rounded-xl shadow-sm shrink-0 transition-all active:scale-95 border-0 cursor-pointer"
          >
            <span className="sm:hidden">{cta.buttonMobile}</span>
            <span className="hidden sm:inline">{cta.buttonDesktop}</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ทางลัดย่อย — admin/advisor เห็น 2 ช่อง (ไม่มี "ติดตามสถานะ"), นักศึกษา/บุคคลทั่วไปเห็น 3 ช่อง */}
        <div className={`grid ${(isAdmin || isAdvisor) ? 'grid-cols-2' : 'grid-cols-3'} gap-2 sm:gap-4 mt-2.5 sm:mt-3`}>
          {!isAdmin && !isAdvisor && (
            <button
              type="button"
              onClick={() => handleActionClick('/dashboard/my-requests', true)}
              className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-1 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-purple-200 hover:shadow-md transition-all text-slate-700 hover:text-purple-700 cursor-pointer"
            >
              <ClipboardDocumentCheckIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
              <span className="text-[11px] sm:text-xs font-medium truncate">ติดตามสถานะ</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleActionClick('/companies', false)}
            className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-1 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-amber-200 hover:shadow-md transition-all text-slate-700 hover:text-amber-700 cursor-pointer"
          >
            <MagnifyingGlassIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
            <span className="text-[11px] sm:text-xs font-medium truncate">ค้นหาที่ฝึกงาน</span>
          </button>

          <button
            type="button"
            onClick={scrollToFaq}
            className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 px-1 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 cursor-pointer"
          >
            <QuestionMarkCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
            <span className="text-[11px] sm:text-xs font-medium truncate">คำถามพบบ่อย</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default QuickActionBar;

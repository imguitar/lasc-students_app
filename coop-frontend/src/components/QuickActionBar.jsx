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

/**
 * แถบทางลัดหน้าแรก (ธีม Deep Violet & Gold)
 * การ์ดหลักเป็นม่วงเข้มมีเส้นทอง ปุ่มทางลัดเป็นกระจกขาวโปร่งพร้อมไอคอนสีตามหมวด
 */
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
    <section className="qa-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* การ์ดหลักยื่นคำร้อง */}
        <div className="qa-card">
          <div className="qa-card-info">
            <div className="qa-card-icon">
              <CtaIcon />
            </div>
            <div className="min-w-0">
              <h3 className="qa-card-title">{cta.title}</h3>
              <p className="qa-card-sub">{cta.subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={() => handleActionClick(cta.path, true)} className="qa-card-btn">
            <span className="sm:hidden">{cta.buttonMobile}</span>
            <span className="hidden sm:inline">{cta.buttonDesktop}</span>
            <ArrowRightIcon />
          </button>
        </div>

        {/* ทางลัดย่อย — admin/advisor เห็น 2 ช่อง (ไม่มี "ติดตามสถานะ"), นักศึกษา/บุคคลทั่วไปเห็น 3 ช่อง */}
        <div className={`qa-tiles ${(isAdmin || isAdvisor) ? 'qa-tiles-2' : 'qa-tiles-3'}`}>
          {!isAdmin && !isAdvisor && (
            <button type="button" onClick={() => handleActionClick('/dashboard/my-requests', true)} className="qa-tile">
              <span className="qa-tile-icon qa-tile-violet">
                <ClipboardDocumentCheckIcon />
              </span>
              <span className="qa-tile-label">ติดตามสถานะ</span>
            </button>
          )}

          <button type="button" onClick={() => handleActionClick('/companies', false)} className="qa-tile">
            <span className="qa-tile-icon qa-tile-gold">
              <MagnifyingGlassIcon />
            </span>
            <span className="qa-tile-label">ค้นหาที่ฝึกงาน</span>
          </button>

          <button type="button" onClick={scrollToFaq} className="qa-tile">
            <span className="qa-tile-icon qa-tile-indigo">
              <QuestionMarkCircleIcon />
            </span>
            <span className="qa-tile-label">คำถามพบบ่อย</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default QuickActionBar;

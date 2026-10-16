import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Mail, Clock, Globe } from 'lucide-react';
import { coopSsoService, dashboardService } from '../services';

const FacebookIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
  </svg>
);

const DEFAULT_CONTACT_INFO = {
  faculty_name_th: 'คณะศิลปศาสตร์และวิทยาศาสตร์',
  faculty_name_en: 'Faculty of Liberal Arts and Sciences,\nSisaket Rajabhat University',
  address: '319 ถนนไทยพันทา ตำบลโพธิ์ อำเภอเมือง จังหวัดศรีสะเกษ 33000',
  email: 'officescisskru@gmail.com',
  phone: '045-643-600',
  facebook_name: 'คณะศิลปศาสตร์และวิทยาศาสตร์',
  facebook_url: 'https://www.facebook.com/lascsskru',
  working_hours: 'เวลาทำการ: จันทร์ - ศุกร์ 08:30 - 16:30 น.'
};

const DashboardFooter = () => {
  const [contactInfo, setContactInfo] = useState(DEFAULT_CONTACT_INFO);
  const [isOpeningCoop, setIsOpeningCoop] = useState(false);

  useEffect(() => {
    let isMounted = true;
    dashboardService.getContactInfo()
      .then((res) => {
        if (isMounted && res?.data) {
          setContactInfo(prev => ({
            ...prev,
            ...res.data
          }));
        }
      })
      .catch(() => {
        // Fallback to default
      });
    return () => { isMounted = false; };
  }, []);

  const handleOpenCoop = async (e) => {
    e?.preventDefault?.();
    if (isOpeningCoop) return;
    setIsOpeningCoop(true);
    try {
      const url = await coopSsoService.openCoopSystem();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      const fallbackUrl = (import.meta.env.VITE_COOP_URL || 'http://localhost:5173/coop').replace(/\/+$/, '');
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsOpeningCoop(false);
    }
  };

  const facebookHref = (() => {
    const raw = (contactInfo.facebook_url || '').trim();
    if (!raw) return 'https://www.facebook.com';
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  })();

  return (
    <footer className="bg-purple-950 text-white rounded-2xl overflow-hidden shadow-md border border-purple-900/60 mt-6">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-5 sm:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* คอลัมน์ที่ 1 — ข้อมูลคณะ */}
          <div>
            <div className="flex items-center gap-3 mb-2.5">
              <div className="bg-white/95 rounded-lg p-1 shadow-sm shrink-0 flex items-center justify-center">
                <img
                  src="/LASC-SSKRU-1.png"
                  alt="LASC SSKRU"
                  className="h-8 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/logo.png';
                  }}
                />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white leading-tight">
                  {contactInfo.faculty_name_th || 'คณะศิลปศาสตร์และวิทยาศาสตร์'}
                </div>
                <div className="text-[10px] text-purple-300 leading-tight mt-0.5 whitespace-pre-line">
                  {contactInfo.faculty_name_en || 'Faculty of Liberal Arts and Sciences,\nSisaket Rajabhat University'}
                </div>
              </div>
            </div>
            <p className="m-0 text-[11px] text-purple-200/80 leading-relaxed flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-300" />
              <span>{contactInfo.address || '319 ถนนไทยพันทา ตำบลโพธิ์ อำเภอเมือง จังหวัดศรีสะเกษ 33000'}</span>
            </p>
          </div>

          {/* คอลัมน์ที่ 2 — ลิงก์ด่วน */}
          <div>
            <h4 className="text-xs font-bold m-0 mb-2.5 text-white tracking-wide">ลิงก์ด่วน</h4>
            <ul className="m-0 p-0 list-none flex flex-col gap-1.5 text-[11px]">
              <li>
                <button
                  type="button"
                  onClick={handleOpenCoop}
                  disabled={isOpeningCoop}
                  className="text-purple-200/80 hover:text-white transition-colors no-underline text-left bg-transparent border-0 p-0 cursor-pointer text-[11px] flex items-center gap-1.5"
                >
                  <span>หน้าแรกระบบฝึกงาน</span>
                  {isOpeningCoop && <span className="text-[9px] text-purple-400">(กำลังเชื่อมต่อ...)</span>}
                </button>
              </li>
              <li>
                <Link
                  to="/projects"
                  className="text-purple-200/80 hover:text-white transition-colors no-underline block"
                >
                  ตรวจสอบสถานะคำร้อง
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  className="text-purple-200/80 hover:text-white transition-colors no-underline inline-flex items-center gap-1.5"
                >
                  <Globe className="w-3 h-3 text-purple-300 shrink-0" />
                  <span>ระบบฐานข้อมูลนักศึกษา (Profile Portal)</span>
                </Link>
              </li>
              <li>
                <a
                  href="https://www.sskru.ac.th"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-200/80 hover:text-white transition-colors no-underline inline-flex items-center gap-1.5"
                >
                  <Globe className="w-3 h-3 text-purple-300 shrink-0" />
                  <span>เว็บไซต์มหาวิทยาลัย (SSKRU)</span>
                </a>
              </li>
            </ul>
          </div>

          {/* คอลัมน์ที่ 3 — ช่องทางติดต่อ */}
          <div>
            <h4 className="text-xs font-bold m-0 mb-2.5 text-white tracking-wide">ช่องทางติดต่อ</h4>
            <div className="flex flex-col gap-1.5 text-[11px] text-purple-200/80">
              <a
                href={facebookHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-white transition-colors no-underline text-purple-200/80"
              >
                <FacebookIcon className="w-3.5 h-3.5 shrink-0 text-purple-300" />
                <span>{contactInfo.facebook_name || 'คณะศิลปศาสตร์และวิทยาศาสตร์'}</span>
              </a>
              <a
                href={`mailto:${contactInfo.email || 'officescisskru@gmail.com'}`}
                className="inline-flex items-center gap-2 hover:text-white transition-colors no-underline text-purple-200/80"
              >
                <Mail className="w-3.5 h-3.5 shrink-0 text-purple-300" />
                <span>{contactInfo.email || 'officescisskru@gmail.com'}</span>
              </a>
              <span className="inline-flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 shrink-0 text-purple-300" />
                <span>{contactInfo.working_hours || 'เวลาทำการ: จันทร์ - ศุกร์ 08:30 - 16:30 น.'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* แถบลิขสิทธิ์ด้านล่างสุด */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <span className="text-[10px] text-purple-300/80 text-center sm:text-left">
            © 2026 Faculty of Liberal Arts and Sciences, SSKRU. All rights reserved.
          </span>
          <span className="text-[10px] text-purple-300/60 text-center sm:text-right">
            Developed by AI and Software Engineering Students
          </span>
        </div>
      </div>
    </footer>
  );
};

export default DashboardFooter;

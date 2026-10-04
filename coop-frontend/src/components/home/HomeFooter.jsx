import React from 'react';
import { Link } from 'react-router-dom';
import { MapPinIcon, EnvelopeIcon, ClockIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import FacebookIcon from '../icons/FacebookIcon';
import { getProfileLoginUrl } from '../../utils/sso';
import logo from '../../assets/LASC-SSKRU-1.png';

const HomeFooter = ({ contactInfo = {}, facebookHref = '' }) => (
  <footer className="bg-purple-950 text-white mt-4">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* ฝั่งซ้าย — ข้อมูลคณะ */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img src={logo} alt="LASC SSKRU" className="h-11 w-auto object-contain bg-white/95 rounded-lg p-1" />
            <div>
              <div className="text-sm font-bold leading-tight">คณะศิลปศาสตร์และวิทยาศาสตร์</div>
              <div className="text-[11px] text-purple-300 leading-tight mt-0.5">Faculty of Liberal Arts and Sciences,<br />Sisaket Rajabhat University</div>
            </div>
          </div>
          <p className="m-0 text-xs text-purple-200/80 leading-relaxed flex items-start gap-2">
            <MapPinIcon className="w-4 h-4 shrink-0 mt-0.5 text-purple-300" />
            319 ถนนไทยพันทา ตำบลโพธิ์ อำเภอเมือง จังหวัดศรีสะเกษ 33000
          </p>
        </div>

        {/* ตรงกลาง — ลิงก์ด่วน */}
        <div>
          <h4 className="text-sm font-bold m-0 mb-4 text-white">ลิงก์ด่วน</h4>
          <ul className="m-0 p-0 list-none flex flex-col gap-2.5 text-xs">
            <li><Link to="/" className="text-purple-200/80 hover:text-white transition-colors no-underline">หน้าแรกระบบฝึกงาน</Link></li>
            <li><Link to="/dashboard/my-requests" className="text-purple-200/80 hover:text-white transition-colors no-underline">ตรวจสอบสถานะคำร้อง</Link></li>
            <li>
              <a href={getProfileLoginUrl()} className="text-purple-200/80 hover:text-white transition-colors no-underline inline-flex items-center gap-1.5">
                <GlobeAltIcon className="w-3.5 h-3.5" /> ระบบฐานข้อมูลนักศึกษา (Profile Portal)
              </a>
            </li>
            <li>
              <a href="https://www.sskru.ac.th" target="_blank" rel="noopener noreferrer" className="text-purple-200/80 hover:text-white transition-colors no-underline inline-flex items-center gap-1.5">
                <GlobeAltIcon className="w-3.5 h-3.5" /> เว็บไซต์มหาวิทยาลัย (SSKRU)
              </a>
            </li>
          </ul>
        </div>

        {/* ฝั่งขวา — ช่องทางติดต่อ */}
        <div>
          <h4 className="text-sm font-bold m-0 mb-4 text-white">ช่องทางติดต่อ</h4>
          <div className="flex flex-col gap-2.5 text-xs text-purple-200/80">
            {facebookHref && (
              <a href={facebookHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 hover:text-white transition-colors no-underline text-purple-200/80">
                <FacebookIcon className="w-4 h-4 shrink-0 text-purple-300" />
                {contactInfo.facebook_name || 'Facebook'}
              </a>
            )}
            <span className="inline-flex items-center gap-2.5">
              <EnvelopeIcon className="w-4 h-4 shrink-0 text-purple-300" />
              {contactInfo.email || 'coop@sskru.ac.th'}
            </span>
            <span className="inline-flex items-center gap-2.5">
              <ClockIcon className="w-4 h-4 shrink-0 text-purple-300" />
              เวลาทำการ: จันทร์ - ศุกร์ 08:30 - 16:30 น.
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="text-[11px] text-purple-300/80 text-center sm:text-left">
          © 2026 Faculty of Liberal Arts and Sciences, SSKRU. All rights reserved.
        </span>
        <span className="text-[11px] text-purple-300/60 text-center sm:text-right">
          Developed by AI and Software Engineering Students
        </span>
      </div>
    </div>
  </footer>
);

export default HomeFooter;

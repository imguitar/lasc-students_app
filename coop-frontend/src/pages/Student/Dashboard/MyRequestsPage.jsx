import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import api from '../../../api/axios';
import { openDocumentInNewTab, downloadDocument } from '../../../utils/documentViewer';
import { getUploadUrl } from '../../../utils/fileUrl';
import './DashboardPage.css'; // Reusing layout styles
import './MyRequestsPage.css';
import { ClockIcon, CheckCircleIcon, BuildingOffice2Icon, CalendarDaysIcon, DocumentTextIcon, PaperAirplaneIcon, AcademicCapIcon, EnvelopeIcon } from '@heroicons/react/24/outline'; // Specific styles for this page
import { MoreVertical, Eye, Download, Pencil, ArrowRightLeft } from 'lucide-react';
import AttendanceDonut from '../../../components/student/AttendanceDonut';
import RelocationSection from '../../../components/student/RelocationSection';
import { RELOCATION_STATUS_LABEL } from '../../../components/RelocationStepper';
import StudentSidebar from '../../../components/StudentSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';
import { getEffectiveInternshipStatus } from '../../../utils/internshipStatus';
import StatusBadge from '../../../components/StatusBadge';

// chip สถานะคำร้องเปลี่ยนแหล่งฝึก — แสดงข้าง StatusBadge ทันทีที่มี relocation ค้างอยู่
const RelocationStatusChip = ({ status }) => !status ? null : (
  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-200/60">
    <ArrowRightLeft className="w-3 h-3" />
    ขอเปลี่ยนแหล่งฝึก{RELOCATION_STATUS_LABEL[status] ? ` · ${RELOCATION_STATUS_LABEL[status]}` : ''}
  </span>
);

export const isStudentEditableStatus = (status) => {
  const s = String(status || '').trim();
  // อนุญาตให้แก้ไขได้เฉพาะสถานะฉบับร่าง/รอตรวจสอบ/ถูกส่งกลับแก้ไขเท่านั้น
  // สถานะที่เข้าสู่กระบวนการตอบรับ-อนุมัติ-ออกฝึกงานแล้ว (COMPANY_ACCEPTED, APPROVED, IN_TRAINING ฯลฯ) ห้ามแก้ไข
  const editableStatuses = [
    'DRAFT',
    'PENDING',
    'REJECTED',
    'ฉบับร่าง',
    'รอตรวจสอบ',
    'รอผู้ดูแลระบบตรวจสอบ',
    'รอผู้ดูแลระบบอนุมัติ',
    'รออาจารย์ที่ปรึกษาอนุมัติ',
    'รออนุมัติ',
    'ไม่อนุมัติ',
    'ไม่อนุมัติ (อาจารย์)',
    'ไม่อนุมัติ (Admin)',
    'ส่งกลับแก้ไข',
    'ปฏิเสธ'
  ];
  return editableStatuses.includes(s);
};

const handleDownloadFile = (dataUrl, fileName = 'หนังสือส่งตัวฝึกงาน.pdf') => {
  downloadDocument(dataUrl, fileName);
};

const MyRequestsPage = () => {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState(''); 
  const [myRequests, setMyRequests] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [internshipRounds, setInternshipRounds] = useState([]);
  const [relocations, setRelocations] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState({ id: null, top: 0, left: 0 });
  const menuPanelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target?.closest?.('.action-menu-trigger')) return;
      if (menuPanelRef.current && !menuPanelRef.current.contains(event.target)) {
        setActionMenu({ id: null, top: 0, left: 0 });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!actionMenu.id) return;
    const closeMenu = () => setActionMenu({ id: null, top: 0, left: 0 });
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [actionMenu.id]);

  const handleToggleActionMenu = (e, requestId) => {
    e.preventDefault();
    e.stopPropagation();
    if (actionMenu.id === requestId) {
      setActionMenu({ id: null, top: 0, left: 0 });
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 176; // w-44
    const menuHeight = 160;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= menuHeight + 8
      ? rect.bottom + 4
      : Math.max(8, rect.top - menuHeight - 4);
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8
    );
    setActionMenu({ id: requestId, top, left });
  };

  const closeActionMenu = () => setActionMenu({ id: null, top: 0, left: 0 });

  const handleDocumentAction = (dataUrl, fileName) => {
    if (!dataUrl) return;
    // มือถือเปิดผ่าน blob URL ในแท็บใหม่ (browser render PDF เอง) — data: URL ถูกบล็อกบน iOS/Android
    openDocumentInNewTab(dataUrl);
  };

  useEffect(() => {
    const fetchRequests = async () => {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/'));
                return;
            }
            const user = JSON.parse(userStr);
            // admin ไม่มีคำร้องของตัวเอง — กันพิมพ์ URL เข้าหน้านี้ตรง ๆ
            if (String(user.role || '').toLowerCase() === 'admin') {
                navigate('/admin-dashboard', { replace: true });
                return;
            }
            setStudentName(user.full_name || user.name || '');

            const studentId = user.student_code || user.studentId || user.username;
            const res = await api.get(`/requests?studentId=${studentId}`);
            const myReqs = (res.data.data || []).map(req => {
              const effectiveStatus = getEffectiveInternshipStatus(req);
              const dispatchLetter = req.dispatchLetter || req.details?.dispatchLetter;
              return {
                ...req,
                status: effectiveStatus || req.status,
                dispatchLetter,
                companyName: req.companyName || req.company || 'Unknown Company',
                position: req.position || 'Unknown Position'
              };
            });
            setMyRequests(myReqs);

            api.get('/checkins', { params: { studentId } })
              .then((res) => setCheckins(res.data.data || []))
              .catch(() => setCheckins([]));

            api.get('/internship-rounds/active')
              .then((res) => setInternshipRounds(res.data?.data || []))
              .catch(() => {});

            api.get('/relocations')
              .then((res) => setRelocations(res.data?.data || []))
              .catch(() => {});
        } catch (error) {
            console.error('Error fetching requests:', error);
            setMyRequests([]);
        }
    };
    
    fetchRequests();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const filteredRequests = myRequests;

  const activeMenuRequest = filteredRequests.find((req) => req.id === actionMenu.id);

  const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  const getSubmittedAt = (req) =>
    req.submittedDate || req.details?.submittedDate || req.created_at || req.createdAt || req.updated_at || null;

  const formatThaiDateTime = (dateValue) => {
    if (!dateValue) return { date: '-', time: '-' };
    const dateObj = new Date(dateValue);
    if (Number.isNaN(dateObj.getTime())) return { date: '-', time: '-' };

    const day = dateObj.getDate();
    const month = THAI_MONTHS_SHORT[dateObj.getMonth()];
    const year = dateObj.getFullYear() + 543; // Buddhist year
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return {
      date: `${day} ${month} ${year}`,
      time: `${hours}:${minutes} น.`
    };
  };

  // ---------- Internship Hub: คำร้องหลัก + สถิติเช็คชื่อ ----------
  const activeHubStatuses = ['ตอบรับแล้ว', 'ส่งหนังสือขอความอนุเคราะห์แล้ว', 'อนุมัติแล้ว', 'ออกฝึกงาน', 'กำลังออกฝึกงาน', 'สิ้นสุดการฝึกงาน (รอประเมิน)', 'ประเมินเสร็จแล้ว', 'ฝึกงานเสร็จแล้ว'];
  const primaryRequest = myRequests.find((r) => activeHubStatuses.includes(String(r.status || '').trim())) || myRequests[0] || null;
  const primaryDetails = primaryRequest?.details || {};

  // relocation ที่กำลังดำเนินการ (ไม่รวมตีกลับ) ต่อคำร้อง — โชว์ chip "ขอเปลี่ยนแหล่งฝึก" ตั้งแต่กดส่ง
  const activeRelocationFor = (requestId) => relocations
    .filter((r) => Number(r.internship_request_id) === Number(requestId) && r.status !== 'rejected')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
  const relocationStatus = activeRelocationFor(primaryRequest?.id)?.status || null;

  const internshipStart = primaryRequest?.internship_start_date || primaryDetails.startDate || null;
  const internshipEnd = primaryRequest?.internship_end_date || primaryDetails.endDate || null;

  // รอบปฏิทินฝึกงานที่ตรงเทอมของคำร้อง — แสดงเป็นข้อมูลอ้างอิงตอนยังไม่มีวันทางการ
  const requestTerm = String(primaryDetails.internshipTerm || '');
  const termSemester = (requestTerm === 'term1' || requestTerm === 'ภาคการศึกษาที่ 1' || requestTerm === '1') ? '1'
    : (requestTerm === 'term2' || requestTerm === 'ภาคการศึกษาที่ 2' || requestTerm === '2') ? '2'
      : (requestTerm === 'summer' || requestTerm === 'ภาคฤดูร้อน') ? 'summer'
        : null;
  const matchingRound = (!internshipStart && termSemester)
    ? internshipRounds.find((r) => String(r.semester) === termSemester) || null
    : null;
  const DAY_MS = 86400000;
  const totalDays = (internshipStart && internshipEnd)
    ? Math.max(0, Math.round((new Date(internshipEnd) - new Date(internshipStart)) / DAY_MS) + 1)
    : 0;
  const daysDone = internshipStart
    ? Math.max(0, Math.min(totalDays || Infinity, Math.floor((Date.now() - new Date(internshipStart)) / DAY_MS) + 1))
    : 0;

  const attendanceCounts = { present: 0, late: 0, leave: 0, absent: 0 };
  checkins.forEach((c) => {
    const s = String(c.status || '').trim();
    if (s === 'present') attendanceCounts.present += 1;
    else if (s === 'late') attendanceCounts.late += 1;
    else if (s === 'absent') attendanceCounts.absent += 1;
    else if (['sick', 'personal', 'holiday'].includes(s)) attendanceCounts.leave += 1;
  });
  const totalCheckins = checkins.length;
  const attendedDays = attendanceCounts.present + attendanceCounts.late;
  const attendanceRate = totalCheckins > 0 ? Math.round((attendedDays / totalCheckins) * 100) : 0;
  const hoursAccrued = attendedDays * 8;
  const hoursTotal = totalDays * 8;
  const isFinished = ['ฝึกงานเสร็จแล้ว', 'ประเมินเสร็จแล้ว'].includes(String(primaryRequest?.status || '').trim());
  const supervisionAppt = primaryRequest?.supervisionAppointment || null;
  const supervisionDocs = supervisionAppt?.documents || [];
  const supervisionDocUrl = getUploadUrl;
  const supervisionStatusLabel = (() => {
    if (!supervisionAppt?.date) return null;
    if (primaryRequest?.supervisionReport || primaryRequest?.hasAdvisorEval) return 'นิเทศเสร็จสิ้น';
    const d = new Date(supervisionAppt.date);
    return d < new Date() ? 'รอสรุปผลนิเทศ' : 'รอนิเทศ';
  })();
  const letterSent = !!primaryDetails.companyResponseToken
    || !!primaryRequest?.company_email
    || /ตอบรับ|อนุมัติแล้ว|ฝึกงาน/.test(String(primaryRequest?.status || ''));
  const companyEmail = primaryRequest?.company_email || primaryDetails.companyEmail || primaryRequest?.evaluator_email || primaryDetails.evaluatorEmail || '';


  return (
    <div className="dashboard-container">
      <div className="mobile-top-navbar flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" style={{ width: 24, height: 24, display: "block" }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg></button>
          <Link to="/" className="mobile-top-logo flex items-center shrink-0" aria-label="LASC Home">
            <img src={lascLogo} alt="LASC Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
            <span className="hidden sm:inline text-base md:text-lg font-extrabold text-slate-900 tracking-tight whitespace-nowrap ml-2" style={{ fontFamily: '"Prompt", "Kanit", "Inter", sans-serif' }}>
              ระบบฝึกประสบการณ์วิชาชีพ
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <DateTimeIndicator />
          <NotificationBell />
          <UserProfileMenu />
        </div>
      </div>
      <StudentSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/dashboard/my-requests"
        handleLogout={handleLogout}
      />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>คำร้องของฉัน</h1>
            <p>ประวัติและสถานะการยื่นคำร้องทั้งหมด</p>
          </div>
          <div className="user-info">
             <span>{studentName}</span>
          </div>
        </header>

        <div className="content-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* ============ Internship Progress & Status Hub (order-last → อยู่ใต้รายการคำร้อง) ============ */}
            {primaryRequest && (
              <div className="order-last flex flex-col gap-4 sm:gap-5 mt-6">

                {/* 1) Overview Card — สถานประกอบการ + ช่วงเวลาฝึก + สถานะ */}
                <div className="rounded-2xl bg-gradient-to-br from-purple-50/60 via-white to-slate-50 border border-purple-100 shadow-sm p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                        <BuildingOffice2Icon className="w-6 h-6 text-purple-700" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="m-0 text-base sm:text-lg font-bold leading-tight truncate text-slate-800">{primaryRequest.companyName}</h2>
                        <p className="m-0 text-xs text-purple-700 font-semibold mt-0.5 truncate">{primaryRequest.position}</p>
                      </div>
                    </div>
                    {/* มือถือ: badge เรียงแถวใต้ชื่อบริษัท / desktop: ชิดขวาแถวเดียวกับชื่อ */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:flex-col sm:items-end shrink-0">
                      <StatusBadge status={getEffectiveInternshipStatus(primaryRequest)} />
                      <RelocationStatusChip status={relocationStatus} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold flex items-center gap-1.5"><EnvelopeIcon className="w-3.5 h-3.5" /> พี่เลี้ยง / ผู้ประสานงาน</div>
                      <div className="text-xs font-medium mt-1 truncate text-slate-800">{primaryDetails.contactPerson || primaryDetails.evaluatorName || '-'}</div>
                      <div className="text-[11px] text-slate-500 truncate">{primaryDetails.contactEmail || companyEmail || '-'}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold flex items-center gap-1.5"><CalendarDaysIcon className="w-3.5 h-3.5" /> ช่วงเวลาฝึกงาน</div>
                      <div className="text-xs font-medium mt-1 text-slate-800">
                        {internshipStart ? formatThaiDateTime(internshipStart).date : (matchingRound ? formatThaiDateTime(matchingRound.startDate).date : 'รอกำหนด')}
                        {' – '}
                        {internshipEnd ? formatThaiDateTime(internshipEnd).date : (matchingRound ? formatThaiDateTime(matchingRound.endDate).date : 'รอกำหนด')}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {totalDays > 0
                          ? `ปฏิบัติงานแล้ว ${daysDone} / ${totalDays} วัน`
                          : matchingRound
                            ? `ตามรอบ "${matchingRound.title}" — ยังไม่ได้กำหนดวันฝึกอย่างเป็นทางการ`
                            : 'ยังไม่ได้กำหนดวันฝึกอย่างเป็นทางการ'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5" /> ความคืบหน้า</div>
                      <div className="h-2 rounded-full bg-slate-200 mt-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-600 transition-all"
                          style={{ width: `${totalDays > 0 ? Math.min(100, Math.round((daysDone / totalDays) * 100)) : 0}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1.5">{totalDays > 0 ? `${Math.min(100, Math.round((daysDone / totalDays) * 100))}% ของระยะเวลาฝึกงาน` : 'รอเริ่มฝึกงาน'}</div>
                    </div>
                  </div>
                </div>

                {/* 1.5) คำร้องขอเปลี่ยนสถานที่ฝึกงาน */}
                <RelocationSection request={primaryRequest} daysTrained={attendanceCounts.present + attendanceCounts.late} items={relocations} />

                {/* 2) Digital Documents & Letters */}
                <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5 sm:p-6">
                  <h3 className="text-base font-bold text-slate-900 m-0">เอกสารดิจิทัลและหนังสือราชการ</h3>
                  <div className="h-1 w-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mt-2 mb-4" />
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><PaperAirplaneIcon style={{ width: 18, height: 18 }} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-800">หนังสือขอความอนุเคราะห์ฝึกงาน</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {letterSent ? `ส่งถึงอีเมลสถานประกอบการแล้ว${companyEmail ? ` (${companyEmail})` : ''}` : 'รอคณะดำเนินการอนุมัติและจัดส่ง'}
                        </div>
                      </div>
                      {letterSent
                        ? <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 shrink-0">ส่งแล้ว</span>
                        : <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-400 shrink-0">รอดำเนินการ</span>}
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                      <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><DocumentTextIcon style={{ width: 18, height: 18 }} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-800">หนังสือส่งตัวนักศึกษา (PDF)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {primaryRequest.dispatchLetter?.dataUrl ? 'พร้อมดาวน์โหลด' : 'จะพร้อมดาวน์โหลดเมื่อคำร้องผ่านการอนุมัติครบถ้วน'}
                        </div>
                      </div>
                      {primaryRequest.dispatchLetter?.dataUrl ? (
                        <button
                          type="button"
                          onClick={() => handleDocumentAction(primaryRequest.dispatchLetter.dataUrl, primaryRequest.dispatchLetter.fileName || 'หนังสือส่งตัวฝึกงาน.pdf')}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white border-0 cursor-pointer transition-colors shrink-0"
                        >
                          ดาวน์โหลด
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-400 shrink-0">รอดำเนินการ</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><AcademicCapIcon style={{ width: 18, height: 18 }} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-800">ใบรับรองการฝึกงาน</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {isFinished ? 'ฝึกงานเสร็จสิ้น — ติดต่อฝ่ายฝึกประสบการณ์เพื่อรับเอกสาร' : 'พร้อมใช้งานเมื่อฝึกงานและการประเมินเสร็จสิ้น'}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${isFinished ? 'bg-amber-50 text-amber-600 border border-amber-200/60' : 'bg-slate-100 text-slate-400'}`}>
                        {isFinished ? 'พร้อมรับ' : 'รอดำเนินการ'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3) การนิเทศ (Supervision) */}
                {supervisionAppt?.date && (
                  <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900 m-0">การนิเทศฝึกงาน</h3>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${supervisionStatusLabel === 'นิเทศเสร็จสิ้น' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-violet-50 text-violet-600 border border-violet-200/60'}`}>
                        {supervisionStatusLabel}
                      </span>
                    </div>
                    <div className="h-1 w-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mt-2 mb-4" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="rounded-xl bg-slate-50/70 px-3.5 py-2.5">
                        <p className="text-[10px] text-slate-400 m-0">วันนิเทศ (ตามเอกสารราชการ)</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5 m-0">{formatThaiDateTime(supervisionAppt.date).date}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50/70 px-3.5 py-2.5">
                        <p className="text-[10px] text-slate-400 m-0">อาจารย์ผู้นิเทศ</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5 m-0">{supervisionAppt.advisorName || '-'}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50/70 px-3.5 py-2.5">
                        <p className="text-[10px] text-slate-400 m-0">รูปแบบ</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5 m-0">{supervisionAppt.mode || '-'}</p>
                      </div>
                    </div>
                    {supervisionAppt.note && (
                      <p className="text-xs text-slate-500 mt-3 m-0">หมายเหตุ: {supervisionAppt.note}</p>
                    )}
                    {supervisionDocs.length > 0 && (
                      <ul className="mt-3 space-y-1.5 list-none p-0">
                        {supervisionDocs.map((doc) => (
                          <li key={doc.id} className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                            <DocumentTextIcon style={{ width: 16, height: 16 }} className="text-purple-600 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium text-slate-700 truncate m-0">{doc.name}</p>
                              <p className="text-[10px] text-slate-400 m-0">{doc.type}</p>
                            </div>
                            <a
                              href={supervisionDocUrl(doc.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white no-underline transition-colors shrink-0"
                            >
                              ดูเอกสาร
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* 4) Attendance Analytics (AmCharts) */}
                <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5 sm:p-6">
                  <h3 className="text-base font-bold text-slate-900 m-0">สถิติการเช็คชื่อเข้าฝึกงาน</h3>
                  <div className="h-1 w-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mt-2 mb-4" />
                  {totalCheckins > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <AttendanceDonut
                        present={attendanceCounts.present}
                        late={attendanceCounts.late}
                        leave={attendanceCounts.leave}
                        absent={attendanceCounts.absent}
                        centerLabel={`${attendanceRate}%`}
                      />
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between rounded-xl bg-slate-50/70 px-3.5 py-2.5">
                          <span className="text-xs text-slate-500">ชั่วโมงสะสม (8 ชม./วัน)</span>
                          <span className="text-sm font-bold text-slate-800">{hoursAccrued}{hoursTotal ? ` / ${hoursTotal}` : ''} ชม.</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-slate-50/70 px-3.5 py-2.5">
                          <span className="text-xs text-slate-500">อัตราการเข้างาน</span>
                          <span className="text-sm font-bold text-emerald-600">{attendanceRate}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-emerald-50/70 px-3 py-2 text-center"><div className="text-base font-extrabold text-emerald-600">{attendanceCounts.present}</div><div className="text-[10px] text-slate-500">มาตรงเวลา</div></div>
                          <div className="rounded-xl bg-amber-50/70 px-3 py-2 text-center"><div className="text-base font-extrabold text-amber-600">{attendanceCounts.late}</div><div className="text-[10px] text-slate-500">สาย</div></div>
                          <div className="rounded-xl bg-sky-50/70 px-3 py-2 text-center"><div className="text-base font-extrabold text-sky-600">{attendanceCounts.leave}</div><div className="text-[10px] text-slate-500">ลา / หยุด</div></div>
                          <div className="rounded-xl bg-rose-50/70 px-3 py-2 text-center"><div className="text-base font-extrabold text-rose-500">{attendanceCounts.absent}</div><div className="text-[10px] text-slate-500">ขาด</div></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50/70 border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
                      ยังไม่มีข้อมูลการเช็คชื่อ — ระบบจะแสดงสถิติเมื่อเริ่มฝึกงานและบันทึกรายงานประจำวัน
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 1) คำร้องของฉัน — ส่วนแรกที่เห็น */}
            <h3 className="text-base font-bold text-slate-900 m-0 mb-3">คำร้องของฉัน</h3>

            {/* Mobile: Compact Card View */}
            <div className="flex flex-col gap-2.5 md:hidden">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => {
                  const submitted = formatThaiDateTime(getSubmittedAt(req));
                  return (
                    <div key={req.id} className="w-full rounded-xl bg-white border border-slate-100 shadow-sm p-3.5">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-bold text-slate-800 leading-snug min-w-0 break-words">{req.companyName}</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={getEffectiveInternshipStatus(req)} />
                          <RelocationStatusChip status={activeRelocationFor(req.id)?.status} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2.5 mt-2">
                        <div className="min-w-0">
                          <div className="text-xs text-slate-600 truncate">{req.position}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{submitted.date} • {submitted.time}</div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleToggleActionMenu(e, req.id)}
                          className="action-menu-trigger w-9 h-9 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition cursor-pointer border-none bg-transparent inline-flex items-center justify-center shrink-0"
                          aria-label="จัดการคำร้อง"
                        >
                          <MoreVertical className="w-4 h-4 stroke-[2]" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">ไม่พบข้อมูลคำร้อง</div>
              )}
            </div>

            {/* Desktop: Requests Table */}
            <TableContainer className="table-container" sx={{ display: { xs: 'none', md: 'block' } }}>
              <Table size="small" className="requests-table" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>บริษัท</TableCell>
                    <TableCell>ตำแหน่ง</TableCell>
                    <TableCell>วันที่ยื่น</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell className="text-right">จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                        {filteredRequests.length > 0 ? (
                            filteredRequests.map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell className="company-name"><span className="compact-text">{req.companyName}</span></TableCell>
                        <TableCell><span className="compact-text">{req.position}</span></TableCell>
                        <TableCell>
                          {(() => {
                            const submitted = formatThaiDateTime(getSubmittedAt(req));
                            return (
                              <div className="compact-text">
                                <div>{submitted.date}</div>
                                <div className="text-slate-400">{submitted.time}</div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={getEffectiveInternshipStatus(req)} />
                          <div className="mt-1"><RelocationStatusChip status={activeRelocationFor(req.id)?.status} /></div>
                          {(req.status === 'ออกฝึกงาน' || req.status === 'กำลังออกฝึกงาน' || req.status === 'สิ้นสุดการฝึกงาน (รอประเมิน)' || req.status === 'ประเมินเสร็จแล้ว' || req.status === 'ฝึกงานเสร็จแล้ว') && (
                            <div style={{ marginTop: '8px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px', fontWeight: 500 }}>
                              {req.hasCompanyEval ?
                                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircleIcon style={{width: 16, height: 16}}/> บริษัทประเมินแล้ว</span> :
                                <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}><ClockIcon style={{width: 16, height: 16}}/> บริษัทกำลังประเมิน</span>}
                              {req.hasAdvisorEval ?
                                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircleIcon style={{width: 16, height: 16}}/> อาจารย์ประเมินแล้ว</span> :
                                <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}><ClockIcon style={{width: 16, height: 16}}/> อาจารย์กำลังประเมิน</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            onClick={(e) => handleToggleActionMenu(e, req.id)}
                            className="action-menu-trigger p-2 rounded-xl text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition cursor-pointer border-none bg-transparent outline-none inline-flex items-center justify-center"
                            aria-label="ตัวเลือกการจัดการ"
                            title="จัดการ"
                          >
                            <MoreVertical className="w-4 h-4 stroke-[2]" />
                          </button>
                        </TableCell>
                      </TableRow>
                            ))
                        ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="no-data">ไม่พบข้อมูลคำร้อง</TableCell>
                    </TableRow>
                        )}
                </TableBody>
              </Table>
            </TableContainer>
        </div>
      </main>

      {/* Action Dropdown Panel — เรนเดอร์ผ่าน Portal เพื่อหลบการถูก clip โดย overflow ของตาราง */}
      {actionMenu.id && activeMenuRequest && createPortal(
        <div
          ref={menuPanelRef}
          className="w-44 bg-white rounded-2xl p-1.5 border border-violet-100 z-[99] flex flex-col gap-0.5"
          style={{
            position: 'fixed',
            top: actionMenu.top,
            left: actionMenu.left,
            backgroundColor: '#ffffff',
            boxShadow: '0 12px 32px rgba(124, 58, 237, 0.08)',
            borderColor: '#ede9fe',
          }}
        >
          {/* รายการที่ 1: ดูรายละเอียด */}
          <Link
            to={`/dashboard/request/${activeMenuRequest.id}`}
            onClick={closeActionMenu}
            className="group w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition text-left no-underline cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-400 group-hover:text-violet-600 transition" />
            <span>ดูรายละเอียด</span>
          </Link>

          {/* รายการที่ 2: ดาวน์โหลดเอกสาร (แสดงเมื่อมีไฟล์) */}
          {activeMenuRequest.dispatchLetter?.dataUrl ? (
            <button
              type="button"
              onClick={() => {
                closeActionMenu();
                handleDocumentAction(
                  activeMenuRequest.dispatchLetter.dataUrl,
                  activeMenuRequest.dispatchLetter.fileName || `หนังสือส่งตัว_${activeMenuRequest.companyName || 'ฝึกงาน'}.pdf`
                );
              }}
              className="group w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition text-left cursor-pointer border-none bg-transparent outline-none"
            >
              <Download className="w-4 h-4 text-slate-400 group-hover:text-violet-600 transition" />
              <span>ดาวน์โหลดเอกสาร</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 rounded-xl cursor-not-allowed border-none bg-transparent"
              title="ยังไม่มีเอกสารหนังสือส่งตัว"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>ดาวน์โหลดเอกสาร</span>
            </button>
          )}

          {/* เส้นคั่นบางๆ + รายการที่ 3: แก้ไขคำร้อง (แสดงเฉพาะคำร้องที่ยังแก้ไขได้เท่านั้น) */}
          {isStudentEditableStatus(activeMenuRequest.status) && (
            <>
              <div className="border-t border-slate-100 my-0.5" />
              <Link
                to={`/dashboard/edit-request/${activeMenuRequest.id}`}
                onClick={closeActionMenu}
                className="group w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition text-left no-underline cursor-pointer"
              >
                <Pencil className="w-4 h-4 text-violet-500" />
                <span>แก้ไขคำร้อง</span>
              </Link>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default MyRequestsPage;

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import api from '../../../api/axios';
import './DashboardPage.css';
import {
  Card,
  CardContent,
  Chip,
  Typography,
  Box,
  Button,
  Paper,
  Alert,
  Stack,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { STAT_EMOJI } from '../../../utils/statEmojis';
import './ProcessTracker.css';
import {
  PencilSquareIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import StudentSidebar from '../../../components/StudentSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';
import { getEffectiveInternshipStatus } from '../../../utils/internshipStatus';
import StatCard from '../../../components/StatCard';
import StatusBadge from '../../../components/StatusBadge';
import { MessageSquareQuote, Info, ArrowRight, CalendarX, User, Video, MapPin } from 'lucide-react';

const dataUrlToBlobUrl = (dataUrl) => {
  if (!dataUrl) return '';
  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Failed to convert dataUrl to blob:', err);
    return dataUrl;
  }
};

const handleDownloadFile = (dataUrl, fileName = 'หนังสือส่งตัวฝึกงาน.pdf') => {
  if (!dataUrl) return;
  try {
    const blobUrl = dataUrlToBlobUrl(dataUrl);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

const handleViewDocument = (dataUrl, fileName = 'หนังสือส่งตัวฝึกงาน.pdf') => {
  if (!dataUrl) return;
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    // บน Mobile (< 768px): ให้ Trigger สั่งดาวน์โหลดไฟล์ลงเครื่องอัตโนมัติ
    handleDownloadFile(dataUrl, fileName);
  } else {
    // บน Desktop: เปิดไฟล์ PDF แสดงผลเต็มจอในแท็บใหม่ของเบราว์เซอร์ทันที
    const fileUrl = dataUrlToBlobUrl(dataUrl);
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');
  const [studentAvatar, setStudentAvatar] = useState(null);
  const [internshipRequests, setInternshipRequests] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // chart refs removed

  useEffect(() => {
    const fetchData = async () => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
              const user = JSON.parse(userStr);

              if (user.role === 'admin') {
                 navigate('/admin-dashboard'); 
                 return;
              }
              if (user.role === 'advisor') {
                 navigate('/advisor-dashboard'); 
                 return;
              }
              if (user.role !== 'student') {
                 navigate('/login'); 
                 return;
              }

              setStudentName(user.full_name || user.name);
              setStudentAvatar(user.avatar);
        
              const studentId = user.student_code || user.studentId || user.username;
              const requestsRes = await api.get(`/requests?studentId=${studentId}`);

              const myRequests = (requestsRes.data.data || []).map(req => {
                const effectiveStatus = getEffectiveInternshipStatus(req);
                const dispatchLetter = req.dispatchLetter || req.details?.dispatchLetter;
                return {
                  ...req,
                  status: effectiveStatus || req.status,
                  dispatchLetter,
                  companyName: req.company || req.companyName,
                };
              });
              setInternshipRequests(myRequests);
            } else {
              navigate('/login');
            }
        } catch (error) {
            console.error(error);
        }
    };
    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const currentRequest = useMemo(() => {
    if (!internshipRequests.length) return null;

    const prioritized = internshipRequests.filter(
      (request) =>
        request.status === 'กำลังออกฝึกงาน' ||
        request.status === 'ออกฝึกงาน' ||
        request.status === 'อนุมัติแล้ว (รอออกฝึกงาน)' ||
        request.status === 'สิ้นสุดการฝึกงาน (รอประเมิน)' ||
        request.status === 'ฝึกงานเสร็จแล้ว'
    );

    if (prioritized.length > 0) {
      return prioritized[0];
    }

    return internshipRequests[0];
  }, [internshipRequests]);

  const pendingStatuses = [
    'รออาจารย์ที่ปรึกษาอนุมัติ',
    'รอผู้ดูแลระบบตรวจสอบ',
    'รอผู้ดูแลระบบอนุมัติ',
    'รอสถานประกอบการตอบรับ',
    'รออาจารย์อนุมัติเริ่มฝึกงาน',
    'COMPANY_ACCEPTED',
    'รอแอดมินออกใบส่งตัว',
    'อนุมัติแล้ว (รอออกฝึกงาน)',
  ];
  
    // Map extended status to steps (0-5)
  const getStepIndex = (status) => {
      if (!status) return 0;
      if (['รออาจารย์ที่ปรึกษาอนุมัติ', 'รอผู้ดูแลระบบตรวจสอบ', 'รอผู้ดูแลระบบอนุมัติ'].includes(status)) return 1;
      if (['รอสถานประกอบการตอบรับ', 'COMPANY_ACCEPTED', 'รอแอดมินออกใบส่งตัว'].includes(status)) return 2;
      if (['รออาจารย์อนุมัติเริ่มฝึกงาน', 'อนุมัติแล้ว', 'อนุมัติแล้ว (รอออกฝึกงาน)', 'กำลังออกฝึกงาน', 'ออกฝึกงาน'].includes(status)) return 3;
      if (['ประเมินเสร็จแล้ว', 'สิ้นสุดการฝึกงาน (รอประเมิน)'].includes(status)) return 4;
      if (['ฝึกงานเสร็จแล้ว'].includes(status)) return 5;
      if (status.includes('ไม่อนุมัติ') || status.includes('ปฏิเสธ')) return 1; 
      return 0;
  };

  const currentStep = getStepIndex(currentRequest?.status);

  const steps = [
    { title: 'ส่งคำร้อง', icon: <PencilSquareIcon style={{width:24, height:24}} /> },
    { title: 'รอตรวจสอบ', icon: <ClockIcon style={{width:24, height:24}} /> },
    { title: 'รอตอบรับ', icon: <EnvelopeIcon style={{width:24, height:24}} /> },
    { title: 'อนุมัติแล้ว', icon: <CheckCircleIcon style={{width:24, height:24}} /> },
    { title: 'ประเมินหลังฝึกงาน', icon: <DocumentTextIcon style={{width:24, height:24}} /> },
    { title: 'เสร็จสิ้น', icon: <CheckCircleIcon style={{width:24, height:24}} /> }
  ];



  const formatThaiDateTime = (dateValue) => {
    if (!dateValue) return { date: '-', time: '-' };
    const dateObj = new Date(dateValue);
    if (Number.isNaN(dateObj.getTime())) return { date: '-', time: '-' };

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear() + 543;
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');

    return {
      date: `${day}-${month}-${year}`,
      time: `${hours}:${minutes}:${seconds}`
    };
  };

  const hasActiveRequest = internshipRequests.some(req => 
    !['ไม่อนุมัติ (อาจารย์)', 'ไม่อนุมัติ (Admin)', 'ปฏิเสธ'].includes(req.status)
  );

  const summaryCards = useMemo(() => {
    const total = internshipRequests.length;
    const pending = internshipRequests.filter((request) => pendingStatuses.includes(request.status)).length;
    const latestStatus = currentRequest?.status || 'ยังไม่มีคำร้อง';
    return [
      { label: 'คำร้องทั้งหมด', value: total, color: '#4f46e5', icon: STAT_EMOJI.DOCUMENT },
      { label: 'คำร้องที่รอดำเนินการ', value: pending, color: '#d97706', icon: STAT_EMOJI.PENDING },
      { label: 'สถานะล่าสุด', value: latestStatus, color: '#0284c7', icon: STAT_EMOJI.STATUS, isText: true },
    ];
  }, [internshipRequests, currentRequest]);

  const documentDeadlineInfo = useMemo(() => {
    if (!currentRequest) return null;
    const deadlineValue = currentRequest.documentDeadline || currentRequest.startDate || currentRequest.endDate;
    if (!deadlineValue) return null;

    const deadline = new Date(deadlineValue);
    if (Number.isNaN(deadline.getTime())) return null;

    const now = new Date();
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      date: deadline.toLocaleDateString('th-TH'),
      daysLeft,
      isUrgent: daysLeft >= 0 && daysLeft <= 7,
      isOverdue: daysLeft < 0,
    };
  }, [currentRequest]);

  const scheduleData = useMemo(() => {
    if (!currentRequest) return null;
    const startDate = currentRequest.startDate || currentRequest.internship_start_date || currentRequest.details?.startDate;
    const endDate = currentRequest.endDate || currentRequest.internship_end_date || currentRequest.details?.endDate;
    const documentDeadline = currentRequest.documentDeadline || currentRequest.reportDeadline || currentRequest.details?.documentDeadline;
    const academicYear = currentRequest.internshipTerm || currentRequest.academicYear || currentRequest.academic_year || null;

    if (startDate && endDate) {
      return {
        startDate,
        endDate,
        documentDeadline: documentDeadline || null,
        academicYear,
      };
    }
    return null;
  }, [currentRequest]);

  const hasSchedule = Boolean(scheduleData?.startDate && scheduleData?.endDate);

  const formatThaiDate = (dateVal) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const notifications = useMemo(() => {
    const list = [];
    if (internshipRequests.some((request) => ['อนุมัติแล้ว', 'ออกฝึกงาน'].includes(request.status))) {
      list.push('บริษัทตอบรับแล้ว');
    }
    if (internshipRequests.some((request) => request.status === 'ไม่อนุมัติ (อาจารย์)')) {
      list.push('อาจารย์ให้แก้ไขข้อมูล');
    }
    if (internshipRequests.some((request) => request.status === 'ไม่อนุมัติ (Admin)')) {
      list.push('เจ้าหน้าที่ให้แก้ไขข้อมูล');
    }
    if (internshipRequests.some((request) => request.evaluationCompleted || request.status === 'ประเมินเสร็จแล้ว' || request.status === 'ฝึกงานเสร็จแล้ว')) {
      list.push('ประเมินเสร็จแล้ว');
    }
    return list;
  }, [internshipRequests]);

  const handleDownloadTextFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadApproval = () => {
    handleDownloadTextFile('approval-letter.txt', `เอกสารใบอนุมัติฝึกงาน\nนักศึกษา: ${studentName}\nสถานะล่าสุด: ${currentRequest?.status || '-'}\n`);
  };

  const handleDownloadAcceptance = () => {
    handleDownloadTextFile('company-acceptance-letter.txt', `หนังสือตอบรับนักศึกษาฝึกงาน\nนักศึกษา: ${studentName}\nสถานประกอบการ: ${currentRequest?.companyName || '-'}\n`);
  };

  const handleDownloadCertificate = () => {
    handleDownloadTextFile('internship-certificate.txt', `ใบรับรองการฝึกงาน\nนักศึกษา: ${studentName}\nช่วงฝึกงาน: ${currentRequest?.startDate || '-'} ถึง ${currentRequest?.endDate || '-'}\n`);
  };

  // Chart rendering removed for Student Dashboard

  return (
    <div className="dashboard-container">
      <div className="mobile-top-navbar flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">☰</button>
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
        currentPath="/dashboard"
        handleLogout={handleLogout}
      />

      <main className="dashboard-main">
        {/* Timeline & Important Schedule Card */}
        <div
          className="rounded-[24px] bg-white border border-violet-100 shadow-[0_8px_30px_rgba(124,58,237,0.04)] p-6 mb-6"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #ede9fe',
            boxShadow: '0 8px 30px rgba(124, 58, 237, 0.04)',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2.5 mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 border border-violet-200/80 flex items-center justify-center shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 16,
                  backgroundColor: '#f5f3ff',
                  borderColor: 'rgba(221, 214, 254, 0.8)',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CalendarIcon style={{ width: 22, height: 22 }} />
              </div>
              <div>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.25 }}>
                  กำหนดการสำคัญการฝึกประสบการณ์วิชาชีพ
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                  ข้อมูลและกรอบระยะเวลาสำคัญที่นักศึกษาต้องติดตาม
                </Typography>
              </div>
            </div>
            <span
              className="bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-3 py-1 text-xs font-bold"
              style={{
                backgroundColor: '#f5f3ff',
                color: '#6d28d9',
                border: '1px solid #ddd6fe',
                borderRadius: 9999,
                padding: '4px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-block',
              }}
            >
              ปีการศึกษา {scheduleData?.academicYear || '2569'}
            </span>
          </div>

          {hasSchedule ? (
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-4 border-t border-dashed border-slate-100"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 14,
                paddingTop: 16,
                borderTop: '1px dashed #f1f5f9',
              }}
            >
              {/* Timeline Item 1 */}
              <div
                className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 flex items-start gap-3.5"
                style={{
                  borderRadius: 16,
                  border: '1px solid #f1f5f9',
                  backgroundColor: 'rgba(248, 250, 252, 0.4)',
                  padding: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: '#f5f3ff',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ClockIcon style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                    ระยะเวลาฝึกงาน
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e293b', mt: 0.25 }}>
                    {formatThaiDate(scheduleData.startDate)} – {formatThaiDate(scheduleData.endDate)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
                    ปฏิบัติงานจริง ณ สถานประกอบการที่ได้รับการอนุมัติ
                  </Typography>
                </div>
              </div>

              {/* Timeline Item 2 */}
              <div
                className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 flex items-start gap-3.5"
                style={{
                  borderRadius: 16,
                  border: '1px solid #f1f5f9',
                  backgroundColor: 'rgba(248, 250, 252, 0.4)',
                  padding: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <DocumentTextIcon style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                    กำหนดส่งเอกสารประเมิน / เล่มรายงาน
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#dc2626', mt: 0.25 }}>
                    ภายในวันที่ {scheduleData.documentDeadline ? formatThaiDate(scheduleData.documentDeadline) : formatThaiDate(scheduleData.endDate)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
                    ส่งแบบประเมินและเล่มรายงานการฝึกงานฉบับสมบูรณ์
                  </Typography>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 p-8 flex flex-col items-center justify-center text-center gap-2 mt-4"
              style={{
                borderRadius: '16px',
                border: '1px dashed #ddd6fe',
                backgroundColor: 'rgba(245, 243, 255, 0.3)',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: 8,
              }}
            >
              <CalendarX className="w-8 h-8 text-violet-400" />
              <div className="text-sm font-bold text-slate-700">
                ยังไม่มีการประกาศกำหนดการ
              </div>
              <div className="text-xs text-slate-400">
                ผู้ดูแลระบบยังไม่ได้กำหนดกรอบระยะเวลาการฝึกงานและวันส่งเอกสาร
              </div>
            </div>
          )}
        </div>

        {currentRequest?.supervisionAppointment?.date && (() => {
          const appt = currentRequest.supervisionAppointment;
          const isCompleted = Boolean(currentRequest.supervisionReport || currentRequest.hasAdvisorEval);
          const isOnline = appt.mode === 'Online';
          const dateLabel = new Date(appt.date).toLocaleDateString('th-TH', {
            day: 'numeric', month: 'long', year: 'numeric',
          });
          return (
            <div
              className={`mb-6 bg-white rounded-2xl border border-slate-200/80 border-l-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
                isCompleted ? 'border-l-emerald-500' : 'border-l-violet-600'
              }`}
            >
              <div className="p-4 sm:p-5 bg-gradient-to-br from-violet-50/40 via-white to-indigo-50/30">
                {/* Header: icon + title + badges */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-700'
                    }`}
                  >
                    {isCompleted ? <CheckCircleIcon style={{ width: 24, height: 24 }} /> : <CalendarIcon style={{ width: 24, height: 24 }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-slate-800 m-0">
                        {isCompleted ? 'ผลการนิเทศงาน (นิเทศเสร็จสิ้น)' : 'กำหนดการนิเทศงาน'}
                      </h3>
                      {/* Mode badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isOnline
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isOnline ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {appt.mode || 'Onsite'}
                      </span>
                      {/* Status badge */}
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {isCompleted ? 'นิเทศเรียบร้อยแล้ว' : 'รอนิเทศงาน'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 m-0 mt-1">
                      {isCompleted
                        ? 'อาจารย์นิเทศงานได้ดำเนินการนิเทศและประเมินผลการฝึกงานของคุณเรียบร้อยแล้ว'
                        : 'อาจารย์ที่ปรึกษาได้กำหนดวันนิเทศงานของคุณเรียบร้อยแล้ว'}
                    </p>
                  </div>
                </div>

                {/* Appointment info box */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 mt-3.5 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <CalendarIcon style={{ width: 14, height: 14 }} className="text-violet-500" />
                      วันที่นิเทศ:
                    </span>
                    <span className="text-sm font-bold text-slate-800">{dateLabel}</span>
                  </div>
                  {appt.advisorName && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <User className="w-3.5 h-3.5 text-violet-500" />
                        อาจารย์นิเทศ:
                      </span>
                      <span className="text-sm font-semibold text-slate-700">{appt.advisorName}</span>
                    </div>
                  )}
                  {appt.note && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-slate-500 font-medium shrink-0">หมายเหตุ:</span>
                      <span className="text-xs text-slate-600 leading-relaxed">{appt.note}</span>
                    </div>
                  )}
                </div>

                {/* Action link */}
                <div className="mt-3.5 flex justify-end">
                  <Link
                    to="/dashboard/notifications"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 transition no-underline"
                  >
                    ดูรายละเอียดในการแจ้งเตือน
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })()}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            gap: 2,
            mb: 3,
          }}
        >
          {summaryCards.map((card) => (
            <StatCard
              key={card.label}
              title={card.label}
              value={card.value}
              icon={card.icon}
              color={card.color}
              isText={card.isText}
            />
          ))}
        </Box>

        {documentDeadlineInfo && documentDeadlineInfo.isUrgent && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <span style={{display:'inline-flex', alignItems:'center', gap:'4px'}}><ExclamationTriangleIcon style={{width:20, height:20}}/> ใกล้ครบกำหนดส่งเอกสาร</span> (ภายใน {documentDeadlineInfo.daysLeft} วัน) — กำหนดวันที่ {documentDeadlineInfo.date}
          </Alert>
        )}
        {documentDeadlineInfo && documentDeadlineInfo.isOverdue && (
          <Alert severity="error" sx={{ mb: 2 }}>
            เลยกำหนดส่งเอกสารแล้ว ({documentDeadlineInfo.date}) กรุณาดำเนินการด่วน
          </Alert>
        )}

        <div className="status-tracker-container">
          <h2> สถานะคำร้องปัจจุบัน</h2>
          {currentRequest ? (
            <div className="linear-tracker-wrapper">
              <div className={`linear-progress-line ${(currentRequest.status.includes('ไม่อนุมัติ') || currentRequest.status.includes('ปฏิเสธ')) ? 'rejected' : ''}`}>
                <div
                  className="linear-progress-fill"
                  style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                ></div>
              </div>

              <div className="linear-steps">
                {steps.map((step, index) => {
                  const status = currentRequest.status;
                  const isRejectStatus = status.includes('ไม่อนุมัติ') || status.includes('ปฏิเสธ');
                  const isCompleted = index < currentStep;
                  const isActive = index === currentStep && !isRejectStatus;
                  const isRejected = index === currentStep && isRejectStatus;

                  return (
                    <div
                      key={index}
                      className={`linear-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isRejected ? 'rejected' : ''}`}
                      title={step.title}
                    >
                      <div className="linear-step-icon">
                        {isCompleted ? '✓' : isRejected ? '✗' : step.icon}
                      </div>
                      <span className="linear-step-label">{step.title}</span>
                    </div>
                  );
                })}
              </div>

              <div className="linear-tracker-summary">
                <h3>{currentRequest.status}</h3>
                <p>{currentRequest.companyName}</p>
              </div>
            </div>
          ) : (
             <div className="no-request-tracker">
              <ClockIcon className="no-request-emoji" style={{width:48, height:48, margin:"0 auto", display:"block", color:"#9ca3af"}} />
                <p>คุณยังไม่มีคำร้องที่กำลังดำเนินการ</p>
             </div>
          )}
        </div>

        {/* Charts removed from Student Dashboard per request */}

        <div className="content-section">
          <div className="section-header">
            <h2>คำร้องล่าสุด</h2>
            {/* If active request exists, hide the button or show disabled state */}
            {hasActiveRequest && (
                 <span className="info-text text-muted" style={{ fontSize: '0.9rem', color: '#e53e3e' }}>
                    *คุณมีคำร้องที่กำลังดำเนินการ (ต้องรอผลการอนุมัติ/ปฏิเสธก่อนยื่นใหม่)
                 </span>
            )}
          </div>

          <div className="requests-list">
            {internshipRequests.length > 0 ? (
              internshipRequests.map((request) => {
                return (
                  <div
                    key={request.id}
                    className="rounded-[24px] bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 transition-all hover:shadow-[0_12px_36px_rgba(124,58,237,0.06)]"
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '24px',
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
                      padding: '24px',
                    }}
                  >
                    <div className="flex justify-between items-start gap-4 flex-wrap sm:flex-nowrap mb-2">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900 mb-1 leading-snug">
                          {request.companyName}
                        </h3>
                        <p className="text-sm font-medium text-slate-500 m-0">
                          {request.position}
                        </p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>

                    {/* Rejection Comments */}
                    {(request.status === 'ไม่อนุมัติ (Admin)' && request.admin_comment) && (
                      <div className="rounded-xl bg-rose-50/50 border border-rose-100/80 border-l-4 border-l-rose-500 p-3.5 flex flex-col gap-1 mt-3">
                        <div className="text-xs font-bold text-rose-900 flex items-center gap-2">
                          <Info className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>เหตุผลที่ไม่อนุมัติ (Admin):</span>
                        </div>
                        <p className="text-xs text-slate-600 pl-6 leading-relaxed m-0">
                          {request.admin_comment}
                        </p>
                      </div>
                    )}
                    {(request.status === 'ไม่อนุมัติ (อาจารย์)' && request.advisor_comment) && (
                      <div className="rounded-xl bg-rose-50/50 border border-rose-100/80 border-l-4 border-l-rose-500 p-3.5 flex flex-col gap-1 mt-3">
                        <div className="text-xs font-bold text-rose-900 flex items-center gap-2">
                          <Info className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>เหตุผลที่ไม่อนุมัติ (อาจารย์):</span>
                        </div>
                        <p className="text-xs text-slate-600 pl-6 leading-relaxed m-0">
                          {request.advisor_comment}
                        </p>
                      </div>
                    )}
                    {(request.status === 'ปฏิเสธ' && request.company_comment) && (
                      <div className="rounded-xl bg-rose-50/50 border border-rose-100/80 border-l-4 border-l-rose-500 p-3.5 flex flex-col gap-1 mt-3">
                        <div className="text-xs font-bold text-rose-900 flex items-center gap-2">
                          <Info className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>เหตุผลที่ปฏิเสธ (บริษัท):</span>
                        </div>
                        <p className="text-xs text-slate-600 pl-6 leading-relaxed m-0">
                          {request.company_comment}
                        </p>
                      </div>
                    )}

                    {/* Admin / Advisor Comments without emojis */}
                    {request.status !== 'ไม่อนุมัติ (Admin)' && request.status !== 'ไม่อนุมัติ (อาจารย์)' && request.admin_comment && (
                      <div className="rounded-xl bg-violet-50/50 border border-violet-100/80 border-l-4 border-l-violet-500 p-3.5 flex flex-col gap-1 mt-3">
                        <div className="text-xs font-bold text-violet-900 flex items-center gap-2">
                          <Info className="w-4 h-4 text-violet-600 shrink-0" />
                          <span>ข้อความ/คำแนะนำจากผู้ดูแลระบบ:</span>
                        </div>
                        <p className="text-xs text-slate-600 pl-6 leading-relaxed m-0">
                          {request.admin_comment}
                        </p>
                      </div>
                    )}
                    {request.status !== 'ไม่อนุมัติ (Admin)' && request.status !== 'ไม่อนุมัติ (อาจารย์)' && request.advisor_comment && (
                      <div className="rounded-xl bg-violet-50/50 border border-violet-100/80 border-l-4 border-l-violet-500 p-3.5 flex flex-col gap-1 mt-3">
                        <div className="text-xs font-bold text-violet-900 flex items-center gap-2">
                          <MessageSquareQuote className="w-4 h-4 text-violet-600 shrink-0" />
                          <span>ข้อความ/คำแนะนำจากอาจารย์ที่ปรึกษา:</span>
                        </div>
                        <p className="text-xs text-slate-600 pl-6 leading-relaxed m-0">
                          {request.advisor_comment}
                        </p>
                      </div>
                    )}

                    {/* Dispatch Letter Box */}
                    {request.dispatchLetter && (
                      <div className="mt-3.5 p-3.5 rounded-2xl border border-violet-100 bg-violet-50/30 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-violet-100/70 text-violet-700 flex items-center justify-center shrink-0">
                            <DocumentTextIcon style={{ width: 20, height: 20 }} />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">
                              เอกสารหนังสือส่งตัวฝึกงาน (Dispatch Letter)
                            </div>
                            <div className="text-xs text-violet-600/80 font-medium">
                              {request.dispatchLetter.fileName || 'หนังสือส่งตัวจากผู้ดูแลระบบ'}
                            </div>
                          </div>
                        </div>

                        {request.dispatchLetter.dataUrl && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const letter = request.dispatchLetter;
                                handleViewDocument(letter.dataUrl, letter.fileName || 'หนังสือส่งตัวฝึกงาน.pdf');
                              }}
                              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer border-none"
                              style={{ backgroundColor: '#7c3aed', color: '#ffffff', border: 'none' }}
                            >
                              <EyeIcon style={{ width: 14, height: 14 }} />
                              <span>ดูเอกสาร</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const letter = request.dispatchLetter;
                                handleDownloadFile(letter.dataUrl, letter.fileName || 'หนังสือส่งตัวฝึกงาน.pdf');
                              }}
                              className="border border-violet-200 text-violet-700 hover:bg-violet-50 font-semibold text-xs py-1.5 px-3 rounded-lg transition flex items-center gap-1.5 cursor-pointer bg-white"
                              style={{ border: '1px solid #ddd6fe', color: '#6d28d9', backgroundColor: '#ffffff' }}
                            >
                              <ArrowDownTrayIcon style={{ width: 14, height: 14 }} />
                              <span>ดาวน์โหลด</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Card Footer */}
                    <div className="flex justify-between items-center gap-4 pt-4 mt-4 border-t border-slate-100">
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span>ยื่นเมื่อ:</span>
                        <span className="font-medium text-slate-600">
                          {formatThaiDateTime(request.submittedDate).date} {formatThaiDateTime(request.submittedDate).time}
                        </span>
                      </div>
                      <Link
                        to={`/dashboard/request/${request.id}`}
                        className="text-violet-600 hover:text-violet-700 font-semibold text-xs transition flex items-center gap-1 no-underline group"
                        style={{ color: '#7c3aed', textDecoration: 'none' }}
                      >
                        <span>ดูรายละเอียด</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                );
              })

            ) : (
              <div className="empty-state">
                <div className="empty-icon"></div>
                <h3>ยังไม่มีคำร้อง</h3>
                <p>คลิกปุ่มด้านบนเพื่อยื่นคำร้องฝึกงานใหม่</p>
                <Link to="/dashboard/new-request" className="btn-primary">
                  ยื่นคำร้องเลย
                </Link>
              </div>
            )}
          </div>
        </div>

        <footer className="dashboard-footer">
          <div className="footer-inner">© 2026 ระบบคำร้องฝึกงานวิชาชีพ. All rights reserved.</div>
        </footer>
      </main>
    </div>
  );
};

export default DashboardPage;

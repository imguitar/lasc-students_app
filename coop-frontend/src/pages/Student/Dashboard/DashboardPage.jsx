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
import StatCard from '../../../components/StatCard';
import StatusBadge from '../../../components/StatusBadge';

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

const DashboardPage = () => {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');
  const [studentAvatar, setStudentAvatar] = useState(null);
  const [internshipRequests, setInternshipRequests] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [docModal, setDocModal] = useState({ open: false, dataUrl: '', fileName: '', blobUrl: '' });
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

              const myRequests = (requestsRes.data.data || []).map(req => ({
                  ...req,
                  companyName: req.company || req.companyName,
              }));
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
      (request) => request.status === 'ออกฝึกงาน' || request.status === 'ฝึกงานเสร็จแล้ว'
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
  ];
  
    // Map extended status to steps (0-5)
  const getStepIndex = (status) => {
      if (!status) return 0;
      if (['รออาจารย์ที่ปรึกษาอนุมัติ', 'รอผู้ดูแลระบบตรวจสอบ', 'รอผู้ดูแลระบบอนุมัติ'].includes(status)) return 1;
      if (['รอสถานประกอบการตอบรับ'].includes(status)) return 2;
      if (['รออาจารย์อนุมัติเริ่มฝึกงาน', 'อนุมัติแล้ว', 'ออกฝึกงาน'].includes(status)) return 3;
      if (['ประเมินเสร็จแล้ว'].includes(status)) return 4;
      if (['ฝึกงานเสร็จแล้ว'].includes(status)) return 5;
      if (status.includes('ไม่อนุมัติ') || status.includes('ปฏิเสธ')) return 1; 
      return 0;
  };

  const currentStep = getStepIndex(currentRequest?.status);

  const steps = [
    { title: 'ส่งคำร้อง', icon: <PencilSquareIcon style={{width:24, height:24}} /> },
    { title: 'รอตรวจสอบ', icon: '🕓︎' },
    { title: 'รอตอบรับ', icon: <EnvelopeIcon style={{width:24, height:24}} /> },
    { title: 'อนุมัติแล้ว', icon: <CheckCircleIcon style={{width:24, height:24}} /> },
    { title: 'ประเมินหลังฝึกงาน', icon: <DocumentTextIcon style={{width:24, height:24}} /> },
    { title: 'เสร็จสิ้น', icon: '🏁︎' }
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
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home">
          <img src={lascLogo} alt="LASC Logo" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '8px' }}>
          <UserProfileMenu />
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
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
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            bgcolor: '#ffffff',
            border: '1px solid #fde68a',
            borderLeft: '5px solid #f59e0b',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  bgcolor: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CalendarIcon style={{ width: 22, height: 22 }} />
              </Box>
              <div>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  กำหนดการสำคัญการฝึกประสบการณ์วิชาชีพ
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  ข้อมูลและกรอบระยะเวลาสำคัญที่นักศึกษาต้องติดตาม
                </Typography>
              </div>
            </Box>
            <Chip
              label="ปีการศึกษา 2569"
              size="small"
              sx={{
                bgcolor: '#fef3c7',
                color: '#92400e',
                fontWeight: 700,
                fontSize: '0.75rem',
                border: '1px solid #fde68a',
              }}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 1.5,
              pt: 1,
              borderTop: '1px dashed #f1f5f9',
            }}
          >
            {/* Timeline Item 1 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
                  bgcolor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mt: 0.25,
                }}
              >
                <ClockIcon style={{ width: 18, height: 18 }} />
              </Box>
              <div>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                  ระยะเวลาฝึกงาน
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e293b' }}>
                  1 ธันวาคม 2569 – 31 มีนาคม 2570
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.25 }}>
                  ปฏิบัติงานจริง ณ สถานประกอบการที่ได้รับการอนุมัติ
                </Typography>
              </div>
            </Box>

            {/* Timeline Item 2 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
                  bgcolor: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mt: 0.25,
                }}
              >
                <DocumentTextIcon style={{ width: 18, height: 18 }} />
              </Box>
              <div>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                  กำหนดส่งเอกสารประเมิน / เล่มรายงาน
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#dc2626' }}>
                  ภายในวันที่ 15 เมษายน 2570
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.25 }}>
                  ส่งแบบประเมินและเล่มรายงานการฝึกงานฉบับสมบูรณ์
                </Typography>
              </div>
            </Box>
          </Box>
        </Paper>

        {currentRequest?.supervisionAppointment?.date && (() => {
          const isCompleted = Boolean(currentRequest.supervisionReport || currentRequest.hasAdvisorEval);
          return (
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                p: 3,
                borderRadius: 3.5,
                background: isCompleted
                  ? 'linear-gradient(135deg, #ecfdf5 0%, #dcfce7 40%, #f0fdf4 100%)'
                  : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 40%, #eff6ff 100%)',
                border: isCompleted ? '2px solid #34d399' : '2px solid #38bdf8',
                boxShadow: isCompleted
                  ? '0 10px 30px -5px rgba(16, 185, 129, 0.22), 0 4px 12px rgba(16, 185, 129, 0.12)'
                  : '0 10px 30px -5px rgba(56, 189, 248, 0.22), 0 4px 12px rgba(56, 189, 248, 0.12)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2.5,
                transition: 'all 0.3s ease',
              }}
            >
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: 3,
                  background: isCompleted
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: isCompleted
                    ? '0 6px 16px rgba(16, 185, 129, 0.4)'
                    : '0 6px 16px rgba(2, 132, 199, 0.4)',
                }}
              >
                {isCompleted ? (
                  <CheckCircleIcon style={{ width: 28, height: 28 }} />
                ) : (
                  <CalendarIcon style={{ width: 28, height: 28 }} />
                )}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 800, color: isCompleted ? '#065f46' : '#0369a1', fontSize: '1.05rem', lineHeight: 1.2 }}
                  >
                    {isCompleted ? 'ผลการนิเทศงาน (นิเทศเสร็จสิ้น)' : 'กำหนดการนิเทศงาน'}
                  </Typography>
                  <Chip
                    label={isCompleted ? 'นิเทศเรียบร้อยแล้ว' : (currentRequest.supervisionAppointment.mode || 'Onsite')}
                    size="small"
                    sx={{
                      background: isCompleted
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : (currentRequest.supervisionAppointment.mode === 'Online' ? '#4f46e5' : '#0284c7'),
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      height: 24,
                      boxShadow: isCompleted ? '0 2px 6px rgba(16, 185, 129, 0.3)' : 'none',
                    }}
                  />
                  {isCompleted && (
                    <Chip
                      label={currentRequest.supervisionAppointment.mode || 'Onsite'}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: '#10b981',
                        color: '#047857',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        height: 24,
                        bgcolor: 'rgba(255, 255, 255, 0.8)'
                      }}
                    />
                  )}
                </Box>
                <Typography variant="body2" sx={{ color: isCompleted ? '#047857' : '#0c4a6e', mb: 2, fontWeight: 600, lineHeight: 1.5 }}>
                  {isCompleted
                    ? 'อาจารย์นิเทศงานได้ดำเนินการนิเทศและประเมินผลการฝึกงานของคุณเรียบร้อยแล้ว'
                    : 'อาจารย์ที่ปรึกษาได้กำหนดวันนิเทศงานของคุณเรียบร้อยแล้ว'}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2.5,
                    flexWrap: 'wrap',
                    bgcolor: '#ffffff',
                    p: 1.5,
                    px: 2.5,
                    borderRadius: 2.5,
                    border: isCompleted ? '2px solid #6ee7b7' : '2px solid #7dd3fc',
                    boxShadow: isCompleted
                      ? '0 4px 12px rgba(16, 185, 129, 0.1)'
                      : '0 4px 12px rgba(2, 132, 199, 0.1)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      วันที่นิเทศ:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      {new Date(currentRequest.supervisionAppointment.date).toLocaleDateString('th-TH')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      สถานะการนิเทศ:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 800, color: isCompleted ? '#059669' : '#0284c7' }}
                    >
                      {isCompleted ? 'เสร็จสิ้น (ประเมินแล้ว)' : 'รอนิเทศงาน'}
                    </Typography>
                  </Box>
                  {currentRequest.supervisionAppointment.note && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        หมายเหตุ:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#334155' }}>
                        {currentRequest.supervisionAppointment.note}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Paper>
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
                  <Card key={request.id} className="request-card" elevation={2}>
                    <CardContent style={{ padding: '1rem 1.25rem' }}>
                      <Box className="request-header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div>
                          <Typography component="h3" variant="h6" sx={{ marginBottom: '0.25rem', color: '#111827' }}>{request.companyName}</Typography>
                          <Typography className="position" variant="body2" sx={{ color: '#374151' }}>{request.position}</Typography>
                        </div>
                        <StatusBadge status={request.status} />
                      </Box>

                      {(request.status === 'ไม่อนุมัติ (Admin)' && request.admin_comment) && (
                        <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                          <Typography variant="body2" sx={{ color: '#b91c1c', fontWeight: 600, mb: 0.5 }}>เหตุผลที่ไม่อนุมัติ (Admin):</Typography>
                          <Typography variant="body2" sx={{ color: '#7f1d1d' }}>{request.admin_comment}</Typography>
                        </Box>
                      )}
                      {(request.status === 'ไม่อนุมัติ (อาจารย์)' && request.advisor_comment) && (
                        <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                          <Typography variant="body2" sx={{ color: '#b91c1c', fontWeight: 600, mb: 0.5 }}>เหตุผลที่ไม่อนุมัติ (อาจารย์):</Typography>
                          <Typography variant="body2" sx={{ color: '#7f1d1d' }}>{request.advisor_comment}</Typography>
                        </Box>
                      )}
                      {request.status !== 'ไม่อนุมัติ (Admin)' && request.status !== 'ไม่อนุมัติ (อาจารย์)' && request.admin_comment && (
                        <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: '#eff6ff', borderRadius: '8px', borderLeft: '4px solid #2563eb' }}>
                          <Typography variant="body2" sx={{ color: '#1e40af', fontWeight: 700, mb: 0.5 }}>📌 ข้อความ/คำแนะนำจากผู้ดูแลระบบ:</Typography>
                          <Typography variant="body2" sx={{ color: '#1e3a8a' }}>{request.admin_comment}</Typography>
                        </Box>
                      )}
                      {request.status !== 'ไม่อนุมัติ (Admin)' && request.status !== 'ไม่อนุมัติ (อาจารย์)' && request.advisor_comment && (
                        <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #16a34a' }}>
                          <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 700, mb: 0.5 }}>📌 ข้อความ/คำแนะนำจากอาจารย์ที่ปรึกษา:</Typography>
                          <Typography variant="body2" sx={{ color: '#14532d' }}>{request.advisor_comment}</Typography>
                        </Box>
                      )}
                      {(request.status === 'ปฏิเสธ' && request.company_comment) && (
                        <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                          <Typography variant="body2" sx={{ color: '#b91c1c', fontWeight: 600, mb: 0.5 }}>เหตุผลที่ปฏิเสธ (บริษัท):</Typography>
                          <Typography variant="body2" sx={{ color: '#7f1d1d' }}>{request.company_comment}</Typography>
                        </Box>
                      )}

                      {request.dispatchLetter && (
                        <Box
                          sx={{
                            mt: 2,
                            p: 2,
                            bgcolor: '#fff1f2',
                            borderRadius: '12px',
                            border: '1.5px solid #fecdd3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 1.5,
                            boxShadow: '0 2px 10px rgba(225, 29, 72, 0.06)'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '10px',
                                bgcolor: '#ffe4e6',
                                color: '#be185d',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              <DocumentTextIcon style={{ width: 22, height: 22 }} />
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#881337', fontSize: '0.92rem' }}>
                                เอกสารหนังสือส่งตัวฝึกงาน (Dispatch Letter)
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#be185d', display: 'block', fontWeight: 500 }}>
                                {request.dispatchLetter.fileName || 'หนังสือส่งตัวจากผู้ดูแลระบบ'}
                              </Typography>
                            </Box>
                          </Box>

                          {request.dispatchLetter.dataUrl && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<EyeIcon style={{ width: 16, height: 16 }} />}
                                onClick={() => {
                                  const letter = request.dispatchLetter;
                                  const blobUrl = dataUrlToBlobUrl(letter.dataUrl);
                                  setDocModal({
                                    open: true,
                                    dataUrl: letter.dataUrl,
                                    fileName: letter.fileName || 'หนังสือส่งตัวฝึกงาน.pdf',
                                    blobUrl,
                                  });
                                }}
                                sx={{
                                  bgcolor: '#be185d',
                                  '&:hover': { bgcolor: '#9d174d' },
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                  borderRadius: 2,
                                  px: 2,
                                  py: 0.6,
                                  boxShadow: '0 2px 6px rgba(190, 24, 93, 0.25)'
                                }}
                              >
                                ดูเอกสาร
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ArrowDownTrayIcon style={{ width: 16, height: 16 }} />}
                                onClick={() => {
                                  const letter = request.dispatchLetter;
                                  handleDownloadFile(letter.dataUrl, letter.fileName || 'หนังสือส่งตัวฝึกงาน.pdf');
                                }}
                                sx={{
                                  borderColor: '#be185d',
                                  color: '#be185d',
                                  '&:hover': { borderColor: '#9d174d', bgcolor: '#fff1f2' },
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                  borderRadius: 2,
                                  px: 1.75,
                                  py: 0.6,
                                }}
                              >
                                ดาวน์โหลด
                              </Button>
                            </Box>
                          )}
                        </Box>
                      )}

                      <Box className="request-footer" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', paddingTop: '0.75rem' }}>
                        <div className="request-date">
                          <span className="request-date-label"> ยื่นเมื่อ</span>
                          <span className="request-date-text" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, color: '#111827' }}>
                            <span>{formatThaiDateTime(request.submittedDate).date}</span>
                            <span>{formatThaiDateTime(request.submittedDate).time}</span>
                          </span>
                        </div>
                        <Button component={Link} to={`/dashboard/request/${request.id}`} variant="text" sx={{ textTransform: 'none', color: '#be185d', fontWeight: 600 }}>
                          ดูรายละเอียด →
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
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

        {/* Document Preview Modal */}
        <Dialog
          open={docModal.open}
          onClose={() => setDocModal({ open: false, dataUrl: '', fileName: '', blobUrl: '' })}
          maxWidth="md"
          fullWidth
          disableScrollLock={true}
          PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  bgcolor: '#ffe4e6',
                  color: '#be185d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <DocumentTextIcon style={{ width: 18, height: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                {docModal.fileName || 'หนังสือส่งตัวฝึกงาน'}
              </Typography>
            </Box>
            <Button size="small" onClick={() => setDocModal({ open: false, dataUrl: '', fileName: '', blobUrl: '' })} sx={{ color: '#64748b', fontWeight: 700 }}>
              ปิด
            </Button>
          </DialogTitle>
          <DialogContent sx={{ p: 2, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh' }}>
            {docModal.open && (docModal.blobUrl || docModal.dataUrl) && (
              docModal.dataUrl?.startsWith('data:image/') ? (
                <img
                  src={docModal.dataUrl}
                  alt={docModal.fileName}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                />
              ) : (
                <iframe
                  src={docModal.blobUrl || docModal.dataUrl}
                  title={docModal.fileName}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px', backgroundColor: '#fff' }}
                />
              )
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="contained"
              startIcon={<ArrowDownTrayIcon style={{ width: 18, height: 18 }} />}
              onClick={() => handleDownloadFile(docModal.dataUrl, docModal.fileName)}
              sx={{ bgcolor: '#be185d', '&:hover': { bgcolor: '#9d174d' }, fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 2.5 }}
            >
              ดาวน์โหลดไฟล์
            </Button>
            <Button variant="outlined" onClick={() => setDocModal({ open: false, dataUrl: '', fileName: '', blobUrl: '' })} sx={{ borderRadius: 2, textTransform: 'none', color: '#64748b', borderColor: '#cbd5e1' }}>
              ปิดหน้าต่าง
            </Button>
          </DialogActions>
        </Dialog>

        <footer className="dashboard-footer">
          <div className="footer-inner">© 2026 ระบบคำร้องฝึกงานวิชาชีพ. All rights reserved.</div>
        </footer>
      </main>
    </div>
  );
};

export default DashboardPage;

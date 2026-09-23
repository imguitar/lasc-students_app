import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Box, Typography } from '@mui/material';
import SignatureCanvas from 'react-signature-canvas';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Menu as MenuIcon,
  Plus,
  X,
  PenTool,
  CheckCircle2,
  Check,
} from 'lucide-react';
import api from '../../../api/axios';
import './DashboardPage.css';
import '../../Admin/Shared/CheckInPage.css';
import StudentSidebar from '../../../components/StudentSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';
import StatusBadge from '../../../components/StatusBadge';
import ModernButton from '../../../components/ModernButton';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const WEEKDAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

const STATUS_OPTIONS = [
  { value: 'present', label: 'มา' },
  { value: 'sick', label: 'ลาป่วย' },
  { value: 'personal', label: 'ลากิจ' },
  { value: 'holiday', label: 'วันหยุด' },
];

const STATUS_LABEL = {
  present: 'มา',
  late: 'สาย',
  absent: 'ขาด',
  sick: 'ลาป่วย',
  personal: 'ลากิจ',
  holiday: 'วันหยุด',
};

const STATUS_CHIP_CLASS = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  late: 'bg-amber-50 text-amber-700 border-amber-200',
  absent: 'bg-rose-50 text-rose-600 border-rose-200',
  sick: 'bg-sky-50 text-sky-700 border-sky-200',
  personal: 'bg-orange-50 text-orange-700 border-orange-200',
  holiday: 'bg-slate-100 text-slate-500 border-slate-200',
};

const toDateStr = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const StudentCheckInPage = () => {
  const navigate = useNavigate();
  const todayDate = new Date().toISOString().slice(0, 10);
  const sigCanvas = useRef(null);
  const batchSigCanvas = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState('');
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [currentRequestStatus, setCurrentRequestStatus] = useState('ไม่มีคำร้อง');
  const [internshipStartDate, setInternshipStartDate] = useState(null);
  const [showSignature, setShowSignature] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [dayModal, setDayModal] = useState({ open: false, date: '' });
  const [submitting, setSubmitting] = useState(false);
  // Batch supervisor signature (เซ็นรับรองย้อนหลังหลายวัน)
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [mentorName, setMentorName] = useState('');
  const [mentorComment, setMentorComment] = useState('');
  const [signSubmitting, setSignSubmitting] = useState(false);
  const [signError, setSignError] = useState('');
  const [form, setForm] = useState({
    date: todayDate,
    status: 'present',
    workExperience: '',
    note: ''
  });

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const cleanStr = String(dateStr).split('T')[0];
      const [year, month, day] = cleanStr.split('-');
      if (year && month && day) {
        const thaiYear = parseInt(year) > 2500 ? year : parseInt(year) + 543;
        return `${day}/${month}/${thaiYear}`;
      }
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return cleanStr;
      return dateObj.toLocaleDateString('th-TH');
    } catch (e) {
      return String(dateStr).split('T')[0];
    }
  };

  const formatDateLong = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(`${String(dateStr).split('T')[0]}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(dateStr);
    return date.toLocaleDateString('th-TH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }

    const parsed = JSON.parse(userStr);
    if (parsed.role === 'admin') {
      navigate('/admin-dashboard');
      return;
    }
    if (parsed.role === 'advisor') {
      navigate('/advisor-dashboard');
      return;
    }
    if (parsed.role !== 'student') {
      navigate('/login');
      return;
    }

    setUser(parsed);
    const studentId = parsed.student_code || parsed.studentId || parsed.username || parsed.email;

    // Load requests from API
    api.get(`/requests?studentId=${studentId}`).then(res => {
      const ownRequests = res.data.data || [];
      const latestRequest = [...ownRequests].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.submittedDate || 0).getTime();
        const dateB = new Date(b.updated_at || b.submittedDate || 0).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      })[0];

      setCurrentRequestStatus(latestRequest?.status || 'ไม่มีคำร้อง');
      const activeStatuses = ['ออกฝึกงาน', 'กำลังออกฝึกงาน', 'INTERNING', 'IN_PROGRESS', 'TRAINING', 'START_INTERNSHIP'];
      const completedStatuses = ['ฝึกงานเสร็จแล้ว', 'ประเมินจากสถานประกอบการแล้ว', 'ประเมินจากอาจารย์แล้ว', 'เสร็จสิ้นสมบูรณ์'];
      const isInternshipStarted = ownRequests.some((request) => activeStatuses.includes(request.status));
      const isInternshipCompleted = completedStatuses.includes(latestRequest?.status);
      setCanCheckIn(isInternshipStarted);

      const approvedRequest = ownRequests.find(r => activeStatuses.includes(r.status) || completedStatuses.includes(r.status)) || latestRequest;
      const sDate = approvedRequest?.internship_start_date
        || (activeStatuses.includes(approvedRequest?.status) ? String(approvedRequest.updated_at || approvedRequest.submittedDate || '').split('T')[0] : null);
      setInternshipStartDate(sDate);

      if (!isInternshipStarted && !isInternshipCompleted) {
        setMessage('ยังไม่สามารถใช้งานรายงานประจำวันได้ กรุณารอให้ผู้ดูแลระบบกดเริ่มฝึกงานก่อน');
        return;
      }
      if (isInternshipCompleted) {
        setMessage('การฝึกงานของคุณเสร็จสมบูรณ์เรียบร้อยแล้ว');
      }

      // Load checkins from API
      api.get(`/checkins?studentId=${studentId}`).then(checkinRes => {
        const ownEntries = checkinRes.data.data || [];
        ownEntries.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        setEntries(ownEntries);
      }).catch(err => console.error('Failed to load checkins:', err));
    }).catch(err => console.error('Failed to load requests:', err));
  }, [navigate]);

  const entriesByDate = useMemo(() => {
    const map = {};
    entries.forEach((entry) => {
      const key = String(entry.date || '').split('T')[0];
      if (key) map[key] = entry;
    });
    return map;
  }, [entries]);

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(toDateStr(year, month, d));
    return cells;
  }, [calendarMonth]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const openDayModal = (dateStr) => {
    const entry = entriesByDate[dateStr];
    const isFuture = dateStr > todayDate;
    const beforeStart = internshipStartDate && dateStr < internshipStartDate;
    if (!entry && (isFuture || beforeStart)) return;
    setDayModal({ open: true, date: dateStr });
    setShowSignature(false);
    setForm({
      date: dateStr,
      status: 'present',
      workExperience: '',
      note: '',
    });
    setMessage('');
  };

  const closeDayModal = () => {
    setDayModal({ open: false, date: '' });
    setShowSignature(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user || !canCheckIn || submitting) return;

    if (form.date > todayDate) {
      setMessage('ไม่สามารถบันทึกรายงานล่วงหน้าได้');
      return;
    }
    if (internshipStartDate && form.date < internshipStartDate) {
      setMessage(`ไม่สามารถบันทึกก่อนวันเริ่มฝึกงานได้ (เริ่ม ${formatDateDisplay(internshipStartDate)})`);
      return;
    }

    const studentId = user.student_code || user.studentId || user.username || user.email;
    const studentName = user.full_name || user.name || user.username || 'นักศึกษา';

    let supervisorSignature = null;
    if (showSignature && sigCanvas.current && !sigCanvas.current.isEmpty()) {
      supervisorSignature = sigCanvas.current.getCanvas().toDataURL('image/png');
    }

    setSubmitting(true);
    try {
      await api.post('/checkins', {
        studentId,
        studentName,
        date: form.date,
        status: form.status,
        workExperience: form.workExperience || '',
        note: form.note || '',
        supervisorSignature,
      });

      setMessage('บันทึกรายงานประจำวันเรียบร้อยแล้ว');
      setForm((prev) => ({ ...prev, workExperience: '', note: '' }));
      if (sigCanvas.current) sigCanvas.current.clear();
      setShowSignature(false);
      closeDayModal();

      // Reload checkins from API
      const checkinRes = await api.get(`/checkins?studentId=${studentId}`);
      const ownEntries = checkinRes.data.data || [];
      ownEntries.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      setEntries(ownEntries);
    } catch (error) {
      if (error.response?.status === 409) {
        setMessage('คุณเช็คชื่อของวันนี้ไปแล้ว (จะรีเซ็ตในวันถัดไปหลัง 07:00 น.)');
      } else {
        setMessage('เกิดข้อผิดพลาด: ' + (error.response?.data?.message || error.message));
      }
      closeDayModal();
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEntry = dayModal.date ? entriesByDate[dayModal.date] : null;

  // --- Batch supervisor signature (เซ็นรับรองย้อนหลังหลายวัน) ---
  const isSelectableForSign = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(`${dateStr}T00:00:00`);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    return !isWeekend && dateStr <= todayDate && (!internshipStartDate || dateStr >= internshipStartDate);
  };

  const toggleDateSelection = (dateStr) => {
    if (!isSelectableForSign(dateStr)) return;
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  };

  const selectableDaysInMonth = useMemo(
    () => calendarCells.filter((dateStr) => dateStr && isSelectableForSign(dateStr)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calendarCells, internshipStartDate, todayDate]
  );

  const unsignedDaysInMonth = useMemo(
    () => selectableDaysInMonth.filter((dateStr) => {
      const entry = entriesByDate[dateStr];
      return entry && !(entry.supervisor_signature || entry.supervisorSignature);
    }),
    [selectableDaysInMonth, entriesByDate]
  );

  const handleSubmitBatchSign = async () => {
    if (!batchSigCanvas.current || batchSigCanvas.current.isEmpty()) {
      setSignError('กรุณาวาดลายเซ็นพี่เลี้ยงก่อนกดยืนยัน');
      return;
    }
    if (selectedDates.length === 0) {
      setSignError('กรุณาเลือกวันที่ต้องการเซ็นรับรอง');
      return;
    }

    setSignSubmitting(true);
    setSignError('');
    try {
      const signatureDataUrl = batchSigCanvas.current.getCanvas().toDataURL('image/png');
      const studentId = user.student_code || user.studentId || user.username || user.email;
      const studentName = user.full_name || user.name || user.username || 'นักศึกษา';
      const res = await api.patch('/checkins/batch-sign', {
        studentId,
        studentName,
        dates: selectedDates,
        supervisorSignature: signatureDataUrl,
        supervisorName: mentorName.trim() || null,
        supervisorComment: mentorComment.trim() || null,
      });

      const updated = res.data?.data;
      if (Array.isArray(updated)) {
        updated.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        setEntries(updated);
      } else {
        const checkinRes = await api.get(`/checkins?studentId=${studentId}`);
        const ownEntries = checkinRes.data.data || [];
        ownEntries.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        setEntries(ownEntries);
      }

      setMessage(`บันทึกลายเซ็นพี่เลี้ยงรับรองเรียบร้อยแล้ว (${selectedDates.length} วัน)`);
      setSignModalOpen(false);
      setIsBatchMode(false);
      setSelectedDates([]);
      setMentorName('');
      setMentorComment('');
    } catch (err) {
      setSignError(err.response?.data?.message || err.message || 'บันทึกลายเซ็นล้มเหลว');
    } finally {
      setSignSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', bgcolor: '#ffffff', pt: '60px' }}>
      {/* Mobile top navbar */}
      <div className="mobile-top-navbar flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu"><MenuIcon className="w-5 h-5" /></button>
          <Link to="/" className="mobile-top-logo flex items-center shrink-0" aria-label="LASC Home">
            <img src={lascLogo} alt="LASC Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
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
        currentPath="/dashboard/check-in"
        handleLogout={handleLogout}
      />

      {/* Main content — natural document scroll (works on iOS/iPad) */}
      <Box
        component="main"
        sx={{
          flex: 1,
          /* sidebar shows only at lg (≥1200px) — match that breakpoint */
          ml: { xs: 0, lg: '260px' },
          p: { xs: 2, sm: 3 },
          pb: { xs: '6rem', sm: '6rem' },
          /* outer Box already has pt:'60px' for the fixed navbar — just add breathing room */
          pt: { xs: 2, sm: 3 },
          minWidth: 0,
        }}
      >
        <Box component="header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#111111', fontSize: { xs: '1.5rem', sm: '2rem' } }}>รายงานประจำวัน</Typography>
            <Typography variant="body1" sx={{ color: '#333333', mt: 0.5 }}>รายงานตัวและบันทึกประสบการณ์การทำงานในแต่ละวัน</Typography>
          </Box>
          <Box className="user-info">
            <span>{user.full_name || user.name || user.username}</span>
          </Box>
        </Box>

        <div className="content-wrapper max-w-full overflow-x-hidden">
          {!canCheckIn ? (
            ['ฝึกงานเสร็จแล้ว', 'ประเมินจากสถานประกอบการแล้ว', 'ประเมินจากอาจารย์แล้ว', 'เสร็จสิ้นสมบูรณ์'].includes(currentRequestStatus) ? (
              <div className="checkin-card">
                <h3>การฝึกงานเสร็จสิ้นแล้ว</h3>
                <Box sx={{ mt: 1, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">สถานะคำร้องปัจจุบัน:</Typography>
                  <StatusBadge status={currentRequestStatus} />
                </Box>
                <p>คุณได้ผ่านการฝึกงานเรียบร้อยแล้ว ไม่จำเป็นต้องรายงานประจำวันอีกต่อไป</p>
                <div className="checkin-actions" style={{ marginTop: '1.25rem' }}>
                  <Link to="/dashboard/my-requests" style={{ textDecoration: 'none' }}>
                    <ModernButton customVariant="primary">ไปที่คำร้องของฉัน</ModernButton>
                  </Link>
                </div>
                {message && <div className="checkin-message" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>{message}</div>}
              </div>
            ) : (
              <div className="checkin-card">
                <h3>ยังไม่สามารถรายงานประจำวันได้</h3>
                <Box sx={{ mt: 1, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">สถานะคำร้องปัจจุบัน:</Typography>
                  <StatusBadge status={currentRequestStatus} />
                </Box>
                <p>หน้านี้จะใช้งานได้เมื่อผู้ดูแลระบบกด "เริ่มฝึกงาน" ให้คุณแล้วเท่านั้น</p>
                <div className="checkin-actions" style={{ marginTop: '1.25rem' }}>
                  <Link to="/dashboard/my-requests" style={{ textDecoration: 'none' }}>
                    <ModernButton customVariant="primary">ไปที่คำร้องของฉัน</ModernButton>
                  </Link>
                </div>
                {message && <div className="checkin-message">{message}</div>}
              </div>
            )
          ) : (
            <>
              {/* Notice Banner */}
              <Box sx={{ mb: 2.5, p: 2, borderRadius: 3, bgcolor: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <InformationCircleIcon style={{ width: 22, height: 22, flexShrink: 0, marginTop: 2, color: '#0284c7' }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0369a1' }}>
                    ข้อแนะนำการเช็คชื่อรายงานประจำวัน
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', mt: 0.5 }}>
                    คลิกที่ช่องวันที่ในปฏิทินเพื่อบันทึกรายงานของวันนั้น ระบบจะรีเซ็ตสิทธิ์วันใหม่ทุกวันเวลา <strong>07:00 น.</strong>
                  </Typography>
                </Box>
              </Box>

              {/* Calendar Dashboard */}
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-xs overflow-hidden">
                {/* Calendar Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-violet-50 border border-violet-100/80 flex items-center justify-center shrink-0">
                      <CalendarDays className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-slate-800 m-0">ปฏิทินรายงานประจำวัน</h2>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          กำลังออกฝึกงาน
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 m-0">สถานะคำร้องปัจจุบัน: {currentRequestStatus}</p>
                    </div>
                  </div>

                  {/* Month Navigator */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBatchMode(!isBatchMode);
                        setSelectedDates([]);
                      }}
                      className={`h-9 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border flex items-center gap-1.5 ${
                        isBatchMode
                          ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                          : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
                      }`}
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      {isBatchMode ? 'ยกเลิกโหมดเซ็น' : 'พี่เลี้ยงเซ็นรับรอง'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                      className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600 text-slate-500 flex items-center justify-center transition cursor-pointer"
                      aria-label="เดือนก่อนหน้า"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-[130px] text-center text-sm font-bold text-slate-800 select-none">
                      {THAI_MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear() + 543}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                      className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600 text-slate-500 flex items-center justify-center transition cursor-pointer"
                      aria-label="เดือนถัดไป"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { const d = new Date(); setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}
                      className="ml-1 h-9 px-3 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold transition cursor-pointer border-none"
                    >
                      วันนี้
                    </button>
                  </div>
                </div>

                {/* Batch Sign Toolbar */}
                {isBatchMode && (
                  <div className="mx-3 sm:mx-4 mb-3 rounded-2xl bg-rose-50/60 border border-rose-100 px-3.5 py-3 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-rose-700">เลือกวันที่ให้พี่เลี้ยงเซ็นรับรอง:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDates(selectableDaysInMonth)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-600 text-[11px] font-semibold hover:bg-rose-50 transition cursor-pointer"
                      >
                        เลือกทั้งเดือน ({selectableDaysInMonth.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDates(unsignedDaysInMonth)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-600 text-[11px] font-semibold hover:bg-rose-50 transition cursor-pointer"
                      >
                        เฉพาะวันที่ยังไม่เซ็น ({unsignedDaysInMonth.length})
                      </button>
                      {selectedDates.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedDates([])}
                          className="px-2.5 py-1 rounded-lg text-slate-500 text-[11px] font-semibold hover:bg-slate-100 transition cursor-pointer border-none bg-transparent"
                        >
                          ล้างที่เลือก
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSignError(''); setSignModalOpen(true); }}
                      disabled={selectedDates.length === 0}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-[0_4px_14px_rgba(225,29,72,0.25)] transition cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      เซ็นรับรองที่เลือก ({selectedDates.length} วัน)
                    </button>
                  </div>
                )}

                {/* Weekday Header */}
                <div className="grid grid-cols-7 px-3 sm:px-4 pt-3">
                  {WEEKDAY_LABELS.map((label, idx) => (
                    <div key={idx} className={`text-center text-[11px] font-semibold py-1 ${idx === 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {label}
                    </div>
                  ))}
                </div>

                {/* Day Grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2 px-3 sm:px-4 pb-4">
                  {calendarCells.map((dateStr, idx) => {
                    if (!dateStr) return <div key={`empty-${idx}`} className="min-h-[64px] sm:min-h-[88px]" />;
                    const entry = entriesByDate[dateStr];
                    const isToday = dateStr === todayDate;
                    const isFuture = dateStr > todayDate;
                    const beforeStart = internshipStartDate && dateStr < internshipStartDate;
                    const isSigned = Boolean(entry && (entry.supervisor_signature || entry.supervisorSignature));
                    const selectableForSign = isSelectableForSign(dateStr);
                    const isSelectedForSign = selectedDates.includes(dateStr);
                    const clickable = isBatchMode
                      ? selectableForSign
                      : (Boolean(entry) || (!isFuture && !beforeStart));
                    const dayNum = Number(dateStr.split('-')[2]);

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => (isBatchMode ? toggleDateSelection(dateStr) : clickable && openDayModal(dateStr))}
                        disabled={!clickable}
                        className={`min-h-[64px] sm:min-h-[88px] rounded-[22px] border p-1.5 sm:p-2 text-left flex flex-col transition-colors ${
                          isBatchMode && isSelectedForSign
                            ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-200'
                            : isToday
                              ? 'border-violet-500 bg-violet-50/20 shadow-[0_0_0_1px_rgba(139,92,246,0.25)]'
                              : entry
                                ? 'border-slate-100 bg-white hover:border-violet-200 hover:bg-violet-50/40'
                                : isFuture || beforeStart
                                  ? 'border-slate-50 bg-slate-50/40 cursor-default'
                                  : 'border-slate-100 bg-white hover:border-violet-300 hover:bg-violet-50/40 cursor-pointer'
                        } ${!clickable ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs sm:text-sm font-bold ${isToday ? 'text-violet-700' : isFuture || beforeStart ? 'text-slate-300' : 'text-slate-700'}`}>
                            {dayNum}
                          </span>
                          <span className="flex items-center gap-1">
                            {isBatchMode && selectableForSign && (
                              <span className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center ${isSelectedForSign ? 'bg-rose-500 border-rose-500' : 'bg-white border-slate-300'}`}>
                                {isSelectedForSign && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                              </span>
                            )}
                            {!isBatchMode && isSigned && (
                              <PenTool className="w-3 h-3 text-rose-400" />
                            )}
                            {isToday && (
                              <span className="text-[9px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-md">วันนี้</span>
                            )}
                          </span>
                        </div>

                        <div className="mt-auto min-w-0">
                          {entry ? (
                            <>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[9px] sm:text-[10px] font-bold ${STATUS_CHIP_CLASS[entry.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {STATUS_LABEL[entry.status] || entry.status}
                              </span>
                              {(entry.work_experience || entry.workExperience) && (
                                <p className="hidden sm:block m-0 mt-1 text-[10px] text-slate-400 leading-snug line-clamp-2 break-words">
                                  {entry.work_experience || entry.workExperience}
                                </p>
                              )}
                            </>
                          ) : !isBatchMode && clickable ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-semibold text-violet-400">
                              <Plus className="w-3 h-3" /> ลงบันทึก
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {message && <div className="checkin-message" style={{ marginTop: '1rem' }}>{message}</div>}

              {/* Attendance History Table */}
              <Box className="checkin-table-wrapper" sx={{ marginTop: '2rem', padding: { xs: '1rem', sm: '1.75rem' }, background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: { xs: '1rem', sm: '1.15rem' }, mb: 2 }}>
                  ประวัติรายงานประจำวัน
                </Typography>

                <TableContainer className="checkin-table-container">
                  <Table size="small" className="checkin-table" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>วันที่</TableCell>
                        <TableCell>สถานะ</TableCell>
                        <TableCell>ประสบการณ์ / กิจกรรมที่ทำ</TableCell>
                        <TableCell>ลายเซ็นพี่เลี้ยง</TableCell>
                        <TableCell>ผู้รับรอง / ความเห็น</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {entries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5}>ยังไม่มีประวัติรายงานประจำวัน</TableCell>
                        </TableRow>
                      ) : (
                        entries.map((entry) => (
                          <TableRow key={entry.id} hover>
                            <TableCell sx={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                              {formatDateDisplay(entry.date)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={STATUS_LABEL[entry.status] || entry.status}
                                size="small"
                                sx={{ fontWeight: 700, height: 22, bgcolor: '#f5f3ff', color: '#6d28d9' }}
                              />
                            </TableCell>
                            <TableCell>{entry.work_experience || entry.workExperience || entry.note || '-'}</TableCell>
                            <TableCell>
                              {entry.supervisor_signature || entry.supervisorSignature ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <img
                                    src={entry.supervisor_signature || entry.supervisorSignature}
                                    alt="Supervisor Signature"
                                    style={{ maxHeight: 36, maxWidth: 110, objectFit: 'contain', border: '1px solid #fecdd3', borderRadius: 4, padding: 2, bgcolor: '#fff' }}
                                  />
                                </Box>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>- ยังไม่มีลายเซ็น -</span>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.825rem', color: '#475569' }}>
                              {entry.supervisor_name && <div><strong>พี่เลี้ยง:</strong> {entry.supervisor_name}</div>}
                              {entry.supervisor_comment && <div><strong>ความเห็น:</strong> {entry.supervisor_comment}</div>}
                              {!entry.supervisor_name && !entry.supervisor_comment && (entry.note ? entry.note : '-')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </>
          )}
        </div>
      </Box>

      {/* Day Modal */}
      {dayModal.open && (
        <div
          className="fixed inset-0 z-[1200] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeDayModal}
        >
          <div
            className="bg-white rounded-[28px] p-6 sm:p-7 max-w-md w-full max-h-[90vh] overflow-y-auto border border-violet-100/80 shadow-[0_20px_60px_rgba(124,58,237,0.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-violet-50 border border-violet-100/80 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-800 m-0">
                    {selectedEntry ? 'รายละเอียดรายงานประจำวัน' : 'บันทึกรายงานประจำวัน'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 m-0 leading-relaxed">
                    {formatDateLong(dayModal.date)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDayModal}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer border-none bg-transparent shrink-0"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedEntry ? (
              /* View Mode: existing entry */
              <div className="space-y-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-2.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  บันทึกรายงานวันนี้เรียบร้อยแล้ว
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">สถานะ:</span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold ${STATUS_CHIP_CLASS[selectedEntry.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {STATUS_LABEL[selectedEntry.status] || selectedEntry.status}
                  </span>
                </div>
                {(selectedEntry.work_experience || selectedEntry.workExperience) && (
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1">กิจกรรมที่ทำ</div>
                    <p className="m-0 text-sm text-slate-700 leading-relaxed break-words whitespace-pre-wrap">
                      {selectedEntry.work_experience || selectedEntry.workExperience}
                    </p>
                  </div>
                )}
                {selectedEntry.note && (
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1">หมายเหตุ</div>
                    <p className="m-0 text-xs text-slate-600 leading-relaxed break-words whitespace-pre-wrap">{selectedEntry.note}</p>
                  </div>
                )}
                {(selectedEntry.supervisor_signature || selectedEntry.supervisorSignature) && (
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1.5">ลายเซ็นพี่เลี้ยง / ผู้ดูแล</div>
                    <div className="w-40 h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                      <img
                        src={selectedEntry.supervisor_signature || selectedEntry.supervisorSignature}
                        alt="ลายเซ็นพี่เลี้ยง"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={closeDayModal}
                  className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer bg-transparent mt-1"
                >
                  ปิด
                </button>
              </div>
            ) : (
              /* Form Mode: new entry */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">วันที่รายงาน</label>
                  <input
                    type="text"
                    value={formatDateLong(form.date)}
                    disabled
                    className="w-full box-border h-11 px-3.5 text-xs text-slate-500 bg-slate-100/80 border border-slate-200 rounded-xl cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                    สถานะการมา <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full box-border h-11 px-3.5 text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                    กิจกรรมที่ทำในวันนี้ <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={form.workExperience}
                    onChange={(e) => setForm({ ...form, workExperience: e.target.value })}
                    placeholder="ระบุรายละเอียดงานหรือประสบการณ์ที่ได้รับการฝึกปฏิบัติในวันนี้..."
                    required
                    className="w-full box-border rounded-2xl border border-slate-200 p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 resize-none h-24 text-slate-800 bg-slate-50/50 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="เช่น เหตุผลการลา หรือข้อมูลเพิ่มเติมอื่นๆ..."
                    className="w-full box-border rounded-2xl border border-slate-200 p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 resize-none h-16 text-slate-800 bg-slate-50/50 focus:bg-white transition"
                  />
                </div>

                {/* Supervisor Signature */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSignature(!showSignature)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 transition cursor-pointer border-none bg-transparent p-0"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    {showSignature ? 'ซ่อนช่องลายเซ็นพี่เลี้ยง' : 'แนบลายเซ็นยืนยันจากพี่เลี้ยง (ไม่บังคับ)'}
                  </button>

                  {showSignature && (
                    <div className="mt-2.5 p-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/30">
                      <p className="text-[11px] text-slate-500 m-0 mb-2">ให้พี่เลี้ยงเซ็นกำกับรายงานวันนี้เพื่อความถูกต้อง</p>
                      <div className="rounded-xl border border-slate-200 bg-white h-32 overflow-hidden mb-2">
                        <SignatureCanvas
                          ref={sigCanvas}
                          penColor="#312e81"
                          canvasProps={{ className: 'sigCanvas', style: { width: '100%', height: '100%' } }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 transition cursor-pointer border-none bg-transparent p-0"
                      >
                        ล้างลายเซ็น
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeDayModal}
                    disabled={submitting}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer bg-transparent disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !form.workExperience.trim()}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-[0_4px_14px_rgba(124,58,237,0.25)] transition cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {submitting ? 'กำลังบันทึก...' : 'บันทึกรายงาน'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Batch Supervisor Sign Modal */}
      {signModalOpen && (
        <div
          className="fixed inset-0 z-[1200] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !signSubmitting && setSignModalOpen(false)}
        >
          <div
            className="bg-white rounded-[28px] p-6 sm:p-7 max-w-md w-full max-h-[90vh] overflow-y-auto border border-rose-100 shadow-[0_20px_60px_rgba(225,29,72,0.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <PenTool className="w-5 h-5 text-rose-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-800 m-0">ลายเซ็นรับรองจากพี่เลี้ยง</h3>
                <p className="text-[11px] text-slate-400 mt-1 m-0 leading-relaxed">
                  เซ็นรับรองรายงานประจำวันย้อนหลัง {selectedDates.length} วันที่เลือกไว้
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">ชื่อพี่เลี้ยง / ผู้รับรอง</label>
                <input
                  type="text"
                  value={mentorName}
                  onChange={(e) => setMentorName(e.target.value)}
                  placeholder="เช่น คุณสมชาย ใจดี"
                  className="w-full box-border h-11 px-3.5 text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/15 focus:border-rose-400 transition placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">ความเห็นเพิ่มเติม (ถ้ามี)</label>
                <textarea
                  value={mentorComment}
                  onChange={(e) => setMentorComment(e.target.value)}
                  placeholder="ความเห็นหรือข้อเสนอแนะจากพี่เลี้ยง..."
                  className="w-full box-border rounded-2xl border border-slate-200 p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/15 focus:border-rose-400 resize-none h-16 text-slate-800 bg-slate-50/50 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                  ลายเซ็นพี่เลี้ยง <span className="text-rose-500">*</span>
                </label>
                <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/20 p-2">
                  <div className="rounded-lg border border-slate-200 bg-white h-36 overflow-hidden">
                    <SignatureCanvas
                      ref={batchSigCanvas}
                      penColor="#312e81"
                      canvasProps={{ className: 'sigCanvas', style: { width: '100%', height: '100%' } }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => batchSigCanvas.current?.clear()}
                    className="mt-2 text-[11px] font-semibold text-rose-500 hover:text-rose-600 transition cursor-pointer border-none bg-transparent p-0"
                  >
                    ล้างลายเซ็น
                  </button>
                </div>
              </div>

              {signError && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 px-3.5 py-2.5 text-xs text-rose-600 font-medium">
                  {signError}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSignModalOpen(false)}
                  disabled={signSubmitting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer bg-transparent disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSubmitBatchSign}
                  disabled={signSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-[0_4px_14px_rgba(225,29,72,0.25)] transition cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {signSubmitting ? 'กำลังบันทึก...' : `ยืนยันเซ็นรับรอง (${selectedDates.length} วัน)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
};

export default StudentCheckInPage;

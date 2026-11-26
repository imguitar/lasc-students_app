import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Typography } from '@mui/material';
import SignatureCanvas from 'react-signature-canvas';
import {
  AlertCircle,
  CalendarDays,
  Menu as MenuIcon,
  X,
  PenTool,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
} from 'lucide-react';
import StudentPageHeader from '../../../components/student/StudentPageHeader';
import useAsyncData from '../../../hooks/useAsyncData';
import { LoadingBlock, ErrorRetry } from '../../../components/common/AsyncStates';
import api from '../../../api/axios';
import { getThaiHoliday, getHolidaySet } from '../../../utils/thaiHolidays';
import { listWorkingDays, addDays } from '../../../utils/workingDays';
import './DashboardPage.css';
import '../../Admin/Shared/CheckInPage.css';
import AttendanceCalendar from '../../../components/AttendanceCalendar';
import DailyReportLockedCard from '../../../components/DailyReportLockedCard';

// รายงานที่กดส่งหลังวันที่ของรายงาน (backend คำนวณ isBackfill จากเวลาที่บันทึกจริง)
const isBackfillEntry = (e) => Number(e?.isBackfill) === 1 || e?.isBackfill === true;
// 'YYYY-MM-DD HH:mm:ss' (เวลาไทยจากฐานข้อมูล) → '6 พ.ย. 2569 19:45 น.'
const formatSubmittedAt = (value) => {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return '-';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} ${m[4]}:${m[5]} น.`;
};
// ค่าวันที่จาก API อาจเป็น 'YYYY-MM-DD' หรือ ISO → 'YYYY-MM-DD' ตามเวลาไทย
const toYMD = (value) => {
  if (!value) return null;
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d);
};

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

// สถานะที่ไม่ต้องกรอก "กิจกรรมที่ทำ" (ลา/วันหยุด) — ใส่ข้อความเริ่มต้นให้เอง
const LEAVE_DEFAULT_TEXT = {
  sick: 'ลาป่วย',
  personal: 'ลากิจ',
  holiday: 'วันหยุดสถานประกอบการ / วันหยุดประจำสัปดาห์',
};

const StudentCheckInPage = () => {
  const navigate = useNavigate();
  const todayDate = new Date().toISOString().slice(0, 10);
  const sigCanvas = useRef(null);
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState('');
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [currentRequestStatus, setCurrentRequestStatus] = useState('ยังไม่มีคำร้อง');
  const [internshipStartDate, setInternshipStartDate] = useState(null);
  const [internshipEndDate, setInternshipEndDate] = useState(null);
  // นับวันขาดบันทึกใหม่เมื่อรายการวันหยุดจากเซิร์ฟเวอร์โหลดเสร็จ
  const [holidayVersion, setHolidayVersion] = useState(0);
  useEffect(() => {
    const onUpdated = () => setHolidayVersion((v) => v + 1);
    window.addEventListener('holidays-updated', onUpdated);
    return () => window.removeEventListener('holidays-updated', onUpdated);
  }, []);
  const [showSignature, setShowSignature] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [dayModal, setDayModal] = useState({ open: false, date: '' });
  const [submitting, setSubmitting] = useState(false);
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

  // โหลดสิทธิ์รายงาน (คำร้อง) + ประวัติเช็คชื่อ: ระหว่างโหลดไม่แสดงการ์ด "ยังไม่สามารถรายงานได้" หลอก
  const { loading, error: loadError, reload } = useAsyncData(async (signal) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/'));
      return null;
    }
    const parsed = JSON.parse(userStr);
    if (parsed.role === 'admin') { navigate('/admin-dashboard'); return null; }
    if (parsed.role === 'advisor') { navigate('/advisor-dashboard'); return null; }
    if (parsed.role !== 'student') {
      navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/'));
      return null;
    }

    const studentId = parsed.student_code || parsed.studentId || parsed.username || parsed.email;
    const res = await api.get(`/requests?studentId=${studentId}`, { signal });
    const ownRequests = res.data.data || [];
    const latestRequest = [...ownRequests].sort((x, y) => {
      const dateX = new Date(x.updated_at || x.submittedDate || 0).getTime();
      const dateY = new Date(y.updated_at || y.submittedDate || 0).getTime();
      if (dateX !== dateY) return dateY - dateX;
      return (Number(y.id) || 0) - (Number(x.id) || 0);
    })[0];

    const activeStatuses = ['ออกฝึกงาน', 'กำลังออกฝึกงาน', 'INTERNING', 'IN_PROGRESS', 'TRAINING', 'START_INTERNSHIP'];
    const completedStatuses = ['ฝึกงานเสร็จแล้ว', 'ประเมินจากสถานประกอบการแล้ว', 'ประเมินจากอาจารย์แล้ว', 'เสร็จสิ้นสมบูรณ์'];
    const isInternshipStarted = ownRequests.some((request) => activeStatuses.includes(request.status));
    const isInternshipCompleted = completedStatuses.includes(latestRequest?.status);

    const approvedRequest = ownRequests.find((r) => activeStatuses.includes(r.status) || completedStatuses.includes(r.status)) || latestRequest;
    const startDate = approvedRequest?.internship_start_date
      || (activeStatuses.includes(approvedRequest?.status) ? String(approvedRequest.updated_at || approvedRequest.submittedDate || '').split('T')[0] : null);

    let ownEntries = [];
    if (isInternshipStarted || isInternshipCompleted) {
      const checkinRes = await api.get(`/checkins?studentId=${studentId}`, { signal });
      ownEntries = checkinRes.data.data || [];
      ownEntries.sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')));
    }
    return {
      parsed,
      status: latestRequest?.status || 'ยังไม่มีคำร้อง',
      canCheckIn: isInternshipStarted,
      startDate,
      endDate: approvedRequest?.internship_end_date || null,
      entries: ownEntries,
    };
  }, 'student-checkin', {
    onSuccess: (d) => {
      if (!d) return;
      setUser(d.parsed);
      setCurrentRequestStatus(d.status);
      setCanCheckIn(d.canCheckIn);
      setInternshipStartDate(d.startDate);
      setInternshipEndDate(d.endDate);
      setEntries(d.entries);
    },
  });

  const entriesByDate = useMemo(() => {
    const map = {};
    entries.forEach((entry) => {
      const key = String(entry.date || '').split('T')[0];
      if (key) map[key] = entry;
    });
    return map;
  }, [entries]);

  // Summary stats for the dashboard side rail
  const stats = useMemo(() => {
    const s = { total: entries.length, present: 0, late: 0, absent: 0, leave: 0, signed: 0 };
    entries.forEach((e) => {
      if (e.status === 'present') s.present += 1;
      else if (e.status === 'late') s.late += 1;
      else if (e.status === 'absent') s.absent += 1;
      else if (['sick', 'personal', 'holiday'].includes(e.status)) s.leave += 1;
      if (e.supervisor_signature || e.supervisorSignature) s.signed += 1;
    });
    return s;
  }, [entries]);

  // สถิติการปฏิบัติงาน 4 ช่อง: ตรงเวลา / ลงย้อนหลัง / ลา / ขาดบันทึก
  const attendance = useMemo(() => {
    const a = { onTime: 0, backfill: 0, leave: 0, missing: 0 };
    entries.forEach((e) => {
      if (['sick', 'personal'].includes(e.status)) a.leave += 1;
      else if (e.status === 'holiday') return;
      else if (isBackfillEntry(e)) a.backfill += 1;
      else a.onTime += 1;
    });
    // ขาดบันทึก = วันทำการ (จ.-ศ. ไม่รวมวันหยุด) ตั้งแต่วันเริ่มฝึกถึงเมื่อวาน (หรือวันสิ้นสุดถ้ามาก่อน) ที่ไม่มีรายงาน
    const start = toYMD(internshipStartDate);
    if (start) {
      const yesterday = addDays(todayDate, -1);
      const end = toYMD(internshipEndDate);
      const until = end && end < yesterday ? end : yesterday;
      a.missing = listWorkingDays(start, until, getHolidaySet()).filter((d) => !entriesByDate[d]).length;
    }
    return a;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, entriesByDate, internshipStartDate, internshipEndDate, todayDate, holidayVersion]);

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
    setHasSignature(false);
  };

  const openDayModal = (dateStr) => {
    const entry = entriesByDate[dateStr];
    const isFuture = dateStr > todayDate;
    const beforeStart = internshipStartDate && dateStr < internshipStartDate;
    if (!entry && (isFuture || beforeStart)) return;
    // วันหยุดนักขัตฤกษ์ → prefill สถานะวันหยุดให้เลย (เปลี่ยนกลับได้)
    const holidayName = getThaiHoliday(dateStr);
    setDayModal({ open: true, date: dateStr });
    // วันย้อนหลังที่ยังไม่ได้บันทึก → บังคับลายเซ็นพี่เลี้ยง → เปิดช่องเซ็นไว้เลย
    setShowSignature(!entry && dateStr < todayDate);
    setHasSignature(false);
    setForm({
      date: dateStr,
      status: holidayName && !entry ? 'holiday' : 'present',
      workExperience: holidayName && !entry ? holidayName : '',
      note: '',
    });
    setMessage('');
  };

  const closeDayModal = () => {
    setDayModal({ open: false, date: '' });
    setShowSignature(false);
  };

  // Find the next unsubmitted day after a given date (within internship range, up to today)
  const findNextPendingDate = (afterDateStr) => {
    const d = new Date(`${afterDateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + 1);
    // hard cap to avoid infinite loops
    for (let i = 0; i < 370; i += 1) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (key > todayDate) return null;
      if ((!internshipStartDate || key >= internshipStartDate) && !entriesByDate[key]) {
        return key;
      }
      d.setDate(d.getDate() + 1);
    }
    return null;
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
        // วันหยุด/ลา — ใส่รายละเอียดอัตโนมัติถ้าเว้นว่าง (ไม่บังคับกรอกงานที่ทำ)
        workExperience: form.workExperience || LEAVE_DEFAULT_TEXT[form.status] || '',
        note: form.note || '',
        supervisorSignature,
      });

      setMessage('บันทึกรายงานประจำวันเรียบร้อยแล้ว');
      setForm((prev) => ({ ...prev, workExperience: '', note: '' }));
      if (sigCanvas.current) sigCanvas.current.clear();
      setShowSignature(false);
      setHasSignature(false);

      // Auto-advance to the next unsubmitted day so back-filling stays in flow
      // (compute before setEntries — selectedEntry resolves from the updated map)
      const nextDate = findNextPendingDate(form.date);
      if (nextDate) {
        setDayModal({ open: true, date: nextDate });
        setForm((prev) => ({ ...prev, date: nextDate }));
      } else {
        closeDayModal();
      }

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
  // วันที่ในอดีตที่ยังไม่มีรายงาน → โหมดบันทึกย้อนหลัง (บังคับลายเซ็นพี่เลี้ยง)
  const isBackfillDay = Boolean(dayModal.date) && dayModal.date < todayDate;
  const isSubmitDisabled = submitting
    || (!LEAVE_DEFAULT_TEXT[form.status] && !form.workExperience.trim())
    || (isBackfillDay && !hasSignature);

  // Called by AttendanceCalendar after a successful mentor batch-sign
  const handleBatchSigned = (updated) => {
    if (Array.isArray(updated)) {
      const sorted = [...updated].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      setEntries(sorted);
    }
    setMessage('บันทึกลายเซ็นพี่เลี้ยงรับรองเรียบร้อยแล้ว');
  };

  if (!user && !loading && !loadError) return null; // กำลังพาไปหน้าอื่น

  return (
    <>

      {/* Main content — natural document scroll (works on iOS/iPad) */}
      <Box
        component="main"
        className="dashboard-main"
      >
        <div className="w-full max-w-7xl mx-auto">
          <StudentPageHeader icon={CalendarDays} title="บันทึกรายงานประจำวัน" subtitle="เช็คชื่อและบันทึกประสบการณ์การฝึกงานในแต่ละวัน" />
        </div>
        {loading ? (
          <div className="w-full max-w-7xl mx-auto">
            <LoadingBlock rows={5} variant="list" label="กำลังโหลดรายงานประจำวัน..." />
          </div>
        ) : loadError ? (
          <div className="w-full max-w-7xl mx-auto">
            <ErrorRetry message="โหลดข้อมูลรายงานประจำวันไม่สำเร็จ" onRetry={reload} />
          </div>
        ) : !canCheckIn ? (
          <DailyReportLockedCard
            requestStatus={currentRequestStatus}
            isCompleted={['ฝึกงานเสร็จแล้ว', 'ประเมินจากสถานประกอบการแล้ว', 'ประเมินจากอาจารย์แล้ว', 'เสร็จสิ้นสมบูรณ์'].includes(currentRequestStatus)}
          />
        ) : (
          <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 min-w-0">
            {/* แถบแนะนำแนวนอนแบบกะทัดรัด */}
            <div
              role="note"
              className="flex items-start gap-2.5 rounded-xl border border-violet-100 bg-violet-50/70 px-4 py-2.5"
            >
              <InformationCircleIcon className="w-5 h-5 text-violet-600 shrink-0 mt-px" aria-hidden="true" />
              <p className="m-0 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <span className="font-bold text-violet-800">ข้อแนะนำการเช็คชื่อรายงานประจำวัน: </span>
                คลิกที่ช่องวันที่ในปฏิทินเพื่อบันทึกรายงานของวันนั้น ระบบจะรีเซ็ตสิทธิ์วันใหม่ทุกวันเวลา <strong>07:00 น.</strong>
              </p>
            </div>

            {/* แถว KPI เดียว: สถิติทั้งหมดรวมที่เดียว */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { key: 'total', label: 'ส่งรายงานแล้ว', value: stats.total, Icon: FileText, box: 'bg-violet-50 text-violet-600', num: 'text-violet-700' },
                { key: 'onTime', label: 'มาตรงเวลา', value: attendance.onTime, Icon: CheckCircle2, box: 'bg-emerald-50 text-emerald-600', num: 'text-emerald-700' },
                { key: 'backfill', label: 'ลงย้อนหลัง / สาย', value: attendance.backfill, Icon: Clock, box: 'bg-amber-50 text-amber-600', num: 'text-amber-700' },
                { key: 'leave', label: 'ลา / วันหยุด', value: stats.leave, Icon: CalendarDays, box: 'bg-sky-50 text-sky-600', num: 'text-sky-700' },
                {
                  key: 'missing', label: 'ขาดบันทึก', value: attendance.missing, Icon: XCircle, box: 'bg-rose-50 text-rose-500', num: 'text-rose-600',
                  hint: 'วันทำการ (จ.-ศ. ไม่รวมวันหยุด) ที่ผ่านมาแล้วแต่ยังไม่มีรายงาน',
                },
                { key: 'signed', label: 'เซ็นรับรองแล้ว', value: stats.signed, Icon: PenTool, box: 'bg-indigo-50 text-indigo-600', num: 'text-indigo-700' },
              ].map((kpi) => {
                const KpiIcon = kpi.Icon;
                return (
                  <div
                    key={kpi.key}
                    title={kpi.hint}
                    className="flex items-center gap-3 min-w-0 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm"
                  >
                    <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${kpi.box}`} aria-hidden="true">
                      <KpiIcon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <div className={`text-xl font-extrabold leading-none ${kpi.num}`}>
                        {kpi.value}<span className="text-[11px] font-semibold text-slate-400 ml-1">วัน</span>
                      </div>
                      <p className="m-0 mt-1 text-[11px] font-semibold text-slate-500 leading-tight">{kpi.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {message && <div className="checkin-message">{message}</div>}

            {/* ปฏิทิน (ซ้าย) + รายละเอียดวันที่เลือก (ขวา) สูงเท่ากัน */}
            <AttendanceCalendar
              splitLayout
              entries={entries}
              studentId={user.student_code || user.studentId || user.username || user.email}
              studentName={user.full_name || user.name || user.username || 'นักศึกษา'}
              internshipStartDate={internshipStartDate}
              accentTheme="violet"
              onDayClick={(item) => {
                // วันที่มีรายงานแล้วดูรายละเอียดในการ์ดขวา; วันที่ยังไม่มีรายงานเปิดฟอร์มบันทึก
                if (!entriesByDate[item.dateKey]) openDayModal(item.dateKey);
              }}
              onBatchSign={handleBatchSigned}
            />

            {/* ประวัติรายงานประจำวัน */}
            <section className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 min-w-0">
              <h2 className="m-0 mb-4 flex items-center gap-2 text-base sm:text-lg font-extrabold text-slate-900">
                <FileText className="w-[18px] h-[18px] text-violet-600" aria-hidden="true" />
                ประวัติรายงานประจำวัน
              </h2>

              {/* Desktop (md ขึ้นไป): ตารางคอลัมน์คงที่ ไม่มี horizontal scroll */}
              <div className="hidden md:block">
                <TableContainer className="checkin-table-container" sx={{ overflowX: 'hidden' }}>
                  <Table size="small" className="checkin-table" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 0, '&.checkin-table th, &.checkin-table td': { whiteSpace: 'normal', overflow: 'hidden' } }}>
                    <colgroup>
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '30%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '22%' }} />
                    </colgroup>
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
                            <TableCell sx={{ fontWeight: 600, color: '#1e293b', verticalAlign: 'top' }}>
                              {formatDateDisplay(entry.date)}
                              {entry.submittedAt && (
                                <div className={`checkin-submitted ${isBackfillEntry(entry) ? 'is-late' : ''}`}>
                                  บันทึกเมื่อ {formatSubmittedAt(entry.submittedAt)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell sx={{ verticalAlign: 'top' }}>
                              <div className="flex flex-col items-start gap-1">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-bold ${STATUS_CHIP_CLASS[entry.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                  {STATUS_LABEL[entry.status] || entry.status}
                                </span>
                                {isBackfillEntry(entry) && <span className="checkin-badge-backfill">ลงย้อนหลัง / ไม่ตรงวัน</span>}
                              </div>
                            </TableCell>
                            <TableCell sx={{ verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                              {entry.work_experience || entry.workExperience || entry.note || '-'}
                            </TableCell>
                            <TableCell sx={{ verticalAlign: 'top' }}>
                              {entry.supervisor_signature || entry.supervisorSignature ? (
                                <img
                                  src={entry.supervisor_signature || entry.supervisorSignature}
                                  alt="ลายเซ็นพี่เลี้ยง"
                                  style={{ maxHeight: 36, maxWidth: '100%', objectFit: 'contain', border: '1px solid #ddd6fe', borderRadius: 4, padding: 2, background: '#fff' }}
                                />
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>ยังไม่มีลายเซ็น</span>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.825rem', color: '#475569', verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
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
              </div>

              {/* Mobile (< 768px): Card Stack แนวตั้ง ข้อมูลครบ ไม่มี horizontal scroll */}
              <div className="md:hidden flex flex-col gap-3">
                {entries.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400">ยังไม่มีประวัติรายงานประจำวัน</div>
                ) : (
                  entries.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800">{formatDateDisplay(entry.date)}</span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-bold ${STATUS_CHIP_CLASS[entry.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {STATUS_LABEL[entry.status] || entry.status}
                        </span>
                      </div>
                      {(entry.submittedAt || isBackfillEntry(entry)) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {isBackfillEntry(entry) && <span className="checkin-badge-backfill">ลงย้อนหลัง / ไม่ตรงวัน</span>}
                          {entry.submittedAt && (
                            <span className={`checkin-submitted ${isBackfillEntry(entry) ? 'is-late' : ''}`}>
                              บันทึกเมื่อ {formatSubmittedAt(entry.submittedAt)}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-3">
                        <div className="text-[11px] font-semibold text-slate-400 mb-0.5">ประสบการณ์ / กิจกรรมที่ทำ</div>
                        <p className="m-0 text-sm text-slate-700 leading-relaxed break-words whitespace-pre-wrap">
                          {entry.work_experience || entry.workExperience || entry.note || '-'}
                        </p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-col gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-semibold text-slate-400 shrink-0">ลายเซ็นพี่เลี้ยง</span>
                          {entry.supervisor_signature || entry.supervisorSignature ? (
                            <img
                              src={entry.supervisor_signature || entry.supervisorSignature}
                              alt="ลายเซ็นพี่เลี้ยง"
                              className="h-9 max-w-[120px] object-contain bg-white border border-violet-100 rounded-md p-0.5"
                            />
                          ) : (
                            <span className="text-xs text-slate-400">ยังไม่มีลายเซ็น</span>
                          )}
                        </div>
                        {(entry.supervisor_name || entry.supervisor_comment) && (
                          <div className="text-xs text-slate-600 leading-relaxed break-words">
                            {entry.supervisor_name && <div><strong>ผู้รับรอง:</strong> {entry.supervisor_name}</div>}
                            {entry.supervisor_comment && <div><strong>ความเห็น:</strong> {entry.supervisor_comment}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </Box>

      {/* Day Modal */}
      {dayModal.open && (
        <div
          className="checkin-modal-backdrop fixed inset-0 z-[1200] flex items-center justify-center p-4"
          onClick={closeDayModal}
        >
          <div
            className="checkin-modal-card max-w-md w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7"
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
                  {getThaiHoliday(dayModal.date) && (
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md bg-violet-50 border border-violet-100 text-[10px] font-bold text-violet-700">
                      {getThaiHoliday(dayModal.date)}
                    </span>
                  )}
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
                  {isBackfillEntry(selectedEntry) && <span className="checkin-badge-backfill">ลงย้อนหลัง / ไม่ตรงวัน</span>}
                </div>
                {selectedEntry.submittedAt && (
                  <div className={`checkin-submitted ${isBackfillEntry(selectedEntry) ? 'is-late' : ''}`}>
                    บันทึกเมื่อ {formatSubmittedAt(selectedEntry.submittedAt)}
                  </div>
                )}
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
                {isBackfillDay && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200/80 px-3.5 py-3 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <p className="text-[11px] font-semibold text-amber-700 m-0 leading-relaxed">
                      การบันทึกย้อนหลังจำเป็นต้องได้รับการลงนามรับรองจากพี่เลี้ยงสถานประกอบการ
                    </p>
                  </div>
                )}
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
                    กิจกรรมที่ทำในวันนี้ {!LEAVE_DEFAULT_TEXT[form.status] && <span className="text-rose-500">*</span>}
                    {LEAVE_DEFAULT_TEXT[form.status] && <span className="text-slate-400 font-normal">(ไม่บังคับ — เว้นว่างได้)</span>}
                  </label>
                  <textarea
                    value={form.workExperience}
                    onChange={(e) => setForm({ ...form, workExperience: e.target.value })}
                    placeholder={form.status === 'holiday' ? 'เช่น วันหยุดนักขัตฤกษ์, วันหยุดสถานประกอบการ... (เว้นว่างได้)' : 'ระบุรายละเอียดงานหรือประสบการณ์ที่ได้รับการฝึกปฏิบัติในวันนี้...'}
                    required={!LEAVE_DEFAULT_TEXT[form.status]}
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

                {/* Supervisor Signature — บังคับเมื่อบันทึกย้อนหลัง */}
                <div>
                  {isBackfillDay ? (
                    <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5 text-violet-600" />
                      ลายมือชื่อพี่เลี้ยงสถานประกอบการ <span className="text-rose-500">*</span>
                    </label>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSignature(!showSignature)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 transition cursor-pointer border-none bg-transparent p-0"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      {showSignature ? 'ซ่อนช่องลายเซ็นพี่เลี้ยง' : 'แนบลายเซ็นยืนยันจากพี่เลี้ยง (ไม่บังคับ)'}
                    </button>
                  )}

                  {(isBackfillDay || showSignature) && (
                    <div className="mt-2.5 p-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/30">
                      <p className="text-[11px] text-slate-500 m-0 mb-2">
                        {isBackfillDay ? 'ให้พี่เลี้ยงเซ็นรับรองการมาปฏิบัติงานย้อนหลังในวันนี้' : 'ให้พี่เลี้ยงเซ็นกำกับรายงานวันนี้เพื่อความถูกต้อง'}
                      </p>
                      <div className="rounded-xl border border-slate-200 bg-white h-32 overflow-hidden mb-2">
                        <SignatureCanvas
                          ref={sigCanvas}
                          penColor="#312e81"
                          onEnd={() => setHasSignature(true)}
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
                  {isBackfillDay && !hasSignature && (
                    <p className="w-full text-center sm:text-right text-[10px] text-amber-600 font-medium m-0">
                      กรุณาให้พี่เลี้ยงลงนามรับรองก่อนบันทึก
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl checkin-btn-primary text-white text-xs font-semibold  transition cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {submitting ? 'กำลังบันทึก...' : 'บันทึกรายงาน'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default StudentCheckInPage;

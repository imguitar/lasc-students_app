import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import api from '../../../api/axios';
import {
  TextField,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
} from '@mui/material';
import { BookOpenText, Pencil, Trash2, X, CalendarCheck, PenLine } from 'lucide-react';
import { AcademicCapIcon, DocumentTextIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Box } from '@mui/material';
import StatCard from '../../../components/StatCard';
import AttendanceCalendar from '../../../components/AttendanceCalendar';
import { countThaiHolidays } from '../../../utils/thaiHolidays';
import './AdminDashboardPage.css';
import '../Shared/CheckInPage.css';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';

const STATUS_LABEL = { present: 'มา', absent: 'ขาด', late: 'สาย', sick: 'ลาป่วย', personal: 'ลากิจ', holiday: 'วันหยุด' };
const STATUS_COLOR = { present: '#10b981', absent: '#ef4444', late: '#f59e0b', sick: '#ec4899', personal: '#f97316', holiday: '#0ea5e9' };

// นับวันทำการ จันทร์–เสาร์ (ไม่นับอาทิตย์) ตามกฎฝึกงานของคณะ
const countWorkingDays = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(String(start).split('T')[0]);
  const e = new Date(String(end).split('T')[0]);
  if (isNaN(s) || isNaN(e) || e < s) return 0;
  let count = 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) count += 1;
  }
  return count;
};

// วันทำการที่ผ่านมาแล้ว (เริ่ม → min(วันนี้, วันจบ))
const countElapsedDays = (start, end) => {
  const today = new Date();
  const e = end ? new Date(String(end).split('T')[0]) : today;
  const cap = e < today ? e : today;
  return countWorkingDays(start, cap.toISOString().slice(0, 10));
};

// สถิติต่อนักศึกษา 1 คน (รวมจาก overview row)
const studentStats = (s) => {
  const submitted = Number(s.submittedDays || 0);
  const present = Number(s.presentCount || 0);
  const late = Number(s.lateCount || 0);
  const absent = Number(s.absentCount || 0);
  const holiday = Number(s.holidayCount || 0);
  const sick = Number(s.sickCount || 0);
  const personal = Number(s.personalCount || 0);
  const total = countWorkingDays(s.startDate, s.endDate);
  const elapsed = countElapsedDays(s.startDate, s.endDate);
  // วันนักขัตฤกษ์ที่ผ่านมาแล้ว — ถ้านักศึกษาไม่ได้ mark วันหยุดเอง ก็ไม่นับเป็นวันขาดส่งรายงาน
  const todayStr = new Date().toISOString().slice(0, 10);
  const elapsedCap = s.endDate && String(s.endDate).split('T')[0] < todayStr ? String(s.endDate).split('T')[0] : todayStr;
  const unmarkedHolidays = Math.max(0, countThaiHolidays(String(s.startDate || '').split('T')[0], elapsedCap) - holiday);
  const unchecked = Math.max(0, elapsed - submitted - unmarkedHolidays);
  const rateBase = Math.max(0, elapsed - holiday - unmarkedHolidays); // วันหยุดไม่หักอัตราการเข้าฝึก
  const rate = rateBase > 0 ? Math.round(((present + late) / rateBase) * 100) : 0;
  return { submitted, present, late, absent, holiday, sick, personal, total, elapsed, unchecked, rate };
};

const formatThaiDate = (dateStr) => {
  if (!dateStr) return '-';
  const clean = String(dateStr).split('T')[0];
  const [y, m, d] = clean.split('-');
  if (!y || !m || !d) return clean;
  return `${d}/${m}/${parseInt(y) > 2500 ? y : parseInt(y) + 543}`;
};

const AdminCheckInPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ search: '', department: 'all' });
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [statFilter, setStatFilter] = useState('all'); // 'all' | 'submitted' | 'warning'

  // สมุดบันทึกรายคน (fullscreen dialog)
  const [diary, setDiary] = useState({ open: false, student: null, entries: [], loading: false });
  const [diaryView, setDiaryView] = useState('calendar'); // 'calendar' | 'list'
  const [editDialog, setEditDialog] = useState({ open: false, target: null, date: '', status: 'present', note: '' });

  const loadOverview = () => {
    api.get('/checkins/overview')
      .then((res) => setStudents(res.data.data || []))
      .catch((err) => console.error('Failed to load checkin overview:', err));
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/'));
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    setAdminName(user.name || 'Admin');
    loadOverview();
  }, [navigate]);

  useEffect(() => {
    setDepartmentOptions(
      Array.from(new Set(students.map((s) => s.department).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th-TH'))
    );
  }, [students]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const deptStudents = useMemo(() => students.filter((s) =>
    filters.department === 'all' || s.department === filters.department
  ), [students, filters.department]);

  // สถิติภาพรวม 4 การ์ด (ตาม scope สาขาที่เลือก)
  const globalStats = useMemo(() => {
    let present = 0, late = 0, absent = 0, unchecked = 0;
    deptStudents.forEach((s) => {
      const st = studentStats(s);
      present += st.present; late += st.late; absent += st.absent; unchecked += st.unchecked;
    });
    const totalSent = present + late + absent;
    const elapsed = totalSent + unchecked;
    return {
      students: deptStudents.length,
      submitted: totalSent,
      needFollowUp: absent + unchecked,
      rate: elapsed > 0 ? Math.round(((present + late) / elapsed) * 100) : 0,
    };
  }, [deptStudents]);

  const filteredStudents = useMemo(() => {
    let list = deptStudents;
    if (filters.search) {
      const term = filters.search.toLowerCase();
      list = list.filter((s) =>
        String(s.studentName || '').toLowerCase().includes(term)
        || String(s.studentId || '').toLowerCase().includes(term)
        || String(s.company || '').toLowerCase().includes(term));
    }
    if (statFilter === 'submitted') {
      list = list.filter((s) => Number(s.submittedDays || 0) > 0);
    } else if (statFilter === 'warning') {
      list = list.filter((s) => {
        const st = studentStats(s);
        return st.absent + st.unchecked > 0 || st.rate < 80;
      }).sort((a, b) => {
        const wA = studentStats(a), wB = studentStats(b);
        const diff = (wB.absent + wB.unchecked) - (wA.absent + wA.unchecked);
        return diff !== 0 ? diff : wA.rate - wB.rate;
      });
    }
    return list;
  }, [deptStudents, filters.search, statFilter]);

  const openDiary = async (student) => {
    setDiary({ open: true, student, entries: [], loading: true });
    try {
      const res = await api.get('/checkins', { params: { studentId: student.studentId } });
      const entries = (res.data.data || []).sort((a, b) => String(a.date).localeCompare(String(b.date)));
      setDiary((prev) => ({ ...prev, entries, loading: false }));
    } catch (err) {
      console.error('Failed to load student checkins:', err);
      setDiary((prev) => ({ ...prev, loading: false }));
    }
  };

  const closeDiary = () => setDiary({ open: false, student: null, entries: [], loading: false });

  const handleOpenEdit = (entry) => {
    setEditDialog({ open: true, target: entry, date: entry.date || '', status: entry.status || 'present', note: entry.note || '' });
  };

  const handleCloseEdit = () => setEditDialog({ open: false, target: null, date: '', status: 'present', note: '' });

  const reloadDiaryEntries = async () => {
    if (!diary.student) return;
    const res = await api.get('/checkins', { params: { studentId: diary.student.studentId } });
    const entries = (res.data.data || []).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    setDiary((prev) => ({ ...prev, entries }));
    loadOverview();
  };

  const handleSaveEdit = async () => {
    if (!editDialog.target) return;
    if (!editDialog.date) {
      alert('กรุณาระบุวันที่');
      return;
    }
    const hasDuplicateDate = diary.entries.some((entry) =>
      entry.id !== editDialog.target.id
      && String(entry.studentId) === String(editDialog.target.studentId)
      && String(entry.date).split('T')[0] === String(editDialog.date).split('T')[0]
    );
    if (hasDuplicateDate) {
      alert('นักศึกษาคนนี้มีรายงานประจำวันในวันที่นี้แล้ว');
      return;
    }
    try {
      await api.post('/checkins', {
        studentId: editDialog.target.studentId,
        studentName: editDialog.target.studentName,
        date: editDialog.date,
        status: editDialog.status,
        note: editDialog.note,
      });
      await reloadDiaryEntries();
    } catch (err) {
      alert('บันทึกล้มเหลว: ' + (err.response?.data?.message || err.message));
    }
    handleCloseEdit();
  };

  const handleDelete = async (entry) => {
    const confirmed = await window.showMuiConfirm?.('ยืนยันการลบรายงานประจำวันนี้?', {
      title: 'ยืนยันการลบ', confirmText: 'ลบรายการ', cancelText: 'ยกเลิก',
    }) ?? window.confirm('ยืนยันการลบรายงานประจำวันนี้?');
    if (!confirmed) return;
    try {
      await api.delete(`/checkins/${entry.id}`);
      await reloadDiaryEntries();
    } catch (err) {
      alert('ลบล้มเหลว: ' + (err.response?.data?.message || err.message));
    }
  };

  const ProgressCell = ({ s }) => {
    const st = studentStats(s);
    const pct = st.total > 0 ? Math.min(100, Math.round((st.submitted / st.total) * 100)) : 0;
    return (
      <div style={{ minWidth: 140 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: 4 }}>
          <span>ส่งแล้ว {st.submitted}/{st.total || '?'} วัน</span>
          <span style={{ fontWeight: 700, color: pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#64748b' }}>{st.total ? `${pct}%` : '-'}</span>
        </div>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 7, borderRadius: 99, bgcolor: '#f1f5f9',
            '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#8b5cf6' },
          }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 6, fontSize: '0.68rem', fontWeight: 600 }}>
          <span style={{ color: '#059669' }}>มา {st.present}</span>
          <span style={{ color: '#d97706' }}>สาย {st.late}</span>
          <span style={{ color: '#dc2626' }}>ขาด {st.absent}</span>
          {st.sick > 0 && <span style={{ color: '#db2777' }}>ลาป่วย {st.sick}</span>}
          {st.personal > 0 && <span style={{ color: '#ea580c' }}>ลากิจ {st.personal}</span>}
          {st.holiday > 0 && <span style={{ color: '#0284c7' }}>วันหยุด {st.holiday}</span>}
          <span style={{ color: '#94a3b8' }}>ไม่ได้เช็ค {st.unchecked}</span>
        </div>
      </div>
    );
  };

  const pendingBadge = (n) => n > 0
    ? <Chip size="small" label={`รอลายเซ็น ${n} วัน`} sx={{ bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 600, fontSize: '0.68rem', height: 22 }} />
    : <Chip size="small" label="ลายเซ็นครบ" sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 600, fontSize: '0.68rem', height: 22 }} />;

  return (
    <div className="admin-dashboard-container">
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
      <AdminSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/admin-dashboard/checkins"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>รายงานและการเข้าฝึกงาน</h1>
            <p>ติดตามการส่งสมุดบันทึกรายวันของนักศึกษาที่กำลังฝึกงาน รายบุคคล</p>
          </div>
          <div className="user-info">
            <span>{adminName}</span>
          </div>
        </header>

        {/* สถิติภาพรวม 4 การ์ด — คลิกเพื่อกรองกลุ่มได้ */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Box onClick={() => setStatFilter('all')} sx={{ cursor: 'pointer', borderRadius: 3, transition: 'transform 0.2s', outline: statFilter === 'all' ? '2px solid #3b82f6' : 'none', '&:hover': { transform: 'translateY(-2px)' } }}>
            <StatCard title="นักศึกษาทั้งหมด" value={globalStats.students} icon={<AcademicCapIcon style={{ width: 24, height: 24 }} />} color="#3b82f6" />
          </Box>
          <Box onClick={() => setStatFilter(statFilter === 'submitted' ? 'all' : 'submitted')} sx={{ cursor: 'pointer', borderRadius: 3, transition: 'transform 0.2s', outline: statFilter === 'submitted' ? '3px solid #8b5cf6' : 'none', '&:hover': { transform: 'translateY(-2px)' } }}>
            <StatCard title="ส่งรายงานแล้ว" value={globalStats.submitted} icon={<DocumentTextIcon style={{ width: 24, height: 24 }} />} color="#8b5cf6" />
          </Box>
          <Box onClick={() => setStatFilter(statFilter === 'warning' ? 'all' : 'warning')} sx={{ cursor: 'pointer', borderRadius: 3, transition: 'transform 0.2s', outline: statFilter === 'warning' ? '3px solid #ef4444' : 'none', '&:hover': { transform: 'translateY(-2px)' } }}>
            <StatCard title="ขาด / ไม่ส่งรายงาน (ต้องติดตาม)" value={globalStats.needFollowUp} icon={<ExclamationTriangleIcon style={{ width: 24, height: 24 }} />} color="#ef4444" />
          </Box>
          <Box onClick={() => setStatFilter('all')} sx={{ cursor: 'pointer', borderRadius: 3, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
            <StatCard title="อัตราส่งรายงานภาพรวม" value={`${globalStats.rate}%`} icon={<CheckCircleIcon style={{ width: 24, height: 24 }} />} color="#8b5cf6" />
          </Box>
        </Box>

        <div className="content-section">
          {statFilter !== 'all' && (
            <Box sx={{ mb: 2, p: 1.5, px: 2, borderRadius: 2, bgcolor: statFilter === 'warning' ? '#fef2f2' : '#f0fdf4', border: statFilter === 'warning' ? '1px solid #fecaca' : '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: statFilter === 'warning' ? '#991b1b' : '#166534' }}>
                {statFilter === 'warning'
                  ? `แสดงเฉพาะนักศึกษาที่ต้องติดตาม (ขาด/ไม่ส่ง หรืออัตรา < 80%) จำนวน ${filteredStudents.length} คน`
                  : `แสดงเฉพาะนักศึกษาที่ส่งรายงานแล้ว จำนวน ${filteredStudents.length} คน`}
              </span>
              <Button size="small" variant="outlined" color={statFilter === 'warning' ? 'error' : 'success'} onClick={() => setStatFilter('all')}>แสดงทั้งหมด</Button>
            </Box>
          )}

          <div className="checkin-filters">
            <div className="checkin-field" style={{ flex: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="ค้นหา"
                placeholder="ชื่อ, รหัสนักศึกษา หรือบริษัท"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div className="checkin-field">
              <TextField
                fullWidth
                size="small"
                label="สาขา"
                select
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                sx={{ backgroundColor: 'white', minWidth: 200 }}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                {departmentOptions.map((d) => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </TextField>
            </div>
          </div>

          {/* Desktop: ตาราง */}
          <div className="hidden sm:block bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-left">
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">นักศึกษา</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">สถานประกอบการ</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">ความคืบหน้าการส่งงาน</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">ส่งล่าสุด</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">ลายเซ็นพี่เลี้ยง</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">ไม่พบนักศึกษาที่กำลังฝึกงาน</td></tr>
                ) : filteredStudents.map((s) => (
                  <tr key={s.requestId} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 text-[13px]">{s.studentName}</div>
                      <div className="text-[11px] text-slate-400">{s.studentId} · {s.department || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-600">{s.company || '-'}</td>
                    <td className="px-4 py-3"><ProgressCell s={s} /></td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">{formatThaiDate(s.lastCheckinDate)}</td>
                    <td className="px-4 py-3">{pendingBadge(Number(s.pendingSignature || 0))}</td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        size="small" variant="outlined" onClick={() => openDiary(s)}
                        startIcon={<BookOpenText size={14} />}
                        sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 2, borderColor: '#ddd6fe', color: '#7c3aed', '&:hover': { bgcolor: '#f5f3ff', borderColor: '#c4b5fd' } }}
                      >
                        ดูสมุดบันทึก
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Card List */}
          <div className="sm:hidden flex flex-col gap-3">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">ไม่พบนักศึกษาที่กำลังฝึกงาน</div>
            ) : filteredStudents.map((s) => (
              <div key={s.requestId} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 m-0">{s.studentName}</p>
                    <p className="text-[11px] text-slate-400 m-0 mt-0.5">{s.studentId} · {s.department || '-'}</p>
                    <p className="text-xs text-slate-500 m-0 mt-1 truncate">{s.company || '-'}</p>
                  </div>
                  {pendingBadge(Number(s.pendingSignature || 0))}
                </div>
                <ProgressCell s={s} />
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>ส่งล่าสุด: {formatThaiDate(s.lastCheckinDate)}</span>
                </div>
                <Button
                  fullWidth variant="contained" onClick={() => openDiary(s)}
                  startIcon={<BookOpenText size={15} />}
                  sx={{ textTransform: 'none', fontSize: '0.8rem', fontWeight: 600, borderRadius: '0.75rem', bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' }, boxShadow: 'none' }}
                >
                  ดูสมุดบันทึก
                </Button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* สมุดบันทึกรายวัน — Fullscreen Dialog */}
      <Dialog
        open={diary.open}
        onClose={closeDiary}
        fullScreen
        PaperProps={{ sx: { bgcolor: '#f8f9fc' } }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-slate-100 sticky top-0 z-10">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 m-0 flex items-center gap-2">
              <BookOpenText size={18} className="text-violet-600 shrink-0" />
              สมุดบันทึกการฝึกงาน — {diary.student?.studentName}
            </h2>
            <p className="text-xs text-slate-400 m-0 mt-0.5">
              {diary.student?.studentId} · {diary.student?.company || '-'} · {formatThaiDate(diary.student?.startDate)} – {formatThaiDate(diary.student?.endDate)}
            </p>
          </div>
          <div className="flex items-center gap-0.5 p-1 bg-slate-100 rounded-xl shrink-0 mr-1">
            <button
              onClick={() => setDiaryView('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border-0 cursor-pointer ${diaryView === 'calendar' ? 'bg-violet-600 text-white shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
            >
              ปฏิทิน
            </button>
            <button
              onClick={() => setDiaryView('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border-0 cursor-pointer ${diaryView === 'list' ? 'bg-violet-600 text-white shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
            >
              ไทม์ไลน์
            </button>
          </div>
          <button onClick={closeDiary} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition border-0 bg-transparent cursor-pointer shrink-0" aria-label="ปิด">
            <X size={20} />
          </button>
        </div>

        <div className="max-w-3xl w-full mx-auto px-4 py-5 space-y-3">
          {diary.loading ? (
            <div className="text-center py-16 text-slate-400 text-sm">กำลังโหลดสมุดบันทึก...</div>
          ) : diary.entries.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400 text-sm">
              นักศึกษายังไม่ได้ส่งรายงานประจำวัน
            </div>
          ) : diaryView === 'calendar' ? (
            <div className="w-full" style={{ maxWidth: 980, margin: '0 auto' }}>
              <AttendanceCalendar
                entries={diary.entries}
                studentId={diary.student?.studentId}
                studentName={diary.student?.studentName}
                internshipStartDate={diary.student?.startDate}
                readOnly
                accentTheme="violet"
              />
            </div>
          ) : diary.entries.map((entry, idx) => (
            <div key={entry.id} className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarCheck size={16} className="text-violet-500 shrink-0" />
                  <span className="text-sm font-bold text-slate-800">วันที่ {idx + 1} — {formatThaiDate(entry.date)}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: `${STATUS_COLOR[entry.status] || '#94a3b8'}1a`, color: STATUS_COLOR[entry.status] || '#94a3b8' }}
                  >
                    {STATUS_LABEL[entry.status] || entry.status}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleOpenEdit(entry)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition border-0 bg-transparent cursor-pointer" title="แก้ไข"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(entry)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition border-0 bg-transparent cursor-pointer" title="ลบ"><Trash2 size={14} /></button>
                </div>
              </div>

              {entry.note && (
                <p className="text-[13px] text-slate-600 m-0 mb-2 whitespace-pre-wrap leading-relaxed">{entry.note}</p>
              )}
              {entry.work_experience && (
                <p className="text-[12px] text-slate-500 m-0 mb-2 whitespace-pre-wrap">งานที่ได้ทำ: {entry.work_experience}</p>
              )}

              {entry.supervisor_signature ? (
                <div className="mt-2 pt-3 border-t border-slate-50 flex flex-wrap items-center gap-3">
                  <PenLine size={14} className="text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-emerald-600 m-0">รับรองโดยพี่เลี้ยง: {entry.supervisor_name || '-'}</p>
                    {entry.supervisor_comment && <p className="text-[11px] text-slate-400 m-0">"{entry.supervisor_comment}"</p>}
                  </div>
                  {String(entry.supervisor_signature).startsWith('data:image') && (
                    <img src={entry.supervisor_signature} alt="ลายเซ็นพี่เลี้ยง" className="h-10 rounded border border-slate-200 bg-white object-contain" />
                  )}
                </div>
              ) : (
                <div className="mt-2 pt-3 border-t border-slate-50 text-[11px] text-amber-600 font-medium">ยังไม่มีลายเซ็นพี่เลี้ยงรับรอง</div>
              )}
            </div>
          ))}
        </div>
      </Dialog>

      {/* Edit Checkin Dialog */}
      <Dialog open={editDialog.open} onClose={handleCloseEdit} fullWidth maxWidth="sm">
        <DialogTitle>แก้ไขข้อมูลรายงานประจำวัน</DialogTitle>
        <DialogContent>
          <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            <TextField
              fullWidth
              label="วันที่"
              type="date"
              value={editDialog.date}
              onChange={(e) => setEditDialog((prev) => ({ ...prev, date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              select
              label="สถานะ"
              value={editDialog.status}
              onChange={(e) => setEditDialog((prev) => ({ ...prev, status: e.target.value }))}
            >
              <MenuItem value="present">มา</MenuItem>
              <MenuItem value="late">สาย</MenuItem>
              <MenuItem value="absent">ขาด</MenuItem>
              <MenuItem value="sick">ลาป่วย</MenuItem>
              <MenuItem value="personal">ลากิจ</MenuItem>
              <MenuItem value="holiday">วันหยุด</MenuItem>
            </TextField>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="กิจกรรมที่ทำในวันนี้"
              value={editDialog.note}
              onChange={(e) => setEditDialog((prev) => ({ ...prev, note: e.target.value }))}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSaveEdit}>บันทึก</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AdminCheckInPage;

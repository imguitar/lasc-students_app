import { useEffect, useMemo, useState } from 'react';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { ArrowRight, Calendar, ListOrdered, PenLine, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../assets/LASC-SSKRU-1.png';
import api from '../../api/axios';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Typography,
} from '@mui/material';
import AdvisorSidebar from '../../components/AdvisorSidebar';
import UserProfileMenu from '../../components/UserProfileMenu';
import NotificationBell from '../../components/NotificationBell';
import DateTimeIndicator from '../../components/DateTimeIndicator';
import '../Admin/Dashboard/AdminDashboardPage.css';

const AdvisorProgressCheckPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [advisorName, setAdvisorName] = useState('');
  const [advisorDept, setAdvisorDept] = useState('');
  const [requests, setRequests] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [filters, setFilters] = useState({ status: 'all', search: '' });
  const [historyDialog, setHistoryDialog] = useState({
    open: false,
    studentName: '',
    studentId: '',
    entries: [],
  });
  const [dialogView, setDialogView] = useState('calendar');

  const internshipStatuses = useMemo(() => new Set([
    'ออกฝึกงาน', 'กำลังออกฝึกงาน',
    'อนุมัติแล้ว (รอออกฝึกงาน)', 'สิ้นสุดการฝึกงาน (รอประเมิน)',
    'ประเมินเสร็จแล้ว', 'ประเมินจากสถานประกอบการแล้ว', 'ประเมินจากอาจารย์แล้ว',
    'ฝึกงานเสร็จแล้ว', 'เสร็จสิ้นสมบูรณ์',
    // enum ภาษาอังกฤษที่อาจเจอในฐานข้อมูล
    'INTERNING', 'IN_PROGRESS', 'TRAINING', 'START_INTERNSHIP', 'COMPLETED'
  ]), []);

  const normalize = (value) => String(value || '').trim();
  const normalizeLower = (value) => String(value || '').trim().toLowerCase();
  // ตัดคำนำหน้า "สาขา"/"สาขาวิชา" และช่องว่างออกก่อนเทียบ กันชื่อสาขาไม่ตรงกันเป๊ะ
  const normalizeDept = (value) =>
    String(value || '')
      .replace(/^\s*สาขาวิชา\s*/, '')
      .replace(/^\s*สาขา\s*/, '')
      .replace(/\s+/g, '')
      .trim();

  const loadData = async (dept) => {
    try {
      const [reqRes, checkinRes] = await Promise.all([
        api.get('/requests'),
        api.get('/checkins'),
      ]);
      const allRequests = reqRes.data.data || [];
      const allCheckins = checkinRes.data.data || [];

      const deptKey = normalizeDept(dept);
      const departmentRequests = allRequests.filter((request) => {
        const requestDept = request.department || request.details?.student_info?.major || '';
        const sameDept = deptKey ? normalizeDept(requestDept) === deptKey : true;
        return sameDept && internshipStatuses.has(normalize(request.status));
      });

      console.log('[Progress] dept:', dept, '| total:', allRequests.length, '| matched:', departmentRequests.length);
      setRequests(departmentRequests);
      setCheckins(allCheckins);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/'));
      return;
    }

    const user = JSON.parse(userStr);
    if (user.role !== 'advisor') {
      navigate('/dashboard');
      return;
    }

    const dept = user.department || user.major || '';
    setAdvisorName(user.name || user.full_name || 'อาจารย์ที่ปรึกษา');
    setAdvisorDept(dept);
    loadData(dept);

    const refresh = () => loadData(dept);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [navigate, internshipStatuses]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const getRequestIdentity = (request) => {
    const ids = [
      request.studentId,
      request.student_code,
      request.username,
      request.email,
      request.details?.student_info?.studentId,
      request.details?.student_info?.email,
    ]
      .map(normalize)
      .filter(Boolean);

    const names = [request.studentName, request.details?.student_info?.name]
      .map(normalizeLower)
      .filter(Boolean);

    return { ids, names };
  };

  const getRequestCheckins = (request) => {
    const { ids, names } = getRequestIdentity(request);
    return checkins
      .filter((entry) => {
        const entryId = normalize(entry.studentId);
        const entryName = normalizeLower(entry.studentName);
        const byId = ids.length > 0 && ids.includes(entryId);
        const byName = names.length > 0 && names.includes(entryName);
        return ids.length === 0 && names.length === 0 ? false : (byId || byName);
      })
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  };

  const rows = requests.map((request) => {
    const requestCheckins = getRequestCheckins(request);
    return {
      ...request,
      checkinCount: requestCheckins.length,
      latestCheckinDate: requestCheckins[0]?.date || '-',
      checkinEntries: requestCheckins,
    };
  });

  const filteredRows = rows.filter((row) => {
    if (filters.status !== 'all' && row.status !== filters.status) {
      return false;
    }
    if (!filters.search) {
      return true;
    }
    const term = normalizeLower(filters.search);
    const values = [
      row.studentName,
      row.studentId,
      row.active_company_name,
      row.company,
      row.companyName,
    ].map(normalizeLower);
    return values.some((value) => value.includes(term));
  });

  const statusLabel = {
    present: 'มา',
    late: 'สาย',
    absent: 'ขาด',
    sick: 'ลาป่วย',
    personal: 'ลากิจ',
    holiday: 'วันหยุด',
    'un-checked': 'ไม่ได้เช็คชื่อ',
  };

  const statusCardCls = {
    present: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    late: 'bg-amber-50 text-amber-700 border border-amber-200',
    absent: 'bg-rose-50 text-rose-700 border border-rose-200',
    sick: 'bg-pink-50 text-pink-700 border border-pink-200',
    personal: 'bg-orange-50 text-orange-700 border border-orange-200',
    holiday: 'bg-sky-50 text-sky-700 border border-sky-200',
  };

  const formatThaiDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ตำแหน่งฝึกงาน "ปัจจุบัน" ต่อแถว — ถ้ามี relocation completed ใช้บริษัท/ช่วงวันใหม่ล่าสุด
  const getActivePlacement = (row) => {
    const relocated = Number(row.has_completed_relocation) === 1 && !!row.active_company_name;
    return {
      relocated,
      company: (relocated && row.active_company_name) || row.company || row.companyName || '-',
      previousCompany: relocated ? (row.company || row.companyName || '') : '',
      startDate: (relocated && row.active_start_date) || row.internship_start_date || row.startDate || row.details?.startDate || row.submittedDate || '',
      endDate: (relocated && row.active_end_date) || row.internship_end_date || row.endDate || row.details?.endDate || '',
    };
  };

  const openHistoryDialog = (row) => {
    const sDate = (Number(row.has_completed_relocation) === 1 && row.active_start_date) || row.internship_start_date || (internshipStatuses.has(normalize(row.status)) ? String(row.updated_at || row.submittedDate || '').split('T')[0] : null);
    setHistoryDialog({
      open: true,
      studentName: row.studentName || '-',
      studentId: row.studentId || '-',
      internshipStartDate: sDate,
      entries: row.checkinEntries,
    });
  };

  const closeHistoryDialog = () => {
    setHistoryDialog({
      open: false,
      studentName: '',
      studentId: '',
      internshipStartDate: null,
      entries: [],
    });
  };

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
      <AdvisorSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/advisor-dashboard/progress"
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>เช็ค Progress นักศึกษา</h1>
            <p>ติดตามประวัติรายงานประจำวัน (ดูอย่างเดียว) • {advisorName}</p>
          </div>
          <div className="user-info">
            <span>สาขา: {advisorDept || '-'}</span>
          </div>
        </header>

        <Paper className="content-section" elevation={0} sx={{ width: '100%' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px 1fr' }, gap: 1.5, mb: 2 }}>
            <TextField
              select
              size="small"
              label="สถานะ"
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              sx={{ backgroundColor: 'white' }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="ออกฝึกงาน">ออกฝึกงาน</MenuItem>
              <MenuItem value="กำลังออกฝึกงาน">กำลังออกฝึกงาน</MenuItem>
              <MenuItem value="สิ้นสุดการฝึกงาน (รอประเมิน)">สิ้นสุดการฝึกงาน (รอประเมิน)</MenuItem>
              <MenuItem value="ประเมินเสร็จแล้ว">ประเมินเสร็จแล้ว</MenuItem>
              <MenuItem value="ฝึกงานเสร็จแล้ว">ฝึกงานเสร็จแล้ว</MenuItem>
            </TextField>
            <TextField
              size="small"
              label="ค้นหา"
              placeholder="ชื่อ, รหัสนักศึกษา, หรือบริษัท"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
          </Box>

          <TableContainer
            component={Box}
            className="compact-table"
            sx={{
              display: { xs: 'none', md: 'block' },
              overflowX: 'hidden',
              '& table': { tableLayout: 'fixed !important', width: '100% !important' },
              '& td, & th': { whiteSpace: 'normal !important', overflow: 'hidden', textOverflow: 'ellipsis' },
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '20%' }}>นักศึกษา</TableCell>
                  <TableCell sx={{ width: '26%' }}>บริษัท</TableCell>
                  <TableCell sx={{ width: '20%' }}>ช่วงฝึกงาน</TableCell>
                  <TableCell sx={{ width: '11%' }}>จำนวนรายงาน</TableCell>
                  <TableCell sx={{ width: '11%' }}>เช็คล่าสุด</TableCell>
                  <TableCell sx={{ width: '12%' }}>ดูประวัติ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      ไม่พบข้อมูลนักศึกษาที่อยู่ระหว่าง/เสร็จสิ้นการฝึกงานในสาขานี้
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const placement = getActivePlacement(row);
                    return (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Stack spacing={0.3}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.studentName || '-'}</Typography>
                          <Typography variant="caption" color="text.secondary">{row.studentId || '-'}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: placement.relocated ? 600 : 400 }}>{placement.company}</Typography>
                        {placement.relocated && placement.previousCompany && (
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, fontSize: '11px', color: '#7c3aed' }}>
                            <ArrowRight size={12} strokeWidth={2.5} />
                            ย้ายมาจาก {placement.previousCompany}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {placement.startDate && placement.endDate
                          ? `${formatThaiDate(placement.startDate)} – ${formatThaiDate(placement.endDate)}`
                          : formatThaiDate(placement.startDate) || '-'}
                      </TableCell>
                      <TableCell>{row.checkinCount}</TableCell>
                      <TableCell>{row.latestCheckinDate}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" onClick={() => openHistoryDialog(row)} sx={{ borderColor: '#7c3aed', color: '#7c3aed', textTransform: 'none', fontWeight: 700, borderRadius: 1.5, '&:hover': { borderColor: '#6d28d9', bgcolor: '#f5f3ff' } }}>
                          ดูรายงานประจำวัน
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Mobile Card Stack View (<768px) — ตามกฎ Table-to-Card ใน skill section 4 */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
            {filteredRows.length === 0 ? (
              <Typography variant="body2" sx={{ py: 4, textAlign: 'center', color: '#94a3b8' }}>
                ไม่พบข้อมูลนักศึกษาที่อยู่ระหว่าง/เสร็จสิ้นการฝึกงานในสาขานี้
              </Typography>
            ) : (
              filteredRows.map((row) => {
                const placement = getActivePlacement(row);
                return (
                  <Box key={row.id} sx={{ bgcolor: '#fff', p: 2, borderRadius: '16px', border: '1px solid rgba(226,232,240,0.8)' }}>
                    {/* หัวการ์ด: ชื่อ + รหัส + บริษัทล่าสุด */}
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>
                      {row.studentName || '-'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                      {row.studentId || '-'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: placement.relocated ? 600 : 500, color: '#334155', fontSize: '0.8125rem', mt: 0.75 }}>
                      {placement.company}
                    </Typography>
                    {placement.relocated && placement.previousCompany && (
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, fontSize: '11px', color: '#7c3aed' }}>
                        <ArrowRight size={12} strokeWidth={2.5} />
                        ย้ายมาจาก {placement.previousCompany}
                      </Box>
                    )}

                    {/* เนื้อหาการ์ด: สรุป grid 2 คอลัมน์ */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1.5, pt: 1.5, borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#475569' }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '10px' }}>ช่วงฝึกงาน</Typography>
                        {placement.startDate && placement.endDate
                          ? `${formatThaiDate(placement.startDate)} – ${formatThaiDate(placement.endDate)}`
                          : formatThaiDate(placement.startDate) || '-'}
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '10px' }}>จำนวนรายงาน</Typography>
                        {row.checkinCount} วัน
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: '10px' }}>เช็คล่าสุด</Typography>
                        {row.latestCheckinDate || '-'}
                      </Box>
                    </Box>

                    {/* ปุ่มหลักท้ายการ์ด — full width 44px */}
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => openHistoryDialog(row)}
                      sx={{ minHeight: '44px', mt: 1.5, borderRadius: '12px', textTransform: 'none', fontWeight: 700, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
                    >
                      ดูรายงานประจำวัน
                    </Button>
                  </Box>
                );
              })
            )}
          </Box>
        </Paper>
      </main>

      <Dialog 
        open={historyDialog.open} 
        onClose={closeHistoryDialog} 
        fullWidth 
        maxWidth="lg"
        disableScrollLock={true}
        ModalProps={{ disableScrollLock: true }}
        PaperProps={{ sx: { borderRadius: { xs: 2.5, sm: 3 }, p: { xs: 0.5, sm: 1 }, m: { xs: 1, sm: 2 }, width: { xs: 'calc(100% - 16px)', sm: 'auto' } } }}
      >
        <DialogTitle sx={{ pb: 1.5, borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: { xs: '0.9rem', sm: '1.1rem' }, lineHeight: 1.3 }}>
                ประวัติรายงานประจำวัน: {historyDialog.studentName}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>{historyDialog.studentId}</Typography>
            </Box>
            <IconButton
              size="small"
              onClick={closeHistoryDialog}
              aria-label="ปิด"
              sx={{ flexShrink: 0, color: '#94a3b8', '&:hover': { color: '#475569', bgcolor: '#f1f5f9' } }}
            >
              <X className="w-5 h-5" />
            </IconButton>
          </Box>
          {/* Segmented control — grid-cols-2 ล็อกสัดส่วน 50/50 แน่นอน ไม่เบี้ยวตามความยาว label */}
          <div className="w-full grid grid-cols-2 gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 mt-3">
            <button
              type="button"
              onClick={() => setDialogView('calendar')}
              className={`w-full flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg transition-all cursor-pointer border ${
                dialogView === 'calendar'
                  ? 'bg-white text-violet-700 font-semibold shadow-sm border-slate-200/50'
                  : 'bg-transparent text-slate-500 hover:text-slate-700 font-medium border-transparent'
              }`}
            >
              <Calendar className={`w-3.5 h-3.5 ${dialogView === 'calendar' ? 'text-violet-600' : 'text-slate-400'}`} />
              <span>ปฏิทิน</span>
            </button>
            <button
              type="button"
              onClick={() => setDialogView('table')}
              className={`w-full flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg transition-all cursor-pointer border ${
                dialogView === 'table'
                  ? 'bg-white text-violet-700 font-semibold shadow-sm border-slate-200/50'
                  : 'bg-transparent text-slate-500 hover:text-slate-700 font-medium border-transparent'
              }`}
            >
              <ListOrdered className={`w-3.5 h-3.5 ${dialogView === 'table' ? 'text-violet-600' : 'text-slate-400'}`} />
              <span>ตาราง</span>
            </button>
          </div>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 1, sm: 2.5 }, backgroundColor: '#f8fafc' }}>
          {dialogView === 'calendar' ? (
            <Box sx={{ pt: 1 }}>
              <AttendanceCalendar
                entries={historyDialog.entries}
                studentId={historyDialog.studentId}
                studentName={historyDialog.studentName}
                internshipStartDate={historyDialog.internshipStartDate}
                readOnly
              />
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ mt: 1, border: '1px solid #e2e8f0', borderRadius: 2, display: { xs: 'none', md: 'block' } }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>วันที่</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell>ประสบการณ์ / กิจกรรมที่ทำ</TableCell>
                    <TableCell>ลายเซ็นพี่เลี้ยง</TableCell>
                    <TableCell>หมายเหตุ</TableCell>
                    <TableCell>เวลาบันทึก</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyDialog.entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#64748b' }}>
                        ยังไม่มีประวัติรายงานประจำวัน
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyDialog.entries.map((entry) => (
                      <TableRow key={`${entry.id}-${entry.date}`} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{entry.date || '-'}</TableCell>
                        <TableCell>{statusLabel[entry.status] || '-'}</TableCell>
                        <TableCell>{entry.work_experience || entry.workExperience || '-'}</TableCell>
                        <TableCell>
                          {entry.supervisor_signature || entry.supervisorSignature ? (
                            <img
                              src={entry.supervisor_signature || entry.supervisorSignature}
                              alt="Supervisor Signature"
                              style={{ maxHeight: 32, maxWidth: 100, objectFit: 'contain' }}
                            />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{entry.note || '-'}</TableCell>
                        <TableCell>{entry.createdAt ? new Date(entry.createdAt).toLocaleString('th-TH') : '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {/* Mobile Card Stack (<768px) — แทนตารางในแท็บ "ตาราง" บนมือถือ */}
          {dialogView === 'table' && (
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.25, mt: 1, maxHeight: '50vh', overflowY: 'auto', pr: 0.5 }}>
              {historyDialog.entries.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                  ยังไม่มีประวัติรายงานประจำวัน
                </Box>
              ) : (
                historyDialog.entries.map((entry) => (
                  <Box key={`${entry.id}-${entry.date}`} sx={{ bgcolor: 'rgba(248,250,252,0.7)', p: 1.5, borderRadius: '12px', border: '1px solid rgba(226,232,240,0.7)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>
                        <Calendar className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                        {entry.date || '-'}
                      </Box>
                      <Box
                        component="span"
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${statusCardCls[entry.status] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}
                      >
                        {statusLabel[entry.status] || '-'}
                      </Box>
                    </Box>
                    <Box sx={{ fontSize: '0.75rem', color: '#475569', pl: '20px', mt: 0.75, lineHeight: 1.55 }}>
                      <Box component="span" sx={{ color: '#94a3b8' }}>กิจกรรม:</Box>{' '}
                      {entry.work_experience || entry.workExperience || 'ไม่มีข้อมูลบันทึก'}
                    </Box>
                    {entry.note && (
                      <Box sx={{ fontSize: '0.75rem', color: '#475569', pl: '20px', mt: 0.25, lineHeight: 1.55 }}>
                        <Box component="span" sx={{ color: '#94a3b8' }}>หมายเหตุ:</Box> {entry.note}
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: '20px', mt: 0.75, fontSize: '11px', color: '#94a3b8' }}>
                      <PenLine className="w-3 h-3 shrink-0" />
                      {(entry.supervisor_signature || entry.supervisorSignature) ? 'มีลายเซ็นพี่เลี้ยง' : 'ยังไม่มีลายเซ็น'}
                      {entry.createdAt && ` · ${new Date(entry.createdAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
          <Button onClick={closeHistoryDialog} variant="contained" sx={{ px: 3, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}>ปิด</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AdvisorProgressCheckPage;
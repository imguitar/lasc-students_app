import { useEffect, useMemo, useState } from 'react';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { CalendarIcon, TableCellsIcon } from '@heroicons/react/24/outline';
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
  Typography,
} from '@mui/material';
import AdvisorSidebar from '../../components/AdvisorSidebar';
import UserProfileMenu from '../../components/UserProfileMenu';
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

  const internshipStatuses = useMemo(() => new Set(['ออกฝึกงาน', 'ฝึกงานเสร็จแล้ว']), []);

  const normalize = (value) => String(value || '').trim();
  const normalizeLower = (value) => String(value || '').trim().toLowerCase();

  const loadData = async (dept) => {
    try {
      const [reqRes, checkinRes] = await Promise.all([
        api.get('/requests'),
        api.get('/checkins'),
      ]);
      const allRequests = reqRes.data.data || [];
      const allCheckins = checkinRes.data.data || [];

      const departmentRequests = allRequests.filter((request) => {
        const requestDept = request.department || request.details?.student_info?.major || '';
        const sameDept = dept ? requestDept === dept : true;
        return sameDept && internshipStatuses.has(normalize(request.status));
      });

      setRequests(departmentRequests);
      setCheckins(allCheckins);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
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
      row.company,
      row.companyName,
    ].map(normalizeLower);
    return values.some((value) => value.includes(term));
  });

  const statusLabel = {
    present: 'มา',
    late: 'สาย',
    absent: 'ขาด',
  };

  const openHistoryDialog = (row) => {
    const sDate = row.internship_start_date || (row.status === 'ออกฝึกงาน' ? String(row.updated_at || row.submittedDate || '').split('T')[0] : null);
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
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home">
          <img src={lascLogo} alt="LASC Logo" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '8px' }}>
          <UserProfileMenu />
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
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

          <TableContainer component={Box} className="compact-table" sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>นักศึกษา</TableCell>
                  <TableCell>บริษัท</TableCell>
                  <TableCell>ช่วงฝึกงาน</TableCell>
                  <TableCell>จำนวนรายงาน</TableCell>
                  <TableCell>เช็คล่าสุด</TableCell>
                  <TableCell>ดูประวัติ</TableCell>
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
                  filteredRows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Stack spacing={0.3}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.studentName || '-'}</Typography>
                          <Typography variant="caption" color="text.secondary">{row.studentId || '-'}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{row.company || row.companyName || '-'}</TableCell>
                      <TableCell>
                        {row.startDate || row.details?.startDate ? new Date(row.startDate || row.details?.startDate).toLocaleDateString('th-TH') : (row.submittedDate ? new Date(row.submittedDate).toLocaleDateString('th-TH') : '-')}
                      </TableCell>
                      <TableCell>{row.checkinCount}</TableCell>
                      <TableCell>{row.latestCheckinDate}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" onClick={() => openHistoryDialog(row)}>
                          ดูรายงานประจำวัน
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
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
        <DialogTitle sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5, pb: 1.5, borderBottom: '1px solid #e2e8f0' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: { xs: '0.95rem', sm: '1.15rem' }, lineHeight: 1.3 }}>
              ประวัติรายงานประจำวัน: {historyDialog.studentName} ({historyDialog.studentId})
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75, backgroundColor: '#f1f5f9', p: 0.5, borderRadius: 2, '& .MuiButton-root': { flex: 1 } }}>
            <Button
              size="small"
              variant={dialogView === 'calendar' ? 'contained' : 'text'}
              disableElevation
              onClick={() => setDialogView('calendar')}
              startIcon={<CalendarIcon style={{ width: 16, height: 16 }} />}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
            >
              ปฏิทิน
            </Button>
            <Button
              size="small"
              variant={dialogView === 'table' ? 'contained' : 'text'}
              disableElevation
              onClick={() => setDialogView('table')}
              startIcon={<TableCellsIcon style={{ width: 16, height: 16 }} />}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
            >
              ตาราง
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 1, sm: 2.5 }, backgroundColor: '#f8fafc' }}>
          {dialogView === 'calendar' ? (
            <Box sx={{ pt: 1 }}>
              <AttendanceCalendar
                entries={historyDialog.entries}
                studentId={historyDialog.studentId}
                studentName={historyDialog.studentName}
                internshipStartDate={historyDialog.internshipStartDate}
                onBatchSign={(updatedEntries) => {
                  setHistoryDialog(prev => ({
                    ...prev,
                    entries: updatedEntries
                  }));
                  // Also refresh parent list
                  loadProgress();
                }}
              />
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ mt: 1, border: '1px solid #e2e8f0', borderRadius: 2 }}>
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
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
          <Button onClick={closeHistoryDialog} variant="contained" sx={{ px: 3 }}>ปิด</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AdvisorProgressCheckPage;
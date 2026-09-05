import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import api from '../../../api/axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { AcademicCapIcon, DocumentTextIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, CalendarIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import './AdminDashboardPage.css';
import '../Shared/CheckInPage.css';
import './AdminAttendanceOverviewPage.css';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import StatCard from '../../../components/StatCard';
import AttendanceCalendar from '../../../components/AttendanceCalendar';

const AdminAttendanceOverviewPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [entries, setEntries] = useState([]);
  const [departmentMap, setDepartmentMap] = useState({});
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [filters, setFilters] = useState({ search: '', department: 'all' });
  const [statFilter, setStatFilter] = useState('all'); // 'all' | 'submitted' | 'warning'
  const [detailsModal, setDetailsModal] = useState({ open: false, student: null });
  const [modalViewMode, setModalViewMode] = useState('calendar'); // 'calendar' | 'table'

  const statusLabel = useMemo(() => ({
    present: 'มา',
    absent: 'ขาด',
    late: 'สาย',
  }), []);

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

  const buildDepartmentMap = async () => {
    const map = {};
    try {
      const usersRes = await api.get('/users');
      const students = (usersRes.data.data || []).filter(u => u.role === 'student');
      students.forEach((student) => {
        const dept = student.department || student.major || '';
        if (!dept) return;
        [student.student_code, student.studentId, student.username, student.email]
          .filter(Boolean)
          .forEach((key) => { map[String(key)] = dept; });
      });
    } catch (err) {
      console.error('Failed to load users for department map:', err);
    }
    const departments = Array.from(new Set(Object.values(map))).sort((a, b) => a.localeCompare(b, 'th-TH'));
    setDepartmentMap(map);
    setDepartmentOptions(departments);
    return map;
  };

  const [requestsMap, setRequestsMap] = useState({});

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    setAdminName(user.name || 'Admin');
    api.get('/checkins').then(res => {
      setEntries(res.data.data || []);
    }).catch(err => console.error('Failed to load checkins:', err));
    
    api.get('/requests').then(res => {
      const reqList = res.data.data || [];
      const rMap = {};
      reqList.forEach(r => {
        const sId = String(r.studentId || r.student_code || '');
        if (sId) {
          rMap[sId] = r;
        }
      });
      setRequestsMap(rMap);
    }).catch(err => console.error('Failed to load requests for overview:', err));

    buildDepartmentMap();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const getDepartment = (studentId) => {
    return departmentMap[String(studentId || '')] || 'ไม่ระบุ';
  };

  // Group entries by studentId
  const studentSummaries = useMemo(() => {
    const map = {};
    const todayStr = new Date().toISOString().slice(0, 10);

    entries.forEach((entry) => {
      const key = entry.studentId || 'unknown';
      if (!map[key]) {
        map[key] = {
          studentId: key,
          studentName: entry.studentName || '-',
          entries: [],
          present: 0,
          late: 0,
          absent: 0,
          unchecked: 0,
          total: 0,
          datesMap: new Set(),
          minDate: null,
          startDate: null,
        };
      }
      map[key].entries.push(entry);
      map[key].total += 1;
      if (entry.date) {
        const cleanDate = String(entry.date).split('T')[0];
        map[key].datesMap.add(cleanDate);
        if (!map[key].minDate || cleanDate < map[key].minDate) map[key].minDate = cleanDate;
      }
      if (entry.status === 'present') map[key].present += 1;
      else if (entry.status === 'late') map[key].late += 1;
      else if (entry.status === 'absent') map[key].absent += 1;
    });

    Object.values(map).forEach((s) => {
      const studentReq = requestsMap[s.studentId];
      const officialStartDate = studentReq?.internship_start_date 
        || (studentReq?.status === 'ออกฝึกงาน' ? String(studentReq.updated_at || studentReq.submittedDate || '').split('T')[0] : null)
        || s.minDate;

      s.startDate = officialStartDate;

      if (officialStartDate) {
        let curr = new Date(officialStartDate);
        const end = new Date(todayStr);
        let countUnchecked = 0;
        while (curr <= end) {
          const dayOfWeek = curr.getDay();
          const dateKey = curr.toISOString().slice(0, 10);
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Mon-Fri
            if (!s.datesMap.has(dateKey)) {
              countUnchecked++;
            }
          }
          curr.setDate(curr.getDate() + 1);
        }
        s.unchecked = countUnchecked;
      }
    });

    return Object.values(map).sort((a, b) => {
      const nameA = a.studentName || '';
      const nameB = b.studentName || '';
      return nameA.localeCompare(nameB, 'th-TH');
    });
  }, [entries, requestsMap]);

  const getAttendanceRate = (s) => {
    const grandTotal = s.present + s.late + s.absent + s.unchecked;
    if (grandTotal === 0) return 0;
    return Math.round(((s.present + s.late) / grandTotal) * 100);
  };

  // Department-filtered students for scoped StatCards
  const departmentStudents = useMemo(() => {
    return studentSummaries.filter((s) => {
      if (filters.department !== 'all' && getDepartment(s.studentId) !== filters.department) return false;
      return true;
    });
  }, [studentSummaries, filters.department, departmentMap]);

  // Global stats recalculated specifically for the selected department
  const globalStats = useMemo(() => {
    let present = 0, late = 0, absent = 0, unchecked = 0;
    const deptStudentIds = new Set(departmentStudents.map((s) => s.studentId));

    entries.forEach((e) => {
      if (deptStudentIds.has(e.studentId)) {
        if (e.status === 'present') present += 1;
        else if (e.status === 'late') late += 1;
        else if (e.status === 'absent') absent += 1;
      }
    });

    departmentStudents.forEach((s) => {
      unchecked += s.unchecked;
    });

    return {
      total: present + late + absent,
      present,
      late,
      absent,
      unchecked,
      students: departmentStudents.length,
    };
  }, [entries, departmentStudents]);

  const overallRate = useMemo(() => {
    const total = globalStats.present + globalStats.late + globalStats.absent + globalStats.unchecked;
    if (total === 0) return 0;
    return Math.round(((globalStats.present + globalStats.late) / total) * 100);
  }, [globalStats]);

  // Filter & sort students (with statFilter support for high-risk / warning focus)
  const filteredStudents = useMemo(() => {
    let list = studentSummaries.filter((s) => {
      if (filters.department !== 'all' && getDepartment(s.studentId) !== filters.department) return false;
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const name = (s.studentName || '').toLowerCase();
        const id = (s.studentId || '').toLowerCase();
        return name.includes(term) || id.includes(term);
      }
      return true;
    });

    if (statFilter === 'submitted') {
      list = list.filter((s) => s.present + s.late > 0);
    } else if (statFilter === 'warning') {
      list = list.filter((s) => s.absent + s.unchecked > 0 || getAttendanceRate(s) < 80);
      list.sort((a, b) => {
        const warnA = a.absent + a.unchecked;
        const warnB = b.absent + b.unchecked;
        if (warnB !== warnA) return warnB - warnA;
        return getAttendanceRate(a) - getAttendanceRate(b);
      });
    }

    return list;
  }, [studentSummaries, filters, statFilter, departmentMap]);

  const getRateClass = (rate) => {
    if (rate >= 80) return 'rate-good';
    if (rate >= 60) return 'rate-warning';
    return 'rate-danger';
  };

  const sortedDetailEntries = (studentEntries) => {
    return [...studentEntries].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
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
      <AdminSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/admin-dashboard/attendance-overview"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>ภาพรวมรายงานประจำวันรายบุคคล</h1>
            <p>ดูสรุปรายงานประจำวันของนักศึกษาแต่ละคน</p>
          </div>
          <div className="user-info">
            <span>{adminName}</span>
          </div>
        </header>

        {/* Summary stats */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Box 
            onClick={() => setStatFilter('all')} 
            sx={{ 
              cursor: 'pointer', 
              transition: 'transform 0.2s', 
              borderRadius: 3,
              outline: statFilter === 'all' ? '2px solid #3b82f6' : 'none',
              '&:hover': { transform: 'translateY(-2px)' } 
            }}
          >
            <StatCard
              title="นักศึกษาทั้งหมด"
              value={globalStats.students}
              icon={<AcademicCapIcon style={{ width: 24, height: 24 }} />}
              color="#3b82f6"
            />
          </Box>

          <Box 
            onClick={() => setStatFilter(statFilter === 'submitted' ? 'all' : 'submitted')} 
            sx={{ 
              cursor: 'pointer', 
              transition: 'all 0.2s', 
              borderRadius: 3,
              outline: statFilter === 'submitted' ? '3px solid #10b981' : 'none',
              '&:hover': { transform: 'translateY(-2px)' } 
            }}
          >
            <StatCard
              title="ส่งรายงานแล้ว"
              value={globalStats.present + globalStats.late}
              icon={<DocumentTextIcon style={{ width: 24, height: 24 }} />}
              color="#10b981"
            />
          </Box>

          <Box 
            onClick={() => setStatFilter(statFilter === 'warning' ? 'all' : 'warning')} 
            sx={{ 
              cursor: 'pointer', 
              transition: 'all 0.2s', 
              borderRadius: 3,
              outline: statFilter === 'warning' ? '3px solid #ef4444' : 'none',
              '&:hover': { transform: 'translateY(-2px)' } 
            }}
          >
            <StatCard
              title="ขาด / ไม่ส่งรายงาน (ต้องติดตาม)"
              value={globalStats.absent + globalStats.unchecked}
              icon={<ExclamationTriangleIcon style={{ width: 24, height: 24 }} />}
              color="#ef4444"
            />
          </Box>

          <Box 
            onClick={() => setStatFilter('all')} 
            sx={{ 
              cursor: 'pointer', 
              transition: 'transform 0.2s', 
              borderRadius: 3,
              '&:hover': { transform: 'translateY(-2px)' } 
            }}
          >
            <StatCard
              title="อัตราส่งรายงานภาพรวม"
              value={`${overallRate}%`}
              icon={<CheckCircleIcon style={{ width: 24, height: 24 }} />}
              color="#8b5cf6"
            />
          </Box>
        </Box>

        <div className="content-section">
          {statFilter !== 'all' && (
            <Box 
              sx={{ 
                mb: 2.5, 
                p: 1.5, 
                px: 2, 
                borderRadius: 2, 
                bgcolor: statFilter === 'warning' ? '#fef2f2' : '#f0fdf4',
                border: statFilter === 'warning' ? '1px solid #fecaca' : '1px solid #bbf7d0',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: statFilter === 'warning' ? '#991b1b' : '#166534' }}>
                {statFilter === 'warning' 
                  ? `🚨 แสดงเฉพาะกลุ่มนักศึกษาสุ่มเสี่ยง / ต้องติดตาม (ขาด หรือ ไม่ส่งรายงาน) จำนวน ${filteredStudents.length} คน` 
                  : `✅ แสดงเฉพาะนักศึกษาที่ส่งรายงานแล้ว จำนวน ${filteredStudents.length} คน`}
              </Typography>
              <Button size="small" variant="outlined" color={statFilter === 'warning' ? 'error' : 'success'} onClick={() => setStatFilter('all')}>
                แสดงทั้งหมด
              </Button>
            </Box>
          )}

          {/* Filters */}
          <div className="attendance-filters">
            <div>
              <TextField
                fullWidth
                size="small"
                label="สาขา"
                select
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                sx={{ backgroundColor: 'white', borderRadius: 1 }}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                {departmentOptions.map((dept) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </TextField>
            </div>
            <div>
              <TextField
                fullWidth
                size="small"
                label="ค้นหา"
                placeholder="ชื่อหรือรหัสนักศึกษา"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                sx={{ backgroundColor: 'white', borderRadius: 1 }}
              />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="attendance-empty">ยังไม่มีข้อมูลรายงานประจำวัน</div>
          ) : (
            <div className="student-cards-grid">
              {filteredStudents.map((student) => {
                const rate = getAttendanceRate(student);
                const grandTotal = student.present + student.late + student.absent + student.unchecked;
                const pPct = grandTotal > 0 ? (student.present / grandTotal) * 100 : 0;
                const lPct = grandTotal > 0 ? (student.late / grandTotal) * 100 : 0;
                const aPct = grandTotal > 0 ? (student.absent / grandTotal) * 100 : 0;
                const uPct = grandTotal > 0 ? (student.unchecked / grandTotal) * 100 : 0;

                return (
                  <div key={student.studentId} className="student-overview-card">
                    <div className="student-card-header">
                      <div className="student-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3>{student.studentName}</h3>
                          <Button 
                            variant="text" 
                            size="small" 
                            onClick={() => setDetailsModal({ open: true, student })}
                            sx={{ fontSize: '0.75rem', p: 0, minWidth: 'auto', color: '#3b82f6', '&:hover': { background: 'transparent', textDecoration: 'underline' } }}
                          >
                            ดูรายละเอียด
                          </Button>
                        </div>
                        <p>{student.studentId} &middot; {getDepartment(student.studentId)}</p>
                      </div>
                      <span className={`attendance-rate-badge ${getRateClass(rate)}`}>
                        {rate}%
                      </span>
                    </div>

                    <div className="mini-stats-bar">
                      <span className="mini-stat"><span className="dot present"></span> มา {student.present}</span>
                      <span className="mini-stat"><span className="dot late"></span> สาย {student.late}</span>
                      <span className="mini-stat"><span className="dot absent"></span> ขาด {student.absent}</span>
                      <span className="mini-stat"><span className="dot unchecked"></span> ไม่ได้เช็ค {student.unchecked}</span>
                      <span className="mini-stat" style={{ marginLeft: 'auto', color: '#9ca3af' }}>รวม {grandTotal} วัน</span>
                    </div>

                    <div className="attendance-progress">
                      <div className="bar-present" style={{ width: `${pPct}%` }}></div>
                      <div className="bar-late" style={{ width: `${lPct}%` }}></div>
                      <div className="bar-absent" style={{ width: `${aPct}%` }}></div>
                      <div className="bar-unchecked" style={{ width: `${uPct}%` }}></div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Details Modal */}
      <Dialog 
        open={detailsModal.open} 
        onClose={() => setDetailsModal({ open: false, student: null })}
        fullWidth
        maxWidth="md"
        disableScrollLock={true}
        ModalProps={{ disableScrollLock: true }}
        PaperProps={{ sx: { borderRadius: { xs: 2.5, sm: 3 }, p: { xs: 0.5, sm: 1 }, m: { xs: 1, sm: 2 }, width: { xs: 'calc(100% - 16px)', sm: 'auto' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5, pb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', sm: '1.15rem' }, color: '#0f172a', lineHeight: 1.3 }}>
            ประวัติรายงานประจำวัน - {detailsModal.student?.studentName}
          </Typography>
          <ToggleButtonGroup
            value={modalViewMode}
            exclusive
            onChange={(e, nextView) => { if (nextView) setModalViewMode(nextView); }}
            size="small"
            sx={{ bgcolor: '#f1f5f9', p: 0.5, borderRadius: 2, display: 'flex', '& .MuiToggleButton-root': { flex: 1, justifyContent: 'center' } }}
          >
            <ToggleButton value="calendar" sx={{ py: 0.25, px: 1.25, fontWeight: 700, fontSize: '0.75rem', gap: 0.75, '&.Mui-selected': { bgcolor: '#ffffff', color: '#2563eb' } }}>
              <CalendarIcon style={{ width: 15, height: 15 }} /> ปฏิทิน
            </ToggleButton>
            <ToggleButton value="table" sx={{ py: 0.25, px: 1.25, fontWeight: 700, fontSize: '0.75rem', gap: 0.75, '&.Mui-selected': { bgcolor: '#ffffff', color: '#2563eb' } }}>
              <TableCellsIcon style={{ width: 15, height: 15 }} /> ตาราง
            </ToggleButton>
          </ToggleButtonGroup>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 1, sm: 2 } }}>
          {modalViewMode === 'calendar' ? (
            <AttendanceCalendar
              entries={detailsModal.student?.entries || []}
              studentId={detailsModal.student?.studentId}
              studentName={detailsModal.student?.studentName}
              internshipStartDate={detailsModal.student?.startDate}
              onBatchSign={(updatedEntries) => {
                setDetailsModal(prev => ({
                  ...prev,
                  student: prev.student ? { ...prev.student, entries: updatedEntries } : null
                }));
                // Refresh list
                loadCheckinData();
              }}
            />
          ) : (
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb' }}>วันที่</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb' }}>สถานะ</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb' }}>กิจกรรม / ประสบการณ์ที่ทำ</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb' }}>ลายเซ็นพี่เลี้ยง</TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: '#f9fafb' }}>เวลาเช็ค</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailsModal.student && sortedDetailEntries(detailsModal.student.entries).length > 0 ? (
                    sortedDetailEntries(detailsModal.student.entries).map((entry, idx) => (
                      <TableRow key={`${entry.date}-${idx}`} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{formatDateDisplay(entry.date)}</TableCell>
                        <TableCell>
                          <span className={`checkin-status ${entry.status}`}>
                            {statusLabel[entry.status]}
                          </span>
                        </TableCell>
                        <TableCell>{entry.work_experience || entry.workExperience || entry.note || '-'}</TableCell>
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
                        <TableCell>{new Date(entry.createdAt).toLocaleString('th-TH')}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: '#6b7280' }}>
                        ไม่มีข้อมูลรายงานประจำวัน
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailsModal({ open: false, student: null })} variant="contained" sx={{ bgcolor: '#111', '&:hover': { bgcolor: '#000' } }}>
            ปิดหน้าต่าง
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AdminAttendanceOverviewPage;

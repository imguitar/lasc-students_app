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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import './AdminDashboardPage.css';
import '../Shared/CheckInPage.css';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';

const AdminCheckInPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState({ date: '', status: 'all', search: '', department: 'all' });
  const [departmentMap, setDepartmentMap] = useState({});
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [editDialog, setEditDialog] = useState({
    open: false,
    target: null,
    date: '',
    status: 'present',
    note: ''
  });

  const sortEntriesByDateDesc = (list) => {
    return [...list].sort((a, b) => {
      const byDate = String(b.date || '').localeCompare(String(a.date || ''));
      if (byDate !== 0) return byDate;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  };

  const buildDepartmentMap = async () => {
    const map = {};
    try {
      const usersRes = await api.get('/users?role=student');
      const students = usersRes.data.data || [];
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
  };

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

    // Load checkins from API
    api.get('/checkins').then(res => {
      setEntries(sortEntriesByDateDesc(res.data.data || []));
    }).catch(err => console.error('Failed to load checkins:', err));

    buildDepartmentMap();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const statusLabel = useMemo(() => {
    return {
      present: 'มา',
      absent: 'ขาด',
      late: 'สาย'
    };
  }, []);

  const getDepartment = (entry) => {
    return departmentMap[String(entry.studentId || '')] || 'ไม่ระบุ';
  };

  const filteredEntries = entries.filter((entry) => {
    if (filters.date && entry.date !== filters.date) return false;
    if (filters.status !== 'all' && entry.status !== filters.status) return false;
    if (filters.department !== 'all' && getDepartment(entry) !== filters.department) return false;
    if (filters.search) {
      const term = filters.search.toLowerCase();
      const name = (entry.studentName || '').toLowerCase();
      const id = (entry.studentId || '').toLowerCase();
      return name.includes(term) || id.includes(term);
    }
    return true;
  });

  const isSameEntry = (left, right) => {
    if (!left || !right) return false;
    return (
      String(left.id) === String(right.id) &&
      String(left.studentId) === String(right.studentId) &&
      String(left.date) === String(right.date) &&
      String(left.createdAt || '') === String(right.createdAt || '')
    );
  };

  const handleOpenEdit = (entry) => {
    setEditDialog({
      open: true,
      target: entry,
      date: entry.date || '',
      status: entry.status || 'present',
      note: entry.note || ''
    });
  };

  const handleCloseEdit = () => {
    setEditDialog({ open: false, target: null, date: '', status: 'present', note: '' });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.target) return;
    if (!editDialog.date) {
      alert('กรุณาระบุวันที่');
      return;
    }

    const hasDuplicateDate = entries.some((entry) => {
      if (isSameEntry(entry, editDialog.target)) return false;
      return String(entry.studentId) === String(editDialog.target.studentId) && String(entry.date) === String(editDialog.date);
    });

    if (hasDuplicateDate) {
      alert('นักศึกษาคนนี้มีรายงานประจำวันในวันที่นี้แล้ว');
      return;
    }

    const updated = entries.map((entry) => {
      if (!isSameEntry(entry, editDialog.target)) return entry;
      return {
        ...entry,
        date: editDialog.date,
        status: editDialog.status,
        note: editDialog.note,
        updatedAt: new Date().toISOString()
      };
    });

    // For edit, we re-create the checkin via API (upsert by studentId+date)
    try {
      await api.post('/checkins', {
        studentId: editDialog.target.studentId,
        studentName: editDialog.target.studentName,
        date: editDialog.date,
        status: editDialog.status,
        note: editDialog.note,
      });
      // Reload
      const res = await api.get('/checkins');
      setEntries(sortEntriesByDateDesc(res.data.data || []));
    } catch (err) {
      alert('บันทึกล้มเหลว: ' + (err.response?.data?.message || err.message));
    }
    handleCloseEdit();
  };

  const handleDelete = async (entry) => {
    const confirmed = await window.showMuiConfirm('ยืนยันการลบรายงานประจำวันนี้?', {
      title: 'ยืนยันการลบ',
      confirmText: 'ลบรายการ',
      cancelText: 'ยกเลิก',
    });

    if (!confirmed) return;
    try {
      await api.delete(`/checkins/${entry.id}`);
      setEntries(entries.filter((item) => !isSameEntry(item, entry)));
    } catch (err) {
      alert('ลบล้มเหลว: ' + (err.response?.data?.message || err.message));
    }
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
        currentPath="/admin-dashboard/checkins"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>รายงานประจำวัน</h1>
            <p>ตรวจสอบรายงานประจำวันของนักศึกษา</p>
          </div>
          <div className="user-info">
            <span>{adminName}</span>
          </div>
        </header>

        <div className="content-section">
          <div className="checkin-filters">
            <div className="checkin-field">
              <TextField
                fullWidth
                size="small"
                label="วันที่"
                type="date"
                value={filters.date}
                onChange={(event) => setFilters({ ...filters, date: event.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </div>
            <div className="checkin-field">
              <TextField
                fullWidth
                size="small"
                label="สถานะ"
                select
                value={filters.status}
                onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                sx={{ backgroundColor: 'white' }}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                <MenuItem value="present">มา</MenuItem>
                <MenuItem value="late">สาย</MenuItem>
                <MenuItem value="absent">ขาด</MenuItem>
              </TextField>
            </div>
            <div className="checkin-field">
              <TextField
                fullWidth
                size="small"
                label="สาขา"
                select
                value={filters.department}
                onChange={(event) => setFilters({ ...filters, department: event.target.value })}
                sx={{ backgroundColor: 'white' }}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                {departmentOptions.map((department) => (
                  <MenuItem key={department} value={department}>{department}</MenuItem>
                ))}
              </TextField>
            </div>
            <div className="checkin-field" style={{ flex: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="ค้นหา"
                placeholder="ชื่อหรือรหัสนักศึกษา"
                value={filters.search}
                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
              />
            </div>
          </div>

          <TableContainer className="checkin-table-container">
            <Table size="small" className="checkin-table" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>วันที่</TableCell>
                  <TableCell>รหัสนักศึกษา</TableCell>
                  <TableCell>ชื่อ-นามสกุล</TableCell>
                  <TableCell>สาขาวิชา</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell>ลายเซ็นพี่เลี้ยง</TableCell>
                  <TableCell>หมายเหตุ</TableCell>
                  <TableCell>เวลาบันทึก</TableCell>
                  <TableCell>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>ยังไม่มีข้อมูลรายงานประจำวัน</TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={`${entry.id}-${entry.date}`} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {(() => {
                          if (!entry.date) return '-';
                          const cleanStr = String(entry.date).split('T')[0];
                          const [year, month, day] = cleanStr.split('-');
                          if (year && month && day) {
                            const thaiYear = parseInt(year) > 2500 ? year : parseInt(year) + 543;
                            return `${day}/${month}/${thaiYear}`;
                          }
                          return cleanStr;
                        })()}
                      </TableCell>
                      <TableCell>{entry.studentId}</TableCell>
                      <TableCell>{entry.studentName}</TableCell>
                      <TableCell>{getDepartment(entry)}</TableCell>
                      <TableCell>
                        <span className={`checkin-status ${entry.status}`}>
                          {statusLabel[entry.status]}
                        </span>
                      </TableCell>
                      <TableCell>{entry.note || '-'}</TableCell>
                      <TableCell>{new Date(entry.createdAt).toLocaleString('th-TH')}</TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button size="small" variant="outlined" onClick={() => handleOpenEdit(entry)}>แก้ไข</Button>
                          <Button size="small" color="error" variant="outlined" onClick={() => handleDelete(entry)}>ลบ</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </main>

      <Dialog open={editDialog.open} onClose={handleCloseEdit} fullWidth maxWidth="sm">
        <DialogTitle>แก้ไขข้อมูลรายงานประจำวัน</DialogTitle>
        <DialogContent>
          <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            <TextField
              fullWidth
              label="วันที่"
              type="date"
              value={editDialog.date}
              onChange={(event) => setEditDialog((prev) => ({ ...prev, date: event.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              select
              label="สถานะ"
              value={editDialog.status}
              onChange={(event) => setEditDialog((prev) => ({ ...prev, status: event.target.value }))}
            >
              <MenuItem value="present">มา</MenuItem>
              <MenuItem value="late">สาย</MenuItem>
              <MenuItem value="absent">ขาด</MenuItem>
            </TextField>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="กิจกรรมที่ทำในวันนี้"
              value={editDialog.note}
              onChange={(event) => setEditDialog((prev) => ({ ...prev, note: event.target.value }))}
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

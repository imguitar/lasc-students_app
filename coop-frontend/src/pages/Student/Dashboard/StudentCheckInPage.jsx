import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon, CalendarIcon, TableCellsIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, MenuItem, Button, Chip, Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import SignatureCanvas from 'react-signature-canvas';
import api from '../../../api/axios';
import './DashboardPage.css';
import '../../Admin/Shared/CheckInPage.css';
import StudentSidebar from '../../../components/StudentSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import StatusBadge from '../../../components/StatusBadge';
import ModernButton from '../../../components/ModernButton';
import AttendanceCalendar from '../../../components/AttendanceCalendar';

const StudentCheckInPage = () => {
  const navigate = useNavigate();
  const todayDate = new Date().toISOString().slice(0, 10);
  const sigCanvas = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState('');
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [currentRequestStatus, setCurrentRequestStatus] = useState('ไม่มีคำร้อง');
  const [internshipStartDate, setInternshipStartDate] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'table'
  const [showSignature, setShowSignature] = useState(false);
  const [form, setForm] = useState({
    date: todayDate,
    status: 'present',
    workExperience: '',
    note: ''
  });

  const formattedTodayDate = useMemo(() => {
    if (!todayDate) return '';
    const [year, month, day] = todayDate.split('-');
    const thaiYear = parseInt(year) > 2500 ? year : parseInt(year) + 543;
    return `${day}/${month}/${thaiYear}`;
  }, [todayDate]);

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
      const isInternshipStarted = ownRequests.some((request) => request.status === 'ออกฝึกงาน');
      const isInternshipCompleted = ['ฝึกงานเสร็จแล้ว', 'ประเมินจากสถานประกอบการแล้ว', 'ประเมินจากอาจารย์แล้ว', 'เสร็จสิ้นสมบูรณ์'].includes(latestRequest?.status);
      setCanCheckIn(isInternshipStarted);

      const approvedRequest = ownRequests.find(r => r.status === 'ออกฝึกงาน' || ['ฝึกงานเสร็จแล้ว', 'ประเมินจากสถานประกอบการแล้ว', 'ประเมินจากอาจารย์แล้ว', 'เสร็จสิ้นสมบูรณ์'].includes(r.status)) || latestRequest;
      const sDate = approvedRequest?.internship_start_date 
        || (approvedRequest?.status === 'ออกฝึกงาน' ? String(approvedRequest.updated_at || approvedRequest.submittedDate || '').split('T')[0] : null);
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

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user || !canCheckIn) return;

    if (form.date !== todayDate) {
      setMessage('รายงานประจำวันได้เฉพาะวันที่ปัจจุบันเท่านั้น');
      return;
    }

    const studentId = user.student_code || user.studentId || user.username || user.email;
    const studentName = user.full_name || user.name || user.username || 'นักศึกษา';

    let supervisorSignature = null;
    if (showSignature && sigCanvas.current && !sigCanvas.current.isEmpty()) {
      supervisorSignature = sigCanvas.current.getCanvas().toDataURL('image/png');
    }

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
    }
  };

  if (!user) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', bgcolor: '#ffffff', pt: '60px' }}>
      {/* Mobile top navbar */}
      <Box
        component="nav"
        className="mobile-top-navbar"
        sx={{
          display: 'flex',
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: 60,
          alignItems: 'center',
          gap: 1.5,
          px: '12px',
          bgcolor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          zIndex: 1080,
        }}
      >
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home">
          <img src={lascLogo} alt="LASC Logo" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '8px' }}>
          <UserProfileMenu />
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
        </div>
      </Box>

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

        <div className="content-wrapper">
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
                    ระบบเปิดให้บันทึกรายงานได้วันต่อวัน หากไม่ได้เช็คชื่อในวันนี้ ระบบจะทำการรีเซ็ตสิทธิ์วันใหม่ทุกวันเวลา <strong>07:00 น.</strong>
                  </Typography>
                </Box>
              </Box>

              <div className="checkin-card" style={{ padding: '1.75rem', borderRadius: '16px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {/* Clean Header Bar */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', pb: 2, mb: 2.5, borderBottom: '1px solid #f1f5f9', gap: 1.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', m: 0, fontSize: '1.15rem' }}>
                    บันทึกรายงานประจำวัน
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.85rem' }}>สถานะคำร้องปัจจุบัน:</Typography>
                    <StatusBadge status={currentRequestStatus} />
                  </Box>
                </Box>

                <form onSubmit={handleSubmit}>
                  <div className="checkin-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="checkin-field">
                      <TextField
                        fullWidth
                        size="small"
                        label="วันที่รายงาน"
                        value={formattedTodayDate}
                        InputProps={{ readOnly: true }}
                        helperText="ระบบกำหนดให้รายงานได้เฉพาะวันปัจจุบัน"
                      />
                    </div>
                    <div className="checkin-field">
                      <TextField
                        fullWidth
                        size="small"
                        label="สถานะการมา"
                        select
                        value={form.status}
                        onChange={(event) => setForm({ ...form, status: event.target.value })}
                        helperText="เลือกสถานะรายงานประจำวันของคุณ"
                      >
                        <MenuItem value="present">มา</MenuItem>
                        <MenuItem value="late">สาย</MenuItem>
                        <MenuItem value="absent">ขาด</MenuItem>
                      </TextField>
                    </div>

                    <div className="checkin-field">
                      <TextField
                        fullWidth
                        label="ประสบการณ์ / กิจกรรมที่ทำในวันนี้"
                        multiline
                        rows={3}
                        placeholder="ระบุรายละเอียดงานหรือประสบการณ์ที่ได้รับการฝึกปฏิบัติในวันนี้..."
                        value={form.workExperience}
                        onChange={(event) => setForm({ ...form, workExperience: event.target.value })}
                        required={form.status === 'present'}
                      />
                    </div>

                    <div className="checkin-field">
                      <TextField
                        fullWidth
                        label="หมายเหตุเพิ่มเติม (ถ้ามี)"
                        multiline
                        rows={3}
                        placeholder="เช่น เหตุผลการมาสาย/ขาด หรือข้อมูลเพิ่มเติมอื่นๆ..."
                        value={form.note}
                        onChange={(event) => setForm({ ...form, note: event.target.value })}
                      />
                    </div>
                  </div>

                  {/* Optional Supervisor Signature Section */}
                  <Box sx={{ mt: 1, mb: 2 }}>
                    <Button
                      type="button"
                      variant="text"
                      size="small"
                      onClick={() => setShowSignature(!showSignature)}
                      sx={{ gap: 1, color: showSignature ? '#2563eb' : '#64748b', fontWeight: 700, p: 0 }}
                    >
                      <PencilSquareIcon style={{ width: 18, height: 18 }} />
                      {showSignature ? 'ซ่อนช่องลายเซ็นพี่เลี้ยง / ผู้ดูแล' : 'แนบลายเซ็นยืนยันจากพี่เลี้ยง / ผู้ดูแลสถานประกอบการ (ไม่บังคับ)'}
                    </Button>

                    {showSignature && (
                      <Box sx={{ mt: 1.5, p: 2, border: '1px dashed #cbd5e1', borderRadius: 3, bgcolor: '#f8fafc' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
                          ลายเซ็นยืนยันโดยพี่เลี้ยง / ผู้ดูแลสถานประกอบการ
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#64748b', mb: 1.5 }}>
                          ใช้นิ้วมือหรือเมาส์เซ็นลายเซ็นกำกับรายงานประจำวันนี้เพื่อความถูกต้อง
                        </Typography>

                        <Box sx={{ border: '1px solid #cbd5e1', borderRadius: 2, bgcolor: '#ffffff', height: 150, overflow: 'hidden', mb: 1.5 }}>
                          <SignatureCanvas
                            ref={sigCanvas}
                            penColor="#0f172a"
                            canvasProps={{ className: 'sigCanvas', style: { width: '100%', height: '100%' } }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Button variant="outlined" color="error" size="small" onClick={clearSignature} sx={{ fontSize: '0.75rem' }}>
                            ล้างลายเซ็น
                          </Button>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            * ลายเซ็นนี้จะถูกบันทึกเก็บไว้กับรายงานประจำวันนี้
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>

                  <div className="checkin-actions" style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <ModernButton type="submit" customVariant="primary">
                      บันทึกรายงาน
                    </ModernButton>
                  </div>
                </form>
                {message && <div className="checkin-message" style={{ marginTop: '1.25rem' }}>{message}</div>}
              </div>

              {/* Attendance History Section (Calendar / Table Toggle) */}
              <Box className="checkin-table-wrapper" sx={{ marginTop: '2rem', padding: { xs: '1rem', sm: '1.75rem' }, background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 2.5, gap: 1.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: { xs: '1rem', sm: '1.15rem' } }}>
                    ประวัติรายงานประจำวัน
                  </Typography>

                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(e, nextView) => { if (nextView) setViewMode(nextView); }}
                    size="small"
                    sx={{ bgcolor: '#f1f5f9', p: 0.5, borderRadius: 2.5, display: 'flex', '& .MuiToggleButton-root': { flex: 1, justifyContent: 'center' } }}
                  >
                    <ToggleButton value="calendar" sx={{ py: 0.5, px: { xs: 1, sm: 1.5 }, fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.8rem' }, gap: 0.75, '&.Mui-selected': { bgcolor: '#ffffff', color: '#2563eb', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' } }}>
                      <CalendarIcon style={{ width: 16, height: 16 }} /> ปฏิทิน
                    </ToggleButton>
                    <ToggleButton value="table" sx={{ py: 0.5, px: { xs: 1, sm: 1.5 }, fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.8rem' }, gap: 0.75, '&.Mui-selected': { bgcolor: '#ffffff', color: '#2563eb', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' } }}>
                      <TableCellsIcon style={{ width: 16, height: 16 }} /> ตาราง
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {viewMode === 'calendar' ? (
                  <AttendanceCalendar
                    entries={entries}
                    studentId={user.student_code || user.studentId || user.username || user.email}
                    studentName={user.full_name || user.name || user.username || 'นักศึกษา'}
                    internshipStartDate={internshipStartDate}
                    onBatchSign={(updatedData) => {
                      if (Array.isArray(updatedData)) {
                        updatedData.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
                        setEntries(updatedData);
                      } else {
                        // Refresh from API
                        const studentId = user.student_code || user.studentId || user.username || user.email;
                        api.get(`/checkins?studentId=${studentId}`).then(checkinRes => {
                          const ownEntries = checkinRes.data.data || [];
                          ownEntries.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
                          setEntries(ownEntries);
                        });
                      }
                    }}
                  />
                ) : (
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
                                {entry.status === 'present' && (
                                  <Chip label="มา" size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, height: 22 }} />
                                )}
                                {entry.status === 'late' && (
                                  <Chip label="สาย" size="small" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700, height: 22 }} />
                                )}
                                {entry.status === 'absent' && (
                                  <Chip label="ขาด" size="small" sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, height: 22 }} />
                                )}
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
                )}
              </Box>
            </>
          )}
        </div>
      </Box>
    </Box>
  );
};

export default StudentCheckInPage;
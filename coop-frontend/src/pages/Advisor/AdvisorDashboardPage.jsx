import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../assets/LASC-SSKRU-1.png';
import api from '../../api/axios';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Checkbox,
} from '@mui/material';
import { STAT_EMOJI } from '../../utils/statEmojis';
import '../Admin/Dashboard/AdminDashboardPage.css'; // Reuse Admin styles
import { ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import AdvisorSidebar from '../../components/AdvisorSidebar';
import UserProfileMenu from '../../components/UserProfileMenu';
import StatusBadge from '../../components/StatusBadge';
import ModernButton from '../../components/ModernButton';
import StatCard from '../../components/StatCard';
import './AdvisorDashboardPage.css';

const AdvisorDashboardPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [advisorName, setAdvisorName] = useState('');
  const [advisorDepartment, setAdvisorDepartment] = useState('');
  const [allRequests, setAllRequests] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [rejectModal, setRejectModal] = useState({
    open: false,
    requestId: null,
    reason: ''
  });
  const [approveModal, setApproveModal] = useState({
    open: false,
    requestId: null,
    currentStatus: '',
    comment: '',
    submitting: false,
  });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const getDisplayStatus = (status) =>
    status === 'รออาจารย์ที่ปรึกษาอนุมัติ' ? 'รออนุมัติ' : status;

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const normalizedRole = String(user.role || '').toLowerCase();
      if (normalizedRole !== 'advisor') {
         navigate('/login'); 
         return;
      }
      setAdvisorName(user.name);
      setAdvisorDepartment(user.department || user.major || '');
      
      api.get('/requests').then(res => {
        setAllRequests(res.data.data || []);
      }).catch(err => console.error('Failed to load requests:', err));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const departmentFilteredRequests = allRequests.filter((req) => {
    const dept = req.department || req.details?.student_info?.major || '';
    if (!advisorDepartment) return true;
    return dept === advisorDepartment;
  });

  const filteredRequests = departmentFilteredRequests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });
  
  const openApproveModal = (requestId, currentStatus) => {
    setApproveModal({
      open: true,
      requestId,
      currentStatus,
      comment: '',
      submitting: false,
    });
  };

  const handleConfirmApprove = async () => {
    if (!approveModal.requestId) return;
    setApproveModal((prev) => ({ ...prev, submitting: true }));
    try {
      const isStage2 = approveModal.currentStatus === 'รออาจารย์อนุมัติเริ่มฝึกงาน' || approveModal.currentStatus === 'อนุมัติแล้ว';
      const nextStatus = isStage2 ? 'ออกฝึกงาน' : 'รอผู้ดูแลระบบอนุมัติ';
      const payload = {
        status: nextStatus,
        advisor_comment: approveModal.comment.trim() || null,
      };
      await api.patch(`/requests/${approveModal.requestId}/status`, payload);
      setAllRequests(allRequests.map(r => String(r.id) === String(approveModal.requestId) ? { ...r, status: nextStatus, advisor_comment: approveModal.comment.trim() || null } : r));
      setToast({ open: true, message: nextStatus === 'ออกฝึกงาน' ? 'อนุมัติการเริ่มฝึกงานเรียบร้อยแล้ว (สถานะเปลี่ยนเป็นออกฝึกงาน)' : 'อนุมัติคำร้องเรียบร้อย และส่งต่อให้ผู้ดูแลระบบ', severity: 'success' });
      setApproveModal({ open: false, requestId: null, currentStatus: '', comment: '', submitting: false });
    } catch (err) {
      setToast({ open: true, message: 'อัปเดตล้มเหลว: ' + (err.response?.data?.message || err.message), severity: 'error' });
      setApproveModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleReject = (requestId) => {
    setRejectModal({ open: true, requestId, reason: '' });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal.reason.trim()) {
      setToast({ open: true, message: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ', severity: 'warning' });
      return;
    }

    const rejectedRequest = allRequests.find(r => String(r.id) === String(rejectModal.requestId));
    try {
      await api.patch(`/requests/${rejectModal.requestId}/status`, {
        status: 'ไม่อนุมัติ (อาจารย์)',
        advisor_comment: rejectModal.reason.trim(),
      });
      setAllRequests(allRequests.map((request) => (
        String(request.id) === String(rejectModal.requestId)
          ? { ...request, status: 'ไม่อนุมัติ (อาจารย์)', advisor_comment: rejectModal.reason.trim() }
          : request
      )));
      setToast({ open: true, message: `ปฏิเสธคำร้องของ ${rejectedRequest?.studentName || 'นักศึกษา'} แล้ว`, severity: 'info' });
    } catch (err) {
      setToast({ open: true, message: 'อัปเดตล้มเหลว: ' + (err.response?.data?.message || err.message), severity: 'error' });
    }
    setRejectModal({ open: false, requestId: null, reason: '' });
  };

  const handleRejectClose = () => {
    setRejectModal({ open: false, requestId: null, reason: '' });
  };

  const handleFinishInternship = async (requestId) => {
    try {
      await api.patch(`/requests/${requestId}/status`, { status: 'ฝึกงานเสร็จแล้ว' });
      setAllRequests(allRequests.map(r => String(r.id) === String(requestId)
        ? { ...r, status: 'ฝึกงานเสร็จแล้ว' }
        : r));
      setToast({ open: true, message: 'เสร็จสิ้นการฝึกงานเรียบร้อยแล้ว', severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: 'อัปเดตล้มเหลว: ' + (err.response?.data?.message || err.message), severity: 'error' });
    }
  };

  const actionableRequests = filteredRequests.filter((r) =>
    ['ประเมินเสร็จแล้ว', 'รออาจารย์ที่ปรึกษาอนุมัติ'].includes(r.status)
  );

  const isAllSelected =
    actionableRequests.length > 0 &&
    actionableRequests.every((r) => selectedIds.includes(String(r.id)));
  const isSomeSelected =
    actionableRequests.some((r) => selectedIds.includes(String(r.id))) && !isAllSelected;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(actionableRequests.map((r) => String(r.id)));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    const strId = String(id);
    setSelectedIds((prev) =>
      prev.includes(strId) ? prev.filter((i) => i !== strId) : [...prev, strId]
    );
  };

  const selectedEvaluatedCount = filteredRequests.filter(
    (r) => selectedIds.includes(String(r.id)) && r.status === 'ประเมินเสร็จแล้ว'
  ).length;

  const selectedPendingCount = filteredRequests.filter(
    (r) => selectedIds.includes(String(r.id)) && r.status === 'รออาจารย์ที่ปรึกษาอนุมัติ'
  ).length;

  const handleBatchFinishInternship = async () => {
    const targets = filteredRequests.filter(
      (r) => selectedIds.includes(String(r.id)) && r.status === 'ประเมินเสร็จแล้ว'
    );
    if (targets.length === 0) return;

    try {
      await Promise.all(
        targets.map((r) => api.patch(`/requests/${r.id}/status`, { status: 'ฝึกงานเสร็จแล้ว' }))
      );
      const targetIds = targets.map((r) => String(r.id));
      setAllRequests((prev) =>
        prev.map((r) => (targetIds.includes(String(r.id)) ? { ...r, status: 'ฝึกงานเสร็จแล้ว' } : r))
      );
      setSelectedIds((prev) => prev.filter((id) => !targetIds.includes(id)));
      setToast({
        open: true,
        message: `อนุมัติเสร็จสิ้นการฝึกงาน ${targets.length} รายการเรียบร้อยแล้ว`,
        severity: 'success',
      });
    } catch (err) {
      setToast({
        open: true,
        message: 'เกิดข้อผิดพลาดในการอนุมัติ: ' + (err.response?.data?.message || err.message),
        severity: 'error',
      });
    }
  };

  const handleBatchApprovePending = async () => {
    const targets = filteredRequests.filter(
      (r) => selectedIds.includes(String(r.id)) && r.status === 'รออาจารย์ที่ปรึกษาอนุมัติ'
    );
    if (targets.length === 0) return;

    try {
      await Promise.all(
        targets.map((r) => api.patch(`/requests/${r.id}/status`, { status: 'รอผู้ดูแลระบบอนุมัติ' }))
      );
      const targetIds = targets.map((r) => String(r.id));
      setAllRequests((prev) =>
        prev.map((r) => (targetIds.includes(String(r.id)) ? { ...r, status: 'รอผู้ดูแลระบบอนุมัติ' } : r))
      );
      setSelectedIds((prev) => prev.filter((id) => !targetIds.includes(id)));
      setToast({
        open: true,
        message: `อนุมัติคำร้อง ${targets.length} รายการเรียบร้อยแล้ว`,
        severity: 'success',
      });
    } catch (err) {
      setToast({
        open: true,
        message: 'เกิดข้อผิดพลาดในการอนุมัติ: ' + (err.response?.data?.message || err.message),
        severity: 'error',
      });
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
      <AdvisorSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/advisor-dashboard"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>สวัสดี, {advisorName}</h1>
            <p>ติดตามสถานะการฝึกงานของนักศึกษา</p>
          </div>
        </header>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
            gap: 2,
            mb: 3,
          }}
        >
          {[
            { title: 'ทั้งหมด', value: departmentFilteredRequests.length, icon: STAT_EMOJI.TOTAL, color: '#3b82f6' },
            { title: 'รอตรวจสอบ', value: departmentFilteredRequests.filter((request) => request.status === 'รออาจารย์ที่ปรึกษาอนุมัติ').length, icon: STAT_EMOJI.PENDING, color: '#f59e0b' },
            { title: 'อนุมัติแล้ว', value: departmentFilteredRequests.filter((request) => request.status === 'อนุมัติแล้ว').length, icon: STAT_EMOJI.APPROVED, color: '#10b981' },
          ].map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </Box>

        <Paper className="content-section" elevation={0} sx={{ width: '100%' }}>
          <div className="section-header">
            <h2>รายการคำร้องที่ต้องตรวจสอบ</h2>
            <TextField
              select
              size="small"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: '220px' }, backgroundColor: 'white' }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="รออาจารย์ที่ปรึกษาอนุมัติ">รออนุมัติ</MenuItem>
              <MenuItem value="อนุมัติแล้ว">อนุมัติแล้ว</MenuItem>
              <MenuItem value="ประเมินเสร็จแล้ว">ประเมินเสร็จแล้ว</MenuItem>
            </TextField>
          </div>

          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            <strong>ข้อความแจ้งเตือนระบบ:</strong> หากอาจารย์ไม่ได้กดเสร็จสิ้นการฝึกงานด้วยตนเอง (ขั้นตอนสุดท้าย) ระบบจะอนุมัติให้จบการฝึกงานให้อัตโนมัติภายใน 3 วัน หลังจากที่สถานประกอบการส่งผลประเมินเรียบร้อยแล้ว
          </Alert>

          {selectedIds.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                mb: 2,
                p: 1.5,
                px: 2,
                bgcolor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e40af' }}>
                เลือกอยู่ {selectedIds.length} รายการ
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {selectedEvaluatedCount > 0 && (
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    onClick={handleBatchFinishInternship}
                    sx={{ fontWeight: 600 }}
                  >
                    เสร็จสิ้นการฝึกงาน ({selectedEvaluatedCount})
                  </Button>
                )}
                {selectedPendingCount > 0 && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={handleBatchApprovePending}
                    sx={{ fontWeight: 600 }}
                  >
                    อนุมัติคำร้องที่เลือก ({selectedPendingCount})
                  </Button>
                )}
                <Button variant="outlined" size="small" color="inherit" onClick={() => setSelectedIds([])}>
                  ยกเลิกการเลือก
                </Button>
              </Stack>
            </Paper>
          )}

          <TableContainer component={Box} className="compact-table">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isSomeSelected}
                      onChange={handleSelectAll}
                      disabled={actionableRequests.length === 0}
                    />
                  </TableCell>
                  <TableCell>รหัสนักศึกษา</TableCell>
                  <TableCell>ชื่อ-นามสกุล</TableCell>
                  <TableCell>บริษัท</TableCell>
                  <TableCell>ตำแหน่ง</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell>ตรวจสอบ</TableCell>
                  <TableCell>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.map((request) => {
                  const normalizedStatus = String(request.status || '').trim();
                  const isPending = normalizedStatus === 'รออาจารย์ที่ปรึกษาอนุมัติ';
                  const isEvaluated = normalizedStatus === 'ประเมินเสร็จแล้ว';
                  const isActionable = isPending || isEvaluated;
                  const isSelected = selectedIds.includes(String(request.id));

                  return (
                    <TableRow key={request.id} hover selected={isSelected}>
                      <TableCell padding="checkbox">
                        {isActionable ? (
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleToggleSelect(request.id)}
                          />
                        ) : (
                          <Checkbox disabled checked={false} />
                        )}
                      </TableCell>
                      <TableCell>{request.studentId}</TableCell>
                      <TableCell>{request.studentName}</TableCell>
                      <TableCell>{request.company}</TableCell>
                      <TableCell>{request.position}</TableCell>
                      <TableCell>
                        <StatusBadge status={normalizedStatus} />
                      </TableCell>
                      <TableCell>
                        <Button
                          component={Link}
                          to={`/dashboard/request/${request.id}`}
                          variant="outlined"
                          size="small"
                          sx={{ borderRadius: 999, fontWeight: 600 }}
                        >
                          ตรวจสอบ
                        </Button>
                      </TableCell>
                      <TableCell className="action-column">
                        {isPending && (
                          <div className="advisor-action-buttons">
                            <ModernButton size="small" customVariant="accept" onClick={() => openApproveModal(request.id, request.status || normalizedStatus)}>
                              อนุมัติ
                            </ModernButton>
                            <ModernButton size="small" customVariant="reject" onClick={() => handleReject(request.id)}>
                              ปฏิเสธ
                            </ModernButton>
                          </div>
                        )}
                        {!isPending && isEvaluated && (
                          <ModernButton size="small" customVariant="primary" onClick={() => handleFinishInternship(request.id)}>
                            เสร็จสิ้นการฝึกงาน
                          </ModernButton>
                        )}
                        {!isPending && !isEvaluated && (
                          <span className="muted-action">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">ไม่พบข้อมูล</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </main>

      <Dialog open={rejectModal.open} onClose={handleRejectClose} fullWidth maxWidth="sm">
        <DialogTitle>ระบุเหตุผลที่ไม่อนุมัติ</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            margin="dense"
            label="คอมเมนต์ถึงนักศึกษา"
            value={rejectModal.reason}
            onChange={(event) => setRejectModal((prev) => ({ ...prev, reason: event.target.value }))}
            placeholder="กรอกข้อความแนะนำ เช่น ควรแก้ข้อมูลส่วนใด"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleRejectClose}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={handleRejectConfirm}>ยืนยันการปฏิเสธ</Button>
        </DialogActions>
      </Dialog>

      {/* Approve Modal */}
      <Dialog 
        open={approveModal.open} 
        onClose={() => setApproveModal(prev => ({ ...prev, open: false }))} 
        fullWidth 
        maxWidth="sm"
        disableScrollLock={true}
        ModalProps={{ disableScrollLock: true }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>ยืนยันการอนุมัติคำร้อง</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            ท่านสามารถระบุข้อความเพิ่มเติมหรือคำแนะนำให้นักศึกษาเตรียมเอกสาร/สิ่งต่างๆ มาเพิ่มได้ (ถ้ามี)
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="ข้อความเพิ่มเติม / คำแนะนำถึงนักศึกษา (ถ้ามี)"
            value={approveModal.comment}
            onChange={(e) => setApproveModal(prev => ({ ...prev, comment: e.target.value }))}
            placeholder="เช่น ให้นักศึกษานำรูปถ่าย 2 นิ้ว 2 ใบมาให้ หรือเตรียมเอกสารข้อตกลงสถานประกอบการมารับหนังสือส่งตัว"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setApproveModal(prev => ({ ...prev, open: false }))} disabled={approveModal.submitting}>
            ยกเลิก
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleConfirmApprove} 
            disabled={approveModal.submitting}
            sx={{ fontWeight: 700, px: 3 }}
          >
            {approveModal.submitting ? 'กำลังอนุมัติ...' : 'ยืนยันอนุมัติ'}
          </Button>
        </DialogActions>
      </Dialog>



      <Snackbar
        open={toast.open}
        autoHideDuration={2600}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          elevation={6}
          variant="filled"
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AdvisorDashboardPage;

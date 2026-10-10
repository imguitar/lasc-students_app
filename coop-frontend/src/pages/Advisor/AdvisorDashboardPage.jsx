import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  IconButton,
} from '@mui/material';
import { STAT_ICON } from '../../utils/statIcons';
import '../Admin/Dashboard/AdminDashboardPage.css'; // Reuse Admin styles
import { ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { MoreVertical, Eye, Check, X, BadgeCheck, ArrowRightLeft } from 'lucide-react';
import AdvisorSidebar from '../../components/AdvisorSidebar';
import UserProfileMenu from '../../components/UserProfileMenu';
import NotificationBell from '../../components/NotificationBell';
import DateTimeIndicator from '../../components/DateTimeIndicator';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';

const AdvisorDashboardPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [advisorName, setAdvisorName] = useState('');
  const [advisorDepartment, setAdvisorDepartment] = useState('');
  const [allRequests, setAllRequests] = useState([]);
  const [pendingRelocations, setPendingRelocations] = useState([]);
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
  const [actionMenu, setActionMenu] = useState({ id: null, top: 0, left: 0 });
  const menuPanelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target?.closest?.('.action-menu-trigger')) return;
      if (menuPanelRef.current && !menuPanelRef.current.contains(event.target)) {
        setActionMenu({ id: null, top: 0, left: 0 });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!actionMenu.id) return;
    const closeMenu = () => setActionMenu({ id: null, top: 0, left: 0 });
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [actionMenu.id]);

  const handleToggleActionMenu = (e, menuId, menuHeight = 140) => {
    e.preventDefault();
    e.stopPropagation();
    if (actionMenu.id === menuId) {
      setActionMenu({ id: null, top: 0, left: 0 });
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 176; // w-44
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= menuHeight + 8
      ? rect.bottom + 4
      : Math.max(8, rect.top - menuHeight - 4);
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8
    );
    setActionMenu({ id: menuId, top, left });
  };

  const closeActionMenu = () => setActionMenu({ id: null, top: 0, left: 0 });

  const getDisplayStatus = (status) =>
    status === 'รออาจารย์ที่ปรึกษาอนุมัติ' ? 'รออนุมัติ' : status;

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const normalizedRole = String(user.role || '').toLowerCase();
      if (normalizedRole !== 'advisor') {
         navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/')); 
         return;
      }
      setAdvisorName(user.name);
      setAdvisorDepartment(user.department || user.major || '');
      
      api.get('/requests').then(res => {
        setAllRequests(res.data.data || []);
      }).catch(err => console.error('Failed to load requests:', err));

      // ดึงคำร้องขอเปลี่ยนสถานที่ฝึกงานที่ถึงขั้นอาจารย์ — ใช้แสดง badge บนแถวคำร้องหลัก
      api.get('/relocations').then(res => {
        setPendingRelocations(res.data.data || []);
      }).catch(() => setPendingRelocations([]));
    } else {
      navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/'));
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

  // แมพคำร้องเปลี่ยนสถานที่ฝึกงาน "รอบล่าสุด" → หาเร็วด้วย internship_request_id (API sort ใหม่→เก่า ใช้ตัวแรกที่เจอ)
  const relocByRequestId = pendingRelocations.reduce((map, r) => {
    const key = String(r.internship_request_id);
    if (!map.has(key)) map.set(key, r);
    return map;
  }, new Map());
  // สถานะ reloc ต่อการแสดงผล: pending(รออาจารย์) / approved(อาจารย์เห็นชอบแล้ว) / rejected(ถูกปฏิเสธ) / done
  const ADVISOR_PENDING_RELOC = ['company_approved_waiting_advisor', 'submitted_waiting_advisor'];
  const relocMeta = (r) => {
    if (!r) return null;
    if (ADVISOR_PENDING_RELOC.includes(r.status)) {
      return { state: 'pending', label: 'ขอเปลี่ยนที่ฝึกงาน', cls: 'bg-violet-50 border-violet-200 text-violet-700', icon: ArrowRightLeft };
    }
    if (r.status === 'advisor_approved_waiting_admin') {
      return { state: 'approved', label: 'อาจารย์ให้ความเห็นชอบแล้ว', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: Check };
    }
    if (r.status === 'rejected') {
      return { state: 'rejected', label: 'ไม่อนุมัติการย้าย', cls: 'bg-red-50 border-red-200 text-red-500', icon: X };
    }
    return { state: 'done', label: 'ดำเนินการแล้ว', cls: 'bg-slate-50 border-slate-200 text-slate-500', icon: ArrowRightLeft };
  };
  const relocPendingCount = pendingRelocations.filter((r) =>
    ['company_approved_waiting_advisor', 'submitted_waiting_advisor'].includes(r.status)
  ).length;

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

  const activeMenuRequest = filteredRequests.find((r) => String(r.id) === String(actionMenu.id));
  const activeMenuReloc = activeMenuRequest ? relocByRequestId.get(String(activeMenuRequest.id)) : null;
  const activeMenuStatus = String(activeMenuRequest?.status || '').trim();
  const activeMenuIsPending = activeMenuStatus === 'รออาจารย์ที่ปรึกษาอนุมัติ';
  const activeMenuIsEvaluated = activeMenuStatus === 'ประเมินเสร็จแล้ว';

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
            { title: 'ทั้งหมด', value: departmentFilteredRequests.length, icon: STAT_ICON.TOTAL, color: '#3b82f6' },
            { title: 'รอตรวจสอบ', value: departmentFilteredRequests.filter((request) => request.status === 'รออาจารย์ที่ปรึกษาอนุมัติ').length, icon: STAT_ICON.PENDING, color: '#f59e0b' },
            { title: 'อนุมัติแล้ว', value: departmentFilteredRequests.filter((request) => request.status === 'อนุมัติแล้ว').length, icon: STAT_ICON.APPROVED, color: '#10b981' },
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
          {relocPendingCount > 0 && (
            <Alert
              severity="warning"
              sx={{ mb: 2, borderRadius: 2, alignItems: 'center' }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => navigate('/advisor-dashboard/relocations')}
                  sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  ดูรายการ
                </Button>
              }
            >
              มีคำร้องขอเปลี่ยนสถานที่ฝึกงานรออาจารย์พิจารณา {relocPendingCount} รายการ
            </Alert>
          )}

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

          <div className="hidden md:block">
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
                  <TableCell align="center">การจัดการ</TableCell>
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
                      <TableCell>
                        {request.active_company_name || request.company}
                        {request.active_company_name && (
                          <span className="block text-[10px] text-slate-400 font-normal">ย้ายจาก {request.company}</span>
                        )}
                      </TableCell>
                      <TableCell>{request.position}</TableCell>
                      <TableCell>
                        <StatusBadge status={normalizedStatus} />
                        {(() => {
                          const rm = relocMeta(relocByRequestId.get(String(request.id)));
                          return rm && (
                            <Link
                              to={`/advisor-dashboard/relocations?focus=${relocByRequestId.get(String(request.id)).id}`}
                              title={rm.state === 'pending' ? 'มีคำร้องขอเปลี่ยนสถานที่ฝึกงานรอพิจารณา' : 'ผลการพิจารณาคำร้องขอย้าย'}
                              className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold no-underline hover:opacity-80 transition ${rm.cls}`}
                            >
                              <rm.icon style={{ width: 10, height: 10 }} />
                              {rm.label}
                            </Link>
                          );
                        })()}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleToggleActionMenu(e, request.id, (isPending ? 150 : isEvaluated ? 110 : 60) + (relocByRequestId.has(String(request.id)) ? 44 : 0))}
                          className="action-menu-trigger"
                          aria-label="ตัวเลือกการจัดการ"
                          title="การจัดการ"
                          sx={{ p: 0.75, color: '#94a3b8', '&:hover': { bgcolor: 'rgba(241,245,249,0.8)', color: '#475569' }, '&:active': { bgcolor: 'rgba(226,232,240,0.6)' } }}
                        >
                          <MoreVertical className="w-4 h-4 stroke-[2]" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">ไม่พบข้อมูล</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          </div>

          {/* Mobile Card View (< md) — การ์ดแนวตั้ง ไม่มี horizontal scroll */}
          <div className="md:hidden space-y-3 px-1">
            {filteredRequests.length === 0 && (
              <div className="text-center text-slate-400 text-sm py-8 bg-white rounded-2xl border border-slate-200/80">ไม่พบข้อมูล</div>
            )}
            {filteredRequests.map((request) => {
              const normalizedStatus = String(request.status || '').trim();
              const isPending = normalizedStatus === 'รออาจารย์ที่ปรึกษาอนุมัติ';
              const isEvaluated = normalizedStatus === 'ประเมินเสร็จแล้ว';
              const isActionable = isPending || isEvaluated;
              const isSelected = selectedIds.includes(String(request.id));
              const reloc = relocByRequestId.get(String(request.id));

              return (
                <div key={request.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      {isActionable && (
                        <Checkbox size="small" checked={isSelected} onChange={() => handleToggleSelect(request.id)} sx={{ p: 0.25, mt: -0.25 }} />
                      )}
                      <div className="min-w-0">
                        <p className="text-slate-900 font-semibold text-sm m-0 truncate">{request.studentName}</p>
                        <p className="text-slate-500 text-xs m-0 mt-0.5">({request.studentId})</p>
                      </div>
                    </div>
                    <StatusBadge status={normalizedStatus} />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-xs">
                    <p className="m-0 text-slate-600">
                      <span className="font-semibold text-slate-500">บริษัท:</span> {request.active_company_name || request.company}
                      {request.active_company_name && <span className="text-slate-400"> (ย้ายจาก {request.company})</span>}
                    </p>
                    <p className="m-0 text-slate-600"><span className="font-semibold text-slate-500">ตำแหน่ง:</span> {request.position}</p>
                    {reloc && (() => {
                      const rm = relocMeta(reloc);
                      return (
                        <p className="m-0 pt-1.5 border-t border-slate-200/70">
                          <Link to={`/advisor-dashboard/relocations?focus=${reloc.id}`} className={`inline-flex items-center gap-1 font-bold no-underline ${rm.state === 'pending' ? 'text-violet-700' : rm.state === 'approved' ? 'text-emerald-600' : rm.state === 'rejected' ? 'text-red-500' : 'text-slate-500'}`}>
                            <rm.icon style={{ width: 12, height: 12 }} /> {rm.label}
                          </Link>
                        </p>
                      );
                    })()}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {reloc ? (
                      <>
                        {relocMeta(reloc).state === 'pending' ? (
                          /* ยังรออาจารย์ตัดสิน → ปุ่มม่วงพาไปเซ็น/พิจารณา */
                          <Link to={`/advisor-dashboard/relocations?focus=${reloc.id}`}
                            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 no-underline shadow-xs transition">
                            <ArrowRightLeft style={{ width: 14, height: 14 }} /> พิจารณาขอย้ายที่ฝึกงาน
                          </Link>
                        ) : (
                          /* พิจารณาไปแล้ว → ปุ่มเทาอ่านผล/ลายเซ็นแบบ view-only */
                          <Link to={`/advisor-dashboard/relocations?focus=${reloc.id}`}
                            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 no-underline transition">
                            <ArrowRightLeft style={{ width: 14, height: 14 }} /> ดูผลการพิจารณาคำร้องขอย้าย
                          </Link>
                        )}
                        <Link to={`/dashboard/request/${request.id}`}
                          className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 no-underline transition">
                          <Eye style={{ width: 14, height: 14 }} /> ดูรายละเอียดคำร้องทั่วไป
                        </Link>
                      </>
                    ) : (
                      <Link to={`/dashboard/request/${request.id}`}
                        className="flex-1 min-w-[100px] py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 no-underline transition">
                        <Eye style={{ width: 14, height: 14 }} /> ตรวจสอบ
                      </Link>
                    )}
                    {isPending && (
                      <>
                        <button type="button" onClick={() => openApproveModal(request.id, normalizedStatus)}
                          className="flex-1 min-w-[90px] py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition">
                          <Check style={{ width: 14, height: 14 }} /> อนุมัติ
                        </button>
                        <button type="button" onClick={() => handleReject(request.id)}
                          className="py-2.5 px-3.5 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition">
                          <X style={{ width: 14, height: 14 }} /> ปฏิเสธ
                        </button>
                      </>
                    )}
                    {isEvaluated && (
                      <button type="button" onClick={() => handleFinishInternship(request.id)}
                        className="flex-1 min-w-[130px] py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border-0 transition">
                        <BadgeCheck style={{ width: 14, height: 14 }} /> เสร็จสิ้นการฝึกงาน
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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

      {/* Action Dropdown Panel — เรนเดอร์ผ่าน Portal เพื่อหลบการถูก clip โดย overflow ของตาราง */}
      {actionMenu.id && activeMenuRequest && createPortal(
        <div
          ref={menuPanelRef}
          className="w-56 bg-white rounded-2xl p-1.5 border border-violet-100 z-[99] flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
          style={{
            position: 'fixed',
            top: actionMenu.top,
            left: actionMenu.left,
            backgroundColor: '#ffffff',
            boxShadow: '0 12px 32px rgba(124, 58, 237, 0.12)',
            borderColor: '#ede9fe',
          }}
        >
          <Link
            to={`/dashboard/request/${activeMenuRequest.id}`}
            onClick={closeActionMenu}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition text-left no-underline cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-400" />
            <span>ตรวจสอบ</span>
          </Link>

          {activeMenuReloc && (() => {
            const rm = relocMeta(activeMenuReloc);
            const isPendingReview = rm?.state === 'pending';
            return (
              <Link
                to={`/advisor-dashboard/relocations?focus=${activeMenuReloc.id}`}
                onClick={closeActionMenu}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition text-left no-underline cursor-pointer ${
                  isPendingReview ? 'text-violet-700 hover:bg-violet-50' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowRightLeft className={`w-4 h-4 ${isPendingReview ? 'text-violet-500' : 'text-slate-400'}`} />
                <span>{isPendingReview ? 'พิจารณาคำร้องขอย้ายที่ฝึกงาน' : 'ดูผลการพิจารณาคำร้องขอย้าย'}</span>
              </Link>
            );
          })()}

          {activeMenuIsPending && (
            <>
              <div className="border-t border-slate-100 my-0.5" />
              <button
                type="button"
                onClick={() => {
                  closeActionMenu();
                  openApproveModal(activeMenuRequest.id, activeMenuStatus);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-xl transition text-left cursor-pointer border-none bg-transparent outline-none"
              >
                <Check className="w-4 h-4 text-emerald-500" />
                <span>อนุมัติ</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeActionMenu();
                  handleReject(activeMenuRequest.id);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition text-left cursor-pointer border-none bg-transparent outline-none"
              >
                <X className="w-4 h-4 text-rose-500" />
                <span>ปฏิเสธ</span>
              </button>
            </>
          )}

          {!activeMenuIsPending && activeMenuIsEvaluated && (
            <>
              <div className="border-t border-slate-100 my-0.5" />
              <button
                type="button"
                onClick={() => {
                  closeActionMenu();
                  handleFinishInternship(activeMenuRequest.id);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-50 rounded-xl transition text-left cursor-pointer border-none bg-transparent outline-none"
              >
                <BadgeCheck className="w-4 h-4 text-violet-500" />
                <span>เสร็จสิ้นการฝึกงาน</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdvisorDashboardPage;

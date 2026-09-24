import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import api from '../../../api/axios';
import * as am5 from '@amcharts/amcharts5';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Pencil, Calendar, FileText, FileUp, Copy, Check, ExternalLink, TriangleAlert, CheckCircle2, XCircle, Trash2, ChevronDown, ChevronRight, Menu as MenuIcon } from 'lucide-react';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';
import { getEffectiveInternshipStatus } from '../../../utils/internshipStatus';
import { STAT_EMOJI } from '../../../utils/statEmojis';
import './AdminDashboardPage.css';
import { ClockIcon, TrashIcon, DocumentTextIcon, CalendarIcon, CreditCardIcon, ExclamationTriangleIcon, EllipsisVerticalIcon, EyeIcon, CheckIcon, XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import StatusBadge from '../../../components/StatusBadge';
import StatCard from '../../../components/StatCard';
import AdminEvaluationRoundsModal from './AdminEvaluationRoundsModal';

export const isCompanyAcceptedStatus = (status) => {
  const s = String(status || '').trim();
  return (
    s === 'COMPANY_ACCEPTED' ||
    s.includes('สถานประกอบการตอบรับแล้ว') ||
    s.includes('รอผู้ดูแลระบบกำหนดวัน') ||
    s.includes('รอแอดมินออกใบส่งตัว') ||
    s.includes('รอออกใบส่งตัว') ||
    s === 'ตอบรับแล้ว'
  );
};

const RequestActionsMenu = ({ request, onView, onEdit, onApprove, onReject, onSchedule, onScheduleAndDispatch, onDelete, onOpenQr }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const isCompAccepted = isCompanyAcceptedStatus(request.status);
  const isAdminPending = request.status === 'รอผู้ดูแลระบบตรวจสอบ' || request.status === 'รอผู้ดูแลระบบอนุมัติ';
  const isInternshipStartPending = ['รออาจารย์อนุมัติเริ่มฝึกงาน', 'รอแอดมินอนุมัติเริ่มฝึกงาน', 'อนุมัติแล้ว'].includes(request.status);
  const closeMenu = () => setAnchorEl(null);
  const runAction = (handler) => {
    closeMenu();
    handler?.(request);
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label={`จัดการคำร้อง ${request.id}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchorEl)}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ border: '1px solid #dbe2ea', borderRadius: 1.5 }}
      >
        <EllipsisVerticalIcon style={{ width: 20, height: 20 }} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ zIndex: 1500 }}
        slotProps={{
          paper: {
            className: 'rounded-xl bg-white shadow-lg border border-slate-200',
            sx: {
              zIndex: 1500,
              minWidth: 220,
              borderRadius: 3,
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
              border: '1px solid #e2e8f0',
              p: 0.5,
              '& .MuiMenuItem-root': {
                borderRadius: '8px',
                my: 0.25,
                fontSize: '0.875rem',
                fontWeight: 500
              }
            }
          }
        }}
      >
        <MenuItem className="transition-colors duration-150 hover:bg-slate-50" onClick={() => runAction(onView)}>
          <EyeIcon style={{ width: 18, height: 18, marginRight: 10 }} /> ดูรายละเอียด
        </MenuItem>
        {isCompAccepted && (
          <MenuItem
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold rounded-lg transition"
            onClick={() => runAction(onScheduleAndDispatch)}
            sx={{ color: '#7c3aed', bgcolor: '#f5f3ff', '&:hover': { bgcolor: '#ede9fe' } }}
          >
            <div className="flex items-center gap-1">
              <Calendar size={16} className="text-violet-600" />
              <FileUp size={16} className="text-violet-600" />
            </div>
            <span>กำหนดวันและแนบใบส่งตัว</span>
          </MenuItem>
        )}
        <MenuItem
          className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition"
          onClick={() => runAction(onOpenQr)}
        >
          <QrCode className="w-4 h-4 text-slate-500 stroke-[1.6]" />
          <span>ดู QR ตอบรับล่วงหน้า</span>
        </MenuItem>
        <MenuItem
          className="transition-colors duration-150 hover:bg-violet-50 text-slate-700 hover:text-violet-700"
          onClick={() => runAction(onEdit)}
          sx={{ color: '#6d28d9', fontWeight: 500 }}
        >
          <Pencil size={18} style={{ marginRight: 10, color: '#7c3aed' }} /> แก้ไขคำร้อง
        </MenuItem>
        {isAdminPending && (
          <MenuItem className="transition-colors duration-150 hover:bg-slate-50" onClick={() => runAction(onApprove)} sx={{ color: '#15803d' }}>
            <CheckIcon style={{ width: 18, height: 18, marginRight: 10 }} /> อนุมัติคำร้อง
          </MenuItem>
        )}
        {isInternshipStartPending && (
          <MenuItem className="transition-colors duration-150 hover:bg-slate-50" onClick={() => runAction(onApprove)} sx={{ color: '#15803d' }}>
            <CheckIcon style={{ width: 18, height: 18, marginRight: 10 }} /> อนุมัติออกฝึกงาน
          </MenuItem>
        )}
        {isAdminPending && (
          <MenuItem className="transition-colors duration-150 hover:bg-slate-50" onClick={() => runAction(onReject)} sx={{ color: '#dc2626' }}>
            <XMarkIcon style={{ width: 18, height: 18, marginRight: 10 }} /> ปฏิเสธคำร้อง
          </MenuItem>
        )}
        <MenuItem className="transition-colors duration-150 hover:bg-slate-50" onClick={() => runAction(onSchedule)} sx={{ color: '#4f46e5' }}>
          <CalendarIcon style={{ width: 18, height: 18, marginRight: 10 }} /> กำหนดวันฝึกงาน
        </MenuItem>
        <MenuItem className="transition-colors duration-150 hover:bg-slate-50" onClick={() => runAction(onDelete)} sx={{ color: '#dc2626' }}>
          <TrashIcon style={{ width: 18, height: 18, marginRight: 10 }} /> ลบคำร้อง
        </MenuItem>
      </Menu>
    </>
  );
};

const AdminDashboardPage = () => {
  const [evalRoundsModalOpen, setEvalRoundsModalOpen] = useState(false);
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [adminName, setAdminName] = useState('');
  const [allRequests, setAllRequests] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [rejectModal, setRejectModal] = useState({
    open: false,
    requestId: null,
    reason: ''
  });
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [qrModal, setQrModal] = useState({ open: false, requestId: null, request: null, link: '', loading: false, error: '', copied: false, expiresAt: '' });
  const qrCanvasRef = useRef(null);
  const [dispatchModal, setDispatchModal] = useState({ open: false, requestId: null, targetStatus: null, file: null, comment: '', startDate: '', endDate: '', submitting: false, error: '' });
  const [scheduleModal, setScheduleModal] = useState({
    open: false,
    requestId: null,
    studentName: '',
    studentId: '',
    company: '',
    startDate: '',
    endDate: '',
    internshipTerm: '',
    note: '',
    submitting: false,
    error: ''
  });
  const [adminScheduleDispatchModal, setAdminScheduleDispatchModal] = useState({
    open: false,
    requestId: null,
    studentName: '',
    studentId: '',
    department: '',
    company: '',
    studentPreparation: '',
    startDate: '',
    endDate: '',
    file: null,
    note: '',
    submitting: false,
    error: ''
  });
  const [editModal, setEditModal] = useState({
    open: false,
    submitting: false,
    error: '',
    requestId: null,
    formData: {
      studentId: '',
      studentName: '',
      department: '',
      company: '',
      position: '',
      evaluator_email: '',
      supervisor: '',
      supervisorPosition: '',
      supervisorPhone: '',
      supervisorEmail: '',
      internship_start_date: '',
      internship_end_date: '',
      companyHouse: '',
      companyMoo: '',
      companyTambon: '',
      companyAmphur: '',
      companyProvince: '',
      companyPostal: '',
      companyAddressDetail: '',
    },
    originalDetails: {}
  });
  const pieChartRef = useRef(null);
  const dispatchFileInputRef = useRef(null);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    targetRequest: null,
    deleteRequests: true,
    deleteCheckins: true,
    deletePayments: true,
    submitting: false,
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchDateModal, setBatchDateModal] = useState({ open: false, startDate: '', endDate: '', submitting: false, error: '' });
  const [batchMenuAnchor, setBatchMenuAnchor] = useState(null);
  const [batchRejectModal, setBatchRejectModal] = useState({ open: false, reason: '', submitting: false, error: '' });
  const [batchDeleteModal, setBatchDeleteModal] = useState({ open: false, submitting: false, error: '' });
  const [approveWizard, setApproveWizard] = useState({ open: false, queue: [], index: 0, file: null, submitting: false, error: '' });
  const wizardFileInputRef = useRef(null);

  const getAdminDisplayStatus = (status) => {
    if (status === 'รออาจารย์ที่ปรึกษาอนุมัติ') return 'รออาจารย์อนุมัติ';
    if (status === 'รอผู้ดูแลระบบตรวจสอบ' || status === 'รอผู้ดูแลระบบอนุมัติ') return 'รออนุมัติ';
    if (status === 'อนุมัติแล้ว' || status === 'รออาจารย์อนุมัติเริ่มฝึกงาน' || status === 'รอแอดมินอนุมัติเริ่มฝึกงาน') return 'รอแอดมินอนุมัติการออกฝึกงาน';
    return status;
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const normalizedRole = String(user.role || '').toLowerCase();
      if (normalizedRole !== 'admin') {
         navigate('/dashboard'); 
         return;
      }
      setAdminName(user.name);
      
      // Load requests from API
      api.get('/requests').then(res => {
        const requests = res.data.data || [];
        // Hide 'ฝึกงานเสร็จแล้ว' from Dashboard
        setAllRequests(requests.filter(req => req.status !== 'ฝึกงานเสร็จแล้ว'));
      }).catch(err => console.error('Failed to load requests:', err));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const filteredRequests = allRequests.filter(req => {
    if (filter === 'all') return true;
    if (filter === 'pending_admin') return req.status === 'รอผู้ดูแลระบบตรวจสอบ' || req.status === 'รอผู้ดูแลระบบอนุมัติ';
    if (filter === 'rejected') return req.status.includes('ไม่อนุมัติ') || req.status === 'ปฏิเสธ';
    return req.status === filter; 
  });

  useEffect(() => {
    setSelectedIds([]);
  }, [filter]);

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (!sortBy) return 0;
    const va = a[sortBy] ?? '';
    const vb = b[sortBy] ?? '';
    if (sortBy === 'submittedDate') {
      const da = new Date(va).getTime() || 0;
      const db = new Date(vb).getTime() || 0;
      return (da - db) * (sortDir === 'asc' ? 1 : -1);
    }
    // numeric-like compare for studentId
    if (sortBy === 'studentId') {
      const na = parseInt(String(va).replace(/[^0-9]/g, ''), 10) || 0;
      const nb = parseInt(String(vb).replace(/[^0-9]/g, ''), 10) || 0;
      return (na - nb) * (sortDir === 'asc' ? 1 : -1);
    }
    return String(va).localeCompare(String(vb), 'th-TH', { numeric: true }) * (sortDir === 'asc' ? 1 : -1);
  });

  const statusCounts = useMemo(() => {
    // จัดกลุ่มด้วย includes() — ชื่อสถานะจริงในระบบหลากหลายกว่าที่ hardcode ไว้
    // (เช่น 'รออาจารย์ที่ปรึกษาอนุมัติ' เคยไม่เข้า bucket ไหนเลย → กราฟว่างทั้งที่มีคำร้อง)
    const count = { total: allRequests.length, pendingAdmin: 0, waitingAdvisor: 0, waitingCompany: 0, approved: 0, rejected: 0, other: 0 };
    allRequests.forEach((req) => {
      const s = String(req.status || '');
      if (s.includes('ไม่อนุมัติ') || s.includes('ปฏิเสธ') || s.includes('แก้ไข')) count.rejected++;
      else if (s.includes('รอสถานประกอบการ')) count.waitingCompany++;
      else if (s.includes('รออาจารย์')) count.waitingAdvisor++;
      else if (s.includes('รอ')) count.pendingAdmin++;
      else if (s.includes('อนุมัติ') || s.includes('ออกฝึกงาน') || s.includes('ตอบรับ') || s.includes('ประเมิน') || s.includes('สิ้นสุด')) count.approved++;
      else count.other++;
    });
    return count;
  }, [allRequests]);

  const summaryCards = useMemo(() => ([
    { key: 'total', label: 'ทั้งหมด', value: statusCounts.total, color: '#6366f1', icon: STAT_EMOJI.TOTAL },
    { key: 'pendingAdmin', label: 'รอตรวจสอบ', value: statusCounts.pendingAdmin, color: '#8b5cf6', icon: STAT_EMOJI.PENDING },
    { key: 'waitingCompany', label: 'รอสถานประกอบการ', value: statusCounts.waitingCompany, color: '#6366f1', icon: STAT_EMOJI.PENDING },
    { key: 'approved', label: 'อนุมัติแล้ว', value: statusCounts.approved, color: '#10b981', icon: STAT_EMOJI.APPROVED },
    { key: 'rejected', label: 'ไม่อนุมัติ', value: statusCounts.rejected, color: '#f43f5e', icon: STAT_EMOJI.REJECTED },
  ]), [statusCounts]);

  const statusChartData = useMemo(() => ([
    { category: 'รอผู้ดูแลตรวจสอบ', value: statusCounts.pendingAdmin, color: '#8b5cf6' },
    { category: 'รออาจารย์อนุมัติ', value: statusCounts.waitingAdvisor, color: '#f59e0b' },
    { category: 'รอสถานประกอบการตอบรับ', value: statusCounts.waitingCompany, color: '#6366f1' },
    { category: 'อนุมัติ / กำลังฝึกงาน', value: statusCounts.approved, color: '#10b981' },
    { category: 'ไม่อนุมัติ / ส่งกลับแก้ไข', value: statusCounts.rejected, color: '#f43f5e' },
    { category: 'อื่นๆ', value: statusCounts.other, color: '#94a3b8' },
  ].filter((item) => item.value > 0)), [statusCounts]);

  // มีคำร้องอย่างน้อย 1 รายการ → กราฟต้องวาดเสมอ (catch-all bucket 'อื่นๆ' กันกราฟว่าง)
  const hasChartData = useMemo(() => statusCounts.total > 0 && statusChartData.length > 0, [statusCounts, statusChartData]);

  const latestRequests = useMemo(() => {
    return allRequests
      .slice()
      .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))
      .slice(0, 5);
  }, [allRequests]);

  useLayoutEffect(() => {
    if (!pieChartRef.current || !hasChartData) return undefined;

    const root = am5.Root.new(pieChartRef.current);
    if (root._logo) root._logo.dispose();
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        layout: root.verticalLayout,
        innerRadius: am5.percent(72),
      }),
    );

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: 'value',
        categoryField: 'category',
        tooltip: am5.Tooltip.new(root, {
          labelText: '{category}: {value} คำร้อง',
        }),
      }),
    );

    const pieData = statusChartData.map((item) => ({
      category: item.category,
      value: item.value,
      sliceSettings: {
        fill: am5.color(item.color),
        stroke: am5.color('#ffffff'),
        strokeWidth: 2,
      },
    }));

    series.data.setAll(pieData);
    series.slices.template.setAll({
      templateField: 'sliceSettings',
      tooltipText: '{category}: {value} คำร้อง',
      cornerRadius: 4,
    });
    series.labels.template.set('forceHidden', true);
    series.ticks.template.set('forceHidden', true);

    const tooltip = series.get('tooltip');
    if (tooltip) {
      tooltip.get('background').setAll({
        fill: am5.color('#1e1b4b'),
        fillOpacity: 0.95,
        strokeOpacity: 0,
      });
      tooltip.label.setAll({ fill: am5.color('#ffffff'), fontSize: 12 });
    }

    return () => {
      root.dispose();
    };
  }, [statusChartData, hasChartData]);

  const openDeleteModal = (request) => {
    setDeleteModal({
      open: true,
      targetRequest: request,
      deleteRequests: true,
      deleteCheckins: true,
      deletePayments: true,
      submitting: false,
    });
  };

  const handleConfirmSelectiveDelete = async () => {
    if (!deleteModal.targetRequest) return;
    setDeleteModal(prev => ({ ...prev, submitting: true }));

    const reqItem = deleteModal.targetRequest;
    const reqId = reqItem.id;
    const studentCode = reqItem.studentId || reqItem.student_code || reqItem.username;

    try {
      if (deleteModal.deleteRequests) {
        await api.delete(`/requests/${reqId}`);
      }

      if (deleteModal.deleteCheckins && studentCode) {
        await api.delete(`/checkins/student/${studentCode}`).catch(e => console.log('Notice checkins delete:', e.message));
      }

      if (deleteModal.deletePayments && studentCode) {
        await api.delete(`/payments/student/${studentCode}`).catch(e => console.log('Notice payments delete:', e.message));
      }

      setAllRequests(prev => prev.filter(r => String(r.id) !== String(reqId)));
      setDeleteModal({ open: false, targetRequest: null, deleteRequests: true, deleteCheckins: true, deletePayments: true, submitting: false });
    } catch (err) {
      console.error('Selective delete failed:', err);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + (err.response?.data?.message || err.message));
      setDeleteModal(prev => ({ ...prev, submitting: false }));
    }
  };


  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    reader.readAsDataURL(file);
  });

  const formatDateThai = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_) {
      return '';
    }
  };

  const handleOpenScheduleModal = (request) => {
    const details = request.details || {};
    const currentStart = request.internship_start_date || details.startDate || '';
    const currentEnd = request.internship_end_date || details.endDate || '';
    const currentTerm = details.internshipTerm === 'term1' 
      ? 'ภาคการศึกษาที่ 1' 
      : details.internshipTerm === 'term2' 
        ? 'ภาคการศึกษาที่ 2' 
        : (details.internshipTerm || '');
    const currentNote = details.internshipDateNote || '';

    setScheduleModal({
      open: true,
      requestId: request.id,
      studentName: request.studentName || '',
      studentId: request.studentId || '',
      company: request.company || '',
      startDate: currentStart ? String(currentStart).slice(0, 10) : '',
      endDate: currentEnd ? String(currentEnd).slice(0, 10) : '',
      internshipTerm: currentTerm,
      note: currentNote,
      submitting: false,
      error: ''
    });
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleModal.startDate || !scheduleModal.endDate) {
      setScheduleModal((prev) => ({ ...prev, error: 'กรุณาระบุทั้งวันเริ่มต้นและวันสิ้นสุดการฝึกงาน' }));
      return;
    }
    if (new Date(scheduleModal.endDate) < new Date(scheduleModal.startDate)) {
      setScheduleModal((prev) => ({ ...prev, error: 'วันสิ้นสุดต้องอยู่หลังวันเริ่มต้นฝึกงาน' }));
      return;
    }

    setScheduleModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const payload = {
        startDate: scheduleModal.startDate,
        endDate: scheduleModal.endDate,
        internshipTerm: scheduleModal.internshipTerm,
        note: scheduleModal.note
      };

      await api.patch(`/requests/${scheduleModal.requestId}/internship-period`, payload);

      setAllRequests((prev) => prev.map((r) => String(r.id) === String(scheduleModal.requestId) ? {
        ...r,
        internship_start_date: scheduleModal.startDate,
        internship_end_date: scheduleModal.endDate,
        details: {
          ...(r.details || {}),
          startDate: scheduleModal.startDate,
          endDate: scheduleModal.endDate,
          internshipTerm: scheduleModal.internshipTerm,
          internshipDateNote: scheduleModal.note
        }
      } : r));

      setScheduleModal((prev) => ({ ...prev, open: false, submitting: false }));
      alert('กำหนดวันฝึกงานให้นักศึกษาเรียบร้อยแล้ว');
    } catch (err) {
      setScheduleModal((prev) => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || err.message || 'บันทึกวันฝึกงานล้มเหลว'
      }));
    }
  };

  const handleOpenAdminScheduleAndDispatchModal = (req) => {
    const details = req.details || {};
    const companyResponse = details.companyResponse || {};
    const prep = details.studentPreparation || companyResponse.studentPreparation || '';

    setAdminScheduleDispatchModal({
      open: true,
      requestId: req.id,
      studentName: req.studentName || '-',
      studentId: req.studentId || '-',
      department: req.department || '-',
      company: req.company || '-',
      studentPreparation: prep,
      startDate: req.internship_start_date ? String(req.internship_start_date).slice(0, 10) : (details.startDate ? String(details.startDate).slice(0, 10) : ''),
      endDate: req.internship_end_date ? String(req.internship_end_date).slice(0, 10) : (details.endDate ? String(details.endDate).slice(0, 10) : ''),
      file: null,
      note: '',
      submitting: false,
      error: ''
    });
  };

  const handleCloseAdminScheduleAndDispatchModal = () => {
    if (adminScheduleDispatchModal.submitting) return;
    setAdminScheduleDispatchModal(prev => ({
      ...prev,
      open: false,
      file: null,
      error: ''
    }));
  };

  const handleAdminScheduleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setAdminScheduleDispatchModal(prev => ({
        ...prev,
        error: 'รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG เท่านั้น',
        file: null
      }));
      e.target.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setAdminScheduleDispatchModal(prev => ({
        ...prev,
        error: 'ขนาดไฟล์ต้องไม่เกิน 20MB',
        file: null
      }));
      e.target.value = '';
      return;
    }
    setAdminScheduleDispatchModal(prev => ({ ...prev, file, error: '' }));
  };

  const handleAdminScheduleDispatchSubmit = async (e) => {
    e?.preventDefault();
    const { requestId, startDate, endDate, file, note } = adminScheduleDispatchModal;

    if (!startDate || !endDate) {
      setAdminScheduleDispatchModal(prev => ({ ...prev, error: 'กรุณาระบุทั้งวันเริ่มต้นและวันสิ้นสุดการฝึกงาน' }));
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setAdminScheduleDispatchModal(prev => ({ ...prev, error: 'วันสิ้นสุดต้องอยู่หลังวันเริ่มต้นฝึกงาน' }));
      return;
    }
    if (!file) {
      setAdminScheduleDispatchModal(prev => ({ ...prev, error: 'กรุณาอัปโหลดหนังสือส่งตัวนักศึกษา' }));
      return;
    }

    setAdminScheduleDispatchModal(prev => ({ ...prev, submitting: true, error: '' }));
    try {
      const dataUrl = await fileToDataUrl(file);
      
      // Determine date-driven initial status
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const startStr = String(startDate).split('T')[0];
      const endStr = String(endDate).split('T')[0];

      let newStatus = 'อนุมัติแล้ว (รอออกฝึกงาน)';
      if (todayStr >= startStr && todayStr <= endStr) {
        newStatus = 'กำลังออกฝึกงาน';
      } else if (todayStr > endStr) {
        newStatus = 'สิ้นสุดการฝึกงาน (รอประเมิน)';
      }

      const payload = {
        status: newStatus,
        startDate,
        endDate,
        admin_comment: note?.trim() || null,
        dispatchLetter: {
          fileName: file.name,
          mimeType: file.type,
          dataUrl,
          uploadedAt: new Date().toISOString()
        }
      };

      await api.patch(`/requests/${requestId}/status`, payload);

      setAllRequests(prev => prev.map(r => String(r.id) === String(requestId)
        ? {
            ...r,
            status: newStatus,
            admin_comment: note?.trim() || null,
            dispatchLetter: payload.dispatchLetter,
            internship_start_date: startDate,
            internship_end_date: endDate,
            details: {
              ...(r.details || {}),
              startDate,
              endDate,
              dispatchLetter: payload.dispatchLetter
            }
          }
        : r));

      setAdminScheduleDispatchModal(prev => ({
        ...prev,
        open: false,
        submitting: false,
        error: ''
      }));

      alert('กำหนดวันฝึกงานและแนบหนังสือส่งตัวให้นักศึกษาเรียบร้อยแล้ว นักศึกษาสามารถเปิดดูและดาวน์โหลดเอกสารได้ทันที');
    } catch (err) {
      setAdminScheduleDispatchModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || err.message || 'บันทึกข้อมูลล้มเหลว'
      }));
    }
  };

  const handleApproveStartInternship = (requestId) => {
    if (dispatchFileInputRef.current) {
      dispatchFileInputRef.current.value = '';
    }
    const target = allRequests.find((r) => String(r.id) === String(requestId));
    const currentStart = target?.internship_start_date || target?.details?.startDate || '';
    const currentEnd = target?.internship_end_date || target?.details?.endDate || '';

    setDispatchModal({
      open: true,
      requestId,
      targetStatus: 'ออกฝึกงาน',
      file: null,
      comment: '',
      startDate: currentStart ? String(currentStart).slice(0, 10) : '',
      endDate: currentEnd ? String(currentEnd).slice(0, 10) : '',
      submitting: false,
      error: ''
    });
  };

  const handleApprove = (requestId) => {
    if (dispatchFileInputRef.current) {
      dispatchFileInputRef.current.value = '';
    }
    setDispatchModal({ open: true, requestId, targetStatus: 'รอสถานประกอบการตอบรับ', file: null, comment: '', startDate: '', endDate: '', submitting: false, error: '' });
  };

  const handleDispatchModalClose = () => {
    if (dispatchFileInputRef.current) {
      dispatchFileInputRef.current.value = '';
    }
    setDispatchModal({ open: false, requestId: null, targetStatus: null, file: null, comment: '', startDate: '', endDate: '', submitting: false, error: '' });
  };

  const handleOpenResponseQr = async (requestId, targetRequest = null) => {
    const req = targetRequest || allRequests.find(r => String(r.id) === String(requestId));
    setQrModal({ open: true, requestId, request: req, link: '', loading: true, error: '', copied: false, expiresAt: '' });
    try {
      const res = await api.post(`/requests/${requestId}/response-qr`);
      const responseUrl = res.data?.data?.responseUrl;
      if (!responseUrl) throw new Error('ไม่พบ URL สำหรับตอบรับ');
      const link = /^https?:\/\//i.test(responseUrl)
        ? responseUrl
        : new URL(responseUrl, window.location.origin).href;
      setQrModal({ open: true, requestId, request: req, link, loading: false, error: '', copied: false, expiresAt: res.data?.data?.expiresAt || '' });
    } catch (err) {
      setQrModal({
        open: true,
        requestId,
        request: req,
        link: '',
        loading: false,
        error: err.response?.data?.message || err.message || 'ไม่สามารถโหลด QR Code ได้',
        copied: false,
        expiresAt: ''
      });
    }
  };

  const handleDispatchFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setDispatchModal((prev) => ({ ...prev, error: 'รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG เท่านั้น', file: null }));
      event.target.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setDispatchModal((prev) => ({ ...prev, error: 'ขนาดไฟล์ต้องไม่เกิน 20MB', file: null }));
      event.target.value = '';
      return;
    }
    setDispatchModal((prev) => ({ ...prev, file, error: '' }));
  };

  const handleDispatchSubmit = async () => {
    if (!dispatchModal.file) {
      setDispatchModal((prev) => ({ ...prev, error: 'กรุณาเลือกไฟล์หนังสือขอความอนุเคราะห์ก่อนอนุมัติ' }));
      return;
    }
    setDispatchModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const dataUrl = await fileToDataUrl(dispatchModal.file);
      const requestId = dispatchModal.requestId;
      const targetRequest = allRequests.find(r => String(r.id) === String(requestId));
      const isStartInternship = dispatchModal.targetStatus === 'ออกฝึกงาน' || ['รออาจารย์อนุมัติเริ่มฝึกงาน', 'รอแอดมินอนุมัติเริ่มฝึกงาน', 'อนุมัติแล้ว'].includes(targetRequest?.status);
      const newStatus = isStartInternship ? 'ออกฝึกงาน' : 'รอสถานประกอบการตอบรับ';

      const payload = {
        status: newStatus,
        admin_comment: dispatchModal.comment?.trim() || null,
        dispatchLetter: {
          fileName: dispatchModal.file.name,
          mimeType: dispatchModal.file.type,
          dataUrl,
        },
      };

      if (dispatchModal.startDate) payload.startDate = dispatchModal.startDate;
      if (dispatchModal.endDate) payload.endDate = dispatchModal.endDate;

      await api.patch(`/requests/${requestId}/status`, payload);
      setAllRequests(allRequests.map(r => String(r.id) === String(requestId)
        ? {
            ...r,
            status: newStatus,
            admin_comment: dispatchModal.comment?.trim() || null,
            dispatchLetter: { fileName: dispatchModal.file.name, dataUrl },
            internship_start_date: dispatchModal.startDate || r.internship_start_date,
            internship_end_date: dispatchModal.endDate || r.internship_end_date,
            details: {
              ...(r.details || {}),
              startDate: dispatchModal.startDate || r.details?.startDate,
              endDate: dispatchModal.endDate || r.details?.endDate,
            }
          }
        : r));
      
      handleDispatchModalClose();

      if (!isStartInternship) {
        await handleOpenResponseQr(requestId);
      } else {
        alert('อนุมัติการออกฝึกงานและแนบหนังสือส่งตัวให้นักศึกษาเรียบร้อยแล้ว');
      }
    } catch (err) {
      setDispatchModal((prev) => ({ ...prev, submitting: false, error: err.response?.data?.message || err.message || 'อัปเดตสถานะล้มเหลว' }));
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrModal.link);
      setQrModal((prev) => ({ ...prev, copied: true }));
      setTimeout(() => setQrModal((prev) => ({ ...prev, copied: false })), 2500);
    } catch {
      alert('ไม่สามารถคัดลอกลิงก์ได้');
    }
  };

  const handleTestOpenLink = () => {
    if (qrModal.link) window.open(qrModal.link, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) {
      alert('ไม่สามารถดาวน์โหลด QR Code ได้');
      return;
    }
    const downloadLink = document.createElement('a');
    downloadLink.download = `company-response-qr-${qrModal.requestId}.png`;
    downloadLink.href = canvas.toDataURL('image/png');
    downloadLink.click();
  };

  const handleCloseQrModal = () => {
    setQrModal({ open: false, requestId: null, request: null, link: '', loading: false, error: '', copied: false, expiresAt: '' });
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      await api.patch(`/requests/${requestId}/status`, { status: newStatus });
      setAllRequests(allRequests.map(r => String(r.id) === String(requestId) ? {...r, status: newStatus} : r));
      alert(`อัปเดตสถานะเป็น "${newStatus}" เรียบร้อยแล้ว`);
    } catch (err) {
      alert('อัปเดตสถานะล้มเหลว: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReject = (requestId) => {
    setRejectModal({ open: true, requestId, reason: '' });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal.reason.trim()) {
      alert('กรุณาระบุเหตุผลที่ไม่อนุมัติ');
      return;
    }

    try {
      await api.patch(`/requests/${rejectModal.requestId}/status`, {
        status: 'ไม่อนุมัติ (Admin)',
        admin_comment: rejectModal.reason.trim(),
      });
      setAllRequests(allRequests.map(r =>
        String(r.id) === String(rejectModal.requestId)
          ? { ...r, status: 'ไม่อนุมัติ (Admin)', admin_comment: rejectModal.reason.trim() }
          : r
      ));
      alert(`ไม่อนุมัติคำร้องเลขที่ ${rejectModal.requestId}`);
    } catch (err) {
      alert('อัปเดตสถานะล้มเหลว: ' + (err.response?.data?.message || err.message));
    }
    setRejectModal({ open: false, requestId: null, reason: '' });
  };

  const handleRejectClose = () => {
    setRejectModal({ open: false, requestId: null, reason: '' });
  };

  const handleOpenEditModal = (target) => {
    const details = (typeof target.details === 'object' && target.details !== null) ? target.details : {};
    const companyAddress = (typeof details.companyAddress === 'object' && details.companyAddress !== null) ? details.companyAddress : {};
    const studentInfo = (typeof details.student_info === 'object' && details.student_info !== null) ? details.student_info : {};

    setEditModal({
      open: true,
      submitting: false,
      error: '',
      requestId: target.id,
      formData: {
        studentId: target.studentId || studentInfo.studentId || '',
        studentName: target.studentName || studentInfo.name || '',
        department: target.department || studentInfo.major || '',
        company: target.company || details.companyName || '',
        position: target.position || details.position || '',
        evaluator_email: target.evaluator_email || details.evaluatorEmail || '',
        supervisor: details.contactPerson || '',
        supervisorPosition: details.contactPosition || '',
        supervisorPhone: details.contactPhone || '',
        supervisorEmail: details.contactEmail || '',
        internship_start_date: target.internship_start_date || details.startDate || '',
        internship_end_date: target.internship_end_date || details.endDate || '',
        companyHouse: companyAddress.house || '',
        companyMoo: companyAddress.moo || '',
        companyTambon: companyAddress.tambon || '',
        companyAmphur: companyAddress.amphur || '',
        companyProvince: companyAddress.province || '',
        companyPostal: companyAddress.postal || '',
        companyAddressDetail: companyAddress.detail || '',
      },
      originalDetails: details
    });
  };

  const handleCloseEditModal = () => {
    if (!editModal.submitting) {
      setEditModal(prev => ({ ...prev, open: false, error: '' }));
    }
  };

  const handleEditModalChange = (field, value) => {
    setEditModal(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value
      }
    }));
  };

  const handleSaveEditRequest = async () => {
    const { formData, requestId, originalDetails } = editModal;
    if (!formData.company || !formData.company.trim()) {
      setEditModal(prev => ({ ...prev, error: 'กรุณากรอกชื่อสถานประกอบการ / บริษัท' }));
      return;
    }

    if (formData.evaluator_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.evaluator_email.trim())) {
      setEditModal(prev => ({ ...prev, error: 'รูปแบบ Email ผู้ประเมินไม่ถูกต้อง' }));
      return;
    }

    setEditModal(prev => ({ ...prev, submitting: true, error: '' }));

    try {
      const targetEmail = formData.evaluator_email?.trim() || null;
      const updatedDetails = {
        ...originalDetails,
        companyName: formData.company.trim(),
        position: formData.position?.trim() || '',
        contactPerson: formData.supervisor?.trim() || '',
        contactPosition: formData.supervisorPosition?.trim() || '',
        contactPhone: formData.supervisorPhone?.trim() || '',
        contactEmail: formData.supervisorEmail?.trim() || '',
        evaluatorEmail: targetEmail,
        startDate: formData.internship_start_date || originalDetails?.startDate || null,
        endDate: formData.internship_end_date || originalDetails?.endDate || null,
        companyAddress: {
          ...((originalDetails && originalDetails.companyAddress) || {}),
          house: formData.companyHouse?.trim() || '',
          moo: formData.companyMoo?.trim() || '',
          tambon: formData.companyTambon?.trim() || '',
          amphur: formData.companyAmphur?.trim() || '',
          province: formData.companyProvince?.trim() || '',
          postal: formData.companyPostal?.trim() || '',
          detail: formData.companyAddressDetail?.trim() || '',
        }
      };

      const payload = {
        company: formData.company.trim(),
        position: formData.position?.trim() || '',
        evaluator_email: targetEmail,
        evaluatorEmail: targetEmail,
        internship_start_date: formData.internship_start_date || null,
        internship_end_date: formData.internship_end_date || null,
        details: updatedDetails
      };

      await api.put(`/requests/${requestId}`, payload);

      setAllRequests(prev => prev.map(r => String(r.id) === String(requestId) ? {
        ...r,
        company: payload.company,
        position: payload.position,
        evaluator_email: targetEmail,
        internship_start_date: payload.internship_start_date,
        internship_end_date: payload.internship_end_date,
        details: updatedDetails,
      } : r));

      setEditModal(prev => ({ ...prev, open: false, submitting: false }));
      alert('บันทึกการเปลี่ยนแปลงข้อมูลคำร้องสำเร็จ');
    } catch (err) {
      console.error('Failed to update request:', err);
      setEditModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || err.message || 'บันทึกการเปลี่ยนแปลงล้มเหลว'
      }));
    }
  };

  const isRowSelected = (id) => selectedIds.includes(id);

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]));
  };

  const toggleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedIds(sortedRequests.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const clearSelection = () => setSelectedIds([]);

  const handleOpenBatchDateModal = () => {
    if (selectedIds.length === 0) return;
    setBatchDateModal({ open: true, startDate: '', endDate: '', submitting: false, error: '' });
  };

  const handleBatchDateSubmit = async () => {
    if (!batchDateModal.startDate || !batchDateModal.endDate) {
      setBatchDateModal((prev) => ({ ...prev, error: 'กรุณาระบุทั้งวันเริ่มต้นและวันสิ้นสุดการฝึกงาน' }));
      return;
    }
    if (new Date(batchDateModal.endDate) < new Date(batchDateModal.startDate)) {
      setBatchDateModal((prev) => ({ ...prev, error: 'วันสิ้นสุดต้องอยู่หลังวันเริ่มต้นฝึกงาน' }));
      return;
    }

    setBatchDateModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const { startDate, endDate } = batchDateModal;
      await api.patch('/requests/batch/internship-period', { ids: selectedIds, startDate, endDate });

      setAllRequests((prev) => prev.map((r) => (
        selectedIds.includes(r.id)
          ? {
              ...r,
              internship_start_date: startDate,
              internship_end_date: endDate,
              details: { ...(r.details || {}), startDate, endDate },
            }
          : r
      )));

      setBatchDateModal({ open: false, startDate: '', endDate: '', submitting: false, error: '' });
      alert(`กำหนดวันฝึกงานให้ ${selectedIds.length} รายการเรียบร้อยแล้ว`);
      clearSelection();
    } catch (err) {
      setBatchDateModal((prev) => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || err.message || 'บันทึกวันฝึกงานล้มเหลว',
      }));
    }
  };

  const handleBatchStartInternship = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`ยืนยันเปลี่ยนสถานะเป็น "ออกฝึกงาน" ให้ ${selectedIds.length} รายการ?`)) return;

    try {
      await api.patch('/requests/batch/status', { ids: selectedIds, status: 'ออกฝึกงาน' });
      setAllRequests((prev) => prev.map((r) => (selectedIds.includes(r.id) ? { ...r, status: 'ออกฝึกงาน' } : r)));
      alert(`เปลี่ยนสถานะให้ ${selectedIds.length} รายการเรียบร้อยแล้ว`);
      clearSelection();
    } catch (err) {
      alert('อัปเดตสถานะล้มเหลว: ' + (err.response?.data?.message || err.message));
    }
  };

  const openBatchMenu = (event) => setBatchMenuAnchor(event.currentTarget);
  const closeBatchMenu = () => setBatchMenuAnchor(null);

  const handleStartApproveWizard = () => {
    closeBatchMenu();
    if (selectedIds.length === 0) return;
    setApproveWizard({ open: true, queue: [...selectedIds], index: 0, file: null, submitting: false, error: '' });
  };

  const handleWizardFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setApproveWizard((prev) => ({ ...prev, error: 'รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG เท่านั้น', file: null }));
      event.target.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setApproveWizard((prev) => ({ ...prev, error: 'ขนาดไฟล์ต้องไม่เกิน 20MB', file: null }));
      event.target.value = '';
      return;
    }
    setApproveWizard((prev) => ({ ...prev, file, error: '' }));
  };

  const handleWizardClose = () => {
    if (approveWizard.submitting) return;
    setApproveWizard({ open: false, queue: [], index: 0, file: null, submitting: false, error: '' });
  };

  const handleWizardSubmit = async () => {
    const currentId = approveWizard.queue[approveWizard.index];
    if (currentId === undefined) return;
    if (!approveWizard.file) {
      setApproveWizard((prev) => ({ ...prev, error: 'กรุณาแนบไฟล์ใบขอความอนุเคราะห์ / หนังสือส่งตัวของนักศึกษาคนนี้ก่อน' }));
      return;
    }

    setApproveWizard((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const dataUrl = await fileToDataUrl(approveWizard.file);
      await api.patch(`/requests/${currentId}/status`, {
        status: 'รอสถานประกอบการตอบรับ',
        dispatchLetter: {
          fileName: approveWizard.file.name,
          mimeType: approveWizard.file.type,
          dataUrl,
        },
      });

      const doneFileName = approveWizard.file.name;
      setAllRequests((prev) => prev.map((r) => (
        String(r.id) === String(currentId)
          ? { ...r, status: 'รอสถานประกอบการตอบรับ', dispatchLetter: { fileName: doneFileName, dataUrl } }
          : r
      )));

      const isLast = approveWizard.index + 1 >= approveWizard.queue.length;
      const total = approveWizard.queue.length;
      if (wizardFileInputRef.current) wizardFileInputRef.current.value = '';

      if (isLast) {
        setApproveWizard({ open: false, queue: [], index: 0, file: null, submitting: false, error: '' });
        alert(`อนุมัติคำร้องพร้อมแนบใบขอความอนุเคราะห์ให้ ${total} รายการเรียบร้อยแล้ว`);
        clearSelection();
      } else {
        setApproveWizard((prev) => ({ ...prev, index: prev.index + 1, file: null, submitting: false, error: '' }));
      }
    } catch (err) {
      setApproveWizard((prev) => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || err.message || 'บันทึกคำร้องล้มเหลว',
      }));
    }
  };

  const handleOpenBatchRejectModal = () => {
    closeBatchMenu();
    if (selectedIds.length === 0) return;
    setBatchRejectModal({ open: true, reason: '', submitting: false, error: '' });
  };

  const handleBatchRejectSubmit = async () => {
    const reason = batchRejectModal.reason.trim();
    if (!reason) {
      setBatchRejectModal((prev) => ({ ...prev, error: 'กรุณาระบุเหตุผลการปฏิเสธ' }));
      return;
    }
    setBatchRejectModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const ids = [...selectedIds];
      await Promise.all(ids.map((rid) => api.patch(`/requests/${rid}/status`, {
        status: 'ไม่อนุมัติ (Admin)',
        admin_comment: reason,
      })));
      setAllRequests((prev) => prev.map((r) => (
        ids.includes(r.id) ? { ...r, status: 'ไม่อนุมัติ (Admin)', admin_comment: reason } : r
      )));
      setBatchRejectModal({ open: false, reason: '', submitting: false, error: '' });
      alert(`ปฏิเสธคำร้อง ${ids.length} รายการเรียบร้อยแล้ว`);
      clearSelection();
    } catch (err) {
      setBatchRejectModal((prev) => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || err.message || 'ปฏิเสธคำร้องล้มเหลว',
      }));
    }
  };

  const handleOpenBatchDeleteModal = () => {
    closeBatchMenu();
    if (selectedIds.length === 0) return;
    setBatchDeleteModal({ open: true, submitting: false, error: '' });
  };

  const handleBatchDeleteConfirm = async () => {
    setBatchDeleteModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const ids = [...selectedIds];
      await Promise.all(ids.map((rid) => api.delete(`/requests/${rid}`)));
      setAllRequests((prev) => prev.filter((r) => !ids.includes(r.id)));
      setBatchDeleteModal({ open: false, submitting: false, error: '' });
      alert(`ลบคำร้อง ${ids.length} รายการเรียบร้อยแล้ว`);
      clearSelection();
    } catch (err) {
      setBatchDeleteModal((prev) => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || err.message || 'ลบคำร้องล้มเหลว',
      }));
    }
  };



  const wizardCurrentRequest = approveWizard.open
    ? allRequests.find((r) => String(r.id) === String(approveWizard.queue[approveWizard.index]))
    : null;

  return (
    <div className="admin-dashboard-container bg-[#f8f9fc] min-h-screen">
      <div className="mobile-top-navbar flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu"><MenuIcon className="w-5 h-5" /></button>
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
        currentPath="/admin-dashboard"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ภาพรวมระบบฝึกประสบการณ์วิชาชีพ</h1>
            <p className="text-sm text-gray-500 mt-1">ติดตาม ตรวจสอบ และจัดการกระบวนการฝึกงานของนักศึกษาแบบเรียลไทม์</p>
          </div>
          <Button
            variant="contained"
            onClick={() => setEvalRoundsModalOpen(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl inline-flex items-center gap-1.5 shadow-sm"
            sx={{ fontWeight: 600, px: 2.5, py: 1, boxShadow: 'none', textTransform: 'none' }}
          >
            <Calendar className="w-4 h-4 mr-1" />
            กำหนดรอบการประเมิน นศ.
          </Button>
        </header>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          {summaryCards.map((card) => (
            <StatCard
              key={card.key}
              title={card.label}
              value={card.value}
              icon={card.icon}
              color={card.color}
            />
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
            gap: 2,
            mb: 3,
          }}
        >
          <Paper
            elevation={0}
            className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] p-6"
            sx={{ bgcolor: '#ffffff', borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 2px 15px -3px rgba(0,0,0,0.04)' }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="h6"
                className="text-slate-900 font-extrabold text-lg md:text-xl tracking-tight"
                sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', mb: 0.5 }}
              >
                กราฟภาพรวม
              </Typography>
              <Typography variant="caption" className="text-slate-400 text-xs" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                สัดส่วนสถานะคำร้องของนักศึกษาทั้งหมดในระบบ
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
              <Box>
                {hasChartData ? (
                  <>
                    <Box sx={{ position: 'relative', height: { xs: 220, sm: 260 }, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Box ref={pieChartRef} sx={{ position: 'absolute', inset: 0 }} />
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <Typography sx={{ fontSize: '1.875rem', fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>
                          {statusCounts.total}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#9ca3af' }}>
                          คำร้องทั้งหมด
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        mt: 2.5,
                        pt: 2,
                        borderTop: '1px solid #f3f4f6',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 1,
                      }}
                    >
                      {statusChartData.map((item) => (
                        <Box
                          key={item.category}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            p: 1,
                            borderRadius: '0.75rem',
                            bgcolor: 'rgba(249, 250, 251, 0.8)',
                            transition: 'background-color 0.15s',
                            '&:hover': { bgcolor: 'rgba(245, 243, 255, 0.6)' },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                            <Box component="span" sx={{ width: 10, height: 10, borderRadius: '9999px', flexShrink: 0, bgcolor: item.color }} />
                            <Typography
                              component="span"
                              sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {item.category}
                            </Typography>
                          </Box>
                          <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827', flexShrink: 0 }}>
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      minHeight: 260,
                      borderRadius: 2,
                      border: '1px dashed #d1d5db',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      fontSize: 14,
                      fontWeight: 500,
                      background: '#f8fafc',
                    }}
                  >
                    ยังไม่มีข้อมูลเพียงพอสำหรับสร้างกราฟ
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>
          <Paper
            elevation={0}
            className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] p-6"
            sx={{ bgcolor: '#ffffff', borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 2px 15px -3px rgba(0,0,0,0.04)', height: '100%' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}>
              <div>
                <Typography
                  variant="h6"
                  className="text-slate-900 font-extrabold text-lg md:text-xl tracking-tight"
                  sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', mb: 0.5 }}
                >
                  คำร้องล่าสุด 5 รายการ
                </Typography>
                <Typography variant="caption" className="text-slate-400 text-xs" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  รายการคำร้องที่ส่งเข้ามาล่าสุด
                </Typography>
              </div>
            </Box>
          <TableContainer component={Box} className="compact-table rounded-xl overflow-hidden border border-slate-100 bg-white">
            <Table size="small">
              <TableHead className="bg-slate-50/80 border-b border-slate-100">
                <TableRow>
                  <TableCell sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', py: 1.25 }}>วันที่</TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', py: 1.25 }}>รหัสนักศึกษา</TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', py: 1.25 }}>ชื่อ-นามสกุล</TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', py: 1.25 }}>บริษัท</TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', py: 1.25 }}>สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody className="bg-white">
                {latestRequests.map((request) => {
                  return (
                    <TableRow key={`recent-${request.id}`} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell sx={{ color: '#334155', borderBottom: '1px solid #f1f5f9', py: 1.5, fontSize: '0.8125rem' }}>{new Date(request.submittedDate).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell sx={{ color: '#334155', borderBottom: '1px solid #f1f5f9', py: 1.5, fontSize: '0.8125rem', fontWeight: 500 }}>{request.studentId}</TableCell>
                      <TableCell sx={{ color: '#334155', borderBottom: '1px solid #f1f5f9', py: 1.5, fontSize: '0.8125rem', fontWeight: 500 }}>{request.studentName}</TableCell>
                      <TableCell sx={{ color: '#334155', borderBottom: '1px solid #f1f5f9', py: 1.5, fontSize: '0.8125rem' }}>{request.company}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #f1f5f9', py: 1.5 }}>
                        <StatusBadge status={request.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {latestRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#94a3b8', fontSize: '0.875rem' }}>ไม่มีข้อมูล</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        </Box>

        <Paper id="all-requests" className="bg-white border border-slate-100 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] p-6" elevation={0} sx={{ width: '100%', scrollMarginTop: 80, bgcolor: '#ffffff', borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 2px 15px -3px rgba(0,0,0,0.04)' }}>
          <div className="section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
            <div className="w-full flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-slate-900 font-extrabold text-lg md:text-xl tracking-tight mb-1" style={{ margin: 0 }}>
                  คำร้องทั้งหมด
                </h2>
                <p className="text-slate-400 text-xs">
                  จัดการและตรวจสอบข้อมูลคำร้องฝึกงานของนักศึกษาทั้งหมดในระบบ
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin-dashboard/requests')}
                className="shrink-0 flex items-center gap-0.5 text-violet-600 hover:text-violet-700 font-semibold text-xs transition cursor-pointer border-none bg-transparent py-1"
              >
                ดูทั้งหมด
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <TextField
              select
              size="small"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl focus:bg-white focus:border-violet-500"
              sx={{
                minWidth: { xs: '100%', sm: '220px' },
                '& .MuiOutlinedInput-root': {
                  borderRadius: '0.75rem',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.8125rem',
                  color: '#334155',
                  transition: 'all 0.2s ease',
                  '& fieldset': { borderColor: '#e2e8f0' },
                  '&:hover fieldset': { borderColor: '#cbd5e1' },
                  '&.Mui-focused': {
                    backgroundColor: '#ffffff',
                    '& fieldset': { borderColor: '#8b5cf6', borderWidth: '1px' },
                  },
                },
              }}
              SelectProps={{
                MenuProps: {
                  PaperProps: {
                    sx: {
                      maxHeight: 300,
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    }
                  }
                }
              }}
            >
              <MenuItem value="all" sx={{ fontSize: '0.8125rem' }}>ทั้งหมด</MenuItem>
              <MenuItem value="pending_admin" sx={{ fontSize: '0.8125rem' }}>รอตรวจสอบ</MenuItem>
              <MenuItem value="รอสถานประกอบการตอบรับ" sx={{ fontSize: '0.8125rem' }}>รอสถานประกอบการ</MenuItem>
              <MenuItem value="approved" sx={{ fontSize: '0.8125rem' }}>อนุมัติแล้ว</MenuItem>
              <MenuItem value="rejected" sx={{ fontSize: '0.8125rem' }}>ไม่อนุมัติ</MenuItem>
            </TextField>

          <div className="w-full bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {selectedIds.length === 0 ? (
                <span className="text-xs text-slate-500 font-medium">
                  ระบบจัดการคำร้องแบบกลุ่ม — กรุณาเลือกรายชื่อนักศึกษาจากตารางเพื่อดำเนินการ
                </span>
              ) : (
                <span className="text-xs font-semibold text-violet-700 bg-violet-100/80 px-2.5 py-1 rounded-lg">
                  เลือกคำร้องทั้งหมด {selectedIds.length} รายการ
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={openBatchMenu}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: selectedIds.length === 0 ? undefined : '#7c3aed' }}
              >
                เลือกการดำเนินการแบบกลุ่ม
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={selectedIds.length === 0}
                className="text-xs font-medium px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white transition cursor-pointer bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ล้างการเลือก
              </button>
            </div>
            <Menu
              anchorEl={batchMenuAnchor}
              open={Boolean(batchMenuAnchor)}
              onClose={closeBatchMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                className: 'rounded-xl shadow-xl border border-slate-100',
                sx: { mt: 1, minWidth: 260, borderRadius: '0.75rem' },
              }}
            >
              <MenuItem onClick={() => { closeBatchMenu(); handleOpenBatchDateModal(); }} sx={{ gap: 1.25, fontSize: '0.8125rem', py: 1.1 }}>
                <Calendar className="w-4 h-4 text-violet-500 shrink-0" />
                กำหนดวันฝึกงานพร้อมกัน
              </MenuItem>
              <MenuItem onClick={handleStartApproveWizard} sx={{ gap: 1.25, fontSize: '0.8125rem', py: 1.1 }}>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                อนุมัติคำร้องและแนบใบขอความอนุเคราะห์
              </MenuItem>
              <MenuItem onClick={() => { closeBatchMenu(); handleBatchStartInternship(); }} sx={{ gap: 1.25, fontSize: '0.8125rem', py: 1.1 }}>
                <Check className="w-4 h-4 text-violet-500 shrink-0" />
                เปลี่ยนสถานะเป็นเริ่มฝึกงาน
              </MenuItem>
              <MenuItem onClick={handleOpenBatchRejectModal} sx={{ gap: 1.25, fontSize: '0.8125rem', py: 1.1, color: '#ea580c' }}>
                <XCircle className="w-4 h-4 text-orange-500 shrink-0" />
                ปฏิเสธคำร้องที่เลือก
              </MenuItem>
              <MenuItem onClick={handleOpenBatchDeleteModal} sx={{ gap: 1.25, fontSize: '0.8125rem', py: 1.1, color: '#e11d48' }}>
                <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                ลบรายการคำร้องที่เลือก
              </MenuItem>
            </Menu>
          </div>
          </div>

          <TableContainer component={Box} className="compact-table rounded-xl overflow-hidden border border-slate-100 bg-white">
            <Table size="small">
              <TableHead className="bg-slate-50/80 border-b border-slate-100">
                <TableRow>
                  <TableCell padding="checkbox" sx={{ borderBottom: '1px solid #f1f5f9' }}>
                    <Checkbox
                      size="small"
                      indeterminate={selectedIds.length > 0 && selectedIds.length < sortedRequests.length}
                      checked={sortedRequests.length > 0 && selectedIds.length === sortedRequests.length}
                      onChange={toggleSelectAll}
                      sx={{ color: '#cbd5e1', '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#7c3aed' } }}
                    />
                  </TableCell>
                  <TableCell className="sortable" onClick={() => toggleSort('studentId')} sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', py: 1.25 }}>
                    รหัสนักศึกษา {sortBy === 'studentId' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell className="sortable" onClick={() => toggleSort('studentName')} sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', py: 1.25 }}>
                    ชื่อ-นามสกุล {sortBy === 'studentName' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell className="sortable" onClick={() => toggleSort('department')} sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', py: 1.25 }}>
                    สาขา {sortBy === 'department' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell className="sortable" onClick={() => toggleSort('company')} sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', py: 1.25 }}>
                    บริษัท {sortBy === 'company' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell className="sortable" onClick={() => toggleSort('submittedDate')} sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', py: 1.25 }}>
                    วันที่ยื่น {sortBy === 'submittedDate' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell className="sortable" onClick={() => toggleSort('status')} sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', py: 1.25 }}>
                    สถานะ {sortBy === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </TableCell>
                  <TableCell align="center" sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', py: 1.25 }}>
                    จัดการ
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody className="bg-white">
                {sortedRequests.map((request) => {
                  return (
                    <TableRow key={request.id} hover selected={isRowSelected(request.id)} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell padding="checkbox" sx={{ borderBottom: '1px solid #f1f5f9' }}>
                        <Checkbox
                          size="small"
                          checked={isRowSelected(request.id)}
                          onChange={() => toggleSelectOne(request.id)}
                          sx={{ color: '#cbd5e1', '&.Mui-checked': { color: '#7c3aed' } }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#334155', borderBottom: '1px solid #f1f5f9', py: 1.5, fontSize: '0.8125rem', fontWeight: 500 }}>{request.studentId}</TableCell>
                      <TableCell sx={{ color: '#334155', borderBottom: '1px solid #f1f5f9', py: 1.5, fontSize: '0.8125rem', fontWeight: 500 }}>{request.studentName}</TableCell>
                      <TableCell sx={{ color: '#334155', borderBottom: '1px solid #f1f5f9', py: 1.5, fontSize: '0.8125rem' }}>{request.department}</TableCell>
                      <TableCell sx={{ color: '#334155', borderBottom: '1px solid #f1f5f9', py: 1.5, fontSize: '0.8125rem' }}>
                        <div className="font-medium text-slate-800">{request.company}</div>
                        {(request.internship_start_date || request.details?.startDate) ? (
                          <div style={{ fontSize: '0.74rem', color: '#6d28d9', fontWeight: 500, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CalendarIcon style={{ width: 14, height: 14 }} />
                            <span>{formatDateThai(request.internship_start_date || request.details?.startDate)} - {formatDateThai(request.internship_end_date || request.details?.endDate)}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px' }}>ยังไม่กำหนดวันฝึก</div>
                        )}
                      </TableCell>
                      <TableCell sx={{ color: '#334155', borderBottom: '1px solid #f1f5f9', py: 1.5, fontSize: '0.8125rem' }}>{new Date(request.submittedDate).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #f1f5f9', py: 1.5 }}>
                        {(() => {
                          const effectiveStatus = getEffectiveInternshipStatus(request);
                          return (
                            <>
                              <StatusBadge status={effectiveStatus} />
                              {isCompanyAcceptedStatus(request.status) && (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAdminScheduleAndDispatchModal(request)}
                                    className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition cursor-pointer shadow-2xs"
                                    title="กำหนดวันฝึกและแนบหนังสือส่งตัวให้นักศึกษา"
                                  >
                                    <Calendar size={13} className="text-violet-600" />
                                    <FileUp size={13} className="text-violet-600" />
                                    <span>กำหนดวันและแนบใบส่งตัว</span>
                                  </button>
                                </div>
                              )}
                              {(effectiveStatus === 'ออกฝึกงาน' || effectiveStatus === 'กำลังออกฝึกงาน' || effectiveStatus === 'สิ้นสุดการฝึกงาน (รอประเมิน)' || effectiveStatus === 'ประเมินเสร็จแล้ว' || effectiveStatus === 'ฝึกงานเสร็จแล้ว') && (
                                <div style={{ marginTop: '8px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px', fontWeight: 500 }}>
                                  {request.hasCompanyEval ? 
                                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> บริษัทประเมินแล้ว</span> : 
                                    <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}><ClockIcon style={{width: 16, height: 16}}/> บริษัทกำลังประเมิน</span>}
                                  {request.hasAdvisorEval ? 
                                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> อาจารย์ประเมินแล้ว</span> : 
                                    <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}><ClockIcon style={{width: 16, height: 16}}/> อาจารย์กำลังประเมิน</span>}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </TableCell>
                      <TableCell align="center" sx={{ borderBottom: '1px solid #f1f5f9', py: 1.5 }}>
                        <RequestActionsMenu
                          request={request}
                          onView={(target) => navigate(`/dashboard/request/${target.id}`)}
                          onEdit={handleOpenEditModal}
                          onApprove={(target) => {
                            if (target.status === 'รอผู้ดูแลระบบตรวจสอบ' || target.status === 'รอผู้ดูแลระบบอนุมัติ') {
                              handleApprove(target.id);
                            } else {
                              handleApproveStartInternship(target.id);
                            }
                          }}
                          onReject={(target) => handleReject(target.id)}
                          onSchedule={handleOpenScheduleModal}
                          onScheduleAndDispatch={handleOpenAdminScheduleAndDispatchModal}
                          onDelete={openDeleteModal}
                          onOpenQr={(target) => handleOpenResponseQr(target.id, target)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sortedRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94a3b8', fontSize: '0.875rem' }}>ไม่มีข้อมูล</TableCell>
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
            minRows={4}
            label="เหตุผล"
            value={rejectModal.reason}
            onChange={(event) => setRejectModal((prev) => ({ ...prev, reason: event.target.value }))}
            placeholder="กรอกเหตุผลที่ไม่อนุมัติ"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={handleRejectClose}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleRejectConfirm} sx={{ bgcolor: '#111111', '&:hover': { bgcolor: '#000000' } }}>
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>

      {/* Admin Edit Request Modal */}
      <Dialog
        open={editModal.open}
        onClose={handleCloseEditModal}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
            boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ px: 3, py: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.15rem' }}>
              แก้ไขข้อมูลคำร้อง
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.85rem', mt: 0.25 }}>
              จัดการข้อมูลสถานประกอบการ ผู้ควบคุมงาน และ Email ผู้ประเมิน
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleCloseEditModal} disabled={editModal.submitting} sx={{ color: '#94a3b8', '&:hover': { color: '#475569' } }}>
            <XMarkIcon style={{ width: 20, height: 20 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {editModal.error && (
            <Box sx={{ mb: 2.5, p: 1.5, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', fontSize: '0.875rem' }}>
              {editModal.error}
            </Box>
          )}

          {/* Student Info Card (Slate Muted) */}
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
              ข้อมูลนักศึกษา
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
              <TextField
                size="small"
                label="รหัสนักศึกษา"
                value={editModal.formData.studentId}
                disabled
                sx={{ bgcolor: '#ffffff' }}
              />
              <TextField
                size="small"
                label="ชื่อ-นามสกุล"
                value={editModal.formData.studentName}
                disabled
                sx={{ bgcolor: '#ffffff' }}
              />
              <TextField
                size="small"
                label="สาขาวิชา"
                value={editModal.formData.department}
                disabled
                sx={{ bgcolor: '#ffffff' }}
              />
            </Box>
          </Box>

          {/* Company & Position Info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155', mb: 1.5, fontSize: '0.9rem' }}>
              ข้อมูลสถานประกอบการและตำแหน่งงาน
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                required
                fullWidth
                size="small"
                label="ชื่อสถานประกอบการ / บริษัท"
                value={editModal.formData.company}
                onChange={(e) => handleEditModalChange('company', e.target.value)}
                placeholder="เช่น บริษัท เอบีซี จำกัด"
              />
              <TextField
                fullWidth
                size="small"
                label="ตำแหน่งงาน"
                value={editModal.formData.position}
                onChange={(e) => handleEditModalChange('position', e.target.value)}
                placeholder="เช่น Web Developer Trainee"
              />
            </Box>

            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500, display: 'block', mb: 1 }}>
              ที่อยู่สถานประกอบการ
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1.5, mb: 1.5 }}>
              <TextField
                size="small"
                label="เลขที่"
                value={editModal.formData.companyHouse}
                onChange={(e) => handleEditModalChange('companyHouse', e.target.value)}
              />
              <TextField
                size="small"
                label="หมู่ที่"
                value={editModal.formData.companyMoo}
                onChange={(e) => handleEditModalChange('companyMoo', e.target.value)}
              />
              <TextField
                size="small"
                label="ตำบล/แขวง"
                value={editModal.formData.companyTambon}
                onChange={(e) => handleEditModalChange('companyTambon', e.target.value)}
              />
              <TextField
                size="small"
                label="อำเภอ/เขต"
                value={editModal.formData.companyAmphur}
                onChange={(e) => handleEditModalChange('companyAmphur', e.target.value)}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr' }, gap: 1.5 }}>
              <TextField
                size="small"
                label="จังหวัด"
                value={editModal.formData.companyProvince}
                onChange={(e) => handleEditModalChange('companyProvince', e.target.value)}
              />
              <TextField
                size="small"
                label="รหัสไปรษณีย์"
                value={editModal.formData.companyPostal}
                onChange={(e) => handleEditModalChange('companyPostal', e.target.value)}
              />
            </Box>
          </Box>

          {/* Supervisor / Coordinator Info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155', mb: 1.5, fontSize: '0.9rem' }}>
              ข้อมูลผู้ควบคุมงาน / พี่เลี้ยง
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                label="ชื่อผู้ควบคุมงาน / พี่เลี้ยง"
                value={editModal.formData.supervisor}
                onChange={(e) => handleEditModalChange('supervisor', e.target.value)}
              />
              <TextField
                fullWidth
                size="small"
                label="ตำแหน่งผู้ควบคุมงาน"
                value={editModal.formData.supervisorPosition}
                onChange={(e) => handleEditModalChange('supervisorPosition', e.target.value)}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="เบอร์โทรศัพท์ผู้ควบคุมงาน"
                value={editModal.formData.supervisorPhone}
                onChange={(e) => handleEditModalChange('supervisorPhone', e.target.value)}
              />
              <TextField
                fullWidth
                size="small"
                label="อีเมลผู้ควบคุมงาน"
                value={editModal.formData.supervisorEmail}
                onChange={(e) => handleEditModalChange('supervisorEmail', e.target.value)}
              />
            </Box>
          </Box>

          {/* Evaluator Email Section - Highlighted in Violet Theme */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: '12px',
              bgcolor: '#faf5ff',
              border: '1.5px solid #d8b4fe',
              mb: 3
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#6b21a8', fontSize: '0.9rem' }}>
                Email ผู้ประเมินผลการฝึกงาน (สถานประกอบการ)
              </Typography>
              <Chip size="small" label="จำเป็นสำหรับการส่งแบบประเมิน" sx={{ bgcolor: '#f3e8ff', color: '#7e22ce', fontWeight: 600, fontSize: '0.72rem' }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#7e22ce', fontSize: '0.825rem', mb: 1.5 }}>
              ระบบจะใช้อีเมลนี้ในการจัดส่งลิงก์แบบประเมินผลการฝึกงานไปยังสถานประกอบการโดยอัตโนมัติ
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="email"
              placeholder="evaluator@company.com"
              value={editModal.formData.evaluator_email}
              onChange={(e) => handleEditModalChange('evaluator_email', e.target.value)}
              sx={{
                bgcolor: '#ffffff',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  '& fieldset': { borderColor: '#d8b4fe' },
                  '&:hover fieldset': { borderColor: '#a855f7' },
                  '&.Mui-focused fieldset': { borderColor: '#7c3aed' },
                }
              }}
            />
          </Box>

          {/* Internship Period */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155', mb: 1.5, fontSize: '0.9rem' }}>
              ช่วงเวลาการฝึกงาน
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="วันเริ่มต้นฝึกงาน"
                value={editModal.formData.internship_start_date}
                onChange={(e) => handleEditModalChange('internship_start_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                size="small"
                type="date"
                label="วันสิ้นสุดฝึกงาน"
                value={editModal.formData.internship_end_date}
                onChange={(e) => handleEditModalChange('internship_end_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={handleCloseEditModal}
            disabled={editModal.submitting}
            sx={{
              borderRadius: '10px',
              borderColor: '#cbd5e1',
              color: '#475569',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' }
            }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEditRequest}
            disabled={editModal.submitting}
            sx={{
              borderRadius: '10px',
              bgcolor: '#7c3aed',
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.2)',
              '&:hover': { bgcolor: '#6d28d9' }
            }}
          >
            {editModal.submitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Dispatch Letter Modal */}
      <Dialog 
        open={dispatchModal.open} 
        onClose={handleDispatchModalClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          className: "rounded-[24px] sm:rounded-[28px] bg-white shadow-[0_20px_50px_rgba(124,58,237,0.08)] border border-violet-100/60 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden",
          sx: {
            borderRadius: '24px',
            bgcolor: '#ffffff',
            boxShadow: '0 20px 50px rgba(124,58,237,0.08)',
            border: '1px solid rgba(237, 233, 254, 0.6)',
            maxWidth: '32rem',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }
        }}
      >
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5 custom-scrollbar min-w-0 break-words [overflow-wrap:anywhere]">
          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 border border-violet-100/60">
              <FileText className="w-4 h-4 text-violet-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight m-0 truncate">
                หนังสือขอความอนุเคราะห์ขอฝึกประสบการณ์
              </h3>
            </div>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-500 font-normal leading-relaxed m-0">
            กรุณาอัปโหลดไฟล์หนังสือขอความอนุเคราะห์ (PDF, JPG หรือ PNG) และสามารถระบุข้อความ/หมายเหตุเพิ่มเติมถึงนักศึกษาได้
          </p>

          {/* Textarea */}
          <div className="w-full min-w-0">
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1.5">
              ข้อความเพิ่มเติม / หมายเหตุถึงนักศึกษา (ถ้ามี)
            </label>
            <textarea
              rows={2}
              placeholder="เช่น ให้นักศึกษานำรูปถ่าย 2 นิ้ว 2 ใบมาเพิ่ม หรือรายละเอียดวันเวลารับเอกสารเพิ่มเติม"
              value={dispatchModal.comment || ''}
              onChange={(e) => setDispatchModal((prev) => ({ ...prev, comment: e.target.value }))}
              className="w-full box-border rounded-xl text-[11px] sm:text-xs p-2.5 h-14 sm:h-16 resize-none border border-slate-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-300 transition placeholder:text-slate-400 text-slate-800 bg-white"
            />
          </div>

          {dispatchModal.targetStatus === 'ออกฝึกงาน' && (
            <div className="p-3 bg-violet-50/50 rounded-xl border border-violet-100 min-w-0">
              <div className="text-[11px] sm:text-xs font-semibold text-violet-800 mb-2 flex items-center gap-1.5">
                <CalendarIcon style={{ width: 14, height: 14 }} />
                <span>ตรวจสอบ / กำหนดวันฝึกงานจริง</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="min-w-0">
                  <label className="block text-[10px] sm:text-[11px] font-medium text-slate-600 mb-1">วันเริ่มต้นฝึกงาน</label>
                  <input
                    type="date"
                    value={dispatchModal.startDate || ''}
                    onChange={(e) => setDispatchModal(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full box-border h-9 sm:h-10 text-[11px] sm:text-xs rounded-xl border border-slate-200 px-2.5 bg-white text-slate-700 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[10px] sm:text-[11px] font-medium text-slate-600 mb-1">วันสิ้นสุดฝึกงาน</label>
                  <input
                    type="date"
                    value={dispatchModal.endDate || ''}
                    onChange={(e) => setDispatchModal(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full box-border h-9 sm:h-10 text-[11px] sm:text-xs rounded-xl border border-slate-200 px-2.5 bg-white text-slate-700 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="w-full min-w-0">
            <label className="border border-dashed border-violet-300 hover:bg-violet-50/50 text-violet-700 rounded-xl py-2.5 px-3 text-[11px] sm:text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer w-full box-border">
              <ArrowDownTrayIcon className="w-4 h-4 text-violet-600 shrink-0" style={{ transform: 'rotate(180deg)' }} />
              <span className="truncate">เลือกไฟล์หนังสือขอความอนุเคราะห์</span>
              <input
                ref={dispatchFileInputRef}
                type="file"
                hidden
                accept="application/pdf,image/jpeg,image/png,image/jpg"
                onChange={handleDispatchFileChange}
              />
            </label>
          </div>

          {dispatchModal.file && (
            <div className="text-[11px] sm:text-xs text-emerald-600 font-semibold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 truncate">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">ไฟล์ที่เลือก: <strong>{dispatchModal.file.name}</strong></span>
            </div>
          )}

          {dispatchModal.error && (
            <div className="text-[11px] sm:text-xs text-rose-600 font-medium bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 break-words">
              {dispatchModal.error}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2.5 pb-3 px-4 sm:px-6 border-t border-slate-100 bg-white flex flex-col-reverse xs:flex-row items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDispatchModalClose}
            disabled={dispatchModal.submitting}
            className="w-full xs:w-auto py-2 px-3 text-[11px] sm:text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer border-none bg-transparent"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleDispatchSubmit}
            disabled={dispatchModal.submitting}
            className="w-full xs:w-auto py-2 px-3.5 text-[11px] sm:text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-xs whitespace-nowrap transition cursor-pointer border-none flex items-center justify-center gap-1.5"
            style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
          >
            {dispatchModal.submitting ? 'กำลังอัปโหลด...' : 'แนบไฟล์และอนุมัติ'}
          </button>
        </div>
      </Dialog>

      {/* Schedule Internship Dates Modal */}
      <Dialog 
        open={scheduleModal.open} 
        onClose={() => !scheduleModal.submitting && setScheduleModal(prev => ({ ...prev, open: false }))} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Calendar className="w-5 h-5 text-violet-600 stroke-[2.2]" /> กำหนดวันฝึกงาน (สำหรับ Admin)
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Box sx={{ mb: 2.5, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
              นักศึกษา: {scheduleModal.studentName} ({scheduleModal.studentId})
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              สถานประกอบการ: {scheduleModal.company}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748b', mb: 1, display: 'block', fontWeight: 600 }}>
              ปุ่มลัดเลือกช่วงเวลา (Presets):
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const y = new Date().getFullYear();
                  setScheduleModal(prev => ({
                    ...prev,
                    internshipTerm: 'ภาคการศึกษาที่ 1',
                    startDate: `${y}-06-01`,
                    endDate: `${y}-10-31`
                  }));
                }}
                sx={{ textTransform: 'none', fontSize: '0.8rem' }}
              >
                เทอม 1 (1 มิ.ย. - 31 ต.ค.)
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const y = new Date().getFullYear();
                  setScheduleModal(prev => ({
                    ...prev,
                    internshipTerm: 'ภาคการศึกษาที่ 2',
                    startDate: `${y}-11-01`,
                    endDate: `${y + 1}-03-31`
                  }));
                }}
                sx={{ textTransform: 'none', fontSize: '0.8rem' }}
              >
                เทอม 2 (1 พ.ย. - 31 มี.ค.)
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const y = new Date().getFullYear();
                  setScheduleModal(prev => ({
                    ...prev,
                    internshipTerm: 'ภาคฤดูร้อน',
                    startDate: `${y}-04-01`,
                    endDate: `${y}-05-31`
                  }));
                }}
                sx={{ textTransform: 'none', fontSize: '0.8rem' }}
              >
                ภาคฤดูร้อน (1 เม.ย. - 31 พ.ค.)
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="วันเริ่มต้นฝึกงาน *"
              value={scheduleModal.startDate || ''}
              onChange={(e) => setScheduleModal(prev => ({ ...prev, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth
              size="small"
              type="date"
              label="วันสิ้นสุดการฝึกงาน *"
              value={scheduleModal.endDate || ''}
              onChange={(e) => setScheduleModal(prev => ({ ...prev, endDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Box>

          <TextField
            fullWidth
            size="small"
            label="ภาคการศึกษา / ช่วงฝึกงาน"
            placeholder="เช่น ภาคการศึกษาที่ 1/2569 หรือ เทอม 1"
            value={scheduleModal.internshipTerm || ''}
            onChange={(e) => setScheduleModal(prev => ({ ...prev, internshipTerm: e.target.value }))}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            label="หมายเหตุเพิ่มเติม (ถ้ามี)"
            placeholder="เช่น เงื่อนไขการนับชั่วโมงฝึกงาน หรือหมายเหตุเกี่ยวกับวันฝึก"
            value={scheduleModal.note || ''}
            onChange={(e) => setScheduleModal(prev => ({ ...prev, note: e.target.value }))}
          />

          {scheduleModal.error && (
            <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
              {scheduleModal.error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setScheduleModal(prev => ({ ...prev, open: false }))} 
            disabled={scheduleModal.submitting}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={handleScheduleSubmit}
            disabled={scheduleModal.submitting}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' } }}
          >
            {scheduleModal.submitting ? 'กำลังบันทึก...' : 'บันทึกวันฝึกงาน'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch Date Modal — กำหนดวันฝึกงานให้หลายคำร้องพร้อมกัน */}
      <Dialog
        open={batchDateModal.open}
        onClose={() => !batchDateModal.submitting && setBatchDateModal(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            border: '1px solid rgba(237, 233, 254, 0.8)',
            boxShadow: '0 20px 60px rgba(124,58,237,0.12)',
            m: 2,
          },
        }}
      >
        <div className="bg-white rounded-[24px] p-6 sm:p-7 w-full">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 border border-violet-100/80 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-violet-600 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-800 m-0 flex items-center flex-wrap">
                กำหนดระยะเวลาฝึกงาน
                <span className="bg-violet-50 text-violet-700 text-xs font-semibold px-2 py-0.5 rounded-lg ml-2">
                  {selectedIds.length} รายการ
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed m-0">
                วันที่ที่ระบุจะมีผลบังคับใช้กับคำร้องของนักศึกษาที่เลือกไว้ทั้งหมดพร้อมกัน
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                วันเริ่มต้นฝึกงาน <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={batchDateModal.startDate || ''}
                onChange={(e) => setBatchDateModal(prev => ({ ...prev, startDate: e.target.value, error: '' }))}
                className="w-full box-border h-11 px-3.5 text-xs text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                วันสิ้นสุดการฝึกงาน <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={batchDateModal.endDate || ''}
                onChange={(e) => setBatchDateModal(prev => ({ ...prev, endDate: e.target.value, error: '' }))}
                className="w-full box-border h-11 px-3.5 text-xs text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition"
              />
            </div>
          </div>

          {batchDateModal.error && (
            <div className="mb-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
              {batchDateModal.error}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setBatchDateModal(prev => ({ ...prev, open: false }))}
              disabled={batchDateModal.submitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer bg-transparent disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleBatchDateSubmit}
              disabled={batchDateModal.submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-[0_4px_14px_rgba(124,58,237,0.25)] transition cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
            >
              {batchDateModal.submitting ? 'กำลังบันทึก...' : 'บันทึกวันฝึกงาน'}
            </button>
          </div>
        </div>
      </Dialog>

      {/* QR Code Modal ตอบรับล่วงหน้า */}
      <Dialog 
        open={qrModal.open} 
        onClose={handleCloseQrModal} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          className: "rounded-[28px] bg-white shadow-[0_20px_50px_rgba(124,58,237,0.08)] border border-violet-100/60 max-w-sm w-full mx-auto",
          sx: {
            borderRadius: '28px',
            bgcolor: '#ffffff',
            boxShadow: '0 20px 50px rgba(124,58,237,0.08)',
            border: '1px solid rgba(237, 233, 254, 0.6)',
            maxWidth: '24rem',
            width: '100%',
            overflow: 'hidden',
            p: 0,
            m: 2
          }
        }}
      >
        <div className="p-6">
          {/* 1. ส่วนหัวเรื่อง */}
          <div className="w-10 h-10 bg-violet-50 border border-violet-100/80 rounded-xl mx-auto mb-2 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-violet-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900 text-center mb-1 m-0">
            {qrModal.request?.status === 'รอสถานประกอบการตอบรับ' ? 'คำร้องอนุมัติแล้ว' : 'QR Code ตอบรับล่วงหน้า'}
          </h3>
          <p className="text-xs text-slate-500 text-center mb-4 mt-0.5">
            ใช้สำหรับให้สถานประกอบการสแกนเพื่อตอบรับนักศึกษา
          </p>

          {/* 2. การ์ดข้อมูลนักศึกษา */}
          {qrModal.request && (
            <div className="bg-violet-50/50 border border-violet-100/80 rounded-2xl p-3 text-center mb-4">
              <div className="text-xs font-bold text-violet-950">
                {qrModal.request.studentId ? `${qrModal.request.studentId} ` : ''}{qrModal.request.studentName || ''}
              </div>
              {qrModal.request.company && (
                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  {qrModal.request.company}
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {qrModal.loading && (
            <div className="flex items-center justify-center py-8">
              <CircularProgress size={32} sx={{ color: '#7c3aed' }} />
            </div>
          )}

          {/* Error State */}
          {qrModal.error && (
            <div className="mb-4 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center">
              {qrModal.error}
            </div>
          )}

          {!qrModal.loading && !qrModal.error && qrModal.link && (
            <>
              {/* 3. กรอบแสดงภาพ QR Code */}
              <div className="bg-white p-3 rounded-2xl border border-violet-100 shadow-xs flex items-center justify-center mx-auto mb-4 w-fit">
                <QRCodeCanvas ref={qrCanvasRef} value={qrModal.link} size={170} level="H" marginSize={1} />
              </div>

              {/* 4. ช่องลิงก์แบบ Read-only (แสดง URL แบบสั้น ไม่เปิดเผย Token) + ปุ่มคัดลอก/ทดสอบ */}
              <div className="mb-3 text-left">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  ลิงก์ตอบรับสำหรับสถานประกอบการ
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/coop/public/response/${qrModal.requestId}`}
                    onFocus={(e) => e.target.select()}
                    className="w-full box-border text-[11px] text-slate-600 font-mono bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 outline-none select-all truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    title="คัดลอกลิงก์"
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition cursor-pointer border-none bg-transparent ${
                      qrModal.copied ? 'text-emerald-500' : 'text-violet-600 hover:bg-violet-50'
                    }`}
                  >
                    {qrModal.copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-3 rounded-xl transition cursor-pointer border-none ${
                    qrModal.copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-violet-600 hover:bg-violet-700 text-white'
                  }`}
                  style={qrModal.copied ? { backgroundColor: '#10b981', color: '#ffffff' } : { backgroundColor: '#7c3aed', color: '#ffffff' }}
                >
                  {qrModal.copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{qrModal.copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestOpenLink}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer bg-white"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>ทดสอบเปิดลิงก์</span>
                </button>
              </div>

              {/* 5. คำเตือนความปลอดภัย */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-left">
                <TriangleAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-amber-800 leading-snug m-0">
                    ผู้ที่ถือลิงก์นี้สามารถตอบรับคำร้องได้ ส่งให้เฉพาะสถานประกอบการเท่านั้น
                  </p>
                  <p className="text-[10px] text-amber-600 leading-snug m-0 mt-1">
                    ลิงก์ใช้งานได้ครั้งเดียว{qrModal.expiresAt ? ` และหมดอายุ ${new Date(qrModal.expiresAt).toLocaleString('th-TH')}` : ''}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* 5. ปุ่ม Action ด้านล่างสุด */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadQr}
              disabled={qrModal.loading || Boolean(qrModal.error) || !qrModal.link}
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs flex-1 flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer border-none disabled:opacity-50"
              style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>ดาวน์โหลด QR CODE</span>
            </button>
            <button
              type="button"
              onClick={handleCloseQrModal}
              className="border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-2.5 px-4 rounded-xl text-xs transition cursor-pointer bg-white"
              style={{ borderColor: '#e2e8f0' }}
            >
              ปิด
            </button>
          </div>
        </div>
      </Dialog>

      {/* Selective Deletion Modal */}
      <Dialog
        open={deleteModal.open}
        onClose={() => !deleteModal.submitting && setDeleteModal(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
        disableScrollLock={true}
        PaperProps={{
          sx: {
            borderRadius: { xs: 3, sm: 4 },
            overflow: 'hidden',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.12)',
            m: { xs: 1.5, sm: 2 }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', bgcolor: '#ffffff', borderBottom: '1px solid #f1f5f9', py: 2.5, px: 3, display: 'flex', alignItems: 'center', gap: 1.75 }}>
          <Box sx={{ width: 46, height: 46, borderRadius: 3, bgcolor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0, border: '1px solid #fecaca' }}>
            <TrashIcon style={{ width: 24, height: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2, fontSize: '1.15rem' }}>
              ยืนยันการลบข้อมูลคำร้อง
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
              เลือกรายการข้อมูลที่ต้องการลบออกอย่างถาวร
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: '20px !important', bgcolor: '#ffffff' }}>
          {/* Warning & Target Info Header */}
          <Box
            sx={{
              mt: 0.5,
              mb: 2.5,
              p: 2,
              borderRadius: 3,
              bgcolor: '#fff5f5',
              border: '1.5px solid #fecaca',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.25,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ExclamationTriangleIcon style={{ width: 20, height: 20, color: '#dc2626', flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#991b1b', lineHeight: 1.3 }}>
                คำเตือนความปลอดภัย: ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้ โปรดเลือกรายการที่ต้องการลบ
              </Typography>
            </Box>

            {deleteModal.targetRequest && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pt: 1, borderTop: '1px dashed #fca5a5' }}>
                <Typography variant="caption" sx={{ color: '#7f1d1d', fontWeight: 700 }}>
                  คำร้องที่เลือก:
                </Typography>
                <Box
                  sx={{
                    bgcolor: '#ffffff',
                    px: 1.25,
                    py: 0.35,
                    borderRadius: 2,
                    border: '1px solid #f87171',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    {deleteModal.targetRequest.studentId || deleteModal.targetRequest.student_code || '-'} - {deleteModal.targetRequest.studentName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                    ({deleteModal.targetRequest.company || deleteModal.targetRequest.department || '-'})
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Selective Cards */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Card 1: Requests */}
            <Paper
              elevation={0}
              onClick={() => setDeleteModal(prev => ({ ...prev, deleteRequests: !prev.deleteRequests }))}
              sx={{
                p: 1.75,
                px: 2,
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                bgcolor: deleteModal.deleteRequests ? '#ffffff' : '#f8fafc',
                border: deleteModal.deleteRequests ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                boxShadow: deleteModal.deleteRequests ? '0 4px 14px rgba(239, 68, 68, 0.12)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                <Checkbox
                  checked={deleteModal.deleteRequests}
                  onChange={(e) => {
                    e.stopPropagation();
                    setDeleteModal(prev => ({ ...prev, deleteRequests: e.target.checked }));
                  }}
                  sx={{
                    color: '#94a3b8',
                    '&.Mui-checked': { color: '#ef4444' }
                  }}
                />
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  bgcolor: deleteModal.deleteRequests ? '#eff6ff' : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  color: deleteModal.deleteRequests ? '#2563eb' : '#64748b',
                  flexShrink: 0
                }}>
                  <DocumentTextIcon style={{ width: 22, height: 22 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    ลบคำร้องขอฝึกงาน
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    คำร้องขอเข้าฝึกงาน + ผลการประเมินนิเทศงานทั้งหมด
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Card 2: Daily Checkins */}
            <Paper
              elevation={0}
              onClick={() => setDeleteModal(prev => ({ ...prev, deleteCheckins: !prev.deleteCheckins }))}
              sx={{
                p: 1.75,
                px: 2,
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                bgcolor: deleteModal.deleteCheckins ? '#ffffff' : '#f8fafc',
                border: deleteModal.deleteCheckins ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                boxShadow: deleteModal.deleteCheckins ? '0 4px 14px rgba(239, 68, 68, 0.12)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                <Checkbox
                  checked={deleteModal.deleteCheckins}
                  onChange={(e) => {
                    e.stopPropagation();
                    setDeleteModal(prev => ({ ...prev, deleteCheckins: e.target.checked }));
                  }}
                  sx={{
                    color: '#94a3b8',
                    '&.Mui-checked': { color: '#ef4444' }
                  }}
                />
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  bgcolor: deleteModal.deleteCheckins ? '#ecfdf5' : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  color: deleteModal.deleteCheckins ? '#059669' : '#64748b',
                  flexShrink: 0
                }}>
                  <CalendarIcon style={{ width: 22, height: 22 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    ลบรายงานประจำวัน
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    ประวัติการลงเวลาและบันทึกสมุดรายงานประจำวัน
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Card 3: Payment Proofs */}
            <Paper
              elevation={0}
              onClick={() => setDeleteModal(prev => ({ ...prev, deletePayments: !prev.deletePayments }))}
              sx={{
                p: 1.75,
                px: 2,
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                bgcolor: deleteModal.deletePayments ? '#ffffff' : '#f8fafc',
                border: deleteModal.deletePayments ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                boxShadow: deleteModal.deletePayments ? '0 4px 14px rgba(239, 68, 68, 0.12)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                <Checkbox
                  checked={deleteModal.deletePayments}
                  onChange={(e) => {
                    e.stopPropagation();
                    setDeleteModal(prev => ({ ...prev, deletePayments: e.target.checked }));
                  }}
                  sx={{
                    color: '#94a3b8',
                    '&.Mui-checked': { color: '#ef4444' }
                  }}
                />
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  bgcolor: deleteModal.deletePayments ? '#fef3c7' : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  color: deleteModal.deletePayments ? '#d97706' : '#64748b',
                  flexShrink: 0
                }}>
                  <CreditCardIcon style={{ width: 22, height: 22 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    ลบหลักฐานการชำระเงิน
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    สลิปโอนเงินและประวัติการชำระเงินค่าฝึกงาน
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, px: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
          <Button
            onClick={() => setDeleteModal(prev => ({ ...prev, open: false }))}
            disabled={deleteModal.submitting}
            variant="outlined"
            sx={{ borderRadius: 2.5, px: 3, fontWeight: 700, color: '#334155', borderColor: '#cbd5e1', bgcolor: '#ffffff', '&:hover': { bgcolor: '#f1f5f9' } }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmSelectiveDelete}
            startIcon={<TrashIcon style={{ width: 18, height: 18 }} />}
            disabled={deleteModal.submitting || (!deleteModal.deleteRequests && !deleteModal.deleteCheckins && !deleteModal.deletePayments)}
            sx={{
              borderRadius: 2.5,
              px: 3.5,
              py: 1,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                boxShadow: '0 6px 20px rgba(239, 68, 68, 0.45)',
              },
              '&.Mui-disabled': {
                background: '#e2e8f0',
                color: '#94a3b8',
              }
            }}
          >
            {deleteModal.submitting ? 'กำลังลบข้อมูล...' : 'ยืนยันการลบข้อมูลที่เลือก'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal กำหนดวันฝึกงานและแนบใบส่งตัวนักศึกษา (สำหรับ Admin) */}
      {adminScheduleDispatchModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto"
          onClick={handleCloseAdminScheduleAndDispatchModal}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-[24px] sm:rounded-[28px] shadow-[0_20px_50px_rgba(124,58,237,0.1)] border border-violet-100/80 flex flex-col max-h-[92vh] my-auto overflow-hidden animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between py-3 px-4 sm:px-6 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
                  <FileUp className="w-4 h-4 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 m-0 truncate">
                    กำหนดวันฝึกงานและแนบใบส่งตัว
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 m-0 mt-0.5 truncate">
                    ออกหนังสือส่งตัวและกำหนดระยะเวลาออกฝึกงานให้นักศึกษา
                  </p>
                </div>
              </div>
              <IconButton
                size="small"
                onClick={handleCloseAdminScheduleAndDispatchModal}
                disabled={adminScheduleDispatchModal.submitting}
                className="text-slate-400 hover:text-slate-600 shrink-0"
                sx={{ p: 0.5 }}
              >
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </IconButton>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5 custom-scrollbar">
              {adminScheduleDispatchModal.error && (
                <div className="text-[11px] sm:text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium break-words">
                  {adminScheduleDispatchModal.error}
                </div>
              )}

              {/* 1. สรุปสั้น: ชื่อนักศึกษา, บริษัทที่ตอบรับ, สิ่งที่บริษัทให้นักศึกษาเตรียมตัว */}
              <div className="w-full max-w-full min-w-0 break-words [overflow-wrap:anywhere] bg-violet-50/50 border border-violet-100/80 rounded-2xl p-3 sm:p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs">
                  <span className="text-slate-500 shrink-0">นักศึกษา:</span>
                  <span className="font-bold text-slate-800 text-right truncate">
                    {adminScheduleDispatchModal.studentName} ({adminScheduleDispatchModal.studentId})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs">
                  <span className="text-slate-500 shrink-0">สถานประกอบการ:</span>
                  <span className="font-semibold text-violet-700 text-right truncate">
                    {adminScheduleDispatchModal.company}
                  </span>
                </div>
                <div className="pt-2 border-t border-violet-100/60 text-[11px] sm:text-xs">
                  <span className="text-slate-500 block mb-1">สิ่งที่บริษัทให้นักศึกษาเตรียมตัว:</span>
                  <div className="bg-white/90 rounded-xl p-2 text-slate-700 font-medium border border-violet-100/60 text-[10px] sm:text-[11px] leading-snug line-clamp-2">
                    {adminScheduleDispatchModal.studentPreparation || 'ไม่มีการระบุเป็นพิเศษ'}
                  </div>
                </div>
              </div>

              {/* 2. เลือกวันออกฝึกงาน: Input ประเภท Date 2 ช่อง */}
              <div className="w-full max-w-full min-w-0">
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                  <span>กำหนดระยะเวลาออกฝึกงาน</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <label className="block text-[10px] sm:text-[11px] font-medium text-slate-500 mb-1">
                      วันเริ่มต้นฝึกงาน
                    </label>
                    <input
                      type="date"
                      value={adminScheduleDispatchModal.startDate}
                      onChange={(e) => setAdminScheduleDispatchModal(prev => ({ ...prev, startDate: e.target.value, error: '' }))}
                      className="w-full box-border h-9 sm:h-10 text-[11px] sm:text-xs px-2.5 rounded-xl border border-slate-200 focus:ring-1 focus:ring-violet-300 focus:border-violet-500 outline-none text-slate-800 bg-white"
                      required
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-[10px] sm:text-[11px] font-medium text-slate-500 mb-1">
                      วันสิ้นสุดฝึกงาน
                    </label>
                    <input
                      type="date"
                      value={adminScheduleDispatchModal.endDate}
                      onChange={(e) => setAdminScheduleDispatchModal(prev => ({ ...prev, endDate: e.target.value, error: '' }))}
                      className="w-full box-border h-9 sm:h-10 text-[11px] sm:text-xs px-2.5 rounded-xl border border-slate-200 focus:ring-1 focus:ring-violet-300 focus:border-violet-500 outline-none text-slate-800 bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 3. แนบไฟล์: "อัปโหลดหนังสือส่งตัวนักศึกษา" */}
              <div className="w-full max-w-full min-w-0">
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between gap-1 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <FileUp className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                    <span>อัปโหลดหนังสือส่งตัวนักศึกษา</span>
                    <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] font-normal text-slate-400">PDF, JPG, PNG (สูงสุด 20MB)</span>
                </label>

                <label className="w-full box-border border-2 border-dashed border-violet-200 hover:border-violet-400 bg-violet-50/20 hover:bg-violet-50/50 rounded-2xl py-2.5 px-3 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 group block">
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={handleAdminScheduleFileChange}
                  />
                  <div className="w-8 h-8 rounded-full bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center text-violet-600 transition shrink-0">
                    <FileUp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 max-w-full text-center px-1">
                    <div className="text-[11px] sm:text-xs font-semibold text-violet-700 truncate">
                      {adminScheduleDispatchModal.file ? adminScheduleDispatchModal.file.name : 'คลิกเพื่อเลือกไฟล์หนังสือส่งตัว'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {adminScheduleDispatchModal.file 
                        ? `ขนาด ${(adminScheduleDispatchModal.file.size / (1024 * 1024)).toFixed(2)} MB (คลิกเพื่อเปลี่ยนไฟล์)`
                        : 'รองรับไฟล์ PDF หรือรูปภาพเอกสาร'
                      }
                    </div>
                  </div>
                </label>
              </div>

              {/* 4. หมายเหตุเพิ่มเติมถึงนักศึกษา */}
              <div className="w-full max-w-full min-w-0">
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1.5">
                  หมายเหตุเพิ่มเติมถึงนักศึกษา (ถ้ามี)
                </label>
                <textarea
                  value={adminScheduleDispatchModal.note}
                  onChange={(e) => setAdminScheduleDispatchModal(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="เช่น ให้แต่งกายชุดนักศึกษาถูกระเบียบในวันรายงานตัว และนำหนังสือส่งตัวฉบับจริงยื่นต่อฝ่ายบุคคล"
                  className="w-full box-border rounded-xl text-[11px] sm:text-xs p-2.5 h-14 sm:h-16 resize-none border border-slate-200 focus:ring-1 focus:ring-violet-300 focus:border-violet-500 outline-none transition placeholder:text-slate-400 text-slate-800 bg-white"
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-2.5 pb-3 px-4 sm:px-6 border-t border-slate-100 bg-white flex flex-col-reverse xs:flex-row items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCloseAdminScheduleAndDispatchModal}
                disabled={adminScheduleDispatchModal.submitting}
                className="w-full xs:w-auto py-2 px-3 text-[11px] sm:text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer border-none bg-transparent"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAdminScheduleDispatchSubmit}
                disabled={adminScheduleDispatchModal.submitting}
                className="w-full xs:w-auto py-2 px-3.5 text-[11px] sm:text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-xs whitespace-nowrap transition cursor-pointer border-none flex items-center justify-center gap-1.5"
                style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
              >
                {adminScheduleDispatchModal.submitting ? 'กำลังบันทึก...' : 'บันทึกวันฝึกและแนบใบส่งตัว'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sequential Approval Wizard */}
      <Dialog
        open={approveWizard.open}
        onClose={handleWizardClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ className: 'rounded-2xl sm:rounded-3xl mx-3', sx: { borderRadius: '1.25rem' } }}
      >
        <div className="flex flex-col max-h-[90vh]">
          <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight m-0">อนุมัติคำร้องแบบต่อเนื่อง</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 m-0 mt-0.5">
                  กำลังดำเนินการ: คนที่ {approveWizard.index + 1} จาก {approveWizard.queue.length} คน
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-600 rounded-full transition-all duration-300"
                style={{ width: `${approveWizard.queue.length > 0 ? (approveWizard.index / approveWizard.queue.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 overflow-y-auto grow">
            {wizardCurrentRequest ? (
              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <div className="text-[11px] font-medium text-slate-500 mb-0.5">ชื่อ-นามสกุล</div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-800 break-words">{wizardCurrentRequest.studentName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-500 mb-0.5">รหัสนักศึกษา</div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-800">{wizardCurrentRequest.studentId || '-'}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-[11px] font-medium text-slate-500 mb-0.5">บริษัทที่ยื่นขอฝึกงาน</div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-800 break-words">{wizardCurrentRequest.company || '-'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 text-xs text-slate-500">
                ไม่พบข้อมูลคำร้องในคิว — อาจถูกลบหรือปรับสถานะไปแล้ว
              </div>
            )}

            <div className="mt-4">
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1.5">
                ใบขอความอนุเคราะห์ / หนังสือส่งตัว <span className="text-rose-500">*</span>
              </label>
              <input
                ref={wizardFileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleWizardFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => wizardFileInputRef.current?.click()}
                disabled={approveWizard.submitting}
                className={`w-full flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-5 transition cursor-pointer ${
                  approveWizard.file
                    ? 'border-violet-300 bg-violet-50/60'
                    : 'border-slate-200 bg-slate-50/60 hover:border-violet-300 hover:bg-violet-50/40'
                }`}
              >
                <FileUp className={`w-6 h-6 ${approveWizard.file ? 'text-violet-600' : 'text-slate-400'}`} />
                {approveWizard.file ? (
                  <>
                    <span className="text-xs font-semibold text-violet-700 break-all text-center">{approveWizard.file.name}</span>
                    <span className="text-[11px] text-slate-500">คลิกเพื่อเปลี่ยนไฟล์</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-semibold text-slate-600">คลิกเพื่อเลือกไฟล์สำหรับนักศึกษาคนนี้</span>
                    <span className="text-[11px] text-slate-400">PDF, JPG หรือ PNG ขนาดไม่เกิน 20MB</span>
                  </>
                )}
              </button>
            </div>

            {approveWizard.error && (
              <div className="mt-3 text-[11px] sm:text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {approveWizard.error}
              </div>
            )}
          </div>

          <div className="pt-2.5 pb-3 px-4 sm:px-6 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={handleWizardClose}
              disabled={approveWizard.submitting}
              className="w-full sm:w-auto py-2 px-3 text-[11px] sm:text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer border-none bg-transparent disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleWizardSubmit}
              disabled={approveWizard.submitting || !wizardCurrentRequest}
              className="w-full sm:w-auto py-2 px-3.5 text-[11px] sm:text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs whitespace-nowrap transition cursor-pointer border-none flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#059669', color: '#ffffff' }}
            >
              {approveWizard.submitting
                ? 'กำลังบันทึก...'
                : approveWizard.index + 1 >= approveWizard.queue.length
                  ? 'เสร็จสิ้นการอนุมัติทั้งหมด'
                  : 'บันทึกและดำเนินการคนถัดไป →'}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Batch Reject Modal */}
      <Dialog
        open={batchRejectModal.open}
        onClose={() => !batchRejectModal.submitting && setBatchRejectModal({ open: false, reason: '', submitting: false, error: '' })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ className: 'rounded-2xl sm:rounded-3xl mx-3', sx: { borderRadius: '1.25rem' } }}
      >
        <div className="flex flex-col max-h-[90vh]">
          <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-50 text-orange-500 shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight m-0">ปฏิเสธคำร้องที่เลือก</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 m-0 mt-0.5">
                  {selectedIds.length} รายการจะถูกปรับสถานะเป็น "ไม่อนุมัติ (Admin)"
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 overflow-y-auto grow">
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1.5">
              เหตุผลการปฏิเสธ <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={batchRejectModal.reason}
              onChange={(e) => setBatchRejectModal((prev) => ({ ...prev, reason: e.target.value, error: '' }))}
              placeholder="ระบุเหตุผลที่จะแจ้งให้นักศึกษาทราบ เช่น เอกสารไม่ครบถ้วน สถานประกอบการไม่รับนักศึกษา..."
              className="w-full box-border rounded-xl text-[11px] sm:text-xs p-2.5 h-24 resize-none border border-slate-200 focus:ring-1 focus:ring-orange-300 focus:border-orange-400 outline-none transition placeholder:text-slate-400 text-slate-800 bg-white"
            />
            {batchRejectModal.error && (
              <div className="mt-3 text-[11px] sm:text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {batchRejectModal.error}
              </div>
            )}
          </div>

          <div className="pt-2.5 pb-3 px-4 sm:px-6 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setBatchRejectModal({ open: false, reason: '', submitting: false, error: '' })}
              disabled={batchRejectModal.submitting}
              className="w-full sm:w-auto py-2 px-3 text-[11px] sm:text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer border-none bg-transparent disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleBatchRejectSubmit}
              disabled={batchRejectModal.submitting}
              className="w-full sm:w-auto py-2 px-3.5 text-[11px] sm:text-xs font-semibold rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-xs whitespace-nowrap transition cursor-pointer border-none flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#ea580c', color: '#ffffff' }}
            >
              {batchRejectModal.submitting ? 'กำลังปฏิเสธ...' : `ยืนยันปฏิเสธ ${selectedIds.length} รายการ`}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Batch Delete Confirmation Modal */}
      <Dialog
        open={batchDeleteModal.open}
        onClose={() => !batchDeleteModal.submitting && setBatchDeleteModal({ open: false, submitting: false, error: '' })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ className: 'rounded-2xl sm:rounded-3xl mx-3', sx: { borderRadius: '1.25rem' } }}
      >
        <div className="flex flex-col max-h-[90vh]">
          <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight m-0">ลบรายการคำร้องที่เลือก</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 m-0 mt-0.5">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 overflow-y-auto grow">
            <div className="flex items-start gap-2.5 bg-rose-50/70 border border-rose-100 rounded-2xl p-3.5">
              <TriangleAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-[11px] sm:text-xs text-rose-700 leading-relaxed">
                คุณกำลังจะลบคำร้องที่เลือกทั้งหมด <span className="font-bold">{selectedIds.length} รายการ</span> ออกจากระบบอย่างถาวร
                ข้อมูลคำร้องและไฟล์ที่แนบมาจะไม่สามารถกู้คืนได้ โปรดตรวจสอบรายการอีกครั้งก่อนยืนยัน
              </div>
            </div>
            {batchDeleteModal.error && (
              <div className="mt-3 text-[11px] sm:text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {batchDeleteModal.error}
              </div>
            )}
          </div>

          <div className="pt-2.5 pb-3 px-4 sm:px-6 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setBatchDeleteModal({ open: false, submitting: false, error: '' })}
              disabled={batchDeleteModal.submitting}
              className="w-full sm:w-auto py-2 px-3 text-[11px] sm:text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer border-none bg-transparent disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleBatchDeleteConfirm}
              disabled={batchDeleteModal.submitting}
              className="w-full sm:w-auto py-2 px-3.5 text-[11px] sm:text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs whitespace-nowrap transition cursor-pointer border-none flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#e11d48', color: '#ffffff' }}
            >
              {batchDeleteModal.submitting ? 'กำลังลบ...' : `ยืนยันลบ ${selectedIds.length} รายการ`}
            </button>
          </div>
        </div>
      </Dialog>

      {/* จัดการรอบการประเมินสถานประกอบการ */}
      <AdminEvaluationRoundsModal
        open={evalRoundsModalOpen}
        onClose={() => setEvalRoundsModalOpen(false)}
      />
    </div>
  );
};

export default AdminDashboardPage;

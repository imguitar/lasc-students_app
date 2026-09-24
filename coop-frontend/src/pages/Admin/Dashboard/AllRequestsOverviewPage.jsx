import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import api from '../../../api/axios';
import { ArrowLeft, Search, MoreVertical, Eye, Loader2, Menu as MenuIcon, CalendarDays, ChevronRight, ChevronDown, CheckCircle2, XCircle, FileText, UserCheck, Send, QrCode, Pencil, Trash2, Calendar, Copy, Check, ExternalLink } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';
import StatusBadge from '../../../components/StatusBadge';
import { getEffectiveInternshipStatus } from '../../../utils/internshipStatus';
import './AdminDashboardPage.css';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'สถานะทั้งหมด' },
  { value: 'รอผู้ดูแลระบบตรวจสอบ', label: 'รอผู้ดูแลระบบตรวจสอบ' },
  { value: 'รอสถานประกอบการตอบรับ', label: 'รอสถานประกอบการตอบรับ' },
  { value: 'สถานประกอบการตอบรับแล้ว', label: 'สถานประกอบการตอบรับแล้ว' },
  { value: 'อนุมัติแล้ว', label: 'อนุมัติแล้ว' },
  { value: 'ไม่อนุมัติ', label: 'ไม่อนุมัติ' },
];

const DEPARTMENT_MAP = {
  1: 'สาขาวิชาวิทยาการคอมพิวเตอร์',
  2: 'สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล',
  3: 'สาขาวิชาสาธารณสุขชุมชน',
  4: 'สาขาวิชาวิทยาศาสตร์การกีฬา',
  5: 'สาขาวิชาเทคโนโลยีการเกษตร',
  6: 'สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร',
  7: 'สาขาวิชาอาชีวอนามัยและความปลอดภัย',
  8: 'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์',
  9: 'สาขาวิชาวิศวกรรมโลจิสติกส์',
  10: 'สาขาวิชาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม',
  11: 'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ',
  12: 'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม',
};

const DEPARTMENT_OPTIONS = Object.values(DEPARTMENT_MAP);

const matchStatus = (effectiveStatus, filterValue) => {
  const s = String(effectiveStatus || '');
  if (filterValue === 'all') return true;
  if (filterValue === 'ไม่อนุมัติ') {
    return s.includes('ไม่อนุมัติ') || s.includes('ปฏิเสธ') || s.includes('ยกเลิก');
  }
  return s.includes(filterValue);
};

const matchDepartment = (department, filterValue) => {
  if (filterValue === 'all') return true;
  const dept = String(department || '').replace(/^สาขา/, '');
  const target = filterValue.replace(/^สาขา/, '');
  return dept.includes(target) || target.includes(dept);
};

const AllRequestsOverviewPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [actionMenu, setActionMenu] = useState({ id: null, top: 0, left: 0 });
  const menuPanelRef = useRef(null);
  const [approveModal, setApproveModal] = useState({ open: false, request: null, submitting: false, error: '' });
  const [rejectModal, setRejectModal] = useState({ open: false, request: null, reason: '', submitting: false, error: '' });
  const [assignModal, setAssignModal] = useState({ open: false, request: null, advisors: [], advisorId: '', loading: false, submitting: false, error: '' });
  const [qrModal, setQrModal] = useState({ open: false, request: null, link: '', loading: false, error: '', copied: false, expiresAt: '' });
  const [scheduleModal, setScheduleModal] = useState({ open: false, request: null, startDate: '', endDate: '', note: '', submitting: false, error: '' });
  const [deleteModal, setDeleteModal] = useState({ open: false, request: null, submitting: false, error: '' });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (String(user.role || '').toLowerCase() !== 'admin') {
      navigate('/dashboard');
      return;
    }

    api.get('/requests')
      .then((res) => setRequests(res.data.data || []))
      .catch((err) => console.error('Failed to load requests:', err))
      .finally(() => setLoading(false));
  }, [navigate]);

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
    if (!toast.open) return undefined;
    const timer = setTimeout(() => setToast({ open: false, message: '', severity: 'success' }), 4000);
    return () => clearTimeout(timer);
  }, [toast.open]);

  useEffect(() => {
    if (!actionMenu.id) return undefined;
    const closeMenu = () => setActionMenu({ id: null, top: 0, left: 0 });
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [actionMenu.id]);

  const handleToggleActionMenu = (e, menuId) => {
    e.preventDefault();
    e.stopPropagation();
    if (actionMenu.id === menuId) {
      setActionMenu({ id: null, top: 0, left: 0 });
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 340;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < menuHeight + 12 ? rect.top - menuHeight - 6 : rect.bottom + 6;
    const left = Math.min(rect.right - 180, window.innerWidth - 196);
    setActionMenu({ id: menuId, top: Math.max(8, top), left: Math.max(8, left) });
  };

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((r) => {
      const effectiveStatus = getEffectiveInternshipStatus(r);
      if (!matchStatus(effectiveStatus, statusFilter)) return false;
      if (!matchDepartment(r.department, departmentFilter)) return false;
      if (!q) return true;
      return [r.studentName, r.studentId, r.company, r.department]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  }, [requests, searchQuery, statusFilter, departmentFilter]);

  const formatDateThai = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('th-TH');
    } catch {
      return '-';
    }
  };

  const activeMenuRequest = actionMenu.id
    ? requests.find((r) => String(r.id) === String(actionMenu.id))
    : null;

  const closeActionMenu = () => setActionMenu({ id: null, top: 0, left: 0 });

  const updateRequestInList = (requestId, patch) => {
    setRequests((prev) => prev.map((r) => (String(r.id) === String(requestId) ? { ...r, ...patch } : r)));
  };

  const handleConfirmApprove = async () => {
    const request = approveModal.request;
    if (!request) return;
    setApproveModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      await api.patch(`/requests/${request.id}/status`, { status: 'อนุมัติแล้ว' });
      updateRequestInList(request.id, { status: 'อนุมัติแล้ว' });
      setApproveModal({ open: false, request: null, submitting: false, error: '' });
      setToast({ open: true, message: `อนุมัติคำร้องของ ${request.studentName || request.studentId} เรียบร้อยแล้ว`, severity: 'success' });
    } catch (err) {
      setApproveModal((prev) => ({ ...prev, submitting: false, error: err.response?.data?.message || 'อัปเดตสถานะไม่สำเร็จ' }));
    }
  };

  const handleConfirmReject = async () => {
    const request = rejectModal.request;
    if (!request) return;
    if (!rejectModal.reason.trim()) {
      setRejectModal((prev) => ({ ...prev, error: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ/ส่งกลับแก้ไข' }));
      return;
    }
    setRejectModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      await api.patch(`/requests/${request.id}/status`, {
        status: 'ไม่อนุมัติ (Admin)',
        admin_comment: rejectModal.reason.trim(),
      });
      updateRequestInList(request.id, { status: 'ไม่อนุมัติ (Admin)', admin_comment: rejectModal.reason.trim() });
      setRejectModal({ open: false, request: null, reason: '', submitting: false, error: '' });
      setToast({ open: true, message: `ส่งกลับคำร้องของ ${request.studentName || request.studentId} ให้แก้ไขแล้ว`, severity: 'info' });
    } catch (err) {
      setRejectModal((prev) => ({ ...prev, submitting: false, error: err.response?.data?.message || 'อัปเดตสถานะไม่สำเร็จ' }));
    }
  };

  const handleOpenAssignModal = async (request) => {
    setAssignModal({ open: true, request, advisors: [], advisorId: '', loading: true, submitting: false, error: '' });
    try {
      const res = await api.get('/users', { params: { role: 'advisor' } });
      setAssignModal((prev) => ({ ...prev, advisors: res.data.data || [], loading: false }));
    } catch (err) {
      setAssignModal((prev) => ({ ...prev, loading: false, error: err.response?.data?.message || 'โหลดรายชื่ออาจารย์ไม่สำเร็จ' }));
    }
  };

  const handleConfirmAssign = async () => {
    const request = assignModal.request;
    const advisor = assignModal.advisors.find((a) => String(a.id) === String(assignModal.advisorId));
    if (!request || !advisor) {
      setAssignModal((prev) => ({ ...prev, error: 'กรุณาเลือกอาจารย์นิเทศ' }));
      return;
    }
    setAssignModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const advisorName = advisor.name || advisor.username;
      await api.patch(`/requests/${request.id}/appointment`, { advisorId: advisor.id, advisorName });
      updateRequestInList(request.id, {
        supervisionAppointment: { advisorId: advisor.id, advisorName },
      });
      setAssignModal({ open: false, request: null, advisors: [], advisorId: '', loading: false, submitting: false, error: '' });
      setToast({ open: true, message: `มอบหมาย ${advisorName} เป็นอาจารย์นิเทศเรียบร้อยแล้ว`, severity: 'success' });
    } catch (err) {
      setAssignModal((prev) => ({ ...prev, submitting: false, error: err.response?.data?.message || 'มอบหมายอาจารย์นิเทศไม่สำเร็จ' }));
    }
  };

  const handleOpenResponseQr = async (request) => {
    setQrModal({ open: true, request, link: '', loading: true, error: '', copied: false, expiresAt: '' });
    try {
      const res = await api.post(`/requests/${request.id}/response-qr`);
      const responseUrl = res.data?.data?.responseUrl;
      if (!responseUrl) throw new Error('ไม่พบ URL สำหรับตอบรับ');
      const link = /^https?:\/\//i.test(responseUrl)
        ? responseUrl
        : new URL(responseUrl, window.location.origin).href;
      setQrModal((prev) => ({ ...prev, link, loading: false, expiresAt: res.data?.data?.expiresAt || '' }));
    } catch (err) {
      setQrModal((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || err.message || 'ไม่สามารถโหลด QR Code ได้',
      }));
    }
  };

  const handleCopyQrLink = async () => {
    try {
      await navigator.clipboard.writeText(qrModal.link);
      setQrModal((prev) => ({ ...prev, copied: true }));
      setTimeout(() => setQrModal((prev) => ({ ...prev, copied: false })), 2500);
    } catch {
      setToast({ open: true, message: 'ไม่สามารถคัดลอกลิงก์ได้', severity: 'error' });
    }
  };

  const handleOpenScheduleModal = (request) => {
    setScheduleModal({
      open: true,
      request,
      startDate: request.internship_start_date || request.details?.startDate || '',
      endDate: request.internship_end_date || request.details?.endDate || '',
      note: request.details?.internshipDateNote || '',
      submitting: false,
      error: '',
    });
  };

  const handleScheduleSubmit = async () => {
    const request = scheduleModal.request;
    if (!request) return;
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
      await api.patch(`/requests/${request.id}/internship-period`, {
        startDate: scheduleModal.startDate,
        endDate: scheduleModal.endDate,
        note: scheduleModal.note,
      });
      updateRequestInList(request.id, {
        internship_start_date: scheduleModal.startDate,
        internship_end_date: scheduleModal.endDate,
        details: {
          ...(request.details || {}),
          startDate: scheduleModal.startDate,
          endDate: scheduleModal.endDate,
          internshipDateNote: scheduleModal.note,
        },
      });
      setScheduleModal({ open: false, request: null, startDate: '', endDate: '', note: '', submitting: false, error: '' });
      setToast({ open: true, message: `กำหนดวันฝึกงานให้ ${request.studentName || request.studentId} เรียบร้อยแล้ว`, severity: 'success' });
    } catch (err) {
      setScheduleModal((prev) => ({ ...prev, submitting: false, error: err.response?.data?.message || err.message || 'บันทึกวันฝึกงานล้มเหลว' }));
    }
  };

  const handleConfirmDelete = async () => {
    const request = deleteModal.request;
    if (!request) return;
    setDeleteModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      await api.delete(`/requests/${request.id}`);
      setRequests((prev) => prev.filter((r) => String(r.id) !== String(request.id)));
      setDeleteModal({ open: false, request: null, submitting: false, error: '' });
      setToast({ open: true, message: `ลบคำร้องของ ${request.studentName || request.studentId} เรียบร้อยแล้ว`, severity: 'success' });
    } catch (err) {
      setDeleteModal((prev) => ({ ...prev, submitting: false, error: err.response?.data?.message || err.message || 'ลบคำร้องล้มเหลว' }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="admin-dashboard-container">
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

      <main className="admin-main max-w-full overflow-x-hidden">
        <div className="content-section px-3 sm:px-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-5 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/admin-dashboard')}
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 transition cursor-pointer"
              aria-label="ย้อนกลับ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 grow">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-slate-900 font-extrabold text-xl md:text-2xl tracking-tight m-0">
                  สถานะคำร้องนักศึกษาทั้งหมด
                </h1>
                <span className="text-xs font-semibold text-violet-700 bg-violet-100/80 px-2.5 py-1 rounded-lg">
                  {filteredRequests.length} รายการ
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1 m-0">ตรวจสอบและติดตามสถานะคำร้องฝึกงานของนักศึกษาทุกคนในระบบ</p>
            </div>
          </div>

          {/* Card */}
          <div className="w-full min-w-0">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="relative w-full sm:grow sm:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ, รหัสนักศึกษา หรือบริษัท..."
                  className="w-full box-border pl-10 pr-3 py-2.5 text-xs text-slate-700 bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition placeholder:text-slate-400"
                />
              </div>

              <div className="relative w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto appearance-none rounded-xl bg-slate-50/70 border border-slate-200/80 text-xs text-slate-700 py-2.5 pl-3.5 pr-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition cursor-pointer"
                >
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative w-full sm:w-auto">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full sm:w-auto appearance-none rounded-xl bg-slate-50/70 border border-slate-200/80 text-xs text-slate-700 py-2.5 pl-3.5 pr-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition cursor-pointer"
                >
                  <option value="all">ทุกสาขาวิชา</option>
                  {DEPARTMENT_OPTIONS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Table (Tablet / Desktop) */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 w-full">
                <Loader2 className="w-8 h-8 text-violet-600 animate-spin stroke-[2.2]" />
                <p className="text-xs font-medium text-slate-400 mt-3 m-0">กำลังโหลดข้อมูลคำร้อง...</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-hidden rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="text-slate-400 text-[0.75rem] font-semibold uppercase tracking-wider py-3 px-4 border-b border-slate-100 whitespace-nowrap">วันที่ยื่น</th>
                      <th className="text-slate-400 text-[0.75rem] font-semibold uppercase tracking-wider py-3 px-4 border-b border-slate-100 whitespace-nowrap">รหัสนักศึกษา</th>
                      <th className="text-slate-400 text-[0.75rem] font-semibold uppercase tracking-wider py-3 px-4 border-b border-slate-100">ชื่อ-นามสกุล</th>
                      <th className="text-slate-400 text-[0.75rem] font-semibold uppercase tracking-wider py-3 px-4 border-b border-slate-100">สาขา</th>
                      <th className="text-slate-400 text-[0.75rem] font-semibold uppercase tracking-wider py-3 px-4 border-b border-slate-100">บริษัท</th>
                      <th className="text-slate-400 text-[0.75rem] font-semibold uppercase tracking-wider py-3 px-4 border-b border-slate-100">สถานะ</th>
                      <th className="text-slate-400 text-[0.75rem] font-semibold uppercase tracking-wider py-3 px-4 border-b border-slate-100 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="text-[0.8125rem] text-slate-600 py-3 px-4 border-b border-slate-100 whitespace-nowrap">
                          {formatDateThai(request.submittedDate)}
                        </td>
                        <td className="text-[0.8125rem] text-slate-700 font-medium py-3 px-4 border-b border-slate-100 whitespace-nowrap">{request.studentId}</td>
                        <td className="text-[0.8125rem] text-slate-700 font-medium py-3 px-4 border-b border-slate-100 break-words min-w-[120px]">{request.studentName}</td>
                        <td className="text-[0.8125rem] text-slate-600 py-3 px-4 border-b border-slate-100 break-words">{request.department || '-'}</td>
                        <td className="text-[0.8125rem] text-slate-600 py-3 px-4 border-b border-slate-100 min-w-[140px]">
                          <div className="font-medium text-slate-800">{request.company || '-'}</div>
                          {(request.internship_start_date || request.details?.startDate) ? (
                            <div className="text-[0.72rem] text-violet-700 font-medium mt-1 flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              <span>{formatDateThai(request.internship_start_date || request.details?.startDate)} - {formatDateThai(request.internship_end_date || request.details?.endDate)}</span>
                            </div>
                          ) : (
                            <div className="text-[0.72rem] text-slate-400 mt-1">ยังไม่กำหนดวันฝึก</div>
                          )}
                        </td>
                        <td className="py-3 px-4 border-b border-slate-100">
                          <StatusBadge status={getEffectiveInternshipStatus(request)} />
                        </td>
                        <td className="py-3 px-4 border-b border-slate-100 text-center">
                          <button
                            type="button"
                            className="action-menu-trigger p-2 rounded-xl text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition cursor-pointer border-none bg-transparent"
                            onClick={(e) => handleToggleActionMenu(e, request.id)}
                            aria-label="เมนูจัดการคำร้อง"
                          >
                            <MoreVertical className="w-4 h-4 stroke-[2]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">ไม่พบข้อมูลคำร้อง</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>

                {/* Mobile Card View */}
                <div className="block md:hidden">
                  {filteredRequests.map((request) => (
                    <div key={`card-${request.id}`} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs mb-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800">{request.studentId}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusBadge status={getEffectiveInternshipStatus(request)} />
                          <button
                            type="button"
                            className="action-menu-trigger p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-violet-50 transition active:scale-95 cursor-pointer border-none bg-transparent"
                            onClick={(e) => handleToggleActionMenu(e, request.id)}
                            aria-label="ตัวเลือกการจัดการ"
                          >
                            <MoreVertical className="w-5 h-5 stroke-[2]" />
                          </button>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 break-words">{request.studentName}</div>
                        <div className="text-xs text-slate-400 mt-0.5 break-words">{request.department || '-'}</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-700 font-medium break-words">
                        {request.company || '-'}
                        {(request.internship_start_date || request.details?.startDate) && (
                          <div className="text-[0.7rem] text-violet-700 font-medium mt-1 flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                            <span>{formatDateThai(request.internship_start_date || request.details?.startDate)} - {formatDateThai(request.internship_end_date || request.details?.endDate)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
                        <span className="text-[11px] text-slate-400">ยื่นเมื่อ: {formatDateThai(request.submittedDate)}</span>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/request/${request.id}`)}
                          className="flex items-center gap-0.5 text-xs font-semibold text-violet-600 hover:text-violet-700 transition cursor-pointer border-none bg-transparent py-1 shrink-0"
                        >
                          ดูรายละเอียด
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredRequests.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm">ไม่พบข้อมูลคำร้อง</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Action Dropdown Portal */}
      {actionMenu.id && activeMenuRequest && (() => {
        const s = String(getEffectiveInternshipStatus(activeMenuRequest) || '');
        const isRejected = s.includes('ไม่อนุมัติ') || s.includes('ปฏิเสธ') || s.includes('ยกเลิก');
        const isPendingAdmin = s.includes('รอผู้ดูแลระบบ') || s === 'รอตรวจสอบ';
        const isDispatchWaiting = s.includes('ส่งตัว') || s.includes('ตอบรับแล้ว');
        const isApproved = !isPendingAdmin && !isRejected && !isDispatchWaiting
          && !s.includes('รอสถานประกอบการ') && s !== 'ร่าง' && s !== '';
        const menuItemClass = 'w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-violet-700 hover:bg-violet-50 transition cursor-pointer border-none bg-transparent text-left';
        const goDetail = () => {
          closeActionMenu();
          navigate(`/dashboard/request/${activeMenuRequest.id}`);
        };
        return createPortal(
          <div
            ref={menuPanelRef}
            className="fixed z-[99] w-[240px] bg-white rounded-2xl border border-slate-100 shadow-xl py-1.5"
            style={{ top: actionMenu.top, left: actionMenu.left }}
          >
            <button type="button" onClick={(e) => { e.stopPropagation(); goDetail(); }} className={menuItemClass}>
              <Eye className="w-4 h-4 shrink-0" />
              ดูรายละเอียดคำร้อง
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenResponseQr(activeMenuRequest);
                closeActionMenu();
              }}
              className={menuItemClass}
            >
              <QrCode className="w-4 h-4 shrink-0 text-slate-500" />
              ดู QR ตอบรับล่วงหน้า
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goDetail(); }}
              className={`${menuItemClass} hover:text-violet-700`}
            >
              <Pencil className="w-4 h-4 shrink-0 text-violet-500" />
              แก้ไขคำร้อง
            </button>
            {isPendingAdmin && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setApproveModal({ open: true, request: activeMenuRequest, submitting: false, error: '' });
                    closeActionMenu();
                  }}
                  className={`${menuItemClass} hover:text-emerald-700 hover:bg-emerald-50`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  อนุมัติคำร้อง
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRejectModal({ open: true, request: activeMenuRequest, reason: '', submitting: false, error: '' });
                    closeActionMenu();
                  }}
                  className={`${menuItemClass} hover:text-red-600 hover:bg-red-50`}
                >
                  <XCircle className="w-4 h-4 shrink-0 text-red-400" />
                  ไม่อนุมัติ / ส่งกลับแก้ไข
                </button>
              </>
            )}
            {isApproved && (
              <>
                <button type="button" onClick={(e) => { e.stopPropagation(); goDetail(); }} className={menuItemClass}>
                  <FileText className="w-4 h-4 shrink-0" />
                  พิมพ์/ออกหนังสือขอความอนุเคราะห์
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAssignModal(activeMenuRequest);
                    closeActionMenu();
                  }}
                  className={menuItemClass}
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  มอบหมายอาจารย์นิเทศ
                </button>
              </>
            )}
            {isDispatchWaiting && (
              <button type="button" onClick={(e) => { e.stopPropagation(); goDetail(); }} className={menuItemClass}>
                <Send className="w-4 h-4 shrink-0" />
                ออกหนังสือส่งตัวนักศึกษา
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenScheduleModal(activeMenuRequest);
                closeActionMenu();
              }}
              className={`${menuItemClass} hover:text-indigo-700 hover:bg-indigo-50`}
            >
              <Calendar className="w-4 h-4 shrink-0 text-indigo-500" />
              กำหนดวันฝึกงาน
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteModal({ open: true, request: activeMenuRequest, submitting: false, error: '' });
                closeActionMenu();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer border-none bg-transparent text-left"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              ลบคำร้อง
            </button>
          </div>,
          document.body
        );
      })()}

      {/* Approve Confirm Modal */}
      {approveModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onMouseDown={() => !approveModal.submitting && setApproveModal({ open: false, request: null, submitting: false, error: '' })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onMouseDown={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center m-0">ยืนยันการอนุมัติคำร้อง</h3>
            <p className="text-sm text-slate-500 text-center mt-2 mb-0">
              ยืนยันการอนุมัติคำร้องของ <span className="font-semibold text-slate-700">{approveModal.request?.studentName || approveModal.request?.studentId}</span> หรือไม่?
            </p>
            {approveModal.error && <p className="text-xs text-red-500 text-center mt-3 mb-0">{approveModal.error}</p>}
            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                disabled={approveModal.submitting}
                onClick={() => setApproveModal({ open: false, request: null, submitting: false, error: '' })}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer bg-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={approveModal.submitting}
                onClick={handleConfirmApprove}
                className="flex-1 py-2.5 rounded-xl border-none text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {approveModal.submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                ยืนยันอนุมัติ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reject Modal */}
      {rejectModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onMouseDown={() => !rejectModal.submitting && setRejectModal({ open: false, request: null, reason: '', submitting: false, error: '' })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onMouseDown={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center m-0">ไม่อนุมัติ / ส่งกลับแก้ไข</h3>
            <p className="text-sm text-slate-500 text-center mt-2 mb-4">
              คำร้องของ <span className="font-semibold text-slate-700">{rejectModal.request?.studentName || rejectModal.request?.studentId}</span>
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value, error: '' }))}
              rows={3}
              placeholder="ระบุเหตุผล/สิ่งที่ต้องแก้ไข เพื่อแจ้งกลับไปยังนักศึกษา..."
              className="w-full box-border rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
            />
            {rejectModal.error && <p className="text-xs text-red-500 mt-2 mb-0">{rejectModal.error}</p>}
            <div className="flex gap-2.5 mt-4">
              <button
                type="button"
                disabled={rejectModal.submitting}
                onClick={() => setRejectModal({ open: false, request: null, reason: '', submitting: false, error: '' })}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer bg-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={rejectModal.submitting}
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl border-none text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {rejectModal.submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                ยืนยันส่งกลับ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Assign Advisor Modal */}
      {assignModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onMouseDown={() => !assignModal.submitting && setAssignModal({ open: false, request: null, advisors: [], advisorId: '', loading: false, submitting: false, error: '' })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onMouseDown={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-6 h-6 text-violet-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center m-0">มอบหมายอาจารย์นิเทศ</h3>
            <p className="text-sm text-slate-500 text-center mt-2 mb-4">
              คำร้องของ <span className="font-semibold text-slate-700">{assignModal.request?.studentName || assignModal.request?.studentId}</span>
            </p>
            {assignModal.loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
              </div>
            ) : (
              <div className="relative">
                <select
                  value={assignModal.advisorId}
                  onChange={(e) => setAssignModal((prev) => ({ ...prev, advisorId: e.target.value, error: '' }))}
                  className="w-full appearance-none rounded-xl bg-slate-50/70 border border-slate-200/80 text-sm text-slate-700 py-2.5 pl-3.5 pr-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition cursor-pointer"
                >
                  <option value="">เลือกอาจารย์นิเทศ...</option>
                  {assignModal.advisors.map((a) => (
                    <option key={a.id} value={a.id}>{a.name || a.username}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
            {assignModal.error && <p className="text-xs text-red-500 mt-2 mb-0">{assignModal.error}</p>}
            <div className="flex gap-2.5 mt-4">
              <button
                type="button"
                disabled={assignModal.submitting}
                onClick={() => setAssignModal({ open: false, request: null, advisors: [], advisorId: '', loading: false, submitting: false, error: '' })}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer bg-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={assignModal.submitting || assignModal.loading}
                onClick={handleConfirmAssign}
                className="flex-1 py-2.5 rounded-xl border-none text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {assignModal.submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                ยืนยันมอบหมาย
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* QR Response Modal */}
      {qrModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onMouseDown={() => setQrModal({ open: false, request: null, link: '', loading: false, error: '', copied: false, expiresAt: '' })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onMouseDown={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-6 h-6 text-violet-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center m-0">QR Code ตอบรับล่วงหน้า</h3>
            {qrModal.request && (
              <p className="text-sm text-slate-500 text-center mt-2 mb-0">
                {qrModal.request.studentName || qrModal.request.studentId}
                {qrModal.request.company && <span className="block text-xs text-slate-400 mt-0.5">{qrModal.request.company}</span>}
              </p>
            )}
            <div className="flex items-center justify-center mt-4">
              {qrModal.loading && <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />}
              {!qrModal.loading && qrModal.error && (
                <p className="text-xs text-red-500 text-center m-0">{qrModal.error}</p>
              )}
              {!qrModal.loading && !qrModal.error && qrModal.link && (
                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <QRCodeCanvas value={qrModal.link} size={170} level="H" marginSize={1} />
                </div>
              )}
            </div>
            {!qrModal.loading && !qrModal.error && qrModal.link && (
              <>
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="flex-1 text-[11px] text-slate-500 truncate m-0">{qrModal.link}</p>
                  <button
                    type="button"
                    onClick={handleCopyQrLink}
                    className={`shrink-0 p-1.5 rounded-lg transition cursor-pointer border-none ${qrModal.copied ? 'text-emerald-500 bg-emerald-50' : 'text-violet-600 hover:bg-violet-50 bg-transparent'}`}
                    aria-label="คัดลอกลิงก์"
                  >
                    {qrModal.copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 text-center mt-2 mb-0">
                  ลิงก์ใช้งานได้ครั้งเดียว{qrModal.expiresAt ? ` และหมดอายุ ${new Date(qrModal.expiresAt).toLocaleString('th-TH')}` : ''}
                </p>
              </>
            )}
            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setQrModal({ open: false, request: null, link: '', loading: false, error: '', copied: false, expiresAt: '' })}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer bg-white"
              >
                ปิด
              </button>
              <button
                type="button"
                disabled={qrModal.loading || Boolean(qrModal.error) || !qrModal.link}
                onClick={() => qrModal.link && window.open(qrModal.link, '_blank', 'noopener,noreferrer')}
                className="flex-1 py-2.5 rounded-xl border-none text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                เปิดลิงก์
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Schedule Internship Modal */}
      {scheduleModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onMouseDown={() => !scheduleModal.submitting && setScheduleModal({ open: false, request: null, startDate: '', endDate: '', note: '', submitting: false, error: '' })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onMouseDown={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center m-0">กำหนดวันฝึกงาน</h3>
            <p className="text-sm text-slate-500 text-center mt-2 mb-4">
              คำร้องของ <span className="font-semibold text-slate-700">{scheduleModal.request?.studentName || scheduleModal.request?.studentId}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">วันเริ่มฝึกงาน</label>
                <input
                  type="date"
                  value={scheduleModal.startDate}
                  onChange={(e) => setScheduleModal((prev) => ({ ...prev, startDate: e.target.value, error: '' }))}
                  className="w-full box-border rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">วันสิ้นสุดฝึกงาน</label>
                <input
                  type="date"
                  value={scheduleModal.endDate}
                  onChange={(e) => setScheduleModal((prev) => ({ ...prev, endDate: e.target.value, error: '' }))}
                  className="w-full box-border rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">หมายเหตุ (ถ้ามี)</label>
                <textarea
                  value={scheduleModal.note}
                  onChange={(e) => setScheduleModal((prev) => ({ ...prev, note: e.target.value }))}
                  rows={2}
                  placeholder="เช่น ช่วงเวลาฝึกงานตามปฏิทินการศึกษา..."
                  className="w-full box-border rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
                />
              </div>
            </div>
            {scheduleModal.error && <p className="text-xs text-red-500 mt-2 mb-0">{scheduleModal.error}</p>}
            <div className="flex gap-2.5 mt-4">
              <button
                type="button"
                disabled={scheduleModal.submitting}
                onClick={() => setScheduleModal({ open: false, request: null, startDate: '', endDate: '', note: '', submitting: false, error: '' })}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer bg-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={scheduleModal.submitting}
                onClick={handleScheduleSubmit}
                className="flex-1 py-2.5 rounded-xl border-none text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {scheduleModal.submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึกวันฝึกงาน
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirm Modal */}
      {deleteModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onMouseDown={() => !deleteModal.submitting && setDeleteModal({ open: false, request: null, submitting: false, error: '' })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onMouseDown={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center m-0">ยืนยันการลบคำร้อง</h3>
            <p className="text-sm text-slate-500 text-center mt-2 mb-0">
              คุณกำลังจะลบคำร้องของ <span className="font-semibold text-slate-700">{deleteModal.request?.studentName || deleteModal.request?.studentId}</span> ออกจากระบบอย่างถาวร ไม่สามารถกู้คืนได้
            </p>
            {deleteModal.error && <p className="text-xs text-red-500 text-center mt-3 mb-0">{deleteModal.error}</p>}
            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                disabled={deleteModal.submitting}
                onClick={() => setDeleteModal({ open: false, request: null, submitting: false, error: '' })}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer bg-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={deleteModal.submitting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl border-none text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {deleteModal.submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                ยืนยันลบคำร้อง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast */}
      {toast.open && createPortal(
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[110] bg-slate-800 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5" role="status">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          {toast.message}
          <button
            type="button"
            onClick={() => setToast({ open: false, message: '', severity: 'success' })}
            className="ml-1 text-slate-400 hover:text-white transition cursor-pointer border-none bg-transparent text-lg leading-none p-0"
            aria-label="ปิด"
          >
            ×
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AllRequestsOverviewPage;

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import api from '../../../api/axios';
import { ArrowLeft, Search, MoreVertical, Eye, Loader2, Menu as MenuIcon, CalendarDays, ChevronRight, ChevronDown, CheckCircle2, XCircle, FileText, FileUp, UserCheck, Send, QrCode, Pencil, Trash2, Calendar, Copy, Check, ExternalLink, Download, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { IconButton, ToggleButton, ToggleButtonGroup } from '@mui/material';
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

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

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
  const [quickTab, setQuickTab] = useState('all');
  const [relocations, setRelocations] = useState([]);
  const [actionMenu, setActionMenu] = useState({ id: null, top: 0, left: 0 });
  const menuPanelRef = useRef(null);
  const [approveModal, setApproveModal] = useState({ open: false, request: null, file: null, comment: '', submitting: false, error: '' });
  const approveFileRef = useRef(null);
  const [rejectModal, setRejectModal] = useState({ open: false, request: null, reason: '', submitting: false, error: '' });
  const [assignModal, setAssignModal] = useState({ open: false, request: null, advisors: [], advisorId: '', loading: false, submitting: false, error: '' });
  const [qrModal, setQrModal] = useState({ open: false, request: null, link: '', loading: false, error: '', copied: false, expiresAt: '' });
  const [scheduleModal, setScheduleModal] = useState({ open: false, request: null, startDate: '', endDate: '', note: '', submitting: false, error: '', continueToDispatch: false });
  const [dispatchModal, setDispatchModal] = useState({ open: false, request: null, file: null, comment: '', submitting: false, error: '' });
  const dispatchFileRef = useRef(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, request: null, submitting: false, error: '' });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  // จัดการแบบกลุ่ม
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchRejectModal, setBatchRejectModal] = useState({ open: false, reason: '', submitting: false, error: '' });
  const [batchScheduleModal, setBatchScheduleModal] = useState({ open: false, startDate: '', endDate: '', submitting: false, error: '' });
  // Sequential Approval Wizard — วนคิวแนบหนังสือขอความอนุเคราะห์ทีละคน
  const [approveWizard, setApproveWizard] = useState({ open: false, queue: [], index: 0, file: null, submitting: false, error: '', done: 0 });
  const wizardFileRef = useRef(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/'));
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
    api.get('/relocations')
      .then((res) => setRelocations(res.data.data || []))
      .catch(() => {});
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
    const onKeyDown = (e) => { if (e.key === 'Escape') closeMenu(); };
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('keydown', onKeyDown);
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
    const MENU_WIDTH = 240;
    const MENU_HEIGHT = 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < MENU_HEIGHT + 12 && rect.top > MENU_HEIGHT + 12;
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    setActionMenu({
      id: menuId,
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left,
      openUp
    });
  };

  // id คำร้องที่เคยยื่นขอเปลี่ยนสถานที่ฝึกงาน
  const relocatedRequestIds = useMemo(
    () => new Set(relocations.map((r) => Number(r.internship_request_id))),
    [relocations]
  );

  const matchQuickTab = (r, tab) => {
    const s = String(getEffectiveInternshipStatus(r) || '');
    if (tab === 'pending') return s.includes('รอ') || s === 'ยื่นคำร้องแล้ว';
    if (tab === 'interning') return s === 'กำลังออกฝึกงาน' || s === 'ออกฝึกงาน';
    if (tab === 'reloc') return relocatedRequestIds.has(Number(r.id));
    if (tab === 'done') return s.includes('เสร็จ') || s.includes('สิ้นสุด') || s.includes('ไม่อนุมัติ') || s.includes('ปฏิเสธ') || s.includes('ยกเลิก');
    return true;
  };

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((r) => {
      const effectiveStatus = getEffectiveInternshipStatus(r);
      if (!matchQuickTab(r, quickTab)) return false;
      if (!matchStatus(effectiveStatus, statusFilter)) return false;
      if (!matchDepartment(r.department, departmentFilter)) return false;
      if (!q) return true;
      return [r.studentName, r.studentId, r.active_company_name || r.company, r.department]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, searchQuery, statusFilter, departmentFilter, quickTab, relocatedRequestIds]);

  const formatDateThai = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('th-TH');
    } catch {
      return '-';
    }
  };

  // Export ตารางที่กรองอยู่เป็น CSV (BOM + quoting ให้ Excel อ่านภาษาไทยถูก)
  const handleExportReport = () => {
    const rows = filteredRequests;
    if (rows.length === 0) {
      setToast({ open: true, message: 'ไม่มีข้อมูลให้ส่งออกตามตัวกรองปัจจุบัน', severity: 'warning' });
      return;
    }
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['รหัสนักศึกษา', 'ชื่อ-นามสกุล', 'สาขาวิชา', 'บริษัท/หน่วยงาน', 'วันที่เริ่มฝึก', 'วันที่สิ้นสุด', 'อาจารย์นิเทศก์', 'สถานะปัจจุบัน'];
    const lines = rows.map((r) => [
      r.studentId,
      r.studentName,
      r.department,
      r.company,
      formatDateThai(r.internship_start_date || r.startDate || r.details?.startDate),
      formatDateThai(r.internship_end_date || r.endDate || r.details?.endDate),
      r.supervisionAppointment?.advisorName || '',
      getEffectiveInternshipStatus(r) || r.status || '',
    ].map(esc).join(','));
    const csv = '﻿' + header.map(esc).join(',') + '\n' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requests-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast({ open: true, message: `ส่งออกรายงาน ${rows.length} รายการเรียบร้อยแล้ว`, severity: 'success' });
  };

  const activeMenuRequest = actionMenu.id
    ? requests.find((r) => String(r.id) === String(actionMenu.id))
    : null;

  const closeActionMenu = () => setActionMenu({ id: null, top: 0, left: 0 });

  // ---- จัดการแบบกลุ่ม (Batch Actions) ----
  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const filteredIds = filteredRequests.map((r) => r.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
  const toggleSelectAll = () => {
    setSelectedIds(allFilteredSelected ? [] : [...new Set([...selectedIds, ...filteredIds])]);
  };

  // Bulk Actions Validation — เช็คสถานะจริง (effective) ของรายการที่ถูกติ๊ก
  const selectedRequests = requests.filter((r) => selectedIds.includes(r.id));
  // มีรายการที่ออกฝึกงานแล้ว/จบแล้ว ปนอยู่ในการเลือกหรือไม่
  const hasActiveOrCompleted = selectedRequests.some((r) => {
    const s = String(getEffectiveInternshipStatus(r) || '');
    return s.includes('ออกฝึกงาน') || s.includes('สิ้นสุด') || s.includes('เสร็จ');
  });
  // อนุมัติ/ตีกลับได้เฉพาะรายการที่ยังรอแอดมินตรวจสอบทั้งหมด
  const canApproveOrReject = selectedRequests.length > 0 && selectedRequests.every((r) => {
    const s = String(getEffectiveInternshipStatus(r) || '');
    return s === 'รอตรวจสอบ' || s.includes('รอผู้ดูแลระบบ') || s === 'รออนุมัติ';
  });
  // กำหนดวันฝึกงานได้เฉพาะกลุ่มที่ยังไม่มีใครออกฝึกงาน/จบแล้ว
  const canSetDates = selectedRequests.length > 0 && !hasActiveOrCompleted;

  const runBatchApprove = () => {
    if (selectedIds.length === 0 || batchBusy) return;
    // เปิด Sequential Wizard — แนบหนังสือขอความอนุเคราะห์ทีละคน
    setApproveWizard({ open: true, queue: [...selectedIds], index: 0, file: null, submitting: false, error: '', done: 0 });
  };

  const wizardCurrent = approveWizard.open
    ? requests.find((r) => String(r.id) === String(approveWizard.queue[approveWizard.index])) || null
    : null;

  const closeApproveWizard = () => {
    if (approveWizard.submitting) return;
    const done = approveWizard.done;
    setApproveWizard({ open: false, queue: [], index: 0, file: null, submitting: false, error: '', done: 0 });
    if (done > 0) {
      setToast({ open: true, message: `อนุมัติและแนบเอกสารครบแล้ว ${done} รายการ`, severity: 'success' });
      setSelectedIds([]);
    }
  };

  const handleWizardSubmit = async () => {
    const currentId = approveWizard.queue[approveWizard.index];
    if (currentId === undefined || approveWizard.submitting) return;
    if (!approveWizard.file) {
      setApproveWizard((p) => ({ ...p, error: 'กรุณาแนบไฟล์หนังสือขอความอนุเคราะห์ของนักศึกษาคนนี้ก่อน' }));
      return;
    }
    setApproveWizard((p) => ({ ...p, submitting: true, error: '' }));
    try {
      const dataUrl = await fileToDataUrl(approveWizard.file);
      await api.patch(`/requests/${currentId}/status`, {
        status: 'รอสถานประกอบการตอบรับ',
        dispatchLetter: { fileName: approveWizard.file.name, mimeType: approveWizard.file.type, dataUrl }
      });
      const fileName = approveWizard.file.name;
      setRequests((prev) => prev.map((r) => (
        String(r.id) === String(currentId)
          ? { ...r, status: 'รอสถานประกอบการตอบรับ', dispatchLetter: { fileName, dataUrl } }
          : r
      )));

      const isLast = approveWizard.index + 1 >= approveWizard.queue.length;
      const total = approveWizard.queue.length;
      if (wizardFileRef.current) wizardFileRef.current.value = '';

      if (isLast) {
        setApproveWizard({ open: false, queue: [], index: 0, file: null, submitting: false, error: '', done: 0 });
        setToast({ open: true, message: `อนุมัติและแนบเอกสารครบทั้ง ${total} รายการเรียบร้อยแล้ว`, severity: 'success' });
        setSelectedIds([]);
      } else {
        setApproveWizard((p) => ({ ...p, index: p.index + 1, file: null, submitting: false, error: '', done: p.done + 1 }));
      }
    } catch (err) {
      setApproveWizard((p) => ({
        ...p,
        submitting: false,
        error: err.response?.data?.message || err.message || 'บันทึกคำร้องล้มเหลว'
      }));
    }
  };

  const handleWizardSkip = () => {
    if (approveWizard.submitting) return;
    const isLast = approveWizard.index + 1 >= approveWizard.queue.length;
    if (isLast) { closeApproveWizard(); return; }
    setApproveWizard((p) => ({ ...p, index: p.index + 1, file: null, error: '' }));
    if (wizardFileRef.current) wizardFileRef.current.value = '';
  };

  const submitBatchReject = async () => {
    if (!batchRejectModal.reason.trim()) {
      setBatchRejectModal((p) => ({ ...p, error: 'กรุณาระบุเหตุผล' }));
      return;
    }
    setBatchRejectModal((p) => ({ ...p, submitting: true, error: '' }));
    try {
      // วนรายตัวเพื่อเก็บ admin_comment ของแต่ละคำร้อง (batch/status ไม่รองรับ comment)
      await Promise.all(selectedIds.map((id) =>
        api.patch(`/requests/${id}/status`, { status: 'ไม่อนุมัติ (Admin)', admin_comment: batchRejectModal.reason.trim() })
      ));
      setRequests((prev) => prev.map((r) => (selectedIds.includes(r.id) ? { ...r, status: 'ไม่อนุมัติ (Admin)' } : r)));
      setToast({ open: true, message: `ตีกลับคำร้อง ${selectedIds.length} รายการแล้ว`, severity: 'success' });
      setBatchRejectModal({ open: false, reason: '', submitting: false, error: '' });
      setSelectedIds([]);
    } catch (err) {
      setBatchRejectModal((p) => ({ ...p, submitting: false, error: err.response?.data?.message || 'ตีกลับแบบกลุ่มไม่สำเร็จ' }));
    }
  };

  const submitBatchSchedule = async () => {
    if (!batchScheduleModal.startDate || !batchScheduleModal.endDate) {
      setBatchScheduleModal((p) => ({ ...p, error: 'กรุณาระบุวันเริ่มและสิ้นสุด' }));
      return;
    }
    setBatchScheduleModal((p) => ({ ...p, submitting: true, error: '' }));
    try {
      await api.patch('/requests/batch/internship-period', {
        ids: selectedIds,
        startDate: batchScheduleModal.startDate,
        endDate: batchScheduleModal.endDate
      });
      setRequests((prev) => prev.map((r) => (selectedIds.includes(r.id)
        ? { ...r, internship_start_date: batchScheduleModal.startDate, internship_end_date: batchScheduleModal.endDate }
        : r)));
      setToast({ open: true, message: `กำหนดวันฝึกงานให้ ${selectedIds.length} รายการแล้ว`, severity: 'success' });
      setBatchScheduleModal({ open: false, startDate: '', endDate: '', submitting: false, error: '' });
      setSelectedIds([]);
    } catch (err) {
      setBatchScheduleModal((p) => ({ ...p, submitting: false, error: err.response?.data?.message || 'กำหนดวันฝึกงานแบบกลุ่มไม่สำเร็จ' }));
    }
  };

  const updateRequestInList = (requestId, patch) => {
    setRequests((prev) => prev.map((r) => (String(r.id) === String(requestId) ? { ...r, ...patch } : r)));
  };

  // อนุมัติคำร้อง = แนบหนังสือขอความอนุเคราะห์ + ส่งให้สถานประกอบการตอบรับ (flow เดียวกับหน้ารายละเอียดคำร้อง)
  const handleConfirmApprove = async () => {
    const request = approveModal.request;
    if (!request) return;
    if (!approveModal.file) {
      setApproveModal((prev) => ({ ...prev, error: 'กรุณาแนบไฟล์หนังสือขอความอนุเคราะห์ก่อนอนุมัติ' }));
      return;
    }
    setApproveModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const dataUrl = await fileToDataUrl(approveModal.file);
      const dispatchLetter = {
        fileName: approveModal.file.name,
        mimeType: approveModal.file.type,
        dataUrl,
        uploadedAt: new Date().toISOString(),
      };
      await api.patch(`/requests/${request.id}/status`, {
        status: 'รอสถานประกอบการตอบรับ',
        admin_comment: approveModal.comment?.trim() || null,
        dispatchLetter,
      });
      updateRequestInList(request.id, { status: 'รอสถานประกอบการตอบรับ', admin_comment: approveModal.comment?.trim() || null, dispatchLetter });
      setApproveModal({ open: false, request: null, file: null, comment: '', submitting: false, error: '' });
      setToast({ open: true, message: `อนุมัติและแนบหนังสือขอความอนุเคราะห์ของ ${request.studentName || request.studentId} เรียบร้อยแล้ว`, severity: 'success' });
      handleOpenResponseQr(request);
    } catch (err) {
      setApproveModal((prev) => ({ ...prev, submitting: false, error: err.response?.data?.message || 'อัปเดตสถานะไม่สำเร็จ' }));
    }
  };

  const handleApproveFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setApproveModal((prev) => ({ ...prev, error: 'รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG เท่านั้น', file: null }));
      event.target.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setApproveModal((prev) => ({ ...prev, error: 'ขนาดไฟล์ต้องไม่เกิน 20MB', file: null }));
      event.target.value = '';
      return;
    }
    setApproveModal((prev) => ({ ...prev, file, error: '' }));
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
      continueToDispatch: false,
    });
  };

  // Flow ออกใบส่งตัว: ยังไม่มีวันฝึก → เปิดกำหนดวันก่อน (step 1) แล้วค่อยเด้ง modal แนบใบส่งตัว (step 2)
  const openDispatchModal = (request) => {
    if (dispatchFileRef.current) dispatchFileRef.current.value = '';
    setDispatchModal({ open: true, request, file: null, comment: '', submitting: false, error: '' });
  };

  const handleOpenDispatchFlow = (request) => {
    const start = request.internship_start_date || request.details?.startDate || '';
    const end = request.internship_end_date || request.details?.endDate || '';
    if (start && end) {
      openDispatchModal(request);
      return;
    }
    setScheduleModal({
      open: true,
      request,
      startDate: start,
      endDate: end,
      note: request.details?.internshipDateNote || '',
      submitting: false,
      error: '',
      continueToDispatch: true,
    });
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
    const request = dispatchModal.request;
    if (!request) return;
    if (!dispatchModal.file) {
      setDispatchModal((prev) => ({ ...prev, error: 'กรุณาแนบไฟล์หนังสือส่งตัวนักศึกษาก่อนยืนยัน' }));
      return;
    }
    setDispatchModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const dataUrl = await fileToDataUrl(dispatchModal.file);
      const dispatchLetter = {
        fileName: dispatchModal.file.name,
        mimeType: dispatchModal.file.type,
        dataUrl,
        uploadedAt: new Date().toISOString(),
      };
      const startDate = request.internship_start_date || request.details?.startDate || '';
      const endDate = request.internship_end_date || request.details?.endDate || '';
      // ถ้าวันเริ่มฝึกผ่านมาแล้ว → ตัดเป็น "ออกฝึกงาน" ทันที (ไม่ต้องรอ cron เที่ยงคืน) เพื่อให้เช็คชื่อ/เซ็นย้อนหลังได้เลย
      const todayStr = new Date().toLocaleDateString('en-CA');
      const alreadyStarted = startDate && String(startDate).slice(0, 10) <= todayStr;
      const newStatus = alreadyStarted ? 'ออกฝึกงาน' : 'อนุมัติแล้ว (รอออกฝึกงาน)';
      await api.patch(`/requests/${request.id}/status`, {
        status: newStatus,
        admin_comment: dispatchModal.comment?.trim() || null,
        dispatchLetter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      updateRequestInList(request.id, {
        status: newStatus,
        admin_comment: dispatchModal.comment?.trim() || null,
        dispatchLetter,
        internship_start_date: startDate || request.internship_start_date,
        internship_end_date: endDate || request.internship_end_date,
      });
      setDispatchModal({ open: false, request: null, file: null, comment: '', submitting: false, error: '' });
      setToast({
        open: true,
        message: alreadyStarted
          ? `ออกหนังสือส่งตัวและเปลี่ยนเป็น "ออกฝึกงาน" แล้ว — ${request.studentName || request.studentId} เช็คชื่อ/ให้พี่เลี้ยงเซ็นย้อนหลังได้ทันที`
          : `ออกหนังสือส่งตัวให้ ${request.studentName || request.studentId} เรียบร้อย — ระบบจะเปลี่ยนเป็น "ออกฝึกงาน" อัตโนมัติเมื่อถึงวันเริ่ม`,
        severity: 'success',
      });
    } catch (err) {
      setDispatchModal((prev) => ({ ...prev, submitting: false, error: err.response?.data?.message || err.message || 'ออกหนังสือส่งตัวไม่สำเร็จ' }));
    }
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
      const continueToDispatch = scheduleModal.continueToDispatch;
      setScheduleModal({ open: false, request: null, startDate: '', endDate: '', note: '', submitting: false, error: '', continueToDispatch: false });
      setToast({ open: true, message: `กำหนดวันฝึกงานให้ ${request.studentName || request.studentId} เรียบร้อยแล้ว`, severity: 'success' });
      // step 1 เสร็จ → เด้ง step 2 แนบหนังสือส่งตัวต่อทันที
      if (continueToDispatch) {
        openDispatchModal({
          ...request,
          internship_start_date: scheduleModal.startDate,
          internship_end_date: scheduleModal.endDate,
        });
      }
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
            {/* Quick Filter Tabs */}
            <ToggleButtonGroup
              value={quickTab}
              exclusive
              onChange={(_, v) => { if (v) { setQuickTab(v); setStatusFilter('all'); setSelectedIds([]); setActionMenu({ id: null, top: 0, left: 0 }); } }}
              size="small"
              sx={{
                display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2,
                '& .MuiToggleButton-root': {
                  border: '1px solid #e2e8f0', borderRadius: '12px !important',
                  px: 2, py: 0.9, fontSize: '0.78rem', fontWeight: 600, color: '#475569',
                  textTransform: 'none', bgcolor: '#fff',
                  '&:hover': { bgcolor: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' },
                  '&.Mui-selected': {
                    bgcolor: '#7c3aed', color: '#fff', borderColor: '#7c3aed', fontWeight: 700,
                    '&:hover': { bgcolor: '#6d28d9' },
                  },
                },
              }}
            >
              <ToggleButton value="all">ทั้งหมด</ToggleButton>
              <ToggleButton value="pending">รอตรวจสอบ / รอดำเนินการ</ToggleButton>
              <ToggleButton value="interning">กำลังออกฝึกงาน</ToggleButton>
            </ToggleButtonGroup>

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

              <button
                type="button"
                onClick={handleExportReport}
                className="w-full sm:w-auto sm:ml-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 cursor-pointer transition"
              >
                <Download className="w-4 h-4" /> ส่งออกรายงาน
              </button>
            </div>

            {/* Batch Action Bar — จัดการคำร้องแบบกลุ่ม */}
            {/* Floating Batch Dock — แคปซูลลอยกลางจอด้านล่างเมื่อมีการเลือกรายการ */}
            <div
              className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out max-w-[calc(100vw-2rem)] ${selectedIds.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'}`}
            >
              <div className="flex items-center gap-3 whitespace-nowrap rounded-full px-5 py-2.5 bg-slate-900/90 text-white backdrop-blur-md border border-slate-700 shadow-2xl shadow-slate-950/30 overflow-x-auto">
                <span className="bg-purple-600 text-white text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1">
                  {selectedIds.length} รายการ
                </span>
                <button
                  type="button" onClick={() => setSelectedIds([])}
                  className="h-8 px-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full text-xs font-medium inline-flex items-center gap-1 border-0 bg-transparent cursor-pointer transition-all"
                >
                  <X className="w-3.5 h-3.5" /> ยกเลิก
                </button>
                <div className="h-4 w-[1px] bg-slate-200/20 shrink-0" />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button" onClick={runBatchApprove} disabled={batchBusy || !canApproveOrReject}
                    title={!canApproveOrReject ? 'อนุมัติได้เฉพาะคำร้องที่ยังรอตรวจสอบทั้งหมด' : ''}
                    className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-full shadow-sm inline-flex items-center gap-1.5 border-0 cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติ
                  </button>
                  <button
                    type="button" onClick={() => setBatchScheduleModal({ open: true, startDate: '', endDate: '', submitting: false, error: '' })} disabled={batchBusy || !canSetDates}
                    title={!canSetDates ? 'ไม่สามารถกำหนดวันให้คำร้องที่ออกฝึกงานแล้ว' : ''}
                    className="h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-full shadow-sm inline-flex items-center gap-1.5 border-0 cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> กำหนดวันฝึกงาน
                  </button>
                  <button
                    type="button" onClick={() => setBatchRejectModal({ open: true, reason: '', submitting: false, error: '' })} disabled={batchBusy || !canApproveOrReject}
                    title={!canApproveOrReject ? 'ตีกลับได้เฉพาะคำร้องที่ยังรอตรวจสอบทั้งหมด' : ''}
                    className="h-8 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium rounded-full inline-flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-3.5 h-3.5" /> ตีกลับ
                  </button>
                </div>
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
                  {/* border-separate จำเป็น — sticky <td> หลุด/ไม่แสดงผลในบางแถวเมื่อ border-collapse: collapse (bug ของ Chrome/Safari) */}
                  <table className="w-full min-w-[860px] text-left border-separate border-spacing-0 table-auto">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="px-3 py-2.5 border-b border-slate-100 w-9">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded accent-violet-600 cursor-pointer align-middle"
                          aria-label="เลือกทั้งหมด"
                        />
                      </th>
                      <th className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-3 py-2.5 border-b border-slate-100 whitespace-nowrap">วันที่ยื่น</th>
                      <th className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-3 py-2.5 border-b border-slate-100">นักศึกษา</th>
                      <th className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-3 py-2.5 border-b border-slate-100">สาขา</th>
                      <th className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-3 py-2.5 border-b border-slate-100">บริษัท</th>
                      <th className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-3 py-2.5 border-b border-slate-100 sticky right-[68px] bg-slate-50 shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.08)]">สถานะ</th>
                      <th className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-3 py-2.5 border-b border-slate-100 text-center sticky right-0 w-[68px] bg-slate-50">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className={`group hover:bg-slate-50/60 transition-colors ${selectedIds.includes(request.id) ? 'bg-violet-50/50' : ''}`}>
                        <td className="px-3 py-2.5 border-b border-slate-100 w-9">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(request.id)}
                            onChange={() => toggleSelect(request.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded accent-violet-600 cursor-pointer align-middle"
                            aria-label={`เลือกคำร้อง ${request.studentId}`}
                          />
                        </td>
                        <td className="text-xs sm:text-sm text-slate-600 px-3 py-2.5 border-b border-slate-100 whitespace-nowrap">
                          {formatDateThai(request.submittedDate)}
                        </td>
                        <td className="px-3 py-2.5 border-b border-slate-100 min-w-[150px]">
                          <div className="text-xs sm:text-sm font-medium text-slate-800 break-words">{request.studentName}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{request.studentId}</div>
                        </td>
                        <td className="text-xs sm:text-sm text-slate-600 px-3 py-2.5 border-b border-slate-100 max-w-[160px] truncate" title={request.department || ''}>{request.department || '-'}</td>
                        <td className="text-xs sm:text-sm text-slate-600 px-3 py-2.5 border-b border-slate-100 min-w-[140px]">
                          <div className="font-medium text-slate-800 break-words">
                            {request.active_company_name || request.company || '-'}
                            {request.active_company_name && <span className="block text-[10px] text-slate-400 font-normal">ย้ายจาก {request.company}</span>}
                          </div>
                          {(request.internship_start_date || request.details?.startDate) ? (
                            <div className="text-[0.72rem] text-violet-700 font-medium mt-1 flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                              <span className="whitespace-nowrap">{formatDateThai(request.internship_start_date || request.details?.startDate)} - {formatDateThai(request.internship_end_date || request.details?.endDate)}</span>
                            </div>
                          ) : (
                            <div className="text-[0.72rem] text-slate-400 mt-1">ยังไม่กำหนดวันฝึก</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 border-b border-slate-100 sticky right-[68px] bg-white group-hover:bg-slate-50 shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.08)]">
                          <StatusBadge status={getEffectiveInternshipStatus(request)} />
                        </td>
                        <td className="px-3 py-2.5 border-b border-slate-100 text-center sticky right-0 w-[68px] bg-white group-hover:bg-slate-50">
                          <IconButton
                            size="small"
                            className="action-menu-trigger"
                            onClick={(e) => handleToggleActionMenu(e, request.id)}
                            aria-label="เมนูจัดการคำร้อง"
                            sx={{ p: 0.75, color: '#94a3b8', '&:hover': { bgcolor: 'rgba(241,245,249,0.8)', color: '#475569' }, '&:active': { bgcolor: 'rgba(226,232,240,0.6)' } }}
                          >
                            <MoreVertical className="w-4 h-4 stroke-[2]" />
                          </IconButton>
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
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(request.id)}
                            onChange={() => toggleSelect(request.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded accent-violet-600 cursor-pointer"
                            aria-label={`เลือกคำร้อง ${request.studentId}`}
                          />
                          <span className="font-mono text-xs font-bold text-slate-800">{request.studentId}</span>
                        </label>
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
                        {request.active_company_name || request.company || '-'}
                        {request.active_company_name && <span className="block text-[10px] text-slate-400 font-normal mt-0.5">ย้ายจาก {request.company}</span>}
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
        const isDispatchWaiting = s.includes('ส่งตัว') || s.includes('ตอบรับแล้ว');
        // 'ตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)' มี 'รอผู้ดูแลระบบ' ปนอยู่ — ต้องตัดสถานะที่บริษัทตอบรับแล้วออกก่อน
        const isPendingAdmin = !isDispatchWaiting && (s.includes('รอผู้ดูแลระบบ') || s === 'รอตรวจสอบ');
        const isApproved = !isPendingAdmin && !isRejected && !isDispatchWaiting
          && !s.includes('รอสถานประกอบการ') && s !== 'ร่าง' && s !== '';
        const isInterning = s === 'กำลังออกฝึกงาน' || s === 'ออกฝึกงาน';
        const menuItemClass = 'w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-violet-700 hover:bg-violet-50 transition cursor-pointer border-none bg-transparent text-left';
        const goDetail = () => {
          closeActionMenu();
          navigate(`/dashboard/request/${activeMenuRequest.id}`);
        };
        return createPortal(
          <div
            ref={menuPanelRef}
            className="fixed z-[99] w-[240px] bg-white rounded-2xl border border-slate-100 shadow-xl py-1.5"
            style={{ top: actionMenu.top, left: actionMenu.left, transform: actionMenu.openUp ? 'translateY(-100%)' : 'none' }}
          >
            <button type="button" onClick={(e) => { e.stopPropagation(); goDetail(); }} className={menuItemClass}>
              <Eye className="w-4 h-4 shrink-0" />
              ดูรายละเอียดคำร้อง
            </button>
            {!isDispatchWaiting && !isInterning && (
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
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goDetail(); }}
              className={`${menuItemClass} hover:text-violet-700`}
            >
              <Pencil className="w-4 h-4 shrink-0 text-violet-500" />
              {isInterning ? 'แก้ไขข้อมูลติดต่อสถานประกอบการ' : 'แก้ไขคำร้อง'}
            </button>
            {isPendingAdmin && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setApproveModal({ open: true, request: activeMenuRequest, file: null, comment: '', submitting: false, error: '' });
                    if (approveFileRef.current) approveFileRef.current.value = '';
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
            {isApproved && !isInterning && (
              <button type="button" onClick={(e) => { e.stopPropagation(); goDetail(); }} className={menuItemClass}>
                <FileText className="w-4 h-4 shrink-0" />
                พิมพ์/ออกหนังสือขอความอนุเคราะห์
              </button>
            )}
            {isInterning && (
              <button type="button" onClick={(e) => { e.stopPropagation(); goDetail(); }} className={menuItemClass}>
                <FileText className="w-4 h-4 shrink-0" />
                พิมพ์/ดาวน์โหลดหนังสือส่งตัว (PDF)
              </button>
            )}
            {isDispatchWaiting && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDispatchFlow(activeMenuRequest);
                  closeActionMenu();
                }}
                className={menuItemClass}
              >
                <Send className="w-4 h-4 shrink-0" />
                ออกหนังสือส่งตัวนักศึกษา
              </button>
            )}
            {!isInterning && (
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
            )}
            {!isInterning && (
              <>
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
              </>
            )}
          </div>,
          document.body
        );
      })()}

      {/* Approve Confirm Modal */}
      {approveModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onMouseDown={() => !approveModal.submitting && setApproveModal({ open: false, request: null, file: null, comment: '', submitting: false, error: '' })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onMouseDown={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center m-0">อนุมัติและแนบหนังสือขอความอนุเคราะห์</h3>
            <p className="text-sm text-slate-500 text-center mt-2 mb-0">
              คำร้องของ <span className="font-semibold text-slate-700">{approveModal.request?.studentName || approveModal.request?.studentId}</span> จะถูกส่งให้สถานประกอบการตอบรับ
            </p>

            <textarea
              value={approveModal.comment || ''}
              onChange={(e) => setApproveModal((prev) => ({ ...prev, comment: e.target.value }))}
              placeholder="หมายเหตุถึงสถานประกอบการ (ถ้ามี)"
              className="w-full box-border rounded-2xl border border-slate-200 p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none h-20 text-slate-800 bg-white mt-4"
            />

            {/* แนบหนังสือขอความอนุเคราะห์ (บังคับ) */}
            <input
              ref={approveFileRef}
              type="file"
              hidden
              accept="application/pdf,image/jpeg,image/png,image/jpg"
              onChange={handleApproveFileChange}
            />
            <button
              type="button"
              onClick={() => approveFileRef.current?.click()}
              disabled={approveModal.submitting}
              className="w-full mt-3 border-2 border-dashed border-violet-200 hover:border-violet-300 bg-violet-50/20 hover:bg-violet-50/40 rounded-2xl py-4 px-4 flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <FileUp className="w-4 h-4 text-violet-600" />
              <span className="text-xs font-semibold text-violet-700">เลือกไฟล์หนังสือขอความอนุเคราะห์ *</span>
            </button>
            <p className="text-[10px] text-slate-400 mt-1.5 mb-0 text-center">รองรับไฟล์ PDF, JPG หรือ PNG (ขนาดไม่เกิน 20MB)</p>

            {approveModal.file && (
              <div className="mt-2.5 text-xs text-emerald-600 font-semibold flex items-center gap-1.5 break-all">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>ไฟล์ที่เลือก: {approveModal.file.name}</span>
              </div>
            )}

            {approveModal.error && <p className="text-xs text-red-500 text-center mt-3 mb-0">{approveModal.error}</p>}
            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                disabled={approveModal.submitting}
                onClick={() => setApproveModal({ open: false, request: null, file: null, comment: '', submitting: false, error: '' })}
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
                {(qrModal.request.active_company_name || qrModal.request.company) && <span className="block text-xs text-slate-400 mt-0.5">{qrModal.request.active_company_name || qrModal.request.company}</span>}
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
            {scheduleModal.continueToDispatch && (
              <p className="text-[11px] font-semibold text-violet-600 text-center mt-1 mb-0">ขั้นที่ 1 จาก 2 — กำหนดวันก่อนออกใบส่งตัว</p>
            )}
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

      {/* Dispatch Letter Modal — step 2 ของ flow ออกใบส่งตัว */}
      {dispatchModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onMouseDown={() => !dispatchModal.submitting && setDispatchModal({ open: false, request: null, file: null, comment: '', submitting: false, error: '' })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onMouseDown={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <Send className="w-6 h-6 text-violet-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center m-0">ออกหนังสือส่งตัวนักศึกษา</h3>
            <p className="text-sm text-slate-500 text-center mt-2 mb-4">
              คำร้องของ <span className="font-semibold text-slate-700">{dispatchModal.request?.studentName || dispatchModal.request?.studentId}</span>
            </p>
            {(() => {
              const s = dispatchModal.request?.internship_start_date || dispatchModal.request?.details?.startDate;
              const e = dispatchModal.request?.internship_end_date || dispatchModal.request?.details?.endDate;
              return (s || e) ? (
                <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 mt-0 mb-4 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  กำหนดฝึกงาน {s || '—'} ถึง {e || '—'} — เมื่อถึงวันเริ่มระบบจะเปลี่ยนเป็น "ออกฝึกงาน" อัตโนมัติ
                </p>
              ) : null;
            })()}
            <input
              ref={dispatchFileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleDispatchFileChange}
            />
            <button
              type="button"
              onClick={() => dispatchFileRef.current?.click()}
              disabled={dispatchModal.submitting}
              className="w-full flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 hover:border-violet-300 hover:bg-violet-50/40 transition cursor-pointer bg-white"
            >
              <FileUp className="w-6 h-6 text-violet-400" />
              {dispatchModal.file
                ? <span className="text-slate-700 font-medium">{dispatchModal.file.name}</span>
                : <span>คลิกเพื่อแนบไฟล์หนังสือส่งตัว <span className="text-red-400">*</span> (PDF, JPG, PNG ≤ 20MB)</span>}
            </button>
            <textarea
              value={dispatchModal.comment}
              onChange={(e) => setDispatchModal((prev) => ({ ...prev, comment: e.target.value }))}
              rows={2}
              placeholder="หมายเหตุ (ถ้ามี)"
              className="w-full box-border rounded-xl border border-slate-200 px-3.5 py-2.5 mt-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
            />
            {dispatchModal.error && <p className="text-xs text-red-500 mt-2 mb-0">{dispatchModal.error}</p>}
            <div className="flex gap-2.5 mt-4">
              <button
                type="button"
                disabled={dispatchModal.submitting}
                onClick={() => setDispatchModal({ open: false, request: null, file: null, comment: '', submitting: false, error: '' })}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer bg-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={dispatchModal.submitting}
                onClick={handleDispatchSubmit}
                className="flex-1 py-2.5 rounded-xl border-none text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {dispatchModal.submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                แนบไฟล์และออกใบส่งตัว
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

      {/* Sequential Approval Wizard — แนบหนังสือขอความอนุเคราะห์ทีละคน */}
      {approveWizard.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={closeApproveWizard} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-800 m-0">อนุมัติคำร้องแบบต่อเนื่อง</h3>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                    รายการที่ {approveWizard.index + 1} จาก {approveWizard.queue.length} รายการ
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

            <div className="px-5 py-4 overflow-y-auto grow">
              {wizardCurrent ? (
                <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3.5">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <div>
                      <div className="text-[11px] text-slate-500 mb-0.5">ชื่อ-นามสกุล</div>
                      <div className="text-xs font-semibold text-slate-800 break-words">{wizardCurrent.studentName || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 mb-0.5">รหัสนักศึกษา</div>
                      <div className="text-xs font-semibold text-slate-800">{wizardCurrent.studentId || '-'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[11px] text-slate-500 mb-0.5">บริษัทที่ยื่นขอฝึกงาน</div>
                      <div className="text-xs font-semibold text-slate-800 break-words">{wizardCurrent.active_company_name || wizardCurrent.company || '-'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-4 text-xs text-slate-500">
                  ไม่พบข้อมูลคำร้องในคิว — อาจถูกลบหรือปรับสถานะไปแล้ว
                </div>
              )}

              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  หนังสือขอความอนุเคราะห์ / หนังสือส่งตัว <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={wizardFileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setApproveWizard((p) => ({ ...p, file: f, error: '' }));
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => wizardFileRef.current?.click()}
                  disabled={approveWizard.submitting}
                  className={`w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 transition cursor-pointer border-0 ${
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
                      <span className="text-[11px] text-slate-400">PDF, JPG หรือ PNG</span>
                    </>
                  )}
                </button>
              </div>

              {approveWizard.error && (
                <div className="mt-3 text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                  {approveWizard.error}
                </div>
              )}
            </div>

            <div className="pt-2.5 pb-3 px-5 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={closeApproveWizard}
                disabled={approveWizard.submitting}
                className="w-full sm:w-auto py-2 px-3 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer border-none bg-transparent disabled:opacity-50"
              >
                ยกเลิกคิว
              </button>
              {approveWizard.index + 1 < approveWizard.queue.length && (
                <button
                  type="button"
                  onClick={handleWizardSkip}
                  disabled={approveWizard.submitting}
                  className="w-full sm:w-auto py-2 px-3 text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer border-none bg-transparent disabled:opacity-50"
                >
                  ข้ามรายการนี้
                </button>
              )}
              <button
                type="button"
                onClick={handleWizardSubmit}
                disabled={approveWizard.submitting || !wizardCurrent}
                className="w-full sm:w-auto py-2 px-3.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap transition cursor-pointer border-none flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {approveWizard.submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {approveWizard.submitting
                  ? 'กำลังบันทึก...'
                  : approveWizard.index + 1 >= approveWizard.queue.length
                    ? 'แนบไฟล์และอนุมัติ (คนสุดท้าย)'
                    : 'แนบไฟล์และอนุมัติ →'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Batch Reject Modal */}
      {batchRejectModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={() => !batchRejectModal.submitting && setBatchRejectModal((p) => ({ ...p, open: false }))} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-base font-bold text-slate-800 mt-0 mb-1">ตีกลับคำร้อง {selectedIds.length} รายการ</h3>
            <p className="text-xs text-slate-500 mb-3 m-0">ระบุเหตุผลร่วมสำหรับทุกรายการที่เลือก</p>
            <textarea
              value={batchRejectModal.reason}
              onChange={(e) => setBatchRejectModal((p) => ({ ...p, reason: e.target.value, error: '' }))}
              placeholder="เหตุผลที่ไม่อนุมัติ/ส่งกลับแก้ไข *"
              className="w-full box-border rounded-xl border border-slate-200 p-3 text-xs resize-none h-24 text-slate-700 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400"
            />
            {batchRejectModal.error && <p className="text-[11px] font-semibold text-red-500 mt-1.5 m-0">{batchRejectModal.error}</p>}
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setBatchRejectModal((p) => ({ ...p, open: false }))} disabled={batchRejectModal.submitting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 cursor-pointer">ยกเลิก</button>
              <button type="button" onClick={submitBatchReject} disabled={batchRejectModal.submitting}
                className="flex-1 py-2.5 rounded-xl border-none text-sm font-semibold text-white bg-red-500 hover:bg-red-600 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5">
                {batchRejectModal.submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                ยืนยันตีกลับ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Batch Schedule Modal */}
      {batchScheduleModal.open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={() => !batchScheduleModal.submitting && setBatchScheduleModal((p) => ({ ...p, open: false }))} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-base font-bold text-slate-800 mt-0 mb-1">กำหนดวันฝึกงาน {selectedIds.length} รายการ</h3>
            <p className="text-xs text-slate-500 mb-3 m-0">ระบุช่วงวันฝึกงานร่วมสำหรับทุกรายการที่เลือก</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">วันเริ่มฝึกงาน *</label>
                <input type="date" value={batchScheduleModal.startDate}
                  onChange={(e) => setBatchScheduleModal((p) => ({ ...p, startDate: e.target.value, error: '' }))}
                  className="w-full box-border h-10 px-3 text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">วันสิ้นสุด *</label>
                <input type="date" value={batchScheduleModal.endDate}
                  onChange={(e) => setBatchScheduleModal((p) => ({ ...p, endDate: e.target.value, error: '' }))}
                  className="w-full box-border h-10 px-3 text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15" />
              </div>
            </div>
            {batchScheduleModal.error && <p className="text-[11px] font-semibold text-red-500 mt-1.5 m-0">{batchScheduleModal.error}</p>}
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setBatchScheduleModal((p) => ({ ...p, open: false }))} disabled={batchScheduleModal.submitting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 cursor-pointer">ยกเลิก</button>
              <button type="button" onClick={submitBatchSchedule} disabled={batchScheduleModal.submitting}
                className="flex-1 py-2.5 rounded-xl border-none text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5">
                {batchScheduleModal.submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast */}
      {toast.open && createPortal(
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[110] bg-white border border-gray-200/80 text-gray-900 text-sm font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5" role="status">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          {toast.message}
          <button
            type="button"
            onClick={() => setToast({ open: false, message: '', severity: 'success' })}
            className="ml-1 text-gray-400 hover:text-gray-700 transition cursor-pointer border-none bg-transparent text-lg leading-none p-0"
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

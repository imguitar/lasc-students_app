import { ModalActions, ModalCancelButton, ModalConfirmButton } from '../../../components/ModalActions';
import { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../../../api/axios';
import {
  TrashIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon,
  CreditCardIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { MoreVertical, Eye, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;
import {
  Box,
  Paper,
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
  Tooltip,
  Checkbox,
  Typography,
  Alert,
  Snackbar,
} from '@mui/material';
import JSZip from 'jszip';
import { useReactToPrint } from 'react-to-print';
import PrintablePaymentReceipt from '../../../components/PrintablePaymentReceipt';
import './AdminDashboardPage.css';
import './StudentListPage.css';

const dataUrlToBlob = (dataUrl) => {
  if (!dataUrl) return null;
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const header = dataUrl.slice(0, commaIdx);
    const payload = dataUrl.slice(commaIdx + 1);
    const mimeMatch = header.match(/:(.*?)(;|$)/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = /;base64/i.test(header)
      ? atob(payload.replace(/\s/g, ''))
      : decodeURIComponent(payload);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.error('Failed to convert dataUrl to blob:', err);
    return null;
  }
};

const StudentListPage = () => {
  const navigate = useNavigate();
  const departmentOptions = [
    'สาขาวิชาวิทยาการคอมพิวเตอร์',
    'สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล',
    'สาขาวิชาสาธารณสุขชุมชน',
    'สาขาวิชาวิทยาศาสตร์การกีฬา',
    'สาขาวิชาเทคโนโลยีการเกษตร',
    'สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร',
    'สาขาวิชาอาชีวอนามัยและความปลอดภัย',
    'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์',
    'สาขาวิชาวิศวกรรมโลจิสติกส์',
    'สาขาวิชาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม',
    'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ',
    'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม'
  ];

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingSlips, setExportingSlips] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedYear, setSelectedYear] = useState('66');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentCodes, setSelectedStudentCodes] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalWithSlips, setTotalWithSlips] = useState(0);
  const [years, setYears] = useState(['66']);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const selectedCacheRef = useRef(new Map());
  const requestSeqRef = useRef(0);
  const [slipModal, setSlipModal] = useState({ open: false, imageUrl: '', paymentId: null, studentCode: null, studentName: null, paymentStatus: null });
  
  const [receiptStudents, setReceiptStudents] = useState([]);
  const printReceiptRef = useRef(null);
  const handlePrintReceipt = useReactToPrint({
    contentRef: printReceiptRef,
    documentTitle: 'ใบสำคัญรับเงิน_ฝึกงาน',
  });

  const handleExportReceipts = (targetStudents) => {
    const list = targetStudents || [];
    if (list.length === 0) {
      setToast({ open: true, message: 'ไม่มีรายชื่อนักศึกษาที่เลือก', severity: 'warning' });
      return;
    }
    setReceiptStudents(list);
    setTimeout(() => {
      handlePrintReceipt();
    }, 150);
  };

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    targetStudents: [],
    deleteRequests: true,
    deleteCheckins: true,
    deletePayments: true,
    deleteUser: false,
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

  const handleToggleActionMenu = (e, menuId) => {
    e.preventDefault();
    e.stopPropagation();
    if (actionMenu.id === menuId) {
      setActionMenu({ id: null, top: 0, left: 0 });
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 160; // w-40
    const menuHeight = 110;
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

  const getToken = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.token || '';
    } catch {
      return '';
    }
  };

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  });

  const filterParams = () => {
    const params = new URLSearchParams();
    if (selectedYear !== 'all') params.set('year', selectedYear);
    if (selectedDepartment !== 'all') params.set('department', selectedDepartment);
    if (debouncedQuery) params.set('q', debouncedQuery);
    return params;
  };

  // ดึงรายชื่อจาก backend ทีละหน้า (หน้าละ PAGE_SIZE คน) — กดถัดไปแล้วค่อยโหลดหน้าถัดไป
  const fetchStudentData = async (targetPage = page) => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    try {
      const params = filterParams();
      params.set('page', String(targetPage));
      params.set('limit', String(PAGE_SIZE));
      const res = await fetch(`${API_BASE}/users/students/paged?${params}`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'ไม่สามารถโหลดรายชื่อนักศึกษาได้');
      if (seq !== requestSeqRef.current) return; // มีคำขอใหม่กว่าแล้ว ทิ้งผลเก่า

      const meta = json.meta || {};
      if ((json.data || []).length === 0 && targetPage > 1) {
        setPage(Math.max(1, Math.min(targetPage - 1, meta.totalPages || 1)));
        return;
      }
      setStudents(json.data || []);
      setTotal(meta.total || 0);
      setTotalPages(meta.totalPages || 1);
      setTotalWithSlips(meta.totalWithSlips || 0);
      if (Array.isArray(meta.years) && meta.years.length > 0) setYears(Array.from(new Set(['66', ...meta.years])).sort());
    } catch (error) {
      console.error('Failed to load students', error);
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  };

  // ดึงข้อมูลสำหรับ Export (ทั้งหมดที่กรองอยู่ หรือเฉพาะที่เลือก) พร้อมรูปสลิป
  const loadExportList = async (scope) => {
    const params = scope === 'selected' ? new URLSearchParams() : filterParams();
    if (scope === 'selected') params.set('codes', selectedStudentCodes.join(','));
    params.set('limit', 'all');
    params.set('includeSlip', '1');
    const res = await fetch(`${API_BASE}/users/students/paged?${params}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'โหลดข้อมูลสำหรับ Export ไม่สำเร็จ');
    return json.data || [];
  };

  const runExport = async (kind, scope) => {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      const list = await loadExportList(scope);
      if (kind === 'receipts') await handleExportReceipts(list);
      else await handleExportBatchSlips(list);
    } catch (err) {
      setToast({ open: true, message: err.message || 'Export ไม่สำเร็จ', severity: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  // รูปสลิปเต็มโหลดเมื่อกดดูเท่านั้น (หน้ารายการไม่แนบรูปมาให้เพื่อความเร็ว)
  const fetchSlipDataUrl = async (paymentId) => {
    const res = await fetch(`${API_BASE}/payments/${paymentId}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'ไม่สามารถโหลดสลิปได้');
    return json.data?.slipDataUrl || null;
  };

  const openSlip = async (student) => {
    try {
      const imageUrl = await fetchSlipDataUrl(student.paymentId);
      if (!imageUrl) throw new Error('ไม่พบรูปสลิป');
      setSlipModal({ open: true, imageUrl, paymentId: student.paymentId, studentCode: student.student_code || student.username, studentName: student.full_name, paymentStatus: student.paymentStatus });
    } catch (err) {
      setToast({ open: true, message: err.message, severity: 'error' });
    }
  };

  const downloadSlipFor = async (student) => {
    try {
      const imageUrl = await fetchSlipDataUrl(student.paymentId);
      handleDownloadSingleSlip({ ...student, paymentSlip: imageUrl });
    } catch (err) {
      setToast({ open: true, message: err.message, severity: 'error' });
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role !== 'admin') {
        navigate('/dashboard'); 
        return;
      }
    } else {
      navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/'));
      return;
    }

  }, [navigate]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // เปลี่ยนตัวกรอง -> กลับหน้า 1, เปลี่ยนหน้า -> โหลดหน้านั้น
  const filtersKey = `${selectedYear}|${selectedDepartment}|${debouncedQuery}`;
  const lastFiltersKeyRef = useRef(filtersKey);
  useEffect(() => {
    if (lastFiltersKeyRef.current !== filtersKey) {
      lastFiltersKeyRef.current = filtersKey;
      if (page !== 1) { setPage(1); return; }
    }
    fetchStudentData(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filtersKey]);

  const availableYears = years;
  const filteredStudents = students; // แถวของหน้าปัจจุบัน (กรอง/แบ่งหน้าที่ฝั่ง backend แล้ว)

  useEffect(() => {
    setSelectedStudentCodes([]);
    selectedCacheRef.current.clear();
  }, [selectedDepartment, selectedYear, debouncedQuery]);

  const currentPage = Math.min(page, totalPages);
  const rangeFrom = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeTo = total === 0 ? 0 : Math.min(rangeFrom + students.length - 1, total);

  const goToPage = (nextPage) => {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
    document.querySelector('.compact-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isAllSelected = useMemo(() => {
    if (students.length === 0) return false;
    return students.every(s => selectedStudentCodes.includes(s.student_code || s.username));
  }, [students, selectedStudentCodes]);

  const selectedStudents = useMemo(
    () => selectedStudentCodes.map(code => selectedCacheRef.current.get(code)).filter(Boolean),
    [selectedStudentCodes]
  );

  const selectedWithSlips = useMemo(() => {
    return selectedStudents.filter(s => Boolean(s.hasSlip));
  }, [selectedStudents]);



  const activeMenuStudent = filteredStudents.find(
    (s) => (s.student_code || s.username) === actionMenu.id
  );

  const handleSelectAll = (e) => {
    const pageCodes = students.map(s => s.student_code || s.username).filter(Boolean);
    if (e.target.checked) {
      students.forEach(st => selectedCacheRef.current.set(st.student_code || st.username, st));
      setSelectedStudentCodes(prev => Array.from(new Set([...prev, ...pageCodes])));
    } else {
      pageCodes.forEach(code => selectedCacheRef.current.delete(code));
      setSelectedStudentCodes(prev => prev.filter(code => !pageCodes.includes(code)));
    }
  };

  const handleToggleSelect = (student) => {
    const code = student.student_code || student.username;
    if (selectedStudentCodes.includes(code)) {
      selectedCacheRef.current.delete(code);
      setSelectedStudentCodes(prev => prev.filter(c => c !== code));
    } else {
      selectedCacheRef.current.set(code, student);
      setSelectedStudentCodes(prev => [...prev, code]);
    }
  };

  const handleOpenDeleteSingle = (student) => {
    setDeleteModal({
      open: true,
      targetStudents: [student],
      deleteRequests: true,
      deleteCheckins: true,
      deletePayments: true,
      deleteUser: false,
      submitting: false,
    });
  };

  const handleOpenDeleteBatch = () => {
    const targetStudents = selectedStudents;
    setDeleteModal({
      open: true,
      targetStudents,
      deleteRequests: true,
      deleteCheckins: true,
      deletePayments: true,
      deleteUser: false,
      submitting: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.targetStudents.length === 0) return;

    setDeleteModal(prev => ({ ...prev, submitting: true }));

    const targetCodes = deleteModal.targetStudents.map(s => s.student_code || s.username || s.studentId);

    try {
      const res = await fetch(`${API_BASE}/admin/delete-student-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          studentIds: targetCodes,
          deleteRequests: deleteModal.deleteRequests,
          deleteCheckins: deleteModal.deleteCheckins,
          deletePayments: deleteModal.deletePayments,
          deleteUser: deleteModal.deleteUser,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'ไม่สามารถลบข้อมูลได้');
      }

      setToast({ open: true, message: data.message || 'ลบข้อมูลเรียบร้อยแล้ว', severity: 'success' });
      setDeleteModal({ open: false, targetStudents: [], deleteRequests: true, deleteCheckins: true, deletePayments: true, deleteUser: false, submitting: false });
      setSelectedStudentCodes([]);
      selectedCacheRef.current.clear();

      // Reload data
      fetchStudentData();
    } catch (err) {
      setToast({ open: true, message: err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล', severity: 'error' });
      setDeleteModal(prev => ({ ...prev, submitting: false }));
    }
  };

  // Export single slip
  const handleDownloadSingleSlip = (student) => {
    if (!student || !student.paymentSlip) {
      setToast({ open: true, message: 'นักศึกษาคนนี้ยังไม่ได้แนบสลิปการชำระเงิน', severity: 'warning' });
      return;
    }
    const studentCode = student.student_code || student.username || 'student';
    const studentName = (student.full_name || '').replace(/[\/\\]/g, '_').trim();
    const ext = student.paymentSlip.includes('image/jpeg') ? 'jpg' : (student.paymentSlip.includes('image/png') ? 'png' : 'jpg');
    const fileName = `สลิป_${studentCode}_${studentName || 'นักศึกษา'}.${ext}`;

    const blob = dataUrlToBlob(student.paymentSlip);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setToast({ open: true, message: `ดาวน์โหลดสลิปของ ${student.full_name || studentCode} เรียบร้อยแล้ว`, severity: 'success' });
    }
  };

  // Export multiple slips (ZIP)
  const handleExportBatchSlips = async (targetStudentList) => {
    const listWithSlips = (targetStudentList || []).filter(s => Boolean(s.paymentSlip));
    if (listWithSlips.length === 0) {
      setToast({ open: true, message: 'ไม่มีหลักฐานสลิปการชำระเงินของนักศึกษาที่เลือก', severity: 'warning' });
      return;
    }

    if (listWithSlips.length === 1) {
      handleDownloadSingleSlip(listWithSlips[0]);
      return;
    }

    setExportingSlips(true);
    try {
      const zip = new JSZip();

      listWithSlips.forEach((student, idx) => {
        const studentCode = student.student_code || student.username || `student_${idx + 1}`;
        const studentName = (student.full_name || '').replace(/[\/\\]/g, '_').trim();
        const ext = student.paymentSlip.includes('image/jpeg') ? 'jpg' : (student.paymentSlip.includes('image/png') ? 'png' : 'jpg');
        const fileName = `สลิป_${studentCode}_${studentName || 'นักศึกษา'}.${ext}`;

        const base64Data = student.paymentSlip.split(',')[1] || student.paymentSlip;
        zip.file(fileName, base64Data, { base64: true });
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const nowStr = new Date().toISOString().slice(0, 10);
      const zipName = `สลิปชำระเงิน_นักศึกษา_${nowStr}.zip`;

      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      setToast({ open: true, message: `Export สลีปเรียบร้อยแล้ว (${listWithSlips.length} ไฟล์)`, severity: 'success' });
    } catch (err) {
      console.error('Export slips error:', err);
      setToast({ open: true, message: 'เกิดข้อผิดพลาดในการ Export สลีป', severity: 'error' });
    } finally {
      setExportingSlips(false);
    }
  };

  const handleDownloadSlipFromModal = () => {
    if (!slipModal.imageUrl) return;
    const studentCode = slipModal.studentCode || 'student';
    const studentName = (slipModal.studentName || '').replace(/[\/\\]/g, '_').trim();
    const ext = slipModal.imageUrl.includes('image/jpeg') ? 'jpg' : (slipModal.imageUrl.includes('image/png') ? 'png' : 'jpg');
    const fileName = `สลิป_${studentCode}_${studentName || 'นักศึกษา'}.${ext}`;

    const blob = dataUrlToBlob(slipModal.imageUrl);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  };

  const handleUpdatePaymentStatus = async (action) => {
    if (!slipModal.paymentId) return;
    try {
      const res = await fetch(`${API_BASE}/payments/${slipModal.paymentId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        }
      });
      if (!res.ok) throw new Error('เกิดข้อผิดพลาดในการอัปเดต');
      
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      setStudents(prev => prev.map(s => {
        if (s.paymentId === slipModal.paymentId) {
          return { ...s, paymentStatus: newStatus };
        }
        return s;
      }));
      
      setSlipModal({ open: false, imageUrl: '', paymentId: null, studentCode: null, studentName: null, paymentStatus: null });
      setToast({ open: true, message: 'อัปเดตสถานะการชำระเงินเรียบร้อยแล้ว', severity: 'success' });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>รายชื่อนักศึกษา</h1>
            <p>จัดการข้อมูลนักศึกษาในระบบ</p>
          </div>
        </header>

        <div className="content-section">
          <div className="section-header">
            <h2>นักศึกษาทั้งหมด ({total})</h2>
          </div>

          {/* Filters & Bulk Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <TextField
                select
                size="small"
                label="คัดกรองรหัสปี"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="all">ทุกชั้นปี (ทั้งหมด)</MenuItem>
                {availableYears.map((yr) => (
                  <MenuItem key={yr} value={yr}>รหัส {yr} (ปี {yr})</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="คัดกรองสาขา"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                sx={{ minWidth: 260 }}
              >
                <MenuItem value="all">ทั้งหมดทุกสาขา</MenuItem>
                {departmentOptions.map((dept) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </TextField>

              <TextField
                size="small"
                label="ค้นหา รหัส / ชื่อ-สกุล"
                placeholder="พิมพ์เพื่อค้นหา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ minWidth: 220 }}
              />
            </div>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {selectedStudentCodes.length > 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#f8fafc', p: 0.75, px: 1.5, borderRadius: 2, border: '1.5px solid #e2e8f0', flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                    เลือกแล้ว {selectedStudentCodes.length} คน
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => runExport('receipts', 'selected')}
                    startIcon={<PrinterIcon style={{ width: 16, height: 16 }} />}
                    sx={{ 
                      borderRadius: 1.75, 
                      fontWeight: 700, 
                      textTransform: 'none',
                      bgcolor: '#166534',
                      '&:hover': { bgcolor: '#14532d' }
                    }}
                  >
                    Export ใบสำคัญรับเงิน ({selectedStudents.length})
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={selectedWithSlips.length === 0 || exportingSlips}
                    onClick={() => runExport('slips', 'selected')}
                    startIcon={<ArrowDownTrayIcon style={{ width: 16, height: 16 }} />}
                    sx={{ 
                      borderRadius: 1.75, 
                      fontWeight: 700, 
                      textTransform: 'none',
                      bgcolor: '#6d28d9',
                      '&:hover': { bgcolor: '#5b21b6' }
                    }}
                  >
                    {exportingSlips ? 'กำลัง Export...' : `Export สลีป (${selectedWithSlips.length})`}
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    onClick={handleOpenDeleteBatch}
                    startIcon={<TrashIcon style={{ width: 16, height: 16 }} />}
                    sx={{ borderRadius: 1.75, fontWeight: 700, textTransform: 'none' }}
                  >
                    ลบข้อมูลที่เลือก ({selectedStudentCodes.length})
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={total === 0 || exportLoading}
                    onClick={() => runExport('receipts', 'all')}
                    startIcon={<PrinterIcon style={{ width: 16, height: 16 }} />}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: 'none',
                      borderColor: '#166534',
                      color: '#166534',
                      bgcolor: '#f0fdf4',
                      '&:hover': { borderColor: '#14532d', bgcolor: '#dcfce7' },
                      '&.Mui-disabled': { borderColor: '#e2e8f0', color: '#94a3b8', bgcolor: '#f8fafc' }
                    }}
                  >
                    Export ใบสำคัญรับเงินทั้งหมด ({total})
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={totalWithSlips === 0 || exportingSlips || exportLoading}
                    onClick={() => runExport('slips', 'all')}
                    startIcon={<ArrowDownTrayIcon style={{ width: 16, height: 16 }} />}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: 'none',
                      borderColor: '#6d28d9',
                      color: '#6d28d9',
                      bgcolor: '#f5f3ff',
                      '&:hover': { borderColor: '#5b21b6', bgcolor: '#ede9fe' },
                      '&.Mui-disabled': { borderColor: '#e2e8f0', color: '#94a3b8', bgcolor: '#f8fafc' }
                    }}
                  >
                    {exportingSlips ? 'กำลัง Export...' : `Export สลีปทั้งหมด (${totalWithSlips})`}
                  </Button>
                </Box>
              )}
            </Box>
          </div>

          <TableContainer component={Box} className="compact-table" sx={{ opacity: loading && students.length > 0 ? 0.5 : 1, transition: 'opacity 0.15s ease' }}>
            {loading && students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 w-full">
                  <Loader2 className="w-8 h-8 text-violet-600 animate-spin stroke-[2.2]" />
                  <p className="text-xs font-medium text-slate-400 mt-3 m-0">กำลังโหลดข้อมูลรายชื่อนักศึกษา...</p>
                </div>
            ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={selectedStudentCodes.length > 0 && !isAllSelected}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>รหัสนักศึกษา</TableCell>
                  <TableCell>ชื่อ-นามสกุล</TableCell>
                  <TableCell>สาขา</TableCell>
                  <TableCell>อีเมล</TableCell>
                  <TableCell>เบอร์โทร</TableCell>
                  <TableCell>สถานะคำร้อง</TableCell>
                  <TableCell>การชำระเงิน</TableCell>
                  <TableCell align="center">การกระทำ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.length > 0 ? students.map((student) => {
                  const studentCode = student.student_code || student.username;
                  const isChecked = selectedStudentCodes.includes(studentCode);

                  return (
                    <TableRow key={studentCode} hover selected={isChecked}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isChecked}
                          onChange={() => handleToggleSelect(student)}
                        />
                      </TableCell>
                      <TableCell>{student.student_code}</TableCell>
                      <TableCell>{student.full_name}</TableCell>
                      <TableCell>{student.major || student.department || '-'}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.phone}</TableCell>
                      <TableCell>
                        <span className="status-badge" style={{ 
                          background: student.requestStatus === 'อนุมัติแล้ว' ? '#dcfce7' : student.requestStatus?.includes('ไม่อนุมัติ') ? '#fee2e2' : student.requestStatus === 'ยังไม่ยื่นคำร้อง' ? '#f3f4f6' : '#e0e7ff', 
                          color: student.requestStatus === 'อนุมัติแล้ว' ? '#166534' : student.requestStatus?.includes('ไม่อนุมัติ') ? '#991b1b' : student.requestStatus === 'ยังไม่ยื่นคำร้อง' ? '#4b5563' : '#3730a3',
                          fontSize: '12px', padding: '4px 8px', borderRadius: '4px', display: 'inline-block'
                        }}>
                          {student.requestStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="status-badge" style={{ 
                            background: student.paymentStatus === 'approved' ? '#dcfce7' : student.paymentStatus === 'rejected' ? '#fee2e2' : student.paymentStatus === 'pending' ? '#fef3c7' : '#f3f4f6', 
                            color: student.paymentStatus === 'approved' ? '#166534' : student.paymentStatus === 'rejected' ? '#991b1b' : student.paymentStatus === 'pending' ? '#92400e' : '#4b5563',
                            fontSize: '12px', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', whiteSpace: 'nowrap'
                          }}>
                            {student.paymentStatus === 'approved' ? 'ชำระเงินแล้ว' : student.paymentStatus === 'pending' ? 'รอตรวจสอบ' : student.paymentStatus === 'rejected' ? 'ไม่อนุมัติ' : 'ยังไม่ชำระเงิน'}
                          </span>
                          {student.hasSlip && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <button 
                                onClick={() => openSlip(student)}
                                style={{ border: 'none', background: 'none', color: '#be185d', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', padding: 0, fontWeight: 700 }}
                              >
                                ดูสลิป
                              </button>
                              <Tooltip title="ดาวน์โหลดสลิป (Export Image)" arrow>
                                <IconButton 
                                  size="small" 
                                  onClick={() => downloadSlipFor(student)}
                                  sx={{ p: 0.25, color: '#6d28d9', '&:hover': { bgcolor: '#ede9fe' } }}
                                >
                                  <ArrowDownTrayIcon style={{ width: 15, height: 15 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                          <Tooltip title="พิมพ์/Export ใบสำคัญรับเงิน (Receipt)" arrow>
                            <IconButton 
                              size="small" 
                              onClick={() => handleExportReceipts([student])}
                              sx={{ p: 0.25, color: '#166534', '&:hover': { bgcolor: '#dcfce7' } }}
                            >
                              <PrinterIcon style={{ width: 15, height: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleToggleActionMenu(e, studentCode)}
                          className="action-menu-trigger"
                          aria-label="ตัวเลือกการจัดการ"
                          title="การกระทำ"
                          sx={{ p: 0.75, color: '#94a3b8', '&:hover': { bgcolor: 'rgba(241,245,249,0.8)', color: '#475569' }, '&:active': { bgcolor: 'rgba(226,232,240,0.6)' } }}
                        >
                          <MoreVertical className="w-4 h-4 stroke-[2]" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                    <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 2.5 }}>ไม่พบข้อมูลนักศึกษา</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
            )}
          </TableContainer>

          {total > 0 && (
            <nav className="pager" aria-label="เปลี่ยนหน้ารายชื่อนักศึกษา">
              <span className="pager-info">
                แสดง {rangeFrom}-{rangeTo} จาก {total} คน
              </span>
              <div className="pager-controls">
                <button type="button" className="pager-btn" disabled={currentPage <= 1 || loading} onClick={() => goToPage(currentPage - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                  ก่อนหน้า
                </button>
                <span className="pager-page">หน้า {currentPage} / {totalPages}</span>
                <button type="button" className="pager-btn" disabled={currentPage >= totalPages || loading} onClick={() => goToPage(currentPage + 1)}>
                  ถัดไป
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </nav>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <Dialog
          open={deleteModal.open}
          onClose={() => !deleteModal.submitting && setDeleteModal(prev => ({ ...prev, open: false }))}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', bgcolor: '#ffffff', borderBottom: '1px solid #f1f5f9', py: 2.5, px: 3, display: 'flex', alignItems: 'center', gap: 1.75 }}>
            <Box sx={{ width: 46, height: 46, borderRadius: 3, bgcolor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0, border: '1px solid #fecaca' }}>
              <TrashIcon style={{ width: 24, height: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2, fontSize: '1.15rem' }}>
                ยืนยันการลบข้อมูลนักศึกษา
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                เลือกรายการข้อมูลที่ต้องการลบออกอย่างถาวร ({deleteModal.targetStudents.length} รายการ)
              </Typography>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ p: 3, pt: '20px !important', bgcolor: '#ffffff' }}>
            {/* Warning & Target Student Header */}
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

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pt: 1, borderTop: '1px dashed #fca5a5' }}>
                <Typography variant="caption" sx={{ color: '#7f1d1d', fontWeight: 700 }}>
                  นักศึกษาที่เลือก ({deleteModal.targetStudents.length}):
                </Typography>
                {deleteModal.targetStudents.map(s => (
                  <Box
                    key={s.student_code || s.username}
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
                      {s.student_code || s.username} - {s.full_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                      ({s.major || s.department || '-'})
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Option Cards */}
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
                  justifyContent: 'space-between',
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
                    justifyContent: 'center',
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
                  justifyContent: 'space-between',
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
                    justifyContent: 'center',
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
                  justifyContent: 'space-between',
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

          <DialogActions sx={{ p: 2.5, px: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <ModalActions className="!pt-0 !mt-0 !border-0 w-full">
              <ModalCancelButton onClick={() => setDeleteModal(prev => ({ ...prev, open: false }))} disabled={deleteModal.submitting}>ยกเลิก</ModalCancelButton>
              <ModalConfirmButton
                tone="danger"
                onClick={handleConfirmDelete}
                disabled={!deleteModal.deleteRequests && !deleteModal.deleteCheckins && !deleteModal.deletePayments}
                loading={deleteModal.submitting}
              >
                {deleteModal.submitting ? 'กำลังลบข้อมูล...' : 'ยืนยันการลบข้อมูลที่เลือก'}
              </ModalConfirmButton>
            </ModalActions>
          </DialogActions>
        </Dialog>

        {/* Payment Slip Dialog */}
        <Dialog open={slipModal.open} onClose={() => setSlipModal({ open: false, imageUrl: '', paymentId: null, studentCode: null, studentName: null, paymentStatus: null })} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CreditCardIcon style={{ width: 20, height: 20, color: '#6d28d9' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                หลักฐานการชำระเงิน {slipModal.studentName ? `(${slipModal.studentName})` : ''}
              </Typography>
            </Box>
            <Button size="small" onClick={() => setSlipModal({ open: false, imageUrl: '', paymentId: null, studentCode: null, studentName: null, paymentStatus: null })} sx={{ color: '#64748b' }}>
              ปิด
            </Button>
          </DialogTitle>
          <DialogContent sx={{ textAlign: 'center', p: 3, bgcolor: '#f8fafc' }}>
            {slipModal.imageUrl ? (
              <img 
                src={slipModal.imageUrl} 
                alt="Payment Slip" 
                style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} 
              />
            ) : null}
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2, bgcolor: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="contained" 
                onClick={handleDownloadSlipFromModal}
                startIcon={<ArrowDownTrayIcon style={{ width: 16, height: 16 }} />}
                sx={{ bgcolor: '#6d28d9', '&:hover': { bgcolor: '#5b21b6' }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                ดาวน์โหลดสลิป
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => {
                  const s = students.find(x => (x.student_code || x.username) === slipModal.studentCode) || {
                    student_code: slipModal.studentCode,
                    full_name: slipModal.studentName,
                    paymentSlip: slipModal.imageUrl
                  };
                  handleExportReceipts([{ ...s, paymentSlip: slipModal.imageUrl }]);
                }}
                startIcon={<PrinterIcon style={{ width: 16, height: 16 }} />}
                sx={{ borderColor: '#166534', color: '#166534', '&:hover': { bgcolor: '#f0fdf4' }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                พิมพ์ใบสำคัญรับเงิน (PDF)
              </Button>
            </Box>
            <div style={{ display: 'flex', gap: '8px' }}>
              {slipModal.paymentId && slipModal.paymentStatus !== 'approved' && (
                <>
                  <ModalConfirmButton tone="approve" onClick={() => handleUpdatePaymentStatus('approve')}>อนุมัติ</ModalConfirmButton>
                  <ModalConfirmButton tone="danger" onClick={() => handleUpdatePaymentStatus('reject')}>ไม่อนุมัติ</ModalConfirmButton>
                </>
              )}
            </div>
          </DialogActions>
        </Dialog>

        {/* Notification Toast */}
        <Snackbar
          open={toast.open}
          autoHideDuration={3000}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        </Snackbar>

        {/* Hidden Printable Receipts Container for react-to-print */}
        <div style={{ display: 'none' }}>
          <PrintablePaymentReceipt ref={printReceiptRef} students={receiptStudents} />
        </div>
      </main>

      {/* Action Dropdown Panel — เรนเดอร์ผ่าน Portal เพื่อหลบการถูก clip โดย overflow ของตาราง */}
      {actionMenu.id && activeMenuStudent && createPortal(
        <div
          ref={menuPanelRef}
          className="w-40 bg-white rounded-2xl p-1.5 border border-violet-100 z-[99] flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
          style={{
            position: 'fixed',
            top: actionMenu.top,
            left: actionMenu.left,
            backgroundColor: '#ffffff',
            boxShadow: '0 12px 32px rgba(124, 58, 237, 0.12)',
            borderColor: '#ede9fe',
          }}
        >
          {/* รายการที่ 1: ดูรายละเอียด */}
          <Link
            to={`/dashboard/student/${activeMenuStudent.student_code || activeMenuStudent.username}`}
            onClick={closeActionMenu}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition text-left no-underline cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-400" />
            <span>ดูรายละเอียด</span>
          </Link>

          {/* เส้นคั่นบางๆ */}
          <div className="border-t border-slate-100 my-0.5" />

          {/* รายการที่ 2: ลบข้อมูล (เปิด Confirmation Dialog ยืนยันก่อนลบทุกครั้ง) */}
          <button
            type="button"
            onClick={() => {
              closeActionMenu();
              handleOpenDeleteSingle(activeMenuStudent);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition text-left cursor-pointer border-none bg-transparent outline-none"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>ลบข้อมูล</span>
          </button>
        </div>,
        document.body
      )}
    </>
  );
};

export default StudentListPage;


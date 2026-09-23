import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Snackbar, Alert as MuiAlert, Alert, InputAdornment, IconButton } from '@mui/material';
import { QRCodeCanvas } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import api from '../../../api/axios';
import './RequestDetailsPage.css';
import PrintableEvaluationForm from '../../../components/PrintableEvaluationForm';
import { ChartBarIcon, PrinterIcon, EyeIcon, ArrowDownTrayIcon, DocumentTextIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { Pencil, CalendarDays, Check, X, Copy, ExternalLink, FileText, UploadCloud } from 'lucide-react';
import { formatAddress } from '../../../utils/formatters';
import { isStudentEditableStatus } from '../../Student/Dashboard/MyRequestsPage';

const dataUrlToBlobUrl = (dataUrl) => {
  if (!dataUrl) return '';
  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Failed to convert dataUrl to blob:', err);
    return dataUrl;
  }
};

const handleDownloadFile = (dataUrl, fileName = 'หนังสือส่งตัวฝึกงาน.pdf') => {
  if (!dataUrl) return;
  try {
    const blobUrl = dataUrlToBlobUrl(dataUrl);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

const RequestDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('student');
  const [request, setRequest] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [advisorEvaluation, setAdvisorEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState({ open: false, reason: '' });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [qrModal, setQrModal] = useState({ open: false, link: '', loading: false, error: '', navigateOnClose: false, copied: false, expiresAt: '' });
  const [editEvalEmailModal, setEditEvalEmailModal] = useState({ open: false, email: '', submitting: false, error: '' });
  const [dispatchModal, setDispatchModal] = useState({ open: false, file: null, comment: '', startDate: '', endDate: '', submitting: false, error: '' });
  const [scheduleModal, setScheduleModal] = useState({
    open: false,
    startDate: '',
    endDate: '',
    internshipTerm: '',
    note: '',
    submitting: false,
    error: ''
  });
  const [imageModal, setImageModal] = useState(false);
  const [docModal, setDocModal] = useState({ open: false, dataUrl: '', fileName: '', blobUrl: '' });
  const dispatchFileInputRef = useRef(null);
  const printRef = useRef(null);
  const qrCanvasRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Evaluation_${request?.studentId || 'Report'}`,
  });

  useEffect(() => {
    // 1. Get User Role
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userStr);
    const normalizedRole = String(user.role || '').toLowerCase();
    setUserRole(normalizedRole);

    // 2. Load Request and Evaluation Details from API
    Promise.all([
      api.get(`/requests/${id}`),
      api.get(`/evaluations/request/${id}`).catch(() => ({ data: { data: null } })),
      api.get(`/advisor-evaluations/request/${id}`).catch(() => ({ data: { data: null } }))
    ]).then(([reqRes, evalRes, advisorEvalRes]) => {
      if (reqRes.data.data) {
        setRequest(reqRes.data.data);
        setEvaluation(evalRes.data.data);
        setAdvisorEvaluation(advisorEvalRes.data.data);
      } else {
        setToast({ open: true, message: 'ไม่พบข้อมูลคำร้อง', severity: 'error' });
        navigate(-1);
      }
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load data:', err);
      setToast({ open: true, message: 'ไม่พบข้อมูลคำร้อง', severity: 'error' });
      setLoading(false);
      navigate(-1);
    });
  }, [id, navigate]);

  // Lightbox: ล็อก scroll หน้าหลักและรองรับปิดด้วยปุ่ม Esc
  useEffect(() => {
    if (!imageModal) return;
    const handleEsc = (event) => {
      if (event.key === 'Escape') setImageModal(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleEsc);
    };
  }, [imageModal]);

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    reader.readAsDataURL(file);
  });

  const handleApprove = async () => {
    if (userRole === 'advisor') {
      try {
        await api.patch(`/requests/${id}/status`, { status: 'รอผู้ดูแลระบบตรวจสอบ' });
        setRequest({ ...request, status: 'รอผู้ดูแลระบบตรวจสอบ' });
        setToast({ open: true, message: 'อนุมัติคำร้องเรียบร้อยแล้ว', severity: 'success' });
        navigate(-1);
      } catch (err) {
        setToast({ open: true, message: 'อัปเดตล้มเหลว: ' + (err.response?.data?.message || err.message), severity: 'error' });
      }
      return;
    }

    if (userRole === 'admin') {
      handleOpenDispatchModal();
    }
  };

  const handleOpenScheduleModal = () => {
    const currentStart = request?.internship_start_date || request?.details?.startDate || '';
    const currentEnd = request?.internship_end_date || request?.details?.endDate || '';
    const currentTerm = request?.details?.internshipTerm === 'term1' 
      ? 'ภาคการศึกษาที่ 1' 
      : request?.details?.internshipTerm === 'term2' 
        ? 'ภาคการศึกษาที่ 2' 
        : (request?.details?.internshipTerm || '');
    const currentNote = request?.details?.internshipDateNote || '';

    setScheduleModal({
      open: true,
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

      await api.patch(`/requests/${id}/internship-period`, payload);

      setRequest((prev) => ({
        ...prev,
        internship_start_date: scheduleModal.startDate,
        internship_end_date: scheduleModal.endDate,
        details: {
          ...(prev?.details || {}),
          startDate: scheduleModal.startDate,
          endDate: scheduleModal.endDate,
          internshipTerm: scheduleModal.internshipTerm,
          internshipDateNote: scheduleModal.note
        }
      }));

      setScheduleModal((prev) => ({ ...prev, open: false, submitting: false }));
      setToast({ open: true, message: 'บันทึกกำหนดวันฝึกงานเรียบร้อยแล้ว', severity: 'success' });
    } catch (err) {
      setScheduleModal((prev) => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || err.message || 'บันทึกวันฝึกงานล้มเหลว'
      }));
    }
  };

  const handleOpenDispatchModal = () => {
    if (dispatchFileInputRef.current) {
      dispatchFileInputRef.current.value = '';
    }
    const currentStart = request?.internship_start_date || request?.details?.startDate || '';
    const currentEnd = request?.internship_end_date || request?.details?.endDate || '';
    setDispatchModal({
      open: true,
      file: null,
      comment: '',
      startDate: currentStart ? String(currentStart).slice(0, 10) : '',
      endDate: currentEnd ? String(currentEnd).slice(0, 10) : '',
      submitting: false,
      error: ''
    });
  };

  const handleDispatchModalClose = () => {
    if (dispatchFileInputRef.current) {
      dispatchFileInputRef.current.value = '';
    }
    setDispatchModal({ open: false, file: null, comment: '', startDate: '', endDate: '', submitting: false, error: '' });
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
      setDispatchModal((prev) => ({ ...prev, error: 'กรุณาเลือกไฟล์หนังสือขอแหล่งฝึกงานก่อนอนุมัติ' }));
      return;
    }
    setDispatchModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      const dataUrl = await fileToDataUrl(dispatchModal.file);
      const isStartInternshipWaiting = ['รออาจารย์อนุมัติเริ่มฝึกงาน', 'รอแอดมินอนุมัติเริ่มฝึกงาน', 'อนุมัติแล้ว'].includes(request?.status);
      const newStatus = isStartInternshipWaiting ? 'ออกฝึกงาน' : 'รอสถานประกอบการตอบรับ';

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

      await api.patch(`/requests/${id}/status`, payload);
      const updated = {
        ...request,
        status: newStatus,
        admin_comment: dispatchModal.comment?.trim() || null,
        dispatchLetter: { fileName: dispatchModal.file.name, dataUrl },
        internship_start_date: dispatchModal.startDate || request.internship_start_date,
        internship_end_date: dispatchModal.endDate || request.internship_end_date,
        details: {
          ...(request.details || {}),
          startDate: dispatchModal.startDate || request.details?.startDate,
          endDate: dispatchModal.endDate || request.details?.endDate,
        }
      };
      setRequest(updated);
      setToast({
        open: true,
        message: isStartInternshipWaiting ? 'อนุมัติการออกฝึกงานและแนบหนังสือส่งตัวเรียบร้อยแล้ว' : 'ตรวจสอบและส่งคำขอไปยังสถานประกอบการเรียบร้อยแล้ว',
        severity: 'success'
      });
      handleDispatchModalClose();

      if (!isStartInternshipWaiting) {
        await handleOpenResponseQr(true);
      } else {
        navigate(-1);
      }
    } catch (err) {
      setDispatchModal((prev) => ({ ...prev, submitting: false, error: err.response?.data?.message || err.message || 'อัปเดตล้มเหลว' }));
    }
  };

  const handleOpenResponseQr = async (navigateOnClose = false) => {
    setQrModal({ open: true, link: '', loading: true, error: '', navigateOnClose, copied: false, expiresAt: '' });
    try {
      const res = await api.post(`/requests/${id}/response-qr`);
      const responseUrl = res.data?.data?.responseUrl;
      if (!responseUrl) throw new Error('ไม่พบ URL สำหรับตอบรับ');
      const link = /^https?:\/\//i.test(responseUrl)
        ? responseUrl
        : new URL(responseUrl, window.location.origin).href;
      setQrModal({ open: true, link, loading: false, error: '', navigateOnClose, copied: false, expiresAt: res.data?.data?.expiresAt || '' });
    } catch (err) {
      setQrModal({
        open: true,
        link: '',
        loading: false,
        error: err.response?.data?.message || err.message || 'ไม่สามารถสร้าง QR Code ได้',
        navigateOnClose,
        copied: false,
        expiresAt: ''
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrModal.link);
      setQrModal((prev) => ({ ...prev, copied: true }));
      setToast({ open: true, message: 'คัดลอกลิงก์แล้ว', severity: 'success' });
      setTimeout(() => setQrModal((prev) => ({ ...prev, copied: false })), 2500);
    } catch {
      setToast({ open: true, message: 'ไม่สามารถคัดลอกลิงก์ได้', severity: 'error' });
    }
  };

  const handleTestOpenLink = () => {
    if (qrModal.link) window.open(qrModal.link, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) {
      setToast({ open: true, message: 'ไม่สามารถดาวน์โหลด QR Code ได้', severity: 'error' });
      return;
    }
    const link = document.createElement('a');
    link.download = `company-response-qr-${id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setToast({ open: true, message: 'ดาวน์โหลด QR Code แล้ว', severity: 'success' });
  };

  // อีเมลผู้ประเมินจากสถานประกอบการ — backend อนุญาตเฉพาะ admin/advisor
  const handleSaveEvalEmail = async () => {
    const email = editEvalEmailModal.email.trim();
    if (!email) {
      setEditEvalEmailModal(prev => ({ ...prev, error: 'กรุณาระบุอีเมลผู้ประเมิน' }));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEditEvalEmailModal(prev => ({ ...prev, error: 'รูปแบบอีเมลไม่ถูกต้อง' }));
      return;
    }

    try {
      setEditEvalEmailModal(prev => ({ ...prev, submitting: true, error: '' }));
      const res = await api.patch(`/requests/${id}/status`, { status: request.status, evaluatorEmail: email });
      if (res.data?.data) {
        setRequest(res.data.data);
      } else {
        setRequest(prev => ({
          ...prev,
          evaluator_email: email,
          details: { ...(prev.details || {}), evaluatorEmail: email }
        }));
      }
      setToast({ open: true, message: 'บันทึกอีเมลผู้ประเมินเรียบร้อยแล้ว', severity: 'success' });
      setEditEvalEmailModal({ open: false, email: '', submitting: false, error: '' });
    } catch (err) {
      setEditEvalEmailModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || err.message || 'บันทึกอีเมลไม่สำเร็จ'
      }));
    }
  };

  const handleCloseQrModal = () => {
    const shouldNavigate = qrModal.navigateOnClose;
    setQrModal({ open: false, link: '', loading: false, error: '', navigateOnClose: false, copied: false, expiresAt: '' });
    if (shouldNavigate) navigate(-1);
  };

  const handleReject = () => {
    setRejectModal({ open: true, reason: '' });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal.reason.trim()) {
      setToast({ open: true, message: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ/ปฏิเสธ', severity: 'warning' });
      return;
    }

    let newStatus = '';
    if (userRole === 'advisor') {
      newStatus = 'ไม่อนุมัติ (อาจารย์)';
    } else if (userRole === 'admin') {
      newStatus = 'ไม่อนุมัติ (Admin)';
    }

    if (newStatus) {
      const reason = rejectModal.reason.trim();
      try {
        const commentField = userRole === 'advisor' ? 'advisor_comment' : 'admin_comment';
        await api.patch(`/requests/${id}/status`, { status: newStatus, [commentField]: reason });
        setRequest({ ...request, status: newStatus, rejectReason: reason });
        setToast({ open: true, message: 'บันทึกผลการไม่อนุมัติ/ปฏิเสธเรียบร้อย', severity: 'info' });
        setRejectModal({ open: false, reason: '' });
        navigate(-1);
      } catch (err) {
        setToast({ open: true, message: 'อัปเดตล้มเหลว: ' + (err.response?.data?.message || err.message), severity: 'error' });
      }
    }
  };

  const handleRejectClose = () => {
    setRejectModal({ open: false, reason: '' });
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'รออาจารย์ที่ปรึกษาอนุมัติ': { bg: '#fff3cd', color: '#856404' },
      'รอผู้ดูแลระบบตรวจสอบ': { bg: '#c3dafe', color: '#434190' },
      'รอสถานประกอบการตอบรับ': { bg: '#e2e8f0', color: '#2d3748' },
      'สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)': { bg: '#e0e7ff', color: '#4338ca', label: 'รอแอดมินออกใบส่งตัว' },
      'COMPANY_ACCEPTED': { bg: '#e0e7ff', color: '#4338ca', label: 'รอแอดมินออกใบส่งตัว' },
      'รอแอดมินออกใบส่งตัว': { bg: '#e0e7ff', color: '#4338ca', label: 'รอแอดมินออกใบส่งตัว' },
      'ตอบรับแล้ว': { bg: '#e0e7ff', color: '#4338ca', label: 'รอแอดมินออกใบส่งตัว' },
      'รออาจารย์อนุมัติเริ่มฝึกงาน': { bg: '#d1fae5', color: '#065f46', label: 'รอแอดมินอนุมัติการออกฝึกงาน' },
      'รอแอดมินอนุมัติเริ่มฝึกงาน': { bg: '#d1fae5', color: '#065f46', label: 'รอแอดมินอนุมัติการออกฝึกงาน' },
      'อนุมัติแล้ว': { bg: '#d1fae5', color: '#065f46', label: 'รอแอดมินอนุมัติการออกฝึกงาน' },
      'ออกฝึกงาน': { bg: '#c4f1f9', color: '#0c4a6e' },
      'ประเมินเสร็จแล้ว': { bg: '#ddd6fe', color: '#4c1d95' },
      'ฝึกงานเสร็จแล้ว': { bg: '#fbcfe8', color: '#9d174d' },
      'ไม่อนุมัติ (อาจารย์)': { bg: '#f8d7da', color: '#721c24' },
      'ไม่อนุมัติ (Admin)': { bg: '#f8d7da', color: '#721c24' },
      'ปฏิเสธ': { bg: '#f8d7da', color: '#721c24' }
    };
    const style = statusStyles[status] || { bg: '#e2e3e5', color: '#383d41' };
    return { ...style, label: style.label || status };
  };


  if (loading || !request) return <div className="loading">กำลังโหลดข้อมูล...</div>;

  const normalizedStatus = String(request.status || '').trim();
  const statusInfo = getStatusBadge(normalizedStatus || request.status);
  const details = request.details || {}; // Fields from NewRequestPage payload
  const studentPhotoSrc = details.studentPhoto?.dataUrl || details.studentPhoto || request.studentPhotoUrl || request.photo || '';
  const studentAddress = formatAddress(details.student_info?.address);
  const companyAddress = formatAddress(details.companyAddress || details.address);
  const internshipTermLabel = details.internshipTerm === 'term1'
    ? 'ภาคการศึกษาที่ 1'
    : details.internshipTerm === 'term2'
      ? 'ภาคการศึกษาที่ 2'
      : details.internshipTerm === 'summer'
        ? 'ภาคฤดูร้อน'
        : (details.internshipTerm || '');

  // Determine if current user can execute actions
  const isAdvisorPending = normalizedStatus === 'รออาจารย์ที่ปรึกษาอนุมัติ' || normalizedStatus === 'รออนุมัติ';
  const isAdminPending = normalizedStatus === 'รอผู้ดูแลระบบตรวจสอบ'
    || normalizedStatus === 'รอผู้ดูแลระบบอนุมัติ'
    || normalizedStatus === 'รออนุมัติ';
  const canApprove = (userRole === 'advisor' && isAdvisorPending) || (userRole === 'admin' && isAdminPending);

  return (
    <div className="request-details-container">
      <div className="details-card">
        <header className="details-header">
          <div className="details-header-text">
            <h2>รายละเอียดคำร้องฝึกงาน</h2>
            <p>เลขที่คำร้อง: {request.id} (ยื่นเมื่อ: {new Date(request.submittedDate).toLocaleDateString('th-TH')})</p>
            <span className="status-badge-lg" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
              {statusInfo.label}
            </span>
          </div>
          {studentPhotoSrc && (
            <div
              className="student-photo-btn"
              onClick={() => setImageModal(true)}
              title="คลิกเพื่อดูรูปขยาย"
            >
              <img
                src={studentPhotoSrc}
                alt="รูปนักศึกษา"
                className="student-photo-thumb"
              />
            </div>
          )}
        </header>

        <section className="detail-section">
          <h3>ข้อมูลนักศึกษา</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">ชื่อ-นามสกุล</span>
              <span className="detail-value">{request.studentName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">รหัสนักศึกษา</span>
              <span className="detail-value">{request.studentId}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">สาขาวิชา</span>
              <span className="detail-value">{request.department}</span>
            </div>
            {details.student_info?.lastSemesterGrade && (
              <div className="detail-item">
                <span className="detail-label">เกรดเฉลี่ยเทอมล่าสุด</span>
                <span className="detail-value">{details.student_info.lastSemesterGrade}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">โทรศัพท์ / อีเมลติดต่อ</span>
              <span className="detail-value">{details.student_info?.phone || '-'} / {details.student_info?.email || '-'}</span>
            </div>
            {studentAddress && studentAddress !== '-' && (
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">ที่อยู่ปัจจุบัน</span>
                <span className="detail-value">{studentAddress}</span>
              </div>
            )}
          </div>
        </section>

        <section className="detail-section">
          <h3>รายละเอียดสถานประกอบการ</h3>
          <div className="detail-grid">
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">1. ชื่อบุคคล / ชื่อตำแหน่งงานติดต่อ / ผู้ประสานงานที่ติดต่อ</span>
              <span className="detail-value">
                {details.contactPerson || '-'} {details.contactPosition ? `(${details.contactPosition})` : ''}
              </span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">2. ชื่อหน่วยงาน / บริษัทที่ติดต่อ</span>
              <span className="detail-value">{details.companyName || request.company}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">3. ที่อยู่หน่วยงาน</span>
              <span className="detail-value">{companyAddress}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">4. โทรศัพท์ / อีเมลติดต่อ</span>
              <span className="detail-value">{details.contactPhone || '-'} / {details.contactEmail || '-'}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">อีเมลผู้ประเมินจากสถานประกอบการ (สำหรับส่งแบบประเมิน)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                <span className="detail-value" style={{ fontWeight: 600, color: (request.evaluator_email || details.evaluatorEmail) ? '#1e293b' : '#94a3b8' }}>
                  {request.evaluator_email || details.evaluatorEmail || '(ยังไม่ระบุโดยสถานประกอบการ)'}
                </span>
                {(userRole === 'admin' || userRole === 'advisor') && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setEditEvalEmailModal({
                      open: true,
                      email: request.evaluator_email || details.evaluatorEmail || '',
                      submitting: false,
                      error: ''
                    })}
                    sx={{ fontSize: '0.78rem', py: 0.2, px: 1.2, borderRadius: 1.5 }}
                  >
                    แก้ไขอีเมลผู้ประเมิน
                  </Button>
                )}
              </div>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">5. ตำแหน่งงานที่ต้องการเข้าฝึกงาน</span>
              <span className="detail-value">{details.position || request.position}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">6. ข้อมูลเพิ่มเติม (ลักษณะงานที่ทำ / ทักษะที่ต้องการ)</span>
              <p className="detail-value" style={{whiteSpace: 'pre-wrap', marginTop: '5px'}}>
                {details.description ? `ลักษณะงาน: ${details.description}\n` : ''}
                {details.skills ? `ทักษะ: ${details.skills}` : ''}
                {!details.description && !details.skills && '-'}
              </p>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0 }}>ความประสงค์และกำหนดวันฝึกงาน</h3>
            {userRole === 'admin' && (
              <Button
                variant="contained"
                size="small"
                onClick={handleOpenScheduleModal}
                sx={{
                  bgcolor: '#4f46e5',
                  '&:hover': { bgcolor: '#4338ca' },
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CalendarDays size={15} /> กำหนด / แก้ไขวันฝึกงาน
              </Button>
            )}
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">ภาคการศึกษา / ช่วงฝึกงาน</span>
              <span className="detail-value">{internshipTermLabel || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">วันที่เริ่มต้นฝึกงาน</span>
              <span className="detail-value">
                {(request.internship_start_date || details.startDate) 
                  ? new Date(request.internship_start_date || details.startDate).toLocaleDateString('th-TH') 
                  : <span style={{ color: '#94a3b8' }}>รอผู้ดูแลระบบกำหนด</span>}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">วันที่สิ้นสุดการฝึกงาน</span>
              <span className="detail-value">
                {(request.internship_end_date || details.endDate) 
                  ? new Date(request.internship_end_date || details.endDate).toLocaleDateString('th-TH') 
                  : <span style={{ color: '#94a3b8' }}>รอผู้ดูแลระบบกำหนด</span>}
              </span>
            </div>
            {details.internshipDateNote && (
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">หมายเหตุวันฝึกงาน</span>
                <span className="detail-value">{details.internshipDateNote}</span>
              </div>
            )}
          </div>
        </section>


        {request.supervisionAppointment && (
          <section className="detail-section">
            <h3 style={{ color: '#0ea5e9' }}>กำหนดการนิเทศ (โดยอาจารย์ที่ปรึกษา)</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">วันที่นิเทศ</span>
                <span className="detail-value" style={{ fontWeight: 'bold' }}>{request.supervisionAppointment.date ? new Date(request.supervisionAppointment.date).toLocaleDateString('th-TH') : '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">รูปแบบ</span>
                <span className="detail-value">{request.supervisionAppointment.mode || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">สถานะการประเมิน</span>
                <span className="detail-value" style={{ 
                  fontWeight: 'bold', 
                  color: (request.supervisionReport || request.hasAdvisorEval) ? '#10b981' : '#f59e0b' 
                }}>
                  {(request.supervisionReport || request.hasAdvisorEval) ? 'นิเทศเสร็จแล้ว' : 'รอนิเทศงาน'}
                </span>
              </div>
              {request.supervisionAppointment.note && (
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-label">หมายเหตุ</span>
                  <span className="detail-value">{request.supervisionAppointment.note}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {request.rejectReason && (
             <section className="detail-section" style={{ backgroundColor: '#fff5f5', padding: '15px', borderRadius: '8px', border: '1px solid #fed7d7' }}>
               <h3 style={{ color: '#c53030', borderLeftColor: '#c53030' }}>เหตุผลที่ไม่อนุมัติ</h3>
                <p className="detail-value" style={{ color: '#c53030' }}>{request.rejectReason}</p>
         </section>
        )}

        {evaluation && (userRole === 'admin' || userRole === 'advisor') && (
          <section className="detail-section" style={{ marginTop: '30px', padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
               <h3 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                 <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><ChartBarIcon style={{width: 20, height: 20}}/> ผลการประเมินจากสถานประกอบการ</span>
               </h3>
               <Button variant="outlined" sx={{ borderColor: '#64748b', color: '#475569', '&:hover': { bgcolor: '#f1f5f9' } }} onClick={() => handlePrint()}>
                 <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><PrinterIcon style={{width: 20, height: 20}}/> พิมพ์เอกสาร (PDF)</span>
               </Button>
            </div>
            
            {(() => {
              let score = 0;
              let answered = 0;
              for (let i = 1; i <= 20; i++) {
                if (evaluation[`q${i}`] !== null && evaluation[`q${i}`] !== undefined) {
                   score += parseInt(evaluation[`q${i}`]);
                   answered++;
                }
              }
              const maxScore = answered * 5;
              const percent = maxScore > 0 ? ((score / maxScore) * 100).toFixed(2) : 0;
              let gradeColor = '#10b981';
              if (percent < 50) gradeColor = '#ef4444';
              else if (percent < 70) gradeColor = '#f59e0b';
              else if (percent < 80) gradeColor = '#3b82f6';

              return (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-end' }}>
                    <span style={{ fontWeight: '600', color: '#475569', fontSize: '1rem' }}>คะแนนรวม (Automated Grading)</span>
                    <span style={{ fontWeight: '800', color: gradeColor, fontSize: '1.5rem' }}>{score} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>/ {maxScore}</span> ({percent}%)</span>
                  </div>
                  <div style={{ height: '12px', backgroundColor: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                     <div style={{ height: '100%', width: `${percent}%`, backgroundColor: gradeColor, transition: 'width 1s ease-in-out' }}></div>
                  </div>
                </div>
              );
            })()}
            
            <div className="detail-grid" style={{ gridTemplateColumns: '1fr', gap: '16px' }}>
               <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span className="detail-label" style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>จุดเด่นของนักศึกษา</span>
                  <span className="detail-value" style={{ display: 'block', lineHeight: 1.5 }}>{evaluation.strengths || '-'}</span>
               </div>
               <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span className="detail-label" style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ข้อควรปรับปรุง</span>
                  <span className="detail-value" style={{ display: 'block', lineHeight: 1.5 }}>{evaluation.improvements || '-'}</span>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                 <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span className="detail-label" style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ความสนใจรับเข้าทำงานต่อ</span>
                    <span className="detail-value" style={{ display: 'block', fontWeight: '700', color: evaluation.hireFuture === 'รับ' ? '#10b981' : (evaluation.hireFuture === 'ไม่รับ' ? '#ef4444' : '#f59e0b') }}>
                       {evaluation.hireFuture || '-'}
                    </span>
                 </div>
                 <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span className="detail-label" style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ภาพรวมคุณภาพ</span>
                    <span className="detail-value" style={{ display: 'block', fontWeight: '600' }}>{evaluation.overallScore || '-'}</span>
                 </div>
               </div>
            </div>
          </section>
        )}

        {advisorEvaluation && (userRole === 'admin' || userRole === 'advisor') && (
          <section className="detail-section" style={{ marginTop: '30px', padding: '24px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChartBarIcon style={{ width: 20, height: 20 }} /> ผลการนิเทศและประเมิน (โดยอาจารย์ที่ปรึกษา)
                </span>
              </h3>
              <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600, backgroundColor: '#dcfce7', padding: '4px 12px', borderRadius: '999px' }}>
                ผู้ประเมิน: {advisorEvaluation.advisorName || 'อาจารย์ที่ปรึกษา'}
              </span>
            </div>

            {(() => {
              let cScore = 0, cCount = 0;
              let sScore = 0, sCount = 0;
              for (let i = 1; i <= 17; i++) {
                const val = parseInt(advisorEvaluation[`c${i}`]);
                if (!isNaN(val)) { cScore += val; cCount++; }
              }
              for (let i = 1; i <= 20; i++) {
                const val = parseInt(advisorEvaluation[`s${i}`]);
                if (!isNaN(val)) { sScore += val; sCount++; }
              }

              const totalScore = cScore + sScore;
              const maxTotal = (cCount * 5) + (sCount * 5);
              const percent = maxTotal > 0 ? ((totalScore / maxTotal) * 100).toFixed(2) : 0;

              let gradeColor = '#10b981';
              if (percent < 50) gradeColor = '#ef4444';
              else if (percent < 70) gradeColor = '#f59e0b';
              else if (percent < 80) gradeColor = '#3b82f6';

              return (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-end' }}>
                    <span style={{ fontWeight: '600', color: '#166534', fontSize: '1rem' }}>คะแนนรวมการนิเทศงาน (Advisor Supervision Grading)</span>
                    <span style={{ fontWeight: '800', color: gradeColor, fontSize: '1.5rem' }}>
                      {totalScore} <span style={{ fontSize: '1rem', color: '#64748b' }}>/ {maxTotal}</span> ({percent}%)
                    </span>
                  </div>
                  <div style={{ height: '12px', backgroundColor: '#dcfce7', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${percent}%`, backgroundColor: gradeColor, transition: 'width 1s ease-in-out' }}></div>
                  </div>
                </div>
              );
            })()}

            <div className="detail-grid" style={{ gridTemplateColumns: '1fr', gap: '16px' }}>
              {advisorEvaluation.companyComments && (
                <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                  <span className="detail-label" style={{ color: '#166534', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ความคิดเห็นต่อสถานประกอบการ</span>
                  <span className="detail-value" style={{ display: 'block', lineHeight: 1.5 }}>{advisorEvaluation.companyComments}</span>
                </div>
              )}
              {advisorEvaluation.studentComments && (
                <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                  <span className="detail-label" style={{ color: '#166534', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ข้อเสนอแนะต่อนักศึกษา</span>
                  <span className="detail-value" style={{ display: 'block', lineHeight: 1.5 }}>{advisorEvaluation.studentComments}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {Boolean(evaluation || request?.hasCompanyEval) && userRole === 'student' && (
          <section className="detail-section">
            <h3 style={{ color: '#10b981' }}>การประเมินผลจากสถานประกอบการ</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">สถานประกอบการ</span>
                <span className="detail-value" style={{ fontWeight: 'bold' }}>{request.company || evaluation?.evaluatorName || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">ผู้ประเมิน</span>
                <span className="detail-value">{evaluation?.evaluatorName ? `${evaluation.evaluatorName} (${evaluation.evaluatorPosition || 'ตัวแทนบริษัท'})` : 'ตัวแทนสถานประกอบการ'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">สถานะการประเมิน</span>
                <span className="detail-value" style={{ fontWeight: 'bold', color: '#10b981' }}>
                  ประเมินเสร็จแล้ว
                </span>
              </div>
            </div>
          </section>
        )}

        <footer className="actions-footer">
          <Button variant="outlined" className="btn-back" onClick={() => navigate(-1)}>
            ย้อนกลับ
          </Button>
          
          {userRole === 'admin' && (
            <Button
              variant="contained"
              startIcon={<QrCodeIcon style={{ width: 19, height: 19 }} />}
              sx={{ bgcolor: '#111827', '&:hover': { bgcolor: '#000' }, color: 'white' }}
              onClick={() => handleOpenResponseQr(false)}
            >
              ดู QR Code ตอบรับล่วงหน้า
            </Button>
          )}
          
          {canApprove && (
            <>
              <Button variant="contained" color="error" className="btn-reject-lg" startIcon={<X size={17} />} onClick={handleReject}>
                ไม่อนุมัติ
              </Button>
              <Button variant="contained" color="success" className="btn-approve-lg" startIcon={<Check size={17} />} onClick={handleApprove}>
                อนุมัติคำร้อง
              </Button>
            </>
          )}
          {userRole === 'student' && isStudentEditableStatus(request?.status) && (
            <Button
              variant="contained"
              startIcon={<Pencil size={18} />}
              sx={{
                bgcolor: '#7c3aed',
                '&:hover': { bgcolor: '#6d28d9' },
                color: 'white',
                borderRadius: 2,
                px: 2.5
              }}
              onClick={() => navigate(`/dashboard/edit-request/${request.id}`)}
            >
              แก้ไขคำร้อง
            </Button>
          )}
          {userRole === 'student' && !isStudentEditableStatus(request?.status) && (
            <Button
              variant="outlined"
              disabled
              sx={{
                borderColor: '#cbd5e1 !important',
                color: '#64748b !important',
                borderRadius: 2,
                px: 2.5
              }}
            >
              โหมดอ่านอย่างเดียว (อนุมัติแล้ว)
            </Button>
          )}
        </footer>
      </div>

      {/* แก้ไขอีเมลผู้ประเมินจากสถานประกอบการ */}
      <Dialog
        open={editEvalEmailModal.open}
        onClose={() => !editEvalEmailModal.submitting && setEditEvalEmailModal(prev => ({ ...prev, open: false }))}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>แก้ไขอีเมลผู้ประเมินจากสถานประกอบการ</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            ระบุอีเมลสำหรับให้ระบบจัดส่งแบบประเมินผลการฝึกงานโดยอัตโนมัติหลังอาจารย์บันทึกผลการนิเทศ
            (เฉพาะ Admin และอาจารย์เท่านั้นที่แก้ไขได้)
          </Typography>
          {editEvalEmailModal.error && (
            <Alert severity="error" sx={{ mb: 2 }}>{editEvalEmailModal.error}</Alert>
          )}
          <TextField
            fullWidth
            type="email"
            label="อีเมลผู้ประเมิน"
            value={editEvalEmailModal.email}
            onChange={(e) => setEditEvalEmailModal(prev => ({ ...prev, email: e.target.value, error: '' }))}
            placeholder="evaluator@company.com"
            disabled={editEvalEmailModal.submitting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditEvalEmailModal(prev => ({ ...prev, open: false }))} disabled={editEvalEmailModal.submitting}>
            ยกเลิก
          </Button>
          <Button variant="contained" onClick={handleSaveEvalEmail} disabled={editEvalEmailModal.submitting} sx={{ fontWeight: 700 }}>
            {editEvalEmailModal.submitting ? 'กำลังบันทึก...' : 'บันทึกอีเมล'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectModal.open} onClose={handleRejectClose} fullWidth maxWidth="sm">
        <DialogTitle>ระบุเหตุผลที่ไม่อนุมัติ/ปฏิเสธ</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            margin="dense"
            label="เหตุผล"
            value={rejectModal.reason}
            onChange={(event) => setRejectModal(prev => ({ ...prev, reason: event.target.value }))}
            placeholder="กรอกเหตุผลที่ไม่อนุมัติ/ปฏิเสธ"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleRejectClose}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={handleRejectConfirm}>ยืนยัน</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={2600}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </MuiAlert>
      </Snackbar>

      <Dialog
        open={dispatchModal.open}
        onClose={handleDispatchModalClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '28px',
            border: '1px solid rgba(237, 233, 254, 0.8)',
            boxShadow: '0 20px 60px rgba(124,58,237,0.12)',
            m: 2,
          },
        }}
      >
        <div className="bg-white rounded-[28px] p-6 sm:p-7 w-full">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100/80 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-800 m-0">
                {['รออาจารย์อนุมัติเริ่มฝึกงาน', 'รอแอดมินอนุมัติเริ่มฝึกงาน', 'อนุมัติแล้ว'].includes(request?.status)
                  ? 'หนังสือส่งตัวนักศึกษาฝึกงาน'
                  : 'หนังสือขอความอนุเคราะห์ขอฝึกประสบการณ์'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed m-0">
                กรุณาอัปโหลดไฟล์หนังสือขอความอนุเคราะห์ (PDF, JPG หรือ PNG) และสามารถระบุข้อความ/หมายเหตุเพิ่มเติมถึงนักศึกษาได้
              </p>
            </div>
          </div>

          {/* หมายเหตุ */}
          <label className="text-xs font-medium text-slate-600 mb-1.5 block">
            ข้อความเพิ่มเติม / หมายเหตุถึงนักศึกษา (ถ้ามี)
          </label>
          <textarea
            value={dispatchModal.comment || ''}
            onChange={(e) => setDispatchModal((prev) => ({ ...prev, comment: e.target.value }))}
            placeholder="เช่น ให้นักศึกษานำรูปถ่าย 2 นิ้ว 2 ใบมาเพิ่ม หรือรายละเอียดวันเวลารับเอกสารเพิ่มเติม"
            className="w-full box-border rounded-2xl border border-slate-200 p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none h-20 text-slate-800 bg-white mb-4"
          />

          {/* กำหนดวันฝึกงานจริง (เฉพาะเคสเริ่มฝึกงาน) */}
          {['รออาจารย์อนุมัติเริ่มฝึกงาน', 'รอแอดมินอนุมัติเริ่มฝึกงาน', 'อนุมัติแล้ว'].includes(request?.status) && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <div className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1.5">
                <CalendarDays size={14} /> ตรวจสอบ / กำหนดวันฝึกงานจริง
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 mb-1 block">วันเริ่มต้นฝึกงาน</label>
                  <input
                    type="date"
                    value={dispatchModal.startDate || ''}
                    onChange={(e) => setDispatchModal(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full box-border rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 mb-1 block">วันสิ้นสุดฝึกงาน</label>
                  <input
                    type="date"
                    value={dispatchModal.endDate || ''}
                    onChange={(e) => setDispatchModal(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full box-border rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dropzone */}
          <input
            ref={dispatchFileInputRef}
            type="file"
            hidden
            accept="application/pdf,image/jpeg,image/png,image/jpg"
            onChange={handleDispatchFileChange}
          />
          <button
            type="button"
            onClick={() => dispatchFileInputRef.current?.click()}
            disabled={dispatchModal.submitting}
            className="w-full border-2 border-dashed border-violet-200 hover:border-violet-300 bg-violet-50/20 hover:bg-violet-50/40 rounded-2xl py-4 px-4 flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <UploadCloud className="w-4 h-4 text-violet-600" />
            <span className="text-xs font-semibold text-violet-700">เลือกไฟล์หนังสือขอความอนุเคราะห์</span>
          </button>
          <p className="text-[10px] text-slate-400 mt-1.5 mb-0 text-center">รองรับไฟล์ PDF, JPG หรือ PNG (ขนาดไม่เกิน 20MB)</p>

          {dispatchModal.file && (
            <div className="mt-2.5 text-xs text-emerald-600 font-semibold flex items-center gap-1.5 break-all">
              <Check size={14} className="shrink-0" />
              <span>ไฟล์ที่เลือก: {dispatchModal.file.name}</span>
            </div>
          )}
          {dispatchModal.error && (
            <div className="mt-2.5 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
              {dispatchModal.error}
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-5">
            <button
              type="button"
              onClick={handleDispatchSubmit}
              disabled={dispatchModal.submitting}
              className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
            >
              {dispatchModal.submitting ? 'กำลังอัปโหลด...' : 'แนบไฟล์และอนุมัติ'}
            </button>
            <button
              type="button"
              onClick={handleDispatchModalClose}
              disabled={dispatchModal.submitting}
              className="w-full py-2 text-xs font-medium text-slate-400 hover:text-slate-600 transition cursor-pointer text-center mt-1 border-none bg-transparent"
            >
              ยกเลิก
            </button>
          </div>
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
          <CalendarDays size={20} /> กำหนดวันฝึกงาน (สำหรับ Admin)
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Box sx={{ mb: 2.5, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
              นักศึกษา: {request?.studentName} ({request?.studentId})
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              สถานประกอบการ: {request?.company}
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

      {/* QR Code Modal */}
      <Dialog open={qrModal.open} onClose={handleCloseQrModal} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 700 }}>QR Code แบบตอบรับสถานประกอบการ</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', px: { xs: 2, sm: 4 }, py: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            ใช้ QR Code หรือลิงก์นี้ในเอกสารขอความอนุเคราะห์ เพื่อให้สถานประกอบการตอบรับหรือปฏิเสธนักศึกษา
          </Typography>
          {qrModal.loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}>
              <CircularProgress />
            </Box>
          )}
          {qrModal.error && <Alert severity="error">{qrModal.error}</Alert>}
          {!qrModal.loading && !qrModal.error && qrModal.link && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Box sx={{ p: 2, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2, boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)' }}>
                  <QRCodeCanvas ref={qrCanvasRef} value={qrModal.link} size={170} level="H" marginSize={1} />
                </Box>
              </Box>
              <TextField
                fullWidth
                size="small"
                label="ลิงก์ตอบรับสำหรับสถานประกอบการ"
                value={`${window.location.origin}/coop/public/response/${id}`}
                onFocus={(e) => e.target.select()}
                InputProps={{
                  readOnly: true,
                  sx: { fontFamily: 'monospace', fontSize: '0.75rem', bgcolor: '#f8fafc' },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={handleCopyLink}
                        title="คัดลอกลิงก์"
                        sx={{ color: qrModal.copied ? '#10b981' : '#7c3aed' }}
                      >
                        {qrModal.copied ? <Check size={16} /> : <Copy size={16} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1.5 }}
              />
              <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={qrModal.copied ? <Check size={16} /> : <Copy size={16} />}
                  onClick={handleCopyLink}
                  sx={{
                    bgcolor: qrModal.copied ? '#10b981' : '#7c3aed',
                    '&:hover': { bgcolor: qrModal.copied ? '#059669' : '#6d28d9' },
                    fontWeight: 700
                  }}
                >
                  {qrModal.copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<ExternalLink size={16} />}
                  onClick={handleTestOpenLink}
                  sx={{ borderColor: '#cbd5e1', color: '#475569', fontWeight: 600 }}
                >
                  ทดสอบเปิดลิงก์
                </Button>
              </Box>
              <Alert severity="warning" sx={{ mt: 2, textAlign: 'left', alignItems: 'flex-start' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', lineHeight: 1.5 }}>
                  ผู้ที่ถือลิงก์นี้สามารถตอบรับคำร้องได้ ส่งให้เฉพาะสถานประกอบการเท่านั้น
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.5, mt: 0.25 }}>
                  ลิงก์ใช้งานได้ครั้งเดียว{qrModal.expiresAt ? ` และหมดอายุ ${new Date(qrModal.expiresAt).toLocaleString('th-TH')}` : ''}
                </Typography>
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 4 }, pb: 3, justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<ArrowDownTrayIcon style={{ width: 18, height: 18 }} />}
            onClick={handleDownloadQr}
            disabled={qrModal.loading || Boolean(qrModal.error) || !qrModal.link}
            sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
          >
            ดาวน์โหลด QR Code
          </Button>
          <Button variant="outlined" onClick={handleCloseQrModal}>ปิด</Button>
        </DialogActions>
      </Dialog>

      {/* Full-screen Minimal Lightbox */}
      {imageModal && studentPhotoSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={() => setImageModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`รูปถ่ายนักศึกษา ${request?.studentName || ''}`}
        >
          <button
            type="button"
            onClick={() => setImageModal(false)}
            className="absolute top-5 right-5 sm:top-7 sm:right-7 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border-none outline-none"
            aria-label="ปิด"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={studentPhotoSrc}
            alt={`รูปถ่ายนักศึกษา ${request?.studentName || ''}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] w-auto h-auto object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
          />
        </div>
      )}

      {/* Document Preview Modal */}
      <Dialog
        open={docModal.open}
        onClose={() => setDocModal({ open: false, dataUrl: '', fileName: '', blobUrl: '' })}
        maxWidth="md"
        fullWidth
        disableScrollLock={true}
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                bgcolor: '#ffe4e6',
                color: '#be185d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <DocumentTextIcon style={{ width: 18, height: 18 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
              {docModal.fileName || 'หนังสือส่งตัวฝึกงาน'}
            </Typography>
          </Box>
          <Button size="small" onClick={() => setDocModal({ open: false, dataUrl: '', fileName: '', blobUrl: '' })} sx={{ color: '#64748b', fontWeight: 700 }}>
            ปิด
          </Button>
        </DialogTitle>
        <DialogContent sx={{ p: 2, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh' }}>
          {docModal.open && (docModal.blobUrl || docModal.dataUrl) && (
            docModal.dataUrl?.startsWith('data:image/') ? (
              <img
                src={docModal.dataUrl}
                alt={docModal.fileName}
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
              />
            ) : (
              <iframe
                src={docModal.blobUrl || docModal.dataUrl}
                title={docModal.fileName}
                style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px', backgroundColor: '#fff' }}
              />
            )
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="contained"
            startIcon={<ArrowDownTrayIcon style={{ width: 18, height: 18 }} />}
            onClick={() => handleDownloadFile(docModal.dataUrl, docModal.fileName)}
            sx={{ bgcolor: '#be185d', '&:hover': { bgcolor: '#9d174d' }, fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 2.5 }}
          >
            ดาวน์โหลดไฟล์
          </Button>
          <Button variant="outlined" onClick={() => setDocModal({ open: false, dataUrl: '', fileName: '', blobUrl: '' })} sx={{ borderRadius: 2, textTransform: 'none', color: '#64748b', borderColor: '#cbd5e1' }}>
            ปิดหน้าต่าง
          </Button>
        </DialogActions>
      </Dialog>

      {(userRole === 'admin' || userRole === 'advisor') && (
        <div style={{ display: 'none' }}>
           <PrintableEvaluationForm ref={printRef} request={request} evaluation={evaluation} />
        </div>
      )}
    </div>
  );
};

export default RequestDetailsPage;

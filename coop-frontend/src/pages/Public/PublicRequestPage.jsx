import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Box, Paper, Typography, Chip, CircularProgress, Dialog, Alert } from '@mui/material';
import api from '../../api/axios';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { CheckCircle2, RotateCcw, PenTool, FileText, Mail, X, XCircle } from 'lucide-react';
import { formatAddress } from '../../utils/formatters';
import { getUploadUrl } from '../../utils/fileUrl';
import { openDocumentInNewTab, downloadDocument } from '../../utils/documentViewer';

const PublicRequestPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const responseToken = searchParams.get('responseToken') || '';
  const responseTokenQuery = responseToken ? `?responseToken=${encodeURIComponent(responseToken)}` : '';
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', severity: '' });
  const [rejectDialog, setRejectDialog] = useState({ open: false, reason: '' });
  const [acceptForm, setAcceptForm] = useState({
    companyEmail: '',
    studentPreparation: '',
    signerName: '',
    signerPosition: '',
    error: ''
  });
  const [hasSignature, setHasSignature] = useState(false);
  const signatureCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [imageModal, setImageModal] = useState({ open: false, src: '', title: '' });

  useEffect(() => {
    if (!imageModal.open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setImageModal({ open: false, src: '', title: '' });
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [imageModal.open]);

  useEffect(() => {
    api.get(`/public/requests/${id}${responseTokenQuery}`)
      .then((res) => {
        if (res.data.data) {
          setRequest(res.data.data);
          setAcceptForm(buildAcceptFormDefaults(res.data.data));
        } else {
          setError('ไม่พบข้อมูลคำร้อง');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'ไม่พบข้อมูลคำร้อง หรือลิงก์ไม่ถูกต้อง');
        setLoading(false);
      });
  }, [id, responseTokenQuery]);


  const getStatusChip = (status) => {
    const map = {
      'รอสถานประกอบการตอบรับ': { color: 'default' },
      'สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)': { color: 'info' },
      'COMPANY_ACCEPTED': { color: 'info' },
      'รอแอดมินออกใบส่งตัว': { color: 'info' },
      'ตอบรับแล้ว': { color: 'info' },
      'รออาจารย์ที่ปรึกษาอนุมัติ': { color: 'warning' },
      'รอผู้ดูแลระบบตรวจสอบ': { color: 'info' },
      'รอผู้ดูแลระบบอนุมัติ': { color: 'info' },
      'อนุมัติแล้ว': { color: 'success' },
      'ไม่อนุมัติ (อาจารย์)': { color: 'error' },
      'ไม่อนุมัติ (Admin)': { color: 'error' },
      'ปฏิเสธ': { color: 'error' },
      'ออกฝึกงาน': { color: 'info' },
      'ฝึกงานเสร็จแล้ว': { color: 'secondary' },
    };
    const info = map[status] || { color: 'default' };
    return <Chip label={status} color={info.color} size="small" />;
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f7fa' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !request) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f7fa' }}>
        <Paper elevation={0} sx={{ p: 5, borderRadius: 3, border: '1px solid #e0e0e0', textAlign: 'center' }}>
          <Typography variant="h6" color="error">{error || 'ไม่พบข้อมูล'}</Typography>
        </Paper>
      </Box>
    );
  }

  const canRespond = request.status === 'รอสถานประกอบการตอบรับ';

  const handleViewFile = (fileDataUrl) => {
    if (!fileDataUrl) return;
    // เปิดผ่าน Blob URL ในแท็บใหม่ทั้ง Desktop/Mobile — data: URL ถูกบล็อกบนเบราว์เซอร์มือถือ
    openDocumentInNewTab(fileDataUrl);
  };

  const getCoordinates = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e, canvas);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#312e81';
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasSignature) {
      setHasSignature(true);
    }
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const resetAcceptForm = () => {
    setAcceptForm(buildAcceptFormDefaults(request));
    clearSignature();
  };

  const handleAcceptConfirm = async () => {
    const compEmail = (acceptForm.companyEmail || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!compEmail) {
      setAcceptForm(prev => ({ ...prev, error: 'กรุณากรอกอีเมลติดต่อของสถานประกอบการ / ผู้ประสานงาน' }));
      return;
    }
    if (!emailRegex.test(compEmail)) {
      setAcceptForm(prev => ({ ...prev, error: 'รูปแบบอีเมลติดต่อของสถานประกอบการไม่ถูกต้อง (ตัวอย่าง: hr@company.com)' }));
      return;
    }

    if (!acceptForm.signerName.trim()) {
      setAcceptForm(prev => ({ ...prev, error: 'กรุณากรอกชื่อ-นามสกุลผู้ลงนาม' }));
      return;
    }
    if (!acceptForm.signerPosition.trim()) {
      setAcceptForm(prev => ({ ...prev, error: 'กรุณากรอกตำแหน่งผู้ลงนาม' }));
      return;
    }

    setUpdating(true);
    try {
      let signatureDataUrl = null;
      if (signatureCanvasRef.current && hasSignature) {
        signatureDataUrl = signatureCanvasRef.current.toDataURL('image/png');
      }

      const companyAcceptedStatus = 'สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)';
      const payload = {
        status: companyAcceptedStatus,
        statusCode: 'COMPANY_ACCEPTED',
        company_email: compEmail,
        companyEmail: compEmail,
        company_comment: acceptForm.studentPreparation.trim() || undefined,
        studentPreparation: acceptForm.studentPreparation.trim() || undefined,
        signature: signatureDataUrl,
        signerName: acceptForm.signerName.trim() || undefined,
        signerPosition: acceptForm.signerPosition.trim() || undefined,
        evaluatorEmail: compEmail,
        evaluatorName: acceptForm.signerName.trim() || undefined,
        evaluatorPosition: acceptForm.signerPosition.trim() || undefined,
        companyResponse: {
          accepted: true,
          status: 'COMPANY_ACCEPTED',
          company_email: compEmail,
          companyEmail: compEmail,
          studentPreparation: acceptForm.studentPreparation.trim() || '',
          signature: signatureDataUrl,
          signerName: acceptForm.signerName.trim() || '',
          signerPosition: acceptForm.signerPosition.trim() || '',
          evaluatorEmail: compEmail,
          respondedAt: new Date().toISOString()
        }
      };

      const res = await api.patch(`/public/requests/${id}/status${responseTokenQuery}`, payload);
      setRequest(res.data?.data || {
        ...request,
        status: companyAcceptedStatus,
        company_email: compEmail,
        evaluator_email: compEmail,
        details: {
          ...(request.details || {}),
          ...payload,
          companyEmail: compEmail,
          companyResponse: payload.companyResponse
        }
      });
      setFeedback({ message: 'ยืนยันการตอบรับนักศึกษาเข้าฝึกงานเรียบร้อยแล้ว ขอบคุณที่ให้ความอนุเคราะห์แก่นักศึกษา', severity: 'success' });
    } catch (err) {
      setFeedback({ message: 'เกิดข้อผิดพลาด: ' + (err.response?.data?.message || err.message), severity: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectOpen = () => {
    setRejectDialog({ open: true, reason: '' });
  };

  const handleRejectConfirm = async () => {
    setUpdating(true);
    try {
      await api.patch(`/public/requests/${id}/status${responseTokenQuery}`, {
        status: 'ปฏิเสธ',
        company_comment: rejectDialog.reason.trim() || undefined,
      });
      setRequest({ ...request, status: 'ปฏิเสธ' });
      setRejectDialog({ open: false, reason: '' });
      setFeedback({ message: 'ปฏิเสธคำร้องเรียบร้อยแล้ว', severity: 'info' });
    } catch (err) {
      setFeedback({ message: 'เกิดข้อผิดพลาด: ' + (err.response?.data?.message || err.message), severity: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const details = request.details || {};
  const studentInfo = details.student_info || {};
  const studentAddress = formatAddress(studentInfo.address);
  const companyAddress = formatAddress(details.companyAddress || details.address);
  const dispatchLetter = request.dispatchLetter || details.dispatchLetter;
  const internshipTermLabel = details.internshipTerm === 'term1'
    ? 'ภาคการศึกษาที่ 1'
    : details.internshipTerm === 'term2'
      ? 'ภาคการศึกษาที่ 2'
      : details.internshipTerm === 'summer'
        ? 'ภาคฤดูร้อน'
        : (details.internshipTerm || '');

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 flex justify-center">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <header className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-xs flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight m-0">รายละเอียดคำร้องฝึกงาน</h2>
            <p className="text-xs text-slate-400 mt-1 m-0">
              เลขที่คำร้อง: {request.id} • ยื่นเมื่อ: {new Date(request.submittedDate).toLocaleDateString('th-TH')}
            </p>
            <div className="mt-2">{getStatusChip(request.status)}</div>
          </div>
          {details.studentPhoto?.dataUrl && (
            <button
              type="button"
              onClick={() => setImageModal({ open: true, src: details.studentPhoto.dataUrl, title: `รูปถ่ายนักศึกษา: ${request.studentName}` })}
              title="คลิกเพื่อดูรูปขนาดเต็ม"
              className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl border border-slate-200 overflow-hidden shadow-xs shrink-0 cursor-pointer p-0 bg-transparent"
            >
              <img src={details.studentPhoto.dataUrl} alt="รูปนักศึกษา" className="w-full h-full object-cover" />
            </button>
          )}
        </header>

        {/* ข้อมูลนักศึกษา */}
        <section className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-xs space-y-5">
          <h3 className="border-l-4 border-violet-600 pl-3 text-base font-bold text-slate-800 m-0">ข้อมูลนักศึกษา</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <InfoItem label="ชื่อ-นามสกุล" value={request.studentName} />
            <InfoItem label="รหัสนักศึกษา" value={request.studentId} />
            <InfoItem label="สาขาวิชา" value={request.department} />
            <InfoItem label="เกรดเฉลี่ยเทอมล่าสุด" value={studentInfo.lastSemesterGrade} />
            <div className="sm:col-span-2">
              <InfoItem
                label="โทรศัพท์ / อีเมลติดต่อ"
                value={`${studentInfo.phone || request.studentPhone || '-'} / ${studentInfo.email || request.studentEmail || '-'}`}
              />
            </div>
            <div className="sm:col-span-3">
              <InfoItem label="ที่อยู่ปัจจุบัน" value={studentAddress} />
            </div>
          </div>
        </section>

        {/* รายละเอียดสถานประกอบการ */}
        <section className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-xs space-y-5">
          <h3 className="border-l-4 border-violet-600 pl-3 text-base font-bold text-slate-800 m-0">รายละเอียดสถานประกอบการ</h3>
          <div className="space-y-4">
            <InfoItem
              label="1. ชื่อบุคคล / ชื่อตำแหน่งงานติดต่อ / ผู้ประสานงานที่ติดต่อ"
              value={`${details.contactPerson || '-'}${details.contactPosition ? ` (${details.contactPosition})` : ''}`}
            />
            <InfoItem label="2. ชื่อหน่วยงาน / บริษัทที่ติดต่อ" value={details.companyName || request.company} />
            <InfoItem label="3. ที่อยู่หน่วยงาน" value={companyAddress} />
            <InfoItem
              label="4. โทรศัพท์ / อีเมลติดต่อ"
              value={`${details.contactPhone || '-'} / ${request.company_email || details.companyEmail || details.contactEmail || '-'}`}
            />
            <InfoItem label="5. ตำแหน่งงานที่ต้องการเข้าฝึกงาน" value={details.position || request.position} />
            <InfoItem
              label="6. ข้อมูลเพิ่มเติม (ลักษณะงานที่ทำ / ทักษะที่ต้องการ)"
              value={
                `${details.description ? `ลักษณะงาน: ${details.description}\n` : ''}${details.skills ? `ทักษะ: ${details.skills}` : ''}`
                || '-'
              }
            />
          </div>
        </section>

        {/* ความประสงค์และกำหนดวันฝึกงาน */}
        <section className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-xs space-y-5">
          <h3 className="border-l-4 border-violet-600 pl-3 text-base font-bold text-slate-800 m-0">ความประสงค์และกำหนดวันฝึกงาน</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <InfoItem label="ภาคการศึกษา / ช่วงฝึกงาน" value={internshipTermLabel || '-'} />
            <InfoItem
              label="วันเริ่มฝึกงาน"
              value={
                (request.internship_start_date || details.startDate)
                  ? new Date(request.internship_start_date || details.startDate).toLocaleDateString('th-TH')
                  : '-'
              }
            />
            <InfoItem
              label="วันสิ้นสุดการฝึกงาน"
              value={
                (request.internship_end_date || details.endDate)
                  ? new Date(request.internship_end_date || details.endDate).toLocaleDateString('th-TH')
                  : '-'
              }
            />
          </div>
        </section>

        {/* หนังสือขอความอนุเคราะห์ */}
        {dispatchLetter?.dataUrl && (
          <section className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-xs space-y-5">
            <h3 className="border-l-4 border-violet-600 pl-3 text-base font-bold text-slate-800 m-0">หนังสือขอความอนุเคราะห์</h3>
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-violet-50 border border-violet-100/80 flex items-center justify-center shrink-0 p-2.5">
                  <FileText className="w-6 h-6 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate">
                    {dispatchLetter.fileName || 'หนังสือขอความอนุเคราะห์ฝึกประสบการณ์'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    แนบโดยผู้ดูแลระบบ • คลิกเพื่อเปิดอ่านหรือดาวน์โหลด
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleViewFile(
                    dispatchLetter.dataUrl,
                    `หนังสือขอความอนุเคราะห์_${request.studentId || ''}${dispatchLetter.fileName && dispatchLetter.fileName.includes('.') ? '.' + dispatchLetter.fileName.split('.').pop() : '.pdf'}`
                  )}
                  className="text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer border-none flex items-center gap-1.5"
                  style={{ backgroundColor: '#f5f3ff', color: '#6d28d9' }}
                >
                  <FileText className="w-4 h-4 text-violet-600" />
                  <span>เปิดเอกสาร</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadDocument(
                    dispatchLetter.dataUrl,
                    `หนังสือขอความอนุเคราะห์_${request.studentId || ''}${dispatchLetter.fileName && dispatchLetter.fileName.includes('.') ? '.' + dispatchLetter.fileName.split('.').pop() : '.pdf'}`
                  )}
                  className="text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer border-none flex items-center gap-1.5"
                  style={{ backgroundColor: '#f5f3ff', color: '#6d28d9' }}
                >
                  <ArrowDownTrayIcon className="w-4 h-4 text-violet-600" />
                  <span>ดาวน์โหลด</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Feedback */}
        {feedback.message && (
          <Alert severity={feedback.severity} sx={{ borderRadius: 3 }} className="rounded-2xl">
            {feedback.message}
          </Alert>
        )}

        {/* Accept Form — In-page Card แสดงถาวรเมื่อรอการตอบรับ */}
        {canRespond && (
          <section className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm space-y-6 mt-6">
            {/* Card Header */}
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 text-emerald-600 rounded-full p-2 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight m-0">
                  ยืนยันการตอบรับนักศึกษาเข้าฝึกประสบการณ์
                </h3>
                <p className="text-slate-500 text-sm m-0 mt-0.5">
                  {request.studentName} {request.studentId ? `(${request.studentId})` : ''}
                </p>
              </div>
            </div>

            {acceptForm.error && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
                {acceptForm.error}
              </div>
            )}

            {/* ส่วนที่ 1: อีเมลติดต่อของสถานประกอบการ / ผู้ประสานงาน */}
            <div className="bg-violet-50/40 border border-violet-100/80 rounded-2xl p-3">
              <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-violet-600" />
                  <span>อีเมลติดต่อของสถานประกอบการ / ผู้ประสานงาน</span>
                  <span className="text-rose-500 font-bold">*</span>
                </span>
                <span className="text-[10px] font-medium text-violet-600 bg-violet-100/60 px-2 py-0.5 rounded-full">
                  ตรวจสอบหรือแก้ไขได้
                </span>
              </label>
              <input
                type="email"
                value={acceptForm.companyEmail}
                onChange={(e) => setAcceptForm(prev => ({ ...prev, companyEmail: e.target.value, error: '' }))}
                placeholder="เช่น hr@company.com หรือ contact@company.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none text-slate-800 placeholder:text-slate-400"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1.5 mb-0">
                * ระบบจะใช้อีเมลนี้ในการส่งหนังสือส่งตัว เอกสารประสานงาน และแบบประเมินผลการฝึกงานอัตโนมัติ
              </p>
            </div>

            {/* ส่วนที่ 2: สิ่งที่ต้องการให้นักศึกษาเตรียมตัว */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                สิ่งที่อยากให้นักศึกษาเตรียมตัว / เอกสารหรืออุปกรณ์ที่ต้องนำมา (ถ้ามี)
              </label>
              <textarea
                rows={3}
                value={acceptForm.studentPreparation}
                onChange={(e) => setAcceptForm(prev => ({ ...prev, studentPreparation: e.target.value }))}
                placeholder="เช่น โน้ตบุ๊กส่วนตัว, สำเนาบัตรประชาชน, ชุดสุภาพ ฯลฯ"
                className="w-full rounded-2xl border border-slate-200 p-3 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none transition resize-none placeholder:text-slate-400 text-slate-800"
              />
            </div>

            {/* ส่วนที่ 3: ลงนามลายมือชื่อ */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  ลงนามลายมือชื่อผู้มีอำนาจ / ผู้ดูแลการฝึกงาน <span className="text-slate-400 font-normal">(ไม่บังคับ)</span>
                </label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-[11px] font-medium text-slate-400 hover:text-rose-600 flex items-center gap-1 transition cursor-pointer bg-transparent border-none p-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ล้างลายมือชื่อ (Clear)</span>
                </button>
              </div>

              <div className="w-full h-40 border border-dashed border-violet-200 rounded-2xl bg-violet-50/20 relative overflow-hidden flex items-center justify-center">
                <canvas
                  ref={signatureCanvasRef}
                  width={500}
                  height={160}
                  className="w-full h-full cursor-crosshair"
                  style={{ touchAction: 'none' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!hasSignature && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300 gap-1.5">
                    <PenTool className="w-5 h-5 text-slate-300 stroke-[1.5]" />
                    <span className="text-xs">วาดลายเซ็นสดลงในช่องนี้ (เซ็นด้วยเมาส์หรือนิ้วมือ)</span>
                  </div>
                )}
              </div>
            </div>

            {/* ส่วนที่ 4: ข้อมูลผู้ลงนาม */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  ชื่อ-นามสกุล ผู้ลงนาม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={acceptForm.signerName}
                  onChange={(e) => setAcceptForm(prev => ({ ...prev, signerName: e.target.value }))}
                  placeholder="เช่น นายสมศักดิ์ มั่นคง"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  ตำแหน่งผู้ลงนาม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={acceptForm.signerPosition}
                  onChange={(e) => setAcceptForm(prev => ({ ...prev, signerPosition: e.target.value }))}
                  placeholder="เช่น ผู้จัดการฝ่ายบุคคล / พี่เลี้ยงฝึกงาน"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none text-slate-800"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleRejectOpen}
                disabled={updating}
                className="mr-auto text-sm font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-4 py-2.5 rounded-xl transition cursor-pointer border-none bg-transparent disabled:opacity-50"
              >
                ปฏิเสธคำร้อง
              </button>
              <button
                type="button"
                onClick={resetAcceptForm}
                disabled={updating}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition cursor-pointer bg-white disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAcceptConfirm}
                disabled={updating}
                className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium shadow-sm shadow-violet-500/20 transition cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50"
                style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
              >
                {updating ? 'กำลังบันทึก...' : 'ยืนยันการตอบรับและส่งข้อมูล'}
              </button>
            </div>
          </section>
        )}

        {/* Already responded */}
        {(request.status === 'อนุมัติแล้ว' || request.status === 'ตอบรับแล้ว' || request.status === 'ปฏิเสธ') && !feedback.message && (
          <Alert severity={request.status === 'ปฏิเสธ' ? 'error' : 'success'} sx={{ borderRadius: 3 }} className="rounded-2xl">
            {request.status === 'ปฏิเสธ'
              ? 'สถานประกอบการปฏิเสธคำร้องนี้แล้ว'
              : 'สถานประกอบการตอบรับนักศึกษาเข้าฝึกงานเรียบร้อยแล้ว'}
          </Alert>
        )}

        {/* Company Response Info Display */}
        {(details.studentPreparation || details.signature || details.acceptanceDocument) && (
          <section className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-xs space-y-5">
            <h3 className="border-l-4 border-violet-600 pl-3 text-base font-bold text-slate-800 m-0">ข้อมูลการตอบรับจากสถานประกอบการ</h3>
            <div className="space-y-4">
              {details.studentPreparation && (
                <InfoItem label="สิ่งที่ให้นักศึกษาเตรียมตัวก่อนเริ่มฝึกงาน" value={details.studentPreparation} />
              )}
              {details.signature && (
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 font-medium mb-1">ลายมือชื่อผู้มีอำนาจ / ผู้ดูแลการฝึกงาน</div>
                  <div className="mt-2 p-3 bg-violet-50/30 border border-violet-100 rounded-2xl inline-block">
                    <img src={details.signature} alt="ลายมือชื่อ" className="h-16 object-contain" />
                    {(details.signerName || details.signerPosition) && (
                      <div className="text-xs text-slate-700 mt-1.5 font-medium">
                        {details.signerName}{details.signerPosition ? ` (${details.signerPosition})` : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {details.acceptanceDocument?.url && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100/80 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-800 truncate">{details.acceptanceDocument.fileName || 'เอกสารตอบรับ'}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">เอกสารยืนยันการตอบรับจากสถานประกอบการ</div>
                  </div>
                  <a
                    href={getUploadUrl(details.acceptanceDocument.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-[11px] font-semibold transition no-underline shrink-0"
                  >
                    เปิดดูเอกสาร
                  </a>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Reject Reason Dialog */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => !updating && setRejectDialog({ open: false, reason: '' })}
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
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-rose-500" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-800 m-0">ปฏิเสธคำร้องฝึกงาน</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed m-0">
                กรุณาระบุเหตุผลในการปฏิเสธ เพื่อแจ้งให้นักศึกษาและผู้ดูแลระบบทราบ
              </p>
            </div>
          </div>

          <label className="text-xs font-medium text-slate-600 mb-1.5 block">
            เหตุผลในการปฏิเสธ
          </label>
          <textarea
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="เช่น ตำแหน่งงานเต็มแล้ว, ไม่ตรงตามคุณสมบัติที่ต้องการ..."
            className="w-full box-border rounded-2xl border border-slate-200 p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/15 focus:border-rose-400 resize-none h-24 text-slate-800 bg-white"
          />

          <div className="mt-5 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejectDialog({ open: false, reason: '' })}
              disabled={updating}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer bg-transparent disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleRejectConfirm}
              disabled={updating}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-[0_4px_14px_rgba(225,29,72,0.25)] transition cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#e11d48', color: '#ffffff' }}
            >
              {updating ? 'กำลังดำเนินการ...' : 'ยืนยันปฏิเสธ'}
            </button>
          </div>
        </div>
      </Dialog>



      {/* Full-screen Minimal Lightbox */}
      {imageModal.open && imageModal.src && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={() => setImageModal({ open: false, src: '', title: '' })}
        >
          <img
            src={imageModal.src}
            alt={imageModal.title || 'ดูรูปขนาดเต็ม'}
            className="max-h-[88vh] max-w-[92vw] w-auto h-auto object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setImageModal({ open: false, src: '', title: '' })}
            className="absolute top-5 right-5 sm:top-7 sm:right-7 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border-none"
            aria-label="ปิด"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};

const buildAcceptFormDefaults = (req) => {
  const defaultCompanyEmail = (
    req.company_email ||
    req.details?.companyEmail ||
    req.details?.contactEmail ||
    req.details?.contact_email ||
    req.details?.supervisorEmail ||
    ''
  );
  return {
    companyEmail: defaultCompanyEmail,
    studentPreparation: '',
    signerName: req.details?.supervisor || req.details?.contactPerson || '',
    signerPosition: req.details?.supervisorPosition || req.details?.contactPosition || '',
    error: ''
  };
};

const InfoItem = ({ label, value }) => {
  const normalizeValue = (input) => {
    if (input === null || input === undefined || input === '') return '-';
    if (typeof input === 'string' || typeof input === 'number') {
      const text = String(input).trim();
      return text.length ? text : '-';
    }
    if (typeof input === 'object') {
      // Try to treat it like an address object first
      if ('house' in input || 'moo' in input || 'tambon' in input || 'amphur' in input || 'province' in input || 'postal' in input || 'detail' in input) {
        return formatAddress(input);
      }
      if (Array.isArray(input)) {
        return input.filter(Boolean).join(', ') || '-';
      }
      // Fallback: join object values that can be stringified
      const parts = Object.values(input)
        .map((item) => (typeof item === 'string' || typeof item === 'number' ? String(item).trim() : ''))
        .filter(Boolean);
      return parts.length ? parts.join(' ') : '-';
    }
    return String(input);
  };

  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
      <div className="text-sm font-semibold text-slate-800 whitespace-pre-wrap break-words leading-relaxed">{normalizeValue(value)}</div>
    </div>
  );
};

export default PublicRequestPage;

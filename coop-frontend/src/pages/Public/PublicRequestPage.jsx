import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Box, Paper, Typography, Chip, Divider, Stack, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert } from '@mui/material';
import api from '../../api/axios';
import { DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { CheckCircle2, RotateCcw, PenTool, FileText, Mail } from 'lucide-react';
import '../Admin/Shared/RequestDetailsPage.css';
import { formatAddress } from '../../utils/formatters';

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
  const [acceptDialog, setAcceptDialog] = useState({
    open: false,
    companyEmail: '',
    studentPreparation: '',
    signerName: '',
    signerPosition: '',
    evaluatorEmail: '',
    error: ''
  });
  const [hasSignature, setHasSignature] = useState(false);
  const signatureCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [imageModal, setImageModal] = useState({ open: false, src: '', title: '' });

  useEffect(() => {
    api.get(`/public/requests/${id}${responseTokenQuery}`)
      .then((res) => {
        if (res.data.data) {
          setRequest(res.data.data);
        } else {
          setError('ไม่พบข้อมูลคำร้อง');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('ไม่พบข้อมูลคำร้อง หรือลิงก์ไม่ถูกต้อง');
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

  const handleViewFile = (fileDataUrl, customFileName) => {
    if (!fileDataUrl) return;

    const defaultName = customFileName || `หนังสือขอความอนุเคราะห์_${request?.studentId || 'document'}.pdf`;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

    if (isMobile) {
      // บนโทรศัพท์มือถือ: ดาวน์โหลดไฟล์ลงเครื่องทันที
      const link = document.createElement('a');
      link.href = fileDataUrl;
      link.download = defaultName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // บนคอมพิวเตอร์ (Desktop): เปิด URL ในแท็บใหม่ทันทีผ่าน Native PDF Viewer
      if (fileDataUrl.startsWith('data:')) {
        try {
          const [header, base64] = fileDataUrl.split(',');
          const mimeMatch = header.match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
          const byteCharacters = atob(base64);
          const byteNumbers = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const blob = new Blob([byteNumbers], { type: mime });
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
        } catch {
          window.open(fileDataUrl, '_blank');
        }
      } else {
        window.open(fileDataUrl, '_blank');
      }
    }
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

  const handleAcceptOpen = () => {
    const defaultCompanyEmail = (
      request.company_email ||
      request.details?.companyEmail ||
      request.details?.contactEmail ||
      request.details?.contact_email ||
      request.details?.supervisorEmail ||
      ''
    );

    setAcceptDialog({
      open: true,
      companyEmail: defaultCompanyEmail,
      studentPreparation: '',
      signerName: request.details?.supervisor || request.details?.contactPerson || '',
      signerPosition: request.details?.supervisorPosition || request.details?.contactPosition || '',
      evaluatorEmail: request.evaluator_email || request.details?.evaluatorEmail || defaultCompanyEmail || '',
      error: ''
    });
    setHasSignature(false);
  };

  const handleAcceptConfirm = async () => {
    const compEmail = (acceptDialog.companyEmail || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!compEmail) {
      setAcceptDialog(prev => ({ ...prev, error: 'กรุณากรอกอีเมลติดต่อของสถานประกอบการ / ผู้ประสานงาน' }));
      return;
    }
    if (!emailRegex.test(compEmail)) {
      setAcceptDialog(prev => ({ ...prev, error: 'รูปแบบอีเมลติดต่อของสถานประกอบการไม่ถูกต้อง (ตัวอย่าง: hr@company.com)' }));
      return;
    }

    const evalEmail = (acceptDialog.evaluatorEmail || '').trim();
    if (evalEmail && !emailRegex.test(evalEmail)) {
      setAcceptDialog(prev => ({ ...prev, error: 'รูปแบบอีเมลสำหรับรับแบบประเมินไม่ถูกต้อง (ตัวอย่าง: supervisor@company.com)' }));
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
        company_comment: acceptDialog.studentPreparation.trim() || undefined,
        studentPreparation: acceptDialog.studentPreparation.trim() || undefined,
        signature: signatureDataUrl,
        signerName: acceptDialog.signerName.trim() || undefined,
        signerPosition: acceptDialog.signerPosition.trim() || undefined,
        evaluatorEmail: evalEmail || compEmail,
        evaluatorName: acceptDialog.signerName.trim() || undefined,
        evaluatorPosition: acceptDialog.signerPosition.trim() || undefined,
        companyResponse: {
          accepted: true,
          status: 'COMPANY_ACCEPTED',
          company_email: compEmail,
          companyEmail: compEmail,
          studentPreparation: acceptDialog.studentPreparation.trim() || '',
          signature: signatureDataUrl,
          signerName: acceptDialog.signerName.trim() || '',
          signerPosition: acceptDialog.signerPosition.trim() || '',
          evaluatorEmail: evalEmail || compEmail,
          respondedAt: new Date().toISOString()
        }
      };

      const res = await api.patch(`/public/requests/${id}/status${responseTokenQuery}`, payload);
      setRequest(res.data?.data || {
        ...request,
        status: companyAcceptedStatus,
        company_email: compEmail,
        evaluator_email: evalEmail || compEmail,
        details: {
          ...(request.details || {}),
          ...payload,
          companyEmail: compEmail,
          companyResponse: payload.companyResponse
        }
      });
      setAcceptDialog(prev => ({ ...prev, open: false }));
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
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', py: 4 }}>
      <div className="request-details-container">
        <div className="details-card">
          <header className="details-header" style={{ position: 'relative', minHeight: '140px', paddingRight: details.studentPhoto?.dataUrl ? '130px' : '20px' }}>
            <div>
              <h2>รายละเอียดคำร้องฝึกงาน</h2>
              <p style={{ color: '#718096', marginTop: '5px' }}>เลขที่คำร้อง: {request.id} (ยื่นเมื่อ: {new Date(request.submittedDate).toLocaleDateString('th-TH')})</p>
              <span className="status-badge-lg" style={{ marginTop: '10px', display: 'inline-block' }}>
                {getStatusChip(request.status)}
              </span>
            </div>
            {details.studentPhoto?.dataUrl && (
              <div 
                style={{ position: 'absolute', top: '20px', right: '20px', cursor: 'pointer' }}
                onClick={() => setImageModal({ open: true, src: details.studentPhoto.dataUrl, title: `รูปถ่ายนักศึกษา: ${request.studentName}` })}
                title="คลิกเพื่อดูรูปขนาดเต็ม"
              >
                <img 
                  src={details.studentPhoto.dataUrl} 
                  alt="รูปนักศึกษา" 
                  style={{ width: '100px', height: '120px', objectFit: 'cover', borderRadius: '6px', border: '2px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.12)', transition: 'transform 0.2s ease' }} 
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
              {studentInfo.lastSemesterGrade && (
                <div className="detail-item">
                  <span className="detail-label">เกรดเฉลี่ยเทอมล่าสุด</span>
                  <span className="detail-value">{studentInfo.lastSemesterGrade}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">โทรศัพท์ / อีเมลติดต่อ</span>
                <span className="detail-value">{studentInfo.phone || request.studentPhone || '-'} / {studentInfo.email || request.studentEmail || '-'}</span>
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
                <span className="detail-value">{details.contactPhone || '-'} / {request.company_email || details.companyEmail || details.contactEmail || '-'}</span>
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
            <h3>ความประสงค์และกำหนดวันฝึกงาน</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">ภาคการศึกษา / ช่วงฝึกงาน</span>
                <span className="detail-value">{internshipTermLabel || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">วันเริ่มฝึกงาน</span>
                <span className="detail-value">
                  {(request.internship_start_date || details.startDate) 
                    ? new Date(request.internship_start_date || details.startDate).toLocaleDateString('th-TH') 
                    : '-'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">วันสิ้นสุดการฝึกงาน</span>
                <span className="detail-value">
                  {(request.internship_end_date || details.endDate) 
                    ? new Date(request.internship_end_date || details.endDate).toLocaleDateString('th-TH') 
                    : '-'}
                </span>
              </div>
            </div>
          </section>

          {dispatchLetter?.dataUrl && (
            <section className="detail-section">
              <h3>หนังสือขอความอนุเคราะห์ / หนังสือส่งตัวนักศึกษา</h3>
              <div className="detail-grid">
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="p-4 rounded-2xl bg-white border border-violet-100 shadow-[0_4px_20px_rgba(124,58,237,0.04)] flex items-center justify-between flex-wrap gap-3">
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
                        onClick={() => {
                          const fileName = `หนังสือขอความอนุเคราะห์_${request.studentId || ''}${dispatchLetter.fileName && dispatchLetter.fileName.includes('.') ? '.' + dispatchLetter.fileName.split('.').pop() : '.pdf'}`;
                          const link = document.createElement('a');
                          link.href = dispatchLetter.dataUrl;
                          link.download = fileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer border-none flex items-center gap-1.5"
                        style={{ backgroundColor: '#f5f3ff', color: '#6d28d9' }}
                      >
                        <ArrowDownTrayIcon className="w-4 h-4 text-violet-600" />
                        <span>ดาวน์โหลด</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Feedback */}
          {feedback.message && (
            <section className="detail-section">
              <Alert severity={feedback.severity} sx={{ borderRadius: 2 }}>
                {feedback.message}
              </Alert>
            </section>
          )}

          {/* Accept / Reject Buttons */}
          {canRespond && (
            <section className="detail-section" style={{ textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                ตอบรับนักศึกษาเข้าฝึกงาน
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  disabled={updating}
                  onClick={handleRejectOpen}
                  sx={{ minWidth: 160, fontWeight: 700, borderRadius: 2, padding: '12px 24px' }}
                >
                  ปฏิเสธ
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  disabled={updating}
                  onClick={handleAcceptOpen}
                  sx={{ minWidth: 160, fontWeight: 700, borderRadius: 2, padding: '12px 24px' }}
                >
                  ตอบรับ
                </Button>
              </Stack>
            </section>
          )}

          {/* Already responded */}
          {(request.status === 'อนุมัติแล้ว' || request.status === 'ตอบรับแล้ว' || request.status === 'ปฏิเสธ') && !feedback.message && (
            <section className="detail-section">
              <Alert severity={request.status === 'ปฏิเสธ' ? 'error' : 'success'} sx={{ borderRadius: 2 }}>
                {request.status === 'ปฏิเสธ'
                  ? 'สถานประกอบการปฏิเสธคำร้องนี้แล้ว'
                  : 'สถานประกอบการตอบรับนักศึกษาเข้าฝึกงานเรียบร้อยแล้ว'}
              </Alert>
            </section>
          )}

          {/* Company Response Info Display */}
          {(details.studentPreparation || details.signature) && (
            <section className="detail-section">
              <h3>ข้อมูลการตอบรับจากสถานประกอบการ</h3>
              <div className="detail-grid">
                {details.studentPreparation && (
                  <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="detail-label">สิ่งที่ให้นักศึกษาเตรียมตัวก่อนเริ่มฝึกงาน</span>
                    <span className="detail-value">{details.studentPreparation}</span>
                  </div>
                )}
                {details.signature && (
                  <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="detail-label">ลายมือชื่อผู้มีอำนาจ / ผู้ดูแลการฝึกงาน</span>
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
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Reject Reason Dialog */}
      {/* Accept Confirmation Modal */}
      <Dialog
        open={acceptDialog.open}
        onClose={() => !updating && setAcceptDialog(prev => ({ ...prev, open: false }))}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          className: "rounded-[28px] bg-white p-6 max-w-lg w-full mx-auto shadow-[0_20px_50px_rgba(124,58,237,0.12)] border border-violet-100 max-h-[90vh] overflow-y-auto",
          sx: {
            borderRadius: '28px',
            bgcolor: '#ffffff',
            boxShadow: '0 20px 50px rgba(124,58,237,0.12)',
            border: '1px solid #ede9fe',
            maxWidth: '32rem',
            width: '100%',
            p: { xs: 2.5, sm: 3 },
            maxHeight: '90vh',
            overflowY: 'auto'
          }
        }}
      >
        <div>
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight m-0">
                ยืนยันการตอบรับนักศึกษาเข้าฝึกประสบการณ์
              </h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                {request.studentName} {request.studentId ? `(${request.studentId})` : ''}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 my-3" />

          {acceptDialog.error && (
            <div className="mb-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
              {acceptDialog.error}
            </div>
          )}

          {/* ส่วนที่ 1: อีเมลติดต่อของสถานประกอบการ / ผู้ประสานงาน */}
          <div className="mb-4 bg-violet-50/40 border border-violet-100/80 rounded-2xl p-3">
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
            <div className="relative">
              <input
                type="email"
                value={acceptDialog.companyEmail}
                onChange={(e) => setAcceptDialog(prev => ({ ...prev, companyEmail: e.target.value, error: '' }))}
                placeholder="เช่น hr@company.com หรือ contact@company.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none text-slate-800 placeholder:text-slate-400"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 mb-0">
              * ระบบจะบันทึกและจดจำอีเมลนี้ เพื่อใช้ในการส่งเอกสารและประสานงานอัตโนมัติในครั้งต่อไป
            </p>
          </div>

          {/* ส่วนที่ 2: สิ่งที่ต้องการให้นักศึกษาเตรียมตัวก่อนเริ่มฝึกงาน */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              สิ่งที่อยากให้นักศึกษาเตรียมตัว / เอกสารหรืออุปกรณ์ที่ต้องนำมา (ถ้ามี)
            </label>
            <textarea
              rows={3}
              value={acceptDialog.studentPreparation}
              onChange={(e) => setAcceptDialog(prev => ({ ...prev, studentPreparation: e.target.value }))}
              placeholder="เช่น โน้ตบุ๊กส่วนตัว, สำเนาบัตรประชาชน, ชุดสุภาพ ฯลฯ"
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none transition resize-none placeholder:text-slate-400 text-slate-800"
            />
          </div>

          {/* ส่วนที่ 2: การลงนามลายมือชื่อเพื่อรับรอง (Digital Signature) */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                ลงนามลายมือชื่อผู้มีอำนาจ / ผู้ดูแลการฝึกงาน
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

            {/* Canvas Signature Pad */}
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

            {/* ช่องกรอกชื่อ-นามสกุล และตำแหน่งของผู้ลงนาม */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  ชื่อ-นามสกุล ผู้ลงนาม
                </label>
                <input
                  type="text"
                  value={acceptDialog.signerName}
                  onChange={(e) => setAcceptDialog(prev => ({ ...prev, signerName: e.target.value }))}
                  placeholder="เช่น นายสมศักดิ์ มั่นคง"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  ตำแหน่งผู้ลงนาม
                </label>
                <input
                  type="text"
                  value={acceptDialog.signerPosition}
                  onChange={(e) => setAcceptDialog(prev => ({ ...prev, signerPosition: e.target.value }))}
                  placeholder="เช่น ผู้จัดการฝ่ายบุคคล / พี่เลี้ยงฝึกงาน"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none text-slate-800"
                />
              </div>
            </div>

            {/* ช่องอีเมลสำหรับรับผลประเมิน */}
            <div className="mt-2.5">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                อีเมลผู้ดูแล / สำหรับรับแบบประเมินนักศึกษา (ถ้ามี)
              </label>
              <input
                type="email"
                value={acceptDialog.evaluatorEmail}
                onChange={(e) => setAcceptDialog(prev => ({ ...prev, evaluatorEmail: e.target.value }))}
                placeholder="เช่น hr@company.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-violet-100 focus:border-violet-500 outline-none text-slate-800"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAcceptDialog(prev => ({ ...prev, open: false }))}
              disabled={updating}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer border-none bg-transparent"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleAcceptConfirm}
              disabled={updating}
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs shadow-xs transition cursor-pointer border-none flex items-center gap-1.5"
              style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
            >
              {updating ? 'กำลังบันทึก...' : 'ยืนยันการตอบรับและส่งข้อมูล'}
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, reason: '' })} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>ปฏิเสธคำร้อง</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            กรุณาระบุเหตุผลในการปฏิเสธ (ไม่บังคับ)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="เหตุผล"
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="ระบุเหตุผลที่ปฏิเสธ..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectDialog({ open: false, reason: '' })} disabled={updating}>
            ยกเลิก
          </Button>
          <Button variant="contained" color="error" onClick={handleRejectConfirm} disabled={updating}>
            ยืนยันปฏิเสธ
          </Button>
        </DialogActions>
      </Dialog>



      {/* Image Preview Dialog */}
      <Dialog 
        open={imageModal.open} 
        onClose={() => setImageModal({ open: false, src: '', title: '' })}
        maxWidth="md"
        disableScrollLock={true}
        ModalProps={{ disableScrollLock: true }}
        PaperProps={{ sx: { borderRadius: 3, p: 0.5, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
            {imageModal.title || 'ดูรูปขนาดเต็ม'}
          </Typography>
          <Button size="small" onClick={() => setImageModal({ open: false, src: '', title: '' })} sx={{ color: '#64748b', fontWeight: 700 }}>
            ปิด
          </Button>
        </DialogTitle>
        <DialogContent sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f8fafc' }}>
          <img 
            src={imageModal.src} 
            alt="Enlarged preview" 
            style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '8px', objectFit: 'contain', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} 
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
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
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>{normalizeValue(value)}</Typography>
    </Box>
  );
};

export default PublicRequestPage;

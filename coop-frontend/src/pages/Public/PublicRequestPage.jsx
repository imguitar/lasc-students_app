import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, Chip, Divider, Stack, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert } from '@mui/material';
import api from '../../api/axios';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import '../Admin/Shared/RequestDetailsPage.css';

const PublicRequestPage = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', severity: '' });
  const [rejectDialog, setRejectDialog] = useState({ open: false, reason: '' });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageModal, setImageModal] = useState({ open: false, src: '', title: '' });

  useEffect(() => {
    api.get(`/public/requests/${id}`)
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
  }, [id]);

  const formatAddress = (address) => {
    if (!address) return '-';
    if (typeof address === 'string') return address;
    const parts = [];
    if (address.house) parts.push(`บ้านเลขที่ ${address.house}`);
    if (address.moo) parts.push(`หมู่ ${address.moo}`);
    if (address.tambon) parts.push(`ตำบล ${address.tambon}`);
    if (address.amphur) parts.push(`อำเภอ ${address.amphur}`);
    if (address.province) parts.push(`จังหวัด ${address.province}`);
    if (address.postal) parts.push(`รหัสไปรษณีย์ ${address.postal}`);
    if (address.detail) parts.push(address.detail);
    return parts.length ? parts.join(' ') : '-';
  };

  const getStatusChip = (status) => {
    const map = {
      'รอสถานประกอบการตอบรับ': { color: 'default' },
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

  const handleAccept = async () => {
    setUpdating(true);
    try {
      await api.patch(`/public/requests/${id}/status`, { status: 'อนุมัติแล้ว' });
      setRequest({ ...request, status: 'อนุมัติแล้ว' });
      setFeedback({ message: 'ตอบรับนักศึกษาเข้าฝึกงานเรียบร้อยแล้ว', severity: 'success' });
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
      await api.patch(`/public/requests/${id}/status`, {
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
                <span className="detail-value">{details.contactPhone || '-'} / {details.contactEmail || '-'}</span>
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
              <h3>หนังสือส่งตัวนักศึกษา</h3>
              <div className="detail-grid">
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1.5,
                          bgcolor: '#e0e7ff',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '1.2rem',
                          flexShrink: 0,
                        }}
                      >
                        📄
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dispatchLetter.fileName || 'หนังสือส่งตัว'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          แนบโดยผู้ดูแลระบบ
                        </Typography>
                      </Box>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setPreviewOpen(true)}
                        sx={{ borderRadius: 1.5, fontWeight: 600 }}
                      >
                        ดูไฟล์
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        component="a"
                        href={dispatchLetter.dataUrl}
                        download={`หนังสือส่งตัวนักศึกษา_${request.studentId}${dispatchLetter.fileName && dispatchLetter.fileName.includes('.') ? '.' + dispatchLetter.fileName.split('.').pop() : ''}`}
                        sx={{ borderRadius: 1.5, fontWeight: 600, bgcolor: '#111', '&:hover': { bgcolor: '#000' } }}
                      >
                        ดาวน์โหลด
                      </Button>
                    </Stack>
                  </Paper>
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
                  onClick={handleAccept}
                  sx={{ minWidth: 160, fontWeight: 700, borderRadius: 2, padding: '12px 24px' }}
                >
                  ตอบรับ
                </Button>
              </Stack>
            </section>
          )}

          {/* Already responded */}
          {(request.status === 'อนุมัติแล้ว' || request.status === 'ปฏิเสธ') && !feedback.message && (
            <section className="detail-section">
              <Alert severity={request.status === 'อนุมัติแล้ว' ? 'success' : 'error'} sx={{ borderRadius: 2 }}>
                {request.status === 'อนุมัติแล้ว'
                  ? 'สถานประกอบการตอบรับนักศึกษาแล้ว'
                  : 'สถานประกอบการปฏิเสธคำร้องนี้แล้ว'}
              </Alert>
            </section>
          )}

        </div>
      </div>

      {/* Reject Reason Dialog */}
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

      {/* Dispatch Letter Preview Dialog */}
      {dispatchLetter?.dataUrl && (
        <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="md">
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            หนังสือส่งตัวนักศึกษา
            <Button
              variant="contained"
              size="small"
              component="a"
              href={dispatchLetter.dataUrl}
              download={`หนังสือส่งตัวนักศึกษา_${request.studentId}${dispatchLetter.fileName && dispatchLetter.fileName.includes('.') ? '.' + dispatchLetter.fileName.split('.').pop() : ''}`}
              sx={{ borderRadius: 1.5, fontWeight: 600, bgcolor: '#111', '&:hover': { bgcolor: '#000' } }}
            >
              ดาวน์โหลด
            </Button>
          </DialogTitle>
          <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', bgcolor: '#f5f5f5', minHeight: 500 }}>
            {dispatchLetter.dataUrl.startsWith('data:application/pdf') ? (
              <iframe
                src={dispatchLetter.dataUrl}
                title="หนังสือส่งตัว"
                style={{ width: '100%', height: '70vh', border: 'none' }}
              />
            ) : dispatchLetter.dataUrl.startsWith('data:image/') ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <img
                  src={dispatchLetter.dataUrl}
                  alt="หนังสือส่งตัว"
                  style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }}
                />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>ไม่สามารถแสดงตัวอย่างไฟล์นี้ได้</Typography>
                <Button
                  variant="outlined"
                  component="a"
                  href={dispatchLetter.dataUrl}
                  download={`หนังสือส่งตัวนักศึกษา_${request.studentId}${dispatchLetter.fileName && dispatchLetter.fileName.includes('.') ? '.' + dispatchLetter.fileName.split('.').pop() : ''}`}
                  sx={{ borderRadius: 1.5 }}
                >
                  ดาวน์โหลดไฟล์แทน
                </Button>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      )}

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

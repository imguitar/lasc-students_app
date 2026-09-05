import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import { Button, Alert, Typography, Stack, Paper, Box, Chip } from '@mui/material';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '../../../api/axios';
import './DashboardPage.css'; // Reusing layout
import './PaymentProofPage.css'; // New styles
import StudentSidebar from '../../../components/StudentSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';

const compressImage = (file, maxWidth = 1920, maxHeight = 1920, quality = 0.85) =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mimeType, quality));
      };
      img.onerror = () => reject(new Error('ไม่สามารถโหลดไฟล์รูปภาพได้'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });

const PaymentProofPage = () => {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activePayment, setActivePayment] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'pending', 'approved', 'rejected', null
  const [uploadError, setUploadError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fetchPaymentStatus = (studentId, mounted) => {
    api.get(`/payments?studentId=${studentId}`)
      .then(res => {
        if (!mounted) return;
        const payments = res.data.data || [];
        // Get the latest payment record
        const latest = payments[payments.length - 1];
        if (latest) {
          setActivePayment(latest);
          setPaymentStatus(latest.status || 'pending');
        }
      })
      .catch(err => console.error("Failed to fetch payment status:", err));
  };

  useEffect(() => {
    let mounted = true;
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setStudentName(user.full_name || user.name);
      
      const studentId = user.student_code || user.studentId || user.username;
      if (studentId) {
        fetchPaymentStatus(studentId, mounted);
      }
    } else {
      navigate('/login');
    }
    return () => { mounted = false; };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) {
        alert('ไฟล์มีขนาดใหญ่เกินไป กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 20MB');
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setUploadError(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError(false);
    try {
      const slipDataUrl = await compressImage(file);
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : {};
      const studentId = user.student_code || user.studentId || user.username || '65xxxxx';

      const res = await api.post('/payments', {
        studentId,
        studentName: user.full_name || user.name || 'นักศึกษา',
        date: new Date().toISOString().split('T')[0],
        department: user.department || user.major || 'ไม่ระบุ',
        slipDataUrl,
        slipFileName: file.name
      });

      const newPayment = res.data.data || { status: 'pending', date: new Date().toISOString().split('T')[0] };
      setActivePayment(newPayment);
      setPaymentStatus('pending');
      setFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Upload Error:', error.response?.data || error.message);
      setUploadError(true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home">
          <img src={lascLogo} alt="LASC Logo" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '8px' }}>
          <UserProfileMenu />
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
        </div>
      </div>
      <StudentSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/dashboard/payment-proof"
        handleLogout={handleLogout}
      />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>หลักฐานการชำระค่าธรรมเนียมออกฝึก</h1>
            <p>อัพโหลดใบเสร็จหรือสลิปการโอนเงินเพื่อยืนยัน</p>
          </div>
          <div className="user-info">
            <span>{studentName}</span>
          </div>
        </header>

        <div className="content-wrapper">
          {/* Approved State */}
          {paymentStatus === 'approved' && (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: 3,
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1px solid #86efac',
                boxShadow: '0 4px 14px rgba(22, 101, 52, 0.06)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  bgcolor: '#16a34a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(22, 163, 74, 0.3)',
                }}
              >
                <CheckCircleIcon style={{ width: 24, height: 24 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#14532d', lineHeight: 1.2 }}>
                    อนุมัติหลักฐานการชำระเงินแล้ว
                  </Typography>
                  <Chip
                    label="อนุมัติแล้ว"
                    size="small"
                    sx={{
                      bgcolor: '#166534',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      height: 22,
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: '#166534', mb: 1.5, lineHeight: 1.5 }}>
                  เจ้าหน้าที่ได้ทำการตรวจสอบและอนุมัติหลักฐานการชำระค่าธรรมเนียมออกฝึกของคุณเรียบร้อยแล้ว
                </Typography>
                {activePayment?.date && (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      bgcolor: '#ffffff',
                      p: '4px 12px',
                      borderRadius: 2,
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700 }}>
                      วันที่ยืนยัน: {activePayment.date}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          )}

          {/* Pending State */}
          {paymentStatus === 'pending' && (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: 3,
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1px solid #fde68a',
                boxShadow: '0 4px 14px rgba(180, 83, 9, 0.06)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  bgcolor: '#d97706',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 10px rgba(217, 119, 6, 0.3)',
                }}
              >
                <ClockIcon style={{ width: 24, height: 24 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#78350f', lineHeight: 1.2 }}>
                    ส่งหลักฐานเรียบร้อยแล้ว (รอการตรวจสอบ)
                  </Typography>
                  <Chip
                    label="รอตรวจสอบ"
                    size="small"
                    sx={{
                      bgcolor: '#b45309',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      height: 22,
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: '#92400e', mb: 1.5, lineHeight: 1.5 }}>
                  ระบบได้รับหลักฐานการชำระเงินของคุณแล้ว ขณะนี้อยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบความถูกต้อง
                </Typography>
                {activePayment?.date && (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      bgcolor: '#ffffff',
                      p: '4px 12px',
                      borderRadius: 2,
                      border: '1px solid #fef3c7',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 700 }}>
                      วันที่ส่งหลักฐาน: {activePayment.date}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          )}

          {/* Form State (No payment submitted yet OR payment rejected) */}
          {(paymentStatus === null || paymentStatus === 'rejected') && (
            <div className="payment-proof-card">
              {paymentStatus === 'rejected' && (
                <Alert severity="error" icon={<ExclamationTriangleIcon style={{ width: 22, height: 22 }} />} sx={{ mb: 3, borderRadius: 2 }}>
                  <strong>หลักฐานชำระเงินถูกปฏิเสธ:</strong> กรุณาแนบไฟล์สลิปหรือใบเสร็จรับเงินใหม่อีกครั้ง
                </Alert>
              )}

              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>อัพโหลดใบเสร็จ</Typography>
              <Typography className="instruction-text" sx={{ color: '#475569', mb: 2 }}>
                กรุณาแนบไฟล์รูปภาพ (JPG, PNG) ของหลักฐานการชำระเงิน (ขนาดไม่เกิน 20MB)
              </Typography>
              
              <form onSubmit={handleUpload} className="upload-form">
                <div className="file-drop-area">
                  {previewUrl ? (
                    <div className="image-preview">
                      <img src={previewUrl} alt="Preview" />
                      <Button
                        type="button"
                        size="small"
                        color="error"
                        variant="outlined"
                        className="remove-btn"
                        onClick={() => {
                          setFile(null);
                          setPreviewUrl(null);
                        }}
                      >
                        ยกเลิก
                      </Button>
                    </div>
                  ) : (
                    <div className="placeholder-preview">
                      <span>คลิกเพื่อเลือกรูปภาพ</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="file-input"
                      />
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  variant="contained"
                  className="submit-btn"
                  disabled={!file || uploading}
                >
                  {uploading ? 'กำลังอัพโหลด...' : 'ยืนยันการส่งหลักฐาน'}
                </Button>
              </form>

              {uploadError && (
                <Stack spacing={1} sx={{ mt: 2 }}>
                  <Alert severity="error">เกิดข้อผิดพลาดในการอัพโหลด กรุณาลองใหม่อีกครั้ง</Alert>
                </Stack>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PaymentProofPage;

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Paper, Typography, CircularProgress, Button, Alert } from '@mui/material';
import api from '../api/axios';

/**
 * ปลายทางของเมนู "ระบบศูนย์ฝึกประสบการณ์" ในระบบฐานข้อมูลนักศึกษา
 *
 * รับตั๋วอายุสั้นจาก query string มาแลกเป็น token ของระบบนี้
 * ผู้ใช้ไม่ต้องกรอกรหัสผ่านซ้ำ และตั๋วใช้ได้ครั้งเดียว
 */
const SsoLandingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const exchanged = useRef(false);

  useEffect(() => {
    // React 18 StrictMode เรียก effect ซ้ำตอน dev — ตั๋วใช้ได้ครั้งเดียวจึงต้องกันไว้
    if (exchanged.current) return;
    exchanged.current = true;

    const ticket = searchParams.get('ticket');
    if (!ticket) {
      setError('ไม่พบตั๋วเข้าใช้งาน กรุณาเลือกเมนูระบบศูนย์ฝึกจากระบบฐานข้อมูลนักศึกษาอีกครั้ง');
      return;
    }

    // เอาตั๋วออกจาก URL ทันที ไม่ให้ค้างอยู่ในประวัติการเข้าชม
    window.history.replaceState({}, '', `${window.location.pathname}`);

    api.post('/auth/sso', { ticket })
      .then((res) => {
        const { token, user } = res.data;
        localStorage.setItem('user', JSON.stringify({ ...user, token }));
        navigate('/', { replace: true });
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'ไม่สามารถเข้าสู่ระบบศูนย์ฝึกได้');
      });
  }, [searchParams, navigate]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f7fa', p: 3 }}>
      <Paper elevation={0} sx={{ maxWidth: 480, width: '100%', p: 4, borderRadius: 3, textAlign: 'center', border: '1px solid #e2e8f0' }}>
        {error ? (
          <>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              เข้าสู่ระบบศูนย์ฝึกไม่สำเร็จ
            </Typography>
            <Alert severity="error" sx={{ my: 2, textAlign: 'left' }}>{error}</Alert>
            <Button variant="contained" onClick={() => navigate('/login', { replace: true })} sx={{ fontWeight: 700 }}>
              เข้าสู่ระบบด้วยรหัสผ่าน
            </Button>
          </>
        ) : (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6" fontWeight={700}>
              กำลังเข้าสู่ระบบศูนย์ฝึกประสบการณ์
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              ใช้สิทธิ์เดิมจากระบบฐานข้อมูลนักศึกษา ไม่ต้องกรอกรหัสผ่านซ้ำ
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default SsoLandingPage;

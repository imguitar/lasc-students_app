import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Paper, Typography, CircularProgress, Button, Alert } from '@mui/material';
import axios from 'axios';
import api from '../api/axios';
import { redirectToProfileLogin } from '../utils/sso';

const getProfileApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_PROFILE_API_URL;
  if (configuredUrl) return configuredUrl.trim().replace(/\/+$/, '');

  const isLocal = typeof window !== 'undefined'
    && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  return isLocal ? 'http://localhost:5001/api' : `${window.location.origin}/api`;
};

/**
 * SsoLandingPage:
 * รองรับการรับตั๋ว (ticket) หรือโทเคน (token) จากระบบฐานข้อมูลนักศึกษา (Profile)
 * เพื่อแลกหรือจัดเก็บ session เข้าสู่ระบบสหกิจศึกษา (Coop)
 * แล้วนำผู้ใช้เข้าสู่หน้า Dashboard ตามสิทธิ์
 */
const SsoLandingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const exchanged = useRef(false);

  useEffect(() => {
    // ป้องกัน StrictMode เรียกซ้ำในโหมด Dev
    if (exchanged.current) return;
    exchanged.current = true;

    const ticket = searchParams.get('ticket');
    const token = searchParams.get('token');

    // เอา ticket / token ออกจาก URL เพื่อความปลอดภัย
    window.history.replaceState({}, '', `${window.location.pathname}`);

    const handleSuccessLogin = (user, authToken) => {
      const userData = { ...user, token: authToken };
      localStorage.setItem('user', JSON.stringify(userData));

      // นำทางไปยังหน้า Dashboard ตามบทบาทของผู้ใช้งาน
      const role = String(user?.role || '').toLowerCase();
      if (role === 'admin') {
        navigate('/admin-dashboard', { replace: true });
      } else if (role === 'advisor' || role === 'teacher') {
        navigate('/advisor-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    };

    const exchangeTicket = (ssoTicket) => api.post('/auth/sso', { ticket: ssoTicket })
      .then((res) => {
        const { token: receivedToken, user } = res.data;
        handleSuccessLogin(user, receivedToken);
      });

    if (ticket) {
      // แลกตั๋วอายุสั้นเป็น token ผ่าน backend
      exchangeTicket(ticket)
        .catch((err) => {
          setError(err.response?.data?.message || 'ไม่สามารถเข้าสู่ระบบผ่าน SSO ได้');
        });
    } else if (token) {
      // ได้รับ JWT token มาโดยตรง
      api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          handleSuccessLogin(res.data?.user || {}, token);
        })
        .catch(() => {
          // หาก auth/me ไม่ผ่าน ให้ลองดูว่ามีข้อมูล user แนบมาใน query ด้วยหรือไม่
          const rawUser = searchParams.get('user');
          if (rawUser) {
            try {
              const parsedUser = JSON.parse(decodeURIComponent(rawUser));
              handleSuccessLogin(parsedUser, token);
              return;
            } catch {
              // Ignore malformed fallback user data.
            }
          }
          setError('โทเคนเข้าใช้งานไม่ถูกต้องหรือหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
        });
    } else {
      // เมื่อเข้าผ่าน /coop/login หน้า Profile จะ redirect กลับมาโดยไม่มี ticket
      // บน production ทั้งสองระบบอยู่ origin เดียวกัน จึงใช้ Profile token ที่มีอยู่
      // เพื่อขอตั๋ว SSO แล้วแลกเป็น Coop token โดยไม่ต้องให้ผู้ใช้ login ซ้ำ
      const profileToken = localStorage.getItem('token');
      const ticketRequest = profileToken
        ? axios.post(
          `${getProfileApiBaseUrl()}/auth/sso-ticket`,
          {},
          { headers: { Authorization: `Bearer ${profileToken}` } }
        )
        : Promise.reject(new Error('ไม่พบสิทธิ์จากระบบ Profile กรุณาเข้าสู่ระบบใหม่อีกครั้ง'));

      ticketRequest
        .then((res) => {
          const generatedTicket = res.data?.data?.ticket;
          if (!generatedTicket) {
            throw new Error('ไม่ได้รับตั๋วเข้าใช้งานจากระบบ Profile');
          }
          return exchangeTicket(generatedTicket);
        })
        .catch((err) => {
          setError(err.response?.data?.message || err.message || 'ไม่สามารถเชื่อมต่อสิทธิ์จากระบบ Profile ได้');
        });
    }
  }, [searchParams, navigate]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f7fa', p: 3 }}>
      <Paper elevation={0} sx={{ maxWidth: 480, width: '100%', p: 4, borderRadius: 3, textAlign: 'center', border: '1px solid #e2e8f0' }}>
        {error ? (
          <>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: '#0f172a' }}>
              เข้าสู่ระบบไม่สำเร็จ
            </Typography>
            <Alert severity="error" sx={{ my: 2, textAlign: 'left' }}>{error}</Alert>
            <Button
              variant="contained"
              onClick={() => redirectToProfileLogin()}
              sx={{ fontWeight: 700, bgcolor: '#0f172a', '&:hover': { bgcolor: '#1e293b' } }}
            >
              เข้าสู่ระบบผ่านระบบฐานข้อมูลนักศึกษา (Profile)
            </Button>
          </>
        ) : (
          <>
            <CircularProgress sx={{ mb: 2, color: '#0f172a' }} />
            <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a' }}>
              กำลังเข้าสู่ระบบสหกิจศึกษา
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              เชื่อมต่อสิทธิ์การใช้งานผ่านระบบฐานข้อมูลนักศึกษา (SSO)
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default SsoLandingPage;

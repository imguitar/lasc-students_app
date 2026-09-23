import { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { redirectToProfileLogin } from '../utils/sso';

/**
 * LoginRedirect:
 * เมื่อผู้ใช้เข้าสู่เส้นทาง /login หรือ /coop/login จะทำการ Redirect ทันที
 * ไปยังหน้า Login ของโปรเจกต์ Profile พร้อมส่ง callback param: ?redirect=...
 */
const LoginRedirect = () => {
  useEffect(() => {
    redirectToProfileLogin();
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f8fafc',
        gap: 2,
        px: 2,
        textAlign: 'center',
      }}
    >
      <CircularProgress sx={{ color: '#0f172a' }} />
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
        กำลังนำท่านไปยังหน้าเข้าสู่ระบบ (SSO)...
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748b' }}>
        ระบบกำลังเชื่อมต่อกับระบบฐานข้อมูลนักศึกษา (Profile Project)
      </Typography>
    </Box>
  );
};

export default LoginRedirect;

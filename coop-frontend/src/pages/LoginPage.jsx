import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  FormControlLabel,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import api from '../api/axios';
import './LoginPage.css';
import lascLogo from '../assets/LASC-SSKRU-1.png';
import sskruLogo from '../assets/SSKRU-logo-400x400-1-192x192.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password,
      });

      const { token, user } = response.data;

      // เก็บ user + token ใน localStorage ตรงกับ format เดิม
      const userData = { ...user, token };
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('Login success:', userData);

      // ไปที่หน้า Home เสมอหลังจาก Login ไม่ว่าจะเป็นสิทธิ์ไหน
      navigate('/');

    } catch (error) {
      console.error('Login error:', error);
      alert('เข้าสู่ระบบล้มเหลว: ' + (error.response?.data?.message || 'โปรดตรวจสอบความถูกต้อง'));
    }
  };

  return (
    <Box className="login-page">
      <Box className="login-wrapper">
        <Card
          className="login-card-redesigned"
          elevation={4}
          sx={{
            width: '100%',
            maxWidth: { xs: '330px', sm: '380px', md: '840px' },
            borderRadius: { xs: '16px', md: '24px' },
            position: 'relative',
            overflow: 'hidden',
            mx: 'auto',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: { xs: '8px', md: '12px' },
              backgroundColor: '#000000',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              minHeight: { xs: 'auto', md: 500 },
              pb: { xs: 1, md: 3 },
            }}
          >
            <Box className="left-panel">
              <Typography
                variant="h5"
                className="panel-title"
                sx={{
                  fontWeight: 700,
                  color: '#f8fafc',
                  mb: { xs: 0.5, md: 0.75 },
                  fontSize: { xs: '1.15rem', sm: '1.35rem', md: '1.6rem' },
                  letterSpacing: '-0.2px',
                }}
              >
                Professional Internship
              </Typography>
              <Typography
                className="panel-tagline"
                sx={{
                  color: 'rgba(248, 250, 252, 0.85)',
                  fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                  mb: { xs: 1.5, md: 4 },
                  textAlign: 'center',
                  letterSpacing: 0.2,
                  lineHeight: 1.3,
                }}
              >
                ( ระบบยื่นคำร้องขอเข้าฝึกประสบการณ์วิชาชีพ )
              </Typography>
              <Box className="university-logo-container">
                <img src={sskruLogo} alt="SSKRU Logo" className="university-logo" />
              </Box>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, borderColor: '#e5e7eb' }} />

            <Box className="right-panel">
              <Typography variant="h6" sx={{ fontWeight: 700, mb: { xs: 2, md: 3.5 }, fontSize: { xs: '1.05rem', md: '1.25rem' }, color: '#111111' }}>
                ยินดีต้อนรับ
              </Typography>

              <Box component="form" onSubmit={handleSubmit} className="redesigned-form">
                <TextField
                  fullWidth
                  variant="standard"
                  type="text"
                  name="email"
                  label="Email (อีเมล)"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />

                <TextField
                  fullWidth
                  variant="standard"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  label="Password (รหัสผ่าน)"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeSlashIcon style={{ width: 20, height: 20, color: '#666' }} />
                          ) : (
                            <EyeIcon style={{ width: 20, height: 20, color: '#666' }} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <FormControlLabel
                  control={<Checkbox name="rememberMe" checked={formData.rememberMe} onChange={handleChange} size="small" />}
                  label="Remember Me (จดจำการเข้าสู่ระบบ)"
                />

                <Button type="submit" variant="contained" fullWidth sx={{ mt: 1, py: 1.2, fontWeight: 700, bgcolor: '#111111' }}>
                  LOGIN
                </Button>
              </Box>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default LoginPage;

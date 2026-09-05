import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import {
  TextField,
  Button,
  Input,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton,
  Box,
  Typography,
  Alert
} from '@mui/material';
import { KeyIcon, EyeIcon, EyeSlashIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import asyncStorage from '../../../utils/asyncStorage';
import api from '../../../api/axios';
import './AdminDashboardPage.css';
import '../../Student/Dashboard/ProfilePage.css';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';

const AdminProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    position: ''
  });

  const [passModal, setPassModal] = useState({
    open: false,
    newPassword: '',
    confirmPassword: '',
    showPass: false,
    submitting: false,
    error: ''
  });

  useEffect(() => {
    let mounted = true;
    asyncStorage.getItem('user').then((raw) => {
      if (!mounted) return;
      if (!raw) {
        navigate('/login');
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        if (parsed.role !== 'admin') {
          navigate('/dashboard');
          return;
        }
        setUser(parsed);
        setForm({
          name: parsed.full_name || parsed.name || '',
          email: parsed.email || '',
          username: parsed.username || '',
          phone: parsed.phone || '',
          position: parsed.position || 'ผู้ดูแลระบบ'
        });
        setAvatarPreview(parsed.avatar || null);
      } catch (error) {
        setUser(null);
        navigate('/login');
      }
    });

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    await asyncStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setForm((prev) => ({ ...prev, [name]: numericValue }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAvatarClick = () => {
    if (editing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      let updated = {
        ...user,
        name: form.name,
        full_name: form.name,
        email: form.email,
        phone: form.phone,
        position: form.position,
        avatar: avatarPreview,
        role: 'admin'
      };

      if (user.id) {
        const res = await api.put(`/users/${user.id}`, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          position: form.position,
          avatar: avatarPreview
        });
        if (res.data && res.data.data) {
          updated = { ...updated, ...res.data.data };
        }
      }

      await asyncStorage.setItem('user', JSON.stringify(updated));
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setEditing(false);
      alert('บันทึกข้อมูลเสร็จสิ้น');
    } catch (err) {
      console.error("Failed to save admin profile:", err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลโปรไฟล์');
    }
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: '#e2e8f0', percent: 0 };
    let score = 0;
    if (pass.length >= 6) score += 25;
    if (pass.length >= 8) score += 15;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 20;
    if (/\d/.test(pass)) score += 20;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score += 20;

    if (score <= 30) {
      return { score, label: 'อ่อนมาก (เสี่ยงโดนคาดเดา)', color: '#ef4444', percent: Math.max(score, 15) };
    } else if (score <= 55) {
      return { score, label: 'ปานกลาง (พอใช้)', color: '#f59e0b', percent: score };
    } else if (score <= 75) {
      return { score, label: 'ดี (ปลอดภัย)', color: '#0284c7', percent: score };
    } else {
      return { score, label: 'สตรองมาก (ปลอดภัยสูง)', color: '#10b981', percent: Math.min(score, 100) };
    }
  };

  const handleSavePassword = async () => {
    if (!passModal.newPassword) {
      setPassModal(prev => ({ ...prev, error: 'กรุณากรอกรหัสผ่านใหม่' }));
      return;
    }
    if (passModal.newPassword !== passModal.confirmPassword) {
      setPassModal(prev => ({ ...prev, error: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน' }));
      return;
    }

    setPassModal(prev => ({ ...prev, submitting: true, error: '' }));
    try {
      if (user && user.id) {
        await api.put(`/users/${user.id}`, {
          password: passModal.newPassword
        });
      }
      alert('เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว');
      setPassModal({ open: false, newPassword: '', confirmPassword: '', showPass: false, submitting: false, error: '' });
    } catch (err) {
      console.error("Failed to update password:", err);
      setPassModal(prev => ({ ...prev, submitting: false, error: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' }));
    }
  };

  if (!user) return null;

  return (
    <div className="admin-dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home">
          <img src={lascLogo} alt="LASC Logo" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '8px' }}>
          <UserProfileMenu />
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
        </div>
      </div>
      <AdminSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/admin-dashboard/profile"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>ข้อมูลผู้ดูแลระบบ</h1>
            <p>จัดการข้อมูลโปรไฟล์และรูปภาพของคุณ</p>
          </div>
          <div className="user-info">
            <span>{user.name || user.username}</span>
          </div>
        </header>

        <div className="content-wrapper profile-content-wrapper">
          <div className="profile-layout">
            <div className="profile-avatar-section">
              <div
                className={`avatar-wrapper ${editing ? 'editable' : ''}`}
                onClick={handleAvatarClick}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder">
                    <span>{user.username ? user.username.charAt(0).toUpperCase() : 'A'}</span>
                  </div>
                )}

                {editing && (
                  <div className="avatar-overlay">
                    <span>แก้ไขรูป</span>
                  </div>
                )}
              </div>
              <Input
                type="file"
                inputRef={fileInputRef}
                onChange={handleFileChange}
                sx={{ display: 'none' }}
                inputProps={{ accept: 'image/*' }}
              />
              <h3 className="profile-name-display">
                {user.full_name || user.name || user.username}
              </h3>
              <span className="profile-role-badge">ผู้ดูแลระบบ</span>
            </div>

            <div className="profile-details-section">
              <div className="section-header-row">
                <h3>รายละเอียดบัญชี</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setPassModal({ open: true, newPassword: '', confirmPassword: '', showPass: false, submitting: false, error: '' })}
                    startIcon={<KeyIcon style={{ width: 16, height: 16 }} />}
                    sx={{ borderRadius: '8px', fontWeight: 600, color: '#475569', borderColor: '#cbd5e1' }}
                  >
                    เปลี่ยนรหัสผ่าน
                  </Button>
                  {!editing ? (
                    <Button variant="outlined" onClick={() => setEditing(true)} sx={{ borderRadius: '8px', fontWeight: 600 }}>
                      แก้ไขข้อมูล
                    </Button>
                  ) : (
                    <div className="edit-actions">
                      <Button
                        variant="text"
                        color="inherit"
                        onClick={() => {
                          setEditing(false);
                          setForm({
                            name: user.full_name || user.name || '',
                            email: user.email || '',
                            username: user.username || '',
                            phone: user.phone || '',
                            position: user.position || 'ผู้ดูแลระบบ'
                          });
                          setAvatarPreview(user.avatar || null);
                        }}
                      >
                        ยกเลิก
                      </Button>
                      <Button variant="contained" onClick={handleSave} sx={{ borderRadius: '8px', fontWeight: 700 }}>
                        บันทึกการเปลี่ยนแปลง
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="profile-fields-grid">
                <div className="form-group-profile">
                  <TextField
                    fullWidth
                    label="ชื่อ-นามสกุล"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    disabled={!editing}
                    InputLabelProps={{ shrink: true, sx: { fontWeight: 700, color: editing ? '#1e293b' : '#475569' } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: editing ? '#ffffff' : '#f8fafc' } }}
                  />
                </div>

                <div className="form-group-profile">
                  <TextField
                    fullWidth
                    label="ตำแหน่ง"
                    name="position"
                    value={form.position}
                    onChange={handleChange}
                    disabled={!editing}
                    InputLabelProps={{ shrink: true, sx: { fontWeight: 700, color: editing ? '#1e293b' : '#475569' } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: editing ? '#ffffff' : '#f8fafc' } }}
                  />
                </div>

                <div className="form-group-profile">
                  <TextField
                    fullWidth
                    label="ชื่อผู้ใช้ (Username)"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    disabled={true}
                    InputLabelProps={{ shrink: true, sx: { fontWeight: 700, color: '#475569' } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' } }}
                  />
                </div>

                <div className="form-group-profile">
                  <TextField
                    fullWidth
                    label="อีเมล"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    disabled={!editing}
                    InputLabelProps={{ shrink: true, sx: { fontWeight: 700, color: editing ? '#1e293b' : '#475569' } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: editing ? '#ffffff' : '#f8fafc' } }}
                  />
                </div>

                <div className="form-group-profile">
                  <TextField
                    fullWidth
                    label="เบอร์โทรศัพท์"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="09xxxxxxxx (สูงสุด 10 หลัก)"
                    inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }}
                    InputLabelProps={{ shrink: true, sx: { fontWeight: 700, color: editing ? '#1e293b' : '#475569' } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: editing ? '#ffffff' : '#f8fafc' } }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Modal */}
        <Dialog
          open={passModal.open}
          onClose={() => !passModal.submitting && setPassModal(prev => ({ ...prev, open: false }))}
          maxWidth="xs"
          fullWidth
          disableScrollLock={true}
          ModalProps={{ disableScrollLock: true }}
          PaperProps={{
            sx: {
              borderRadius: 3.5,
              p: 1,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1.25, pb: 1 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LockClosedIcon style={{ width: 20, height: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.2 }}>
                เปลี่ยนรหัสผ่าน
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                ตั้งรหัสผ่านใหม่สำหรับเข้าสู่ระบบ
              </Typography>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ pt: 2 }}>
            {passModal.error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: '0.85rem' }}>
                {passModal.error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                fullWidth
                label="รหัสผ่านใหม่"
                type={passModal.showPass ? 'text' : 'password'}
                value={passModal.newPassword}
                onChange={(e) => setPassModal(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="ระบุรหัสผ่านใหม่ที่ต้องการ"
                autoComplete="new-password"
                inputProps={{ autoComplete: 'new-password' }}
                InputLabelProps={{ shrink: true, sx: { fontWeight: 700 } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setPassModal(prev => ({ ...prev, showPass: !prev.showPass }))}
                        edge="end"
                      >
                        {passModal.showPass ? (
                          <EyeSlashIcon style={{ width: 18, height: 18, color: '#64748b' }} />
                        ) : (
                          <EyeIcon style={{ width: 18, height: 18, color: '#64748b' }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              {/* Real-time Password Strength Gauge Bar */}
              {passModal.newPassword && (() => {
                const strength = getPasswordStrength(passModal.newPassword);
                return (
                  <Box sx={{ mt: -0.5, px: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                        ความปลอดภัยรหัสผ่าน:
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: strength.color }}>
                        {strength.label}
                      </Typography>
                    </Box>
                    <Box sx={{ height: 6, width: '100%', bgcolor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: `${strength.percent}%`,
                          bgcolor: strength.color,
                          borderRadius: 3,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      />
                    </Box>
                  </Box>
                );
              })()}

              <TextField
                fullWidth
                label="ยืนยันรหัสผ่านใหม่"
                type={passModal.showPass ? 'text' : 'password'}
                value={passModal.confirmPassword}
                onChange={(e) => setPassModal(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                autoComplete="new-password"
                inputProps={{ autoComplete: 'new-password' }}
                InputLabelProps={{ shrink: true, sx: { fontWeight: 700 } }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2, pt: 1, justifyContent: 'space-between' }}>
            <Button
              onClick={() => setPassModal(prev => ({ ...prev, open: false }))}
              disabled={passModal.submitting}
              color="inherit"
              sx={{ borderRadius: 2, fontWeight: 700, px: 2.5 }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              onClick={handleSavePassword}
              disabled={passModal.submitting}
              sx={{
                borderRadius: 2,
                fontWeight: 800,
                px: 3,
                bgcolor: '#111111',
                color: '#ffffff',
                '&:hover': { bgcolor: '#262626' }
              }}
            >
              {passModal.submitting ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
            </Button>
          </DialogActions>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminProfilePage;

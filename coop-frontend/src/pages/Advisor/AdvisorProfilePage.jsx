import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../assets/LASC-SSKRU-1.png';
import {
  TextField,
  Button,
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
import {
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  CameraIcon,
  AcademicCapIcon,
  PencilSquareIcon,
  ClockIcon,
  CheckCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import asyncStorage from '../../utils/asyncStorage';
import api from '../../api/axios';
import '../Admin/Dashboard/AdminDashboardPage.css';
import AdvisorSidebar from '../../components/AdvisorSidebar';
import UserProfileMenu from '../../components/UserProfileMenu';
import NotificationBell from '../../components/NotificationBell';
import DateTimeIndicator from '../../components/DateTimeIndicator';

const DEPARTMENT_OPTIONS = [
  'สาขาวิชาวิทยาการคอมพิวเตอร์',
  'สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล',
  'สาขาวิชาสาธารณสุขชุมชน',
  'สาขาวิชาวิทยาศาสตร์การกีฬา',
  'สาขาวิชาเทคโนโลยีการเกษตร',
  'สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร',
  'สาขาวิชาอาชีวอนามัยและความปลอดภัย',
  'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์',
  'สาขาวิชาวิศวกรรมโลจิสติกส์',
  'สาขาวิชาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม',
  'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ',
  'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม'
];

const AdvisorProfilePage = () => {
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
    position: '',
    department: ''
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
        const role = String(parsed.role || '').toLowerCase();
        if (role !== 'advisor' && role !== 'teacher') {
          navigate('/dashboard');
          return;
        }
        setUser(parsed);
        setForm({
          name: parsed.full_name || parsed.name || '',
          email: parsed.email || '',
          username: parsed.username || '',
          phone: parsed.phone || '',
          position: parsed.position || 'อาจารย์ที่ปรึกษา',
          department: parsed.department || parsed.major || ''
        });
        setAvatarPreview(parsed.avatar || null);
      } catch (error) {
        setUser(null);
        navigate('/login');
      }
    });
    return () => { mounted = false; };
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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
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
        department: form.department,
        avatar: avatarPreview,
      };

      if (user.id) {
        const res = await api.put(`/users/${user.id}`, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          position: form.position,
          department: form.department,
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
      console.error("Failed to save advisor profile:", err);
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
        await api.put(`/users/${user.id}`, { password: passModal.newPassword });
      }
      alert('เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว');
      setPassModal({ open: false, newPassword: '', confirmPassword: '', showPass: false, submitting: false, error: '' });
    } catch (err) {
      console.error("Failed to update password:", err);
      setPassModal(prev => ({ ...prev, submitting: false, error: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' }));
    }
  };

  if (!user) return null;

  const inputClass = (editable) =>
    `w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 transition focus:bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 focus:outline-none ${editing && editable ? 'bg-white' : 'bg-gray-50/70'}`;

  return (
    <div className="admin-dashboard-container">
      <div className="mobile-top-navbar flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">☰</button>
          <Link to="/" className="mobile-top-logo flex items-center shrink-0" aria-label="LASC Home">
            <img src={lascLogo} alt="LASC Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
            <span className="hidden sm:inline text-base md:text-lg font-extrabold text-slate-900 tracking-tight whitespace-nowrap ml-2" style={{ fontFamily: '"Prompt", "Kanit", "Inter", sans-serif' }}>
              ระบบฝึกประสบการณ์วิชาชีพ
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <DateTimeIndicator />
          <NotificationBell />
          <UserProfileMenu />
        </div>
      </div>
      <AdvisorSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/advisor-dashboard/profile"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>ข้อมูลอาจารย์</h1>
            <p>จัดการข้อมูลส่วนตัว บัญชีผู้ใช้งาน และการตั้งค่าความปลอดภัย</p>
          </div>
        </header>

        <div className="content-wrapper">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Profile Card */}
            <div className="rounded-3xl border border-purple-100 shadow-sm p-8 text-center relative overflow-hidden bg-white">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-purple-500/15 via-indigo-400/15 to-purple-500/15" />

              <div className="relative">
                <div className="relative inline-block">
                  <div className="w-28 h-28 rounded-full overflow-hidden mx-auto ring-4 ring-purple-50 shadow-lg shadow-purple-500/25 bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-extrabold">
                        {(user.full_name || user.name || user.username || 'A').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="อัปโหลดรูปภาพใหม่"
                    className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white border border-purple-200 text-purple-600 shadow-md flex items-center justify-center hover:bg-purple-600 hover:text-white transition-all cursor-pointer"
                  >
                    <CameraIcon className="w-4 h-4" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <h3 className="m-0 mt-4 text-xl font-bold text-gray-800">
                  {user.full_name || user.name || user.username}
                </h3>
                <span className="bg-purple-50 text-purple-700 border border-purple-200/60 font-semibold px-3 py-1 rounded-full text-xs inline-flex items-center gap-1.5 mt-2">
                  <UserGroupIcon className="w-3.5 h-3.5" /> อาจารย์ที่ปรึกษา / อาจารย์นิเทศ
                </span>
              </div>

              <div className="mt-6 pt-5 border-t border-purple-50 flex flex-col gap-2.5 text-left">
                <span className="inline-flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  สถานะบัญชี: <span className="font-semibold text-emerald-600">กำลังใช้งาน</span>
                </span>
                {form.department && (
                  <span className="inline-flex items-start gap-2 text-xs text-slate-600">
                    <AcademicCapIcon className="w-4 h-4 text-purple-500 shrink-0 mt-px" />
                    สังกัด: {form.department}
                  </span>
                )}
                <span className="inline-flex items-start gap-2 text-xs text-slate-600">
                  <LockClosedIcon className="w-4 h-4 text-purple-500 shrink-0 mt-px" />
                  คณะศิลปศาสตร์และวิทยาศาสตร์
                </span>
              </div>
            </div>

            {/* Right: Account Details Card */}
            <div className="lg:col-span-2 rounded-3xl border border-purple-100 shadow-sm p-6 sm:p-8 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="m-0 text-lg font-bold text-gray-800">รายละเอียดบัญชี</h3>
                  <div className="h-1 w-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mt-1.5" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPassModal({ open: true, newPassword: '', confirmPassword: '', showPass: false, submitting: false, error: '' })}
                    className="border border-gray-200 text-gray-700 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 rounded-xl px-4 py-2 text-sm font-medium transition flex items-center gap-2 cursor-pointer bg-white"
                  >
                    <KeyIcon className="w-4 h-4" /> เปลี่ยนรหัสผ่าน
                  </button>
                  {!editing ? (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-medium shadow-md shadow-purple-500/20 transition flex items-center gap-2 cursor-pointer border-none"
                    >
                      <PencilSquareIcon className="w-4 h-4" /> แก้ไขข้อมูล
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false);
                          setForm({
                            name: user.full_name || user.name || '',
                            email: user.email || '',
                            username: user.username || '',
                            phone: user.phone || '',
                            position: user.position || 'อาจารย์ที่ปรึกษา',
                            department: user.department || user.major || ''
                          });
                          setAvatarPreview(user.avatar || null);
                        }}
                        className="border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl px-4 py-2 text-sm font-medium transition cursor-pointer bg-white"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-bold shadow-md shadow-purple-500/20 transition cursor-pointer border-none"
                      >
                        บันทึกการเปลี่ยนแปลง
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">ชื่อ-นามสกุลอาจารย์</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    disabled={!editing}
                    className={inputClass(true)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">ตำแหน่งทางวิชาการ</label>
                  <input
                    type="text"
                    name="position"
                    value={form.position}
                    onChange={handleChange}
                    disabled={!editing}
                    className={inputClass(true)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">สาขาวิชาที่สังกัด</label>
                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    disabled={!editing}
                    className={`${inputClass(true)} cursor-pointer disabled:cursor-default`}
                  >
                    <option value="">เลือกสาขา</option>
                    {DEPARTMENT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    {form.department && !DEPARTMENT_OPTIONS.includes(form.department) && (
                      <option value={form.department}>{form.department}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">ชื่อผู้ใช้ (Username)</label>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    disabled
                    className={inputClass(false)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">อีเมลติดต่อ</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    disabled={!editing}
                    className={inputClass(true)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">เบอร์โทรศัพท์ภายใน / มือถือ</label>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="09xxxxxxxx (สูงสุด 10 หลัก)"
                    maxLength={10}
                    inputMode="numeric"
                    className={inputClass(true)}
                  />
                </div>
              </div>

              <div className="mt-7 pt-5 border-t border-purple-50 flex flex-wrap items-center gap-x-6 gap-y-2.5">
                <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <ClockIcon className="w-4 h-4 text-purple-400" />
                  เข้าใช้งานล่าสุด: {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })} เวลา {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                </span>
                <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <LockClosedIcon className="w-4 h-4 text-purple-400" />
                  เชื่อมต่ออย่างปลอดภัยผ่านระบบ SSO มหาวิทยาลัย
                </span>
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
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                background: 'linear-gradient(90deg, #9333ea, #4f46e5)',
                color: '#ffffff',
                '&:hover': { background: 'linear-gradient(90deg, #7e22ce, #4338ca)' }
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

export default AdvisorProfilePage;

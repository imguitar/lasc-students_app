import { ModalActions, ModalCancelButton, ModalConfirmButton } from '../../components/ModalActions';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { User } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { ProfileField, ProfileSectionTitle } from '../../components/profile/ProfileFields';
import api from '../../api/axios';
import '../Admin/Dashboard/AdminDashboardPage.css';

const readStoredAdvisor = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const AdvisorProfilePage = () => {
  const navigate = useNavigate();
  const initialUser = readStoredAdvisor();
  const [user, setUser] = useState(initialUser);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(() => initialUser?.avatar || null);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(() => ({
    name: initialUser?.full_name || initialUser?.name || '',
    email: initialUser?.email || '',
    username: initialUser?.username || '',
    phone: initialUser?.phone || '',
    position: initialUser?.position || 'อาจารย์ที่ปรึกษา',
    department: initialUser?.department || initialUser?.major || ''
  }));

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
        navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/'));
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
        navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/'));
      }
    });
    return () => { mounted = false; };
  }, [navigate]);

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
    if (form.phone && !/^[0-9]{9,10}$/.test(form.phone)) {
      setFormError('เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      // ส่งเฉพาะเบอร์โทรที่มีค่าจริง (ชื่อ/ตำแหน่ง/อีเมล/สังกัดเป็นข้อมูลระบบ แก้ไขไม่ได้ และไม่ส่งค่าว่างไปทับของเดิม)
      let updated = { ...user, avatar: avatarPreview };
      if (user?.id && form.phone) {
        const res = await api.put(`/users/${user.id}`, { phone: form.phone });
        updated = { ...updated, ...(res.data?.data || {}), phone: form.phone };
      }
      await asyncStorage.setItem('user', JSON.stringify(updated));
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setEditing(false);
      alert('บันทึกข้อมูลเสร็จสิ้น');
    } catch (err) {
      console.error('Failed to save profile:', err);
      setFormError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลโปรไฟล์');
    } finally {
      setSaving(false);
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

  if (!user) {
    return (
      <>
        <main className="admin-main">
          <div className="content-wrapper">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
              <div className="rounded-3xl border border-purple-100 shadow-sm p-8 text-center bg-white">
                <div className="w-28 h-28 rounded-full bg-slate-200 mx-auto mb-4" />
                <div className="h-6 w-36 bg-slate-200 rounded-lg mx-auto mb-2" />
                <div className="h-4 w-24 bg-slate-100 rounded-md mx-auto" />
              </div>
              <div className="lg:col-span-2 rounded-3xl border border-purple-100 shadow-sm p-6 sm:p-8 bg-white">
                <div className="h-6 w-44 bg-slate-200 rounded-lg mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3.5 w-24 bg-slate-200 rounded" />
                      <div className="h-10 bg-slate-100 rounded-xl w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>

      <main className="admin-main">
        <div className="unified-card w-full max-w-7xl mx-auto">
        <PageHeader
          icon={User}
          title="ข้อมูลอาจารย์"
          subtitle="จัดการข้อมูลส่วนตัว บัญชีผู้ใช้งาน และการตั้งค่าความปลอดภัย"
          pill={`${user.full_name || user.name || user.username} (${user.position || 'อาจารย์ที่ปรึกษา'})`}
        />

        <div className="content-wrapper">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
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
                        disabled={saving}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-bold shadow-md shadow-purple-500/20 transition cursor-pointer border-none"
                      >
                        {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3.5 mt-5">
                  {editing && formError && (
                    <Alert severity="error" className="sm:col-span-2" sx={{ borderRadius: 2, fontSize: '0.85rem' }}>
                      {formError}
                    </Alert>
                  )}

                  <ProfileSectionTitle hint="(ข้อมูลจากระบบทะเบียน/SSO แก้ไขไม่ได้) หากข้อมูลไม่ถูกต้องกรุณาติดต่อผู้ดูแลระบบ">
                    ข้อมูลจากระบบ
                  </ProfileSectionTitle>
                  <ProfileField locked label="ชื่อ-นามสกุล" value={form.name || '-'} />
                  <ProfileField locked label="ตำแหน่ง" value={form.position || '-'} />
                  <ProfileField locked className="sm:col-span-2" label="หน่วยงาน / คณะ / สาขาวิชา" value={form.department || 'คณะศิลปศาสตร์และวิทยาศาสตร์'} />
                  <ProfileField locked className="sm:col-span-2" label="อีเมล" type="email" value={form.email || '-'} />

                  <div className="sm:col-span-2 mt-1" />
                  <ProfileSectionTitle hint="แก้ไขได้เฉพาะช่องนี้ กดปุ่ม แก้ไขข้อมูล เพื่อเริ่มพิมพ์">
                    ข้อมูลติดต่อ
                  </ProfileSectionTitle>
                  <ProfileField
                    editing={editing}
                    className="sm:col-span-2"
                    label="เบอร์โทรศัพท์ติดต่อ"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="09xxxxxxxx"
                    inputProps={{ maxLength: 10, inputMode: 'numeric', autoComplete: 'tel' }}
                  />
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

          <DialogActions sx={{ p: 2, pt: 1 }}>
            <ModalActions className="!pt-0 !mt-0 !border-0 w-full">
              <ModalCancelButton onClick={() => setPassModal(prev => ({ ...prev, open: false }))} disabled={passModal.submitting}>ยกเลิก</ModalCancelButton>
              <ModalConfirmButton tone="confirm" onClick={handleSavePassword} loading={passModal.submitting}>
                {passModal.submitting ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
              </ModalConfirmButton>
            </ModalActions>
          </DialogActions>
        </Dialog>
      </main>
    </>
  );
};

export default AdvisorProfilePage;

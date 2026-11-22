import { ModalActions, ModalCancelButton, ModalConfirmButton } from '../../../components/ModalActions';
import React, { useCallback, useEffect, useState, useRef } from 'react';
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
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import asyncStorage from '../../../utils/asyncStorage';
import { UserCircle } from 'lucide-react';
import api from '../../../api/axios';
import './DashboardPage.css';

const readStoredStudent = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ข้อมูลที่แก้ไขได้เอง (ตรงกับคอลัมน์ user.email/phone และ profile.prefix/firstname/lastname/address)
const buildForm = (d) => ({
  prefix: d?.prefix || '',
  firstname: d?.firstname || '',
  lastname: d?.lastname || '',
  email: d?.email || '',
  phone: d?.phone || '',
  address: d?.address || '',
});

// สไตล์ TextField ของหน้านี้ (Clean Violet): ขอบมน, ตัวหนังสือไม่โดนตัด, ช่อง read-only อ่านง่าย
const FIELD_SX = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: '#fff',
    fontSize: '0.9rem',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#c4b5fd' },
    '&.Mui-focused fieldset': { borderColor: '#7c3aed', borderWidth: 1.5 },
    '&.Mui-disabled': { backgroundColor: '#f8fafc' },
  },
  '& .MuiInputBase-input': { textOverflow: 'ellipsis' },
  '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#334155' },
  '& .MuiInputLabel-root': { fontWeight: 700, color: '#64748b' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#7c3aed' },
  '& .MuiInputLabel-root.Mui-disabled': { color: '#64748b' },
};

const ProfileField = ({ readOnly, editing, className = '', ...props }) => (
  <TextField
    fullWidth
    size="small"
    variant="outlined"
    InputLabelProps={{ shrink: true }}
    disabled={readOnly || !editing}
    sx={FIELD_SX}
    className={className}
    title={readOnly ? 'ข้อมูลนี้มาจากระบบทะเบียนกลาง ไม่สามารถแก้ไขได้เอง' : undefined}
    {...props}
  />
);

const SectionTitle = ({ children, hint }) => (
  <div className="sm:col-span-2 pt-2 first:pt-0">
    <h4 className="m-0 text-sm font-bold text-violet-900">{children}</h4>
    {hint && <p className="m-0 mt-0.5 text-xs text-slate-500">{hint}</p>}
    <div className="h-px bg-violet-100 mt-2" />
  </div>
);

const ProfilePage = () => {
  const initialUser = readStoredStudent();
  const [user, setUser] = useState(initialUser);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(() => buildForm(null));
  const [avatarPreview, setAvatarPreview] = useState(() => initialUser?.avatar || null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const [passModal, setPassModal] = useState({
    open: false,
    newPassword: '',
    confirmPassword: '',
    showPass: false,
    submitting: false,
    error: ''
  });

  const loadProfile = useCallback(async (userId) => {
    setLoadState('loading');
    try {
      const res = await api.get(`/users/${userId}/student-profile`);
      const d = res.data?.data;
      if (!d) throw new Error('empty');
      setData(d);
      setForm(buildForm(d));
      setLoadState('ready');
    } catch (err) {
      console.error('Failed to load student profile:', err);
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    asyncStorage.getItem('user').then((raw) => {
      if (!mounted) return;
      if (!raw) {
        navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/'));
        return;
      }
      try {
        const u = JSON.parse(raw);
        setUser(u);
        setAvatarPreview(u.avatar || null);
        if (u.id) loadProfile(u.id);
        else setLoadState('error');
      } catch {
        setUser(null);
        setLoadState('error');
      }
    });
    return () => { mounted = false; };
  }, [navigate, loadProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormError('');
    setForm((prev) => ({
      ...prev,
      [name]: name === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFormError('');
    setForm(buildForm(data));
    setAvatarPreview(user?.avatar || null);
  };

  const validateForm = () => {
    if (!form.firstname.trim()) return 'กรุณากรอกชื่อจริง';
    if (!form.lastname.trim()) return 'กรุณากรอกนามสกุล';
    if (!EMAIL_RE.test(form.email.trim())) return 'รูปแบบอีเมลไม่ถูกต้อง';
    if (form.phone && !/^\d{9,10}$/.test(form.phone)) return 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก';
    return '';
  };

  const handleSave = async () => {
    const problem = validateForm();
    if (problem) {
      setFormError(problem);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      // ส่งเฉพาะฟิลด์ที่แก้ได้เองและมีค่าจริง (ไม่ส่ง id/username/password/role/is_active/student_code และไม่ส่งค่าว่างไปทับของเดิม)
      const candidate = {
        prefix: form.prefix.trim(),
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        email: form.email.trim(),
        phone: form.phone,
        address: form.address.trim(),
      };
      const payload = Object.fromEntries(
        Object.entries(candidate).filter(([, v]) => typeof v === 'string' && v !== '')
      );
      // อีเมลส่งเฉพาะเมื่อผู้ใช้แก้จริง (กันเขียนทับอีเมลเดิมที่ใช้ล็อกอินโดยไม่ตั้งใจ)
      if (candidate.email === (data?.email || '')) delete payload.email;
      const res = await api.put(`/users/${user.id}`, payload);
      const saved = res.data?.data || {};
      const fullName = `${candidate.firstname} ${candidate.lastname}`.trim();
      const updatedUser = {
        ...user,
        ...saved,
        email: candidate.email,
        phone: candidate.phone,
        name: fullName,
        full_name: fullName,
        firstname: candidate.firstname,
        lastname: candidate.lastname,
        avatar: avatarPreview,
      };
      await asyncStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setData((prev) => ({ ...prev, ...candidate }));

      // ซิงก์เบอร์/อีเมลลงคำร้องที่ยื่นไว้ (ไม่ให้ความล้มเหลวตรงนี้ทำให้การบันทึกโปรไฟล์ล้มเหลว)
      const code = data?.student_code || updatedUser.student_code || updatedUser.username;
      if (code) {
        try {
          const reqRes = await api.get(`/requests?studentId=${code}`);
          for (const reqItem of reqRes.data.data || []) {
            let details = reqItem.details || {};
            if (typeof details === 'string') {
              try { details = JSON.parse(details); } catch { details = {}; }
            }
            if (candidate.phone) details.studentPhone = candidate.phone;
            details.student_info = {
              ...(details.student_info || {}),
              ...(candidate.phone ? { phone: candidate.phone } : {}),
              email: candidate.email,
            };
            await api.put(`/requests/${reqItem.id}`, { details: JSON.stringify(details) });
          }
        } catch (syncErr) {
          console.warn('Request details sync skipped:', syncErr.message);
        }
      }

      setEditing(false);
      alert('บันทึกข้อมูลเสร็จสิ้น');
    } catch (error) {
      console.error('Failed to save profile:', error);
      setFormError(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลโปรไฟล์');
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

  if (!user) {
    return (
      <>
        <main className="dashboard-main">
          <div className="content-wrapper">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
              <div className="rounded-3xl border border-purple-100 shadow-sm p-8 text-center bg-white">
                <div className="w-28 h-28 rounded-full bg-slate-200 mx-auto mb-4" />
                <div className="h-6 w-36 bg-slate-200 rounded-lg mx-auto mb-2" />
                <div className="h-4 w-24 bg-slate-100 rounded-md mx-auto" />
              </div>
              <div className="lg:col-span-2 rounded-2xl border border-[#E9E5F5] p-6 sm:p-8 bg-white">
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

  const ready = loadState === 'ready' && data;
  const displayName = ready
    ? `${data.prefix || ''}${data.firstname} ${data.lastname}`.trim()
    : (user.full_name || user.name || user.username);
  const requestStatusText = loadState === 'loading'
    ? 'กำลังโหลด...'
    : loadState === 'error'
      ? 'โหลดไม่สำเร็จ'
      : (data?.has_request ? data.latest_request_status || '-' : 'ยังไม่ยื่นคำร้อง');

  return (
    <>

      <main className="dashboard-main">
        <div className="w-full max-w-7xl mx-auto">
        <div className="unified-card">
          <header className="unified-card-head">
            <div className="unified-card-title-wrap">
              <span className="unified-card-icon"><UserCircle className="w-5 h-5" aria-hidden="true" /></span>
              <div className="min-w-0">
                <h1 className="unified-card-title">ข้อมูลส่วนตัวนักศึกษา</h1>
                <p className="unified-card-sub">จัดการข้อมูลส่วนตัว บัญชีผู้ใช้งาน และการตั้งค่าความปลอดภัย</p>
              </div>
            </div>
            <div className="unified-card-user">
              <span className="unified-card-dot" aria-hidden="true" />
              <span className="truncate">{user.full_name || user.name || user.username}{user.username ? " (" + user.username + ")" : ""}</span>
            </div>
          </header>
          <div className="unified-card-body">
        <div className="content-wrapper">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Left: Profile Card */}
            <div className="rounded-2xl border border-[#E9E5F5] p-6 sm:p-8 text-center relative overflow-hidden bg-white min-w-0">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-purple-500/15 via-indigo-400/15 to-purple-500/15" />

              <div className="relative">
                <div className="relative inline-block">
                  <div className="w-28 h-28 rounded-full overflow-hidden mx-auto ring-4 ring-purple-50 shadow-lg shadow-purple-500/25 bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-extrabold">
                        {(data?.firstname || user.full_name || user.name || user.username || 'U').charAt(0).toUpperCase()}
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

                <h3 className="m-0 mt-4 text-xl font-bold text-gray-800 break-words">
                  {displayName}
                </h3>
                <span className="bg-purple-50 text-purple-700 border border-purple-200/60 font-semibold px-3 py-1 rounded-full text-xs inline-flex items-center gap-1.5 mt-2">
                  <AcademicCapIcon className="w-3.5 h-3.5" /> นักศึกษา
                </span>
              </div>

              <div className="mt-6 pt-5 border-t border-purple-50 flex flex-col gap-2.5 text-left">
                <span className="inline-flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  สถานะบัญชี: <span className="font-semibold text-emerald-600">{data && Number(data.is_active) === 0 ? 'ปิดใช้งาน' : 'กำลังใช้งาน'}</span>
                </span>
                <span className="inline-flex items-start gap-2 text-xs text-slate-600">
                  <ClipboardDocumentListIcon className="w-4 h-4 text-purple-500 shrink-0 mt-px" />
                  <span>สถานะคำร้อง: <span className="font-semibold text-purple-700 break-words">{requestStatusText}</span></span>
                </span>
                {ready && data.department && (
                  <span className="inline-flex items-start gap-2 text-xs text-slate-600">
                    <AcademicCapIcon className="w-4 h-4 text-purple-500 shrink-0 mt-px" />
                    {data.department}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Account Details Card */}
            <div className="lg:col-span-2 rounded-2xl border border-[#E9E5F5] p-6 sm:p-8 bg-white min-w-0">
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
                      disabled={!ready}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-medium shadow-md shadow-purple-500/20 transition flex items-center gap-2 cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PencilSquareIcon className="w-4 h-4" /> แก้ไขข้อมูล
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={saving}
                        className="border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl px-4 py-2 text-sm font-medium transition cursor-pointer bg-white disabled:opacity-50"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-bold shadow-md shadow-purple-500/20 transition cursor-pointer border-none disabled:opacity-60"
                      >
                        {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {loadState === 'loading' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6 animate-pulse" aria-busy="true">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-10 bg-slate-100 rounded-xl" />
                  ))}
                </div>
              )}

              {loadState === 'error' && (
                <Alert
                  severity="error"
                  sx={{ mt: 3, borderRadius: 2 }}
                  action={
                    <Button color="inherit" size="small" onClick={() => user?.id && loadProfile(user.id)}>
                      ลองใหม่
                    </Button>
                  }
                >
                  โหลดข้อมูลโปรไฟล์ไม่สำเร็จ
                </Alert>
              )}

              {ready && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5 mt-6">
                  {formError && (
                    <Alert severity="error" className="sm:col-span-2" sx={{ borderRadius: 2, fontSize: '0.85rem' }}>
                      {formError}
                    </Alert>
                  )}

                  <SectionTitle hint="ข้อมูลที่ผูกกับระบบทะเบียนกลาง/SSO จึงแก้ไขเองไม่ได้ ยกเว้นอีเมลและเบอร์โทรศัพท์">
                    ข้อมูลบัญชี
                  </SectionTitle>
                  <ProfileField readOnly editing={editing} label="รหัสนักศึกษา" value={data.student_code} />
                  <ProfileField readOnly editing={editing} label="ชื่อผู้ใช้ (Username)" value={data.username} />
                  <ProfileField
                    editing={editing}
                    className="sm:col-span-2"
                    label="อีเมล"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    inputProps={{ autoComplete: 'email' }}
                  />
                  <ProfileField
                    editing={editing}
                    className="sm:col-span-2"
                    label="เบอร์โทรศัพท์"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="09xxxxxxxx"
                    inputProps={{ maxLength: 10, inputMode: 'numeric', autoComplete: 'tel' }}
                  />

                  <div className="sm:col-span-2 mt-2" />
                  <SectionTitle hint="ชื่อและที่อยู่แก้ไขได้เมื่อกดปุ่ม แก้ไขข้อมูล ส่วนสาขา ชั้นปี เกรด และอาจารย์ที่ปรึกษาเป็นข้อมูลอ่านอย่างเดียว">
                    ข้อมูลประวัตินักศึกษา
                  </SectionTitle>
                  <ProfileField
                    editing={editing}
                    className="sm:col-span-2"
                    label="คำนำหน้า"
                    name="prefix"
                    value={form.prefix}
                    onChange={handleChange}
                    placeholder="นาย / นางสาว / นาง"
                    inputProps={{ maxLength: 50 }}
                  />
                  <ProfileField
                    editing={editing}
                    label="ชื่อจริง"
                    name="firstname"
                    value={form.firstname}
                    onChange={handleChange}
                    required
                    inputProps={{ maxLength: 50 }}
                  />
                  <ProfileField
                    editing={editing}
                    label="นามสกุล"
                    name="lastname"
                    value={form.lastname}
                    onChange={handleChange}
                    required
                    inputProps={{ maxLength: 50 }}
                  />
                  <ProfileField readOnly editing={editing} className="sm:col-span-2" label="สาขาวิชา" value={data.department || '-'} />
                  <ProfileField
                    readOnly
                    editing={editing}
                    label="ชั้นปี"
                    value={data.year_level ? `ปีที่ ${data.year_level}` : '-'}
                  />
                  <ProfileField readOnly editing={editing} label="เกรดเฉลี่ยสะสม (GPAX)" value={data.gpa || '-'} />
                  <ProfileField
                    readOnly
                    editing={editing}
                    className="sm:col-span-2"
                    label="อาจารย์ที่ปรึกษา"
                    value={data.advisor_name || 'ยังไม่ได้กำหนด'}
                  />
                  <ProfileField
                    editing={editing}
                    className="sm:col-span-2"
                    label="ที่อยู่ปัจจุบัน"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    multiline
                    minRows={2}
                    maxRows={5}
                    placeholder="บ้านเลขที่ หมู่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                  />
                </div>
              )}

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

          <DialogActions sx={{ p: 2, pt: 1 }}>
            <ModalActions className="!pt-0 !mt-0 !border-0 w-full">
              <ModalCancelButton onClick={() => setPassModal(prev => ({ ...prev, open: false }))} disabled={passModal.submitting}>ยกเลิก</ModalCancelButton>
              <ModalConfirmButton tone="confirm" onClick={handleSavePassword} loading={passModal.submitting}>
                {passModal.submitting ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
              </ModalConfirmButton>
            </ModalActions>
          </DialogActions>
        </Dialog>
          </div>
        </div>
        </div>
      </main>
    </>
  );
};

export default ProfilePage;

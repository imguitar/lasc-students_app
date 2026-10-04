import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import {
  Box, Button, Paper, TextField, Typography, Switch, Snackbar, Alert as MuiAlert, Divider
} from '@mui/material';
import api from '../../../api/axios';
import '../Dashboard/AdminDashboardPage.css';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';
import BannerManager from '../../../components/admin/BannerManager';
import AnnouncementManager from '../../../components/admin/AnnouncementManager';
import {
  HomeModernIcon, MegaphoneIcon, PhoneIcon, RectangleGroupIcon
} from '@heroicons/react/24/outline';

const AdminHomeEditorPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const [announcement, setAnnouncement] = useState({ is_active: false, text: '', link_url: '' });
  const [contact, setContact] = useState({ phone: '', email: '', facebook_url: '', facebook_name: '' });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/')); return; }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') { navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/')); return; }
    fetchSettings();
  }, [navigate]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      const map = {};
      (res.data.data || []).forEach((s) => { map[s.setting_key] = s.setting_value; });
      if (map.urgent_announcement) {
        setAnnouncement({
          is_active: !!map.urgent_announcement.is_active,
          text: map.urgent_announcement.text || '',
          link_url: map.urgent_announcement.link_url || '',
        });
      }
      if (map.contact_info) {
        setContact({
          phone: map.contact_info.phone || '',
          email: map.contact_info.email || '',
          facebook_url: map.contact_info.facebook_url || '',
          facebook_name: map.contact_info.facebook_name || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { localStorage.removeItem('user'); navigate('/'); };

  const saveSetting = async (key, value, successMessage) => {
    setSaving(true);
    try {
      await api.put(`/settings/${key}`, { value });
      setToast({ open: true, message: successMessage, severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.message || 'บันทึกไม่สำเร็จ', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const saveAnnouncement = () =>
    saveSetting('urgent_announcement', announcement, 'บันทึกแถบประกาศด่วนสำเร็จ');

  const saveContact = () =>
    saveSetting('contact_info', contact, 'บันทึกข้อมูลติดต่อสำเร็จ');

  return (
    <div className="admin-dashboard-container">
      <div className="mobile-top-navbar flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" style={{ width: 24, height: 24, display: "block" }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg></button>
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
      <AdminSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/admin-dashboard/home-editor"
        handleLogout={handleLogout}
      />

      <main className="admin-main" style={{ overflowX: 'hidden' }}>
        <header className="admin-header">
          <div>
            <h1 style={{display:'flex', alignItems:'center', gap:'8px'}}><HomeModernIcon style={{width: 32, height: 32}} /> จัดการเนื้อหาหน้าแรก</h1>
            <p>ศูนย์รวมแก้ไขเนื้อหาหน้าแรกของระบบ — แถบประกาศด่วน ข้อมูลติดต่อ สไลด์แบนเนอร์ และข่าวสาร</p>
          </div>
        </header>

        {loading ? (
          <Typography sx={{ color: '#94a3b8', py: 4, textAlign: 'center' }}>กำลังโหลด...</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* แถบประกาศด่วน */}
            <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MegaphoneIcon style={{ width: 22, height: 22, color: '#7c3aed' }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>แถบประกาศด่วน</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Switch
                    checked={announcement.is_active}
                    onChange={(e) => setAnnouncement(prev => ({ ...prev, is_active: e.target.checked }))}
                    color="success"
                  />
                  <Typography variant="body2" sx={{ color: announcement.is_active ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                    {announcement.is_active ? 'แสดงบนหน้าแรก' : 'ซ่อนไว้'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="ข้อความประกาศ"
                  value={announcement.text}
                  onChange={(e) => setAnnouncement(prev => ({ ...prev, text: e.target.value }))}
                  size="small"
                  fullWidth
                  multiline
                  minRows={4}
                  placeholder="เช่น ประกาศด่วน: ระบบเปิดรับคำร้องฝึกงานตั้งแต่วันที่ 1 สิงหาคม เป็นต้นไป"
                  sx={{ '& textarea': { resize: 'vertical', minHeight: '80px' } }}
                />
                <TextField
                  label="ลิงก์ปลายทาง (ไม่บังคับ — กดที่แถบแล้วเปิดลิงก์นี้)"
                  value={announcement.link_url}
                  onChange={(e) => setAnnouncement(prev => ({ ...prev, link_url: e.target.value }))}
                  size="small"
                  fullWidth
                  placeholder="https://..."
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={saveAnnouncement}
                    disabled={saving}
                    sx={{ bgcolor: '#111', '&:hover': { bgcolor: '#000' }, fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 4 }}
                  >
                    บันทึกประกาศด่วน
                  </Button>
                </Box>
              </Box>
            </Paper>

            {/* ข้อมูลติดต่อ */}
            <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PhoneIcon style={{ width: 22, height: 22, color: '#7c3aed' }} />
                <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>ข้อมูลติดต่อ (แถบด้านบนสุดของเว็บ)</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  label="เบอร์โทรศัพท์"
                  value={contact.phone}
                  onChange={(e) => setContact(prev => ({ ...prev, phone: e.target.value }))}
                  size="small"
                  fullWidth
                  placeholder="02-XXX-XXXX"
                />
                <TextField
                  label="อีเมลติดต่อ"
                  value={contact.email}
                  onChange={(e) => setContact(prev => ({ ...prev, email: e.target.value }))}
                  size="small"
                  fullWidth
                  placeholder="contact@sskru.ac.th"
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, mt: 2 }}>
                <TextField
                  label="ชื่อเพจ Facebook (ข้อความแสดงบนแถบบน)"
                  value={contact.facebook_name}
                  onChange={(e) => setContact(prev => ({ ...prev, facebook_name: e.target.value }))}
                  size="small"
                  fullWidth
                  placeholder="คณะศิลปศาสตร์และวิทยาศาสตร์"
                />
                <TextField
                  label="ลิงก์เพจ Facebook"
                  value={contact.facebook_url}
                  onChange={(e) => setContact(prev => ({ ...prev, facebook_url: e.target.value }))}
                  size="small"
                  fullWidth
                  placeholder="https://www.facebook.com/lascsskru"
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                ถ้าระบุลิงก์เพจ แถบด้านบนสุดจะแสดงเป็นลิงก์ Facebook แทนเบอร์โทรศัพท์
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={saveContact}
                  disabled={saving}
                  sx={{ bgcolor: '#111', '&:hover': { bgcolor: '#000' }, fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 4 }}
                >
                  บันทึกข้อมูลติดต่อ
                </Button>
              </Box>
            </Paper>

            {/* สไลด์แบนเนอร์ */}
            <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <RectangleGroupIcon style={{ width: 22, height: 22, color: '#7c3aed' }} />
                <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>สไลด์แบนเนอร์หน้าแรก</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <BannerManager />
            </Paper>

            {/* ข่าวสารและประกาศ */}
            <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 3 }}>
              <AnnouncementManager title="ข่าวสารและประกาศ (News & Announcements)" />
            </Paper>
          </Box>
        )}
      </main>

      <Snackbar open={toast.open} autoHideDuration={2600} onClose={() => setToast(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <MuiAlert elevation={6} variant="filled" onClose={() => setToast(prev => ({ ...prev, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>{toast.message}</MuiAlert>
      </Snackbar>
    </div>
  );
};

export default AdminHomeEditorPage;

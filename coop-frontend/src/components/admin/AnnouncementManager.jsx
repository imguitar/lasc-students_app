import { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, Snackbar, Alert as MuiAlert, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, FormControlLabel,
  Avatar, IconButton, InputBase, Zoom
} from '@mui/material';
import api from '../../api/axios';
import ImageEditorModal from '../ImageEditorModal';
import {
  MapPinIcon, PencilIcon, PhotoIcon, XMarkIcon, GlobeAltIcon,
  ChevronDownIcon, LinkIcon, NewspaperIcon
} from '@heroicons/react/24/outline';

const categories = ['รับสมัคร', 'ประกาศ', 'กิจกรรม', 'ทั่วไป'];

const categoryColors = {
  'รับสมัคร': { bg: '#dcfce7', color: '#166534' },
  'ประกาศ': { bg: '#dbeafe', color: '#1e40af' },
  'กิจกรรม': { bg: '#fef3c7', color: '#92400e' },
  'ทั่วไป': { bg: '#f3f4f6', color: '#374151' },
};

const emptyForm = { title: '', content: '', category: 'ทั่วไป', coverImage: '', link_url: '', is_pinned: false, is_active: true };

const AnnouncementManager = ({ title = 'ข่าวสารและประกาศ' }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [formDialog, setFormDialog] = useState({ open: false, mode: 'create', data: null });
  const [formData, setFormData] = useState(emptyForm);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, title: '' });
  const [editorModalOpen, setEditorModalOpen] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const openCreateDialog = () => {
    setFormData(emptyForm);
    setFormDialog({ open: true, mode: 'create', data: null });
  };

  const openEditDialog = (item) => {
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category,
      coverImage: item.coverImage || '',
      link_url: item.link_url || '',
      is_pinned: !!item.is_pinned,
      is_active: item.is_active !== undefined ? !!item.is_active : true,
    });
    setFormDialog({ open: true, mode: 'edit', data: item });
  };

  const handleCloseDialog = () => setFormDialog({ open: false, mode: 'create', data: null });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setToast({ open: true, message: 'ไฟล์รูปภาพต้องไม่เกิน 2MB', severity: 'warning' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, coverImage: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSaveEditedImage = ({ image }) => {
    setFormData(prev => ({ ...prev, coverImage: image }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setToast({ open: true, message: 'กรุณากรอกหัวข้อและเนื้อหา', severity: 'warning' });
      return;
    }
    try {
      if (formDialog.mode === 'create') {
        await api.post('/announcements', formData);
        setToast({ open: true, message: 'สร้างข่าวประชาสัมพันธ์สำเร็จ', severity: 'success' });
      } else {
        await api.put(`/announcements/${formDialog.data.id}`, formData);
        setToast({ open: true, message: 'อัปเดตข่าวสำเร็จ', severity: 'success' });
      }
      handleCloseDialog();
      fetchAnnouncements();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.message || 'เกิดข้อผิดพลาด', severity: 'error' });
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/announcements/${id}/toggle`);
      setToast({ open: true, message: res.data.message, severity: 'success' });
      fetchAnnouncements();
    } catch (err) {
      setToast({ open: true, message: 'เกิดข้อผิดพลาด', severity: 'error' });
    }
  };

  const handlePinToggle = async (id) => {
    try {
      const res = await api.patch(`/announcements/${id}/pin`);
      setToast({ open: true, message: res.data.message, severity: 'success' });
      fetchAnnouncements();
    } catch (err) {
      setToast({ open: true, message: 'เกิดข้อผิดพลาด', severity: 'error' });
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/announcements/${deleteDialog.id}`);
      setToast({ open: true, message: 'ลบข่าวสำเร็จ', severity: 'success' });
      setDeleteDialog({ open: false, id: null, title: '' });
      fetchAnnouncements();
    } catch (err) {
      setToast({ open: true, message: 'ลบไม่สำเร็จ', severity: 'error' });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <NewspaperIcon style={{ width: 22, height: 22, color: '#7c3aed', flexShrink: 0 }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>{title}</Typography>
        </Box>
        <Button variant="contained" onClick={openCreateDialog} sx={{ bgcolor: '#111', '&:hover': { bgcolor: '#000' }, fontWeight: 700, borderRadius: 2, textTransform: 'none', whiteSpace: 'nowrap' }}>
          + เพิ่มข่าวสาร/ประกาศ
        </Button>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        {/* มุมมองตาราง — เฉพาะหน้าจอ desktop */}
        <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>รูปภาพ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>หัวข้อข่าว</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>หมวดหมู่</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ปักหมุด</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>แสดงบนหน้าแรก</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center">กำลังโหลด...</TableCell></TableRow>
              ) : announcements.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: '#94a3b8' }}>ยังไม่มีข่าวประชาสัมพันธ์ กด "+ เพิ่มข่าวสาร/ประกาศ" เพื่อเริ่มต้น</TableCell></TableRow>
              ) : announcements.map((item) => {
                const catStyle = categoryColors[item.category] || categoryColors['ทั่วไป'];
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      {item.coverImage ? (
                        <Box component="img" src={item.coverImage} referrerPolicy="no-referrer" alt="" sx={{ width: 56, height: 40, borderRadius: 1, objectFit: 'cover', flexShrink: 0, border: '1px solid #e5e7eb' }} />
                      ) : (
                        <Box sx={{ width: 56, height: 40, borderRadius: 1, bgcolor: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <NewspaperIcon style={{ width: 20, height: 20, color: '#9ca3af' }} />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                        {formatDate(item.created_at)} · โดย {item.author || 'Admin'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={item.category} size="small" sx={{ bgcolor: catStyle.bg, color: catStyle.color, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        size="small"
                        checked={!!item.is_pinned}
                        onChange={() => handlePinToggle(item.id)}
                        color="error"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Switch
                          size="small"
                          checked={!!item.is_active}
                          onChange={() => handleToggle(item.id)}
                          color="success"
                        />
                        <Typography variant="caption" sx={{ color: item.is_active ? '#10b981' : '#94a3b8' }}>
                          {item.is_active ? 'แสดง' : 'ซ่อน'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" variant="outlined" onClick={() => openEditDialog(item)} sx={{ borderRadius: 999, fontWeight: 600 }}>แก้ไข</Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => setDeleteDialog({ open: true, id: item.id, title: item.title })} sx={{ borderRadius: 999, fontWeight: 600 }}>ลบ</Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* มุมมองการ์ด — เฉพาะหน้าจอมือถือ (กันตารางล้นจอ) */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {loading ? (
            <Typography sx={{ py: 4, textAlign: 'center', color: '#94a3b8' }}>กำลังโหลด...</Typography>
          ) : announcements.length === 0 ? (
            <Typography sx={{ py: 4, textAlign: 'center', color: '#94a3b8' }}>ยังไม่มีข่าวประชาสัมพันธ์ กด "+ เพิ่มข่าวสาร/ประกาศ" เพื่อเริ่มต้น</Typography>
          ) : announcements.map((item, index) => {
            const catStyle = categoryColors[item.category] || categoryColors['ทั่วไป'];
            return (
              <Box key={item.id} sx={{ p: 2, borderTop: index === 0 ? 'none' : '1px solid #f3f4f6' }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  {item.coverImage ? (
                    <Box component="img" src={item.coverImage} referrerPolicy="no-referrer" alt="" sx={{ width: 64, height: 48, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0, border: '1px solid #e5e7eb' }} />
                  ) : (
                    <Box sx={{ width: 64, height: 48, borderRadius: 1.5, bgcolor: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <NewspaperIcon style={{ width: 20, height: 20, color: '#9ca3af' }} />
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.25 }}>
                      {formatDate(item.created_at)} · โดย {item.author || 'Admin'}
                    </Typography>
                    <Chip label={item.category} size="small" sx={{ mt: 0.5, height: 20, fontSize: '0.7rem', bgcolor: catStyle.bg, color: catStyle.color, fontWeight: 600 }} />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, pt: 1.5, borderTop: '1px solid #f3f4f6', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Switch size="small" checked={!!item.is_pinned} onChange={() => handlePinToggle(item.id)} color="error" />
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>ปักหมุด</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Switch size="small" checked={!!item.is_active} onChange={() => handleToggle(item.id)} color="success" />
                      <Typography variant="caption" sx={{ color: item.is_active ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                        {item.is_active ? 'แสดง' : 'ซ่อน'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => openEditDialog(item)} sx={{ borderRadius: 999, fontWeight: 600 }}>แก้ไข</Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => setDeleteDialog({ open: true, id: item.id, title: item.title })} sx={{ borderRadius: 999, fontWeight: 600 }}>ลบ</Button>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* Create / Edit Dialog (Facebook Style) */}
      <Dialog open={formDialog.open} onClose={handleCloseDialog} fullWidth maxWidth="sm" scroll="paper" TransitionComponent={Zoom} PaperProps={{ sx: { borderRadius: 4, boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', maxHeight: '85vh', height: 'auto', display: 'flex', flexDirection: 'column' } }}>
        <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', borderBottom: '1px solid #f3f4f6', py: 1.75, color: '#111', flexShrink: 0 }}>
          {formDialog.mode === 'create' ? 'สร้างข่าวสาร/ประกาศ' : 'แก้ไขข่าวสาร/ประกาศ'}
          <IconButton onClick={handleCloseDialog} sx={{ position: 'absolute', right: 16, top: 12, bgcolor: '#f3f4f6', '&:hover': { bgcolor: '#e5e7eb' } }}>
            <XMarkIcon style={{ width: 20, height: 20, color: '#4b5563' }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflowY: 'auto' }}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 44, height: 44, bgcolor: '#111111', fontWeight: 700 }}>A</Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#111111' }}>ผู้ดูแลระบบ (Admin)</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#f3f4f6', px: 1, py: 0.25, borderRadius: 1.5, cursor: 'pointer', border: '1px solid #e5e7eb' }}>
                  <GlobeAltIcon style={{ width: 14, height: 14, color: '#4b5563' }} />
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    style={{ border: 'none', background: 'transparent', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', outline: 'none', appearance: 'none', paddingRight: '16px', cursor: 'pointer' }}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDownIcon style={{ width: 12, height: 12, color: '#4b5563', marginLeft: '-14px', pointerEvents: 'none' }} />
                </Box>
                {formData.is_pinned && (
                  <Chip size="small" icon={<MapPinIcon style={{ width: 12, height: 12 }} />} label="ปักหมุด" sx={{ height: 22, fontSize: '0.7rem', bgcolor: '#fef2f2', color: '#ef4444', fontWeight: 600, '& .MuiChip-icon': { color: '#ef4444' } }} />
                )}
              </Box>
            </Box>
          </Box>

          <Box sx={{ px: 3, pb: 2 }}>
            <InputBase
              placeholder="หัวข้อข่าว/ประกาศ..."
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              fullWidth
              sx={{ fontWeight: 800, fontSize: '1.5rem', mb: 1, color: '#111' }}
            />
            <InputBase
              placeholder="เขียนเนื้อหาข่าวสารที่นี่..."
              name="content"
              value={formData.content}
              onChange={handleFormChange}
              fullWidth
              multiline
              minRows={4}
              sx={{
                fontSize: '1.15rem', lineHeight: 1.6, color: '#374151',
                '& textarea': { resize: 'vertical' }
              }}
            />
            <TextField
              name="link_url"
              value={formData.link_url}
              onChange={handleFormChange}
              size="small"
              fullWidth
              placeholder="https://..."
              label="ลิงก์แนบเพิ่มเติม (ไม่บังคับ — เช่น Google Drive, PDF ประกาศ, เพจภายนอก)"
              sx={{ mt: 1.5 }}
              InputProps={{
                startAdornment: <LinkIcon style={{ width: 16, height: 16, color: '#9ca3af', marginRight: 8 }} />
              }}
            />
          </Box>

          {formData.coverImage && (
            <Box sx={{ position: 'relative', px: 3, pb: 2 }}>
              <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', border: '1px solid #e5e7eb', bgcolor: '#f3f4f6', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '150px' }}>
                <Box sx={{ position: 'absolute', right: 12, top: 12, display: 'flex', gap: 1, zIndex: 10 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setEditorModalOpen(true)}
                    sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: '#111', '&:hover': { bgcolor: '#fff' }, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderRadius: 2, fontWeight: 600 }}
                    startIcon={<PencilIcon style={{ width: 16, height: 16 }} />}
                  >
                    แก้ไข
                  </Button>
                  <IconButton
                    onClick={() => setFormData(prev => ({ ...prev, coverImage: '' }))}
                    sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: '#ef4444', '&:hover': { bgcolor: '#fff', color: '#dc2626' }, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  >
                    <XMarkIcon style={{ width: 20, height: 20 }} />
                  </IconButton>
                </Box>
                <img src={formData.coverImage} referrerPolicy="no-referrer" alt="preview" style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', display: 'block' }} />
              </Box>
            </Box>
          )}

          <Box sx={{ px: 3, pb: 2 }}>
            <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', bgcolor: '#f9fafb', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#111' }}>เพิ่มรูปภาพ:</Typography>
                <IconButton component="label" sx={{ color: '#10b981', bgcolor: '#ecfdf5', '&:hover': { bgcolor: '#d1fae5' } }} title="อัปโหลดรูปภาพ">
                  <PhotoIcon style={{ width: 24, height: 24 }} />
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      color="error"
                      checked={formData.is_pinned}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_pinned: e.target.checked }))}
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>ปักหมุดข่าวนี้ไว้ด้านบนสุด</Typography>}
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      color="success"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>เผยแพร่ทันที</Typography>}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #f3f4f6', bgcolor: '#f9fafb', flexShrink: 0 }}>
          <Button
            variant="contained"
            fullWidth
            disableElevation
            onClick={handleSubmit}
            disabled={!formData.title.trim() || !formData.content.trim()}
            sx={{
              bgcolor: (!formData.title.trim() || !formData.content.trim()) ? '#e5e7eb !important' : '#111111',
              color: (!formData.title.trim() || !formData.content.trim()) ? '#9ca3af !important' : '#ffffff',
              fontWeight: 700,
              py: 1.25,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': { bgcolor: '#000000' }
            }}
          >
            {formDialog.mode === 'create' ? 'เผยแพร่' : 'บันทึกการแก้ไข'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Editor Modal */}
      {formData.coverImage && (
        <ImageEditorModal
          open={editorModalOpen}
          onClose={() => setEditorModalOpen(false)}
          imageSrc={formData.coverImage}
          onSave={handleSaveEditedImage}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, title: '' })}>
        <DialogTitle>ยืนยันการลบข่าว</DialogTitle>
        <DialogContent>
          <Typography>คุณต้องการลบข่าว <strong>"{deleteDialog.title}"</strong> ใช่หรือไม่?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, title: '' })}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>ลบ</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={2600} onClose={() => setToast(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <MuiAlert elevation={6} variant="filled" onClose={() => setToast(prev => ({ ...prev, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>{toast.message}</MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default AnnouncementManager;

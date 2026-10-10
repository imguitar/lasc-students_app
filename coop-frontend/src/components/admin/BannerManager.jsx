import { useEffect, useState, useRef } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, Snackbar, Alert as MuiAlert, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Zoom, MenuItem, Slider, Menu
} from '@mui/material';
import api from '../../api/axios';
import { resolveBannerSrc, isExternalImageUrl } from '../../utils/bannerImage';
import ImageEditorModal from '../ImageEditorModal';
import { MoreVertical } from 'lucide-react';
import {
  PhotoIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon, PencilIcon, TrashIcon,
  LinkIcon, ArrowTopRightOnSquareIcon, ChevronDownIcon, DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

const emptyForm = {
  title: '',
  subtitle: '',
  image_url: '',
  image_base64: '',
  image_url_tablet: '',
  image_base64_tablet: '',
  image_url_mobile: '',
  image_base64_mobile: '',
  link_url: '',
  link_label: 'ดูรายละเอียด',
  display_order: 0,
  is_active: true,
  title_color: '#FFFFFF',
  subtitle_color: '#E2E8F0',
  show_text_overlay: true,
  overlay_style: 'gradient_purple',
  overlay_color: '#4c1d95',
  overlay_opacity: 75,
  content_mode: 'standard',
};

// preset สีเริ่มต้นของแต่ละรูปแบบ overlay — เลือกรูปแบบแล้วเติมสีให้อัตโนมัติ (แก้เองได้ต่อ)
const OVERLAY_STYLE_OPTIONS = [
  { value: 'gradient_purple', label: 'ไล่สีม่วงเข้ม (ทางการ)', color: '#4c1d95' },
  { value: 'gradient_dark', label: 'ไล่สีดำนุ่มนวล', color: '#000000' },
  { value: 'solid_purple', label: 'ม่วงทึบทั้งภาพ', color: '#4c1d95' },
  { value: 'solid', label: 'สีทึบทั้งภาพ (กำหนดสีเอง)', color: '#111827' },
  { value: 'custom', label: 'ไล่สีกำหนดเอง (เลือกสีเอง)', color: '#4c1d95' },
  { value: 'none', label: 'ไม่มีพื้นหลัง Overlay', color: '#000000' },
];

// ส่วนจัดการสไลด์แบนเนอร์ — ใช้ซ้ำได้ทั้งหน้า /admin-dashboard/banners และ Home Editor Hub
const BannerManager = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [formDialog, setFormDialog] = useState({ open: false, mode: 'create', data: null });
  const [formData, setFormData] = useState(emptyForm);
  const [fetchRemote, setFetchRemote] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, title: '' });
  const [actionMenu, setActionMenu] = useState({ anchor: null, item: null });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const res = await api.get('/banners');
      setBanners(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch banners:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    const nextOrder = banners.length ? Math.max(...banners.map(b => b.display_order || 0)) + 1 : 1;
    setFormData({ ...emptyForm, display_order: nextOrder });
    setFetchRemote(true);
    setVariantLinkOpen({ tablet: false, mobile: false });
    setVariantSectionOpen(false);
    setFormDialog({ open: true, mode: 'create', data: null });
  };

  const openEditDialog = (item) => {
    setFormData({
      title: item.title || '',
      subtitle: item.subtitle || '',
      image_url: item.image_url || '',
      image_base64: '',
      image_url_tablet: item.image_url_tablet || '',
      image_base64_tablet: '',
      image_url_mobile: item.image_url_mobile || '',
      image_base64_mobile: '',
      link_url: item.link_url || '',
      link_label: item.link_label || 'ดูรายละเอียด',
      display_order: item.display_order ?? 0,
      is_active: !!item.is_active,
      title_color: item.title_color || '#FFFFFF',
      subtitle_color: item.subtitle_color || '#E2E8F0',
      show_text_overlay: item.show_text_overlay === undefined ? true : !!item.show_text_overlay,
      overlay_style: item.overlay_style || 'gradient_purple',
      overlay_color: item.overlay_color || '#4c1d95',
      overlay_opacity: item.overlay_opacity ?? 75,
      content_mode: item.content_mode || 'standard',
    });
    setFetchRemote(true);
    // ถ้ารูปแยกอุปกรณ์เป็นลิงก์ภายนอกอยู่แล้ว ให้เปิดช่องลิงก์ไว้เลย
    setVariantLinkOpen({ tablet: isExternalImageUrl(item.image_url_tablet), mobile: isExternalImageUrl(item.image_url_mobile) });
    // มี variant อยู่แล้ว → กางกล่องออกมาให้เห็นเลย
    setVariantSectionOpen(!!(item.image_url_tablet || item.image_url_mobile));
    setFormDialog({ open: true, mode: 'edit', data: item });
  };

  const handleCloseDialog = () => setFormDialog({ open: false, mode: 'create', data: null });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [editorTarget, setEditorTarget] = useState('main'); // 'main' | 'tablet' | 'mobile'
  const [variantLinkOpen, setVariantLinkOpen] = useState({ tablet: false, mobile: false }); // ช่องวางลิงก์รูปแยกอุปกรณ์
  const [variantSectionOpen, setVariantSectionOpen] = useState(false); // กล่องรูปแยกอุปกรณ์ — default พับเก็บ

  // variant = ช่องรูปแยกอุปกรณ์ ('tablet' | 'mobile') — ค่าเริ่มต้นคือรูปหลัก
  const variantField = (variant) => (variant ? `image_base64_${variant}` : 'image_base64');
  const variantUrlField = (variant) => (variant ? `image_url_${variant}` : 'image_url');

  const handleImageUpload = (e, variant = '') => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setToast({ open: true, message: 'ไฟล์รูปภาพต้องไม่เกิน 5MB', severity: 'warning' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, [variantField(variant)]: reader.result }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const variantPreview = (variant) => formData[variantField(variant)] || resolveBannerSrc(formData[variantUrlField(variant)], '');

  const clearVariant = (variant) =>
    setFormData(prev => ({ ...prev, [variantField(variant)]: '', [variantUrlField(variant)]: '' }));

  const previewSrc = variantPreview('');
  const editorPreviewSrc = variantPreview(editorTarget === 'main' ? '' : editorTarget);
  const editorAspect = { main: 21 / 9, tablet: 21 / 9, mobile: 2 / 3 }[editorTarget];

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setToast({ open: true, message: 'กรุณากรอกหัวข้อแบนเนอร์', severity: 'warning' });
      return;
    }
    if (!formData.image_base64 && !formData.image_url.trim()) {
      setToast({ open: true, message: 'กรุณาอัปโหลดรูปภาพหรือระบุ URL รูปภาพ', severity: 'warning' });
      return;
    }
    const payload = {
      title: formData.title,
      subtitle: formData.subtitle,
      image_url: formData.image_base64 ? null : formData.image_url,
      image_base64: formData.image_base64 || undefined,
      // รูปแยกอุปกรณ์ — ส่ง key เสมอเพื่อให้ล้างค่าได้ (backend เก็บเฉพาะช่องที่ส่งมา)
      image_url_tablet: formData.image_base64_tablet ? null : (formData.image_url_tablet || null),
      image_base64_tablet: formData.image_base64_tablet || undefined,
      image_url_mobile: formData.image_base64_mobile ? null : (formData.image_url_mobile || null),
      image_base64_mobile: formData.image_base64_mobile || undefined,
      fetch_remote_image: !formData.image_base64 && fetchRemote && isExternalImageUrl(formData.image_url),
      link_url: formData.link_url,
      link_label: formData.link_label,
      display_order: Number(formData.display_order) || 0,
      is_active: formData.is_active,
      title_color: formData.title_color,
      subtitle_color: formData.subtitle_color,
      show_text_overlay: formData.show_text_overlay,
      overlay_style: formData.overlay_style,
      overlay_color: formData.overlay_color,
      overlay_opacity: Number(formData.overlay_opacity) || 0,
      content_mode: formData.content_mode,
    };
    try {
      if (formDialog.mode === 'create') {
        await api.post('/banners', payload);
        setToast({ open: true, message: 'สร้างแบนเนอร์สำเร็จ', severity: 'success' });
      } else {
        await api.put(`/banners/${formDialog.data.id}`, payload);
        setToast({ open: true, message: 'อัปเดตแบนเนอร์สำเร็จ', severity: 'success' });
      }
      handleCloseDialog();
      fetchBanners();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.message || 'เกิดข้อผิดพลาด', severity: 'error' });
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/banners/${id}/toggle`);
      setToast({ open: true, message: res.data.message, severity: 'success' });
      fetchBanners();
    } catch (err) {
      setToast({ open: true, message: 'เกิดข้อผิดพลาด', severity: 'error' });
    }
  };

  const handleMove = async (id, direction) => {
    const index = banners.findIndex(b => b.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= banners.length) return;
    const reordered = [...banners];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setBanners(reordered);
    try {
      await api.patch('/banners/reorder', { ids: reordered.map(b => b.id) });
    } catch (err) {
      setToast({ open: true, message: 'จัดลำดับไม่สำเร็จ', severity: 'error' });
      fetchBanners();
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/banners/${deleteDialog.id}`);
      setToast({ open: true, message: 'ลบแบนเนอร์สำเร็จ', severity: 'success' });
      setDeleteDialog({ open: false, id: null, title: '' });
      fetchBanners();
    } catch (err) {
      setToast({ open: true, message: 'ลบไม่สำเร็จ', severity: 'error' });
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" onClick={openCreateDialog} sx={{ bgcolor: '#111', '&:hover': { bgcolor: '#000' }, fontWeight: 700, borderRadius: 2 }}>
          + เพิ่มแบนเนอร์
        </Button>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        {/* มุมมองตาราง — เฉพาะหน้าจอ desktop */}
        <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 70 }}>ลำดับ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>แบนเนอร์</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ลิงก์ปลายทาง</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} align="center">กำลังโหลด...</TableCell></TableRow>
              ) : banners.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: '#94a3b8' }}>ยังไม่มีแบนเนอร์ กด "เพิ่มแบนเนอร์" เพื่อเริ่มต้น</TableCell></TableRow>
              ) : banners.map((item, index) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                      <IconButton size="small" disabled={index === 0} onClick={() => handleMove(item.id, -1)} aria-label="เลื่อนขึ้น">
                        <ArrowUpIcon style={{ width: 14, height: 14 }} />
                      </IconButton>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{index + 1}</Typography>
                      <IconButton size="small" disabled={index === banners.length - 1} onClick={() => handleMove(item.id, 1)} aria-label="เลื่อนลง">
                        <ArrowDownIcon style={{ width: 14, height: 14 }} />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box component="img" src={resolveBannerSrc(item.image_url, '')} referrerPolicy="no-referrer" alt="" sx={{ width: 96, height: 48, borderRadius: 1, objectFit: 'cover', flexShrink: 0, bgcolor: '#f1f5f9', border: '1px solid #e5e7eb' }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </Typography>
                        {item.subtitle && (
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.subtitle}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {item.link_url ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#6d28d9' }}>
                        <LinkIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                        <Typography
                          variant="caption"
                          component="a"
                          href={item.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: 'inherit', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
                        >
                          {item.link_label || item.link_url}
                          <ArrowTopRightOnSquareIcon style={{ width: 12, height: 12 }} />
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      size="small"
                      checked={!!item.is_active}
                      onChange={() => handleToggle(item.id)}
                      color="success"
                    />
                    <Typography variant="caption" sx={{ color: item.is_active ? '#10b981' : '#94a3b8' }}>
                      {item.is_active ? 'แสดง' : 'ซ่อน'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      aria-label={`จัดการแบนเนอร์ ${item.title}`}
                      aria-haspopup="menu"
                      title="จัดการ"
                      onClick={(e) => { e.stopPropagation(); setActionMenu({ anchor: e.currentTarget, item }); }}
                      sx={{ p: 0.75, color: '#94a3b8', '&:hover': { bgcolor: 'rgba(241,245,249,0.8)', color: '#475569' }, '&:active': { bgcolor: 'rgba(226,232,240,0.6)' } }}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Menu
          anchorEl={actionMenu.anchor}
          open={Boolean(actionMenu.anchor)}
          onClose={() => setActionMenu({ anchor: null, item: null })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={() => { openEditDialog(actionMenu.item); setActionMenu({ anchor: null, item: null }); }}>
            <PencilIcon style={{ width: 16, height: 16, marginRight: 10, color: '#6d28d9' }} /> แก้ไข
          </MenuItem>
          <MenuItem onClick={() => { setDeleteDialog({ open: true, id: actionMenu.item?.id, title: actionMenu.item?.title }); setActionMenu({ anchor: null, item: null }); }} sx={{ color: '#ef4444' }}>
            <TrashIcon style={{ width: 16, height: 16, marginRight: 10 }} /> ลบ
          </MenuItem>
        </Menu>

        {/* มุมมองการ์ด — เฉพาะหน้าจอมือถือ (กันตารางล้นจอ) */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {loading ? (
            <Typography sx={{ py: 4, textAlign: 'center', color: '#94a3b8' }}>กำลังโหลด...</Typography>
          ) : banners.length === 0 ? (
            <Typography sx={{ py: 4, textAlign: 'center', color: '#94a3b8' }}>ยังไม่มีแบนเนอร์ กด "+ เพิ่มแบนเนอร์" เพื่อเริ่มต้น</Typography>
          ) : banners.map((item, index) => (
            <Box key={item.id} sx={{ p: 2, borderTop: index === 0 ? 'none' : '1px solid #f3f4f6' }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box component="img" src={resolveBannerSrc(item.image_url, '')} referrerPolicy="no-referrer" alt="" sx={{ width: 88, height: 50, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0, bgcolor: '#f1f5f9', border: '1px solid #e5e7eb' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {item.title}
                  </Typography>
                  {item.subtitle && (
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.subtitle}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                  <IconButton size="small" disabled={index === 0} onClick={() => handleMove(item.id, -1)} aria-label="เลื่อนขึ้น">
                    <ArrowUpIcon style={{ width: 14, height: 14 }} />
                  </IconButton>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{index + 1}</Typography>
                  <IconButton size="small" disabled={index === banners.length - 1} onClick={() => handleMove(item.id, 1)} aria-label="เลื่อนลง">
                    <ArrowDownIcon style={{ width: 14, height: 14 }} />
                  </IconButton>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, pt: 1.5, borderTop: '1px solid #f3f4f6' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Switch size="small" checked={!!item.is_active} onChange={() => handleToggle(item.id)} color="success" />
                  <Typography variant="caption" sx={{ color: item.is_active ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                    {item.is_active ? 'แสดง' : 'ซ่อน'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => openEditDialog(item)} sx={{ borderRadius: 999, fontWeight: 600 }}>แก้ไข</Button>
                  <Button size="small" variant="outlined" color="error" onClick={() => setDeleteDialog({ open: true, id: item.id, title: item.title })} sx={{ borderRadius: 999, fontWeight: 600 }}>ลบ</Button>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Create / Edit Dialog */}
      <Dialog open={formDialog.open} onClose={handleCloseDialog} fullWidth maxWidth="sm" TransitionComponent={Zoom} PaperProps={{ sx: { borderRadius: { xs: 3, sm: 4 }, boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', m: { xs: 2, sm: 4 }, maxHeight: { xs: '85vh', sm: 'calc(100% - 64px)' } } }}>
        <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', borderBottom: '1px solid #f3f4f6', py: 2, color: '#111' }}>
          {formDialog.mode === 'create' ? 'เพิ่มแบนเนอร์ใหม่' : 'แก้ไขแบนเนอร์'}
          <IconButton onClick={handleCloseDialog} sx={{ position: 'absolute', right: 16, top: 12, bgcolor: '#f3f4f6', '&:hover': { bgcolor: '#e5e7eb' } }}>
            <XMarkIcon style={{ width: 20, height: 20, color: '#4b5563' }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* รูปภาพแบนเนอร์ */}
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', mb: 1 }}>รูปภาพแบนเนอร์ *</Typography>
              {previewSrc ? (
                <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid #e5e7eb', bgcolor: '#f1f5f9' }}>
                  <img src={previewSrc} alt="preview" referrerPolicy="no-referrer" style={{ width: '100%', height: 180, objectFit: 'contain', display: 'block' }} />
                  <Box sx={{ position: 'absolute', right: 8, top: 8, display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => { setEditorTarget('main'); setEditorOpen(true); }}
                      startIcon={<PencilIcon style={{ width: 14, height: 14 }} />}
                      sx={{ bgcolor: 'rgba(255,255,255,0.92)', color: '#111', '&:hover': { bgcolor: '#fff' }, boxShadow: '0 2px 4px rgba(0,0,0,0.15)', borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
                    >
                      แก้ไข
                    </Button>
                    <IconButton
                      onClick={() => setFormData(prev => ({ ...prev, image_base64: '', image_url: '' }))}
                      sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: '#ef4444', '&:hover': { bgcolor: '#fff' } }}
                      size="small"
                    >
                      <XMarkIcon style={{ width: 18, height: 18 }} />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <Button
                  component="label"
                  variant="outlined"
                  fullWidth
                  sx={{ borderStyle: 'dashed', borderRadius: 2, py: 4, color: '#6d28d9', borderColor: '#c4b5fd', bgcolor: '#faf5ff', textTransform: 'none', fontWeight: 600 }}
                  startIcon={<PhotoIcon style={{ width: 22, height: 22 }} />}
                >
                  อัปโหลดรูปภาพ (JPG, PNG, WEBP ≤ 5MB)
                  <input ref={fileInputRef} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} />
                </Button>
              )}
              {previewSrc && (
                <Button component="label" size="small" sx={{ mt: 1, textTransform: 'none' }} startIcon={<PhotoIcon style={{ width: 16, height: 16 }} />}>
                  เปลี่ยนรูปภาพ
                  <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} />
                </Button>
              )}
              <TextField
                label="หรือระบุ URL รูปภาพ"
                name="image_url"
                value={formData.image_url}
                onChange={handleFormChange}
                size="small"
                fullWidth
                disabled={!!formData.image_base64}
                placeholder="https://example.com/banner.jpg"
                sx={{ mt: 1 }}
              />
              {isExternalImageUrl(formData.image_url) && !formData.image_base64 && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1, p: 1.25, borderRadius: 1.5, bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
                  <Switch
                    size="small"
                    checked={fetchRemote}
                    onChange={(e) => setFetchRemote(e.target.checked)}
                    color="warning"
                  />
                  <Typography variant="caption" sx={{ color: '#92400e', lineHeight: 1.5 }}>
                    <strong>ดึงรูปมาเก็บในระบบถาวร (แนะนำ)</strong><br />
                    ลิงก์ภายนอกโดยเฉพาะจาก Facebook อาจหมดอายุหรือถูกบล็อก (403) — เลือกตัวเลือกนี้เพื่อให้เซิร์ฟเวอร์ดาวน์โหลดรูปมาเก็บไว้ในระบบ
                  </Typography>
                </Box>
              )}

              {/* รูปแยกตามอุปกรณ์ — ไม่บังคับ พับเก็บได้ (default ปิด ประหยัดพื้นที่บนมือถือ) */}
              <Box sx={{ mt: 1.5, border: '1px dashed #d8b4fe', borderRadius: 2, bgcolor: '#fdfaff', overflow: 'hidden' }}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setVariantSectionOpen(prev => !prev)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', px: 1.5, py: 1.25, border: 'none', bgcolor: variantSectionOpen ? '#f8f4ff' : 'transparent', cursor: 'pointer', textAlign: 'left' }}
                >
                  <DevicePhoneMobileIcon style={{ width: 18, height: 18, color: '#7c3aed', flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#6d28d9' }}>
                      ตั้งค่ารูปเฉพาะจอ แท็บเล็ต / มือถือ (ไม่บังคับ)
                    </Typography>
                    {!variantSectionOpen && ['tablet', 'mobile'].filter(k => variantPreview(k)).length > 0 && (
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        ตั้งค่าแล้ว {['tablet', 'mobile'].filter(k => variantPreview(k)).length}/2
                      </Typography>
                    )}
                  </Box>
                  <ChevronDownIcon style={{ width: 16, height: 16, color: '#7c3aed', flexShrink: 0, transition: 'transform .2s', transform: variantSectionOpen ? 'rotate(180deg)' : 'none' }} />
                </Box>
                {variantSectionOpen && (
                  <Box sx={{ px: 1.5, pb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.5 }}>
                      อัปโหลดรูปเฉพาะจอ — ถ้าเว้นว่างระบบจะใช้รูปหลัก (ด้านบน) แทนอัตโนมัติ
                    </Typography>
                    {[
                      { key: 'tablet', label: 'แท็บเล็ต (768–1023px)', suggest: 'แนะนำ 21:9 (เฟรมเดียวกับจอคอม)' },
                      { key: 'mobile', label: 'มือถือ (<768px)', suggest: 'แนะนำแนวตั้ง 2:3 (เฟรมเต็มจอ)' },
                    ].map((v) => {
                      const own = variantPreview(v.key);          // รูปเฉพาะอุปกรณ์ที่ตั้งเอง
                      const src = own || previewSrc;              // fallback → รูปหลัก
                      const linkOpen = variantLinkOpen[v.key];
                      return (
                        <Box key={v.key} sx={{ py: 1, borderTop: '1px solid #f3e8ff' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                            <Box sx={{ width: 64, height: 64, borderRadius: 1.5, overflow: 'hidden', border: '1px solid #e5e7eb', bgcolor: '#f8fafc', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {src
                                ? <img src={src} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                : <PhotoIcon style={{ width: 20, height: 20, color: '#cbd5e1' }} />}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>{v.label}</Typography>
                              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                                {v.suggest}
                                {!own && src && <Box component="span" sx={{ color: '#a78bfa' }}> — ใช้รูปหลักอัตโนมัติ</Box>}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1, flexWrap: 'wrap' }}>
                            <Button
                              size="small"
                              startIcon={<LinkIcon style={{ width: 13, height: 13 }} />}
                              onClick={() => setVariantLinkOpen(prev => ({ ...prev, [v.key]: !prev[v.key] }))}
                              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', px: 1.25, py: 0.5, borderRadius: 1.5, minWidth: 0, bgcolor: linkOpen ? '#ede9fe' : '#f1f5f9', color: linkOpen ? '#6d28d9' : '#475569', '&:hover': { bgcolor: linkOpen ? '#ddd6fe' : '#e2e8f0' } }}
                            >
                              ลิงก์
                            </Button>
                            <Button
                              component="label"
                              size="small"
                              startIcon={<PhotoIcon style={{ width: 13, height: 13 }} />}
                              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', px: 1.25, py: 0.5, borderRadius: 1.5, minWidth: 0, bgcolor: '#f1f5f9', color: '#475569', '&:hover': { bgcolor: '#e2e8f0' } }}
                            >
                              {own ? 'เปลี่ยนรูป' : 'อัปโหลด'}
                              <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => handleImageUpload(e, v.key)} />
                            </Button>
                            {own && (
                              <Button
                                size="small"
                                startIcon={<PencilIcon style={{ width: 13, height: 13 }} />}
                                onClick={() => { setEditorTarget(v.key); setEditorOpen(true); }}
                                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.72rem', px: 1.25, py: 0.5, borderRadius: 1.5, minWidth: 0, bgcolor: '#f1f5f9', color: '#475569', '&:hover': { bgcolor: '#e2e8f0' } }}
                              >
                                ครอป
                              </Button>
                            )}
                            {own && (
                              <IconButton size="small" title="ลบรูปนี้" onClick={() => clearVariant(v.key)} sx={{ ml: 'auto', color: '#f43f5e', bgcolor: '#fff1f2', '&:hover': { bgcolor: '#ffe4e6' }, p: 0.75 }}>
                                <XMarkIcon style={{ width: 14, height: 14 }} />
                              </IconButton>
                            )}
                          </Box>
                          {linkOpen && (
                            <TextField
                              label={`ลิงก์รูปสำหรับ${v.label}`}
                              name={variantUrlField(v.key)}
                              value={formData[variantUrlField(v.key)]}
                              onChange={handleFormChange}
                              size="small"
                              fullWidth
                              disabled={!!formData[variantField(v.key)]}
                              placeholder="https://example.com/banner.jpg"
                              helperText="ลิงก์ภายนอกจะถูกดึงมาเก็บในระบบถาวรตอนกดบันทึก"
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            </Box>

            <TextField label="หัวข้อแบนเนอร์ *" name="title" value={formData.title} onChange={handleFormChange} size="small" fullWidth />
            <TextField
              label="คำบรรยาย (subtitle)"
              name="subtitle"
              value={formData.subtitle}
              onChange={handleFormChange}
              size="small"
              fullWidth
              multiline
              minRows={2}
              placeholder="เช่น คณะศิลปศาสตร์และวิทยาศาสตร์"
              sx={{ '& textarea': { resize: 'vertical', minHeight: '48px' } }}
            />

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="ลิงก์ปลายทาง (ไม่บังคับ)"
                name="link_url"
                value={formData.link_url}
                onChange={handleFormChange}
                size="small"
                fullWidth
                placeholder="https://facebook.com/..."
              />
              <TextField
                label="ข้อความบนปุ่ม"
                name="link_label"
                value={formData.link_label}
                onChange={handleFormChange}
                size="small"
                sx={{ width: { xs: '100%', sm: 180 } }}
                disabled={!formData.link_url}
              />
            </Box>

            {/* การแสดงผลข้อความบนรูป — โหมด + สีตัวอักษร + overlay */}
            <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                select
                label="โหมดการแสดงผล"
                value={formData.content_mode}
                onChange={(e) => setFormData(prev => ({ ...prev, content_mode: e.target.value }))}
                size="small"
                fullWidth
                helperText={formData.content_mode === 'poster' ? 'โหมดโปสเตอร์: ซ่อนหัวข้อ/คำบรรยาย/ปุ่มทั้งหมด — ใช้เมื่อรูปมีข้อความในตัวแล้ว (ลิงก์ปลายทางจะกดได้ทั้งภาพ)' : undefined}
              >
                <MenuItem value="standard">มาตรฐาน — แสดงข้อความทับบนภาพ</MenuItem>
                <MenuItem value="poster">โปสเตอร์ — ภาพกราฟิกสำเร็จรูป ซ่อนข้อความทับ</MenuItem>
              </TextField>

              {formData.content_mode === 'standard' && (
              <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151' }}>ข้อความบนรูปแบนเนอร์</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Switch
                    size="small"
                    checked={formData.show_text_overlay}
                    onChange={(e) => setFormData(prev => ({ ...prev, show_text_overlay: e.target.checked }))}
                    color="success"
                  />
                  <Typography variant="caption" sx={{ color: formData.show_text_overlay ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                    {formData.show_text_overlay ? 'แสดง' : 'ซ่อน (รูปมีข้อความในตัว)'}
                  </Typography>
                </Box>
              </Box>
              {formData.show_text_overlay && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {[
                    { key: 'title_color', label: 'สีหัวข้อ' },
                    { key: 'subtitle_color', label: 'สีคำบรรยาย' },
                  ].map((c) => (
                    <Box key={c.key} sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 150 }}>
                      <Box
                        component="input"
                        type="color"
                        value={formData[c.key]}
                        onChange={(e) => setFormData(prev => ({ ...prev, [c.key]: e.target.value }))}
                        sx={{ width: 36, height: 36, border: '1px solid #e5e7eb', borderRadius: 1.5, p: 0.25, cursor: 'pointer', bgcolor: '#fff', flexShrink: 0 }}
                      />
                      <TextField
                        label={c.label}
                        value={formData[c.key]}
                        onChange={(e) => setFormData(prev => ({ ...prev, [c.key]: e.target.value }))}
                        size="small"
                        sx={{ flex: 1 }}
                        inputProps={{ maxLength: 9, style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                      />
                    </Box>
                  ))}
                </Box>
              )}

              {/* พื้นหลัง Overlay — รูปแบบ + สี + ความทึบ */}
              {formData.show_text_overlay && (
                <Box sx={{ borderTop: '1px dashed #e5e7eb', pt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151' }}>พื้นหลังหลังข้อความ (Overlay)</Typography>
                  <TextField
                    select
                    label="รูปแบบ Overlay"
                    value={formData.overlay_style}
                    onChange={(e) => {
                      const opt = OVERLAY_STYLE_OPTIONS.find(o => o.value === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        overlay_style: e.target.value,
                        overlay_color: opt ? opt.color : prev.overlay_color,
                      }));
                    }}
                    size="small"
                    fullWidth
                  >
                    {OVERLAY_STYLE_OPTIONS.map(o => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </TextField>
                  {formData.overlay_style !== 'none' && (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          component="input"
                          type="color"
                          value={/^#[0-9a-fA-F]{6}$/.test(formData.overlay_color) ? formData.overlay_color : '#4c1d95'}
                          onChange={(e) => setFormData(prev => ({ ...prev, overlay_color: e.target.value }))}
                          sx={{ width: 36, height: 36, border: '1px solid #e5e7eb', borderRadius: 1.5, p: 0.25, cursor: 'pointer', bgcolor: '#fff', flexShrink: 0 }}
                        />
                        <TextField
                          label="สี Overlay"
                          value={formData.overlay_color}
                          onChange={(e) => setFormData(prev => ({ ...prev, overlay_color: e.target.value }))}
                          size="small"
                          sx={{ flex: 1 }}
                          inputProps={{ maxLength: 9, style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                        />
                      </Box>
                      <Box sx={{ px: 0.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>ความทึบของ Overlay</Typography>
                          <Typography variant="caption" sx={{ color: '#111', fontWeight: 700, fontFamily: 'monospace' }}>{formData.overlay_opacity}%</Typography>
                        </Box>
                        <Slider
                          size="small"
                          min={0}
                          max={100}
                          value={Number(formData.overlay_opacity) || 0}
                          onChange={(_, v) => setFormData(prev => ({ ...prev, overlay_opacity: v }))}
                          sx={{ color: '#7c3aed' }}
                        />
                      </Box>
                    </>
                  )}
                </Box>
              )}
              </>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="ลำดับการแสดง"
                name="display_order"
                type="number"
                value={formData.display_order}
                onChange={handleFormChange}
                size="small"
                sx={{ width: 140 }}
                inputProps={{ min: 0 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  color="success"
                />
                <Typography variant="body2" sx={{ color: formData.is_active ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
                  {formData.is_active ? 'แสดงบนหน้าแรก' : 'ซ่อนไว้'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 1.5, sm: 2.5 }, position: 'sticky', bottom: 0, bgcolor: '#fff', borderTop: '1px solid #f3f4f6' }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none' }}>ยกเลิก</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.title.trim()}
            sx={{ bgcolor: '#111', '&:hover': { bgcolor: '#000' }, fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 4 }}
          >
            {formDialog.mode === 'create' ? 'บันทึกแบนเนอร์' : 'บันทึกการแก้ไข'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Editor — ครอป/หมุน/ปรับสี ก่อนบันทึก */}
      {editorPreviewSrc && (
        <ImageEditorModal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          imageSrc={editorPreviewSrc}
          title={editorTarget === 'main' ? 'แก้ไขรูปแบนเนอร์' : editorTarget === 'tablet' ? 'แก้ไขรูปสำหรับแท็บเล็ต' : 'แก้ไขรูปสำหรับมือถือ'}
          defaultAspect={editorAspect}
          onSave={({ image }) => {
            setFormData(prev => ({ ...prev, [variantField(editorTarget === 'main' ? '' : editorTarget)]: image }));
            setEditorOpen(false);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, title: '' })}>
        <DialogTitle>ยืนยันการลบแบนเนอร์</DialogTitle>
        <DialogContent>
          <Typography>คุณต้องการลบแบนเนอร์ <strong>"{deleteDialog.title}"</strong> ใช่หรือไม่?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, title: '' })}>ยกเลิก</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>ลบ</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={2600} onClose={() => setToast(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <MuiAlert elevation={6} variant="filled" onClose={() => setToast(prev => ({ ...prev, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>{toast.message}</MuiAlert>
      </Snackbar>
    </>
  );
};

export default BannerManager;

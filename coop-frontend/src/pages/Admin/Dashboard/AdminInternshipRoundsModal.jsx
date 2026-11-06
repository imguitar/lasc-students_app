import { ModalActions, ModalCancelButton } from '../../../components/ModalActions';
import ScheduleShell from './ScheduleShell';
import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Chip,
  IconButton,
  Alert,
  FormControlLabel,
  Checkbox,
  Stack,
  MenuItem,
  Menu,
} from '@mui/material';
import { TrashIcon, PencilSquareIcon, PlusIcon, BoltIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { MoreVertical } from 'lucide-react';
import api from '../../../api/axios';
import { computeEndDate, DEFAULT_REQUIRED_HOURS, HOURS_PER_DAY } from '../../../utils/workingDays';
import { getHolidaySet, getThaiHoliday, loadHolidaysFromServer } from '../../../utils/thaiHolidays';

// สถานะรอบจากวันที่ (เวลาไทย): ยังไม่ถึงวันเริ่ม = เปิดรับคำร้อง, อยู่ในช่วง = กำลังฝึกงาน, ปิดใช้งานหรือพ้นช่วงแล้ว = ปิดรอบ
const todayYMD = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
const roundStatus = (r) => {
  if (!r.isActive) return { label: 'ปิดรอบ', color: 'default' };
  const t = todayYMD();
  const start = String(r.startDate).slice(0, 10);
  const end = String(r.endDate).slice(0, 10);
  if (t < start) return { label: 'เปิดรับคำร้อง', color: 'info' };
  if (t <= end) return { label: 'กำลังฝึกงาน', color: 'success' };
  return { label: 'ปิดรอบ', color: 'default' };
};

const TERM_LABEL = { '1': 'ภาคเรียนที่ 1', '2': 'ภาคเรียนที่ 2', 'summer': 'ภาคฤดูร้อน' };

const AdminInternshipRoundsModal = ({ open, onClose, embedded = false }) => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    academicYear: '',
    semester: '1',
    startDate: '',
    requiredHours: DEFAULT_REQUIRED_HOURS,
    note: '',
    isActive: true,
  });
  // นับใหม่เมื่อรายการวันหยุดจากเซิร์ฟเวอร์เปลี่ยน
  const [holidayVersion, setHolidayVersion] = useState(0);

  const [applyTarget, setApplyTarget] = useState(null);
  const [actionMenu, setActionMenu] = useState({ anchor: null, round: null });
  const [applyOverwrite, setApplyOverwrite] = useState(false);
  const [applying, setApplying] = useState(false);

  const loadRounds = async () => {
    setLoading(true);
    try {
      const res = await api.get('/internship-rounds');
      setRounds(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'ไม่สามารถโหลดรอบฝึกงานได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onUpdated = () => setHolidayVersion((v) => v + 1);
    window.addEventListener('holidays-updated', onUpdated);
    return () => window.removeEventListener('holidays-updated', onUpdated);
  }, []);

  useEffect(() => {
    if (open) {
      loadHolidaysFromServer(true);
      loadRounds();
      setError('');
      setSuccessMsg('');
      setFormOpen(false);
      setApplyTarget(null);
    }
  }, [open]);

  const handleOpenForm = (round = null) => {
    if (round) {
      setEditingRound(round);
      setFormData({
        title: round.title || '',
        academicYear: round.academicYear || '',
        semester: round.semester || '1',
        startDate: round.startDate ? round.startDate.slice(0, 10) : '',
        requiredHours: Number(round.requiredHours) || DEFAULT_REQUIRED_HOURS,
        note: round.note || '',
        isActive: Boolean(round.isActive),
      });
    } else {
      const year = new Date().getFullYear() + 543;
      setEditingRound(null);
      setFormData({
        title: `รอบฝึกงาน ภาคเรียนที่ 1/${year}`,
        academicYear: `${year}`,
        semester: '1',
        startDate: '',
        requiredHours: DEFAULT_REQUIRED_HOURS,
        note: '',
        isActive: true,
      });
    }
    setFormOpen(true);
    setError('');
  };

  // คำนวณวันสิ้นสุดฝึกงานสด: นับเฉพาะ จ.-ศ. ข้ามวันหยุดนักขัตฤกษ์ในระบบ จนครบชั่วโมงตามหลักสูตร (วันละ 8 ชม.)
  const endCalc = useMemo(
    () => (formData.startDate ? computeEndDate(formData.startDate, formData.requiredHours, getHolidaySet()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData.startDate, formData.requiredHours, holidayVersion],
  );

  const handleSaveRound = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startDate) {
      setError('กรุณากรอกชื่อรอบและวันเริ่มฝึกงาน');
      return;
    }
    // วันสิ้นสุดไม่ส่งไป — backend คำนวณซ้ำด้วยตรรกะเดียวกันเป็นค่าทางการ
    const payload = {
      title: formData.title,
      academicYear: formData.academicYear,
      semester: formData.semester,
      startDate: formData.startDate,
      requiredHours: Number(formData.requiredHours) || DEFAULT_REQUIRED_HOURS,
      note: formData.note,
      isActive: formData.isActive,
    };

    try {
      if (editingRound) {
        await api.put(`/admin/internship-rounds/${editingRound.id}`, payload);
        setSuccessMsg('แก้ไขรอบฝึกงานสำเร็จ');
      } else {
        await api.post('/admin/internship-rounds', payload);
        setSuccessMsg('สร้างรอบฝึกงานใหม่สำเร็จ');
      }
      setFormOpen(false);
      loadRounds();
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handleDeleteRound = async (id) => {
    if (!window.confirm('คุณต้องการลบรอบฝึกงานนี้ใช่หรือไม่?')) return;
    try {
      await api.delete(`/admin/internship-rounds/${id}`);
      setSuccessMsg('ลบรอบฝึกงานเรียบร้อยแล้ว');
      loadRounds();
    } catch (err) {
      setError(err.response?.data?.message || 'ไม่สามารถลบรอบฝึกงานได้');
    }
  };

  const handleApplyRound = async () => {
    if (!applyTarget) return;
    setApplying(true);
    try {
      const res = await api.post(`/admin/internship-rounds/${applyTarget.id}/apply`, { overwrite: applyOverwrite });
      setSuccessMsg(res.data?.message || 'นำรอบไปใช้กับคำร้องเรียบร้อยแล้ว');
      setApplyTarget(null);
      setApplyOverwrite(false);
    } catch (err) {
      setError(err.response?.data?.message || 'ไม่สามารถนำรอบไปใช้กับคำร้องได้');
      setApplyTarget(null);
    } finally {
      setApplying(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('th-TH');
    } catch {
      return d;
    }
  };

  return (
    <ScheduleShell embedded={embedded} open={open} onClose={onClose} fullWidth maxWidth="md"
      PaperProps={{ sx: { m: 2, borderRadius: '1rem', p: 0, boxShadow: 24 } }}>
      <DialogTitle sx={embedded ? { p: 0, pb: 1.5, display: 'flex', justifyContent: 'flex-end' } : { px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Typography component="span" style={{ display: embedded ? 'none' : undefined }} sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.125rem' }, color: '#1e293b', lineHeight: 1.4 }}>
            กำหนดรอบปฏิทินฝึกงาน
            <Box component="span" sx={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>(Internship Rounds)</Box>
          </Typography>
          <IconButton size="small" onClick={onClose} style={{ display: embedded ? 'none' : undefined }} aria-label="ปิด" sx={{ color: '#94a3b8', flexShrink: 0 }}>
            <XMarkIcon style={{ width: 20, height: 20 }} />
          </IconButton>
        </Box>
        {!formOpen && (
          <Button
            variant="contained"
            startIcon={<PlusIcon style={{ width: 18, height: 18 }} />}
            onClick={() => handleOpenForm(null)}
            sx={{
              mt: 1.5, width: { xs: '100%', sm: 'auto' }, height: 40, px: 2,
              bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' }, fontWeight: 600,
              borderRadius: '0.75rem', textTransform: 'none', boxShadow: 'none',
              fontSize: { xs: '0.78rem', sm: '0.875rem' }, whiteSpace: 'nowrap',
            }}
          >
            สร้างรอบฝึกงานใหม่
          </Button>
        )}
      </DialogTitle>

      <DialogContent dividers={!embedded} sx={{ py: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

        {/* ยืนยัน apply รอบไปใช้กับคำร้องทั้งเทอม */}
        {applyTarget && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              นำรอบ "{applyTarget.title}" ไปใช้กับคำร้อง?
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              ระบบจะเติมวันฝึกงาน {formatDate(applyTarget.startDate)} - {formatDate(applyTarget.endDate)} ให้คำร้องทุกฉบับใน{TERM_LABEL[applyTarget.semester] || 'ภาคเรียนนี้'} ที่ยังรอออกฝึกงาน
            </Typography>
            <FormControlLabel
              control={<Checkbox size="small" checked={applyOverwrite} onChange={(e) => setApplyOverwrite(e.target.checked)} />}
              label={<Typography variant="body2">เขียนทับวันที่กำหนดไว้แล้วด้วย</Typography>}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button size="small" variant="contained" color="warning" disabled={applying} onClick={handleApplyRound} sx={{ fontWeight: 700 }}>
                {applying ? 'กำลังนำไปใช้...' : 'ยืนยันนำไปใช้'}
              </Button>
              <Button size="small" variant="outlined" disabled={applying} onClick={() => setApplyTarget(null)}>
                ยกเลิก
              </Button>
            </Stack>
          </Alert>
        )}

        {formOpen ? (
          <Box component="form" onSubmit={handleSaveRound} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              {editingRound ? 'แก้ไขรอบฝึกงาน' : 'สร้างรอบฝึกงานใหม่'}
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                required
                size="small"
                label="ชื่อรอบฝึกงาน"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="เช่น รอบฝึกงาน ภาคเรียนที่ 1/2568"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  size="small"
                  label="ภาคเรียน (จับคู่กับคำร้อง)"
                  value={formData.semester}
                  onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="1">ภาคเรียนที่ 1</MenuItem>
                  <MenuItem value="2">ภาคเรียนที่ 2</MenuItem>
                  <MenuItem value="summer">ภาคฤดูร้อน</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  label="ปีการศึกษา"
                  value={formData.academicYear}
                  onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
                  placeholder="เช่น 2568"
                  sx={{ flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  size="small"
                  label="วันเริ่มฝึกงาน"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  required
                  type="number"
                  size="small"
                  label="ชั่วโมงฝึกตามหลักสูตร"
                  value={formData.requiredHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, requiredHours: e.target.value }))}
                  inputProps={{ min: 1, max: 5000, step: 1 }}
                  helperText={`วันละ ${HOURS_PER_DAY} ชม.`}
                />
              </Stack>
              {/* วันสิ้นสุด: คำนวณอัตโนมัติ (ไม่ต้องกรอก) */}
              <Box sx={{ p: 1.75, borderRadius: '0.75rem', border: '1px solid #E9E5F5', bgcolor: '#ffffff' }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                  วันสิ้นสุดฝึกงาน (คำนวณอัตโนมัติ)
                </Typography>
                {endCalc ? (
                  <>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#3b0764', mt: 0.25 }}>
                      {new Date(`${endCalc.endDate}T00:00:00`).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.5 }}>
                      {endCalc.workingDays} วันทำการ (จันทร์-ศุกร์) จาก {Number(formData.requiredHours) || DEFAULT_REQUIRED_HOURS} ชม.
                      {endCalc.skippedHolidays.length > 0 ? ` · ข้ามวันหยุด ${endCalc.skippedHolidays.length} วัน` : ''}
                    </Typography>
                    {endCalc.skippedHolidays.length > 0 && (
                      <Typography sx={{ fontSize: '0.72rem', color: '#a16207', mt: 0.5, lineHeight: 1.6 }}>
                        {endCalc.skippedHolidays.map((d) => `${new Date(`${d}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} ${getThaiHoliday(d) || ''}`).join(' · ')}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8', mt: 0.25 }}>เลือกวันเริ่มฝึกงานเพื่อคำนวณ</Typography>
                )}
              </Box>
              <TextField
                fullWidth
                size="small"
                label="หมายเหตุ (ถ้ามี)"
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                placeholder="เช่น ช่วงเวลาฝึกงานตามปฏิทินการศึกษา..."
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    เปิดใช้งานรอบนี้ (นักศึกษาจะเห็นช่วงเวลานี้ตอนยื่นคำร้อง)
                  </Typography>
                }
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
                <Button variant="outlined" size="small" onClick={() => setFormOpen(false)}>
                  ยกเลิก
                </Button>
                <Button variant="contained" size="small" type="submit" sx={{ bgcolor: '#4f46e5', fontWeight: 700 }}>
                  {editingRound ? 'บันทึกการแก้ไข' : 'บันทึกรอบใหม่'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        ) : (
          <>
            {rounds.length === 0 ? (
              <Box className="sched-empty-panel">
                {loading ? 'กำลังโหลดข้อมูล...' : 'ยังไม่มีการกำหนดรอบฝึกงาน กดปุ่ม "สร้างรอบฝึกงานใหม่" ด้านบน'}
              </Box>
            ) : (
              <>
                {/* Desktop: ตาราง */}
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, display: { xs: 'none', sm: 'block' } }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>ชื่อรอบฝึกงาน</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>ภาค/ปี</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>ช่วงวันฝึกงาน</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>จัดการ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rounds.map((r) => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{r.title}</TableCell>
                          <TableCell>{r.semester ? `${r.semester}/${r.academicYear || ''}` : (r.academicYear || '-')}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                              {formatDate(r.startDate)} - {formatDate(r.endDate)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                              {Number(r.requiredHours) || DEFAULT_REQUIRED_HOURS} ชม.
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {r.isActive ? (
                              <Chip label={roundStatus(r).label} color={roundStatus(r).color} size="small" sx={{ fontWeight: 600 }} />
                            ) : (
                              <Chip label="ปิด" size="small" sx={{ bgcolor: '#e2e8f0', color: '#64748b' }} />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              aria-label={`จัดการรอบฝึกงาน ${r.title}`}
                              aria-haspopup="menu"
                              title="จัดการ"
                              onClick={(e) => { e.stopPropagation(); setActionMenu({ anchor: e.currentTarget, round: r }); }}
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
                  onClose={() => setActionMenu({ anchor: null, round: null })}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem onClick={() => { setApplyTarget(actionMenu.round); setActionMenu({ anchor: null, round: null }); }}>
                    <BoltIcon style={{ width: 16, height: 16, marginRight: 10, color: '#d97706' }} /> นำไปใช้กับคำร้องที่รอออกฝึก
                  </MenuItem>
                  <MenuItem onClick={() => { handleOpenForm(actionMenu.round); setActionMenu({ anchor: null, round: null }); }}>
                    <PencilSquareIcon style={{ width: 16, height: 16, marginRight: 10, color: '#6d28d9' }} /> แก้ไข
                  </MenuItem>
                  <MenuItem onClick={() => { handleDeleteRound(actionMenu.round?.id); setActionMenu({ anchor: null, round: null }); }} sx={{ color: '#ef4444' }}>
                    <TrashIcon style={{ width: 16, height: 16, marginRight: 10 }} /> ลบ
                  </MenuItem>
                </Menu>

                {/* Mobile: Card List */}
                <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
                  {rounds.map((r) => (
                    <Box key={r.id} sx={{ p: 2, borderRadius: '0.875rem', border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                        {r.title}
                      </Typography>
                      <Stack direction="row" spacing={0.75} sx={{ mb: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" label={`ภาค ${r.semester || '-'} / ${r.academicYear || '-'}`}
                          sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.68rem', height: 22 }} />
                        {r.isActive ? (
                          <Chip label={roundStatus(r).label} color={roundStatus(r).color} size="small" sx={{ fontWeight: 600, fontSize: '0.68rem', height: 22 }} />
                        ) : (
                          <Chip label="ปิด" size="small" sx={{ bgcolor: '#e2e8f0', color: '#64748b', fontSize: '0.68rem', height: 22 }} />
                        )}
                      </Stack>
                      <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mb: 1.5 }}>
                        {formatDate(r.startDate)} - {formatDate(r.endDate)} · {Number(r.requiredHours) || DEFAULT_REQUIRED_HOURS} ชม.
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" color="warning" onClick={() => setApplyTarget(r)}
                          startIcon={<BoltIcon style={{ width: 14, height: 14 }} />}
                          sx={{ fontSize: '0.7rem', fontWeight: 600, borderRadius: 1.5, textTransform: 'none' }}>
                          นำไปใช้
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => handleOpenForm(r)}
                          startIcon={<PencilSquareIcon style={{ width: 14, height: 14 }} />}
                          sx={{ fontSize: '0.7rem', fontWeight: 600, borderRadius: 1.5, textTransform: 'none', color: '#475569', borderColor: '#e2e8f0' }}>
                          แก้ไข
                        </Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => handleDeleteRound(r.id)}
                          startIcon={<TrashIcon style={{ width: 14, height: 14 }} />}
                          sx={{ fontSize: '0.7rem', fontWeight: 600, borderRadius: 1.5, textTransform: 'none' }}>
                          ลบ
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </>
            )}
          </>
        )}
      </DialogContent>

      {!embedded && <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <ModalActions className="!pt-0 !mt-0 !border-0 w-full">
          <ModalCancelButton onClick={onClose}>ปิดหน้าต่าง</ModalCancelButton>
        </ModalActions>
      </DialogActions>}
    </ScheduleShell>
  );
};

export default AdminInternshipRoundsModal;

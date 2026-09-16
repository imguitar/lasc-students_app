import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { TrashIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '../../../api/axios';

const AdminEvaluationRoundsModal = ({ open, onClose }) => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    academicYear: '',
    semester: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });

  const loadRounds = async () => {
    setLoading(true);
    try {
      const res = await api.get('/evaluation-rounds');
      setRounds(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'ไม่สามารถโหลดรอบการประเมินได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadRounds();
      setError('');
      setSuccessMsg('');
    }
  }, [open]);

  const handleOpenForm = (round = null) => {
    if (round) {
      setEditingRound(round);
      setFormData({
        title: round.title || '',
        academicYear: round.academicYear || '',
        semester: round.semester || '',
        startDate: round.startDate ? round.startDate.slice(0, 10) : '',
        endDate: round.endDate ? round.endDate.slice(0, 10) : '',
        isActive: Boolean(round.isActive),
      });
    } else {
      setEditingRound(null);
      const today = new Date().toISOString().slice(0, 10);
      const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      setFormData({
        title: `รอบประเมินนักศึกษาฝึกงาน ${new Date().getFullYear() + 543}`,
        academicYear: `${new Date().getFullYear() + 543}`,
        semester: '1',
        startDate: today,
        endDate: nextMonth,
        isActive: true,
      });
    }
    setFormOpen(true);
    setError('');
  };

  const handleSaveRound = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startDate || !formData.endDate) {
      setError('กรุณากรอกชื่อรอบ วันที่เริ่มต้น และวันที่สิ้นสุด');
      return;
    }

    try {
      if (editingRound) {
        await api.put(`/admin/evaluation-rounds/${editingRound.id}`, formData);
        setSuccessMsg('แก้ไขรอบการประเมินสำเร็จ');
      } else {
        await api.post('/admin/evaluation-rounds', formData);
        setSuccessMsg('สร้างรอบการประเมินใหม่สำเร็จ');
      }
      setFormOpen(false);
      loadRounds();
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handleDeleteRound = async (id) => {
    if (!window.confirm('คุณต้องการลบรอบการประเมินนี้ใช่หรือไม่?')) return;
    try {
      await api.delete(`/admin/evaluation-rounds/${id}`);
      setSuccessMsg('ลบรอบการประเมินเรียบร้อยแล้ว');
      loadRounds();
    } catch (err) {
      setError(err.response?.data?.message || 'ไม่สามารถลบรอบการประเมินได้');
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>📅 จัดการรอบการประเมินนักศึกษา (Evaluation Rounds)</span>
        {!formOpen && (
          <Button
            variant="contained"
            size="small"
            startIcon={<PlusIcon style={{ width: 18, height: 18 }} />}
            onClick={() => handleOpenForm(null)}
            sx={{ bgcolor: '#4f46e5', '&:hover': { bgcolor: '#4338ca' }, fontWeight: 600, borderRadius: 2 }}
          >
            สร้างรอบประเมินใหม่
          </Button>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2.5 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

        {formOpen ? (
          <Box component="form" onSubmit={handleSaveRound} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              {editingRound ? '✏️ แก้ไขรอบการประเมิน' : '➕ สร้างรอบการประเมินใหม่'}
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                required
                size="small"
                label="ชื่อรอบการประเมิน"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="เช่น รอบประเมินผลการฝึกงาน ภาคเรียนที่ 1/2569"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  size="small"
                  label="ปีการศึกษา"
                  value={formData.academicYear}
                  onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
                  placeholder="เช่น 2569"
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="ภาคเรียน"
                  value={formData.semester}
                  onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                  placeholder="เช่น 1 หรือ 2"
                  sx={{ flex: 1 }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  size="small"
                  label="วันที่เริ่มต้นรอบประเมิน"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  required
                  type="date"
                  size="small"
                  label="วันที่สิ้นสุดรอบประเมิน"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
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
                    เปิดใช้งานเป็นรอบปัจจุบัน (Active Round)
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
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ชื่อรอบการประเมิน</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ภาค/ปี</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ช่วงวันที่เปิดประเมิน</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rounds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                      {loading ? 'กำลังโหลดข้อมูล...' : 'ยังไม่มีการกำหนดรอบการประเมิน กดปุ่ม "สร้างรอบประเมินใหม่" ด้านบน'}
                    </TableCell>
                  </TableRow>
                ) : (
                  rounds.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{r.title}</TableCell>
                      <TableCell>{r.semester ? `${r.semester}/${r.academicYear || ''}` : (r.academicYear || '-')}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                          {formatDate(r.startDate)} - {formatDate(r.endDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {r.isActive ? (
                          <Chip label="เปิดใช้งานอยู่" color="success" size="small" sx={{ fontWeight: 600 }} />
                        ) : (
                          <Chip label="ปิด" size="small" sx={{ bgcolor: '#e2e8f0', color: '#64748b' }} />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary" onClick={() => handleOpenForm(r)} title="แก้ไข">
                          <PencilSquareIcon style={{ width: 18, height: 18 }} />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteRound(r.id)} title="ลบ">
                          <TrashIcon style={{ width: 18, height: 18 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          ปิดหน้าต่าง
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminEvaluationRoundsModal;

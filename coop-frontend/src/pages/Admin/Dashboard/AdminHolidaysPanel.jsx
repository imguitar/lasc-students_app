import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Switch, TextField, Tooltip, Typography, Stack } from '@mui/material';
import { ChevronLeft, ChevronRight, RefreshCw, Plus, Trash2, CalendarDays, List, X } from 'lucide-react';
import api from '../../../api/axios';
import { loadHolidaysFromServer } from '../../../utils/thaiHolidays';
import Button from '../../../components/common/Button';

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const THAI_WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const thaiDate = (value) => {
  const [y, m, d] = String(value).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * แท็บ "จัดการวันหยุด" (ใช้ในหน้า จัดการกำหนดการและปฏิทิน)
 * - ซิงค์วันหยุดมาตรฐานของปีที่เลือก และเพิ่มวันหยุดพิเศษ
 * - มุมมองปฏิทินรายเดือน (ไฮไลต์วันหยุด, Tooltip ชื่อวันหยุด) และมุมมองตาราง (เปิด/ปิดใช้งาน, ลบ)
 * วันหยุดที่ปิดใช้งานจะไม่ถูกนำไปหักวันทำการ
 */
const AdminHolidaysPanel = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const [year, setYear] = useState(currentYear);
  const [view, setView] = useState('calendar');
  const [month, setMonth] = useState(today.getMonth());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ date: '', name: '' });

  const load = useCallback(async (y) => {
    setLoading(true);
    try {
      const res = await api.get('/holidays', { params: { year: y } });
      setHolidays(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'โหลดรายการวันหยุดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(year); }, [year, load]);

  const byDate = useMemo(() => {
    const map = {};
    holidays.forEach((h) => { map[String(h.date).slice(0, 10)] = h; });
    return map;
  }, [holidays]);

  const runAction = async (fn, okMessage) => {
    setBusy(true);
    setError('');
    try {
      const res = await fn();
      setSuccessMsg(res?.data?.message || okMessage);
      await load(year);
      loadHolidaysFromServer(true);
    } catch (err) {
      setError(err.response?.data?.message || 'ดำเนินการไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const handleSync = () => runAction(() => api.post('/admin/holidays/sync', { year }), 'ซิงค์วันหยุดแล้ว');

  const handleToggle = (h) => runAction(
    () => api.patch(`/admin/holidays/${h.id}`, { isActive: !h.isActive }),
    h.isActive ? 'ปิดการใช้งานวันหยุดแล้ว' : 'เปิดการใช้งานวันหยุดแล้ว',
  );

  const handleDelete = (h) => {
    if (!window.confirm(`ลบวันหยุด "${h.name}" (${thaiDate(h.date)}) ใช่หรือไม่?`)) return;
    runAction(() => api.delete(`/admin/holidays/${h.id}`), 'ลบวันหยุดแล้ว');
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.date || !form.name.trim()) {
      setError('กรุณาระบุวันที่และชื่อวันหยุด');
      return;
    }
    const date = form.date;
    setAddOpen(false);
    setForm({ date: '', name: '' });
    await runAction(() => api.post('/admin/holidays', { date, name: form.name.trim() }), 'เพิ่มวันหยุดพิเศษแล้ว');
    const addedYear = Number(date.slice(0, 4));
    if (addedYear !== year) setYear(addedYear);
  };

  // ปฏิทินรายเดือน
  const monthGrid = useMemo(() => {
    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first.getDay(); i += 1) cells.push(null);
    for (let d = 1; d <= days; d += 1) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  const activeCount = holidays.filter((h) => h.isActive).length;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

      {/* แถบคำสั่งด่วน */}
      <Box className="sched-toolbar">
        <Button
          variant="primary"
          icon={RefreshCw}
          onClick={handleSync}
          loading={busy}
          className="sched-btn-sync"
        >
          ซิงค์วันหยุดนักขัตฤกษ์ปี {year + 543}
        </Button>
        <Button variant="secondary" icon={Plus} onClick={() => setAddOpen(true)} disabled={busy}>
          เพิ่มวันหยุดพิเศษ
        </Button>
        <Box sx={{ flex: 1 }} />
        <TextField
          select
          size="small"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          inputProps={{ 'aria-label': 'เลือกปีของวันหยุด' }}
          sx={{
            minWidth: 150,
            '& .MuiOutlinedInput-root': {
              height: 44, borderRadius: '14px', bgcolor: '#ffffff', color: '#3b0764', fontWeight: 700, fontSize: '0.9rem',
              transition: 'box-shadow .2s ease',
              '& fieldset': { borderColor: '#E9E5F5' },
              '&:hover fieldset': { borderColor: '#d8d1f0' },
              '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(234, 179, 8, 0.35)' },
              '&.Mui-focused fieldset': { borderColor: '#eab308', borderWidth: 1 },
            },
            '& .MuiSelect-select': { py: 0, display: 'flex', alignItems: 'center' },
            '& .MuiSelect-icon': { color: '#6d28d9' },
          }}
        >
          {yearOptions.map((y) => <MenuItem key={y} value={y}>ปี {y + 543}</MenuItem>)}
        </TextField>
      </Box>

      <Box className="sched-summary">
        <Typography component="span">วันหยุดทั้งหมด <strong>{holidays.length}</strong> วัน</Typography>
        <Typography component="span">เปิดใช้งาน <strong>{activeCount}</strong> วัน</Typography>
        <Typography component="span" className="sched-summary-note">วันหยุดที่ปิดใช้งานจะไม่ถูกหักออกจากวันทำการ</Typography>
      </Box>

      {/* สลับมุมมอง */}
      <Box className="sched-view-switch" role="tablist" aria-label="มุมมองวันหยุด">
        <button type="button" role="tab" aria-selected={view === 'calendar'} className={view === 'calendar' ? 'is-active' : ''} onClick={() => setView('calendar')}>
          <CalendarDays className="w-4 h-4" aria-hidden="true" /> ปฏิทิน
        </button>
        <button type="button" role="tab" aria-selected={view === 'table'} className={view === 'table' ? 'is-active' : ''} onClick={() => setView('table')}>
          <List className="w-4 h-4" aria-hidden="true" /> ตาราง
        </button>
      </Box>

      {loading ? (
        <Box className="sched-empty">กำลังโหลดข้อมูล...</Box>
      ) : view === 'calendar' ? (
        <Box className="sched-cal">
          <Box className="sched-cal-head">
            <IconButton size="small" aria-label="เดือนก่อนหน้า" onClick={() => setMonth((m) => (m + 11) % 12)}><ChevronLeft className="w-4 h-4" /></IconButton>
            <Typography className="sched-cal-title">{THAI_MONTHS[month]} {year + 543}</Typography>
            <IconButton size="small" aria-label="เดือนถัดไป" onClick={() => setMonth((m) => (m + 1) % 12)}><ChevronRight className="w-4 h-4" /></IconButton>
          </Box>
          <Box className="sched-cal-grid">
            {THAI_WEEKDAYS.map((w) => <Box key={w} className="sched-cal-wd">{w}</Box>)}
            {monthGrid.map((d, i) => {
              if (!d) return <Box key={`e${i}`} className="sched-cal-cell is-empty" />;
              const key = ymd(year, month, d);
              const h = byDate[key];
              const cls = ['sched-cal-cell'];
              if (h) cls.push(h.isActive ? 'is-holiday' : 'is-holiday-off');
              if (key === ymd(today.getFullYear(), today.getMonth(), today.getDate())) cls.push('is-today');
              const cell = (
                <Box key={key} className={cls.join(' ')}>
                  <span>{d}</span>
                  {h && <span className="sched-cal-name">{h.name}</span>}
                </Box>
              );
              return h ? (
                <Tooltip key={key} title={`${h.name}${h.isActive ? '' : ' (ปิดใช้งาน)'}`} arrow placement="top">{cell}</Tooltip>
              ) : cell;
            })}
          </Box>
        </Box>
      ) : holidays.length === 0 ? (
        <Box className="sched-empty">ยังไม่มีวันหยุดในปีนี้ กดซิงค์วันหยุดนักขัตฤกษ์เพื่อเริ่มต้น</Box>
      ) : (
        <Box className="sched-table-wrap">
          <table className="sched-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ชื่อวันหยุด</th>
                <th className="sched-col-center">เปิดใช้งาน</th>
                <th className="sched-col-center">ลบ</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.id} className={h.isActive ? '' : 'is-off'}>
                  <td className="sched-date">{thaiDate(h.date)}</td>
                  <td>{h.name}</td>
                  <td className="sched-col-center">
                    <Switch
                      checked={Boolean(h.isActive)}
                      onChange={() => handleToggle(h)}
                      disabled={busy}
                      inputProps={{ 'aria-label': `เปิดใช้งาน ${h.name}` }}
                      color="secondary"
                    />
                  </td>
                  <td className="sched-col-center">
                    <IconButton size="small" aria-label={`ลบ ${h.name}`} onClick={() => handleDelete(h)} disabled={busy} sx={{ color: '#e11d48' }}>
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}

      {/* หน้าต่างเพิ่มวันหยุดพิเศษ */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '1.25rem' } }}>
        <Box component="form" onSubmit={handleAdd}>
          <DialogTitle sx={{ pb: 1, pr: 6 }}>
            <Typography sx={{ fontWeight: 800, color: '#1e1b4b' }}>เพิ่มวันหยุดพิเศษ</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#64748b', mt: 0.25 }}>สำหรับวันหยุดประจำมหาวิทยาลัยหรือวันหยุดกรณีพิเศษ</Typography>
            <IconButton onClick={() => setAddOpen(false)} aria-label="ปิด" sx={{ position: 'absolute', right: 12, top: 12 }}>
              <X className="w-5 h-5" />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                type="date"
                size="small"
                label="วันที่หยุด"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
                fullWidth
              />
              <TextField
                size="small"
                label="ชื่อวันหยุด"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="เช่น วันหยุดประจำมหาวิทยาลัย"
                required
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>ยกเลิก</Button>
            <Button type="submit" variant="primary" loading={busy}>บันทึกวันหยุด</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default AdminHolidaysPanel;

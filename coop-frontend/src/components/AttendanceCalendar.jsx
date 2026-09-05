import { useState, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Tooltip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
} from '@mui/material';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  PencilSquareIcon,
  CheckBadgeIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import SignatureCanvas from 'react-signature-canvas';
import api from '../api/axios';

const AttendanceCalendar = ({
  entries = [],
  onBatchSign,
  studentId,
  studentName,
  internshipStartDate = null,
}) => {
  const sigCanvas = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [mentorName, setMentorName] = useState('');
  const [mentorComment, setMentorComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Map entries by date YYYY-MM-DD
  const entriesMap = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!e.date) return;
      const cleanDate = String(e.date).split('T')[0];
      map[cleanDate] = e;
    });
    return map;
  }, [entries]);

  // Determine official effective start date
  const effectiveStartDate = useMemo(() => {
    if (internshipStartDate) {
      return String(internshipStartDate).split('T')[0];
    }
    // Fallback to the earliest entry date if not specified
    const dates = entries.map((e) => String(e.date || '').split('T')[0]).filter(Boolean).sort();
    return dates[0] || null;
  }, [internshipStartDate, entries]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const totalDays = lastDayOfMonth.getDate();

    const days = [];

    // Empty padding cells for previous month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ type: 'empty', key: `empty-prev-${i}` });
    }

    // Days of current month
    const todayStr = new Date().toISOString().slice(0, 10);

    for (let day = 1; day <= totalDays; day++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;

      const entry = entriesMap[dateKey];
      const dateObj = new Date(year, month, day);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const isPastOrToday = dateKey <= todayStr;
      const isToday = dateKey === todayStr;
      const isBeforeStart = effectiveStartDate ? dateKey < effectiveStartDate : false;
      const isStartDate = effectiveStartDate ? dateKey === effectiveStartDate : false;

      let status = 'none'; // future or before internship
      if (isBeforeStart) {
        status = 'pre-internship'; // strictly before official approval
      } else if (entry) {
        status = entry.status; // present, late, absent
      } else if (isPastOrToday && !isWeekend) {
        status = 'un-checked'; // missed check-in during active internship
      }

      const isSelectable = !isBeforeStart && isPastOrToday && !isWeekend;

      days.push({
        type: 'day',
        dayNumber: day,
        dateKey,
        entry,
        status,
        isToday,
        isWeekend,
        isBeforeStart,
        isStartDate,
        isSelectable,
        key: dateKey,
      });
    }

    // Pad remaining empty cells up to 42 cells (6 full rows of 7 days)
    const totalCells = 42;
    const remainingCells = totalCells - days.length;
    for (let i = 0; i < remainingCells; i++) {
      days.push({ type: 'empty', key: `empty-next-${i}` });
    }

    return days;
  }, [year, month, entriesMap, effectiveStartDate]);

  // Selected entry info
  const selectedEntryInfo = useMemo(() => {
    if (!selectedDay) return null;
    return entriesMap[selectedDay.dateKey] || null;
  }, [selectedDay, entriesMap]);

  // Active selectable days in current month (from start date to today)
  const selectableDaysInMonth = useMemo(() => {
    return calendarDays.filter(d => d.type === 'day' && d.isSelectable);
  }, [calendarDays]);

  const unsignedDaysInMonth = useMemo(() => {
    return selectableDaysInMonth.filter(d => {
      const entry = entriesMap[d.dateKey];
      return entry && !(entry.supervisor_signature || entry.supervisorSignature);
    });
  }, [selectableDaysInMonth, entriesMap]);

  // Toggle single date in batch mode
  const toggleDateSelection = (item) => {
    if (!item.isSelectable) return;
    const dateKey = item.dateKey;
    setSelectedDates(prev => {
      if (prev.includes(dateKey)) {
        return prev.filter(d => d !== dateKey);
      } else {
        return [...prev, dateKey];
      }
    });
  };

  const selectAllInMonth = () => {
    const allKeys = selectableDaysInMonth.map(d => d.dateKey);
    setSelectedDates(allKeys);
  };

  const selectAllUnsigned = () => {
    const unsignedKeys = unsignedDaysInMonth.map(d => d.dateKey);
    if (unsignedKeys.length === 0) {
      const loggedUnsigned = selectableDaysInMonth.filter(d => d.status !== 'none' && d.status !== 'pre-internship').map(d => d.dateKey);
      setSelectedDates(loggedUnsigned);
    } else {
      setSelectedDates(unsignedKeys);
    }
  };

  const clearSelection = () => {
    setSelectedDates([]);
  };

  const handleOpenSignModal = (dateKeyOrKeys) => {
    setModalError('');
    if (Array.isArray(dateKeyOrKeys)) {
      if (dateKeyOrKeys.length === 0) return;
      setSelectedDates(dateKeyOrKeys);
    } else if (typeof dateKeyOrKeys === 'string') {
      setSelectedDates([dateKeyOrKeys]);
    }
    setSignModalOpen(true);
  };

  const handleClearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const handleSubmitBatchSign = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      setModalError('กรุณาวาดลายเซ็นพี่เลี้ยงก่อนกดยืนยัน');
      return;
    }

    if (selectedDates.length === 0) {
      setModalError('กรุณาเลือกวันที่ต้องการเซ็นรับรอง');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const signatureDataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
      const payload = {
        studentId: studentId || '',
        studentName: studentName || '',
        dates: selectedDates,
        supervisorSignature: signatureDataUrl,
        supervisorName: mentorName.trim() || null,
        supervisorComment: mentorComment.trim() || null,
      };

      const res = await api.patch('/checkins/batch-sign', payload);

      if (onBatchSign) {
        onBatchSign(res.data.data);
      }

      setToastMessage(`บันทึกลายเซ็นพี่เลี้ยงรับรองเรียบร้อยแล้ว (${selectedDates.length} วัน)`);
      setTimeout(() => setToastMessage(''), 5000);

      setSignModalOpen(false);
      setIsBatchMode(false);
      setSelectedDates([]);
      setMentorName('');
      setMentorComment('');
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'บันทึกลายเซ็นล้มเหลว');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateThai = (dateKey) => {
    if (!dateKey) return '';
    const [y, m, d] = String(dateKey).split('T')[0].split('-');
    const thaiYear = parseInt(y) > 2500 ? y : parseInt(y) + 543;
    return `${parseInt(d)} ${monthNamesThai[parseInt(m) - 1]} ${thaiYear}`;
  };

  return (
    <Box className="attendance-calendar-container" sx={{ width: '100%', pt: 1 }}>
      {/* Toast alert */}
      {toastMessage && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2, fontWeight: 700 }}>
          {toastMessage}
        </Alert>
      )}

      {/* Calendar Header Bar & Actions */}
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          p: { xs: 1.25, sm: 1.75 },
          mb: 2,
          borderRadius: 3,
          bgcolor: '#f8fafc',
          border: '1px solid #e2e8f0',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: '#ffe4e6', color: '#be185d', display: 'flex' }}>
              <CalendarIcon style={{ width: 18, height: 18 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', sm: '1.15rem' }, color: '#0f172a' }}>
              {monthNamesThai[month]} {year + 543}
            </Typography>
          </Box>
          {effectiveStartDate && (
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748b', mt: 0.5, fontWeight: 600, pl: 0.5 }}>
              <FlagIcon style={{ width: 13, height: 13, color: '#be185d' }} />
              เริ่มฝึกงานเมื่อ: <strong style={{ color: '#be185d' }}>{formatDateThai(effectiveStartDate)}</strong>
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Button
            size="small"
            variant={isBatchMode ? 'contained' : 'outlined'}
            startIcon={isBatchMode ? <XMarkIcon style={{ width: 16, height: 16 }} /> : <PencilSquareIcon style={{ width: 16, height: 16 }} />}
            onClick={() => {
              setIsBatchMode(!isBatchMode);
              if (isBatchMode) {
                setSelectedDates([]);
              }
            }}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              fontSize: '0.8rem',
              textTransform: 'none',
              bgcolor: isBatchMode ? '#be185d' : '#fff',
              borderColor: '#be185d',
              color: isBatchMode ? '#fff' : '#be185d',
              '&:hover': {
                bgcolor: isBatchMode ? '#9d174d' : '#fff1f2',
                borderColor: '#9d174d',
              },
              boxShadow: isBatchMode ? '0 2px 8px rgba(190, 24, 93, 0.25)' : 'none'
            }}
          >
            {isBatchMode ? 'ยกเลิกการเลือกหลายวัน' : 'ให้พี่เลี้ยงเซ็นรับรอง (เลือกหลายวัน)'}
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={handlePrevMonth}
              sx={{ border: '1px solid #cbd5e1', bgcolor: '#fff', '&:hover': { bgcolor: '#f1f5f9' }, p: 0.5 }}
            >
              <ChevronLeftIcon style={{ width: 16, height: 16, color: '#334155' }} />
            </IconButton>

            <Button 
              size="small" 
              variant="outlined"
              onClick={() => setCurrentDate(new Date())}
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                py: 0.25,
                px: 1.25,
                borderColor: '#cbd5e1',
                color: '#334155',
                bgcolor: '#fff',
                minWidth: 0,
                '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' }
              }}
            >
              วันนี้
            </Button>

            <IconButton
              size="small"
              onClick={handleNextMonth}
              sx={{ border: '1px solid #cbd5e1', bgcolor: '#fff', '&:hover': { bgcolor: '#f1f5f9' }, p: 0.5 }}
            >
              <ChevronRightIcon style={{ width: 16, height: 16, color: '#334155' }} />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Batch Mode Selection Toolbar */}
      {isBatchMode && (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: 3,
            bgcolor: '#fff1f2',
            border: '1.5px solid #fecdd3',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#881337', fontSize: '0.85rem' }}>
              คลิกเลือกวันที่ในปฏิทิน (นับจากวันเริ่มฝึกงาน):
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={selectAllInMonth}
              sx={{ py: 0.25, px: 1, fontSize: '0.75rem', fontWeight: 700, borderRadius: 1.5, color: '#be185d', borderColor: '#f43f5e', bgcolor: '#fff' }}
            >
              เลือกทั้งหมดในเดือนนี้ ({selectableDaysInMonth.length} วัน)
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={selectAllUnsigned}
              sx={{ py: 0.25, px: 1, fontSize: '0.75rem', fontWeight: 700, borderRadius: 1.5, color: '#be185d', borderColor: '#f43f5e', bgcolor: '#fff' }}
            >
              เลือกวันที่ยังไม่มีลายเซ็น ({unsignedDaysInMonth.length} วัน)
            </Button>
            {selectedDates.length > 0 && (
              <Button
                size="small"
                onClick={clearSelection}
                sx={{ py: 0.25, px: 1, fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}
              >
                ล้างที่เลือก ({selectedDates.length})
              </Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#be185d', fontSize: '0.85rem' }}>
              เลือกไว้ <strong>{selectedDates.length}</strong> วัน
            </Typography>
            <Button
              size="small"
              variant="contained"
              disabled={selectedDates.length === 0}
              startIcon={<PencilSquareIcon style={{ width: 16, height: 16 }} />}
              onClick={() => handleOpenSignModal(selectedDates)}
              sx={{
                bgcolor: '#be185d',
                '&:hover': { bgcolor: '#9d174d' },
                fontWeight: 800,
                borderRadius: 2,
                textTransform: 'none',
                px: 2,
                py: 0.6,
                boxShadow: '0 2px 8px rgba(190, 24, 93, 0.25)'
              }}
            >
              เซ็นรับรองที่เลือก ({selectedDates.length} วัน)
            </Button>
          </Box>
        </Paper>
      )}

      {/* Legend Bar */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center',
          gap: { xs: 1, sm: 2 }, 
          mb: 2, 
          px: 0.5,
          fontSize: { xs: '0.75rem', sm: '0.825rem' },
          color: '#475569',
          fontWeight: 600
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10b981' }} />
          <span>มา</span>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f59e0b' }} />
          <span>สาย</span>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
          <span>ขาด</span>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#94a3b8' }} />
          <span>ไม่ได้เช็คชื่อ</span>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <PencilSquareIcon style={{ width: 14, height: 14, color: '#be185d' }} />
          <span style={{ color: '#be185d' }}>มีลายเซ็นพี่เลี้ยง</span>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: { xs: '100%', sm: 'auto' }, ml: { sm: 'auto' } }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '3px', border: '1.5px dashed #cbd5e1' }} />
          <span>ก่อนเริ่มฝึก / เสาร์-อาทิตย์ / อนาคต</span>
        </Box>
      </Box>

      {/* Days of Week Header */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: { xs: 0.5, sm: 1.25 }, 
          textAlign: 'center',
          fontWeight: 800,
          fontSize: { xs: '0.75rem', sm: '0.85rem' },
          color: '#64748b',
          mb: 1
        }}
      >
        <Box sx={{ color: '#ef4444' }}>อา.</Box>
        <Box>จ.</Box>
        <Box>อ.</Box>
        <Box>พ.</Box>
        <Box>พฤ.</Box>
        <Box>ศ.</Box>
        <Box sx={{ color: '#ef4444' }}>ส.</Box>
      </Box>

      {/* Calendar Grid */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: { xs: 0.5, sm: 1.25 }
        }}
      >
        {calendarDays.map((item) => {
          if (item.type === 'empty') {
            return (
              <Box 
                key={item.key} 
                sx={{ 
                  minHeight: { xs: 54, sm: 68 }, 
                  bgcolor: '#f8fafc', 
                  borderRadius: { xs: 1.5, sm: 2.5 }, 
                  border: '1px border-dashed #f1f5f9',
                  opacity: 0.3 
                }} 
              />
            );
          }

          let bgColor = '#ffffff';
          let textColor = '#1e293b';
          let borderColor = '#e2e8f0';
          let chipBg = '#f1f5f9';
          let chipColor = '#64748b';
          let badgeText = '';

          if (item.status === 'present') {
            bgColor = '#ecfdf5';
            textColor = '#065f46';
            borderColor = '#a7f3d0';
            chipBg = '#dcfce7';
            chipColor = '#15803d';
            badgeText = 'มา';
          } else if (item.status === 'late') {
            bgColor = '#fffbeb';
            textColor = '#92400e';
            borderColor = '#fde68a';
            chipBg = '#fef3c7';
            chipColor = '#b45309';
            badgeText = 'สาย';
          } else if (item.status === 'absent') {
            bgColor = '#fef2f2';
            textColor = '#991b1b';
            borderColor = '#fecaca';
            chipBg = '#fee2e2';
            chipColor = '#b91c1c';
            badgeText = 'ขาด';
          } else if (item.status === 'un-checked') {
            bgColor = '#f8fafc';
            textColor = '#64748b';
            borderColor = '#cbd5e1';
            chipBg = '#e2e8f0';
            chipColor = '#475569';
            badgeText = 'ไม่ได้เช็ค';
          } else if (item.status === 'pre-internship' || item.isBeforeStart) {
            bgColor = '#f8fafc';
            textColor = '#94a3b8';
            borderColor = '#f1f5f9';
          } else if (item.isWeekend) {
            bgColor = '#fafafa';
            textColor = '#94a3b8';
            borderColor = '#f1f5f9';
          }

          const isSelectedInBatch = selectedDates.includes(item.dateKey);
          const isSelected = selectedDay?.dateKey === item.dateKey;
          const hasSignature = !item.isBeforeStart && Boolean(item.entry?.supervisor_signature || item.entry?.supervisorSignature);

          let tooltipTitle = '';
          if (item.entry) {
            tooltipTitle = `${item.entry.work_experience || item.entry.workExperience || item.entry.note || badgeText} ${hasSignature ? '(มีลายเซ็นพี่เลี้ยง)' : ''}`;
          } else if (item.isStartDate) {
            tooltipTitle = 'วันเริ่มต้นฝึกงาน (อนุมัติโดยผู้ดูแลระบบ)';
          } else if (item.isBeforeStart) {
            tooltipTitle = 'ยังไม่ถึงกำหนดเริ่มฝึกงาน';
          } else if (item.status === 'un-checked') {
            tooltipTitle = 'ไม่ได้ส่งรายงานประจำวัน';
          }

          return (
            <Tooltip 
              key={item.key} 
              title={tooltipTitle} 
              arrow
            >
              <Paper
                elevation={isSelectedInBatch ? 3 : (isSelected ? 2 : 0)}
                onClick={() => {
                  if (isBatchMode) {
                    if (item.isSelectable) toggleDateSelection(item);
                  } else {
                    setSelectedDay(item);
                  }
                }}
                sx={{
                  minHeight: { xs: 56, sm: 70 },
                  p: { xs: 0.4, sm: 0.75 },
                  borderRadius: { xs: 1.75, sm: 2.5 },
                  bgcolor: isSelectedInBatch ? '#ffe4e6' : bgColor,
                  color: isSelectedInBatch ? '#881337' : textColor,
                  border: `2px solid ${
                    isSelectedInBatch 
                      ? '#be185d' 
                      : (item.isStartDate ? '#be185d' : (isSelected ? '#2563eb' : (item.isToday ? '#2563eb' : borderColor)))
                  }`,
                  cursor: (isBatchMode && !item.isSelectable) ? 'not-allowed' : 'pointer',
                  opacity: (isBatchMode && !item.isSelectable) ? 0.4 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.15s ease-in-out',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: (isBatchMode && !item.isSelectable) ? 'none' : 'translateY(-2px)',
                    boxShadow: (isBatchMode && !item.isSelectable) ? 'none' : '0 4px 14px rgba(0,0,0,0.07)'
                  }
                }}
              >
                {/* Batch Checkbox Badge */}
                {isBatchMode && item.isSelectable && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 16,
                      height: 16,
                      borderRadius: '4px',
                      bgcolor: isSelectedInBatch ? '#be185d' : '#ffffff',
                      border: `1.5px solid ${isSelectedInBatch ? '#be185d' : '#cbd5e1'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      zIndex: 2,
                    }}
                  >
                    {isSelectedInBatch && <CheckIcon style={{ width: 12, height: 12, strokeWidth: 3 }} />}
                  </Box>
                )}

                {/* Start Date Flag Icon */}
                {!isBatchMode && item.isStartDate && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 3,
                      left: 3,
                      color: '#be185d',
                      zIndex: 2,
                    }}
                  >
                    <FlagIcon style={{ width: 12, height: 12 }} />
                  </Box>
                )}

                {/* Supervisor Signature Indicator Dot */}
                {!isBatchMode && hasSignature && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: '#be185d',
                      zIndex: 2,
                    }}
                  />
                )}

                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', pt: 0.2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: item.isToday || item.isStartDate ? 900 : 700,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      width: item.isToday ? { xs: 20, sm: 24 } : 'auto',
                      height: item.isToday ? { xs: 20, sm: 24 } : 'auto',
                      borderRadius: item.isToday ? '50%' : 0,
                      bgcolor: item.isToday ? '#2563eb' : 'transparent',
                      color: item.isToday ? '#ffffff' : (item.isStartDate ? '#be185d' : 'inherit'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    {item.dayNumber}
                  </Typography>
                </Box>

                <Box sx={{ width: '100%', mt: 'auto', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {item.isStartDate && (
                    <Box
                      sx={{
                        fontSize: { xs: '0.525rem', sm: '0.625rem' },
                        fontWeight: 800,
                        textAlign: 'center',
                        py: 0.2,
                        px: 0.2,
                        borderRadius: 1,
                        bgcolor: '#ffe4e6',
                        color: '#be185d',
                        lineHeight: 1,
                        width: '100%',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.25
                      }}
                    >
                      <FlagIcon style={{ width: 10, height: 10, flexShrink: 0 }} />
                      <span>เริ่มฝึกงาน</span>
                    </Box>
                  )}

                  {badgeText && (
                    <Box
                      sx={{
                        fontSize: { xs: '0.525rem', sm: '0.675rem' },
                        fontWeight: 800,
                        textAlign: 'center',
                        py: 0.25,
                        px: 0.2,
                        borderRadius: 1,
                        bgcolor: isSelectedInBatch ? '#fecdd3' : chipBg,
                        color: isSelectedInBatch ? '#881337' : chipColor,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.35,
                      }}
                    >
                      {hasSignature && <PencilSquareIcon style={{ width: 10, height: 10, color: '#be185d', flexShrink: 0 }} />}
                      {badgeText}
                    </Box>
                  )}
                </Box>
              </Paper>
            </Tooltip>
          );
        })}
      </Box>

      {/* Selected Day Detail Box (Normal Mode) */}
      {!isBatchMode && selectedDay && (
        <Paper 
          elevation={0} 
          sx={{ 
            mt: 2.5, 
            p: 2.5, 
            borderRadius: 3, 
            bgcolor: '#f8fafc',
            border: '1px solid #e2e8f0' 
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                รายละเอียดวันที่ {formatDateThai(selectedDay.dateKey)}
              </Typography>
              {selectedDay.isStartDate && <Chip label="วันเริ่มต้นฝึกงาน" size="small" sx={{ bgcolor: '#ffe4e6', color: '#be185d', fontWeight: 800 }} />}
              {selectedDay.status === 'present' && <Chip label="มา" color="success" size="small" sx={{ fontWeight: 700 }} />}
              {selectedDay.status === 'late' && <Chip label="สาย" color="warning" size="small" sx={{ fontWeight: 700 }} />}
              {selectedDay.status === 'absent' && <Chip label="ขาด" color="error" size="small" sx={{ fontWeight: 700 }} />}
              {selectedDay.status === 'un-checked' && <Chip label="ไม่ได้เช็คชื่อ" sx={{ bgcolor: '#94a3b8', color: '#fff', fontWeight: 700 }} size="small" />}
              {selectedDay.isBeforeStart && <Chip label="ก่อนเริ่มฝึกงาน" size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b' }} />}
            </Box>

            {selectedDay.isSelectable && (
              <Button
                size="small"
                variant="contained"
                startIcon={<PencilSquareIcon style={{ width: 16, height: 16 }} />}
                onClick={() => handleOpenSignModal(selectedDay.dateKey)}
                sx={{
                  bgcolor: '#be185d',
                  '&:hover': { bgcolor: '#9d174d' },
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                {selectedEntryInfo?.supervisor_signature || selectedEntryInfo?.supervisorSignature ? 'เซ็นรับรองใหม่' : 'ให้พี่เลี้ยงเซ็นรับรองวันนี้'}
              </Button>
            )}
          </Box>

          {selectedEntryInfo ? (
            <Box sx={{ fontSize: '0.875rem', color: '#334155', display: 'grid', gap: 1 }}>
              <div>
                <strong>ประสบการณ์ / กิจกรรมที่ทำ:</strong>{' '}
                {selectedEntryInfo.work_experience || selectedEntryInfo.workExperience || '-'}
              </div>
              <div>
                <strong>หมายเหตุเพิ่มเติม:</strong> {selectedEntryInfo.note || '-'}
              </div>
              {selectedEntryInfo.supervisor_name && (
                <div>
                  <strong>ผู้รับรอง / พี่เลี้ยง:</strong> {selectedEntryInfo.supervisor_name}
                </div>
              )}
              {selectedEntryInfo.supervisor_comment && (
                <div>
                  <strong>ความคิดเห็นจากพี่เลี้ยง:</strong> {selectedEntryInfo.supervisor_comment}
                </div>
              )}
              {(selectedEntryInfo.supervisor_signature || selectedEntryInfo.supervisorSignature) && (
                <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #fecdd3', display: 'inline-block', maxWidth: 260 }}>
                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 800, color: '#be185d', mb: 0.5 }}>
                    <CheckBadgeIcon style={{ width: 16, height: 16 }} /> ลายเซ็นรับรองโดยพี่เลี้ยง / ผู้ดูแลสถานประกอบการ:
                  </Typography>
                  <img
                    src={selectedEntryInfo.supervisor_signature || selectedEntryInfo.supervisorSignature}
                    alt="Supervisor Signature"
                    style={{ maxHeight: 55, maxWidth: '100%', objectFit: 'contain' }}
                  />
                </Box>
              )}
              {selectedEntryInfo.createdAt && (
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  เวลาเช็คชื่อ: {new Date(selectedEntryInfo.createdAt).toLocaleString('th-TH')}
                </div>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {selectedDay.isBeforeStart 
                  ? 'ยังไม่ถึงกำหนดเริ่มฝึกงาน (เริ่มฝึกงานอย่างเป็นทางการเมื่อวันที่ ' + formatDateThai(effectiveStartDate) + ')' 
                  : (selectedDay.isStartDate 
                    ? '🚩 วันนี้คือวันเริ่มต้นฝึกงานอย่างเป็นทางการ (ยังไม่ได้กดบันทึกรายงานประจำวัน)' 
                    : (selectedDay.status === 'un-checked' ? 'ไม่มีบันทึกการเช็คชื่อในวันนี้ (ยังไม่ได้เข้าเช็คชื่อ)' : 'ไม่มีข้อมูลการเช็คชื่อ'))}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Batch Mentor Signature Modal Dialog */}
      <Dialog
        open={signModalOpen}
        onClose={() => !submitting && setSignModalOpen(false)}
        maxWidth="sm"
        fullWidth
        disableScrollLock={true}
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '8px',
                bgcolor: '#ffe4e6',
                color: '#be185d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PencilSquareIcon style={{ width: 20, height: 20 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
              เซ็นรับรองรายงานประจำวัน (พี่เลี้ยง)
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => !submitting && setSignModalOpen(false)} sx={{ color: '#64748b' }}>
            <XMarkIcon style={{ width: 20, height: 20 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: '#fafafa' }}>
          {modalError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {modalError}
            </Alert>
          )}

          {/* Selected Dates Summary */}
          <Box sx={{ mb: 2.5, p: 1.75, borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b', mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CalendarIcon style={{ width: 18, height: 18, color: '#be185d' }} />
              วันที่เลือกเซ็นรับรอง ({selectedDates.length} วัน):
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, maxHeight: 110, overflowY: 'auto' }}>
              {selectedDates.map(dateKey => (
                <Chip
                  key={dateKey}
                  label={formatDateThai(dateKey)}
                  size="small"
                  sx={{ bgcolor: '#ffe4e6', color: '#be185d', fontWeight: 700, fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </Box>

          <Stack spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="ชื่อพี่เลี้ยง / ผู้ดูแลสถานประกอบการ (ถ้ามี)"
              placeholder="เช่น นายสมชาย ใจดี (หัวหน้าแผนก)"
              value={mentorName}
              onChange={(e) => setMentorName(e.target.value)}
              sx={{ bgcolor: '#ffffff' }}
            />

            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="ข้อคิดเห็น / คำแนะนำเพิ่มเติมจากพี่เลี้ยง (ถ้ามี)"
              placeholder="เช่น นักศึกษาทำงานเรียบร้อย ตรงต่อเวลา มีความตั้งใจดี"
              value={mentorComment}
              onChange={(e) => setMentorComment(e.target.value)}
              sx={{ bgcolor: '#ffffff' }}
            />
          </Stack>

          {/* Signature Canvas Box */}
          <Box sx={{ p: 2, border: '1.5px dashed #be185d', borderRadius: 2.5, bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#881337', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <PencilSquareIcon style={{ width: 18, height: 18, color: '#be185d' }} />
                ลายเซ็นพี่เลี้ยง (ใช้นิ้วมือหรือเมาส์วาดลายเซ็น)
              </Typography>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<ArrowPathIcon style={{ width: 14, height: 14 }} />}
                onClick={handleClearSignature}
                sx={{ py: 0.2, px: 1, fontSize: '0.75rem', borderRadius: 1.5, textTransform: 'none' }}
              >
                ล้างลายเซ็น
              </Button>
            </Box>

            <Box sx={{ border: '1px solid #cbd5e1', borderRadius: 2, bgcolor: '#ffffff', height: 160, overflow: 'hidden' }}>
              <SignatureCanvas
                ref={sigCanvas}
                penColor="#0f172a"
                canvasProps={{ className: 'sigCanvas', style: { width: '100%', height: '100%' } }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.75, textAlign: 'center' }}>
              * ลายเซ็นนี้จะถูกบันทึกรับรองลงในรายงานประจำวันของทั้ง {selectedDates.length} วันที่เลือก
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', bgcolor: '#ffffff' }}>
          <Button
            variant="outlined"
            onClick={() => setSignModalOpen(false)}
            disabled={submitting}
            sx={{ borderRadius: 2, color: '#64748b', borderColor: '#cbd5e1', textTransform: 'none' }}
          >
            ยกเลิก
          </Button>

          <Button
            variant="contained"
            onClick={handleSubmitBatchSign}
            disabled={submitting || selectedDates.length === 0}
            startIcon={<CheckBadgeIcon style={{ width: 18, height: 18 }} />}
            sx={{
              bgcolor: '#be185d',
              '&:hover': { bgcolor: '#9d174d' },
              fontWeight: 800,
              borderRadius: 2,
              textTransform: 'none',
              px: 3,
              boxShadow: '0 2px 8px rgba(190, 24, 93, 0.25)'
            }}
          >
            {submitting ? 'กำลังบันทึก...' : `ยืนยันเซ็นรับรอง (${selectedDates.length} วัน)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceCalendar;

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
  Zoom,
} from '@mui/material';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

// window.alert รับแค่ข้อความ จึงจัดประเภทจากถ้อยคำ: ข้อผิดพลาดตรวจก่อน (เช่น "ไม่สำเร็จ" มีคำว่า "สำเร็จ" อยู่ด้วย)
const ERROR_RE = /ผิดพลาด|ไม่สำเร็จ|ล้มเหลว|ไม่สามารถ|ไม่พบ|ไม่ถูกต้อง|ไม่ตรงกัน|ถูกปฏิเสธ|error|fail/i;
const SUCCESS_RE = /สำเร็จ|เสร็จสิ้น|เรียบร้อย|บันทึก(ข้อมูล)?แล้ว|ส่งแล้ว|อัปเดต(ข้อมูล)?แล้ว/;

const ALERT_VARIANTS = {
  success: { Icon: CheckCircle2, color: '#059669', bg: '#ecfdf5', ring: '#a7f3d0' },
  error: { Icon: AlertCircle, color: '#e11d48', bg: '#fff1f2', ring: '#fecdd3' },
  info: { Icon: Info, color: '#7c3aed', bg: '#f5f3ff', ring: '#ddd6fe' },
};

const getAlertVariant = (text) => {
  if (ERROR_RE.test(text)) return 'error';
  if (SUCCESS_RE.test(text)) return 'success';
  return 'info';
};

function GlobalAlertModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: 'ยืนยันรายการ',
    message: '',
    confirmText: 'ยืนยัน',
    cancelText: 'ยกเลิก',
    tone: 'danger',
  });
  const alertQueueRef = useRef([]);
  const isShowingRef = useRef(false);
  const confirmQueueRef = useRef([]);
  const isConfirmShowingRef = useRef(false);
  const activeConfirmRef = useRef(null);

  const showNextAlert = useCallback(() => {
    if (alertQueueRef.current.length === 0) {
      isShowingRef.current = false;
      setOpen(false); // คงข้อความเดิมไว้ให้แอนิเมชันปิดไม่กระพริบ
      return;
    }

    const nextMessage = alertQueueRef.current.shift();
    setMessage(nextMessage);
    setOpen(true);
  }, []);

  const showNextConfirm = useCallback(() => {
    if (confirmQueueRef.current.length === 0) {
      isConfirmShowingRef.current = false;
      activeConfirmRef.current = null;
      setConfirmModal((prev) => ({
        ...prev,
        open: false,
        message: '',
      }));
      return;
    }

    const nextConfirm = confirmQueueRef.current.shift();
    activeConfirmRef.current = nextConfirm;
    setConfirmModal({
      open: true,
      title: nextConfirm.title || 'ยืนยันรายการ',
      message: nextConfirm.message || '',
      confirmText: nextConfirm.confirmText || 'ยืนยัน',
      cancelText: nextConfirm.cancelText || 'ยกเลิก',
      tone: nextConfirm.tone || 'danger',
    });
  }, []);

  useEffect(() => {
    const originalAlert = window.alert;
    const previousShowMuiConfirm = window.showMuiConfirm;

    window.alert = (incomingMessage = '') => {
      const normalizedMessage = typeof incomingMessage === 'string'
        ? incomingMessage
        : JSON.stringify(incomingMessage);

      alertQueueRef.current.push(normalizedMessage);

      if (!isShowingRef.current) {
        isShowingRef.current = true;
        showNextAlert();
      }
    };

    window.showMuiConfirm = (incomingMessage = '', options = {}) => {
      const normalizedMessage = typeof incomingMessage === 'string'
        ? incomingMessage
        : JSON.stringify(incomingMessage);

      // ป้องกันการแสดง Modal ซ้ำซ้อนสำหรับการยืนยันการออกจากระบบ
      // ให้เปิด Logout Modal ตัวใหม่ใน UserProfileMenu แทน
      if (options.title === 'ยืนยันการออกจากระบบ' || normalizedMessage === 'คุณต้องการออกจากระบบใช่หรือไม่?') {
        window.dispatchEvent(new CustomEvent('request-logout-confirm'));
        return Promise.resolve(true);
      }

      return new Promise((resolve) => {
        confirmQueueRef.current.push({
          message: normalizedMessage,
          title: options.title,
          confirmText: options.confirmText,
          cancelText: options.cancelText,
          tone: options.tone,
          resolve,
        });

        if (!isConfirmShowingRef.current) {
          isConfirmShowingRef.current = true;
          showNextConfirm();
        }
      });
    };

    const logoutClickCapture = (event) => {
      const logoutElement = event.target?.closest?.('.logout-btn');
      if (!logoutElement) return;
      if (logoutElement.dataset?.skipLogoutConfirm === '1') return;

      event.preventDefault();
      event.stopPropagation();

      window.dispatchEvent(new CustomEvent('request-logout-confirm'));
    };

    document.addEventListener('click', logoutClickCapture, true);

    return () => {
      window.alert = originalAlert;
      window.showMuiConfirm = previousShowMuiConfirm;
      document.removeEventListener('click', logoutClickCapture, true);
    };
  }, [showNextAlert, showNextConfirm]);

  const alertStyle = ALERT_VARIANTS[getAlertVariant(message)];

  const handleClose = () => {
    showNextAlert();
  };

  const handleConfirmClose = () => {
    if (activeConfirmRef.current?.resolve) {
      activeConfirmRef.current.resolve(false);
    }
    showNextConfirm();
  };

  const handleConfirmAccept = () => {
    if (activeConfirmRef.current?.resolve) {
      activeConfirmRef.current.resolve(true);
    }
    showNextConfirm();
  };

  return (
    <>
      {children}

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        aria-labelledby="global-alert-title"
        aria-describedby="global-alert-description"
        PaperProps={{
          sx: {
            borderRadius: '16px',
            m: 2,
            width: 'calc(100% - 32px)',
            maxWidth: 448,
            minWidth: { xs: 0, sm: 420 },
            boxShadow: '0 25px 50px -12px rgba(46, 16, 101, 0.35)',
            border: '1px solid #ede9fe',
          },
        }}
      >
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48, height: 48, flexShrink: 0, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: alertStyle.bg, border: `1px solid ${alertStyle.ring}`,
            }}
          >
            <alertStyle.Icon size={28} strokeWidth={2.2} color={alertStyle.color} aria-hidden="true" />
          </Box>
          <Typography id="global-alert-title" component="h2" sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e1b4b', lineHeight: 1.4 }}>
            แจ้งเตือน
          </Typography>
        </Box>
        <DialogContent sx={{ px: 3, pt: 0, pb: 3 }}>
          <DialogContentText
            id="global-alert-description"
            sx={{
              color: '#475569', fontSize: { xs: '0.875rem', sm: '1rem' }, lineHeight: 1.7,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}
          >
            {message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 0, justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
          <Button
            onClick={handleClose}
            autoFocus
            variant="contained"
            disableElevation
            sx={{
              height: 44, px: 4, borderRadius: '12px', fontWeight: 600, fontSize: '0.95rem', textTransform: 'none',
              width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 120 },
              bgcolor: '#7C3AED', color: '#fff',
              boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.3)',
              '&:hover': { bgcolor: '#6D28D9' },
            }}
          >
            ตกลง
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmModal.open}
        onClose={handleConfirmClose}
        TransitionComponent={Zoom}
        PaperProps={{
          className: 'dialog-confirm',
          sx: {
            borderRadius: 4,
            padding: 3,
            minWidth: { xs: '320px', sm: '420px' },
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          }
        }}
      >
        <DialogTitle sx={{ pt: 2, pb: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', background: confirmModal.tone === 'primary' ? '#f5f3ff' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '50%', background: confirmModal.tone === 'primary' ? '#ede9fe' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {confirmModal.tone === 'primary'
                ? <CheckCircleIcon style={{ width: 32, height: 32, color: '#7c3aed' }} />
                : <ExclamationTriangleIcon style={{ width: 32, height: 32, color: '#ef4444' }} />}
            </Box>
          </Box>
          <Typography variant="h5" component="div" sx={{ fontWeight: 800, color: '#111111', mt: 1, letterSpacing: '-0.5px' }}>
            {confirmModal.title}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 4 }}>
          <DialogContentText sx={{ color: '#4b5563', fontSize: '1.05rem', lineHeight: 1.6 }}>
            {confirmModal.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 2, px: 3 }}>
          <Button 
            onClick={handleConfirmClose}
            variant="contained"
            disableElevation
            sx={{ 
              background: '#f3f4f6', 
              color: '#374151', 
              fontWeight: 700, 
              px: 3, 
              py: 1, 
              borderRadius: '999px', 
              whiteSpace: 'nowrap',
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': { background: '#e5e7eb' } 
            }}
          >
            {confirmModal.cancelText}
          </Button>
          <Button 
            onClick={handleConfirmAccept} 
            variant="contained"
            disableElevation
            autoFocus
            sx={{
              background: confirmModal.tone === 'primary' ? 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)' : '#ef4444',
              color: 'white',
              fontWeight: 700,
              px: 3,
              py: 1,
              borderRadius: '999px',
              whiteSpace: 'nowrap',
              textTransform: 'none',
              fontSize: '1rem',
              boxShadow: confirmModal.tone === 'primary'
                ? '0 4px 6px -1px rgb(124 58 237 / 0.4)'
                : '0 4px 6px -1px rgb(239 68 68 / 0.4)',
              '&:hover': confirmModal.tone === 'primary'
                ? { background: 'linear-gradient(135deg, #3b0764 0%, #5b21b6 100%)', boxShadow: '0 4px 12px rgb(109 40 217 / 0.4)' }
                : { background: '#dc2626', boxShadow: '0 4px 6px -1px rgb(220 38 38 / 0.4)' },
            }}
          >
            {confirmModal.confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default GlobalAlertModalProvider;
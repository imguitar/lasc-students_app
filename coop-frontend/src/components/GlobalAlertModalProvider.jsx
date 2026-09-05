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
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

function GlobalAlertModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: 'ยืนยันรายการ',
    message: '',
    confirmText: 'ยืนยัน',
    cancelText: 'ยกเลิก',
  });
  const alertQueueRef = useRef([]);
  const isShowingRef = useRef(false);
  const confirmQueueRef = useRef([]);
  const isConfirmShowingRef = useRef(false);
  const activeConfirmRef = useRef(null);

  const showNextAlert = useCallback(() => {
    if (alertQueueRef.current.length === 0) {
      isShowingRef.current = false;
      setOpen(false);
      setMessage('');
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

      return new Promise((resolve) => {
        confirmQueueRef.current.push({
          message: normalizedMessage,
          title: options.title,
          confirmText: options.confirmText,
          cancelText: options.cancelText,
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

      window
        .showMuiConfirm('คุณต้องการออกจากระบบใช่หรือไม่?', {
          title: 'ยืนยันการออกจากระบบ',
          confirmText: 'ออกจากระบบ',
          cancelText: 'ยกเลิก',
        })
        .then((confirmed) => {
          if (!confirmed) return;
          logoutElement.dataset.skipLogoutConfirm = '1';
          logoutElement.click();
          delete logoutElement.dataset.skipLogoutConfirm;
        });
    };

    document.addEventListener('click', logoutClickCapture, true);

    return () => {
      window.alert = originalAlert;
      window.showMuiConfirm = previousShowMuiConfirm;
      document.removeEventListener('click', logoutClickCapture, true);
    };
  }, [showNextAlert, showNextConfirm]);

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
        aria-labelledby="global-alert-title"
        aria-describedby="global-alert-description"
      >
        <DialogTitle id="global-alert-title">แจ้งเตือน</DialogTitle>
        <DialogContent>
          <DialogContentText id="global-alert-description">
            {message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>
            ตกลง
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmModal.open}
        onClose={handleConfirmClose}
        TransitionComponent={Zoom}
        PaperProps={{
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
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ExclamationTriangleIcon style={{ width: 32, height: 32, color: '#ef4444' }} />
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
              background: '#ef4444', 
              color: 'white', 
              fontWeight: 700, 
              px: 3, 
              py: 1, 
              borderRadius: '999px', 
              whiteSpace: 'nowrap',
              textTransform: 'none',
              fontSize: '1rem',
              boxShadow: '0 4px 6px -1px rgb(239 68 68 / 0.4)',
              '&:hover': { background: '#dc2626', boxShadow: '0 4px 6px -1px rgb(220 38 38 / 0.4)' } 
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
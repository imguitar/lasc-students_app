import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  UserIcon,
  HomeIcon,
  ArrowLeftOnRectangleIcon,
  IdentificationIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

const UserProfileMenu = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  const getRoleLabel = (r) => {
    if (r === 'admin') return 'ผู้ดูแลระบบ';
    if (r === 'advisor' || r === 'teacher') return 'อาจารย์ที่ปรึกษา';
    return 'นักศึกษา';
  };

  const getProfileLink = () => {
    if (user?.role === 'admin') return '/admin-dashboard/profile';
    if (user?.role === 'student') return '/dashboard/profile';
    return null;
  };

  const profileLink = getProfileLink();
  const userName = user?.name || user?.full_name || 'ผู้ใช้งาน';
  const initial = userName.charAt(0).toUpperCase();

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
      <IconButton
        onClick={handleOpen}
        size="small"
        sx={{
          p: 0.25,
          transition: 'all 0.2s ease',
          '&:hover': { transform: 'scale(1.05)' },
        }}
      >
        <Avatar
          sx={{
            width: 34,
            height: 34,
            bgcolor: '#111111',
            color: '#fbbf24',
            border: '2px solid #111111',
            fontSize: '0.85rem',
            fontWeight: 800,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        >
          {initial}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 1.5,
            borderRadius: '14px',
            background: '#111111',
            border: '1px solid rgba(217, 119, 6, 0.35)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
            color: '#ffffff',
            minWidth: 220,
            p: 0.75,
            overflow: 'visible',
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: '#111111',
              borderLeft: '1px solid rgba(217, 119, 6, 0.35)',
              borderTop: '1px solid rgba(217, 119, 6, 0.35)',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 1.5, py: 1.25, pb: 1.25, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.88rem', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {userName}
          </Typography>
          <Typography variant="caption" sx={{ color: '#fbbf24', fontWeight: 700, display: 'block', mt: 0.35 }}>
            {getRoleLabel(user?.role)}
          </Typography>
        </Box>

        {/* Profile Link */}
        {profileLink && (
          <MenuItem
            component={Link}
            to={profileLink}
            onClick={handleClose}
            sx={{
              py: 1,
              px: 1.5,
              borderRadius: '8px',
              fontSize: '0.84rem',
              color: '#d1d5db',
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)', color: '#fbbf24' },
            }}
          >
            <IdentificationIcon style={{ width: 18, height: 18 }} />
            <span>โปรไฟล์ของฉัน</span>
          </MenuItem>
        )}

        {/* Home Page Link */}
        <MenuItem
          component={Link}
          to="/"
          onClick={handleClose}
          sx={{
            py: 1,
            px: 1.5,
            borderRadius: '8px',
            fontSize: '0.84rem',
            color: '#d1d5db',
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)', color: '#fbbf24' },
          }}
        >
          <HomeIcon style={{ width: 18, height: 18 }} />
          <span>ไปยังหน้าแรก</span>
        </MenuItem>

        <Divider sx={{ my: 0.5, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Logout */}
        <MenuItem
          onClick={() => {
            handleClose();
            handleLogout();
          }}
          sx={{
            py: 1,
            px: 1.5,
            borderRadius: '8px',
            fontSize: '0.84rem',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' },
          }}
        >
          <ArrowLeftOnRectangleIcon style={{ width: 18, height: 18 }} />
          <span>ออกจากระบบ</span>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default UserProfileMenu;

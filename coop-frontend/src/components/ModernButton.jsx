import React from 'react';
import { Button } from '@mui/material';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const ModernButton = ({ 
  customVariant = 'primary', // 'accept', 'reject', 'reject-outline', 'primary', 'secondary'
  icon,
  children,
  sx = {},
  ...props 
}) => {
  let defaultSx = {};
  let defaultIcon = null;

  const isSmall = props.size === 'small';
  
  if (customVariant === 'accept') {
    defaultSx = {
      minWidth: isSmall ? 85 : 160, 
      fontWeight: 700, 
      borderRadius: '50px', 
      padding: isSmall ? '6px 16px' : '12px 32px',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      boxShadow: isSmall ? '0 2px 8px 0 rgba(16, 185, 129, 0.35)' : '0 4px 14px 0 rgba(16, 185, 129, 0.39)',
      textTransform: 'none',
      fontSize: isSmall ? '0.85rem' : '1rem',
      transition: 'all 0.2s ease-in-out',
      border: 'none',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.23)',
        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        border: 'none'
      }
    };
    defaultIcon = isSmall ? null : <CheckCircleIcon style={{ width: 22, height: 22 }} />;
  } else if (customVariant === 'reject') {
    defaultSx = {
      minWidth: isSmall ? 85 : 160, 
      fontWeight: 700, 
      borderRadius: '50px', 
      padding: isSmall ? '6px 16px' : '12px 32px',
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
      boxShadow: isSmall ? '0 2px 8px 0 rgba(239, 68, 68, 0.35)' : '0 4px 14px 0 rgba(239, 68, 68, 0.39)',
      textTransform: 'none',
      fontSize: isSmall ? '0.85rem' : '1rem',
      transition: 'all 0.2s ease-in-out',
      border: 'none',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 20px rgba(239, 68, 68, 0.23)',
        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        border: 'none'
      }
    };
    defaultIcon = isSmall ? null : <XCircleIcon style={{ width: 22, height: 22 }} />;
  } else if (customVariant === 'reject-outline') {
    defaultSx = {
      minWidth: isSmall ? 85 : 160, 
      fontWeight: 700, 
      borderRadius: '50px', 
      padding: isSmall ? '6px 16px' : '12px 32px',
      bgcolor: '#ffffff',
      color: '#dc2626',
      border: '1.5px solid #ef4444',
      boxShadow: isSmall ? '0 1px 4px rgba(239, 68, 68, 0.1)' : '0 2px 8px rgba(239, 68, 68, 0.15)',
      textTransform: 'none',
      fontSize: isSmall ? '0.85rem' : '1rem',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        bgcolor: '#fef2f2',
        borderColor: '#dc2626',
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
      }
    };
    defaultIcon = isSmall ? null : <XCircleIcon style={{ width: 22, height: 22 }} />;
  } else if (customVariant === 'secondary') {
    defaultSx = {
      minWidth: isSmall ? 85 : 160,
      fontWeight: 600,
      borderRadius: '50px',
      padding: isSmall ? '6px 16px' : '10px 24px',
      bgcolor: '#ffffff',
      color: '#475569',
      border: '2px solid #cbd5e1',
      textTransform: 'none',
      fontSize: isSmall ? '0.85rem' : '1rem',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        bgcolor: '#f8fafc',
        borderColor: '#94a3b8',
        transform: 'translateY(-1px)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
      }
    };
  } else if (customVariant === 'primary') {
    defaultSx = {
      minWidth: isSmall ? 85 : 160,
      fontWeight: 600,
      borderRadius: '50px',
      padding: isSmall ? '6px 16px' : '10px 24px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: 'white',
      border: 'none',
      boxShadow: isSmall ? '0 2px 8px 0 rgba(59, 130, 246, 0.35)' : '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
      textTransform: 'none',
      fontSize: isSmall ? '0.85rem' : '1rem',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        transform: 'translateY(-1px)',
        boxShadow: '0 6px 20px rgba(59, 130, 246, 0.23)'
      }
    };
  }

  // Allow overriding default icon with explicit icon prop or hide it with icon={null}
  const startIcon = icon !== undefined ? icon : defaultIcon;
  const isOutlined = customVariant === 'secondary' || customVariant === 'reject-outline';

  return (
    <Button
      variant={isOutlined ? 'outlined' : 'contained'}
      startIcon={startIcon}
      sx={{ ...defaultSx, ...sx }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default ModernButton;

import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';

const StatCard = ({
  title,
  label,
  value,
  icon,
  color = '#3b82f6',
  isText = false,
  onClick,
}) => {
  const cardTitle = title || label;

  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        borderRadius: '16px',
        border: '1px solid',
        borderColor: `${color}30`,
        background: `linear-gradient(135deg, ${color}18 0%, #ffffff 60%)`,
        boxShadow: '0 6px 20px rgba(15, 23, 42, 0.05)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: `0 12px 28px ${color}25`,
          borderColor: `${color}50`,
        },
      }}
    >
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
          {icon && (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '14px',
                bgcolor: `${color}1f`,
                color: color,
                border: `1px solid ${color}35`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                boxShadow: `0 4px 12px ${color}20`,
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: '#64748b',
                fontWeight: 600,
                fontSize: '0.85rem',
                mb: 0.5,
              }}
            >
              {cardTitle}
            </Typography>
            <Typography
              variant={isText ? 'subtitle1' : 'h4'}
              sx={{
                fontWeight: 800,
                color: isText ? color : '#0f172a',
                lineHeight: 1.15,
                wordBreak: 'break-word',
              }}
            >
              {value}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;

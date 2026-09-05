import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Box, Typography, Chip, Paper, Button, CircularProgress } from '@mui/material';
import api from '../../api/axios';
import { MapPinIcon } from '@heroicons/react/24/outline';

const categoryColors = {
  'รับสมัคร': { bg: '#dcfce7', color: '#166534' },
  'ประกาศ': { bg: '#dbeafe', color: '#1e40af' },
  'กิจกรรม': { bg: '#fef3c7', color: '#92400e' },
  'ทั่วไป': { bg: '#f3f4f6', color: '#374151' },
};

const AnnouncementDetailPage = () => {
  const { id } = useParams();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/public/announcements/${id}`)
      .then(res => {
        if (res.data.success) setNews(res.data.data);
        else setError('ไม่พบข่าวนี้');
      })
      .catch(() => setError('ไม่พบข่าวนี้ หรือลิงก์ไม่ถูกต้อง'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>
      <CircularProgress />
    </Box>
  );

  if (error || !news) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', gap: 2 }}>
      <Typography variant="h6" color="text.secondary">{error || 'ไม่พบข่าว'}</Typography>
      <Button component={Link} to="/" variant="outlined">← กลับหน้าแรก</Button>
    </Box>
  );

  const catStyle = categoryColors[news.category] || categoryColors['ทั่วไป'];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: { xs: 3, md: 5 }, px: { xs: 2, md: 3 } }}>
      <Paper elevation={0} sx={{ maxWidth: 800, mx: 'auto', borderRadius: 3, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        {/* Cover Image */}
        {news.coverImage && (
          <Box
            component="img"
            src={news.coverImage}
            alt={news.title}
            sx={{ width: '100%', height: 'auto', maxHeight: '600px', objectFit: 'contain', backgroundColor: '#f8fafc', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
          />
        )}

        <Box sx={{ p: { xs: 3, md: 5 } }}>
          {/* Category + Date */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Chip label={news.category} size="small" sx={{ bgcolor: catStyle.bg, color: catStyle.color, fontWeight: 700 }} />
            {news.is_pinned ? <Chip label={<span style={{display:"flex", alignItems:"center", gap:"4px"}}><MapPinIcon style={{width: 16, height: 16}}/> ปักหมุด</span>} size="small" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700 }} /> : null}
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              {new Date(news.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Box>

          {/* Title */}
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mb: 3, lineHeight: 1.4, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            {news.title}
          </Typography>

          {/* Author */}
          {news.author && (
            <Typography variant="body2" sx={{ color: '#64748b', mb: 4, pb: 3, borderBottom: '1px solid #e2e8f0' }}>
              โดย {news.author}
            </Typography>
          )}

          {/* Content */}
          <Typography
            component="div"
            variant="body1"
            sx={{
              color: '#334155',
              lineHeight: 2,
              fontSize: '1.05rem',
              whiteSpace: 'pre-wrap',
              '& p': { mb: 2 },
            }}
          >
            {news.content ? news.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
              part.match(/(https?:\/\/[^\s]+)/g) 
                ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>{part}</a> 
                : part
            ) : null}
          </Typography>

          {/* Back Button */}
          <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid #e2e8f0' }}>
            <Button component={Link} to="/" variant="outlined" sx={{ borderRadius: 999, fontWeight: 600, color: '#475569', borderColor: '#cbd5e1' }}>
              ← กลับหน้าแรก
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default AnnouncementDetailPage;

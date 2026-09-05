import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import api from '../../api/axios';
import './HomePage.css';
import logo from '../../assets/LASC-SSKRU-1.png';
import sskruBg from '../../assets/SSKRU_BG.png';
import { PhoneIcon, EnvelopeIcon, MapPinIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ArrowRightIcon, DocumentPlusIcon, UserIcon, ArrowLeftOnRectangleIcon, BuildingOffice2Icon, BriefcaseIcon, SparklesIcon, MagnifyingGlassIcon, GlobeAltIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogTitle, DialogContent, DialogActions, Chip, TextField } from '@mui/material';

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companySearch, setCompanySearch] = useState('');
  const [companyProvince, setCompanyProvince] = useState('all');
  const [selectedCompanyModal, setSelectedCompanyModal] = useState(null);
  const carouselRef = useRef(null);
  const companyCarouselRef = useRef(null);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const [isCompanyCarouselHovered, setIsCompanyCarouselHovered] = useState(false);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      const cardNode = carouselRef.current.querySelector('.news-card');
      const scrollAmount = cardNode ? cardNode.offsetWidth + 24 : 344;
      
      if (direction === 'left') {
        if (scrollLeft <= 10) {
          carouselRef.current.scrollTo({ left: scrollWidth, behavior: 'smooth' });
        } else {
          carouselRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
      } else {
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      }
    }
  };

  const scrollCompanyCarousel = (direction) => {
    if (companyCarouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = companyCarouselRef.current;
      const cardNode = companyCarouselRef.current.querySelector('.company-carousel-card');
      const scrollAmount = cardNode ? cardNode.offsetWidth + 24 : 344;
      
      if (direction === 'left') {
        if (scrollLeft <= 10) {
          companyCarouselRef.current.scrollTo({ left: scrollWidth, behavior: 'smooth' });
        } else {
          companyCarouselRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
      } else {
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          companyCarouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          companyCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      }
    }
  };

  const [contactInfo, setContactInfo] = useState({
    phone: '',
    email: '',
    name: ''
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    // Fetch announcements
    api.get('/public/announcements')
      .then(res => setAnnouncements(res.data.data || []))
      .catch(() => setAnnouncements([]));

    // Fetch companies
    api.get('/public/companies')
      .then(res => setCompanies(res.data.data || []))
      .catch(() => setCompanies([]));

    // Fetch dynamic admin contact info
    api.get('/public/contact')
      .then(res => {
        if (res.data && res.data.data) {
          setContactInfo(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Autoplay News Carousel Effect
  useEffect(() => {
    let interval;
    if (!isCarouselHovered && announcements.length > 0) {
      interval = setInterval(() => {
        scrollCarousel('right');
      }, 3000); // Scroll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [isCarouselHovered, announcements]);

  // Autoplay Company Carousel Effect
  useEffect(() => {
    let interval;
    if (!isCompanyCarouselHovered && companies.length > 0) {
      interval = setInterval(() => {
        scrollCompanyCarousel('right');
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isCompanyCarouselHovered, companies]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setMenuAnchorEl(null);
  };

  const handleOpenMenu = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  const getDashboardPath = (role) => {
    if (role === 'admin') return '/admin-dashboard';
    if (role === 'advisor') return '/advisor-dashboard';
    return '/dashboard';
  };

  const getProfilePath = (role) => {
    if (role === 'admin') return '/admin-dashboard/profile';
    if (role === 'student') return '/dashboard/profile';
    return null;
  };

  return (
    <div className="home-container">
      {/* Utility Bar */}
      <Box sx={{ background: '#ffffff', color: '#111111', py: 0.8, px: { xs: 2, md: 4 }, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, fontSize: '0.85rem' }}>
        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhoneIcon style={{ width: 16, height: 16 }} /> {contactInfo.phone ? `ติดต่อสอบถาม ${contactInfo.phone}` : 'ติดต่อสอบถาม 02-XXX-XXXX'}
        </Typography>
        <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
          <EnvelopeIcon style={{ width: 16, height: 16 }} /> {contactInfo.email || 'contact@example.com'}
        </Typography>
      </Box>

      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '3px solid transparent', borderImage: 'linear-gradient(to right, #000000, #ffffff) 1', bgcolor: '#ffffff' }}>
        <Toolbar
          sx={{
            minHeight: 90,
            px: { xs: 2, md: 4 },
            display: 'flex',
            flexWrap: 'nowrap',
            justifyContent: 'space-between',
            gap: 2,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                component="img"
                src={logo}
                alt="LASC Logo"
                sx={{
                  height: { xs: 36, sm: 44, md: 54 },
                  width: 'auto',
                  maxWidth: '100%',
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography sx={{ 
                  fontWeight: 800, 
                  fontSize: { xs: '0.9rem', sm: '1.2rem', md: '1.35rem' }, 
                  letterSpacing: '0px', 
                  whiteSpace: 'nowrap',
                  color: '#111111',
                  fontFamily: '"Prompt", "Kanit", "Inter", sans-serif'
                }}>
                  ระบบฝึกประสบการณ์วิชาชีพ
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.75, sm: 1.25 },
              flex: '0 0 auto',
              whiteSpace: 'nowrap',
            }}
          >
            {!user ? (
              <Button 
                component={Link} 
                to="/login" 
                variant="contained" 
                size="small"
                sx={{ 
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #111111 0%, #262626 100%)',
                  color: '#ffffff', 
                  fontWeight: 700, 
                  fontSize: '0.78rem',
                  fontFamily: '"Prompt", "Kanit", sans-serif',
                  px: 1.75, 
                  py: 0.5, 
                  textTransform: 'none',
                  border: '1px solid rgba(217, 119, 6, 0.4)',
                  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.12)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                  '& .MuiButton-endIcon': {
                    transition: 'transform 0.3s ease',
                    ml: 0.5,
                  },
                  '&:hover': { 
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    borderColor: '#d97706',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 16px rgba(217, 119, 6, 0.35)',
                    '& .MuiButton-endIcon': {
                      transform: 'translateX(3px)',
                    }
                  } 
                }}
                endIcon={<ArrowRightIcon style={{ width: 14, height: 14 }} />}
              >
                เข้าสู่ระบบ
              </Button>
            ) : (
              <>
                <Button
                  component={Link}
                  to={getDashboardPath(user.role)}
                  variant="contained"
                  size="small"
                  sx={{
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #111111 0%, #262626 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    fontFamily: '"Prompt", "Kanit", sans-serif',
                    px: 1.75,
                    py: 0.5,
                    textTransform: 'none',
                    border: '1px solid rgba(217, 119, 6, 0.4)',
                    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.12)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '& .MuiButton-endIcon': {
                      transition: 'transform 0.3s ease',
                      ml: 0.5,
                    },
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                      borderColor: '#d97706',
                      boxShadow: '0 4px 16px rgba(217, 119, 6, 0.35)',
                      '& .MuiButton-endIcon': {
                        transform: 'translateX(3px)',
                      }
                    }
                  }}
                  endIcon={<ArrowRightIcon style={{ width: 14, height: 14 }} />}
                >
                  {user.role === 'student' ? 'ยื่นคำร้อง' : 'แดชบอร์ด'}
                </Button>

                <IconButton onClick={handleOpenMenu} size="small" sx={{ p: 0.25 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: '#000000', color: '#fbbf24', border: '1.5px solid #000000', fontSize: '0.85rem', fontWeight: 800 }}>
                    {(user?.name || user?.full_name || 'U').charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>

                <Menu
                  anchorEl={menuAnchorEl}
                  open={Boolean(menuAnchorEl)}
                  onClose={handleCloseMenu}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  PaperProps={{
                    sx: {
                      mt: 1.5,
                      width: 220,
                      borderRadius: '16px',
                      background: '#111111',
                      border: '1px solid rgba(217, 119, 6, 0.35)',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
                      color: '#ffffff',
                      p: 1,
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
                    }
                  }}
                >
                  {/* User Profile Header in Menu */}
                  <Box sx={{ px: 1.5, py: 1.25, pb: 1.5, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', mb: 0.75 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ffffff', fontSize: '0.88rem', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.name || user?.full_name || 'ผู้ใช้งาน'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.75rem', display: 'block', mt: 0.25 }}>
                      {user?.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : user?.role === 'advisor' ? 'อาจารย์ที่ปรึกษา' : 'นักศึกษา'}
                    </Typography>
                  </Box>

                  {getProfilePath(user.role) && (
                    <MenuItem
                      component={Link}
                      to={getProfilePath(user.role)}
                      onClick={handleCloseMenu}
                      sx={{
                        borderRadius: '10px',
                        py: 1,
                        px: 1.5,
                        gap: 1.5,
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: '#f3f4f6',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'rgba(217, 119, 6, 0.18)',
                          color: '#fbbf24',
                          transform: 'translateX(3px)',
                        }
                      }}
                    >
                      <UserIcon style={{ width: 18, height: 18, color: '#f59e0b' }} />
                      โปรไฟล์
                    </MenuItem>
                  )}

                  <MenuItem
                    onClick={handleLogout}
                    sx={{
                      borderRadius: '10px',
                      py: 1,
                      px: 1.5,
                      gap: 1.5,
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: '#f87171',
                      mt: 0.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        transform: 'translateX(3px)',
                      }
                    }}
                  >
                    <ArrowLeftOnRectangleIcon style={{ width: 18, height: 18, color: '#ef4444' }} />
                    ออกจากระบบ
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Bottom Utility Bar */}
      <Box sx={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb', color: '#111111', py: 0.8, px: { xs: 2, md: 4 }, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, fontSize: '0.85rem' }}>
        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          ประกาศด่วน: ระบบเปิดรับคำร้องฝึกงานตั้งแต่วันที่ 1 สิงหาคม เป็นต้นไป
        </Typography>
      </Box>

      <main className="hero-section" style={{ padding: 0, position: 'relative' }}>
        <img src={sskruBg} alt="SSKRU Background" style={{ width: '100%', height: '450px', objectFit: 'cover', objectPosition: 'center 20%', display: 'block' }} />
        <div className="hero-content" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="hero-buttons">
            {/* Buttons removed */ }
          </div>
        </div>
      </main>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <section className="features-section" style={{ background: '#fcfcfc', padding: '4rem 5%' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', maxWidth: '100%', margin: '0 auto 2rem auto' }}>
            <h2 className="section-title" style={{ margin: 0, textAlign: 'left', fontSize: '1.8rem' }}>ข่าวสารและประกาศ</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link to="/news" style={{ color: '#111', fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem' }}>ดูข่าวทั้งหมด</Link>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => scrollCarousel('left')} style={{ width: 40, height: 40, borderRadius: 4, border: '1px solid #eaeaea', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <ChevronLeftIcon style={{ width: 20, height: 20, color: '#666' }} />
                </button>
                <button onClick={() => scrollCarousel('right')} style={{ width: 40, height: 40, borderRadius: 4, border: '1px solid #eaeaea', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <ChevronRightIcon style={{ width: 20, height: 20, color: '#666' }} />
                </button>
              </div>
            </div>
          </div>
          
          <div 
            className="news-carousel-container" 
            ref={carouselRef} 
            onMouseEnter={() => setIsCarouselHovered(true)}
            onMouseLeave={() => setIsCarouselHovered(false)}
            style={{ maxWidth: '100%', margin: '0 auto', display: 'flex', overflowX: 'auto', gap: '24px', scrollBehavior: 'smooth', scrollSnapType: 'x mandatory', paddingBottom: '1rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
          >
            {announcements.slice(0, 10).map((news) => (
              <div 
                key={news.id} 
                className="news-card" 
                onClick={() => navigate(`/news/${news.id}`)}
                style={{ cursor: 'pointer', flex: '0 0 auto', width: 'calc((100% - 48px) / 3)', minWidth: '280px', scrollSnapAlign: 'start', background: '#fff', border: '1px solid #f0f0f0', borderRadius: '0', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease-in-out', position: 'relative' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {news.is_pinned === 1 && (
                  <span style={{
                    position: 'absolute', top: 12, right: 12,
                    background: '#fbbf24', color: '#78350f', fontSize: '0.7rem',
                    fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', gap: '4px', zIndex: 1
                  }}><MapPinIcon style={{ width: 12, height: 12 }} /> ปักหมุด</span>
                )}
                {news.coverImage ? (
                  <img src={news.coverImage} alt={news.title} style={{ width: '100%', height: 'auto', aspectRatio: '3/2', objectFit: 'cover', borderBottom: '3px solid #f97316' }} />
                ) : (
                  <div style={{ width: '100%', height: 'auto', aspectRatio: '3/2', background: '#f3f4f6', borderBottom: '3px solid #f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#9ca3af' }}>ไม่มีรูปภาพ</span>
                  </div>
                )}
                
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.75rem' }}>
                    {news.author || 'admin'} &mdash; {new Date(news.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111', marginBottom: '0.75rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {news.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: 1.6, marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                    {news.content}
                  </p>
                  
                  <Link to={`/news/${news.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111', textDecoration: 'none', display: 'inline-block', marginTop: 'auto' }}>
                    Read More
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommended Companies Gateway Section (ปุ่มกดเข้าสู่หน้ารายชื่อสถานประกอบการแนะนำ) */}
      <section className="features-section" style={{ background: '#ffffff', padding: '3rem 5%', borderTop: '1px solid #f1f5f9' }}>
        <div
          onClick={() => navigate('/companies')}
          style={{
            maxWidth: '100%',
            margin: '0 auto',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderLeft: '6px solid #f59e0b',
            borderRadius: '16px',
            padding: '2.25rem 2.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(245, 158, 11, 0.15)';
            e.currentTarget.style.borderColor = '#f59e0b';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.05)';
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.borderLeftColor = '#f59e0b';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: '1 1 500px' }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1px solid #fde68a',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.12)',
            }}>
              <BuildingOffice2Icon style={{ width: 32, height: 32, color: '#d97706' }} />
            </div>

            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, marginBottom: 6 }}>
                <SparklesIcon style={{ width: 14, height: 14 }} /> แนะนำที่ฝึกงานจากรุ่นพี่
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px' }}>
                สถานประกอบการแนะนำ
              </h3>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#64748b', lineHeight: 1.5 }}>
                ค้นหาและดูรายชื่อสถานที่ฝึกงานจริงจากรุ่นพี่ที่ผ่านการฝึกงาน เพื่อเป็นแนวทางในการเลือกสถานที่ฝึกประสบการณ์วิชาชีพ
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#111111',
                color: '#fbbf24',
                fontWeight: 800,
                fontSize: '0.95rem',
                padding: '12px 24px',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease',
              }}
            >
              ดูสถานประกอบการทั้งหมด
              <ArrowRightIcon style={{ width: 18, height: 18 }} />
            </span>
          </div>
        </div>
      </section>

      <section className="how-it-works" style={{ padding: '4rem 5%', borderTop: '1px solid #e2e8f0' }}>
        <h2 className="section-title">กำหนดการสำคัญ</h2>
        <div className="steps-grid" style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="step-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start', textAlign: 'left', padding: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#4f46e5', background: '#e0e7ff', padding: '6px 16px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700 }}>
              <CalendarIcon style={{ width: 18, height: 18 }} /> สิงหาคม - ตุลาคม
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>ยื่นคำร้องขอฝึกงาน</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>นักศึกษาเริ่มกรอกข้อมูลคำร้องขอฝึกงานผ่านระบบออนไลน์ และตรวจสอบความถูกต้อง</p>
          </div>
          <div className="step-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start', textAlign: 'left', padding: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#d97706', background: '#fef3c7', padding: '6px 16px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700 }}>
              <CalendarIcon style={{ width: 18, height: 18 }} /> พฤศจิกายน
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>ประกาศผล & ปฐมนิเทศ</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>ตรวจสอบผลการอนุมัติสถานประกอบการ และเข้าร่วมปฐมนิเทศเตรียมความพร้อม</p>
          </div>
          <div className="step-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start', textAlign: 'left', padding: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#16a34a', background: '#dcfce7', padding: '6px 16px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700 }}>
              <CalendarIcon style={{ width: 18, height: 18 }} /> ธันวาคม - มีนาคม
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>เริ่มปฏิบัติงานจริง</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>นักศึกษาออกฝึกประสบการณ์วิชาชีพ ณ สถานประกอบการ พร้อมบันทึกเวลาเข้า-ออกงาน</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; 2026 ระบบคำร้องฝึกงานวิชาชีพ. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;

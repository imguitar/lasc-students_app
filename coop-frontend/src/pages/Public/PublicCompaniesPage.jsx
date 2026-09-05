import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar,
} from '@mui/material';
import api from '../../api/axios';
import logo from '../../assets/LASC-SSKRU-1.png';
import {
  BuildingOffice2Icon,
  MapPinIcon,
  BriefcaseIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  XMarkIcon,
  ArrowLeftIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

const ALL_DEPARTMENTS = [
  'สาขาวิชาวิทยาการคอมพิวเตอร์',
  'สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล',
  'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์',
  'สาขาวิชาสาธารณสุขชุมชน',
  'สาขาวิชาอาชีวอนามัยและความปลอดภัย',
  'สาขาวิชาวิทยาศาสตร์การกีฬา',
  'สาขาวิชาเทคโนโลยีการเกษตร',
  'สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร',
  'สาขาวิชาวิศวกรรมโลจิสติกส์',
  'สาขาวิชาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม',
  'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ',
  'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม',
];

const SHORT_DEPT_LABELS = {
  'สาขาวิชาวิทยาการคอมพิวเตอร์': 'วิทยาการคอมพิวเตอร์',
  'สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล': 'เทคโนโลยีคอมฯ',
  'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์': 'วิศวกรรมซอฟต์แวร์ / AI',
  'สาขาวิชาสาธารณสุขชุมชน': 'สาธารณสุขชุมชน',
  'สาขาวิชาอาชีวอนามัยและความปลอดภัย': 'อาชีวอนามัยฯ',
  'สาขาวิชาวิทยาศาสตร์การกีฬา': 'วิทย์การกีฬา',
  'สาขาวิชาเทคโนโลยีการเกษตร': 'เทคโนโลยีการเกษตร',
  'สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร': 'นวัตกรรมอาหาร',
  'สาขาวิชาวิศวกรรมโลจิสติกส์': 'วิศวกรรมโลจิสติกส์',
  'สาขาวิชาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม': 'วิศวกรรมอุตสาหการฯ',
  'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ': 'การออกแบบผลิตภัณฑ์ฯ',
  'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม': 'เทคโนโลยีโยธาฯ',
};

const PublicCompaniesPage = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCompanyModal, setSelectedCompanyModal] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get('/public/companies')
      .then((res) => {
        setCompanies(res.data.data || []);
      })
      .catch((err) => {
        console.error('Failed to load companies:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Unique lists for filters
  const departmentsList = useMemo(() => {
    const set = new Set(ALL_DEPARTMENTS);
    companies.forEach((c) => {
      if (Array.isArray(c.departments)) {
        c.departments.forEach((d) => {
          if (d && d.trim()) set.add(d.trim());
        });
      } else if (c.department && c.department.trim()) {
        c.department.split(',').forEach((d) => {
          if (d.trim()) set.add(d.trim());
        });
      }
    });
    return Array.from(set);
  }, [companies]);

  const provincesList = useMemo(() => {
    const set = new Set();
    companies.forEach((c) => {
      if (c.province && c.province.trim()) set.add(c.province.trim());
    });
    return Array.from(set).sort();
  }, [companies]);

  const businessTypesList = useMemo(() => {
    const set = new Set();
    companies.forEach((c) => {
      if (c.businessType && c.businessType.trim()) set.add(c.businessType.trim());
    });
    return Array.from(set).sort();
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const s = searchTerm.toLowerCase().trim();
      const matchSearch =
        !s ||
        c.name?.toLowerCase().includes(s) ||
        c.businessType?.toLowerCase().includes(s) ||
        c.positions?.toLowerCase().includes(s) ||
        c.address?.toLowerCase().includes(s) ||
        c.province?.toLowerCase().includes(s) ||
        c.department?.toLowerCase().includes(s);

      const matchProvince =
        selectedProvince === 'all' ||
        (c.province && c.province.includes(selectedProvince)) ||
        (c.address && c.address.includes(selectedProvince));

      const matchType = selectedType === 'all' || c.businessType === selectedType;

      let matchDept = selectedDepartment === 'all';
      if (!matchDept) {
        if (Array.isArray(c.departments) && c.departments.includes(selectedDepartment)) {
          matchDept = true;
        } else if (c.department && c.department.includes(selectedDepartment)) {
          matchDept = true;
        }
      }

      return matchSearch && matchProvince && matchType && matchDept;
    });
  }, [companies, searchTerm, selectedProvince, selectedType, selectedDepartment]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <AppBar position="sticky" elevation={0} sx={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
        <Toolbar sx={{ maxWidth: 1280, width: '100%', mx: 'auto', px: { xs: 2, md: 4 }, display: 'flex', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <img src={logo} alt="LASC Logo" style={{ height: 42, objectFit: 'contain' }} />
          </Link>

          <Button
            component={Link}
            to="/"
            variant="outlined"
            size="small"
            startIcon={<ArrowLeftIcon style={{ width: 16, height: 16 }} />}
            sx={{
              borderRadius: '20px',
              textTransform: 'none',
              fontWeight: 700,
              color: '#111111',
              borderColor: '#111111',
              '&:hover': { borderColor: '#d97706', color: '#d97706', bgcolor: '#fffbeb' },
            }}
          >
            กลับหน้าแรก
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero Header Banner - Black & Gold Theme */}
      <Box sx={{ background: 'linear-gradient(135deg, #111111 0%, #1c1917 100%)', color: '#ffffff', py: { xs: 5, md: 7 }, px: { xs: 2, md: 4 }, borderBottom: '4px solid #f59e0b' }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#fbbf24', background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '6px 16px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700, marginBottom: 16 }}>
            <BuildingOffice2Icon style={{ width: 18, height: 18 }} /> รายชื่อสถานที่ฝึกงาน
          </div>
          <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '1.85rem', md: '2.5rem' }, mb: 1.5, letterSpacing: '-0.5px', color: '#ffffff' }}>
            สถานประกอบการแนะนำ<span style={{ color: '#fbbf24' }}>จากรุ่นพี่</span>
          </Typography>
          <Typography variant="body1" sx={{ color: '#d1d5db', maxWidth: 680, mx: 'auto', fontSize: { xs: '0.95rem', md: '1.05rem' }, lineHeight: 1.6 }}>
            รวบรวมข้อมูลสถานประกอบการและสถานที่ฝึกงานจริงจากรุ่นพี่ที่สำเร็จการฝึกประสบการณ์วิชาชีพ แยกตามสาขาวิชา เพื่อให้นักศึกษาใช้เป็นข้อมูลประกอบการตัดสินใจและติดต่อขอฝึกงาน
          </Typography>
        </Box>
      </Box>

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Filter Bar */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff', mb: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Top Filter Controls */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="ค้นหาชื่อบริษัท, ตำแหน่งงาน, หรือที่อยู่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <MagnifyingGlassIcon style={{ width: 18, height: 18, color: '#94a3b8', marginRight: 8 }} />,
              }}
              sx={{ flex: '1 1 240px', minWidth: { xs: '100%', sm: 220 } }}
            />

            {/* Department / Major Filter */}
            <TextField
              select
              size="small"
              label="สาขาวิชา"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              sx={{ flex: '1 1 240px', minWidth: { xs: '100%', sm: 220 } }}
            >
              <MenuItem value="all">ทุกสาขาวิชา ({departmentsList.length} สาขา)</MenuItem>
              {departmentsList.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </TextField>

            {/* Province Filter */}
            <TextField
              select
              size="small"
              label="จังหวัด"
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              sx={{ flex: '0 1 180px', minWidth: { xs: '100%', sm: 160 } }}
            >
              <MenuItem value="all">ทุกจังหวัด ({provincesList.length})</MenuItem>
              {provincesList.map((prov) => (
                <MenuItem key={prov} value={prov}>{prov}</MenuItem>
              ))}
            </TextField>

            {/* Business Type Filter */}
            <TextField
              select
              size="small"
              label="ประเภทธุรกิจ"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              sx={{ flex: '0 1 180px', minWidth: { xs: '100%', sm: 160 } }}
            >
              <MenuItem value="all">ทุกประเภท ({businessTypesList.length})</MenuItem>
              {businessTypesList.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Quick Department Chips */}
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center', pt: 1.5, borderTop: '1px solid #f1f5f9' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', mr: 0.5, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <AcademicCapIcon style={{ width: 15, height: 15, color: '#d97706' }} /> สาขาวิชา:
            </Typography>
            <Chip
              label="ทั้งหมด"
              clickable
              onClick={() => setSelectedDepartment('all')}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: '0.75rem',
                bgcolor: selectedDepartment === 'all' ? '#111111' : '#f8fafc',
                color: selectedDepartment === 'all' ? '#fbbf24' : '#64748b',
                border: selectedDepartment === 'all' ? '1px solid #111111' : '1px solid #e2e8f0',
                '&:hover': { bgcolor: selectedDepartment === 'all' ? '#1c1917' : '#e2e8f0' },
              }}
            />
            {ALL_DEPARTMENTS.map((dept) => {
              const isActive = selectedDepartment === dept;
              const shortName = SHORT_DEPT_LABELS[dept] || dept.replace('สาขาวิชา', '');
              return (
                <Chip
                  key={dept}
                  label={shortName}
                  clickable
                  onClick={() => setSelectedDepartment(dept)}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    bgcolor: isActive ? '#f59e0b' : '#f8fafc',
                    color: isActive ? '#111111' : '#475569',
                    border: isActive ? '1px solid #d97706' : '1px solid #e2e8f0',
                    '&:hover': {
                      bgcolor: isActive ? '#d97706' : '#e2e8f0',
                      color: isActive ? '#ffffff' : '#1e293b',
                    },
                  }}
                />
              );
            })}
          </Box>

          {/* Quick Province Chips */}
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center', pt: 1, borderTop: '1px dashed #f1f5f9' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', mr: 0.5, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <MapPinIcon style={{ width: 14, height: 14, color: '#ef4444' }} /> จังหวัดยอดนิยม:
            </Typography>
            {['all', 'ศรีสะเกษ', 'อุบลราชธานี', 'กรุงเทพมหานคร', 'สุรินทร์', 'ขอนแก่น'].map((prov) => {
              const isActive = selectedProvince === prov;
              return (
                <Chip
                  key={prov}
                  label={prov === 'all' ? 'ทั้งหมด' : prov}
                  clickable
                  onClick={() => setSelectedProvince(prov)}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    bgcolor: isActive ? '#1e293b' : '#f8fafc',
                    color: isActive ? '#ffffff' : '#64748b',
                    border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                    '&:hover': {
                      bgcolor: isActive ? '#0f172a' : '#e2e8f0',
                    },
                  }}
                />
              );
            })}
          </Box>
        </Paper>

        {/* Results Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#111111' }}>
            พบ <span style={{ color: '#d97706' }}>{filteredCompanies.length}</span> สถานประกอบการ
          </Typography>
        </Box>

        {/* Grid of Company Cards */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 8, color: '#64748b' }}>
            <Typography variant="body1">กำลังโหลดข้อมูลสถานประกอบการ...</Typography>
          </Box>
        ) : filteredCompanies.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredCompanies.map((comp, idx) => (
              <div
                key={comp.id || idx}
                onClick={() => setSelectedCompanyModal(comp)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 14px 28px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = '#f59e0b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                {/* Top Row: Icon & Tag */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(217, 119, 6, 0.1)',
                    }}
                  >
                    <BuildingOffice2Icon style={{ width: 26, height: 26 }} />
                  </div>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: comp.isOfficial ? '#ecfdf5' : '#eff6ff',
                      color: comp.isOfficial ? '#065f46' : '#1e40af',
                      border: comp.isOfficial ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
                    }}
                  >
                    {comp.isOfficial ? 'เปิดรับทางการ' : 'จากรุ่นพี่'}
                  </span>
                </div>

                {/* Company Name */}
                <h3
                  style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#111111',
                    lineHeight: 1.35,
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {comp.name}
                </h3>

                {/* Business Type */}
                <p
                  style={{
                    margin: '0 0 1rem 0',
                    fontSize: '0.85rem',
                    color: '#64748b',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {comp.businessType || 'ไม่ระบุประเภทธุรกิจ'}
                </p>

                {/* Meta info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: '#475569', marginBottom: '1.25rem', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPinIcon style={{ width: 16, height: 16, color: '#ef4444', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {comp.province || (comp.address ? comp.address.slice(0, 30) : 'ประเทศไทย')}
                    </span>
                  </div>

                  {/* Associated Department(s) */}
                  {((Array.isArray(comp.departments) && comp.departments.length > 0) || comp.department) && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <AcademicCapIcon style={{ width: 16, height: 16, color: '#0284c7', flexShrink: 0, marginTop: 2 }} />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, overflow: 'hidden' }}>
                        {(Array.isArray(comp.departments) && comp.departments.length > 0
                          ? comp.departments
                          : comp.department.split(',').map(s => s.trim())
                        ).slice(0, 2).map((dept, dIdx) => (
                          <span
                            key={dIdx}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: '#f0f9ff',
                              color: '#0369a1',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid #bae6fd',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {SHORT_DEPT_LABELS[dept] || dept.replace('สาขาวิชา', '')}
                          </span>
                        ))}
                        {(Array.isArray(comp.departments) ? comp.departments.length : comp.department.split(',').length) > 2 && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', alignSelf: 'center' }}>
                            +{(Array.isArray(comp.departments) ? comp.departments.length : comp.department.split(',').length) - 2} สาขา
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {comp.positions && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BriefcaseIcon style={{ width: 16, height: 16, color: '#d97706', flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#d97706', fontWeight: 600 }}>
                        {comp.positions}
                      </span>
                    </div>
                  )}

                  {comp.benefits && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <SparklesIcon style={{ width: 16, height: 16, color: '#b45309', flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#b45309', fontWeight: 600 }}>
                        {comp.benefits}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111111' }}>
                    ดูข้อมูลและติดต่อ &rarr;
                  </span>
                  {comp.phone && (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {comp.phone}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8, bgcolor: '#ffffff', borderRadius: 3, border: '1px dashed #cbd5e1' }}>
            <BuildingOffice2Icon style={{ width: 50, height: 50, color: '#94a3b8', margin: '0 auto 12px auto' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155', mb: 0.5 }}>
              ไม่พบสถานประกอบการที่ตรงกับเงื่อนไขการค้นหา
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองสาขาวิชาและจังหวัดอื่นๆ
            </Typography>
          </Box>
        )}
      </main>

      {/* Company Detail Modal */}
      <Dialog
        open={Boolean(selectedCompanyModal)}
        onClose={() => setSelectedCompanyModal(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 0.5 } }}
      >
        {selectedCompanyModal && (
          <>
            <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pb: 1 }}>
              <div>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip
                    label={selectedCompanyModal.isOfficial ? 'สถานประกอบการทางการ' : 'จากรุ่นพี่ที่ฝึกงานเสร็จแล้ว'}
                    size="small"
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      bgcolor: selectedCompanyModal.isOfficial ? '#ecfdf5' : '#eff6ff',
                      color: selectedCompanyModal.isOfficial ? '#065f46' : '#1e40af',
                    }}
                  />
                  {selectedCompanyModal.province && (
                    <Chip label={selectedCompanyModal.province} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                  )}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                  {selectedCompanyModal.name}
                </Typography>
              </div>
              <IconButton onClick={() => setSelectedCompanyModal(null)} size="small">
                <XMarkIcon style={{ width: 20, height: 20 }} />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Associated Department(s) in Modal */}
              {((Array.isArray(selectedCompanyModal.departments) && selectedCompanyModal.departments.length > 0) || selectedCompanyModal.department) && (
                <Box sx={{ bgcolor: '#f0f9ff', border: '1px solid #bae6fd', p: 1.5, borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                    <AcademicCapIcon style={{ width: 16, height: 16 }} /> สาขาวิชาที่เกี่ยวข้อง / รุ่นพี่ที่เคยฝึกงาน
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {(Array.isArray(selectedCompanyModal.departments) && selectedCompanyModal.departments.length > 0
                      ? selectedCompanyModal.departments
                      : selectedCompanyModal.department.split(',').map(s => s.trim())
                    ).map((dept, dIdx) => (
                      <Chip
                        key={dIdx}
                        label={dept}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          bgcolor: '#ffffff',
                          color: '#0284c7',
                          border: '1px solid #7dd3fc',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {selectedCompanyModal.businessType && (
                <Box sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
                    ประเภทธุรกิจ / ลักษณะงาน
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                    {selectedCompanyModal.businessType}
                  </Typography>
                </Box>
              )}

              {selectedCompanyModal.positions && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.5 }}>
                    ตำแหน่งงานที่เปิดรับ
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#d97706', fontWeight: 700 }}>
                    <BriefcaseIcon style={{ width: 18, height: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#d97706' }}>
                      {selectedCompanyModal.positions}
                    </Typography>
                  </Box>
                </Box>
              )}

              {selectedCompanyModal.benefits && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.5 }}>
                    สวัสดิการ / เบี้ยเลี้ยง
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#b45309', fontWeight: 700 }}>
                    <SparklesIcon style={{ width: 18, height: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#b45309' }}>
                      {selectedCompanyModal.benefits}
                    </Typography>
                  </Box>
                </Box>
              )}

              {selectedCompanyModal.address && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.5 }}>
                    ที่ตั้งสถานประกอบการ
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, color: '#334155' }}>
                    <MapPinIcon style={{ width: 18, height: 18, color: '#ef4444', flexShrink: 0, mt: 0.2 }} />
                    <Typography variant="body2">
                      {selectedCompanyModal.address} {selectedCompanyModal.province ? `จ.${selectedCompanyModal.province}` : ''}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Contact Info Box - Warm Amber & Dark */}
              <Box sx={{ bgcolor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 2.5, p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#92400e', mb: 1 }}>
                  ข้อมูลการติดต่อ
                </Typography>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
                  {selectedCompanyModal.contactPerson && (
                    <div style={{ color: '#334155' }}>
                      <strong>ผู้ประสานงาน:</strong> {selectedCompanyModal.contactPerson}
                    </div>
                  )}
                  {selectedCompanyModal.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <PhoneIcon style={{ width: 16, height: 16, color: '#b45309' }} />
                      <a href={`tel:${selectedCompanyModal.phone}`} style={{ color: '#b45309', fontWeight: 700, textDecoration: 'none' }}>
                        {selectedCompanyModal.phone} (โทรออก)
                      </a>
                    </div>
                  )}
                  {selectedCompanyModal.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <EnvelopeIcon style={{ width: 16, height: 16, color: '#b45309' }} />
                      <a href={`mailto:${selectedCompanyModal.email}`} style={{ color: '#b45309', fontWeight: 700, textDecoration: 'none' }}>
                        {selectedCompanyModal.email}
                      </a>
                    </div>
                  )}
                  {selectedCompanyModal.website && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <GlobeAltIcon style={{ width: 16, height: 16, color: '#b45309' }} />
                      <a
                        href={selectedCompanyModal.website.startsWith('http') ? selectedCompanyModal.website : `https://${selectedCompanyModal.website}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#d97706', fontWeight: 700, textDecoration: 'underline' }}
                      >
                        เยี่ยมชมเว็บไซต์
                      </a>
                    </div>
                  )}
                </div>
              </Box>

              {selectedCompanyModal.note && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.5 }}>
                    หมายเหตุเพิ่มเติม
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    {selectedCompanyModal.note}
                  </Typography>
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid #f1f5f9' }}>
              <Button
                onClick={() => setSelectedCompanyModal(null)}
                fullWidth
                variant="contained"
                sx={{
                  bgcolor: '#111111',
                  color: '#fbbf24',
                  fontWeight: 700,
                  borderRadius: 2,
                  py: 1,
                  '&:hover': {
                    bgcolor: '#d97706',
                    color: '#ffffff'
                  }
                }}
              >
                ปิดหน้าต่าง
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Footer */}
      <footer className="footer" style={{ marginTop: 'auto' }}>
        <p>&copy; 2026 ระบบคำร้องฝึกงานวิชาชีพ. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default PublicCompaniesPage;

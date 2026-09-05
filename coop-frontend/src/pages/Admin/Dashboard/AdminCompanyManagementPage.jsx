import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import api from '../../../api/axios';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import {
  BuildingOffice2Icon,
  PlusIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  BriefcaseIcon,
  SparklesIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Tooltip,
  Checkbox,
  Typography,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import './AdminDashboardPage.css';

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

// Function to parse CSV text into array of objects
const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Helper to split a CSV line respecting quotes
  const splitLine = (str) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim().replace(/^["']|["']$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim().replace(/^["']|["']$/g, ''));
    return result;
  };

  const headers = splitLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || '';
    });

    // Map common header variations to standard English keys
    const name = rowObj['ชื่อสถานประกอบการ'] || rowObj['ชื่อบริษัท'] || rowObj['name'] || rowObj['Company Name'] || values[0] || '';
    if (name) {
      rows.push({
        name,
        businessType: rowObj['ประเภทธุรกิจ'] || rowObj['ลักษณะงาน'] || rowObj['businessType'] || rowObj['Type'] || values[1] || '',
        address: rowObj['ที่อยู่'] || rowObj['address'] || rowObj['Address'] || values[2] || '',
        province: rowObj['จังหวัด'] || rowObj['province'] || rowObj['Province'] || values[3] || '',
        department: rowObj['สาขาวิชา'] || rowObj['สาขา'] || rowObj['department'] || rowObj['departments'] || values[4] || '',
        contactPerson: rowObj['ผู้ติดต่อ'] || rowObj['ผู้ประสานงาน'] || rowObj['contactPerson'] || rowObj['Contact'] || values[5] || '',
        phone: rowObj['เบอร์โทร'] || rowObj['เบอร์โทรศัพท์'] || rowObj['phone'] || rowObj['Phone'] || values[6] || '',
        email: rowObj['อีเมล'] || rowObj['email'] || rowObj['Email'] || values[7] || '',
        website: rowObj['เว็บไซต์'] || rowObj['website'] || rowObj['Website'] || values[8] || '',
        positions: rowObj['ตำแหน่งที่รับ'] || rowObj['ตำแหน่งที่เปิดรับ'] || rowObj['ตำแหน่งงาน'] || rowObj['positions'] || values[9] || '',
        benefits: rowObj['สวัสดิการ'] || rowObj['benefits'] || values[10] || '',
        note: rowObj['หมายเหตุ'] || rowObj['note'] || values[11] || '',
      });
    }
  }

  return rows;
};

const AdminCompanyManagementPage = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [importModal, setImportModal] = useState({
    open: false,
    file: null,
    fileName: '',
    parsedRows: [],
    submitting: false,
  });

  const [formModal, setFormModal] = useState({
    open: false,
    isEdit: false,
    id: null,
    form: {
      name: '',
      businessType: '',
      address: '',
      province: '',
      department: '',
      contactPerson: '',
      phone: '',
      email: '',
      website: '',
      positions: '',
      benefits: '',
      note: '',
    },
    submitting: false,
  });

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    targetIds: [],
    targetNames: [],
    submitting: false,
  });

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const fileInputRef = useRef(null);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/public/companies');
      setCompanies(res.data.data || []);
    } catch (err) {
      console.error('Failed to load companies:', err);
      setToast({ open: true, message: 'ไม่สามารถโหลดข้อมูลสถานประกอบการได้', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role !== 'admin') {
        navigate('/dashboard');
        return;
      }
    } else {
      navigate('/login');
      return;
    }

    fetchCompanies();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  // Filtered companies
  const departmentsList = useMemo(() => {
    const set = new Set(ALL_DEPARTMENTS);
    companies.forEach(c => {
      if (Array.isArray(c.departments)) {
        c.departments.forEach(d => { if (d && d.trim()) set.add(d.trim()); });
      } else if (c.department && c.department.trim()) {
        c.department.split(',').forEach(d => { if (d.trim()) set.add(d.trim()); });
      }
    });
    return Array.from(set);
  }, [companies]);

  const provincesList = useMemo(() => {
    const set = new Set();
    companies.forEach(c => {
      if (c.province && c.province.trim()) set.add(c.province.trim());
    });
    return Array.from(set).sort();
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const s = searchTerm.toLowerCase().trim();
      const matchSearch = !s || 
        c.name?.toLowerCase().includes(s) || 
        c.businessType?.toLowerCase().includes(s) || 
        c.positions?.toLowerCase().includes(s) || 
        c.address?.toLowerCase().includes(s) || 
        c.province?.toLowerCase().includes(s) ||
        c.department?.toLowerCase().includes(s);
      
      const matchProvince = selectedProvince === 'all' || c.province === selectedProvince;

      let matchDept = selectedDepartment === 'all';
      if (!matchDept) {
        if (Array.isArray(c.departments) && c.departments.includes(selectedDepartment)) {
          matchDept = true;
        } else if (c.department && c.department.includes(selectedDepartment)) {
          matchDept = true;
        }
      }

      return matchSearch && matchProvince && matchDept;
    });
  }, [companies, searchTerm, selectedProvince, selectedDepartment]);

  // Checkbox selection
  const isAllSelected = useMemo(() => {
    const officialCompanies = filteredCompanies.filter(c => c.isOfficial);
    if (officialCompanies.length === 0) return false;
    return officialCompanies.every(c => selectedIds.includes(c.id));
  }, [filteredCompanies, selectedIds]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const ids = filteredCompanies.filter(c => c.isOfficial).map(c => c.id);
      setSelectedIds(ids);
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // CSV Template Download
  const handleDownloadSampleCSV = () => {
    const csvContent = "\uFEFF" + 
      "ชื่อสถานประกอบการ,ประเภทธุรกิจ,ที่อยู่,จังหวัด,สาขาวิชา,ผู้ติดต่อ,เบอร์โทร,อีเมล,เว็บไซต์,ตำแหน่งที่รับฝึกงาน,สวัสดิการ,หมายเหตุ\n" +
      "บริษัท ไอที โซลูชั่นส์ จำกัด,พัฒนาซอฟต์แวร์และไอที,123/45 ถ.วิภาวดีรังสิต,กรุงเทพมหานคร,สาขาวิชาวิทยาการคอมพิวเตอร์,คุณสมชาย ใจดี,02-123-4567,hr@itsolutions.co.th,https://itsolutions.co.th,Software Engineer / Web Developer,มีเบี้ยเลี้ยงรายวัน / มีโน้ตบุ๊กให้,เปิดรับตลอดทั้งปี\n" +
      "ศูนย์เทคโนโลยีศรีสะเกษ,บริการดิจิทัลและเน็ตเวิร์ก,99 หมู่ 2 ต.หนองครก,ศรีสะเกษ,สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล,คุณวิภาดา มั่นคง,045-678-901,contact@ssktech.go.th,,Network Admin / Graphic Design,มีอาหารกลางวัน,รับสมัครเทอม 2";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ตัวอย่างไฟล์นำเข้าสถานประกอบการ_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle File Upload for CSV
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setToast({ open: true, message: 'ไม่พบข้อมูลในไฟล์ CSV หรือรูปแบบไฟล์ไม่ถูกต้อง', severity: 'error' });
        return;
      }
      setImportModal(prev => ({
        ...prev,
        file,
        fileName: file.name,
        parsedRows: parsed
      }));
    };
    reader.readAsText(file, 'utf-8');
  };

  // Submit CSV Import
  const handleConfirmImport = async () => {
    if (importModal.parsedRows.length === 0) return;
    setImportModal(prev => ({ ...prev, submitting: true }));
    try {
      const res = await api.post('/public/companies/import', { companies: importModal.parsedRows });
      setToast({ open: true, message: res.data.message || 'นำเข้าข้อมูลสถานประกอบการสำเร็จ', severity: 'success' });
      setImportModal({ open: false, file: null, fileName: '', parsedRows: [], submitting: false });
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchCompanies();
    } catch (err) {
      console.error('Import error:', err);
      setToast({ open: true, message: err.response?.data?.message || 'เกิดข้อผิดพลาดในการนำเข้า', severity: 'error' });
      setImportModal(prev => ({ ...prev, submitting: false }));
    }
  };

  // Manual Add / Edit
  const handleOpenAdd = () => {
    setFormModal({
      open: true,
      isEdit: false,
      id: null,
      form: {
        name: '',
        businessType: '',
        address: '',
        province: '',
        department: '',
        contactPerson: '',
        phone: '',
        email: '',
        website: '',
        positions: '',
        benefits: '',
        note: '',
      },
      submitting: false,
    });
  };

  const handleOpenEdit = (comp) => {
    setFormModal({
      open: true,
      isEdit: true,
      id: comp.id,
      form: {
        name: comp.name || '',
        businessType: comp.businessType || '',
        address: comp.address || '',
        province: comp.province || '',
        department: comp.department || (Array.isArray(comp.departments) ? comp.departments.join(', ') : ''),
        contactPerson: comp.contactPerson || '',
        phone: comp.phone || '',
        email: comp.email || '',
        website: comp.website || '',
        positions: comp.positions || '',
        benefits: comp.benefits || '',
        note: comp.note || '',
      },
      submitting: false,
    });
  };

  const handleSaveForm = async () => {
    if (!formModal.form.name.trim()) {
      alert('กรุณากรอกชื่อสถานประกอบการ');
      return;
    }
    setFormModal(prev => ({ ...prev, submitting: true }));
    try {
      if (formModal.isEdit) {
        await api.put(`/public/companies/${formModal.id}`, formModal.form);
        setToast({ open: true, message: 'อัปเดตข้อมูลสถานประกอบการสำเร็จ', severity: 'success' });
      } else {
        await api.post('/public/companies', formModal.form);
        setToast({ open: true, message: 'เพิ่มสถานประกอบการเรียบร้อยแล้ว', severity: 'success' });
      }
      setFormModal(prev => ({ ...prev, open: false, submitting: false }));
      fetchCompanies();
    } catch (err) {
      console.error('Save form error:', err);
      setToast({ open: true, message: err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก', severity: 'error' });
      setFormModal(prev => ({ ...prev, submitting: false }));
    }
  };

  // Delete Handlers
  const handleOpenDeleteSingle = (comp) => {
    setDeleteModal({
      open: true,
      targetIds: [comp.id],
      targetNames: [comp.name],
      submitting: false,
    });
  };

  const handleOpenDeleteBatch = () => {
    const names = companies.filter(c => selectedIds.includes(c.id)).map(c => c.name);
    setDeleteModal({
      open: true,
      targetIds: selectedIds,
      targetNames: names,
      submitting: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.targetIds.length === 0) return;
    setDeleteModal(prev => ({ ...prev, submitting: true }));
    try {
      if (deleteModal.targetIds.length === 1) {
        await api.delete(`/public/companies/${deleteModal.targetIds[0]}`);
      } else {
        await api.post('/public/companies/batch-delete', { ids: deleteModal.targetIds });
      }
      setToast({ open: true, message: 'ลบสถานประกอบการเรียบร้อยแล้ว', severity: 'success' });
      setDeleteModal({ open: false, targetIds: [], targetNames: [], submitting: false });
      setSelectedIds([]);
      fetchCompanies();
    } catch (err) {
      console.error('Delete error:', err);
      setToast({ open: true, message: err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบ', severity: 'error' });
      setDeleteModal(prev => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div className="admin-dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home">
          <img src={lascLogo} alt="LASC Logo" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '8px' }}>
          <UserProfileMenu />
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
        </div>
      </div>

      <AdminSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/admin-dashboard/companies"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>จัดการสถานประกอบการ</h1>
            <p>จัดการและนำเข้าแคตตาล็อกสถานประกอบการที่เปิดรับนักศึกษาฝึกงาน</p>
          </div>
        </header>

        <div className="content-section">
          {/* Header Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                สถานประกอบการทั้งหมด ({filteredCompanies.length})
              </h2>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                รวมสถานประกอบการทางการและสถานที่ฝึกงานจากรุ่นพี่
              </span>
            </div>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={() => setImportModal({ open: true, file: null, fileName: '', parsedRows: [], submitting: false })}
                startIcon={<ArrowUpTrayIcon style={{ width: 18, height: 18 }} />}
                sx={{
                  bgcolor: '#0284c7',
                  '&:hover': { bgcolor: '#0369a1' },
                  borderRadius: 2,
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 2,
                  py: 0.85
                }}
              >
                Import CSV สถานประกอบการ
              </Button>

              <Button
                variant="contained"
                onClick={handleOpenAdd}
                startIcon={<PlusIcon style={{ width: 18, height: 18 }} />}
                sx={{
                  bgcolor: '#be185d',
                  '&:hover': { bgcolor: '#9d174d' },
                  borderRadius: 2,
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 2,
                  py: 0.85
                }}
              >
                เพิ่มสถานประกอบการ
              </Button>

              {selectedIds.length > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleOpenDeleteBatch}
                  startIcon={<TrashIcon style={{ width: 18, height: 18 }} />}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 2,
                    py: 0.85
                  }}
                >
                  ลบที่เลือก ({selectedIds.length})
                </Button>
              )}
            </Box>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <TextField
              size="small"
              placeholder="ค้นหาชื่อบริษัท, ตำแหน่งงาน, หรือที่อยู่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <MagnifyingGlassIcon style={{ width: 18, height: 18, color: '#94a3b8', marginRight: 8 }} />
              }}
              sx={{ minWidth: { xs: '100%', sm: 260 }, flex: 1, bgcolor: '#ffffff' }}
            />

            <TextField
              select
              size="small"
              label="สาขาวิชา"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              sx={{ minWidth: 200, bgcolor: '#ffffff' }}
            >
              <MenuItem value="all">ทุกสาขาวิชา ({departmentsList.length} สาขา)</MenuItem>
              {departmentsList.map(dept => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="จังหวัด"
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              sx={{ minWidth: 160, bgcolor: '#ffffff' }}
            >
              <MenuItem value="all">ทุกจังหวัด ({provincesList.length})</MenuItem>
              {provincesList.map(prov => (
                <MenuItem key={prov} value={prov}>{prov}</MenuItem>
              ))}
            </TextField>
          </div>

          {/* Table */}
          <TableContainer component={Box} className="compact-table" sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            {loading ? (
              <p style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>กำลังโหลดข้อมูลสถานประกอบการ...</p>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isAllSelected}
                        indeterminate={selectedIds.length > 0 && !isAllSelected}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>ชื่อสถานประกอบการ / บริษัท</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>สาขาวิชาที่เกี่ยวข้อง</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>ประเภทธุรกิจ</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>ที่ตั้ง / จังหวัด</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>ตำแหน่งที่เปิดรับ</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>ข้อมูลติดต่อ</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>แหล่งข้อมูล</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>การกระทำ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCompanies.length > 0 ? (
                    filteredCompanies.map((comp, idx) => {
                      const isChecked = selectedIds.includes(comp.id);
                      return (
                        <TableRow key={comp.id || idx} hover selected={isChecked}>
                          <TableCell padding="checkbox">
                            {comp.isOfficial ? (
                              <Checkbox
                                checked={isChecked}
                                onChange={() => handleToggleSelect(comp.id)}
                              />
                            ) : (
                              <Typography variant="caption" sx={{ color: '#cbd5e1', pl: 1 }}>-</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                {comp.name}
                              </Typography>
                              {comp.website && (
                                <a 
                                  href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{ fontSize: '0.75rem', color: '#0284c7', textDecoration: 'none' }}
                                >
                                  {comp.website}
                                </a>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {((Array.isArray(comp.departments) && comp.departments.length > 0) || comp.department) ? (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 220 }}>
                                {(Array.isArray(comp.departments) && comp.departments.length > 0
                                  ? comp.departments
                                  : comp.department.split(',').map(s => s.trim())
                                ).map((d, dIdx) => (
                                  <Chip
                                    key={dIdx}
                                    label={d.replace('สาขาวิชา', '')}
                                    size="small"
                                    sx={{ fontSize: '0.7rem', bgcolor: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', fontWeight: 600 }}
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>ทุกสาขาวิชา</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={comp.businessType || 'ทั่วไป'} 
                              size="small" 
                              sx={{ fontSize: '0.72rem', bgcolor: '#f1f5f9', color: '#334155', fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#475569' }}>
                              <MapPinIcon style={{ width: 15, height: 15, color: '#ef4444', flexShrink: 0 }} />
                              <Typography variant="caption">
                                {comp.province ? `${comp.province} ` : ''}{comp.address ? `(${comp.address.slice(0, 30)}...)` : '-'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#0284c7' }}>
                              {comp.positions || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, fontSize: '0.75rem', color: '#64748b' }}>
                              {comp.contactPerson && <span>ผู้ติดต่อ: {comp.contactPerson}</span>}
                              {comp.phone && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <PhoneIcon style={{ width: 12, height: 12 }} /> {comp.phone}
                                </span>
                              )}
                              {comp.email && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <EnvelopeIcon style={{ width: 12, height: 12 }} /> {comp.email}
                                </span>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={comp.isOfficial ? 'สถานประกอบการทางการ' : 'จากรุ่นพี่'} 
                              size="small"
                              sx={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                bgcolor: comp.isOfficial ? '#ecfdf5' : '#eff6ff',
                                color: comp.isOfficial ? '#065f46' : '#1e40af',
                                border: comp.isOfficial ? '1px solid #a7f3d0' : '1px solid #bfdbfe'
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {comp.isOfficial ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                <Tooltip title="แก้ไข">
                                  <IconButton size="small" onClick={() => handleOpenEdit(comp)} sx={{ color: '#0284c7' }}>
                                    <PencilSquareIcon style={{ width: 16, height: 16 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="ลบ">
                                  <IconButton size="small" onClick={() => handleOpenDeleteSingle(comp)} sx={{ color: '#ef4444' }}>
                                    <TrashIcon style={{ width: 16, height: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ) : (
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                ระบบบันทึกอัตโนมัติ
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                        ไม่พบข้อมูลสถานประกอบการ
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </div>

        {/* Modal 1: CSV Import Dialog */}
        <Dialog 
          open={importModal.open} 
          onClose={() => !importModal.submitting && setImportModal(prev => ({ ...prev, open: false }))} 
          maxWidth="md" 
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <DocumentArrowUpIcon style={{ width: 24, height: 24, color: '#0284c7' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                นำเข้าข้อมูลสถานประกอบการผ่านไฟล์ CSV
              </Typography>
            </Box>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={handleDownloadSampleCSV}
              startIcon={<ArrowDownTrayIcon style={{ width: 16, height: 16 }} />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, borderColor: '#0284c7', color: '#0284c7' }}
            >
              ดาวน์โหลดตัวอย่างไฟล์ CSV (Template)
            </Button>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            {/* Dropzone */}
            <Box
              sx={{
                border: '2px dashed #cbd5e1',
                borderRadius: 3,
                p: 4,
                textAlign: 'center',
                bgcolor: '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: '#0284c7', bgcolor: '#f0f9ff' },
                mb: 3
              }}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".csv" 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
              />
              <ArrowUpTrayIcon style={{ width: 44, height: 44, color: '#0284c7', margin: '0 auto 12px auto' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {importModal.fileName ? `เลือกไฟล์แล้ว: ${importModal.fileName}` : 'คลิกเพื่อเลือกไฟล์ CSV หรือลากไฟล์มาวางที่นี่'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                รองรับไฟล์นามสกุล .csv (เข้ารหัส UTF-8)
              </Typography>
            </Box>

            {/* Preview Table */}
            {importModal.parsedRows.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: '#0f172a' }}>
                  ตัวอย่างข้อมูลที่จะนำเข้า ({importModal.parsedRows.length} รายการ):
                </Typography>
                <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 240, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>ชื่อสถานประกอบการ</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>สาขาวิชา</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>ประเภทธุรกิจ</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>จังหวัด</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>ตำแหน่งที่รับ</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>เบอร์โทร</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importModal.parsedRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                          <TableCell sx={{ color: '#0284c7' }}>{row.department || '-'}</TableCell>
                          <TableCell>{row.businessType || '-'}</TableCell>
                          <TableCell>{row.province || '-'}</TableCell>
                          <TableCell>{row.positions || '-'}</TableCell>
                          <TableCell>{row.phone || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 2.5, px: 3, borderTop: '1px solid #f1f5f9', justifyContent: 'space-between' }}>
            <Button onClick={() => setImportModal(prev => ({ ...prev, open: false }))} color="inherit">
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              disabled={importModal.parsedRows.length === 0 || importModal.submitting}
              onClick={handleConfirmImport}
              sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, borderRadius: 2, fontWeight: 700, px: 3 }}
            >
              {importModal.submitting ? 'กำลังนำเข้าข้อมูล...' : `ยืนยันนำเข้าข้อมูล (${importModal.parsedRows.length} รายการ)`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal 2: Add / Edit Company Dialog */}
        <Dialog 
          open={formModal.open} 
          onClose={() => !formModal.submitting && setFormModal(prev => ({ ...prev, open: false }))} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid #f1f5f9', pb: 2 }}>
            {formModal.isEdit ? 'แก้ไขข้อมูลสถานประกอบการ' : 'เพิ่มสถานประกอบการใหม่'}
          </DialogTitle>
          <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="ชื่อสถานประกอบการ / บริษัท *"
              size="small"
              fullWidth
              value={formModal.form.name}
              onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, name: e.target.value } }))}
            />
            
            <TextField
              select
              label="สาขาวิชาที่เกี่ยวข้อง / รองรับ"
              size="small"
              fullWidth
              value={formModal.form.department || ''}
              onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, department: e.target.value } }))}
              helperText="เลือกสาขาวิชาที่ตรงกับสายงานของสถานประกอบการ หรือปล่อยว่างสำหรับทุกสาขา"
            >
              <MenuItem value="">ทุกสาขาวิชา (เปิดกว้างสำหรับทุกสาขา)</MenuItem>
              {ALL_DEPARTMENTS.map(dept => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="ประเภทธุรกิจ / ลักษณะงาน"
              size="small"
              fullWidth
              value={formModal.form.businessType}
              onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, businessType: e.target.value } }))}
              placeholder="เช่น พัฒนาซอฟต์แวร์, บริการเทคโนโลยี, การตลาดดิจิทัล"
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
              <TextField
                label="ที่อยู่สถานประกอบการ"
                size="small"
                value={formModal.form.address}
                onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, address: e.target.value } }))}
              />
              <TextField
                label="จังหวัด"
                size="small"
                value={formModal.form.province}
                onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, province: e.target.value } }))}
                placeholder="เช่น ศรีสะเกษ"
              />
            </Box>
            <TextField
              label="ตำแหน่งงานที่เปิดรับฝึกงาน"
              size="small"
              fullWidth
              value={formModal.form.positions}
              onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, positions: e.target.value } }))}
              placeholder="เช่น Web Developer, Graphic Designer, IT Support"
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="ชื่อผู้ประสานงาน / ผู้ติดต่อ"
                size="small"
                value={formModal.form.contactPerson}
                onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, contactPerson: e.target.value } }))}
              />
              <TextField
                label="เบอร์โทรศัพท์"
                size="small"
                value={formModal.form.phone}
                onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, phone: e.target.value } }))}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="อีเมล"
                size="small"
                value={formModal.form.email}
                onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, email: e.target.value } }))}
              />
              <TextField
                label="เว็บไซต์"
                size="small"
                value={formModal.form.website}
                onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, website: e.target.value } }))}
                placeholder="เช่น https://example.com"
              />
            </Box>
            <TextField
              label="สวัสดิการ / เบี้ยเลี้ยง (ถ้ามี)"
              size="small"
              fullWidth
              value={formModal.form.benefits}
              onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, benefits: e.target.value } }))}
              placeholder="เช่น มีเบี้ยเลี้ยงรายวัน, มีอาหารกลางวัน"
            />
            <TextField
              label="หมายเหตุเพิ่มเติม"
              size="small"
              multiline
              rows={2}
              fullWidth
              value={formModal.form.note}
              onChange={(e) => setFormModal(prev => ({ ...prev, form: { ...prev.form, note: e.target.value } }))}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, px: 3, borderTop: '1px solid #f1f5f9', justifyContent: 'space-between' }}>
            <Button onClick={() => setFormModal(prev => ({ ...prev, open: false }))} color="inherit">
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              disabled={formModal.submitting}
              onClick={handleSaveForm}
              sx={{ bgcolor: '#be185d', '&:hover': { bgcolor: '#9d174d' }, borderRadius: 2, fontWeight: 700, px: 3 }}
            >
              {formModal.submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal 3: Delete Confirmation */}
        <Dialog 
          open={deleteModal.open} 
          onClose={() => !deleteModal.submitting && setDeleteModal(prev => ({ ...prev, open: false }))} 
          maxWidth="xs" 
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#ef4444' }}>
            ยืนยันการลบสถานประกอบการ
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: '#475569' }}>
              คุณต้องการลบสถานประกอบการจำนวน <strong>{deleteModal.targetIds.length}</strong> รายการใช่หรือไม่?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, px: 3, justifyContent: 'space-between' }}>
            <Button onClick={() => setDeleteModal(prev => ({ ...prev, open: false }))} color="inherit">
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={deleteModal.submitting}
              onClick={handleConfirmDelete}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              {deleteModal.submitting ? 'กำลังลบ...' : 'ยืนยันลบ'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notification Toast */}
        <Snackbar
          open={toast.open}
          autoHideDuration={3000}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={toast.severity} onClose={() => setToast(prev => ({ ...prev, open: false }))} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </main>
    </div>
  );
};

export default AdminCompanyManagementPage;

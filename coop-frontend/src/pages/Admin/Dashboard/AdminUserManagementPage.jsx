import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import * as XLSX from 'xlsx';
import { API_BASE } from '../../../api/axios';

const getToken = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token || '';
  } catch { return ''; }
};

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'เกิดข้อผิดพลาด');
  return data;
};
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, MenuItem, Button, Dialog, DialogTitle, DialogContent, DialogActions, Input, Checkbox, Tooltip } from '@mui/material';
import './AdminDashboardPage.css';
import './AdminUserManagementPage.css';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';

const AdminUserManagementPage = () => {
  const navigate = useNavigate();
  const departmentOptions = [
    'สาขาวิชาวิทยาการคอมพิวเตอร์',
    'สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล',
    'สาขาวิชาสาธารณสุขชุมชน',
    'สาขาวิชาวิทยาศาสตร์การกีฬา',
    'สาขาวิชาเทคโนโลยีการเกษตร',
    'สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร',
    'สาขาวิชาอาชีวอนามัยและความปลอดภัย',
    'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์',
    'สาขาวิชาวิศวกรรมโลจิสติกส์',
    'สาขาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม',
    'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ',
    'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม'
  ];
  const [users, setUsers] = useState([]);
  const [adminName, setAdminName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importMessage, setImportMessage] = useState('');
  const [uploadSummary, setUploadSummary] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    name: '',
    department: '',
    password: '',
    role: 'student',
  });

  useEffect(() => {
    const checkAdmin = async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        navigate('/login');
        return;
      }
      const user = JSON.parse(userStr);
      if (user.role !== 'admin') {
        navigate('/dashboard');
        return;
      }
      setAdminName(user.name || 'Admin');

      // Load users from API
      try {
        const data = await apiFetch('/users');
        setUsers(data.data || []);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };

    checkAdmin();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username:   user.username || '',
        email:      user.email || '',
        name:       user.full_name || user.name || '',
        department: user.department || user.major || (user.department_id ? departmentOptions[user.department_id - 1] : ''),
        password:   '',
        role:       user.role || 'student',
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        name: '',
        department: '',
        password: '',
        role: 'student',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  useEffect(() => {
    setSelectedUserIds((prev) => prev.filter((id) => users.some((u) => String(u.id) === String(id))));
  }, [users]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'role' && editingUser && (editingUser.role === 'student' || editingUser.role === 'advisor')) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const normalizeRole = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';

    const map = {
      student: 'student',
      advisor: 'advisor',
      admin: 'admin',
      'นักศึกษา': 'student',
      'อาจารย์': 'advisor',
      'อาจารย์ที่ปรึกษา': 'advisor',
      'ผู้ดูแลระบบ': 'admin'
    };

    return map[raw] || raw;
  };

  const getRowValue = (row, keys) => {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
    return '';
  };

  const mapSheetRow = (row) => {
    const roleValue = normalizeRole(getRowValue(row, ['role', 'บทบาท', 'ตำแหน่ง']));

    return {
      username: getRowValue(row, ['username', 'email', 'user', 'ชื่อผู้ใช้', 'อีเมล']),
      password: getRowValue(row, ['password', 'รหัสผ่าน']),
      name: getRowValue(row, ['name', 'full_name', 'fullname', 'ชื่อ-นามสกุล', 'ชื่อ']),
      role: roleValue || 'student',
      studentId: getRowValue(row, ['studentId', 'student_code', 'รหัสนักศึกษา']),
      department: getRowValue(row, ['department', 'major', 'สาขา']),
      address: getRowValue(row, ['address', 'ที่อยู่']),
      phone: getRowValue(row, ['phone', 'โทร', 'เบอร์โทร', 'เบอร์โทรศัพท์']),
      contactPerson: getRowValue(row, ['contactPerson', 'ผู้ติดต่อ'])
    };
  };

  const validateImportRows = (rows, existingUsers) => {
    const errors = [];
    const existingKeys = new Set(
      existingUsers
        .map(u => (u.username || u.email || '').toLowerCase())
        .filter(Boolean)
    );
    const seen = new Set();

    rows.forEach((row, index) => {
      const rowErrors = [];
      const key = String(row.username || '').toLowerCase();

      if (!row.username) rowErrors.push('ต้องมี username/email');
      if (!row.name) rowErrors.push('ต้องมีชื่อ');
      if (!row.role) rowErrors.push('ต้องมี role');

      if (key && existingKeys.has(key)) rowErrors.push('ซ้ำกับผู้ใช้เดิม');
      if (key && seen.has(key)) rowErrors.push('ซ้ำในไฟล์เดียวกัน');
      if (key) seen.add(key);

      if (rowErrors.length) {
        errors.push({ index, messages: rowErrors });
      }
    });

    return errors;
  };

  const buildUserPayload = (row, offset = 0) => ({
    id: `${Date.now()}-${offset}`,
    username: row.username,
    password: row.password || '123456',
    name: row.name,
    role: row.role || 'student',
    studentId: row.studentId,
    department: row.department,
    address: row.address,
    phone: row.phone,
    contactPerson: row.contactPerson,
    email: row.username,
    full_name: row.name,
    student_code: row.studentId,
    major: row.department
  });

  const handleImportFileChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setImportErrors([]);
    setImportMessage('');
    setUploadSummary('');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const parsed = rows
        .map(mapSheetRow)
        .filter(row => row.username || row.name || row.studentId);

      if (!parsed.length) {
        setImportErrors(['ไม่พบข้อมูลที่นำเข้า']);
        setImportRows([]);
        return;
      }

      setImportRows(parsed);
      setUploadSummary(`โหลดข้อมูล ${parsed.length} แถวจากไฟล์แล้ว`);
      setImportErrors(validateImportRows(parsed, users));
    } catch (error) {
      setImportErrors(['ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์']);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearImport = () => {
    setImportRows([]);
    setImportErrors([]);
    setImportMessage('');
    setUploadSummary('');
  };

  const applyImportedUsers = async () => {
    if (!importRows.length) {
      setImportErrors(['ยังไม่มีข้อมูลที่นำเข้า']);
      return;
    }

    const errors = validateImportRows(importRows, users);
    setImportErrors(errors);

    if (errors.length) {
      setImportMessage('');
      return;
    }

    try {
      const res = await apiFetch('/users/import', {
        method: 'POST',
        body: JSON.stringify({ users: importRows }),
      });
      setImportMessage(`เพิ่มผู้ใช้สำเร็จ ${res.created} รายการ`);
      setImportRows([]);
      // Reload users
      const usersData = await apiFetch('/users');
      setUsers(usersData.data || []);
    } catch (err) {
      setImportMessage('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.role) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน (Username, ตำแหน่ง)');
      return;
    }

    try {
      if (editingUser) {
        // แก้ไข: ส่งข้อมูลรวมชื่อและสาขาวิชา (ซิงค์ลง profile)
        const payload = {
          username:   formData.username,
          email:      formData.email || formData.username,
          name:       formData.name,
          department: formData.department,
          role:       formData.role,
        };
        if (formData.password) payload.password = formData.password;
        await apiFetch(`/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        // สร้างใหม่: ต้องมี password
        if (!formData.password) {
          alert('กรุณากรอกรหัสผ่านสำหรับผู้ใช้ใหม่');
          return;
        }
        await apiFetch('/users', {
          method: 'POST',
          body: JSON.stringify({
            username:   formData.username,
            email:      formData.email || formData.username,
            name:       formData.name,
            department: formData.department,
            password:   formData.password,
            role:       formData.role,
          }),
        });
      }
      const usersData = await apiFetch('/users');
      setUsers(usersData.data || []);
      handleCloseModal();
    } catch (err) {
      alert('บันทึกล้มเหลว: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await window.showMuiConfirm('คุณแน่ใจหรือไม่ว่าจะลบผู้ใช้นี้?', {
      title: 'ยืนยันการลบผู้ใช้',
      confirmText: 'ลบผู้ใช้',
      cancelText: 'ยกเลิก',
    });

    if (!confirmed) return;

    try {
      await apiFetch(`/users/${id}`, { method: 'DELETE' });
      setUsers(users.filter(u => String(u.id) !== String(id)));
    } catch (err) {
      alert('ลบผู้ใช้ล้มเหลว: ' + err.message);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return <span className="status-badge" style={{ background: '#805ad5', color: 'white' }}>ผู้ดูแลระบบ</span>;
      case 'advisor': return <span className="status-badge" style={{ background: '#3182ce', color: 'white' }}>อาจารย์</span>;
      case 'student': return <span className="status-badge" style={{ background: '#38a169', color: 'white' }}>นักศึกษา</span>;
      default: return <span className="status-badge">{role}</span>;
    }
  };

  const departments = departmentOptions;

  const normalizedSearch = searchKeyword.trim().toLowerCase();

  const filteredUsers = users.filter(user => {
    const userDept = user.department || user.major || '';
    const matchesDepartment = selectedDepartment === 'all' || userDept === selectedDepartment;
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;

    if (!matchesDepartment || !matchesRole) return false;

    if (!normalizedSearch) return true;
    const fields = [
      user.username,
      user.email,
      user.name,
      user.full_name,
      user.studentId,
      user.student_code,
      userDept,
      user.contactPerson,
      user.phone
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    return fields.some((field) => field.includes(normalizedSearch));
  });

  const visibleUserIds = filteredUsers.map((user) => String(user.id));
  const allVisibleSelected = visibleUserIds.length > 0 && visibleUserIds.every((id) => selectedUserIds.includes(id));
  const someVisibleSelected = visibleUserIds.some((id) => selectedUserIds.includes(id));

  const toggleSelectUser = (id) => {
    const idStr = String(id);
    setSelectedUserIds((prev) => (
      prev.includes(idStr)
        ? prev.filter((item) => item !== idStr)
        : [...prev, idStr]
    ));
  };

  const toggleSelectAllVisible = () => {
    if (!visibleUserIds.length) return;
    setSelectedUserIds((prev) => (
      allVisibleSelected
        ? prev.filter((id) => !visibleUserIds.includes(id))
        : [...prev, ...visibleUserIds.filter((id) => !prev.includes(id))]
    ));
  };

  const handleBulkDelete = async () => {
    if (!selectedUserIds.length || isBulkDeleting) return;

    const confirmed = await window.showMuiConfirm(`คุณต้องการลบผู้ใช้ที่เลือกจำนวน ${selectedUserIds.length} รายการหรือไม่?`, {
      title: 'ยืนยันการลบหลายรายการ',
      confirmText: 'ลบทั้งหมด',
      cancelText: 'ยกเลิก'
    });

    if (!confirmed) return;

    setIsBulkDeleting(true);

    try {
      await Promise.all(
        selectedUserIds.map((id) => apiFetch(`/users/${id}`, { method: 'DELETE' }))
      );
      const usersData = await apiFetch('/users');
      setUsers(usersData.data || []);
      setSelectedUserIds([]);
    } catch (err) {
      alert('ลบผู้ใช้บางรายการไม่สำเร็จ: ' + err.message);
    } finally {
      setIsBulkDeleting(false);
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
        currentPath="/admin-dashboard/users"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>จัดการผู้ใช้</h1>
            <p>เพิ่ม ลบ แก้ไข ข้อมูลผู้ใช้งานในระบบ</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>สวัสดี, {adminName}</span>
          </div>
        </header>

        <div className="content-section">
          <div className="bulk-section">
            <div className="bulk-header">
              <h3>นำเข้าผู้ใช้จาก Excel/CSV</h3>
              <p>อัปโหลดไฟล์ Excel/CSV เพื่อเพิ่มผู้ใช้หลายรายการพร้อมกัน</p>
            </div>

            <div className="bulk-upload">
              <label className="bulk-upload-label">อัปโหลดไฟล์ Excel/CSV</label>
              <Input
                type="file"
                inputProps={{ accept: '.xlsx,.xls,.csv' }}
                onChange={handleImportFileChange}
                disabled={isUploading}
              />
              <p className="bulk-hint">
                คอลัมน์ที่รองรับ: ชื่อผู้ใช้, ชื่อ-นามสกุล, บทบาท, รหัสนักศึกษา, สาขา, อีเมล, เบอร์โทร, ที่อยู่, ผู้ติดต่อ, รหัสผ่าน
              </p>
              {uploadSummary && <div className="bulk-message">{uploadSummary}</div>}
              {importErrors.length > 0 && (
                <div className="bulk-error">
                  {importErrors.map((err, idx) => (
                    <div key={`import-error-${idx}`}>{err.messages ? `แถว ${err.index + 1}: ${err.messages.join(', ')}` : err}</div>
                  ))}
                </div>
              )}
              {importMessage && <div className="bulk-message">{importMessage}</div>}
            </div>

            {importRows.length > 0 && (
              <>
                <TableContainer className="bulk-table-wrapper">
                  <Table size="small" className="bulk-table" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Username/Email</TableCell>
                        <TableCell>ชื่อ-นามสกุล</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>รหัสนักศึกษา</TableCell>
                        <TableCell>สาขา</TableCell>
                        <TableCell>ผู้ติดต่อ</TableCell>
                        <TableCell>เบอร์โทร</TableCell>
                        <TableCell>ที่อยู่</TableCell>
                        <TableCell>รหัสผ่าน</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importRows.map((row, index) => (
                        <TableRow key={`import-${index}`} hover>
                          <TableCell>{row.username}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.role}</TableCell>
                          <TableCell>{row.studentId}</TableCell>
                          <TableCell>{row.department}</TableCell>
                          <TableCell>{row.contactPerson}</TableCell>
                          <TableCell>{row.phone}</TableCell>
                          <TableCell>{typeof row.address === 'object' && row.address !== null ? Object.values(row.address).filter(Boolean).join(' ') : (row.address || '-')}</TableCell>
                          <TableCell>{row.password}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <div className="bulk-actions">
                  <button type="button" className="btn-secondary" onClick={handleClearImport}>
                    ล้างรายการ
                  </button>
                  <button type="button" className="btn-submit" onClick={applyImportedUsers}>
                    บันทึกทั้งหมด
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="user-management-actions">
            <div className="filter-group" style={{ flexWrap: 'wrap', gap: 12 }}>
              <TextField
                select
                size="small"
                label="คัดกรองสาขา"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="all">ทุกสาขา</MenuItem>
                {departments.map((dept, idx) => (
                  <MenuItem key={idx} value={dept}>{dept}</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="บทบาท"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="all">ทุกบทบาท</MenuItem>
                <MenuItem value="student">นักศึกษา</MenuItem>
                <MenuItem value="advisor">อาจารย์</MenuItem>
                <MenuItem value="admin">ผู้ดูแลระบบ</MenuItem>
              </TextField>

              <TextField
                size="small"
                label="ค้นหา (ชื่อ, ผู้ใช้, เบอร์)"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                sx={{ minWidth: 240 }}
                placeholder="พิมพ์คำค้น"
              />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Tooltip title={selectedUserIds.length ? '' : 'เลือกผู้ใช้ก่อนเพื่อเปิดใช้งาน'}>
                <span>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={!selectedUserIds.length || isBulkDeleting}
                    onClick={handleBulkDelete}
                  >
                    ลบที่เลือก ({selectedUserIds.length})
                  </Button>
                </span>
              </Tooltip>
              <Button variant="contained" className="btn-add-user" onClick={() => handleOpenModal()}>
                <span>+</span> เพิ่มผู้ใช้ใหม่
              </Button>
            </div>
          </div>

          <TableContainer className="users-table-container">
            <Table size="small" className="users-table" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={someVisibleSelected && !allVisibleSelected}
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      inputProps={{ 'aria-label': 'เลือกทั้งหมด' }}
                    />
                  </TableCell>
                  <TableCell>ชื่อผู้ใช้/Email</TableCell>
                  <TableCell>ชื่อ-นามสกุล</TableCell>
                  <TableCell>บทบาท</TableCell>
                  <TableCell>รายละเอียดเพิ่มเติม</TableCell>
                  <TableCell>จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map(user => {
                  const idStr = String(user.id);
                  return (
                    <TableRow key={user.id} hover selected={selectedUserIds.includes(idStr)}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedUserIds.includes(idStr)}
                          onChange={() => toggleSelectUser(idStr)}
                          inputProps={{ 'aria-label': `เลือกผู้ใช้ ${user.username || user.name}` }}
                        />
                      </TableCell>
                      <TableCell>{user.username || user.email}</TableCell>
                      <TableCell>{user.name || user.full_name}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.role === 'student' && user.studentId && <div>รหัส: {user.studentId}</div>}
                        {user.department && <div style={{ fontSize: '0.85em', color: '#666' }}>สาขา: {user.department}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="user-row-actions">
                          <Button size="small" variant="outlined" className="btn-edit-user" onClick={() => handleOpenModal(user)}>แก้ไข</Button>
                          <Button size="small" color="error" variant="outlined" className="btn-delete-user" onClick={() => handleDelete(user.id)}>ลบ</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 2.5 }}>ไม่พบข้อมูลผู้ใช้</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </main>

      {/* Modal */}
      <Dialog open={isModalOpen} onClose={handleCloseModal} fullWidth maxWidth="md">
        <DialogTitle>{editingUser ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</DialogTitle>
        <DialogContent dividers>
          <Box
            component="form"
            onSubmit={handleSubmit}
            className="user-form"
            id="user-form"
            sx={{
              mt: 0.5,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            <TextField
              fullWidth
              size="small"
              label="ชื่อผู้ใช้ (Username)"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
            />

            <TextField
              fullWidth
              size="small"
              type="email"
              label="Email (เว้นว่างจะใช้ username แทน)"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
            />

            <TextField
              fullWidth
              size="small"
              label="ชื่อ-นามสกุล (Name)"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
            />

            <TextField
              select
              fullWidth
              size="small"
              label="สาขาวิชา (Department)"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
            >
              <MenuItem value="">-- เลือกสาขาวิชา --</MenuItem>
              {departmentOptions.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              size="small"
              type="password"
              label="รหัสผ่าน (Password)"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              helperText={editingUser ? 'เว้นว่างหากไม่ต้องการเปลี่ยน' : 'จำเป็นสำหรับผู้ใช้ใหม่'}
              required={!editingUser}
            />

            <TextField
              select
              fullWidth
              size="small"
              label="บทบาท (Role)"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
            >
            <MenuItem value="student">นักศึกษา</MenuItem>
              <MenuItem value="alumni">ศิษย์เก่า</MenuItem>
              <MenuItem value="advisor">อาจารย์ที่ปรึกษา</MenuItem>
              <MenuItem value="admin">ผู้ดูแลระบบ</MenuItem>
            </TextField>

          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button type="button" onClick={handleCloseModal}>ยกเลิก</Button>
          <Button type="submit" form="user-form" variant="contained">บันทึก</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AdminUserManagementPage;

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../assets/LASC-SSKRU-1.png';
import api from '../../api/axios';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import '../Admin/Dashboard/AdminDashboardPage.css'; // Reuse styles
import '../Admin/Dashboard/StudentListPage.css';
import AdvisorSidebar from '../../components/AdvisorSidebar';
import UserProfileMenu from '../../components/UserProfileMenu';
import NotificationBell from '../../components/NotificationBell';
import DateTimeIndicator from '../../components/DateTimeIndicator';

const AdvisorStudentListPage = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [students, setStudents] = useState([]);
    const [advisorDept, setAdvisorDept] = useState('');

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            navigate('/login');
            return;
        }

        const user = JSON.parse(userStr);
        if (user.role !== 'advisor') {
            navigate('/dashboard');
            return;
        }

        // นักศึกษาที่มีสิทธิ์ฝึกงาน = ชั้นปี 4 — รหัสขึ้นต้นด้วยปีที่เข้าศึกษา (ปี พ.ศ. ปัจจุบัน - 3)
        // เช่น ปี 2569 → cohort 66 | รองรับบัญชีทดสอบ 'student*' ด้วย
        const internshipPrefix = String(new Date().getFullYear() + 543 - 2500 - 3).padStart(2, '0');
        const isEligible = (stu) => {
            const code = String(stu.student_code || stu.studentId || stu.username || '').trim();
            return code.startsWith(internshipPrefix) || code.startsWith('student');
        };

        const fetchStudents = (deptId, deptName) => {
            api.get('/users', { params: { role: 'student', department_id: deptId, department: deptName } })
                .then(res => setStudents((res.data.data || []).filter(isEligible)))
                .catch(err => console.error('Failed to load students:', err));
        };

        const deptName = user.department || user.major || '';
        setAdvisorDept(deptName);

        if (user.department_id) {
            fetchStudents(user.department_id, deptName);
        } else {
            // user ใน localStorage อาจไม่มี department_id — ดึงข้อมูลสดจาก /auth/me
            api.get('/auth/me').then(res => {
                const me = res.data.user || {};
                setAdvisorDept(me.department || me.major || deptName);
                fetchStudents(me.department_id, me.department || me.major || deptName);
            }).catch(err => console.error('Failed to load profile:', err));
        }

    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    // แปลงสถานะคำร้องล่าสุด → badge ขั้นตอนการฝึกงาน (แทนสถานะบัญชี "ใช้งาน")
    const getStepBadge = (stu) => {
        const s = String(stu.latest_request_status || '').trim();
        if (!s) {
            return { label: 'ยังไม่ยื่นคำร้อง', cls: 'bg-gray-100 text-gray-600 border border-gray-200' };
        }
        if (s.includes('ไม่อนุมัติ') || s.includes('ปฏิเสธ') || s.includes('แก้ไข')) {
            return { label: 'ส่งกลับแก้ไข', cls: 'bg-rose-50 text-rose-700 border border-rose-200' };
        }
        if (s.includes('นิเทศ') || s.includes('ประเมินเสร็จ') || s.includes('ฝึกงานเสร็จ')) {
            return { label: 'นิเทศ / ประเมินเสร็จสิ้น', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
        }
        if (s.includes('รอสถานประกอบการ') || s.includes('หนังสือ')) {
            return { label: 'รอสถานประกอบการตอบรับ', cls: 'bg-blue-50 text-blue-700 border border-blue-200' };
        }
        if (s.includes('ออกฝึกงาน') || s.includes('กำลังฝึกงาน') || s.includes('อนุมัติแล้ว') || s.includes('ตอบรับ')) {
            return { label: 'กำลังฝึกงาน', cls: 'bg-purple-50 text-purple-700 border border-purple-200' };
        }
        if (s.includes('รอ')) {
            return { label: 'รออาจารย์ / ผู้ดูแลตรวจสอบ', cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
        }
        return { label: s, cls: 'bg-gray-100 text-gray-600 border border-gray-200' };
    };

    // อีเมลทางการ: ใช้อีเมลจริงถ้ามี ไม่ใช่โดเมนเก่า @student.sskru.ac.th
    const displayEmail = (stu) => {
        const code = String(stu.student_code || stu.studentId || stu.username || '').trim();
        const email = String(stu.email || '').trim();
        if (email.includes('@') && !email.includes('@student.sskru.ac.th')) return email;
        return code ? `stu${code}@sskru.ac.th` : '-';
    };

    // Sorting for the table — default เรียงตามรหัสนักศึกษา (ตัวเลขท้าย) น้อย → มาก
    const [sortBy, setSortBy] = useState('student_code');
    const [sortDir, setSortDir] = useState('asc');

    const toggleSort = (key) => {
        if (sortBy === key) {
            setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(key);
            setSortDir('asc');
        }
    };

    const sortedStudents = [...students].sort((a, b) => {
        if (!sortBy) return 0;
        const va = a[sortBy] ?? '';
        const vb = b[sortBy] ?? '';
        if (sortBy === 'student_code') {
            const na = parseInt(String(va).replace(/[^0-9]/g, ''), 10) || 0;
            const nb = parseInt(String(vb).replace(/[^0-9]/g, ''), 10) || 0;
            return (na - nb) * (sortDir === 'asc' ? 1 : -1);
        }
        return String(va).localeCompare(String(vb), 'th-TH', { numeric: true }) * (sortDir === 'asc' ? 1 : -1);
    });

    return (
        <div className="admin-dashboard-container">
            <div className="mobile-top-navbar flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">☰</button>
                    <Link to="/" className="mobile-top-logo flex items-center shrink-0" aria-label="LASC Home">
                        <img src={lascLogo} alt="LASC Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
            <span className="hidden sm:inline text-base md:text-lg font-extrabold text-slate-900 tracking-tight whitespace-nowrap ml-2" style={{ fontFamily: '"Prompt", "Kanit", "Inter", sans-serif' }}>
              ระบบฝึกประสบการณ์วิชาชีพ
            </span>
                    </Link>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <DateTimeIndicator />
                    <NotificationBell />
                    <UserProfileMenu />
                </div>
            </div>
            <AdvisorSidebar
                isMenuOpen={isMenuOpen}
                setIsMenuOpen={setIsMenuOpen}
                currentPath="/advisor-dashboard/students"
                handleLogout={handleLogout}
            />

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1>รายชื่อนักศึกษาในที่ปรึกษา</h1>
                        <p>สาขาวิชา: {advisorDept || 'ไม่ระบุสาขา'} • เฉพาะนักศึกษาที่มีสิทธิ์ฝึกงาน (ชั้นปี 4)</p>
                    </div>
                </header>

                <Paper className="content-section" elevation={0} sx={{ width: '100%', background: '#ffffff', color: '#0f172a', boxShadow: 'none', borderRadius: 2 }}>
                    <div className="section-header" style={{ background: 'transparent' }}>
                        <h2>นักศึกษาที่มีสิทธิ์ฝึกงาน ({students.length})</h2>
                    </div>

                    <TableContainer component={Box} className="table-responsive" sx={{ px: 2, pb: 2, overflowX: 'auto' }}>
                        <Table size="small" className="data-table" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell className="sortable" onClick={() => toggleSort('student_code')}>รหัสนักศึกษา {sortBy === 'student_code' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                                    <TableCell className="sortable" onClick={() => toggleSort('name')}>ชื่อ-นามสกุล {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                                    <TableCell className="sortable" onClick={() => toggleSort('email')}>อีเมล {sortBy === 'email' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                                    <TableCell className="sortable" onClick={() => toggleSort('phone')}>เบอร์โทร {sortBy === 'phone' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                                    <TableCell>สถานะ / ขั้นตอน</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedStudents.length > 0 ? (
                                    sortedStudents.map((stu, index) => (
                                        <TableRow key={stu.id || index} hover>
                                            <TableCell>{stu.student_code || stu.studentId || stu.username}</TableCell>
                                            <TableCell>{stu.name || stu.full_name || '-'}</TableCell>
                                            <TableCell>{displayEmail(stu)}</TableCell>
                                            <TableCell>{stu.phone || stu.request_phone || '-'}</TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const badge = getStepBadge(stu);
                                                    return (
                                                        <div className="flex flex-col items-start gap-1">
                                                            <span
                                                                title={stu.latest_request_status || ''}
                                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badge.cls}`}
                                                            >
                                                                {badge.label}
                                                            </span>
                                                            {stu.company_name && (
                                                                <span className="text-[11px] text-gray-400 truncate max-w-[180px]" title={stu.company_name}>
                                                                    {stu.company_name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell>
                                                <Link to={`/dashboard/student/${stu.student_code || stu.studentId || stu.username}`} className="view-btn">
                                                    ดูรายละเอียด
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 2.5 }}>
                                            ไม่พบนักศึกษาในสาขานี้
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </main>
        </div>
    );
};

export default AdvisorStudentListPage;

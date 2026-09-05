import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../assets/LASC-SSKRU-1.png';
import api from '../../api/axios';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import '../Admin/Dashboard/AdminDashboardPage.css'; // Reuse styles
import '../Admin/Dashboard/StudentListPage.css';
import AdvisorSidebar from '../../components/AdvisorSidebar';
import UserProfileMenu from '../../components/UserProfileMenu';
import StatusBadge from '../../components/StatusBadge';

const AdvisorStudentListPage = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [myRequests, setMyRequests] = useState([]);
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

        const myDept = user.department || user.major || 'วิศวกรรมคอมพิวเตอร์'; 
        setAdvisorDept(myDept);

        api.get('/requests').then(res => {
            const allRequests = res.data.data || [];
            setMyRequests(allRequests.filter(req => req.department === myDept));
        }).catch(err => console.error('Failed to load requests:', err));

    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    // Sorting for the table
    const [sortBy, setSortBy] = useState(null);
    const [sortDir, setSortDir] = useState('asc');

    const toggleSort = (key) => {
        if (sortBy === key) {
            setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(key);
            setSortDir('asc');
        }
    };

    const sortedRequests = [...myRequests].sort((a, b) => {
        if (!sortBy) return 0;
        const va = a[sortBy] ?? '';
        const vb = b[sortBy] ?? '';
        if (sortBy === 'submittedDate') {
            const da = new Date(va).getTime() || 0;
            const db = new Date(vb).getTime() || 0;
            return (da - db) * (sortDir === 'asc' ? 1 : -1);
        }
        if (sortBy === 'studentId') {
            const na = parseInt(String(va).replace(/[^0-9]/g, ''), 10) || 0;
            const nb = parseInt(String(vb).replace(/[^0-9]/g, ''), 10) || 0;
            return (na - nb) * (sortDir === 'asc' ? 1 : -1);
        }
        return String(va).localeCompare(String(vb), 'th-TH', { numeric: true }) * (sortDir === 'asc' ? 1 : -1);
    });

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
            <AdvisorSidebar
                isMenuOpen={isMenuOpen}
                setIsMenuOpen={setIsMenuOpen}
                currentPath="/advisor-dashboard/students"
                handleLogout={handleLogout}
            />

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1>คำร้องนักศึกษาในที่ปรึกษา</h1>
                        <p>สาขาวิชา: {advisorDept}</p>
                    </div>
                </header>

                <Paper className="content-section" elevation={0} sx={{ width: '100%', background: '#ffffff', color: '#0f172a', boxShadow: 'none', borderRadius: 2 }}>
                    <div className="section-header" style={{ background: 'transparent' }}>
                        <h2>รายการคำร้องทั้งหมด ({myRequests.length})</h2>
                    </div>

                    <TableContainer component={Box} className="table-responsive" sx={{ px: 2, pb: 2, overflowX: 'auto' }}>
                        <Table size="small" className="data-table" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell className="sortable" onClick={() => toggleSort('studentId')}>รหัสนักศึกษา {sortBy === 'studentId' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                                    <TableCell className="sortable" onClick={() => toggleSort('studentName')}>ชื่อ-นามสกุล {sortBy === 'studentName' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                                    <TableCell className="sortable" onClick={() => toggleSort('company')}>สถานประกอบการ {sortBy === 'company' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                                    <TableCell className="sortable" onClick={() => toggleSort('submittedDate')}>วันที่ส่ง {sortBy === 'submittedDate' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                                    <TableCell className="sortable" onClick={() => toggleSort('status')}>สถานะ {sortBy === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedRequests.length > 0 ? (
                                    sortedRequests.map((req, index) => (
                                        <TableRow key={req.id || index} hover>
                                            <TableCell>{req.studentId}</TableCell>
                                            <TableCell>{req.studentName}</TableCell>
                                            <TableCell>{req.company}</TableCell>
                                            <TableCell>{new Date(req.submittedDate).toLocaleDateString('th-TH')}</TableCell>
                                            <TableCell><StatusBadge status={req.status} /></TableCell>
                                            <TableCell>
                                                <Link to={`/dashboard/request/${req.id}`} className="view-btn">
                                                    ตรวจสอบ
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 2.5 }}>
                                            ไม่พบคำร้องจากนักศึกษาในสาขานี้
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

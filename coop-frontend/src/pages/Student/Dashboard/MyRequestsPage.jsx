import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, MenuItem } from '@mui/material';
import api from '../../../api/axios';
import './DashboardPage.css'; // Reusing layout styles
import './MyRequestsPage.css';
import { ClockIcon } from '@heroicons/react/24/outline'; // Specific styles for this page
import StudentSidebar from '../../../components/StudentSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import StatusBadge from '../../../components/StatusBadge';

const MyRequestsPage = () => {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState(''); 
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [myRequests, setMyRequests] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mapStatus = (status) => {
    switch(status) {
        case 'submitted': return 'รออนุมัติ';
        case 'advisor_approved': return 'รออนุมัติ (อาจารย์ผ่านแล้ว)'; 
        case 'admin_approved': return 'อนุมัติแล้ว';
        case 'rejected': return 'ไม่อนุมัติ';
        default: return 'รออนุมัติ'; // draft defaults to waiting
    }
  };

  useEffect(() => {
    const fetchRequests = async () => {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                navigate('/login');
                return;
            }
            const user = JSON.parse(userStr);
            setStudentName(user.full_name || user.name || '');

            const studentId = user.student_code || user.studentId || user.username;
            const res = await api.get(`/requests?studentId=${studentId}`);
            const myReqs = (res.data.data || []).map(req => ({
                ...req,
                companyName: req.companyName || req.company || 'Unknown Company',
                position: req.position || 'Unknown Position'
            }));
            setMyRequests(myReqs);
        } catch (error) {
            console.error('Error fetching requests:', error);
            setMyRequests([]);
        }
    };
    
    fetchRequests();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const filteredRequests = myRequests.filter(req => {
    const term = searchTerm.toLowerCase();
    const company = (req.companyName || '').toLowerCase();
    const position = (req.position || '').toLowerCase();
    const matchesSearch = company.includes(term) || position.includes(term);
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatThaiDateTime = (dateValue) => {
    if (!dateValue) return { date: '-', time: '-' };
    const dateObj = new Date(dateValue);
    if (Number.isNaN(dateObj.getTime())) return { date: '-', time: '-' };

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear() + 543; // Buddhist year
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');

    return {
      date: `${day}-${month}-${year}`,
      time: `${hours}:${minutes}:${seconds}`
    };
  };

  const handleCopyEvalLink = (reqId) => {
    const link = `${window.location.origin}/coop/public/evaluate/${reqId}`;
    navigator.clipboard.writeText(link);
    alert('คัดลอกลิงก์ประเมินแล้ว นำไปส่งให้บริษัทหรือพี่เลี้ยงได้เลยครับ');
  };

  return (
    <div className="dashboard-container">
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home">
          <img src={lascLogo} alt="LASC Logo" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '8px' }}>
          <UserProfileMenu />
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
        </div>
      </div>
      <StudentSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/dashboard/my-requests"
        handleLogout={handleLogout}
      />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>คำร้องของฉัน</h1>
            <p>ประวัติและสถานะการยื่นคำร้องทั้งหมด</p>
          </div>
          <div className="user-info">
             <span>{studentName}</span>
          </div>
        </header>

        <div className="content-wrapper">
            {/* Filter Section */}
            <div className="filter-section">
                <div className="search-box">
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="ค้นหาบริษัท หรือ ตำแหน่ง..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="status-filter">
                    <TextField
                      select
                      size="small"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      sx={{ minWidth: { xs: '100%', sm: '220px' }, backgroundColor: 'white' }}
                    >
                      <MenuItem value="all">สถานะทั้งหมด</MenuItem>
                      <MenuItem value="รออนุมัติ">รออนุมัติ</MenuItem>
                      <MenuItem value="อนุมัติแล้ว">อนุมัติแล้ว</MenuItem>
                      <MenuItem value="ไม่อนุมัติ">ไม่อนุมัติ</MenuItem>
                    </TextField>
                </div>
            </div>

            {/* Requests Table */}
            <TableContainer className="table-container">
              <Table size="small" className="requests-table" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>บริษัท</TableCell>
                    <TableCell>ตำแหน่ง</TableCell>
                    <TableCell>วันที่ยื่น</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell>จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                        {filteredRequests.length > 0 ? (
                            filteredRequests.map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell className="company-name"><span className="compact-text">{req.companyName}</span></TableCell>
                        <TableCell><span className="compact-text">{req.position}</span></TableCell>
                        <TableCell>
                                      <div>{formatThaiDateTime(req.submittedDate).date}</div>
                                      <div>{formatThaiDateTime(req.submittedDate).time}</div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={req.status} />
                          {(req.status === 'ออกฝึกงาน' || req.status === 'ประเมินเสร็จแล้ว' || req.status === 'ฝึกงานเสร็จแล้ว') && (
                            <div style={{ marginTop: '8px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px', fontWeight: 500 }}>
                              {req.hasCompanyEval ? 
                                <span style={{ color: '#10b981' }}>✓ บริษัทประเมินแล้ว</span> : 
                                <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}><ClockIcon style={{width: 16, height: 16}}/> บริษัทกำลังประเมิน</span>}
                              {req.hasAdvisorEval ? 
                                <span style={{ color: '#10b981' }}>✓ อาจารย์ประเมินแล้ว</span> : 
                                <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}><ClockIcon style={{width: 16, height: 16}}/> อาจารย์กำลังประเมิน</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                            <Link to={`/dashboard/request/${req.id}`} className="btn-view">
                              รายละเอียด
                            </Link>
                            {(req.status === 'ออกฝึกงาน' || req.status === 'ฝึกงานเสร็จแล้ว' || req.status === 'อนุมัติแล้ว') && (
                              <button onClick={() => handleCopyEvalLink(req.id)} className="btn-view btn-eval">
                                ลิงก์ประเมิน
                              </button>
                            )}
                            {(req.status === 'ไม่อนุมัติ (Admin)' || req.status === 'ไม่อนุมัติ (อาจารย์)' || req.status === 'ปฏิเสธ') && (
                              <Link to={`/dashboard/edit-request/${req.id}`} className="btn-view" style={{ backgroundColor: '#f59e0b', color: 'white' }}>
                                แก้ไขคำร้อง
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                            ))
                        ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="no-data">ไม่พบข้อมูลคำร้อง</TableCell>
                    </TableRow>
                        )}
                </TableBody>
              </Table>
            </TableContainer>
        </div>
      </main>
    </div>
  );
};

export default MyRequestsPage;

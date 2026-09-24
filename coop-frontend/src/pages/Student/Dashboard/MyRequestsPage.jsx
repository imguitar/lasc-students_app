import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, MenuItem } from '@mui/material';
import api from '../../../api/axios';
import './DashboardPage.css'; // Reusing layout styles
import './MyRequestsPage.css';
import { ClockIcon } from '@heroicons/react/24/outline'; // Specific styles for this page
import { MoreVertical, Eye, Download, Pencil } from 'lucide-react';
import StudentSidebar from '../../../components/StudentSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';
import { getEffectiveInternshipStatus } from '../../../utils/internshipStatus';
import StatusBadge from '../../../components/StatusBadge';

export const isStudentEditableStatus = (status) => {
  const s = String(status || '').trim();
  // อนุญาตให้แก้ไขได้เฉพาะสถานะฉบับร่าง/รอตรวจสอบ/ถูกส่งกลับแก้ไขเท่านั้น
  // สถานะที่เข้าสู่กระบวนการตอบรับ-อนุมัติ-ออกฝึกงานแล้ว (COMPANY_ACCEPTED, APPROVED, IN_TRAINING ฯลฯ) ห้ามแก้ไข
  const editableStatuses = [
    'DRAFT',
    'PENDING',
    'REJECTED',
    'ฉบับร่าง',
    'รอตรวจสอบ',
    'รอผู้ดูแลระบบตรวจสอบ',
    'รอผู้ดูแลระบบอนุมัติ',
    'รออาจารย์ที่ปรึกษาอนุมัติ',
    'รออนุมัติ',
    'ไม่อนุมัติ',
    'ไม่อนุมัติ (อาจารย์)',
    'ไม่อนุมัติ (Admin)',
    'ส่งกลับแก้ไข',
    'ปฏิเสธ'
  ];
  return editableStatuses.includes(s);
};

const dataUrlToBlobUrl = (dataUrl) => {
  if (!dataUrl) return '';
  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Failed to convert dataUrl to blob:', err);
    return dataUrl;
  }
};

const handleDownloadFile = (dataUrl, fileName = 'หนังสือส่งตัวฝึกงาน.pdf') => {
  if (!dataUrl) return;
  try {
    const blobUrl = dataUrlToBlobUrl(dataUrl);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('Download error:', err);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

const MyRequestsPage = () => {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState(''); 
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [myRequests, setMyRequests] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState({ id: null, top: 0, left: 0 });
  const menuPanelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target?.closest?.('.action-menu-trigger')) return;
      if (menuPanelRef.current && !menuPanelRef.current.contains(event.target)) {
        setActionMenu({ id: null, top: 0, left: 0 });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!actionMenu.id) return;
    const closeMenu = () => setActionMenu({ id: null, top: 0, left: 0 });
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [actionMenu.id]);

  const handleToggleActionMenu = (e, requestId) => {
    e.preventDefault();
    e.stopPropagation();
    if (actionMenu.id === requestId) {
      setActionMenu({ id: null, top: 0, left: 0 });
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 176; // w-44
    const menuHeight = 160;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= menuHeight + 8
      ? rect.bottom + 4
      : Math.max(8, rect.top - menuHeight - 4);
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8
    );
    setActionMenu({ id: requestId, top, left });
  };

  const closeActionMenu = () => setActionMenu({ id: null, top: 0, left: 0 });

  const handleDocumentAction = (dataUrl, fileName) => {
    if (!dataUrl) return;
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      handleDownloadFile(dataUrl, fileName);
    } else {
      const fileUrl = dataUrlToBlobUrl(dataUrl);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
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
            const myReqs = (res.data.data || []).map(req => {
              const effectiveStatus = getEffectiveInternshipStatus(req);
              const dispatchLetter = req.dispatchLetter || req.details?.dispatchLetter;
              return {
                ...req,
                status: effectiveStatus || req.status,
                dispatchLetter,
                companyName: req.companyName || req.company || 'Unknown Company',
                position: req.position || 'Unknown Position'
              };
            });
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

  const activeMenuRequest = filteredRequests.find((req) => req.id === actionMenu.id);

  const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  const getSubmittedAt = (req) =>
    req.submittedDate || req.details?.submittedDate || req.created_at || req.createdAt || req.updated_at || null;

  const formatThaiDateTime = (dateValue) => {
    if (!dateValue) return { date: '-', time: '-' };
    const dateObj = new Date(dateValue);
    if (Number.isNaN(dateObj.getTime())) return { date: '-', time: '-' };

    const day = dateObj.getDate();
    const month = THAI_MONTHS_SHORT[dateObj.getMonth()];
    const year = dateObj.getFullYear() + 543; // Buddhist year
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return {
      date: `${day} ${month} ${year}`,
      time: `${hours}:${minutes} น.`
    };
  };


  return (
    <div className="dashboard-container">
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
                    <TableCell className="text-right">จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                        {filteredRequests.length > 0 ? (
                            filteredRequests.map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell className="company-name"><span className="compact-text">{req.companyName}</span></TableCell>
                        <TableCell><span className="compact-text">{req.position}</span></TableCell>
                        <TableCell>
                          {(() => {
                            const submitted = formatThaiDateTime(getSubmittedAt(req));
                            return (
                              <div className="compact-text">
                                <div>{submitted.date}</div>
                                <div className="text-slate-400">{submitted.time}</div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={req.status} />
                          {(req.status === 'ออกฝึกงาน' || req.status === 'กำลังออกฝึกงาน' || req.status === 'สิ้นสุดการฝึกงาน (รอประเมิน)' || req.status === 'ประเมินเสร็จแล้ว' || req.status === 'ฝึกงานเสร็จแล้ว') && (
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
                        <TableCell className="text-right">
                          <button
                            type="button"
                            onClick={(e) => handleToggleActionMenu(e, req.id)}
                            className="action-menu-trigger p-2 rounded-xl text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition cursor-pointer border-none bg-transparent outline-none inline-flex items-center justify-center"
                            aria-label="ตัวเลือกการจัดการ"
                            title="จัดการ"
                          >
                            <MoreVertical className="w-4 h-4 stroke-[2]" />
                          </button>
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

      {/* Action Dropdown Panel — เรนเดอร์ผ่าน Portal เพื่อหลบการถูก clip โดย overflow ของตาราง */}
      {actionMenu.id && activeMenuRequest && createPortal(
        <div
          ref={menuPanelRef}
          className="w-44 bg-white rounded-2xl p-1.5 border border-violet-100 z-[99] flex flex-col gap-0.5"
          style={{
            position: 'fixed',
            top: actionMenu.top,
            left: actionMenu.left,
            backgroundColor: '#ffffff',
            boxShadow: '0 12px 32px rgba(124, 58, 237, 0.08)',
            borderColor: '#ede9fe',
          }}
        >
          {/* รายการที่ 1: ดูรายละเอียด */}
          <Link
            to={`/dashboard/request/${activeMenuRequest.id}`}
            onClick={closeActionMenu}
            className="group w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition text-left no-underline cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-400 group-hover:text-violet-600 transition" />
            <span>ดูรายละเอียด</span>
          </Link>

          {/* รายการที่ 2: ดาวน์โหลดเอกสาร (แสดงเมื่อมีไฟล์) */}
          {activeMenuRequest.dispatchLetter?.dataUrl ? (
            <button
              type="button"
              onClick={() => {
                closeActionMenu();
                handleDocumentAction(
                  activeMenuRequest.dispatchLetter.dataUrl,
                  activeMenuRequest.dispatchLetter.fileName || `หนังสือส่งตัว_${activeMenuRequest.companyName || 'ฝึกงาน'}.pdf`
                );
              }}
              className="group w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition text-left cursor-pointer border-none bg-transparent outline-none"
            >
              <Download className="w-4 h-4 text-slate-400 group-hover:text-violet-600 transition" />
              <span>ดาวน์โหลดเอกสาร</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 rounded-xl cursor-not-allowed border-none bg-transparent"
              title="ยังไม่มีเอกสารหนังสือส่งตัว"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>ดาวน์โหลดเอกสาร</span>
            </button>
          )}

          {/* เส้นคั่นบางๆ + รายการที่ 3: แก้ไขคำร้อง (แสดงเฉพาะคำร้องที่ยังแก้ไขได้เท่านั้น) */}
          {isStudentEditableStatus(activeMenuRequest.status) && (
            <>
              <div className="border-t border-slate-100 my-0.5" />
              <Link
                to={`/dashboard/edit-request/${activeMenuRequest.id}`}
                onClick={closeActionMenu}
                className="group w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition text-left no-underline cursor-pointer"
              >
                <Pencil className="w-4 h-4 text-violet-500" />
                <span>แก้ไขคำร้อง</span>
              </Link>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default MyRequestsPage;

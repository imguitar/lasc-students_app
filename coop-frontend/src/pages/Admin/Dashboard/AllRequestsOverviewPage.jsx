import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import api from '../../../api/axios';
import { ArrowLeft, Search, MoreVertical, Eye, Loader2, Menu as MenuIcon, CalendarDays, ChevronRight, ChevronDown } from 'lucide-react';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';
import StatusBadge from '../../../components/StatusBadge';
import { getEffectiveInternshipStatus } from '../../../utils/internshipStatus';
import './AdminDashboardPage.css';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'สถานะทั้งหมด' },
  { value: 'รอผู้ดูแลระบบตรวจสอบ', label: 'รอผู้ดูแลระบบตรวจสอบ' },
  { value: 'รอสถานประกอบการตอบรับ', label: 'รอสถานประกอบการตอบรับ' },
  { value: 'สถานประกอบการตอบรับแล้ว', label: 'สถานประกอบการตอบรับแล้ว' },
  { value: 'อนุมัติแล้ว', label: 'อนุมัติแล้ว' },
  { value: 'ไม่อนุมัติ', label: 'ไม่อนุมัติ' },
];

const DEPARTMENT_OPTIONS = [
  'วิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์',
  'วิทยาการคอมพิวเตอร์',
  'เทคโนโลยีสารสนเทศ',
];

const matchStatus = (effectiveStatus, filterValue) => {
  const s = String(effectiveStatus || '');
  if (filterValue === 'all') return true;
  if (filterValue === 'ไม่อนุมัติ') {
    return s.includes('ไม่อนุมัติ') || s.includes('ปฏิเสธ') || s.includes('ยกเลิก');
  }
  return s.includes(filterValue);
};

const matchDepartment = (department, filterValue) => {
  if (filterValue === 'all') return true;
  const dept = String(department || '').replace(/^สาขา/, '');
  const target = filterValue.replace(/^สาขา/, '');
  return dept.includes(target) || target.includes(dept);
};

const AllRequestsOverviewPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [actionMenu, setActionMenu] = useState({ id: null, top: 0, left: 0 });
  const menuPanelRef = useRef(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (String(user.role || '').toLowerCase() !== 'admin') {
      navigate('/dashboard');
      return;
    }

    api.get('/requests')
      .then((res) => setRequests(res.data.data || []))
      .catch((err) => console.error('Failed to load requests:', err))
      .finally(() => setLoading(false));
  }, [navigate]);

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
    if (!actionMenu.id) return undefined;
    const closeMenu = () => setActionMenu({ id: null, top: 0, left: 0 });
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [actionMenu.id]);

  const handleToggleActionMenu = (e, menuId) => {
    e.preventDefault();
    e.stopPropagation();
    if (actionMenu.id === menuId) {
      setActionMenu({ id: null, top: 0, left: 0 });
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 64;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < menuHeight + 12 ? rect.top - menuHeight - 6 : rect.bottom + 6;
    const left = Math.min(rect.right - 180, window.innerWidth - 196);
    setActionMenu({ id: menuId, top: Math.max(8, top), left: Math.max(8, left) });
  };

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((r) => {
      const effectiveStatus = getEffectiveInternshipStatus(r);
      if (!matchStatus(effectiveStatus, statusFilter)) return false;
      if (!matchDepartment(r.department, departmentFilter)) return false;
      if (!q) return true;
      return [r.studentName, r.studentId, r.company, r.department]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  }, [requests, searchQuery, statusFilter, departmentFilter]);

  const formatDateThai = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('th-TH');
    } catch {
      return '-';
    }
  };

  const activeMenuRequest = actionMenu.id
    ? requests.find((r) => String(r.id) === String(actionMenu.id))
    : null;

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="admin-dashboard-container">
      <div className="mobile-top-navbar flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu"><MenuIcon className="w-5 h-5" /></button>
          <Link to="/" className="mobile-top-logo flex items-center shrink-0" aria-label="LASC Home">
            <img src={lascLogo} alt="LASC Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <DateTimeIndicator />
          <NotificationBell />
          <UserProfileMenu />
        </div>
      </div>
      <AdminSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/admin-dashboard"
        handleLogout={handleLogout}
      />

      <main className="admin-main max-w-full overflow-x-hidden">
        <div className="content-section px-3 sm:px-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-5 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/admin-dashboard')}
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 transition cursor-pointer"
              aria-label="ย้อนกลับ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 grow">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-slate-900 font-extrabold text-xl md:text-2xl tracking-tight m-0">
                  สถานะคำร้องนักศึกษาทั้งหมด
                </h1>
                <span className="text-xs font-semibold text-violet-700 bg-violet-100/80 px-2.5 py-1 rounded-lg">
                  {filteredRequests.length} รายการ
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1 m-0">ตรวจสอบและติดตามสถานะคำร้องฝึกงานของนักศึกษาทุกคนในระบบ</p>
            </div>
          </div>

          {/* Card */}
          <div className="w-full min-w-0">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="relative w-full sm:grow sm:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ, รหัสนักศึกษา หรือบริษัท..."
                  className="w-full box-border pl-10 pr-3 py-2.5 text-xs text-slate-700 bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition placeholder:text-slate-400"
                />
              </div>

              <div className="relative w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto appearance-none rounded-xl bg-slate-50/70 border border-slate-200/80 text-xs text-slate-700 py-2.5 pl-3.5 pr-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition cursor-pointer"
                >
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative w-full sm:w-auto">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full sm:w-auto appearance-none rounded-xl bg-slate-50/70 border border-slate-200/80 text-xs text-slate-700 py-2.5 pl-3.5 pr-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition cursor-pointer"
                >
                  <option value="all">ทุกสาขาวิชา</option>
                  {DEPARTMENT_OPTIONS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Table (Tablet / Desktop) */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 w-full">
                <Loader2 className="w-8 h-8 text-violet-600 animate-spin stroke-[2.2]" />
                <p className="text-xs font-medium text-slate-400 mt-3 m-0">กำลังโหลดข้อมูลคำร้อง...</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-hidden rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="text-slate-400 text-[0.75rem] font-semibold uppercase tracking-wider py-3 px-4 border-b border-slate-100 whitespace-nowrap">วันที่ยื่น</th>
                      <th className="text-slate-400 text-[0.75rem] font-semibold uppercase tracking-wider py-3 px-4 border-b border-slate-100 whitespace-nowrap">รหัสนักศึกษา</th>
                      <th className="text-slate-400 text-[0.75rem] font-semibold uppercase tracking-wider py-3 px-4 border-b border-slate-100">ชื่อ-นามสกุล</th>
                      <th className="text-slate-400 text-[0.75rem] font-semibold uppercase tracking-wider py-3 px-4 border-b border-slate-100">สาขา</th>
                      <th className="text-slate-400 text-[0.75rem] font-semibold uppercase tracking-wider py-3 px-4 border-b border-slate-100">บริษัท</th>
                      <th className="text-slate-400 text-[0.75rem] font-semibold uppercase tracking-wider py-3 px-4 border-b border-slate-100">สถานะ</th>
                      <th className="text-slate-400 text-[0.75rem] font-semibold uppercase tracking-wider py-3 px-4 border-b border-slate-100 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="text-[0.8125rem] text-slate-600 py-3 px-4 border-b border-slate-100 whitespace-nowrap">
                          {formatDateThai(request.submittedDate)}
                        </td>
                        <td className="text-[0.8125rem] text-slate-700 font-medium py-3 px-4 border-b border-slate-100 whitespace-nowrap">{request.studentId}</td>
                        <td className="text-[0.8125rem] text-slate-700 font-medium py-3 px-4 border-b border-slate-100 break-words min-w-[120px]">{request.studentName}</td>
                        <td className="text-[0.8125rem] text-slate-600 py-3 px-4 border-b border-slate-100 break-words">{request.department || '-'}</td>
                        <td className="text-[0.8125rem] text-slate-600 py-3 px-4 border-b border-slate-100 min-w-[140px]">
                          <div className="font-medium text-slate-800">{request.company || '-'}</div>
                          {(request.internship_start_date || request.details?.startDate) ? (
                            <div className="text-[0.72rem] text-violet-700 font-medium mt-1 flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              <span>{formatDateThai(request.internship_start_date || request.details?.startDate)} - {formatDateThai(request.internship_end_date || request.details?.endDate)}</span>
                            </div>
                          ) : (
                            <div className="text-[0.72rem] text-slate-400 mt-1">ยังไม่กำหนดวันฝึก</div>
                          )}
                        </td>
                        <td className="py-3 px-4 border-b border-slate-100">
                          <StatusBadge status={getEffectiveInternshipStatus(request)} />
                        </td>
                        <td className="py-3 px-4 border-b border-slate-100 text-center">
                          <button
                            type="button"
                            className="action-menu-trigger p-2 rounded-xl text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition cursor-pointer border-none bg-transparent"
                            onClick={(e) => handleToggleActionMenu(e, request.id)}
                            aria-label="เมนูจัดการคำร้อง"
                          >
                            <MoreVertical className="w-4 h-4 stroke-[2]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">ไม่พบข้อมูลคำร้อง</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>

                {/* Mobile Card View */}
                <div className="block md:hidden">
                  {filteredRequests.map((request) => (
                    <div key={`card-${request.id}`} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs mb-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800">{request.studentId}</span>
                        <StatusBadge status={getEffectiveInternshipStatus(request)} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 break-words">{request.studentName}</div>
                        <div className="text-xs text-slate-400 mt-0.5 break-words">{request.department || '-'}</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-700 font-medium break-words">
                        {request.company || '-'}
                        {(request.internship_start_date || request.details?.startDate) && (
                          <div className="text-[0.7rem] text-violet-700 font-medium mt-1 flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                            <span>{formatDateThai(request.internship_start_date || request.details?.startDate)} - {formatDateThai(request.internship_end_date || request.details?.endDate)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
                        <span className="text-[11px] text-slate-400">ยื่นเมื่อ: {formatDateThai(request.submittedDate)}</span>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/request/${request.id}`)}
                          className="flex items-center gap-0.5 text-xs font-semibold text-violet-600 hover:text-violet-700 transition cursor-pointer border-none bg-transparent py-1 shrink-0"
                        >
                          ดูรายละเอียด
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredRequests.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm">ไม่พบข้อมูลคำร้อง</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Action Dropdown Portal */}
      {actionMenu.id && activeMenuRequest && createPortal(
        <div
          ref={menuPanelRef}
          className="fixed z-[99] w-[180px] bg-white rounded-xl border border-slate-100 shadow-xl py-1.5"
          style={{ top: actionMenu.top, left: actionMenu.left }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActionMenu({ id: null, top: 0, left: 0 });
              navigate(`/dashboard/request/${activeMenuRequest.id}`);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-violet-700 hover:bg-violet-50 transition cursor-pointer border-none bg-transparent text-left"
          >
            <Eye className="w-4 h-4 shrink-0" />
            ดูรายละเอียด
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AllRequestsOverviewPage;

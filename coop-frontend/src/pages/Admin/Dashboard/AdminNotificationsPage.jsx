import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import api from '../../../api/axios';
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Menu as MenuIcon,
  Eye,
  Building2,
  PenTool,
  Paperclip,
  Download,
  Send,
  CalendarDays,
  XCircle,
  Inbox,
} from 'lucide-react';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';
import './AdminDashboardPage.css';

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'เมื่อสักครู่';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} ชั่วโมงที่แล้ว`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} วันที่แล้ว`;
  return date.toLocaleDateString('th-TH');
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
};

const formatDateThai = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH');
};

const getAuthToken = () => {
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed.token) return parsed.token;
    }
  } catch (e) {
    // ignore
  }
  return localStorage.getItem('token') || '';
};

const openDataUrlInNewTab = (dataUrl, fileName = 'evidence.pdf') => {
  if (!dataUrl) return;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  if (isMobile) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  if (dataUrl.startsWith('data:')) {
    try {
      const [header, base64] = dataUrl.split(',');
      const mimeMatch = header.match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
      const byteCharacters = atob(base64);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blobUrl = URL.createObjectURL(new Blob([byteNumbers], { type: mime }));
      window.open(blobUrl, '_blank');
    } catch {
      window.open(dataUrl, '_blank');
    }
  } else {
    window.open(dataUrl, '_blank');
  }
};

const downloadDataUrl = (dataUrl, fileName = 'evidence.pdf') => {
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const parseDispatchLetter = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const isAcceptedNotice = (notice) => {
  const text = `${notice?.title || ''} ${notice?.message || ''}`;
  return !text.includes('ปฏิเสธ');
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'unread', label: 'ยังไม่ได้อ่าน' },
  { value: 'company_response', label: 'การตอบรับของสถานประกอบการ' },
];

const AdminNotificationsPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState({});

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const loadNotifications = async () => {
    const token = getAuthToken();
    try {
      const res = await api.get('/notifications', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setNotifications(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

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
    loadNotifications();
  }, [navigate]);

  const markAsRead = async (noticeId) => {
    const token = getAuthToken();
    try {
      await api.patch(
        `/notifications/${noticeId}/read`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err.response?.data?.message || err.message);
    }
    setNotifications((prev) =>
      prev.map((item) => (item.id === noticeId ? { ...item, is_read: 1 } : item))
    );
  };

  const handleMarkAllRead = async () => {
    const token = getAuthToken();
    setMarkingAll(true);
    try {
      await api.patch(
        '/notifications/read-all',
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
    } catch (err) {
      console.error('Failed to mark all as read:', err.response?.data?.message || err.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleSelectNotice = async (notice) => {
    setSelectedId(notice.id);
    setReplyText(replies[notice.id]?.[replies[notice.id].length - 1]?.draft || '');
    setSelectedRequest(null);
    setPageError('');
    if (!notice.is_read) markAsRead(notice.id);

    if (notice.request_id) {
      setRequestLoading(true);
      try {
        const token = getAuthToken();
        const res = await api.get(`/requests/${notice.request_id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setSelectedRequest(res.data?.data || null);
      } catch (err) {
        console.error('Failed to load request detail:', err.response?.data?.message || err.message);
      } finally {
        setRequestLoading(false);
      }
    }
  };

  const handleSendReply = (notice) => {
    const text = replyText.trim();
    if (!text) return;
    // จำลองการตอบกลับ — ไม่ได้ส่งอีเมลจริง
    setReplies((prev) => ({
      ...prev,
      [notice.id]: [
        ...(prev[notice.id] || []),
        { text, sentAt: new Date().toISOString() },
      ],
    }));
    setReplyText('');
  };

  const handleViewRequest = (notice) => {
    const link = notice.link || (notice.request_id ? `/dashboard/request/${notice.request_id}` : null);
    if (link) navigate(link);
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'company_response') return n.type === 'company_response';
    return true;
  });

  const selectedNotice = notifications.find((n) => n.id === selectedId) || null;
  const details = selectedRequest?.details || {};
  const companyResponse = details.companyResponse || {};
  const dispatchLetter = parseDispatchLetter(selectedRequest?.dispatchLetter || details.dispatchLetter);
  const signatureUrl = details.signature || companyResponse.signature || null;
  const signerName = details.signerName || companyResponse.signerName || '';
  const signerPosition = details.signerPosition || companyResponse.signerPosition || '';
  const internshipStart = selectedRequest?.internship_start_date || details.startDate;
  const internshipEnd = selectedRequest?.internship_end_date || details.endDate;
  const isAccepted = selectedNotice ? isAcceptedNotice(selectedNotice) : true;

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
              onClick={() => (selectedId && window.innerWidth < 768 ? setSelectedId(null) : navigate('/admin-dashboard'))}
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 transition cursor-pointer"
              aria-label="ย้อนกลับ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 grow">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-slate-900 font-extrabold text-xl md:text-2xl tracking-tight m-0">
                  ศูนย์แจ้งเตือนการตอบรับ
                </h1>
                {unreadCount > 0 && (
                  <span className="text-xs font-semibold text-violet-700 bg-violet-100/80 px-2.5 py-1 rounded-lg">
                    {unreadCount} ยังไม่ได้อ่าน
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-1 m-0">จดหมายตอบรับจากสถานประกอบการและความเคลื่อนไหวของคำร้องทั้งหมด</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 px-3.5 text-xs text-slate-700 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition cursor-pointer min-w-[160px]"
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll || unreadCount === 0}
              className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-[0_4px_14px_rgba(124,58,237,0.25)] transition cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-4 h-4" />
              อ่านทั้งหมดแล้ว
            </button>
          </div>

          {pageError && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-xs text-rose-600 font-medium">
              {pageError}
            </div>
          )}

          {/* Inbox Layout */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 w-full">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin stroke-[2.2]" />
              <p className="text-xs font-medium text-slate-400 mt-3 m-0">กำลังโหลดการแจ้งเตือน...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 items-start">
              {/* Left: List View */}
              <div className={`${selectedId ? 'hidden md:block' : 'block'} bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden`}>
                {filtered.length === 0 ? (
                  <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-2">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                      <Check className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <div className="text-sm font-bold text-slate-700">ไม่มีการแจ้งเตือน</div>
                    <div className="text-xs text-slate-400">จดหมายตอบรับใหม่จะแสดงที่นี่</div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 max-h-[70vh] overflow-y-auto">
                    {filtered.map((notice) => {
                      const isUnread = !notice.is_read;
                      const isSelected = notice.id === selectedId;
                      const isCompanyResponse = notice.type === 'company_response';
                      const accepted = isAcceptedNotice(notice);
                      return (
                        <button
                          key={notice.id}
                          type="button"
                          onClick={() => handleSelectNotice(notice)}
                          className={`w-full text-left p-3.5 transition-colors cursor-pointer border-none ${
                            isSelected
                              ? 'bg-violet-50/70 border-l-4 border-l-violet-600'
                              : isUnread
                                ? 'bg-white hover:bg-slate-50 border-l-4 border-l-violet-400'
                                : 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent'
                          }`}
                          style={{ borderTop: 'none', borderRight: 'none', borderBottom: 'none' }}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                              isUnread ? 'bg-violet-50 border-violet-200/80' : 'bg-slate-100/70 border-slate-200/40'
                            }`}>
                              {isCompanyResponse ? (
                                <Building2 className={`w-4 h-4 ${isUnread ? 'text-violet-600' : 'text-slate-400'}`} />
                              ) : (
                                <Bell className={`w-4 h-4 ${isUnread ? 'text-violet-600' : 'text-slate-400'}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`m-0 text-xs leading-snug truncate ${isUnread ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                                  {notice.title}
                                </p>
                                {isUnread && <span className="w-2 h-2 rounded-full bg-violet-600 shrink-0" />}
                              </div>
                              {notice.message && (
                                <p className={`m-0 mt-1 text-[11px] leading-relaxed line-clamp-2 ${isUnread ? 'text-slate-600' : 'text-slate-400'}`}>
                                  {notice.message}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                {isCompanyResponse && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    accepted
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                      : 'bg-rose-50 text-rose-600 border border-rose-100'
                                  }`}>
                                    <span className={`w-1 h-1 rounded-full ${accepted ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    {accepted ? 'ตอบรับ' : 'ปฏิเสธ'}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">{timeAgo(notice.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Reading Pane */}
              <div className={`${selectedId ? 'block' : 'hidden md:block'} bg-white rounded-2xl border border-slate-100 shadow-2xs min-h-[400px]`}>
                {!selectedNotice ? (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center gap-2 py-16 px-4">
                    <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-100 text-violet-500 flex items-center justify-center">
                      <Inbox className="w-7 h-7" />
                    </div>
                    <div className="text-sm font-bold text-slate-700">เลือกจดหมายเพื่ออ่าน</div>
                    <div className="text-xs text-slate-400">คลิกรายการแจ้งเตือนฝั่งซ้ายเพื่อดูรายละเอียดฉบับเต็ม</div>
                  </div>
                ) : (
                  <div className="p-5 sm:p-6">
                    {/* Letter Header */}
                    <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-slate-800 m-0 break-words">{selectedNotice.title}</h2>
                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3 text-slate-300" />
                          <span>{formatDateTime(selectedNotice.created_at)}</span>
                          <span className="text-slate-300">•</span>
                          <span>{timeAgo(selectedNotice.created_at)}</span>
                        </div>
                      </div>
                      {selectedNotice.type === 'company_response' && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
                          isAccepted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}>
                          {isAccepted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {isAccepted ? 'ตอบรับแล้ว' : 'ปฏิเสธ'}
                        </span>
                      )}
                    </div>

                    {/* Letter Body */}
                    <div className="py-4 space-y-4">
                      {selectedNotice.message && (
                        <p className="m-0 text-sm text-slate-700 leading-relaxed break-words">
                          {selectedNotice.message}
                        </p>
                      )}

                      {requestLoading && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                          กำลังโหลดรายละเอียดคำร้อง...
                        </div>
                      )}

                      {selectedRequest && (
                        <>
                          {/* Confirmation Bar */}
                          <div className={`rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs font-semibold ${
                            isAccepted
                              ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                              : 'bg-rose-50 border border-rose-100 text-rose-600'
                          }`}>
                            {isAccepted ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                            {isAccepted
                              ? 'สถานประกอบการยืนยันการรับนักศึกษาเข้าฝึกงานแล้ว'
                              : 'สถานประกอบการปฏิเสธคำร้องฝึกงานนี้'}
                          </div>

                          {/* Internship Dates */}
                          {(internshipStart || internshipEnd) && (
                            <div className="rounded-xl bg-slate-50/70 border border-slate-100 p-3.5 flex items-center gap-2.5">
                              <CalendarDays className="w-4 h-4 text-violet-600 shrink-0" />
                              <div className="text-xs">
                                <span className="text-slate-500">ช่วงวันฝึกงานที่อนุมัติ: </span>
                                <span className="font-semibold text-slate-800">
                                  {formatDateThai(internshipStart)} — {formatDateThai(internshipEnd)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Signature Zone */}
                          {(signatureUrl || signerName) && (
                            <div className="rounded-2xl border border-slate-100 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <PenTool className="w-4 h-4 text-violet-600" />
                                <span className="text-xs font-bold text-slate-700">ลายมือชื่อผู้มีอำนาจ / ผู้ดูแลการฝึกงาน</span>
                              </div>
                              <div className="flex items-end gap-4 flex-wrap">
                                {signatureUrl && (
                                  <div className="w-40 h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                    <img src={signatureUrl} alt="ลายเซ็นสถานประกอบการ" className="max-w-full max-h-full object-contain" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  {signerName && <div className="text-sm font-bold text-slate-800">{signerName}</div>}
                                  {signerPosition && <div className="text-xs text-slate-400 mt-0.5">{signerPosition}</div>}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Attachment Zone */}
                          {dispatchLetter?.dataUrl && (
                            <div className="rounded-2xl border border-slate-100 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Paperclip className="w-4 h-4 text-violet-600" />
                                <span className="text-xs font-bold text-slate-700">เอกสารแนบ</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-slate-50/70 border border-slate-100 p-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100/80 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-violet-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-800 truncate">
                                      {dispatchLetter.fileName || 'หนังสือขอความอนุเคราะห์'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">เอกสารหลักฐานการตอบรับ</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => openDataUrlInNewTab(dispatchLetter.dataUrl, dispatchLetter.fileName || 'หลักฐานการตอบรับ.pdf')}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold transition cursor-pointer border-none"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    เปิดอ่าน
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => downloadDataUrl(dispatchLetter.dataUrl, dispatchLetter.fileName || 'หลักฐานการตอบรับ.pdf')}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-semibold transition cursor-pointer bg-transparent"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    ดาวน์โหลด
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleViewRequest(selectedNotice)}
                              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-[0_4px_14px_rgba(124,58,237,0.25)] transition cursor-pointer border-none"
                            >
                              <Eye className="w-4 h-4" />
                              ดูคำร้องฉบับเต็ม
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Quick Reply */}
                    <div className="pt-4 border-t border-slate-100">
                      <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                        ตอบกลับ / แจ้งประสานงานถึงสถานประกอบการ
                      </label>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="พิมพ์ข้อความตอบกลับหรือรายละเอียดประสานงานเพิ่มเติม..."
                        className="w-full box-border rounded-2xl border border-slate-200 p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 resize-none h-20 text-slate-800 bg-slate-50/50 focus:bg-white transition"
                      />
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="text-[10px] text-slate-400">ระบบจำลอง — ข้อความจะไม่ถูกส่งเป็นอีเมลจริง</span>
                        <button
                          type="button"
                          onClick={() => handleSendReply(selectedNotice)}
                          disabled={!replyText.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-3.5 h-3.5" />
                          ส่งข้อความ
                        </button>
                      </div>

                      {(replies[selectedNotice.id] || []).length > 0 && (
                        <div className="mt-3 space-y-2">
                          {replies[selectedNotice.id].map((reply, idx) => (
                            <div key={idx} className="rounded-xl bg-violet-50/60 border border-violet-100/60 p-3">
                              <div className="text-[10px] text-violet-500 font-semibold mb-1">ตอบกลับเมื่อ {formatDateTime(reply.sentAt)}</div>
                              <p className="m-0 text-xs text-slate-700 leading-relaxed break-words">{reply.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminNotificationsPage;

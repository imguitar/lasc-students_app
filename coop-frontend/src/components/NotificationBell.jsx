import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  Clock,
  Calendar,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import api from '../api/axios';

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

const NotificationBell = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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

  const loadNotifications = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setLoading(true);
      const res = await api.get('/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    const handleCloseOther = (e) => {
      if (e.detail !== 'bell') {
        setOpen(false);
      }
    };
    window.addEventListener('close-navbar-dropdown', handleCloseOther);
    return () => window.removeEventListener('close-navbar-dropdown', handleCloseOther);
  }, []);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        window.dispatchEvent(new CustomEvent('close-navbar-dropdown', { detail: 'bell' }));
      }
      return next;
    });
  };

  const handleMarkAllRead = async (event) => {
    event?.stopPropagation?.();
    const token = getAuthToken();
    try {
      await api.patch(
        '/notifications/read-all',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
    } catch (err) {
      console.error('Failed to mark all as read:', err.response?.data?.message || err.message);
    }
  };

  const handleNotificationClick = async (notice) => {
    if (!notice.is_read) {
      const token = getAuthToken();
      try {
        await api.patch(
          `/notifications/${notice.id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setNotifications((prev) =>
          prev.map((item) => (item.id === notice.id ? { ...item, is_read: 1 } : item))
        );
      } catch (err) {
        console.error('Failed to mark notification read:', err.response?.data?.message || err.message);
      }
    }

    setOpen(false);
    if (notice.link) {
      navigate(notice.link);
    }
  };

  const renderNoticeIcon = (type, isUnread) => {
    const iconColor = isUnread ? 'text-violet-600' : 'text-slate-400';
    const bgClass = isUnread ? 'bg-violet-50 border-violet-200/80' : 'bg-slate-200/50 border-slate-200/40';

    let IconComponent = Info;
    if (type === 'supervision_assigned') {
      IconComponent = Calendar;
    } else if (type === 'supervision_completed') {
      IconComponent = CheckCircle2;
    } else if (type === 'status_updated') {
      IconComponent = FileText;
    } else if (type === 'company_response') {
      IconComponent = CheckCircle2;
    }

    return (
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${bgClass}`}>
        <IconComponent className={`w-4 h-4 ${iconColor}`} />
      </div>
    );
  };

  return (
    <div className="relative inline-flex" ref={containerRef}>
      {/* 1. ปุ่มกระดิ่งแจ้งเตือน (Notification Bell Trigger) */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="การแจ้งเตือน"
        className="group relative h-10 w-10 shrink-0 rounded-[14px] bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer border-none shadow-none outline-none focus:outline-none"
        style={{ border: 'none', boxShadow: 'none' }}
      >
        <Bell className="w-[18px] h-[18px] stroke-[1.6] text-slate-600 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white"></span>
          </span>
        )}
      </button>

      {/* 2. กล่อง Dropdown แจ้งเตือน (Notification Dropdown) */}
      {open && (
        <div
          className="fixed right-3 top-16 sm:absolute sm:right-0 sm:top-12.5 z-50 w-[360px] max-w-[90vw] rounded-[24px] bg-white border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.08)] p-4 flex flex-col gap-4 text-left"
          style={{
            backgroundColor: '#ffffff',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* ส่วน Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Bell size={16} className="text-purple-600 stroke-[2]" />
              </div>
              <span className="text-sm font-bold text-slate-800">
                การแจ้งเตือนด่วน (Quick Alerts)
              </span>
            </div>
            {unreadCount > 0 ? (
              <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full font-bold">
                {unreadCount} ใหม่
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-500 text-xs px-2.5 py-1 rounded-full font-medium">
                อ่านครบแล้ว
              </span>
            )}
          </div>

          {/* ส่วนเนื้อหาแจ้งเตือน / Empty State */}
          <div className="flex flex-col">
            {loading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-violet-500" />
                <p className="text-xs">กำลังโหลดการแจ้งเตือน...</p>
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <Check className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="text-sm font-bold text-slate-700">ไม่มีข้อความแจ้งเตือนใหม่</div>
                <div className="text-xs text-slate-400">คุณอ่านการแจ้งเตือนทั้งหมดเรียบร้อยแล้ว</div>
              </div>
            )}

            {notifications.length > 0 && (
              <div className="max-h-[50vh] sm:max-h-64 overflow-y-auto space-y-2 pr-1">
                {notifications.map((notice) => {
                  const isUnread = !notice.is_read;
                  return (
                    <button
                      key={notice.id}
                      type="button"
                      onClick={() => handleNotificationClick(notice)}
                      className={
                        isUnread
                          ? "block w-full text-left bg-white border border-slate-200 border-l-4 border-l-violet-600 rounded-xl p-3 shadow-xs transition-all hover:bg-slate-50/90 cursor-pointer"
                          : "block w-full text-left bg-slate-50/70 border border-slate-200/50 rounded-xl p-2.5 text-slate-500 transition-all hover:bg-slate-100/70 cursor-pointer"
                      }
                      style={{ borderStyle: 'solid' }}
                    >
                      <div className="flex items-start gap-2.5">
                        {renderNoticeIcon(notice.type, isUnread)}
                        <div className="flex-1 min-w-0">
                          <p className={isUnread ? "text-xs font-semibold text-slate-800 leading-snug break-words" : "text-xs font-medium text-slate-600 leading-snug break-words"}>
                            {notice.title}
                          </p>
                          {notice.message && (
                            <p className={isUnread ? "text-[11px] text-slate-600 mt-0.5 leading-relaxed break-words" : "text-[11px] text-slate-400 mt-0.5 leading-relaxed break-words"}>
                              {notice.message}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3 text-slate-300" />
                            <span>{timeAgo(notice.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ส่วน Footer */}
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer border-0 bg-transparent p-0 outline-none disabled:cursor-default"
              style={{ border: 'none', background: 'transparent' }}
            >
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
              <span>อ่านทั้งหมดแล้ว</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                let role = '';
                try {
                  role = String(JSON.parse(localStorage.getItem('user') || '{}').role || '').toLowerCase();
                } catch (e) {
                  // ignore
                }
                navigate(role === 'admin' ? '/admin-dashboard/notifications' : '/dashboard/notifications');
              }}
              className="text-purple-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer border-0 bg-transparent p-0 outline-none"
              style={{ border: 'none', background: 'transparent' }}
            >
              <span>ดูทั้งหมด (See more)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

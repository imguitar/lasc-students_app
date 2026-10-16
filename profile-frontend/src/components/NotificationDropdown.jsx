import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import {
  Calendar,
  Megaphone,
  CheckCircle2,
  FileText,
  Info,
  Trash2,
  CheckCheck,
  BellOff,
  ExternalLink,
  Loader2,
  X
} from 'lucide-react';

// Format relative time in Thai
const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'เมื่อสักครู่';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} ชั่วโมงที่แล้ว`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'เมื่อวานนี้';
  if (diffDay < 7) return `${diffDay} วันที่แล้ว`;

  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  });
};

const NotificationDropdown = ({ onClose }) => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotification();

  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const filteredNotifications = notifications.filter(item => {
    if (filter === 'unread') return !item.is_read;
    return true;
  });

  const handleItemClick = async (item) => {
    if (!item.is_read) {
      await markAsRead(item.id);
    }
    if (onClose) onClose();

    if (item.link) {
      navigate(item.link);
    } else if (item.type === 'activity' || item.type === 'news') {
      navigate('/news-events');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  // Icon resolver based on notification type
  const renderIcon = (type, isRead) => {
    switch (type) {
      case 'activity':
      case 'event':
      case 'event_created':
        return (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            isRead ? 'bg-purple-50 text-purple-400' : 'bg-purple-100 text-purple-700'
          }`}>
            <Calendar size={18} />
          </div>
        );
      case 'news':
      case 'news_created':
        return (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            isRead ? 'bg-sky-50 text-sky-400' : 'bg-sky-100 text-sky-700'
          }`}>
            <Megaphone size={18} />
          </div>
        );
      case 'status_updated':
      case 'request_status':
        return (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            isRead ? 'bg-emerald-50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <CheckCircle2 size={18} />
          </div>
        );
      case 'supervision':
        return (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            isRead ? 'bg-amber-50 text-amber-400' : 'bg-amber-100 text-amber-700'
          }`}>
            <FileText size={18} />
          </div>
        );
      default:
        return (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            isRead ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-700'
          }`}>
            <Info size={18} />
          </div>
        );
    }
  };

  return (
    <div className="w-full sm:w-[420px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-purple-100/80 overflow-hidden flex flex-col max-h-[82vh] sm:max-h-[580px] animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-purple-100/60 bg-gradient-to-r from-purple-50/60 via-white to-purple-50/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-gray-900 text-base">การแจ้งเตือน</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-purple-600 text-white rounded-full shadow-sm animate-pulse">
                {unreadCount} ใหม่
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1.5">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-purple-600 hover:text-purple-800 flex items-center space-x-1 hover:bg-purple-100/60 px-2 sm:px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                title="ทำเครื่องหมายว่าอ่านทั้งหมด"
              >
                <CheckCheck size={14} className="mr-0.5" />
                <span>อ่านทั้งหมด</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 sm:hidden transition-colors cursor-pointer"
              aria-label="ปิดการแจ้งเตือน"
              title="ปิด"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 bg-purple-100/40 p-1 rounded-xl text-xs font-medium text-gray-600">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-purple-900 font-semibold shadow-xs'
                : 'hover:text-purple-700 hover:bg-white/50'
            }`}
          >
            ทั้งหมด ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
              filter === 'unread'
                ? 'bg-white text-purple-900 font-semibold shadow-xs'
                : 'hover:text-purple-700 hover:bg-white/50'
            }`}
          >
            ยังไม่อ่าน ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto flex-1 divide-y divide-gray-100/80 max-h-[calc(82vh-170px)] sm:max-h-[400px]">
        {loading && notifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
            <Loader2 className="animate-spin text-purple-600" size={24} />
            <span className="text-xs">กำลังโหลดการแจ้งเตือน...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-300 flex items-center justify-center mb-3">
              <BellOff size={24} />
            </div>
            <p className="text-sm font-semibold text-gray-700">ไม่มีการแจ้งเตือน</p>
            <p className="text-xs text-gray-400 mt-1">
              {filter === 'unread'
                ? 'คุณอ่านการแจ้งเตือนทั้งหมดแล้ว'
                : 'เมื่อมีกิจกรรม ข่าวสาร หรือข้อมูลใหม่ ระบบจะแจ้งเตือนที่นี่'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`p-3.5 sm:p-4 flex items-start space-x-3 transition-colors cursor-pointer group relative ${
                item.is_read
                  ? 'hover:bg-gray-50/80 bg-white'
                  : 'bg-purple-50/30 hover:bg-purple-50/70 border-l-3 border-purple-600'
              }`}
            >
              {renderIcon(item.type, item.is_read)}

              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center space-x-2">
                  <h4 className={`text-sm leading-snug truncate ${
                    item.is_read ? 'font-medium text-gray-700' : 'font-bold text-gray-900 group-hover:text-purple-700'
                  }`}>
                    {item.title}
                  </h4>
                  {!item.is_read && (
                    <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                  )}
                </div>

                {item.message && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>
                )}

                <div className="flex items-center space-x-2 mt-2 text-[11px] text-gray-400">
                  <span>{timeAgo(item.created_at)}</span>
                  {item.link && (
                    <>
                      <span>•</span>
                      <span className="text-purple-600 group-hover:underline flex items-center">
                        ดูรายละเอียด
                        <ExternalLink size={10} className="ml-1" />
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons on hover */}
              <button
                onClick={(e) => handleDelete(e, item.id)}
                className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="ลบการแจ้งเตือนนี้"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50/80 border-t border-purple-100/40 text-center">
        <button
          onClick={() => {
            if (onClose) onClose();
            navigate('/news-events');
          }}
          className="text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline transition-colors cursor-pointer"
        >
          ไปที่หน้าข่าวสารและกิจกรรมทั้งหมด →
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;

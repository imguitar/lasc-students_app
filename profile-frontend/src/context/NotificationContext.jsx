import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notification.service';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';
import { useToast } from '../components/ui/use-toast';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // โหลดรายการแจ้งเตือนจาก API
  const fetchNotifications = useCallback(async (params = { limit: 50 }) => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    try {
      setLoading(true);
      const res = await notificationService.getNotifications(params);
      if (res && res.success) {
        setNotifications(res.data || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.warn('[NotificationContext] Failed to load notifications:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // โหลดเฉพาะจำนวนที่ยังไม่อ่านแบบ lightweight
  const fetchUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    try {
      const res = await notificationService.getUnreadCount();
      if (res && res.success) {
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      // ignore
    }
  }, [user]);

  // ทำเครื่องหมายว่าอ่านแล้ว (รายการเดียว)
  const markAsRead = async (id) => {
    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(item => (item.id === id ? { ...item, is_read: true } : item))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      await notificationService.markAsRead(id);
    } catch (err) {
      console.error('[NotificationContext] Failed to mark as read:', err);
      // Revert if needed
      fetchNotifications();
    }
  };

  // ทำเครื่องหมายว่าอ่านทั้งหมด
  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(item => ({ ...item, is_read: true })));
      setUnreadCount(0);

      await notificationService.markAllAsRead();
    } catch (err) {
      console.error('[NotificationContext] Failed to mark all as read:', err);
      fetchNotifications();
    }
  };

  // ลบการแจ้งเตือน
  const deleteNotification = async (id) => {
    try {
      const target = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(item => item.id !== id));
      if (target && !target.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      await notificationService.deleteNotification(id);
    } catch (err) {
      console.error('[NotificationContext] Failed to delete notification:', err);
      fetchNotifications();
    }
  };

  // เมื่อล็อกอินเข้ามา ให้โหลดการแจ้งเตือน
  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Polling fallback ทุก 60 วินาที
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 60000);

      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications, fetchUnreadCount]);

  // เชื่อมต่อ Socket.IO สำหรับ Real-time Notification Push
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (notification) => {
      if (!notification) return;

      // 1. เพิ่มรายการใหม่ไว้บนสุดของ state
      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== notification.id);
        return [notification, ...filtered];
      });

      // 2. เพิ่มจำนวนที่ยังไม่ได้อ่าน
      setUnreadCount(prev => prev + 1);

      // 3. แสดง Toast alert แบบ Real-time
      toast({
        title: notification.title || 'การแจ้งเตือนใหม่',
        description: notification.message || 'คุณมีรายการแจ้งเตือนใหม่ในระบบ',
        duration: 5000
      });
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [user, toast]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;

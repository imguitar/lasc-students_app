import api from './api';

export const notificationService = {
  // ดึงรายการแจ้งเตือนของผู้ใช้ปัจจุบัน
  getNotifications: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  // ดึงจำนวนที่ยังไม่ได้อ่าน
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  // ทำเครื่องหมายรายการเดียวว่าอ่านแล้ว
  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  // ทำเครื่องหมายว่าอ่านทั้งหมด
  markAllAsRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  // ลบการแจ้งเตือน
  deleteNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  }
};

export default notificationService;

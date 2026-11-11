import api from './api';

export const userManagementService = {
  getStats: async () => {
    const response = await api.get('/admin/users/stats');
    return response.data;
  },

  getAll: async (params) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  checkAvailability: async (params) => {
    const response = await api.get('/admin/users/check-availability', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
  },

  updateStatus: async (id, isActive, reason = '') => {
    const response = await api.patch(`/admin/users/${id}/status`, { isActive, reason });
    return response.data;
  },

  resetPassword: async (id, data) => {
    const response = await api.post(`/admin/users/${id}/reset-password`, data);
    return response.data;
  },

  delete: async (id, mode = 'account_only') => {
    const response = await api.delete(`/admin/users/${id}`, { params: { mode } });
    return response.data;
  },

  getAuditLogs: async (params) => {
    const response = await api.get('/admin/users/audit-logs', { params });
    return response.data;
  }
};


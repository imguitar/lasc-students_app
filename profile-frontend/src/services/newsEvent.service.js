import api from './api';

export const newsEventService = {
  // Get all news and events with optional query params: month, year, type, is_published, search
  getAll: async (params = {}) => {
    const response = await api.get('/news-events', { params });
    return response.data;
  },

  // Get single news/event by ID
  getById: async (id) => {
    const response = await api.get(`/news-events/${id}`);
    return response.data;
  },

  // Create news/event (Admin only)
  create: async (data) => {
    const response = await api.post('/news-events', data);
    return response.data;
  },

  // Update news/event (Admin only)
  update: async (id, data) => {
    const response = await api.put(`/news-events/${id}`, data);
    return response.data;
  },

  // Delete news/event (Admin only)
  delete: async (id) => {
    const response = await api.delete(`/news-events/${id}`);
    return response.data;
  },

  // Toggle pin status (Admin only)
  togglePin: async (id) => {
    const response = await api.patch(`/news-events/${id}/pin`);
    return response.data;
  },

  // Toggle publish status (Admin only)
  togglePublish: async (id) => {
    const response = await api.patch(`/news-events/${id}/publish`);
    return response.data;
  },

  // Email Notifications (Admin only)
  getEmailRecipients: async (id, params = {}) => {
    const response = await api.get(`/news-events/${id}/email-recipients`, { params });
    return response.data;
  },

  sendEmailBatch: async (id, data = {}) => {
    const response = await api.post(`/news-events/${id}/send-email`, data);
    return response.data;
  },

  getEmailHistory: async (id) => {
    const response = await api.get(`/news-events/${id}/email-history`);
    return response.data;
  },

  retryFailedEmail: async (id, data = {}) => {
    const response = await api.post(`/news-events/${id}/retry-failed-email`, data);
    return response.data;
  }
};

export default newsEventService;

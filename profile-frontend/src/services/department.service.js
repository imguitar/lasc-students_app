import api from './api';

export const departmentService = {
  getAll: async (params) => {
    try {
      const response = await api.get('/departments', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getById: async (id) => {
    try {
      const response = await api.get(`/departments/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // กำหนดประธานสาขาวิชา — ส่ง null เพื่อยกเลิกการกำหนด
  updateHead: async (id, department_head_id) => {
    try {
      const response = await api.put(`/departments/${id}/head`, { department_head_id });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getStats: async (id) => {
    try {
      const response = await api.get(`/departments/${id}/stats`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCounts: async () => {
    try {
      const response = await api.get('/departments/counts');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

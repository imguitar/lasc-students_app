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
  }
};

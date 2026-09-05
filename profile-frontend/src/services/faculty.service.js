import api from './api';

export const facultyService = {
  getAll: async () => {
    try {
      const response = await api.get('/faculties');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getById: async (id) => {
    try {
      const response = await api.get(`/faculties/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

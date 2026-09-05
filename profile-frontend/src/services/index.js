import api from './api';

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.success) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.success) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

export const studentService = {
  getAll: async (params) => {
    const response = await api.get('/students', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/students', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  }
};

export const alumniService = {
  getAll: async (params) => {
    const response = await api.get('/alumni', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/alumni/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/alumni', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/alumni/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/alumni/${id}`);
    return response.data;
  }
};

export const projectService = {
  getAll: async (params) => {
    const response = await api.get('/projects', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  }
};

export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getAlumniByFaculty: async () => {
    const response = await api.get('/dashboard/alumni-by-faculty');
    return response.data;
  },

  getAlumniByYear: async () => {
    const response = await api.get('/dashboard/alumni-by-year');
    return response.data;
  },

  getStudentsByFaculty: async () => {
    const response = await api.get('/dashboard/students-by-faculty');
    return response.data;
  },

  getRecentAlumni: async () => {
    const response = await api.get('/dashboard/recent-alumni');
    return response.data;
  },

  getAwardedProjects: async () => {
    const response = await api.get('/dashboard/awarded-projects');
    return response.data;
  }
};

export const advisorService = {
  getAll: async (params) => {
    const response = await api.get('/advisors', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/advisors/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/advisors', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/advisors/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/advisors/${id}`);
    return response.data;
  },

  generateNextId: async () => {
    const response = await api.get('/advisors/next-id/generate');
    return response.data;
  }
};

export { departmentService } from './department.service';
export { facultyService } from './faculty.service';

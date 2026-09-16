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

  getByCode: async (code) => {
    const response = await api.get(`/students/code/${code}`);
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
  },

  promoteToAlumni: async (id, data) => {
    const response = await api.post(`/students/${id}/promote`, data);
    return response.data;
  },

  // Resume
  getResume: async (id) => {
    const response = await api.get(`/students/${id}/resume`);
    return response.data;
  },

  updateResume: async (id, data) => {
    const response = await api.put(`/students/${id}/resume`, data);
    return response.data;
  },

  // Skills
  getSkills: async (id) => {
    const response = await api.get(`/students/${id}/skills`);
    return response.data;
  },

  addSkill: async (id, data) => {
    const response = await api.post(`/students/${id}/skills`, data);
    return response.data;
  },

  deleteSkill: async (id, skillId) => {
    const response = await api.delete(`/students/${id}/skills/${skillId}`);
    return response.data;
  },

  // Internships
  getInternships: async (id) => {
    const response = await api.get(`/students/${id}/internships`);
    return response.data;
  },

  createInternship: async (id, data) => {
    const response = await api.post(`/students/${id}/internships`, data);
    return response.data;
  },

  updateInternship: async (id, internshipId, data) => {
    const response = await api.put(`/students/${id}/internships/${internshipId}`, data);
    return response.data;
  },

  deleteInternship: async (id, internshipId) => {
    const response = await api.delete(`/students/${id}/internships/${internshipId}`);
    return response.data;
  },

  // Semester Projects
  getProjects: async (id) => {
    const response = await api.get(`/students/${id}/projects`);
    return response.data;
  },

  createProject: async (id, data) => {
    const response = await api.post(`/students/${id}/projects`, data);
    return response.data;
  },

  updateProject: async (id, projectId, data) => {
    const response = await api.put(`/students/${id}/projects/${projectId}`, data);
    return response.data;
  },

  deleteProject: async (id, projectId) => {
    const response = await api.delete(`/students/${id}/projects/${projectId}`);
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
  },

  // Employment
  addEmployment: async (data) => {
    const response = await api.post('/alumni/employment', data);
    return response.data;
  },

  updateEmployment: async (id, data) => {
    const response = await api.put(`/alumni/employment/${id}`, data);
    return response.data;
  },

  deleteEmployment: async (id) => {
    const response = await api.delete(`/alumni/employment/${id}`);
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

  updateStatus: async (id, status) => {
    const response = await api.put(`/projects/${id}/status`, { status });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  }
};

export const skillService = {
  getAll: async (params) => {
    const response = await api.get('/skills', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/skills', data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/skills/${id}`);
    return response.data;
  }
};

export const studentProjectService = {
  getAll: async (params) => {
    const response = await api.get('/student-projects', { params });
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
  },

  getStudentReport: async (params) => {
    const response = await api.get('/dashboard/student-report', { params });
    return response.data;
  },

  getProjectReport: async (params) => {
    const response = await api.get('/dashboard/project-report', { params });
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

// เข้าระบบศูนย์ฝึกประสบการณ์โดยไม่ต้องล็อกอินใหม่
export const coopSsoService = {
  // ขอตั๋วอายุสั้นจากระบบนี้ แล้วเปิดระบบศูนย์ฝึกพร้อมตั๋ว
  openCoopSystem: async () => {
    const response = await api.post('/auth/sso-ticket');
    const ticket = response.data?.data?.ticket;
    if (!ticket) throw new Error('ไม่ได้รับตั๋วเข้าใช้งานจากเซิร์ฟเวอร์');

    const base = (import.meta.env.VITE_COOP_URL || 'http://localhost:5173/coop').replace(/\/+$/, '');
    return `${base}/sso?ticket=${encodeURIComponent(ticket)}`;
  }
};

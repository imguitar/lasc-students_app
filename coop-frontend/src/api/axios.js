import axios from 'axios';
import { redirectToProfileLogin } from '../utils/sso';

const getApiBaseUrl = () => {
  let url = import.meta.env.VITE_API_BASE_URL || 'https://students.sci-sskru.com/coop/api';
  url = url.trim().replace(/\/+$/, '');
  if (!url.endsWith('/api') && !url.includes('/api/')) {
    url += '/api';
  }
  return url;
};

export const API_BASE = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-attach JWT token from localStorage
api.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    let token = localStorage.getItem('token');
    if (!token) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.token) {
            token = user.token;
          }
        } catch (e) {
          // ignore
        }
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses (token expired / invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const path = window.location.pathname;
      if (!path.startsWith('/coop/public/')) {
        localStorage.removeItem('user');
        if (path !== '/coop/' && !path.includes('/sso')) {
          redirectToProfileLogin();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

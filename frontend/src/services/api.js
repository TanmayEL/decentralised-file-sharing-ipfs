import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  register: (username, email, password) => {
    return api.post('/register', { username, email, password });
  },
  
  login: (email, password) => {
    return api.post('/login', { email, password });
  },
  
  getProfile: () => {
    return api.get('/profile');
  }
};

// File API
export const fileAPI = {
  uploadFile: (formData) => {
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  downloadFile: (hash) => {
    return api.get(`/file/${hash}`, {
      responseType: 'blob',
    });
  },

  getFileMetadata: (hash) => {
    return api.get(`/metadata/${hash}`);
  },

  getUserFiles: () => {
    return api.get('/files');
  },

  getPublicFiles: () => {
    return api.get('/public-files');
  },

  shareFile: (hash, userIds) => {
    return api.post(`/share/${hash}`, { userIds });
  },

  deleteFile: (hash) => {
    return api.delete(`/file/${hash}`);
  }
};

export default api;

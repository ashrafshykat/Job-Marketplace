import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Users
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  assignBuyer: (id: string) => api.put(`/users/${id}/assign-buyer`),
  updateProfile: (data: { bio?: string; skills?: string[]; experience?: string; portfolio?: string }) =>
    api.put('/users/profile', data),
};

// Projects
export const projectsAPI = {
  create: (data: { title: string; description: string; budget?: number; deadline?: string }) =>
    api.post('/projects', data),
  getAll: () => api.get('/projects'),
  getById: (id: string) => api.get(`/projects/${id}`),
  assign: (id: string, solverId: string) =>
    api.put(`/projects/${id}/assign`, { solverId }),
};

// Requests
export const requestsAPI = {
  create: (data: { projectId: string; message?: string }) =>
    api.post('/requests', data),
  getAll: () => api.get('/requests'),
  getByProject: (projectId: string) => api.get(`/requests/project/${projectId}`),
};

// Tasks
export const tasksAPI = {
  create: (data: { projectId: string; title: string; description: string; deadline: string }) =>
    api.post('/tasks', data),
  getAll: () => api.get('/tasks'),
  getByProject: (projectId: string) => api.get(`/tasks/project/${projectId}`),
  getById: (id: string) => api.get(`/tasks/${id}`),
  update: (id: string, data: { title?: string; description?: string; deadline?: string; status?: string }) =>
    api.put(`/tasks/${id}`, data),
};

// Submissions
export const submissionsAPI = {
  create: (taskId: string, file: File, message?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('taskId', taskId);
    if (message) formData.append('message', message);
    return api.post('/submissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getAll: () => api.get('/submissions'),
  getByTask: (taskId: string) => api.get(`/submissions/task/${taskId}`),
  review: (id: string, status: 'accepted' | 'rejected') =>
    api.put(`/submissions/${id}/review`, { status }),
  download: (id: string) =>
    api.get(`/submissions/${id}/download`, { responseType: 'blob' }),
};

export default api;


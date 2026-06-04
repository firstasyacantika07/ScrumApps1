import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (user?.tenant_id) {
    config.headers['X-Tenant-ID'] = user.tenant_id;
  }

  return config;
});

export default api;
import axios from 'axios';

const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : 'https://admin-moderator-backend-staging.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
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
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
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

export const getErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data && typeof data === 'object') {
      if ('message' in data && typeof data.message === 'string') {
        return data.message;
      }
      if ('error' in data && typeof data.error === 'string') {
        return data.error;
      }
    }
  }
  return err instanceof Error ? err.message : 'An unexpected error occurred';
};

export default api;

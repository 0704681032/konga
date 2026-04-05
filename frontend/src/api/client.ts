import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import type { Credentials } from '../types';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const credentialsStr = localStorage.getItem('credentials');
    if (credentialsStr) {
      const credentials: Credentials = JSON.parse(credentialsStr);
      if (credentials.token) {
        config.headers.Authorization = `Bearer ${credentials.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear credentials and redirect to login
      localStorage.removeItem('credentials');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
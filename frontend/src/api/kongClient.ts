import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import type { Credentials } from '../types';

// Create axios instance for Kong API (no /api prefix)
const kongClient: AxiosInstance = axios.create({
  baseURL: '/kong',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - add auth token
kongClient.interceptors.request.use(
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
kongClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('credentials');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default kongClient;
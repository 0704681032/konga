import axios from 'axios';
import type { Credentials, User } from '../types';

// Base URL for auth endpoints that conflict with SPA routes in dev mode
const AUTH_BASE_URL = import.meta.env.DEV ? 'http://localhost:1337' : '';

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const authApi = {
  /**
   * Login with credentials
   */
  login: async (credentials: LoginCredentials): Promise<Credentials> => {
    const response = await axios.post<Credentials>(`${AUTH_BASE_URL}/login`, credentials, { withCredentials: true });
    return response.data;
  },

  /**
   * Register new user (first time setup)
   */
  register: async (data: RegisterData): Promise<Credentials> => {
    const response = await axios.post<Credentials>(`${AUTH_BASE_URL}/register`, data, { withCredentials: true });
    return response.data;
  },

  /**
   * Logout - clear local storage
   */
  logout: (): void => {
    localStorage.removeItem('credentials');
  },

  /**
   * Activate account with token
   */
  activate: async (token: string): Promise<void> => {
    await axios.get(`${AUTH_BASE_URL}/auth/activate/${token}`);
  },

  /**
   * Get current user info
   */
  getCurrentUser: async (): Promise<User> => {
    const credentials = authApi.getCredentials();
    const response = await axios.get<{ data: User }>('/api/user/me', {
      headers: credentials?.token ? { Authorization: `Bearer ${credentials.token}` } : {},
    });
    return response.data.data;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    const credentialsStr = localStorage.getItem('credentials');
    if (!credentialsStr) return false;
    try {
      const credentials: Credentials = JSON.parse(credentialsStr);
      return !!credentials.token;
    } catch {
      return false;
    }
  },

  /**
   * Get stored credentials
   */
  getCredentials: (): Credentials | null => {
    const credentialsStr = localStorage.getItem('credentials');
    if (!credentialsStr) return null;
    try {
      return JSON.parse(credentialsStr);
    } catch {
      return null;
    }
  },

  /**
   * Store credentials
   */
  setCredentials: (credentials: Credentials): void => {
    localStorage.setItem('credentials', JSON.stringify(credentials));
  },
};

export default authApi;
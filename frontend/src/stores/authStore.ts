import { create } from 'zustand';
import type { User, Credentials, Permissions } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  permissions: Permissions;
  login: (credentials: Credentials) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  hasPermission: (context: string, action: string) => boolean;
}

// Default permissions (can be overridden by server config)
const defaultPermissions: Permissions = {
  connections: { create: true, read: true, update: true, delete: true },
  services: { create: true, read: true, update: true, delete: true },
  routes: { create: true, read: true, update: true, delete: true },
  consumers: { create: true, read: true, update: true, delete: true },
  plugins: { create: true, read: true, update: true, delete: true },
  upstreams: { create: true, read: true, update: true, delete: true },
  certificates: { create: true, read: true, update: true, delete: true },
  snapshots: { create: true, read: true, update: true, delete: true },
  users: { create: true, read: true, update: true, delete: true },
  settings: { create: true, read: true, update: true, delete: true },
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  permissions: defaultPermissions,

  login: (credentials: Credentials) => {
    localStorage.setItem('credentials', JSON.stringify(credentials));
    set({
      user: credentials.user,
      token: credentials.token,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('credentials');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  setUser: (user: User | null) => {
    set({ user });
  },

  hasPermission: (context: string, action: string): boolean => {
    const { user, permissions } = get();

    // Admin has all permissions
    if (user?.admin) return true;

    // Check if context exists in permissions
    if (!permissions[context]) return true;

    // Check specific permission
    return permissions[context][action as keyof typeof permissions[typeof context]] ?? true;
  },
}));

// Initialize from localStorage
const initAuth = () => {
  const credentialsStr = localStorage.getItem('credentials');
  if (credentialsStr) {
    try {
      const credentials: Credentials = JSON.parse(credentialsStr);
      useAuthStore.getState().login(credentials);
    } catch {
      localStorage.removeItem('credentials');
    }
  }
};

initAuth();
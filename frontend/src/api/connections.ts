import apiClient from './client';
import { useAuthStore } from '../stores/authStore';
import type { KongNode, User } from '../types';

export interface CreateConnectionData {
  name: string;
  type: 'default' | 'key_auth' | 'jwt' | 'basic_auth';
  kong_admin_url: string;
  kong_api_key?: string;
  jwt_algorithm?: 'HS256' | 'RS256';
  jwt_key?: string;
  jwt_secret?: string;
  username?: string;
  password?: string;
  health_checks?: boolean;
}

const connectionApi = {
  /**
   * List all connections
   */
  list: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<KongNode[]>('/kongnode', { params });
    // Backend returns array directly, not wrapped in {data: ...}
    return { data: response.data };
  },

  /**
   * Get single connection
   */
  get: async (id: number) => {
    const response = await apiClient.get<KongNode>(`/kongnode/${id}`);
    return response.data;
  },

  /**
   * Create new connection
   */
  create: async (data: CreateConnectionData) => {
    const response = await apiClient.post<KongNode>('/kongnode', data);
    return response.data;
  },

  /**
   * Update connection
   */
  update: async (id: number, data: Partial<CreateConnectionData>) => {
    const response = await apiClient.put<KongNode>(`/kongnode/${id}`, data);
    return response.data;
  },

  /**
   * Delete connection
   */
  delete: async (id: number) => {
    await apiClient.delete(`/kongnode/${id}`);
  },

  /**
   * Activate connection for current user
   */
  activate: async (nodeId: number) => {
    const user = useAuthStore.getState().user;
    if (!user?.id) throw new Error('User not authenticated');
    // Backend expects 'node' property with the connection ID
    const response = await apiClient.put<User>(`/user/${user.id}`, { node: nodeId });
    return response.data;
  },

  /**
   * Deactivate connection
   */
  deactivate: async () => {
    const user = useAuthStore.getState().user;
    if (!user?.id) throw new Error('User not authenticated');
    // Set node to null to deactivate
    const response = await apiClient.put<User>(`/user/${user.id}`, { node: null });
    return response.data;
  },

  /**
   * Test connection
   */
  test: async (url: string) => {
    const response = await apiClient.get(url, { baseURL: '' });
    return response.data;
  },
};

export default connectionApi;
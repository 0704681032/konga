import { create } from 'zustand';
import type { KongNode, GatewayInfo, KongStatus } from '../types';
import connectionApi from '../api/connections';
import kongApi from '../api/kong';
import { useAuthStore } from './authStore';

interface ConnectionState {
  nodes: KongNode[];
  activeNode: KongNode | null;
  gatewayInfo: GatewayInfo | null;
  gatewayStatus: KongStatus | null;
  loading: boolean;
  error: string | null;

  fetchNodes: () => Promise<void>;
  setActiveNode: (node: KongNode | null) => void;
  fetchGatewayInfo: () => Promise<void>;
  fetchGatewayStatus: () => Promise<void>;
  activateNode: (nodeId: number) => Promise<void>;
  deactivateNode: () => Promise<void>;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  nodes: [],
  activeNode: null,
  gatewayInfo: null,
  gatewayStatus: null,
  loading: false,
  error: null,

  fetchNodes: async () => {
    set({ loading: true, error: null });
    try {
      const response = await connectionApi.list();
      set({ nodes: response.data || [], loading: false });

      // Set active node from user's node field
      const user = useAuthStore.getState().user;
      // Backend returns 'node' field (number ID), not 'node_id'
      const userNodeId = user?.node || user?.node_id;
      if (userNodeId) {
        const activeNode = (response.data || []).find(n => String(n.id) === String(userNodeId));
        if (activeNode) {
          set({ activeNode });
          // Fetch gateway info after setting active node
          get().fetchGatewayInfo();
        }
      }
    } catch (error) {
      set({ error: 'Failed to fetch connections', loading: false });
    }
  },

  setActiveNode: (node: KongNode | null) => {
    set({ activeNode: node });
    if (node) {
      get().fetchGatewayInfo();
    } else {
      set({ gatewayInfo: null, gatewayStatus: null });
    }
  },

  fetchGatewayInfo: async () => {
    try {
      const info = await kongApi.getGatewayInfo();
      set({ gatewayInfo: info });
    } catch {
      set({ gatewayInfo: null });
    }
  },

  fetchGatewayStatus: async () => {
    try {
      const status = await kongApi.getGatewayStatus();
      set({ gatewayStatus: status });
    } catch {
      set({ gatewayStatus: null });
    }
  },

  activateNode: async (nodeId: number) => {
    try {
      const user = await connectionApi.activate(nodeId);
      useAuthStore.getState().setUser(user);

      const node = get().nodes.find(n => n.id === nodeId);
      if (node) {
        set({ activeNode: node });
        get().fetchGatewayInfo();
      }
    } catch (error) {
      throw error;
    }
  },

  deactivateNode: async () => {
    try {
      const user = await connectionApi.deactivate();
      useAuthStore.getState().setUser(user);
      set({ activeNode: null, gatewayInfo: null, gatewayStatus: null });
    } catch (error) {
      throw error;
    }
  },
}));
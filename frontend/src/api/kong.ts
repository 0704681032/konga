import kongClient from './kongClient';
import apiClient from './client';
import type {
  KongService,
  KongRoute,
  KongConsumer,
  KongPlugin,
  KongUpstream,
  KongTarget,
  KongCertificate,
  GatewayInfo,
  KongStatus,
} from '../types';

// Generic Kong API proxy - uses /kong routes (not /api/kong)
const kongApi = {
  // Services
  listServices: async (params?: Record<string, unknown>) => {
    const response = await kongClient.get<{ data: KongService[]; next?: string }>('/services', { params });
    return response.data;
  },

  getService: async (id: string) => {
    const response = await kongClient.get<KongService>(`/services/${id}`);
    return response.data;
  },

  createService: async (data: Partial<KongService>) => {
    const response = await kongClient.post<KongService>('/services', data);
    return response.data;
  },

  updateService: async (id: string, data: Partial<KongService>) => {
    const response = await kongClient.put<KongService>(`/services/${id}`, data);
    return response.data;
  },

  deleteService: async (id: string) => {
    await kongClient.delete(`/services/${id}`);
  },

  // Routes
  listRoutes: async (params?: Record<string, unknown>) => {
    const response = await kongClient.get<{ data: KongRoute[]; next?: string }>('/routes', { params });
    return response.data;
  },

  getRoute: async (id: string) => {
    const response = await kongClient.get<KongRoute>(`/routes/${id}`);
    return response.data;
  },

  createRoute: async (data: Partial<KongRoute>) => {
    const response = await kongClient.post<KongRoute>('/routes', data);
    return response.data;
  },

  updateRoute: async (id: string, data: Partial<KongRoute>) => {
    const response = await kongClient.put<KongRoute>(`/routes/${id}`, data);
    return response.data;
  },

  deleteRoute: async (id: string) => {
    await kongClient.delete(`/routes/${id}`);
  },

  // Consumers
  listConsumers: async (params?: Record<string, unknown>) => {
    const response = await kongClient.get<{ data: KongConsumer[]; next?: string }>('/consumers', { params });
    return response.data;
  },

  getConsumer: async (id: string) => {
    const response = await kongClient.get<KongConsumer>(`/consumers/${id}`);
    return response.data;
  },

  createConsumer: async (data: Partial<KongConsumer>) => {
    const response = await kongClient.post<KongConsumer>('/consumers', data);
    return response.data;
  },

  updateConsumer: async (id: string, data: Partial<KongConsumer>) => {
    const response = await kongClient.put<KongConsumer>(`/consumers/${id}`, data);
    return response.data;
  },

  deleteConsumer: async (id: string) => {
    await kongClient.delete(`/consumers/${id}`);
  },

  // Plugins
  listPlugins: async (params?: Record<string, unknown>) => {
    const response = await kongClient.get<{ data: KongPlugin[]; next?: string }>('/plugins', { params });
    return response.data;
  },

  getPlugin: async (id: string) => {
    const response = await kongClient.get<KongPlugin>(`/plugins/${id}`);
    return response.data;
  },

  createPlugin: async (data: Partial<KongPlugin>) => {
    const response = await kongClient.post<KongPlugin>('/plugins', data);
    return response.data;
  },

  updatePlugin: async (id: string, data: Partial<KongPlugin>) => {
    const response = await kongClient.put<KongPlugin>(`/plugins/${id}`, data);
    return response.data;
  },

  deletePlugin: async (id: string) => {
    await kongClient.delete(`/plugins/${id}`);
  },

  getPluginSchema: async (name: string) => {
    const response = await kongClient.get(`/plugins/schema/${name}`);
    return response.data;
  },

  listAvailablePlugins: async () => {
    // This uses /api/kong_plugins/list
    // Returns array of plugin groups: [{ name: "Authentication", plugins: { "basic-auth": {...} } }]
    const response = await apiClient.get<Array<{ name: string; plugins?: Record<string, unknown> }>>('/kong_plugins/list');
    return response.data;
  },

  // Upstreams
  listUpstreams: async (params?: Record<string, unknown>) => {
    const response = await kongClient.get<{ data: KongUpstream[]; next?: string }>('/upstreams', { params });
    return response.data;
  },

  getUpstream: async (id: string) => {
    const response = await kongClient.get<KongUpstream>(`/upstreams/${id}`);
    return response.data;
  },

  createUpstream: async (data: Partial<KongUpstream>) => {
    const response = await kongClient.post<KongUpstream>('/upstreams', data);
    return response.data;
  },

  updateUpstream: async (id: string, data: Partial<KongUpstream>) => {
    const response = await kongClient.put<KongUpstream>(`/upstreams/${id}`, data);
    return response.data;
  },

  deleteUpstream: async (id: string) => {
    await kongClient.delete(`/upstreams/${id}`);
  },

  // Targets
  listTargets: async (upstreamId: string) => {
    const response = await kongClient.get<{ data: KongTarget[] }>(`/upstreams/${upstreamId}/targets`);
    return response.data;
  },

  addTarget: async (upstreamId: string, data: Partial<KongTarget>) => {
    const response = await kongClient.post<KongTarget>(`/upstreams/${upstreamId}/targets`, data);
    return response.data;
  },

  deleteTarget: async (upstreamId: string, targetId: string) => {
    await kongClient.delete(`/upstreams/${upstreamId}/targets/${targetId}`);
  },

  // Certificates
  listCertificates: async (params?: Record<string, unknown>) => {
    const response = await kongClient.get<{ data: KongCertificate[]; next?: string }>('/certificates', { params });
    return response.data;
  },

  createCertificate: async (data: Partial<KongCertificate>) => {
    const response = await kongClient.post<KongCertificate>('/certificates', data);
    return response.data;
  },

  updateCertificate: async (id: string, data: Partial<KongCertificate>) => {
    const response = await kongClient.put<KongCertificate>(`/certificates/${id}`, data);
    return response.data;
  },

  deleteCertificate: async (id: string) => {
    await kongClient.delete(`/certificates/${id}`);
  },

  // SNIs
  listSnis: async (params?: Record<string, unknown>) => {
    const response = await kongClient.get<{ data: { id: string; name: string; certificate: { id: string } }[] }>('/snis', { params });
    return response.data;
  },

  // Gateway Info & Status
  getGatewayInfo: async (): Promise<GatewayInfo> => {
    const response = await kongClient.get<GatewayInfo>('');
    return response.data;
  },

  getGatewayStatus: async (): Promise<KongStatus> => {
    const response = await kongClient.get<KongStatus>('/status');
    return response.data;
  },

  // Consumer Credentials
  // Key Auth
  listKeyAuths: async (consumerId: string) => {
    const response = await kongClient.get<{ data: { id: string; key: string; consumer: { id: string }; created_at: number }[] }>(`/consumers/${consumerId}/key-auth`);
    return response.data;
  },
  createKeyAuth: async (consumerId: string, data?: { key?: string }) => {
    const response = await kongClient.post<{ id: string; key: string }>(`/consumers/${consumerId}/key-auth`, data || {});
    return response.data;
  },
  deleteKeyAuth: async (consumerId: string, keyId: string) => {
    await kongClient.delete(`/consumers/${consumerId}/key-auth/${keyId}`);
  },

  // JWT
  listJwts: async (consumerId: string) => {
    const response = await kongClient.get<{ data: { id: string; key: string; secret: string; algorithm: string; consumer: { id: string } }[] }>(`/consumers/${consumerId}/jwt`);
    return response.data;
  },
  createJwt: async (consumerId: string, data?: { key?: string; secret?: string; algorithm?: string }) => {
    const response = await kongClient.post<{ id: string; key: string; secret: string; algorithm: string }>(`/consumers/${consumerId}/jwt`, data || {});
    return response.data;
  },
  deleteJwt: async (consumerId: string, jwtId: string) => {
    await kongClient.delete(`/consumers/${consumerId}/jwt/${jwtId}`);
  },

  // Basic Auth
  listBasicAuths: async (consumerId: string) => {
    const response = await kongClient.get<{ data: { id: string; username: string; password: string; consumer: { id: string } }[] }>(`/consumers/${consumerId}/basic-auth`);
    return response.data;
  },
  createBasicAuth: async (consumerId: string, data: { username: string; password?: string }) => {
    const response = await kongClient.post<{ id: string; username: string }>(`/consumers/${consumerId}/basic-auth`, data);
    return response.data;
  },
  deleteBasicAuth: async (consumerId: string, basicId: string) => {
    await kongClient.delete(`/consumers/${consumerId}/basic-auth/${basicId}`);
  },

  // OAuth2
  listOauth2s: async (consumerId: string) => {
    const response = await kongClient.get<{ data: { id: string; client_id: string; client_secret: string; redirect_uris: string[]; name?: string; consumer: { id: string } }[] }>(`/consumers/${consumerId}/oauth2`);
    return response.data;
  },
  createOauth2: async (consumerId: string, data: { name?: string; redirect_uris?: string[] }) => {
    const response = await kongClient.post<{ id: string; client_id: string; client_secret: string }>(`/consumers/${consumerId}/oauth2`, data || {});
    return response.data;
  },
  deleteOauth2: async (consumerId: string, oauth2Id: string) => {
    await kongClient.delete(`/consumers/${consumerId}/oauth2/${oauth2Id}`);
  },

  // HMAC Auth
  listHmacAuths: async (consumerId: string) => {
    const response = await kongClient.get<{ data: { id: string; username: string; secret: string; consumer: { id: string } }[] }>(`/consumers/${consumerId}/hmac-auth`);
    return response.data;
  },
  createHmacAuth: async (consumerId: string, data?: { username?: string; secret?: string }) => {
    const response = await kongClient.post<{ id: string; username: string; secret: string }>(`/consumers/${consumerId}/hmac-auth`, data || {});
    return response.data;
  },
  deleteHmacAuth: async (consumerId: string, hmacId: string) => {
    await kongClient.delete(`/consumers/${consumerId}/hmac-auth/${hmacId}`);
  },
};

export default kongApi;
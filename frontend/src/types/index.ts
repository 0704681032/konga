// User types
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  admin: boolean;
  active: boolean;
  node?: number | KongNode; // Active connection ID or object (backend uses 'node' field)
  node_id?: string; // Alternative field name
  createdAt?: number;
  updatedAt?: number;
}

export interface Credentials {
  token: string;
  user: User;
}

// Kong Node (Connection) types
export interface KongNode {
  id: number;
  name: string;
  type: 'default' | 'key_auth' | 'jwt' | 'basic_auth';
  kong_admin_url: string;
  kong_api_key?: string;
  jwt_algorithm?: 'HS256' | 'RS256';
  jwt_key?: string;
  jwt_secret?: string;
  username?: string;
  password?: string;
  kong_version?: string;
  health_checks?: boolean;
  health_check_details?: {
    isHealthy?: boolean;
  };
  active?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

// Kong Gateway Info
export interface GatewayInfo {
  hostname: string;
  version: string;
  tagline: string;
  lua_version: string;
  configuration: {
    admin_listen: string[];
    database: string;
    pg_host?: string;
    pg_port?: number;
    pg_database?: string;
    pg_user?: string;
    cassandra_contact_points?: string[];
    cassandra_keyspace?: string;
    cassandra_port?: number;
    cassandra_username?: string;
    [key: string]: unknown;
  };
  plugins: {
    available_on_server: Record<string, boolean>;
    enabled_in_cluster: string[];
  };
}

// Kong Status
export interface KongStatus {
  server: {
    total_requests: number;
    connections_active: number;
    connections_reading: number;
    connections_writing: number;
    connections_waiting: number;
    connections_accepted: number;
    connections_handled: number;
  };
  database: {
    reachable: boolean;
  };
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  total?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  next?: string;
}

// Kong Entity types
export interface KongService {
  id: string;
  name: string;
  host: string;
  port?: number;
  protocol?: string;
  path?: string;
  retries?: number;
  connect_timeout?: number;
  write_timeout?: number;
  read_timeout?: number;
  enabled?: boolean;
  tags?: string[];
  created_at?: number;
  updated_at?: number;
}

export interface KongRoute {
  id: string;
  name?: string;
  protocols?: string[];
  methods?: string[];
  hosts?: string[];
  paths?: string[];
  headers?: Record<string, string[]>;
  regex_priority?: number;
  strip_path?: boolean;
  preserve_host?: boolean;
  service?: { id: string };
  tags?: string[];
  created_at?: number;
  updated_at?: number;
}

export interface KongConsumer {
  id: string;
  username: string;
  custom_id?: string;
  tags?: string[];
  created_at?: number;
}

export interface KongPlugin {
  id: string;
  name: string;
  enabled?: boolean;
  protocols?: string[];
  service?: { id: string };
  route?: { id: string };
  consumer?: { id: string };
  config?: Record<string, unknown>;
  tags?: string[];
  created_at?: number;
}

export interface KongUpstream {
  id: string;
  name: string;
  algorithm?: string;
  hash_on?: string;
  hash_fallback?: string;
  hash_on_header?: string;
  hash_fallback_header?: string;
  slots?: number;
  healthchecks?: {
    active?: {
      healthy?: unknown;
      unhealthy?: unknown;
    };
    passive?: {
      healthy?: unknown;
      unhealthy?: unknown;
    };
  };
  tags?: string[];
  created_at?: number;
}

export interface KongTarget {
  id: string;
  target: string;
  weight?: number;
  upstream?: { id: string };
  tags?: string[];
  created_at?: number;
}

export interface KongCertificate {
  id: string;
  cert: string;
  key: string;
  snis?: string[];
  tags?: string[];
  created_at?: number;
}

// Settings types
export interface Settings {
  id: number;
  data: Record<string, unknown>;
}

// Snapshot types
export interface Snapshot {
  id: number;
  name: string;
  kong_version: string;
  data: string;
  createdAt: number;
}

// Permissions
export interface Permissions {
  [context: string]: {
    create?: boolean;
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  };
}
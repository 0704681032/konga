// Navigation menu items
export const MENU_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'DashboardOutlined',
    path: '/dashboard',
  },
  {
    key: 'connections',
    label: 'Connections',
    icon: 'ApiOutlined',
    path: '/connections',
    permission: 'connections',
  },
  {
    key: 'services',
    label: 'Services',
    icon: 'CloudServerOutlined',
    path: '/services',
    permission: 'services',
  },
  {
    key: 'routes',
    label: 'Routes',
    icon: 'BranchesOutlined',
    path: '/routes',
    permission: 'routes',
  },
  {
    key: 'consumers',
    label: 'Consumers',
    icon: 'UserOutlined',
    path: '/consumers',
    permission: 'consumers',
  },
  {
    key: 'plugins',
    label: 'Plugins',
    icon: 'ApiOutlined',
    path: '/plugins',
    permission: 'plugins',
  },
  {
    key: 'upstreams',
    label: 'Upstreams',
    icon: 'ClusterOutlined',
    path: '/upstreams',
    permission: 'upstreams',
  },
  {
    key: 'certificates',
    label: 'Certificates',
    icon: 'SafetyCertificateOutlined',
    path: '/certificates',
    permission: 'certificates',
  },
  {
    key: 'snapshots',
    label: 'Snapshots',
    icon: 'CameraOutlined',
    path: '/snapshots',
    permission: 'snapshots',
  },
  {
    key: 'users',
    label: 'Users',
    icon: 'TeamOutlined',
    path: '/users',
    permission: 'users',
    adminOnly: true,
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'SettingOutlined',
    path: '/settings',
    permission: 'settings',
  },
];

// Connection types
export const CONNECTION_TYPES = [
  { value: 'default', label: 'Default' },
  { value: 'key_auth', label: 'Key Auth' },
  { value: 'jwt', label: 'JWT Auth' },
  { value: 'basic_auth', label: 'Basic Auth' },
];

// Kong protocols
export const PROTOCOLS = ['http', 'https', 'tcp', 'tls', 'grpc', 'grpcs'];

// HTTP Methods
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'];

// Items per page options
export const PAGE_SIZE_OPTIONS = ['10', '25', '50', '100'];

// App version
export const APP_VERSION = '0.14.9';
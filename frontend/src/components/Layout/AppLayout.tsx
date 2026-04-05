import React from 'react';
import { Layout, Menu, Dropdown, Avatar, Button } from 'antd';
import {
  DashboardOutlined,
  ApiOutlined,
  CloudServerOutlined,
  BranchesOutlined,
  UserOutlined,
  ClusterOutlined,
  SafetyCertificateOutlined,
  CameraOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { MENU_ITEMS, APP_VERSION } from '../../utils/constants';
import styles from './AppLayout.module.css';

const { Header, Sider, Content, Footer } = Layout;

const iconMap: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  ApiOutlined: <ApiOutlined />,
  CloudServerOutlined: <CloudServerOutlined />,
  BranchesOutlined: <BranchesOutlined />,
  UserOutlined: <UserOutlined />,
  ClusterOutlined: <ClusterOutlined />,
  SafetyCertificateOutlined: <SafetyCertificateOutlined />,
  CameraOutlined: <CameraOutlined />,
  TeamOutlined: <TeamOutlined />,
  SettingOutlined: <SettingOutlined />,
};

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout, hasPermission } = useAuthStore();
  const { activeNode, fetchNodes } = useConnectionStore();

  // Fetch connections on mount to get active node
  React.useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper function to check if Kong version is 3.x or higher
  const isKong3xOrHigher = (): boolean => {
    if (!activeNode?.kong_version) return false;
    const version = activeNode.kong_version;
    // Parse version string (e.g., "3.0.0", "2.8.1")
    const majorVersion = parseInt(version.split('.')[0], 10);
    return majorVersion >= 3;
  };

  // Filter menu items based on permissions and Kong version
  const menuItems = MENU_ITEMS.filter(item => {
    if (item.adminOnly && !user?.admin) return false;
    if (item.permission && !hasPermission(item.permission, 'read')) return false;
    // Hide APIs menu for Kong 3.x and higher
    if (item.kong2Only && isKong3xOrHigher()) return false;
    return true;
  }).map(item => ({
    key: item.path,
    icon: iconMap[item.icon],
    label: item.label,
  }));

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout className={styles.layout}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className={styles.sider}
        width={220}
      >
        <div className={styles.logo}>
          <img
            src="/images/konga-logo-white-no-icon.png"
            alt="Konga"
            className={styles.logoImage}
          />
          {!collapsed && <span className={styles.version}>v{APP_VERSION}</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className={styles.menu}
        />
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className={styles.trigger}
          />
          <div className={styles.headerRight}>
            {activeNode && (
              <div className={styles.connectionInfo}>
                <span className={styles.connectionLabel}>Connected to:</span>
                <span className={styles.connectionName}>{activeNode.name}</span>
                {activeNode.kong_version && (
                  <span className={styles.connectionVersion}>
                    (Kong {activeNode.kong_version})
                  </span>
                )}
              </div>
            )}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className={styles.userInfo}>
                <Avatar
                  icon={<UserOutlined />}
                  className={styles.avatar}
                />
                <span className={styles.username}>{user?.username}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
        <Footer className={styles.footer}>
          <span>KONGA {APP_VERSION}</span>
          <a href="https://github.com/pantsel/konga" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href="https://github.com/pantsel/konga/issues" target="_blank" rel="noopener noreferrer">
            Issues
          </a>
        </Footer>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
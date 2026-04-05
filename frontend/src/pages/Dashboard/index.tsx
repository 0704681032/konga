import React from 'react';
import { Card, Row, Col, Statistic, Tag, Spin, Button } from 'antd';
import {
  ApiOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useConnectionStore } from '../../stores/connectionStore';
import { formatNumber } from '../../utils/format';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeNode, gatewayInfo, gatewayStatus, loading, fetchGatewayInfo, fetchGatewayStatus } = useConnectionStore();

  React.useEffect(() => {
    if (activeNode) {
      fetchGatewayInfo();
      fetchGatewayStatus();
    }
  }, [activeNode]);

  if (!activeNode) {
    return (
      <div className={styles.welcome}>
        <img src="/images/conn_sync-100.png" alt="Welcome" className={styles.welcomeImage} />
        <h2>Welcome!</h2>
        <p className={styles.welcomeText}>
          No active connection to Kong Admin was found.
        </p>
        <p>
          <Button type="primary" onClick={() => navigate('/connections')}>
            Setup Connection
          </Button>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" tip="Connecting to node..." />
      </div>
    );
  }

  if (!gatewayInfo) {
    return (
      <div className={styles.error}>
        <img src="/images/attention.png" alt="Error" className={styles.welcomeImage} />
        <h2>Something went wrong...</h2>
        <p className={styles.welcomeText}>
          Failed to connect to <strong>{activeNode.name}</strong>.<br />
          Make sure your active connection is valid and Kong is up and running.
        </p>
        <Button onClick={() => navigate('/connections')}>Check Connections</Button>
      </div>
    );
  }

  const pluginsList = gatewayInfo.plugins?.available_on_server
    ? Object.entries(gatewayInfo.plugins.available_on_server).map(([name, enabled]) => ({
        name,
        enabled,
      }))
    : [];

  return (
    <div className={styles.dashboard}>
      {/* Connection Stats */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title={
            <span>
              <ApiOutlined style={{ marginRight: 8 }} />
              CONNECTIONS
            </span>
          }>
            <Row gutter={16}>
              <Col span={4}>
                <Statistic title="Active" value={gatewayStatus?.server?.connections_active || 0} />
              </Col>
              <Col span={4}>
                <Statistic title="Reading" value={gatewayStatus?.server?.connections_reading || 0} />
              </Col>
              <Col span={4}>
                <Statistic title="Writing" value={gatewayStatus?.server?.connections_writing || 0} />
              </Col>
              <Col span={4}>
                <Statistic title="Waiting" value={gatewayStatus?.server?.connections_waiting || 0} />
              </Col>
              <Col span={4}>
                <Statistic title="Accepted" value={formatNumber(gatewayStatus?.server?.connections_accepted || 0)} />
              </Col>
              <Col span={4}>
                <Statistic title="Handled" value={formatNumber(gatewayStatus?.server?.connections_handled || 0)} />
              </Col>
            </Row>
            <div className={styles.totalRequests}>
              Total Requests: <strong>{formatNumber(gatewayStatus?.server?.total_requests || 0)}</strong>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Node Info, Database, Timers */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card title={
            <span>
              <CloudServerOutlined style={{ marginRight: 8 }} />
              NODE INFO
            </span>
          }>
            <table className={styles.infoTable}>
              <tbody>
                <tr>
                  <th>Hostname</th>
                  <td>{gatewayInfo.hostname}</td>
                </tr>
                <tr>
                  <th>Tag Line</th>
                  <td>{gatewayInfo.tagline}</td>
                </tr>
                <tr>
                  <th>Version</th>
                  <td>{gatewayInfo.version}</td>
                </tr>
                <tr>
                  <th>LUA Version</th>
                  <td>{gatewayInfo.lua_version}</td>
                </tr>
                <tr>
                  <th>Admin Listen</th>
                  <td>{gatewayInfo.configuration?.admin_listen?.join(', ')}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </Col>

        <Col span={8}>
          <Card title={
            <span>
              <DatabaseOutlined style={{ marginRight: 8 }} />
              DATASTORE INFO
            </span>
          }>
            <table className={styles.infoTable}>
              <tbody>
                <tr>
                  <th>DBMS</th>
                  <td>{gatewayInfo.configuration?.database}</td>
                </tr>
                {gatewayInfo.configuration?.database === 'postgres' && (
                  <>
                    <tr>
                      <th>Host</th>
                      <td>{gatewayInfo.configuration?.pg_host}</td>
                    </tr>
                    <tr>
                      <th>Database</th>
                      <td>{gatewayInfo.configuration?.pg_database}</td>
                    </tr>
                    <tr>
                      <th>User</th>
                      <td>{gatewayInfo.configuration?.pg_user}</td>
                    </tr>
                  </>
                )}
                {gatewayStatus?.database && (
                  <tr>
                    <th>Status</th>
                    <td>
                      {gatewayStatus.database.reachable ? (
                        <Tag icon={<CheckCircleOutlined />} color="success">Reachable</Tag>
                      ) : (
                        <Tag icon={<CloseCircleOutlined />} color="error">Unreachable</Tag>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="PLUGINS">
            <div className={styles.pluginsList}>
              {pluginsList.slice(0, 20).map(plugin => (
                <Tag
                  key={plugin.name}
                  color={plugin.enabled ? 'green' : 'default'}
                  style={{ marginBottom: 4 }}
                >
                  {plugin.name}
                </Tag>
              ))}
              {pluginsList.length > 20 && (
                <span style={{ color: '#999' }}>+{pluginsList.length - 20} more</span>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
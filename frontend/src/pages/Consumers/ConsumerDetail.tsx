import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Button, Space, Table, Modal, Form, Input,
  Select, message, Popconfirm, Tag, Descriptions, Spin, Drawer, Empty
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined,
  CodeOutlined, UsergroupAddOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongConsumer } from '../../types';

// Types
interface AclGroup {
  id: string;
  group: string;
  consumer: { id: string };
  created_at?: number;
}

interface KeyAuthCredential { id: string; key: string; created_at?: number }
interface JwtCredential { id: string; key: string; secret: string; algorithm: string }
interface BasicAuthCredential { id: string; username: string }
interface Oauth2Credential { id: string; client_id: string; client_secret: string; redirect_uris?: string[] }
interface HmacCredential { id: string; username: string; secret: string }

const ConsumerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consumer, setConsumer] = React.useState<KongConsumer | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [rawViewOpen, setRawViewOpen] = React.useState(false);
  const [form] = Form.useForm();
  const { hasPermission } = useAuthStore();

  // Groups state
  const [groups, setGroups] = React.useState<AclGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = React.useState(false);
  const [addGroupModalOpen, setAddGroupModalOpen] = React.useState(false);
  const [groupForm] = Form.useForm();

  // Credentials state
  const [credentialsLoading, setCredentialsLoading] = React.useState(false);
  const [keyAuths, setKeyAuths] = React.useState<KeyAuthCredential[]>([]);
  const [jwts, setJwts] = React.useState<JwtCredential[]>([]);
  const [basicAuths, setBasicAuths] = React.useState<BasicAuthCredential[]>([]);
  const [oauth2s, setOauth2s] = React.useState<Oauth2Credential[]>([]);
  const [hmacAuths, setHmacAuths] = React.useState<HmacCredential[]>([]);
  const [credModalOpen, setCredModalOpen] = React.useState(false);
  const [credModalType, setCredModalType] = React.useState<'key-auth' | 'jwt' | 'basic-auth' | 'oauth2' | 'hmac-auth'>('key-auth');
  const [credForm] = Form.useForm();

  // Services state
  const [services, setServices] = React.useState<unknown[]>([]);
  const [servicesLoading, setServicesLoading] = React.useState(false);

  // Plugins state
  const [plugins, setPlugins] = React.useState<{ id: string; name: string; enabled: boolean; service?: { id: string }; route?: { id: string } }[]>([]);
  const [pluginsLoading, setPluginsLoading] = React.useState(false);

  const fetchConsumer = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await kongApi.getConsumer(id);
      setConsumer(response);
    } catch {
      message.error('Failed to fetch consumer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchConsumer();
  }, [fetchConsumer]);

  const fetchGroups = async () => {
    if (!id) return;
    setGroupsLoading(true);
    try {
      const response = await kongApi.listAcls(id);
      setGroups(response.data || []);
    } catch {
      // ACL plugin might not be enabled
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  const fetchCredentials = async () => {
    if (!id) return;
    setCredentialsLoading(true);
    try {
      const [keyRes, jwtRes, basicRes, oauth2Res, hmacRes] = await Promise.all([
        kongApi.listKeyAuths(id).catch(() => ({ data: [] })),
        kongApi.listJwts(id).catch(() => ({ data: [] })),
        kongApi.listBasicAuths(id).catch(() => ({ data: [] })),
        kongApi.listOauth2s(id).catch(() => ({ data: [] })),
        kongApi.listHmacAuths(id).catch(() => ({ data: [] })),
      ]);
      setKeyAuths(keyRes.data || []);
      setJwts(jwtRes.data || []);
      setBasicAuths(basicRes.data || []);
      setOauth2s(oauth2Res.data || []);
      setHmacAuths(hmacRes.data || []);
    } catch {
      message.error('Failed to fetch credentials');
    } finally {
      setCredentialsLoading(false);
    }
  };

  const fetchServices = async () => {
    if (!id) return;
    setServicesLoading(true);
    try {
      const response = await kongApi.getConsumerServices(id);
      setServices(response.data || []);
    } catch {
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchPlugins = async () => {
    if (!id) return;
    setPluginsLoading(true);
    try {
      const response = await kongApi.listPlugins({ 'consumer.id': id });
      setPlugins((response.data || []) as typeof plugins);
    } catch {
      setPlugins([]);
    } finally {
      setPluginsLoading(false);
    }
  };

  const handleEdit = () => {
    if (!consumer) return;
    form.setFieldsValue({
      ...consumer,
      tags: consumer.tags?.join(', '),
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async (values: Record<string, unknown>) => {
    if (!consumer) return;
    try {
      const data = {
        ...values,
        tags: values.tags ? String(values.tags).split(',').map(t => t.trim()).filter(Boolean) : undefined,
      };
      await kongApi.updateConsumer(consumer.id, data);
      message.success('Consumer updated');
      setEditModalOpen(false);
      fetchConsumer();
    } catch {
      message.error('Failed to update consumer');
    }
  };

  const handleDelete = async () => {
    if (!consumer) return;
    try {
      await kongApi.deleteConsumer(consumer.id);
      message.success('Consumer deleted');
      navigate('/consumers');
    } catch {
      message.error('Failed to delete consumer');
    }
  };

  // Group handlers
  const handleAddGroup = async (values: { group: string }) => {
    if (!id) return;
    try {
      await kongApi.createAcl(id, values);
      message.success('Group added');
      setAddGroupModalOpen(false);
      groupForm.resetFields();
      fetchGroups();
    } catch {
      message.error('Failed to add group. Make sure ACL plugin is enabled.');
    }
  };

  const handleDeleteGroup = async (aclId: string) => {
    if (!id) return;
    try {
      await kongApi.deleteAcl(id, aclId);
      message.success('Group removed');
      fetchGroups();
    } catch {
      message.error('Failed to remove group');
    }
  };

  // Credential handlers
  const handleOpenCredModal = (type: 'key-auth' | 'jwt' | 'basic-auth' | 'oauth2' | 'hmac-auth') => {
    setCredModalType(type);
    credForm.resetFields();
    if (type === 'jwt') {
      credForm.setFieldsValue({ algorithm: 'HS256' });
    }
    setCredModalOpen(true);
  };

  const handleCredSubmit = async (values: Record<string, unknown>) => {
    if (!id) return;
    try {
      switch (credModalType) {
        case 'key-auth':
          await kongApi.createKeyAuth(id, values.key ? { key: values.key as string } : {});
          message.success('Key Auth created');
          break;
        case 'jwt':
          await kongApi.createJwt(id, {
            key: values.key as string,
            secret: values.secret as string,
            algorithm: values.algorithm as string,
          });
          message.success('JWT created');
          break;
        case 'basic-auth':
          await kongApi.createBasicAuth(id, {
            username: values.username as string,
            password: values.password as string,
          });
          message.success('Basic Auth created');
          break;
        case 'oauth2':
          await kongApi.createOauth2(id, {
            name: values.name as string,
            redirect_uris: values.redirect_uris ? String(values.redirect_uris).split(',').map(s => s.trim()) : [],
          });
          message.success('OAuth2 created');
          break;
        case 'hmac-auth':
          await kongApi.createHmacAuth(id, {
            username: values.username as string,
            secret: values.secret as string,
          });
          message.success('HMAC Auth created');
          break;
      }
      setCredModalOpen(false);
      fetchCredentials();
    } catch {
      message.error(`Failed to create ${credModalType} credential`);
    }
  };

  const handleDeleteCred = async (type: string, credId: string) => {
    if (!id) return;
    try {
      switch (type) {
        case 'key-auth':
          await kongApi.deleteKeyAuth(id, credId);
          break;
        case 'jwt':
          await kongApi.deleteJwt(id, credId);
          break;
        case 'basic-auth':
          await kongApi.deleteBasicAuth(id, credId);
          break;
        case 'oauth2':
          await kongApi.deleteOauth2(id, credId);
          break;
        case 'hmac-auth':
          await kongApi.deleteHmacAuth(id, credId);
          break;
      }
      message.success('Credential deleted');
      fetchCredentials();
    } catch {
      message.error('Failed to delete credential');
    }
  };

  if (loading) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
  }

  if (!consumer) {
    return <div>Consumer not found</div>;
  }

  const CredentialSection = ({ title, type, data, onAdd }: {
    title: string;
    type: string;
    data: Array<{ id: string; [key: string]: unknown }>;
    onAdd: () => void
  }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>{title}</div>
      {data.length > 0 ? (
        <Table
          size="small"
          dataSource={data}
          rowKey="id"
          pagination={false}
          columns={[
            ...Object.keys(data[0] || {}).filter(k => k !== 'id' && k !== 'consumer' && k !== 'created_at').map(k => ({
              title: k.toUpperCase(),
              dataIndex: k,
              key: k,
              render: (v: unknown) => typeof v === 'string' && v.length > 30
                ? <Tag>{v.substring(0, 30)}...</Tag>
                : <Tag>{String(v)}</Tag>
            })),
            {
              title: 'Action',
              key: 'action',
              width: 80,
              render: (_: unknown, record) => (
                <Popconfirm title="Delete credential?" onConfirm={() => handleDeleteCred(type, record.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            },
          ]}
        />
      ) : (
        <div style={{ color: '#999', marginBottom: 8 }}>No credentials</div>
      )}
      <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={onAdd}>
        Add {title}
      </Button>
    </div>
  );

  const tabItems = [
    {
      key: 'details',
      label: 'Details',
      children: (
        <Card
          extra={
            <Space>
              <Button icon={<CodeOutlined />} onClick={() => setRawViewOpen(true)}>Raw View</Button>
              {hasPermission('consumers', 'update') && (
                <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>Edit</Button>
              )}
              {hasPermission('consumers', 'delete') && (
                <Popconfirm title="Delete this consumer?" onConfirm={handleDelete}>
                  <Button danger icon={<DeleteOutlined />}>Delete</Button>
                </Popconfirm>
              )}
            </Space>
          }
        >
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="ID">{consumer.id}</Descriptions.Item>
            <Descriptions.Item label="Username">{consumer.username}</Descriptions.Item>
            <Descriptions.Item label="Custom ID">{consumer.custom_id}</Descriptions.Item>
            <Descriptions.Item label="Tags">{consumer.tags?.map(t => <Tag key={t}>{t}</Tag>)}</Descriptions.Item>
          </Descriptions>
        </Card>
      ),
    },
    {
      key: 'groups',
      label: <><UsergroupAddOutlined /> Groups ({groups.length})</>,
      children: (
        <Card
          extra={
            hasPermission('consumers', 'update') && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddGroupModalOpen(true)}>Add Group</Button>
            )
          }
        >
          <Spin spinning={groupsLoading}>
            {groups.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {groups.map(g => (
                  <Tag
                    key={g.id}
                    closable={hasPermission('consumers', 'update')}
                    onClose={(e) => {
                      e.preventDefault();
                      handleDeleteGroup(g.id);
                    }}
                    style={{ padding: '4px 8px', fontSize: 14 }}
                  >
                    <UsergroupAddOutlined /> {g.group}
                  </Tag>
                ))}
              </div>
            ) : (
              <Empty description="No groups assigned. Add groups to use with ACL plugin." />
            )}
          </Spin>
        </Card>
      ),
    },
    {
      key: 'credentials',
      label: `Credentials`,
      children: (
        <Card>
          <Spin spinning={credentialsLoading}>
            <CredentialSection title="Key Auth" type="key-auth" data={keyAuths} onAdd={() => handleOpenCredModal('key-auth')} />
            <CredentialSection title="JWT" type="jwt" data={jwts} onAdd={() => handleOpenCredModal('jwt')} />
            <CredentialSection title="Basic Auth" type="basic-auth" data={basicAuths} onAdd={() => handleOpenCredModal('basic-auth')} />
            <CredentialSection title="OAuth2" type="oauth2" data={oauth2s} onAdd={() => handleOpenCredModal('oauth2')} />
            <CredentialSection title="HMAC Auth" type="hmac-auth" data={hmacAuths} onAdd={() => handleOpenCredModal('hmac-auth')} />
          </Spin>
        </Card>
      ),
    },
    {
      key: 'services',
      label: `Services`,
      children: (
        <Card>
          <Spin spinning={servicesLoading}>
            {services.length > 0 ? (
              <Table
                dataSource={services as Record<string, unknown>[]}
                rowKey={(r: Record<string, unknown>) => String(r.id)}
                pagination={false}
                size="small"
                columns={[
                  { title: 'Name', dataIndex: 'name', key: 'name' },
                  { title: 'Host', dataIndex: 'host', key: 'host' },
                  { title: 'Port', dataIndex: 'port', key: 'port' },
                  { title: 'Protocol', dataIndex: 'protocol', key: 'protocol' },
                ]}
              />
            ) : (
              <Empty description="No accessible services found based on ACL and authentication plugins." />
            )}
          </Spin>
        </Card>
      ),
    },
    {
      key: 'plugins',
      label: `Plugins (${plugins.length})`,
      children: (
        <Card
          extra={
            hasPermission('plugins', 'create') && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/plugins?create&consumer=${consumer.id}`)}>
                Add Plugin
              </Button>
            )
          }
        >
          <Spin spinning={pluginsLoading}>
            {plugins.length > 0 ? (
              <Table
                dataSource={plugins}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  { title: 'Name', dataIndex: 'name', key: 'name', render: (name: string) => <Tag color="blue">{name}</Tag> },
                  { title: 'Enabled', dataIndex: 'enabled', key: 'enabled', render: (enabled: boolean) => (
                    <Tag color={enabled ? 'green' : 'red'}>{enabled ? 'Yes' : 'No'}</Tag>
                  )},
                  { title: 'Scope', key: 'scope', render: (_: unknown, record) => {
                    if (record.service) return 'Service';
                    if (record.route) return 'Route';
                    return 'Global';
                  }},
                  {
                    title: 'Actions',
                    key: 'actions',
                    width: 80,
                    render: (_: unknown, record) => (
                      <Space>
                        <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/plugins?edit=${record.id}`)} />
                        <Popconfirm title="Delete this plugin?" onConfirm={async () => {
                          try {
                            await kongApi.deletePlugin(record.id);
                            message.success('Plugin deleted');
                            fetchPlugins();
                          } catch {
                            message.error('Failed to delete plugin');
                          }
                        }}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]}
              />
            ) : (
              <Empty description="No consumer-specific plugins configured." />
            )}
          </Spin>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/consumers')}>Back to Consumers</Button>
      </div>

      <Card title={<><strong>Consumer:</strong> {consumer.username || consumer.id}</>}>
        <Tabs
          items={tabItems}
          onChange={(key) => {
            if (key === 'groups') fetchGroups();
            if (key === 'credentials') fetchCredentials();
            if (key === 'services') fetchServices();
            if (key === 'plugins') fetchPlugins();
          }}
        />
      </Card>

      {/* Edit Consumer Modal */}
      <Modal
        title="Edit Consumer"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="username" label="Username">
            <Input placeholder="Username" />
          </Form.Item>
          <Form.Item name="custom_id" label="Custom ID">
            <Input placeholder="Custom ID" />
          </Form.Item>
          <Form.Item name="tags" label="Tags" help="Comma-separated values">
            <Input placeholder="tag1, tag2, tag3" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Group Modal */}
      <Modal
        title="Add Group"
        open={addGroupModalOpen}
        onCancel={() => setAddGroupModalOpen(false)}
        onOk={() => groupForm.submit()}
      >
        <Form form={groupForm} layout="vertical" onFinish={handleAddGroup}>
          <Form.Item name="group" label="Group Name" rules={[{ required: true }]}>
            <Input placeholder="Enter group name" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Credential Creation Modal */}
      <Modal
        title={`Add ${credModalType.toUpperCase()} Credential`}
        open={credModalOpen}
        onCancel={() => setCredModalOpen(false)}
        onOk={() => credForm.submit()}
      >
        <Form form={credForm} layout="vertical" onFinish={handleCredSubmit}>
          {credModalType === 'key-auth' && (
            <Form.Item name="key" label="Key" help="Leave empty to auto-generate">
              <Input placeholder="API key (optional)" />
            </Form.Item>
          )}
          {credModalType === 'jwt' && (
            <>
              <Form.Item name="key" label="Key" help="Leave empty to auto-generate">
                <Input placeholder="JWT key (optional)" />
              </Form.Item>
              <Form.Item name="secret" label="Secret" help="Leave empty to auto-generate">
                <Input placeholder="JWT secret (optional)" />
              </Form.Item>
              <Form.Item name="algorithm" label="Algorithm">
                <Select options={[
                  { value: 'HS256', label: 'HS256' },
                  { value: 'RS256', label: 'RS256' },
                  { value: 'ES256', label: 'ES256' },
                ]} />
              </Form.Item>
            </>
          )}
          {credModalType === 'basic-auth' && (
            <>
              <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                <Input placeholder="Username" />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                <Input.Password placeholder="Password" />
              </Form.Item>
            </>
          )}
          {credModalType === 'oauth2' && (
            <>
              <Form.Item name="name" label="Client Name">
                <Input placeholder="Client name" />
              </Form.Item>
              <Form.Item name="redirect_uris" label="Redirect URIs" help="Comma-separated URLs">
                <Input placeholder="http://example.com/callback" />
              </Form.Item>
            </>
          )}
          {credModalType === 'hmac-auth' && (
            <>
              <Form.Item name="username" label="Username" help="Leave empty to auto-generate">
                <Input placeholder="HMAC username (optional)" />
              </Form.Item>
              <Form.Item name="secret" label="Secret" help="Leave empty to auto-generate">
                <Input placeholder="HMAC secret (optional)" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* Raw View Drawer */}
      <Drawer
        title="Raw View"
        open={rawViewOpen}
        onClose={() => setRawViewOpen(false)}
        width={600}
      >
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {JSON.stringify(consumer, null, 2)}
        </pre>
      </Drawer>
    </div>
  );
};

export default ConsumerDetail;
import React from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input,
  message, Popconfirm, Drawer, Descriptions, Tabs, Tag
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, KeyOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongConsumer } from '../../types';

// Credential types
interface KeyAuthCredential { id: string; key: string; created_at?: number }
interface JwtCredential { id: string; key: string; secret: string; algorithm: string }
interface BasicAuthCredential { id: string; username: string }
interface Oauth2Credential { id: string; client_id: string; client_secret: string; redirect_uris?: string[] }
interface HmacCredential { id: string; username: string; secret: string }

const Consumers: React.FC = () => {
  const [consumers, setConsumers] = React.useState<KongConsumer[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingConsumer, setEditingConsumer] = React.useState<KongConsumer | null>(null);
  const [viewingConsumer, setViewingConsumer] = React.useState<KongConsumer | null>(null);
  const [form] = Form.useForm();

  // Credential state
  const [credentialsLoading, setCredentialsLoading] = React.useState(false);
  const [keyAuths, setKeyAuths] = React.useState<KeyAuthCredential[]>([]);
  const [jwts, setJwts] = React.useState<JwtCredential[]>([]);
  const [basicAuths, setBasicAuths] = React.useState<BasicAuthCredential[]>([]);
  const [oauth2s, setOauth2s] = React.useState<Oauth2Credential[]>([]);
  const [hmacAuths, setHmacAuths] = React.useState<HmacCredential[]>([]);

  // Credential modal state
  const [credModalOpen, setCredModalOpen] = React.useState(false);
  const [credModalType, setCredModalType] = React.useState<'key-auth' | 'jwt' | 'basic-auth' | 'oauth2' | 'hmac-auth'>('key-auth');
  const [credForm] = Form.useForm();

  const { hasPermission } = useAuthStore();

  const fetchConsumers = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await kongApi.listConsumers();
      setConsumers(response.data || []);
    } catch {
      message.error('Failed to fetch consumers');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchConsumers();
  }, []);

  // Fetch all credentials for a consumer
  const fetchCredentials = async (consumerId: string) => {
    setCredentialsLoading(true);
    try {
      const [keyRes, jwtRes, basicRes, oauth2Res, hmacRes] = await Promise.all([
        kongApi.listKeyAuths(consumerId).catch(() => ({ data: [] })),
        kongApi.listJwts(consumerId).catch(() => ({ data: [] })),
        kongApi.listBasicAuths(consumerId).catch(() => ({ data: [] })),
        kongApi.listOauth2s(consumerId).catch(() => ({ data: [] })),
        kongApi.listHmacAuths(consumerId).catch(() => ({ data: [] })),
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

  const handleCreate = () => {
    setEditingConsumer(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (consumer: KongConsumer) => {
    setEditingConsumer(consumer);
    form.setFieldsValue({
      ...consumer,
      tags: consumer.tags?.join(', '),
    });
    setModalOpen(true);
  };

  const handleView = (consumer: KongConsumer) => {
    setViewingConsumer(consumer);
    setDrawerOpen(true);
    fetchCredentials(consumer.id);
  };

  const handleDelete = async (id: string) => {
    try {
      await kongApi.deleteConsumer(id);
      message.success('Consumer deleted');
      fetchConsumers();
    } catch {
      message.error('Failed to delete consumer');
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const data = {
        ...values,
        tags: values.tags ? String(values.tags).split(',').map(t => t.trim()).filter(Boolean) : undefined,
      };
      if (editingConsumer) {
        await kongApi.updateConsumer(editingConsumer.id, data);
        message.success('Consumer updated');
      } else {
        await kongApi.createConsumer(data);
        message.success('Consumer created');
      }
      setModalOpen(false);
      fetchConsumers();
    } catch {
      message.error('Failed to save consumer');
    }
  };

  // Credential modal handlers
  const handleOpenCredModal = (type: 'key-auth' | 'jwt' | 'basic-auth' | 'oauth2' | 'hmac-auth') => {
    setCredModalType(type);
    credForm.resetFields();
    // Set defaults
    if (type === 'jwt') {
      credForm.setFieldsValue({ algorithm: 'HS256' });
    }
    setCredModalOpen(true);
  };

  const handleCredSubmit = async (values: Record<string, unknown>) => {
    if (!viewingConsumer) return;
    try {
      switch (credModalType) {
        case 'key-auth':
          await kongApi.createKeyAuth(viewingConsumer.id, values.key ? { key: values.key as string } : {});
          message.success('Key Auth created');
          break;
        case 'jwt':
          await kongApi.createJwt(viewingConsumer.id, {
            key: values.key as string,
            secret: values.secret as string,
            algorithm: values.algorithm as string,
          });
          message.success('JWT created');
          break;
        case 'basic-auth':
          await kongApi.createBasicAuth(viewingConsumer.id, {
            username: values.username as string,
            password: values.password as string,
          });
          message.success('Basic Auth created');
          break;
        case 'oauth2':
          await kongApi.createOauth2(viewingConsumer.id, {
            name: values.name as string,
            redirect_uris: values.redirect_uris ? String(values.redirect_uris).split(',').map(s => s.trim()) : [],
          });
          message.success('OAuth2 created');
          break;
        case 'hmac-auth':
          await kongApi.createHmacAuth(viewingConsumer.id, {
            username: values.username as string,
            secret: values.secret as string,
          });
          message.success('HMAC Auth created');
          break;
      }
      setCredModalOpen(false);
      fetchCredentials(viewingConsumer.id);
    } catch (error) {
      message.error(`Failed to create ${credModalType} credential`);
    }
  };

  const handleDeleteCred = async (type: string, credId: string) => {
    if (!viewingConsumer) return;
    try {
      switch (type) {
        case 'key-auth':
          await kongApi.deleteKeyAuth(viewingConsumer.id, credId);
          break;
        case 'jwt':
          await kongApi.deleteJwt(viewingConsumer.id, credId);
          break;
        case 'basic-auth':
          await kongApi.deleteBasicAuth(viewingConsumer.id, credId);
          break;
        case 'oauth2':
          await kongApi.deleteOauth2(viewingConsumer.id, credId);
          break;
        case 'hmac-auth':
          await kongApi.deleteHmacAuth(viewingConsumer.id, credId);
          break;
      }
      message.success('Credential deleted');
      fetchCredentials(viewingConsumer.id);
    } catch {
      message.error('Failed to delete credential');
    }
  };

  const columns = [
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Custom ID', dataIndex: 'custom_id', key: 'custom_id' },
    { title: 'Tags', dataIndex: 'tags', key: 'tags', render: (tags: string[]) => tags?.map(t => <span key={t}>{t} </span>) },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: KongConsumer) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          {hasPermission('consumers', 'update') && (
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          )}
          {hasPermission('consumers', 'delete') && (
            <Popconfirm title="Delete this consumer?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Credential section component
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

  return (
    <Card
      title="Consumers"
      extra={
        hasPermission('consumers', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            New Consumer
          </Button>
        )
      }
    >
      <Table columns={columns} dataSource={consumers} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        title={editingConsumer ? 'Edit Consumer' : 'New Consumer'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
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

      <Drawer title="Consumer Details" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={700}>
        {viewingConsumer && (
          <Tabs
            items={[
              {
                key: 'info',
                label: 'Info',
                children: (
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="ID">{viewingConsumer.id}</Descriptions.Item>
                    <Descriptions.Item label="Username">{viewingConsumer.username}</Descriptions.Item>
                    <Descriptions.Item label="Custom ID">{viewingConsumer.custom_id}</Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'credentials',
                label: 'Credentials',
                children: (
                  <div style={{ padding: 16 }}>
                    {credentialsLoading ? (
                      <div>Loading credentials...</div>
                    ) : (
                      <>
                        <CredentialSection title="Key Auth" type="key-auth" data={keyAuths} onAdd={() => handleOpenCredModal('key-auth')} />
                        <CredentialSection title="JWT" type="jwt" data={jwts} onAdd={() => handleOpenCredModal('jwt')} />
                        <CredentialSection title="Basic Auth" type="basic-auth" data={basicAuths} onAdd={() => handleOpenCredModal('basic-auth')} />
                        <CredentialSection title="OAuth2" type="oauth2" data={oauth2s} onAdd={() => handleOpenCredModal('oauth2')} />
                        <CredentialSection title="HMAC Auth" type="hmac-auth" data={hmacAuths} onAdd={() => handleOpenCredModal('hmac-auth')} />
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Drawer>

      {/* Credential Creation Modal */}
      <Modal
        title={<><KeyOutlined /> Add {credModalType.toUpperCase()} Credential</>}
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
                <Input placeholder="HS256, RS256, ES256" />
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
                <Input placeholder="http://example.com/callback,http://example.com/callback2" />
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
    </Card>
  );
};

export default Consumers;
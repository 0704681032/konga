import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Button, Space, Table, Modal, Form, Input, InputNumber,
  Select, message, Popconfirm, Tag, Descriptions, Switch, Spin, Drawer
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined,
  CodeOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongRoute, KongPlugin } from '../../types';
import { PROTOCOLS } from '../../utils/constants';

const RouteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [route, setRoute] = React.useState<KongRoute | null>(null);
  const [plugins, setPlugins] = React.useState<KongPlugin[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [rawViewOpen, setRawViewOpen] = React.useState(false);
  const [form] = Form.useForm();
  const { hasPermission } = useAuthStore();

  const fetchData = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [routeRes, pluginsRes] = await Promise.all([
        kongApi.getRoute(id),
        kongApi.listPlugins({ 'route.id': id }),
      ]);
      setRoute(routeRes);
      setPlugins(pluginsRes.data || []);
    } catch {
      message.error('Failed to fetch route details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = () => {
    if (!route) return;
    form.setFieldsValue({
      ...route,
      service: route.service?.id,
      tags: route.tags?.join(', '),
      hosts: route.hosts?.join(', '),
      paths: route.paths?.join(', '),
      methods: route.methods?.join(', '),
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async (values: Record<string, unknown>) => {
    if (!route) return;
    try {
      const parseArray = (v: unknown): string[] | undefined =>
        v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : undefined;

      const data: Partial<KongRoute> = {
        ...values,
        service: values.service ? { id: String(values.service) } : undefined,
        tags: parseArray(values.tags),
        hosts: parseArray(values.hosts),
        paths: parseArray(values.paths),
        methods: parseArray(values.methods),
      };
      await kongApi.updateRoute(route.id, data);
      message.success('Route updated');
      setEditModalOpen(false);
      fetchData();
    } catch {
      message.error('Failed to update route');
    }
  };

  const handleDelete = async () => {
    if (!route) return;
    try {
      await kongApi.deleteRoute(route.id);
      message.success('Route deleted');
      navigate('/routes');
    } catch {
      message.error('Failed to delete route');
    }
  };

  const handleTogglePlugin = async (plugin: KongPlugin) => {
    try {
      await kongApi.updatePlugin(plugin.id, { enabled: !plugin.enabled });
      message.success(`Plugin ${!plugin.enabled ? 'enabled' : 'disabled'}`);
      fetchData();
    } catch {
      message.error('Failed to toggle plugin');
    }
  };

  const handleDeletePlugin = async (pluginId: string) => {
    try {
      await kongApi.deletePlugin(pluginId);
      message.success('Plugin deleted');
      fetchData();
    } catch {
      message.error('Failed to delete plugin');
    }
  };

  if (loading) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
  }

  if (!route) {
    return <div>Route not found</div>;
  }

  const pluginColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (name: string) => <Tag color="blue">{name}</Tag> },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean, record: KongPlugin) => (
        <Switch
          checked={enabled}
          onChange={() => handleTogglePlugin(record)}
          disabled={!hasPermission('plugins', 'update')}
        />
      ),
    },
    {
      title: 'Consumer',
      dataIndex: 'consumer',
      key: 'consumer',
      render: (consumer: { id: string }) => consumer?.id ? (
        <a onClick={() => navigate(`/consumers/${consumer.id}`)}>{consumer.id.substring(0, 8)}...</a>
      ) : <span style={{ color: '#999' }}>All consumers</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: KongPlugin) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/plugins?edit=${record.id}`)} />
          {hasPermission('plugins', 'delete') && (
            <Popconfirm title="Delete this plugin?" onConfirm={() => handleDeletePlugin(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'details',
      label: 'Details',
      children: (
        <Card
          extra={
            <Space>
              <Button icon={<CodeOutlined />} onClick={() => setRawViewOpen(true)}>Raw View</Button>
              {hasPermission('routes', 'update') && (
                <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>Edit</Button>
              )}
              {hasPermission('routes', 'delete') && (
                <Popconfirm title="Delete this route?" onConfirm={handleDelete}>
                  <Button danger icon={<DeleteOutlined />}>Delete</Button>
                </Popconfirm>
              )}
            </Space>
          }
        >
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="ID">{route.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{route.name}</Descriptions.Item>
            <Descriptions.Item label="Protocols">{route.protocols?.map(p => <Tag key={p}>{p}</Tag>)}</Descriptions.Item>
            <Descriptions.Item label="Methods">{route.methods?.map(m => <Tag key={m} color="blue">{m}</Tag>)}</Descriptions.Item>
            <Descriptions.Item label="Hosts">{route.hosts?.join(', ')}</Descriptions.Item>
            <Descriptions.Item label="Paths">{route.paths?.join(', ')}</Descriptions.Item>
            <Descriptions.Item label="Strip Path">{route.strip_path ? 'Yes' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Preserve Host">{route.preserve_host ? 'Yes' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Regex Priority">{route.regex_priority}</Descriptions.Item>
            <Descriptions.Item label="HTTPS Redirect">{route.https_redirect_status_code}</Descriptions.Item>
            <Descriptions.Item label="Path Handling">{route.path_handling}</Descriptions.Item>
            <Descriptions.Item label="Service">
              {route.service?.id ? (
                <a onClick={() => navigate(`/services/${route.service!.id}`)}>{route.service.id.substring(0, 8)}...</a>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Tags">{route.tags?.map(t => <Tag key={t}>{t}</Tag>)}</Descriptions.Item>
          </Descriptions>
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
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/plugins?create&route=${route.id}`)}>
                Add Plugin
              </Button>
            )
          }
        >
          <Table columns={pluginColumns} dataSource={plugins} rowKey="id" pagination={false} />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/routes')}>Back to Routes</Button>
      </div>

      <Card title={<><strong>Route:</strong> {route.name || route.id}</>}>
        <Tabs items={tabItems} />
      </Card>

      {/* Edit Route Modal */}
      <Modal
        title="Edit Route"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="name" label="Name">
            <Input placeholder="Route name" />
          </Form.Item>
          <Form.Item name="tags" label="Tags" help="Comma-separated values">
            <Input placeholder="tag1, tag2, tag3" />
          </Form.Item>
          <Form.Item name="protocols" label="Protocols">
            <Select mode="multiple" options={PROTOCOLS.map(p => ({ value: p, label: p }))} />
          </Form.Item>
          <Form.Item name="hosts" label="Hosts" help="Comma-separated domain names">
            <Input placeholder="example.com, api.example.com" />
          </Form.Item>
          <Form.Item name="paths" label="Paths" help="Comma-separated paths">
            <Input placeholder="/api, /v1/users" />
          </Form.Item>
          <Form.Item name="methods" label="Methods" help="Comma-separated: GET, POST, PUT, DELETE">
            <Select mode="tags" placeholder="GET, POST" tokenSeparators={[',']} />
          </Form.Item>
          <Form.Item name="regex_priority" label="Regex Priority">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="strip_path" label="Strip Path" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="preserve_host" label="Preserve Host" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="service" label="Service ID">
            <Input placeholder="Link to a service (optional)" />
          </Form.Item>
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
          {JSON.stringify(route, null, 2)}
        </pre>
      </Drawer>
    </div>
  );
};

export default RouteDetail;
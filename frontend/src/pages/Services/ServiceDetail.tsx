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
import type { KongService, KongRoute, KongPlugin } from '../../types';
import { PROTOCOLS } from '../../utils/constants';

const ServiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [service, setService] = React.useState<KongService | null>(null);
  const [routes, setRoutes] = React.useState<KongRoute[]>([]);
  const [plugins, setPlugins] = React.useState<KongPlugin[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [addRouteModalOpen, setAddRouteModalOpen] = React.useState(false);
  const [addPluginModalOpen, setAddPluginModalOpen] = React.useState(false);
  const [rawViewOpen, setRawViewOpen] = React.useState(false);
  const [form] = Form.useForm();
  const [routeForm] = Form.useForm();
  const { hasPermission } = useAuthStore();

  const fetchData = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [serviceRes, routesRes, pluginsRes] = await Promise.all([
        kongApi.getService(id),
        kongApi.listRoutes({ 'service.id': id }),
        kongApi.listPlugins({ 'service.id': id }),
      ]);
      setService(serviceRes);
      setRoutes(routesRes.data || []);
      setPlugins(pluginsRes.data || []);
    } catch {
      message.error('Failed to fetch service details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = () => {
    if (!service) return;
    form.setFieldsValue({
      ...service,
      tags: service.tags?.join(', '),
      client_certificate: service.client_certificate?.id,
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async (values: Record<string, unknown>) => {
    if (!service) return;
    try {
      const data = {
        ...values,
        tags: values.tags ? String(values.tags).split(',').map(t => t.trim()).filter(Boolean) : undefined,
        client_certificate: values.client_certificate ? { id: String(values.client_certificate) } : undefined,
      };
      await kongApi.updateService(service.id, data);
      message.success('Service updated');
      setEditModalOpen(false);
      fetchData();
    } catch {
      message.error('Failed to update service');
    }
  };

  const handleAddRoute = () => {
    routeForm.resetFields();
    routeForm.setFieldsValue({
      protocols: ['http', 'https'],
      strip_path: true,
      preserve_host: false,
    });
    setAddRouteModalOpen(true);
  };

  const handleCreateRoute = async (values: Record<string, unknown>) => {
    if (!service) return;
    try {
      const data = {
        ...values,
        service: { id: service.id },
        hosts: values.hosts ? String(values.hosts).split(',').map(s => s.trim()).filter(Boolean) : undefined,
        paths: values.paths ? String(values.paths).split(',').map(s => s.trim()).filter(Boolean) : undefined,
        methods: values.methods ? String(values.methods).split(',').map(s => s.trim()).filter(Boolean) : undefined,
      };
      await kongApi.createRoute(data);
      message.success('Route created');
      setAddRouteModalOpen(false);
      fetchData();
    } catch {
      message.error('Failed to create route');
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    try {
      await kongApi.deleteRoute(routeId);
      message.success('Route deleted');
      fetchData();
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

  if (!service) {
    return <div>Service not found</div>;
  }

  const routeColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (name: string, record: KongRoute) => (
      <a onClick={() => navigate(`/routes/${record.id}`)}>{name || record.id.substring(0, 8)}</a>
    )},
    { title: 'Hosts', dataIndex: 'hosts', key: 'hosts', render: (hosts: string[]) => hosts?.join(', ') },
    { title: 'Paths', dataIndex: 'paths', key: 'paths', render: (paths: string[]) => paths?.join(', ') },
    { title: 'Methods', dataIndex: 'methods', key: 'methods', render: (methods: string[]) =>
      methods?.map(m => <Tag key={m} color="blue">{m}</Tag>)
    },
    { title: 'Protocols', dataIndex: 'protocols', key: 'protocols', render: (protocols: string[]) =>
      protocols?.map(p => <Tag key={p}>{p}</Tag>)
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: KongRoute) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/routes/${record.id}`)} />
          {hasPermission('routes', 'delete') && (
            <Popconfirm title="Delete this route?" onConfirm={() => handleDeleteRoute(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

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
              {hasPermission('services', 'update') && (
                <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>Edit</Button>
              )}
            </Space>
          }
        >
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="ID">{service.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{service.name}</Descriptions.Item>
            <Descriptions.Item label="Host">{service.host}</Descriptions.Item>
            <Descriptions.Item label="Port">{service.port}</Descriptions.Item>
            <Descriptions.Item label="Protocol">{service.protocol}</Descriptions.Item>
            <Descriptions.Item label="Path">{service.path}</Descriptions.Item>
            <Descriptions.Item label="Retries">{service.retries}</Descriptions.Item>
            <Descriptions.Item label="Connect Timeout">{service.connect_timeout} ms</Descriptions.Item>
            <Descriptions.Item label="Write Timeout">{service.write_timeout} ms</Descriptions.Item>
            <Descriptions.Item label="Read Timeout">{service.read_timeout} ms</Descriptions.Item>
            <Descriptions.Item label="Tags">{service.tags?.map(t => <Tag key={t}>{t}</Tag>)}</Descriptions.Item>
            <Descriptions.Item label="Enabled">{service.enabled ? 'Yes' : 'No'}</Descriptions.Item>
          </Descriptions>
        </Card>
      ),
    },
    {
      key: 'routes',
      label: `Routes (${routes.length})`,
      children: (
        <Card
          extra={
            hasPermission('routes', 'create') && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRoute}>Add Route</Button>
            )
          }
        >
          <Table columns={routeColumns} dataSource={routes} rowKey="id" pagination={false} />
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
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddPluginModalOpen(true)}>Add Plugin</Button>
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/services')}>Back to Services</Button>
      </div>

      <Card title={<><strong>Service:</strong> {service.name || service.id}</>}>
        <Tabs items={tabItems} />
      </Card>

      {/* Edit Service Modal */}
      <Modal
        title="Edit Service"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="name" label="Name">
            <Input placeholder="Service name" />
          </Form.Item>
          <Form.Item name="tags" label="Tags" help="Comma-separated values">
            <Input placeholder="tag1, tag2, tag3" />
          </Form.Item>
          <Form.Item name="protocol" label="Protocol">
            <Select options={PROTOCOLS.map(p => ({ value: p, label: p }))} />
          </Form.Item>
          <Form.Item name="host" label="Host" rules={[{ required: true }]}>
            <Input placeholder="example.com" />
          </Form.Item>
          <Form.Item name="port" label="Port">
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="path" label="Path">
            <Input placeholder="/api" />
          </Form.Item>
          <Form.Item name="retries" label="Retries">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="connect_timeout" label="Connect Timeout (ms)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="write_timeout" label="Write Timeout (ms)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="read_timeout" label="Read Timeout (ms)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Route Modal */}
      <Modal
        title="Add Route"
        open={addRouteModalOpen}
        onCancel={() => setAddRouteModalOpen(false)}
        onOk={() => routeForm.submit()}
        width={700}
      >
        <Form form={routeForm} layout="vertical" onFinish={handleCreateRoute}>
          <Form.Item name="name" label="Name">
            <Input placeholder="Route name" />
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
          <Form.Item name="protocols" label="Protocols">
            <Select mode="multiple" options={PROTOCOLS.map(p => ({ value: p, label: p }))} />
          </Form.Item>
          <Form.Item name="strip_path" label="Strip Path" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="preserve_host" label="Preserve Host" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Plugin Modal - Simplified */}
      <Modal
        title="Add Plugin to Service"
        open={addPluginModalOpen}
        onCancel={() => setAddPluginModalOpen(false)}
        footer={
          <Button onClick={() => {
            setAddPluginModalOpen(false);
            navigate(`/plugins?create&service=${service.id}`);
          }}>
            Go to Plugins Page
          </Button>
        }
      >
        <p>Adding plugins with configuration requires the full plugin form.</p>
        <p>Click below to go to the Plugins page with this service pre-selected.</p>
      </Modal>

      {/* Raw View Drawer */}
      <Drawer
        title="Raw View"
        open={rawViewOpen}
        onClose={() => setRawViewOpen(false)}
        width={600}
      >
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {JSON.stringify(service, null, 2)}
        </pre>
      </Drawer>
    </div>
  );
};

export default ServiceDetail;
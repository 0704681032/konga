import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select,
  message, Popconfirm, Tag, Drawer, Descriptions, Switch, InputNumber
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongRoute } from '../../types';
import { PROTOCOLS, HTTP_METHODS } from '../../utils/constants';

const Routes: React.FC = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = React.useState<KongRoute[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingRoute, setEditingRoute] = React.useState<KongRoute | null>(null);
  const [viewingRoute, setViewingRoute] = React.useState<KongRoute | null>(null);
  const [form] = Form.useForm();
  const { hasPermission } = useAuthStore();

  const fetchRoutes = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await kongApi.listRoutes();
      setRoutes(response.data || []);
    } catch {
      message.error('Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRoutes();
  }, []);

  const handleCreate = () => {
    setEditingRoute(null);
    form.resetFields();
    form.setFieldsValue({
      protocols: ['http', 'https'],
      strip_path: true,
      preserve_host: false,
      regex_priority: 0,
      https_redirect_status_code: 426,
    });
    setModalOpen(true);
  };

  const handleEdit = (route: KongRoute) => {
    setEditingRoute(route);
    form.setFieldsValue({
      ...route,
      service: route.service?.id,
      tags: route.tags?.join(', '),
      hosts: route.hosts?.join(', '),
      paths: route.paths?.join(', '),
      methods: route.methods?.join(', '),
      headers: route.headers ? Object.entries(route.headers).map(([k, v]) => `${k}:${(v as string[]).join(',')}`).join(', ') : '',
      snis: (route as unknown as Record<string, string[]>).snis?.join(', '),
      sources: (route as unknown as Record<string, string[]>).sources?.join(', '),
      destinations: (route as unknown as Record<string, string[]>).destinations?.join(', '),
    });
    setModalOpen(true);
  };

  const handleView = (route: KongRoute) => {
    setViewingRoute(route);
    setDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await kongApi.deleteRoute(id);
      message.success('Route deleted');
      fetchRoutes();
    } catch {
      message.error('Failed to delete route');
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      // Parse comma-separated values into arrays
      const parseArray = (v: unknown): string[] | undefined =>
        v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : undefined;

      const parseHeaders = (v: unknown): Record<string, string[]> | undefined => {
        if (!v) return undefined;
        const result: Record<string, string[]> = {};
        String(v).split(',').forEach(h => {
          const [key, val] = h.trim().split(':');
          if (key && val) {
            result[key.trim()] = [val.trim()];
          }
        });
        return Object.keys(result).length > 0 ? result : undefined;
      };

      const data = {
        ...values,
        service: values.service ? { id: values.service } : undefined,
        tags: parseArray(values.tags),
        hosts: parseArray(values.hosts),
        paths: parseArray(values.paths),
        methods: parseArray(values.methods),
        headers: parseHeaders(values.headers),
        snis: parseArray(values.snis),
        sources: parseArray(values.sources)?.map(s => {
          const [ip, port] = s.split(':');
          return { ip, port: port ? parseInt(port) : undefined };
        }),
        destinations: parseArray(values.destinations)?.map(s => {
          const [ip, port] = s.split(':');
          return { ip, port: port ? parseInt(port) : undefined };
        }),
      };

      if (editingRoute) {
        await kongApi.updateRoute(editingRoute.id, data);
        message.success('Route updated');
      } else {
        await kongApi.createRoute(data);
        message.success('Route created');
      }
      setModalOpen(false);
      fetchRoutes();
    } catch {
      message.error('Failed to save route');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: KongRoute) => (
        <a onClick={() => navigate(`/routes/${record.id}`)} style={{ fontWeight: 500 }}>
          {name || record.id.substring(0, 8)}
        </a>
      )
    },
    {
      title: 'Protocols',
      dataIndex: 'protocols',
      key: 'protocols',
      render: (protocols: string[]) => protocols?.map(p => <Tag key={p}>{p}</Tag>)
    },
    {
      title: 'Methods',
      dataIndex: 'methods',
      key: 'methods',
      render: (methods: string[]) => methods?.map(m => <Tag key={m} color="blue">{m}</Tag>)
    },
    {
      title: 'Paths',
      dataIndex: 'paths',
      key: 'paths',
      render: (paths: string[]) => paths?.join(', ')
    },
    {
      title: 'Hosts',
      dataIndex: 'hosts',
      key: 'hosts',
      render: (hosts: string[]) => hosts?.join(', ')
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => tags?.map(t => <Tag key={t} color="blue">{t}</Tag>)
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: KongRoute) => (
        <Space>
          {hasPermission('routes', 'update') && (
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          )}
          {hasPermission('routes', 'delete') && (
            <Popconfirm title="Delete this route?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Routes"
      extra={
        hasPermission('routes', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            New Route
          </Button>
        )
      }
    >
      <Table columns={columns} dataSource={routes} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        title={editingRoute ? 'Edit Route' : 'New Route'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name">
            <Input placeholder="Route name" />
          </Form.Item>

          <Form.Item name="tags" label="Tags" help="Comma-separated values">
            <Input placeholder="tag1, tag2, tag3" />
          </Form.Item>

          <Form.Item name="protocols" label="Protocols">
            <Select mode="multiple" options={PROTOCOLS.map(p => ({ value: p, label: p }))} />
          </Form.Item>

          <Form.Item name="methods" label="Methods" help="Comma-separated: GET, POST, PUT, DELETE, etc.">
            <Select mode="tags" placeholder="GET, POST, PUT" tokenSeparators={[',']} />
          </Form.Item>

          <Form.Item name="hosts" label="Hosts" help="Comma-separated domain names">
            <Input placeholder="example.com, api.example.com" />
          </Form.Item>

          <Form.Item name="paths" label="Paths" help="Comma-separated paths">
            <Input placeholder="/api, /v1/users" />
          </Form.Item>

          <Form.Item name="headers" label="Headers" help="Format: header-name:value1,value2">
            <Input placeholder="x-custom-header:foo,bar" />
          </Form.Item>

          <Form.Item name="regex_priority" label="Regex Priority">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="https_redirect_status_code" label="HTTPS Redirect Status Code">
            <InputNumber min={300} max={399} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="path_handling" label="Path Handling">
            <Select allowClear options={[
              { value: 'v0', label: 'v0' },
              { value: 'v1', label: 'v1' },
            ]} />
          </Form.Item>

          <Form.Item name="strip_path" label="Strip Path" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="preserve_host" label="Preserve Host" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="snis" label="SNIs" help="Server Name Indication for TLS routing">
            <Input placeholder="example.com" />
          </Form.Item>

          <Form.Item name="sources" label="Sources" help="IP sources for stream routing (ip:port)">
            <Input placeholder="192.168.1.1:8080, 10.0.0.0/24:3000" />
          </Form.Item>

          <Form.Item name="destinations" label="Destinations" help="IP destinations for stream routing (ip:port)">
            <Input placeholder="192.168.1.2:8080" />
          </Form.Item>

          <Form.Item name="service" label="Service ID">
            <Input placeholder="Service ID (optional)" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title="Route Details" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={500}>
        {viewingRoute && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{viewingRoute.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{viewingRoute.name}</Descriptions.Item>
            <Descriptions.Item label="Protocols">{viewingRoute.protocols?.join(', ')}</Descriptions.Item>
            <Descriptions.Item label="Methods">{viewingRoute.methods?.join(', ')}</Descriptions.Item>
            <Descriptions.Item label="Paths">{viewingRoute.paths?.join(', ')}</Descriptions.Item>
            <Descriptions.Item label="Hosts">{viewingRoute.hosts?.join(', ')}</Descriptions.Item>
            <Descriptions.Item label="Strip Path">{viewingRoute.strip_path ? 'Yes' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Preserve Host">{viewingRoute.preserve_host ? 'Yes' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Regex Priority">{viewingRoute.regex_priority}</Descriptions.Item>
            <Descriptions.Item label="HTTPS Redirect">{viewingRoute.https_redirect_status_code}</Descriptions.Item>
            <Descriptions.Item label="Service">{viewingRoute.service?.id}</Descriptions.Item>
            <Descriptions.Item label="Tags">{viewingRoute.tags?.join(', ')}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </Card>
  );
};

export default Routes;
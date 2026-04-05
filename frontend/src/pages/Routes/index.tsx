import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select,
  message, Popconfirm, Tag, Switch, InputNumber, Alert
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongRoute, KongService } from '../../types';
import { PROTOCOLS } from '../../utils/constants';
import TagsInput from '../../components/TagsInput';
import axios from 'axios';

const Routes: React.FC = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = React.useState<KongRoute[]>([]);
  const [services, setServices] = React.useState<KongService[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingRoute, setEditingRoute] = React.useState<KongRoute | null>(null);
  const [existingTags, setExistingTags] = React.useState<string[]>([]);
  const [form] = Form.useForm();
  const { hasPermission } = useAuthStore();

  const fetchRoutes = React.useCallback(async () => {
    setLoading(true);
    try {
      const [routesRes, servicesRes] = await Promise.all([
        kongApi.listRoutes(),
        kongApi.listServices(),
      ]);
      setRoutes(routesRes.data || []);
      setServices(servicesRes.data || []);
      // Extract all existing tags for autocomplete
      const allTags = new Set<string>();
      (routesRes.data || []).forEach((r: KongRoute) => r.tags?.forEach(t => allTags.add(t)));
      setExistingTags(Array.from(allTags));
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
      tags: [],
    });
    setModalOpen(true);
  };

  const handleEdit = (route: KongRoute) => {
    setEditingRoute(route);
    form.setFieldsValue({
      ...route,
      service: route.service?.id,
      tags: route.tags || [],
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

      const hosts = parseArray(values.hosts);
      const paths = parseArray(values.paths);
      const methods = parseArray(values.methods);

      // Validation: at least one of hosts, paths, or methods must be set
      if (!hosts?.length && !paths?.length && !methods?.length) {
        message.error('At least one of Hosts, Paths, or Methods must be set');
        return;
      }

      const data: Partial<KongRoute> = {
        ...values,
        service: values.service ? { id: String(values.service) } : undefined,
        hosts,
        paths,
        methods,
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
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const kongError = error.response.data;
        message.error(kongError.message || 'Failed to save route');
      } else {
        message.error('Failed to save route');
      }
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
        <Alert
          message="At least one of Hosts, Paths, or Methods is required"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" help="The name of the Route.">
            <Input placeholder="my-route" />
          </Form.Item>

          <Form.Item name="tags" label="Tags">
            <TagsInput
              existingTags={existingTags}
              help="Optionally add tags to the route"
            />
          </Form.Item>

          <Form.Item name="protocols" label="Protocols" help="A list of protocols this Route should allow. Default: http, https.">
            <Select mode="multiple" options={PROTOCOLS.map(p => ({ value: p, label: p }))} />
          </Form.Item>

          <Form.Item name="methods" label="Methods" help="A list of HTTP methods that match this Route. At least one of hosts, paths, or methods must be set.">
            <Select mode="tags" placeholder="GET, POST, PUT" tokenSeparators={[',']} />
          </Form.Item>

          <Form.Item name="hosts" label="Hosts" help="A list of domain names that match this Route. At least one of hosts, paths, or methods must be set.">
            <Input placeholder="example.com, api.example.com" />
          </Form.Item>

          <Form.Item name="paths" label="Paths" help="A list of paths that match this Route. At least one of hosts, paths, or methods must be set.">
            <Input placeholder="/api, /v1/users" />
          </Form.Item>

          <Form.Item name="headers" label="Headers" help="One or more lists of values indexed by header name. Format: header-name:value1,value2">
            <Input placeholder="x-custom-header:foo,bar" />
          </Form.Item>

          <Form.Item name="regex_priority" label="Regex Priority" help="A number used to choose which route resolves a given request when several routes match using regexes. Default: 0.">
            <InputNumber style={{ width: '100%' }} placeholder="0" />
          </Form.Item>

          <Form.Item name="https_redirect_status_code" label="HTTPS Redirect Status Code" help="The status code Kong responds with when the protocol is HTTP instead of HTTPS. Default: 426.">
            <InputNumber min={300} max={399} style={{ width: '100%' }} placeholder="426" />
          </Form.Item>

          <Form.Item name="path_handling" label="Path Handling" help="Controls how the Service path and the Route path are combined.">
            <Select allowClear options={[
              { value: 'v0', label: 'v0' },
              { value: 'v1', label: 'v1' },
            ]} />
          </Form.Item>

          <Form.Item name="strip_path" label="Strip Path" help="When matching a Route via paths, strip the matching prefix from the upstream request URL." valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="preserve_host" label="Preserve Host" help="When matching via hosts, use the request Host header in the upstream request headers." valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="snis" label="SNIs" help="A list of SNIs that match this Route when using stream routing.">
            <Input placeholder="example.com" />
          </Form.Item>

          <Form.Item name="sources" label="Sources" help="A list of IP sources of incoming connections when using stream routing. Format: ip:port">
            <Input placeholder="192.168.1.1:8080, 10.0.0.0/24:3000" />
          </Form.Item>

          <Form.Item name="destinations" label="Destinations" help="A list of IP destinations of incoming connections when using stream routing. Format: ip:port">
            <Input placeholder="192.168.1.2:8080" />
          </Form.Item>

          <Form.Item name="service" label="Service" help="The Service this Route is associated to. Routes without a Service can only be reached by other Routes.">
            <Select
              allowClear
              showSearch
              placeholder="Select a service"
              optionFilterProp="label"
              options={services.map(s => ({
                value: s.id,
                label: s.name || s.id.substring(0, 8),
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Routes;
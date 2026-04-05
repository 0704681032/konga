import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Descriptions, Button, Space, Form, Input, InputNumber,
  Switch, message, Spin, Table, Tag, Popconfirm, Drawer, Modal
} from 'antd';
import {
  EditOutlined, DeleteOutlined, PlusOutlined, CodeOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongApi, KongPlugin } from '../../types';

const ApiDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [api, setApi] = React.useState<KongApi | null>(null);
  const [plugins, setPlugins] = React.useState<KongPlugin[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [rawViewOpen, setRawViewOpen] = React.useState(false);
  const [form] = Form.useForm();
  const { hasPermission } = useAuthStore();

  const fetchApi = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const apiData = await kongApi.getApi(id);
      setApi(apiData);
      // Fetch plugins for this API
      const pluginsRes = await kongApi.listApiPlugins(id);
      setPlugins(pluginsRes.data || []);
    } catch {
      message.error('Failed to fetch API details');
      navigate('/apis');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  React.useEffect(() => {
    fetchApi();
  }, [fetchApi]);

  const handleEdit = () => {
    if (!api) return;
    form.setFieldsValue({
      ...api,
      hosts: api.hosts?.join(', '),
      uris: api.uris?.join(', '),
      methods: api.methods?.join(', '),
      tags: api.tags?.join(', '),
    });
    setEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await kongApi.deleteApi(id);
      message.success('API deleted');
      navigate('/apis');
    } catch {
      message.error('Failed to delete API');
    }
  };

  const handleUpdate = async (values: Record<string, unknown>) => {
    if (!id) return;
    try {
      const parseArray = (v: unknown): string[] | undefined =>
        v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : undefined;

      const data = {
        ...values,
        hosts: parseArray(values.hosts),
        uris: parseArray(values.uris),
        methods: parseArray(values.methods),
        tags: parseArray(values.tags),
      };

      await kongApi.updateApi(id, data);
      message.success('API updated');
      setEditModalOpen(false);
      fetchApi();
    } catch {
      message.error('Failed to update API');
    }
  };

  const handleTogglePlugin = async (plugin: KongPlugin) => {
    try {
      await kongApi.updatePlugin(plugin.id, { enabled: !plugin.enabled });
      message.success(`Plugin ${!plugin.enabled ? 'enabled' : 'disabled'}`);
      fetchApi();
    } catch {
      message.error('Failed to toggle plugin');
    }
  };

  const pluginColumns = [
    {
      title: '',
      key: 'toggle',
      width: 60,
      render: (_: unknown, record: KongPlugin) => (
        <Switch
          checked={record.enabled}
          onChange={() => handleTogglePlugin(record)}
          disabled={!hasPermission('plugins', 'update')}
        />
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Tag color="blue">{name}</Tag>,
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (timestamp: number) => new Date(timestamp * 1000).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: KongPlugin) => (
        <Space>
          <Button
            size="small"
            icon={<CodeOutlined />}
            onClick={() => {
              Modal.info({
                title: 'Plugin Config',
                content: <pre>{JSON.stringify(record.config, null, 2)}</pre>,
                width: 600,
              });
            }}
          />
          {hasPermission('plugins', 'delete') && (
            <Popconfirm title="Delete this plugin?" onConfirm={() => kongApi.deletePlugin(record.id).then(fetchApi)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <Spin style={{ display: 'flex', justifyContent: 'center', padding: 50 }} />
      </Card>
    );
  }

  if (!api) {
    return <Card>API not found</Card>;
  }

  return (
    <Card
      title={`API: ${api.name || api.id}`}
      extra={
        <Space>
          <Button icon={<CodeOutlined />} onClick={() => setRawViewOpen(true)}>
            Raw View
          </Button>
          {hasPermission('apis', 'update') && (
            <Button icon={<EditOutlined />} onClick={handleEdit}>
              Edit
            </Button>
          )}
          {hasPermission('apis', 'delete') && (
            <Popconfirm title="Delete this API?" onConfirm={handleDelete}>
              <Button danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      }
    >
      <Tabs
        defaultActiveKey="details"
        items={[
          {
            key: 'details',
            label: 'Details',
            children: (
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="ID">{api.id}</Descriptions.Item>
                <Descriptions.Item label="Name">{api.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="Upstream URL">{api.upstream_url}</Descriptions.Item>
                <Descriptions.Item label="Hosts">
                  {api.hosts?.map(h => <Tag key={h}>{h}</Tag>) || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="URIs">
                  {api.uris?.map(u => <Tag key={u} color="blue">{u}</Tag>) || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Methods">
                  {api.methods?.map(m => <Tag key={m} color="green">{m}</Tag>) || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Strip URI">{api.strip_uri ? 'Yes' : 'No'}</Descriptions.Item>
                <Descriptions.Item label="Preserve Host">{api.preserve_host ? 'Yes' : 'No'}</Descriptions.Item>
                <Descriptions.Item label="Retries">{api.retries || 5}</Descriptions.Item>
                <Descriptions.Item label="HTTPS Only">{api.https_only ? 'Yes' : 'No'}</Descriptions.Item>
                <Descriptions.Item label="Connect Timeout">{api.upstream_connect_timeout || 60000}ms</Descriptions.Item>
                <Descriptions.Item label="Send Timeout">{api.upstream_send_timeout || 60000}ms</Descriptions.Item>
                <Descriptions.Item label="Read Timeout">{api.upstream_read_timeout || 60000}ms</Descriptions.Item>
                <Descriptions.Item label="Tags">
                  {api.tags?.map(t => <Tag key={t}>{t}</Tag>) || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Created At">
                  {api.created_at ? new Date(api.created_at * 1000).toLocaleString() : '-'}
                </Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'plugins',
            label: `Plugins (${plugins.length})`,
            children: (
              <div>
                {hasPermission('plugins', 'create') && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{ marginBottom: 16 }}
                    onClick={() => navigate(`/plugins?api_id=${id}`)}
                  >
                    Add Plugin
                  </Button>
                )}
                <Table
                  columns={pluginColumns}
                  dataSource={plugins}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  size="small"
                />
              </div>
            ),
          },
        ]}
      />

      <Modal
        title="Edit API"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="name" label="Name">
            <Input placeholder="API name" />
          </Form.Item>
          <Form.Item name="upstream_url" label="Upstream URL" rules={[{ required: true }]}>
            <Input placeholder="http://example.com:8080" />
          </Form.Item>
          <Form.Item name="hosts" label="Hosts" help="Comma-separated domain names">
            <Input placeholder="example.com, api.example.com" />
          </Form.Item>
          <Form.Item name="uris" label="URIs" help="Comma-separated paths">
            <Input placeholder="/api, /v1/users" />
          </Form.Item>
          <Form.Item name="methods" label="Methods" help="Comma-separated: GET, POST, PUT, DELETE">
            <Input placeholder="GET, POST, PUT" />
          </Form.Item>
          <Form.Item name="retries" label="Retries">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="upstream_connect_timeout" label="Upstream Connect Timeout (ms)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="upstream_send_timeout" label="Upstream Send Timeout (ms)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="upstream_read_timeout" label="Upstream Read Timeout (ms)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="strip_uri" label="Strip URI" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="preserve_host" label="Preserve Host" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="https_only" label="HTTPS Only" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="http_if_terminated" label="HTTP if Terminated" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="tags" label="Tags" help="Comma-separated values">
            <Input placeholder="tag1, tag2, tag3" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="API Raw View"
        open={rawViewOpen}
        onClose={() => setRawViewOpen(false)}
        width={600}
      >
        <Descriptions column={1} bordered size="small">
          {Object.entries(api).map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>
              {typeof value === 'object' ? (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                String(value)
              )}
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Drawer>
    </Card>
  );
};

export default ApiDetail;
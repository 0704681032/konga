import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, message, Popconfirm, Tag, Switch
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongApi } from '../../types';

const APIs: React.FC = () => {
  const navigate = useNavigate();
  const [apis, setApis] = React.useState<KongApi[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingApi, setEditingApi] = React.useState<KongApi | null>(null);
  const [form] = Form.useForm();
  const { hasPermission } = useAuthStore();

  const fetchApis = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await kongApi.listApis();
      setApis(response.data || []);
    } catch {
      message.error('Failed to fetch APIs. Note: APIs are only available in Kong 2.x and earlier.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchApis();
  }, []);

  const handleCreate = () => {
    setEditingApi(null);
    form.resetFields();
    form.setFieldsValue({
      strip_uri: true,
      preserve_host: false,
      retries: 5,
      upstream_connect_timeout: 60000,
      upstream_send_timeout: 60000,
      upstream_read_timeout: 60000,
      https_only: false,
      http_if_terminated: false,
    });
    setModalOpen(true);
  };

  const handleEdit = (api: KongApi) => {
    setEditingApi(api);
    form.setFieldsValue({
      ...api,
      hosts: api.hosts?.join(', '),
      uris: api.uris?.join(', '),
      methods: api.methods?.join(', '),
      tags: api.tags?.join(', '),
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await kongApi.deleteApi(id);
      message.success('API deleted');
      fetchApis();
    } catch {
      message.error('Failed to delete API');
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
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

      if (editingApi) {
        await kongApi.updateApi(editingApi.id, data);
        message.success('API updated');
      } else {
        await kongApi.createApi(data);
        message.success('API created');
      }
      setModalOpen(false);
      fetchApis();
    } catch {
      message.error('Failed to save API');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: KongApi) => (
        <a onClick={() => navigate(`/apis/${record.id}`)} style={{ fontWeight: 500 }}>
          {name || record.id.substring(0, 8)}
        </a>
      )
    },
    {
      title: 'Upstream URL',
      dataIndex: 'upstream_url',
      key: 'upstream_url',
      ellipsis: true,
    },
    {
      title: 'Hosts',
      dataIndex: 'hosts',
      key: 'hosts',
      render: (hosts: string[]) => hosts?.map(h => <Tag key={h}>{h}</Tag>)
    },
    {
      title: 'URIs',
      dataIndex: 'uris',
      key: 'uris',
      render: (uris: string[]) => uris?.map(u => <Tag key={u} color="blue">{u}</Tag>)
    },
    {
      title: 'Methods',
      dataIndex: 'methods',
      key: 'methods',
      render: (methods: string[]) => methods?.map(m => <Tag key={m} color="green">{m}</Tag>)
    },
    {
      title: 'Strip URI',
      dataIndex: 'strip_uri',
      key: 'strip_uri',
      render: (v: boolean) => v ? 'Yes' : 'No',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: KongApi) => (
        <Space>
          {hasPermission('apis', 'update') && (
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          )}
          {hasPermission('apis', 'delete') && (
            <Popconfirm title="Delete this API?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="APIs (Legacy)"
      extra={
        hasPermission('apis', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            New API
          </Button>
        )
      }
    >
      <div style={{ marginBottom: 16, color: '#666' }}>
        <strong>Note:</strong> APIs are deprecated in Kong 3.x. Use Services and Routes instead.
        This page is for Kong 2.x and earlier versions.
      </div>
      <Table columns={columns} dataSource={apis} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        title={editingApi ? 'Edit API' : 'New API'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
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
            <Select mode="tags" placeholder="GET, POST" tokenSeparators={[',']} />
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
    </Card>
  );
};

export default APIs;
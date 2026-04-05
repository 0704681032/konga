import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, message, Popconfirm, Tag, Drawer, Descriptions, Switch
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongService } from '../../types';
import { PROTOCOLS } from '../../utils/constants';

const Services: React.FC = () => {
  const navigate = useNavigate();
  const [services, setServices] = React.useState<KongService[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<KongService | null>(null);
  const [viewingService, setViewingService] = React.useState<KongService | null>(null);
  const [form] = Form.useForm();
  const { hasPermission } = useAuthStore();

  const fetchServices = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await kongApi.listServices();
      setServices(response.data || []);
    } catch {
      message.error('Failed to fetch services');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchServices();
  }, []);

  const handleCreate = () => {
    setEditingService(null);
    form.resetFields();
    form.setFieldsValue({
      protocol: 'http',
      port: 80,
      retries: 5,
      connect_timeout: 60000,
      write_timeout: 60000,
      read_timeout: 60000,
    });
    setModalOpen(true);
  };

  const handleEdit = (service: KongService) => {
    setEditingService(service);
    form.setFieldsValue({
      ...service,
      tags: service.tags?.join(', '),
      client_certificate: service.client_certificate?.id,
    });
    setModalOpen(true);
  };

  const handleView = (service: KongService) => {
    setViewingService(service);
    setDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await kongApi.deleteService(id);
      message.success('Service deleted');
      fetchServices();
    } catch {
      message.error('Failed to delete service');
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      // Parse tags from comma-separated string
      const data: Partial<KongService> = {
        ...values,
        tags: values.tags ? String(values.tags).split(',').map(t => t.trim()).filter(Boolean) : undefined,
        client_certificate: values.client_certificate ? { id: String(values.client_certificate) } : undefined,
      };

      if (editingService) {
        await kongApi.updateService(editingService.id, data);
        message.success('Service updated');
      } else {
        await kongApi.createService(data);
        message.success('Service created');
      }
      setModalOpen(false);
      fetchServices();
    } catch {
      message.error('Failed to save service');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: KongService) => (
        <a onClick={() => navigate(`/services/${record.id}`)} style={{ fontWeight: 500 }}>
          {name || record.id.substring(0, 8)}
        </a>
      )
    },
    { title: 'Host', dataIndex: 'host', key: 'host' },
    { title: 'Port', dataIndex: 'port', key: 'port' },
    { title: 'Protocol', dataIndex: 'protocol', key: 'protocol', render: (p: string) => <Tag>{p}</Tag> },
    { title: 'Path', dataIndex: 'path', key: 'path' },
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
      render: (_: unknown, record: KongService) => (
        <Space>
          {hasPermission('services', 'update') && (
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          )}
          {hasPermission('services', 'delete') && (
            <Popconfirm title="Delete this service?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Services"
      extra={
        hasPermission('services', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            New Service
          </Button>
        )
      }
    >
      <Table columns={columns} dataSource={services} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        title={editingService ? 'Edit Service' : 'New Service'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name">
            <Input placeholder="Service name" />
          </Form.Item>

          <Form.Item name="tags" label="Tags" help="Comma-separated values">
            <Input placeholder="tag1, tag2, tag3" />
          </Form.Item>

          {!editingService && (
            <Form.Item name="url" label="URL" help="Shorthand to set protocol, host, port and path at once">
              <Input placeholder="http://example.com:8080/api" />
            </Form.Item>
          )}

          <Form.Item name="protocol" label="Protocol">
            <Select options={PROTOCOLS.map(p => ({ value: p, label: p }))} />
          </Form.Item>

          <Form.Item name="host" label="Host" rules={[{ required: true, message: 'Host is required' }]}>
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

          <Form.Item name="client_certificate" label="Client Certificate ID" help="Certificate to use for TLS handshake">
            <Input placeholder="Certificate UUID" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title="Service Details" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={500}>
        {viewingService && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{viewingService.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{viewingService.name}</Descriptions.Item>
            <Descriptions.Item label="Host">{viewingService.host}</Descriptions.Item>
            <Descriptions.Item label="Port">{viewingService.port}</Descriptions.Item>
            <Descriptions.Item label="Protocol">{viewingService.protocol}</Descriptions.Item>
            <Descriptions.Item label="Path">{viewingService.path}</Descriptions.Item>
            <Descriptions.Item label="Retries">{viewingService.retries}</Descriptions.Item>
            <Descriptions.Item label="Connect Timeout">{viewingService.connect_timeout} ms</Descriptions.Item>
            <Descriptions.Item label="Write Timeout">{viewingService.write_timeout} ms</Descriptions.Item>
            <Descriptions.Item label="Read Timeout">{viewingService.read_timeout} ms</Descriptions.Item>
            <Descriptions.Item label="Tags">{viewingService.tags?.map(t => <Tag key={t}>{t}</Tag>)}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </Card>
  );
};

export default Services;
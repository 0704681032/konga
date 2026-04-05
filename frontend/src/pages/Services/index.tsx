import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, message, Popconfirm, Tag
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongService } from '../../types';
import { PROTOCOLS } from '../../utils/constants';
import TagsInput from '../../components/TagsInput';
import axios from 'axios';

const Services: React.FC = () => {
  const navigate = useNavigate();
  const [services, setServices] = React.useState<KongService[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<KongService | null>(null);
  const [existingTags, setExistingTags] = React.useState<string[]>([]);
  const [form] = Form.useForm();
  const { hasPermission } = useAuthStore();

  const fetchServices = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await kongApi.listServices();
      setServices(response.data || []);
      // Extract all existing tags for autocomplete
      const allTags = new Set<string>();
      (response.data || []).forEach((s: KongService) => s.tags?.forEach(t => allTags.add(t)));
      setExistingTags(Array.from(allTags));
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
      tags: [],
    });
    setModalOpen(true);
  };

  const handleEdit = (service: KongService) => {
    setEditingService(service);
    form.setFieldsValue({
      ...service,
      tags: service.tags || [],
      client_certificate: service.client_certificate?.id,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await kongApi.deleteService(id);
      message.success('Service deleted');
      fetchServices();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const kongError = error.response.data;
        if (kongError.message?.includes('routes')) {
          message.error('Cannot delete service: it has associated routes. Delete the routes first.');
        } else if (kongError.message?.includes('plugins')) {
          message.error('Cannot delete service: it has associated plugins. Delete the plugins first.');
        } else {
          message.error(kongError.message || 'Failed to delete service');
        }
      } else {
        message.error('Failed to delete service');
      }
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const data: Partial<KongService> = {
        ...values,
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
          <Form.Item name="name" label="Name" help="The service name.">
            <Input placeholder="my-service" />
          </Form.Item>

          <Form.Item name="tags" label="Tags">
            <TagsInput
              existingTags={existingTags}
              help="Optionally add tags to the service"
            />
          </Form.Item>

          {!editingService && (
            <Form.Item name="url" label="URL" help="Shorthand to set protocol, host, port and path at once. This attribute is write-only (the Admin API never returns the url).">
              <Input placeholder="http://example.com:8080/api" />
            </Form.Item>
          )}

          <Form.Item name="protocol" label="Protocol" help="The protocol used to communicate with the upstream. It can be one of http or https.">
            <Select options={PROTOCOLS.map(p => ({ value: p, label: p }))} />
          </Form.Item>

          <Form.Item name="host" label="Host" rules={[{ required: true, message: 'Host is required' }]} help="The host of the upstream server.">
            <Input placeholder="example.com" />
          </Form.Item>

          <Form.Item name="port" label="Port" help="The upstream server port. Defaults to 80.">
            <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="80" />
          </Form.Item>

          <Form.Item name="path" label="Path" help="The path to be used in requests to the upstream server. Empty by default.">
            <Input placeholder="/api" />
          </Form.Item>

          <Form.Item name="retries" label="Retries" help="The number of retries to execute upon failure to proxy. The default is 5.">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="5" />
          </Form.Item>

          <Form.Item name="connect_timeout" label="Connect Timeout (ms)" help="The timeout in milliseconds for establishing a connection to your upstream server. Defaults to 60000.">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="60000" />
          </Form.Item>

          <Form.Item name="write_timeout" label="Write Timeout (ms)" help="The timeout in milliseconds between two successive write operations for transmitting a request. Defaults to 60000.">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="60000" />
          </Form.Item>

          <Form.Item name="read_timeout" label="Read Timeout (ms)" help="The timeout in milliseconds between two successive read operations for transmitting a request. Defaults to 60000.">
            <InputNumber min={0} style={{ width: '100%' }} placeholder="60000" />
          </Form.Item>

          <Form.Item name="client_certificate" label="Client Certificate ID" help="Certificate (id) to be used as client certificate while TLS handshaking to the upstream server.">
            <Input placeholder="Certificate UUID" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Services;
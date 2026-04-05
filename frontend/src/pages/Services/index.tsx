import React from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, message, Popconfirm, Tag, Drawer, Descriptions
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongService } from '../../types';
import { PROTOCOLS } from '../../utils/constants';

const Services: React.FC = () => {
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
    form.setFieldsValue({ protocol: 'http', port: 80, retries: 5, connect_timeout: 60000 });
    setModalOpen(true);
  };

  const handleEdit = (service: KongService) => {
    setEditingService(service);
    form.setFieldsValue(service);
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

  const handleSubmit = async (values: Partial<KongService>) => {
    try {
      if (editingService) {
        await kongApi.updateService(editingService.id, values);
        message.success('Service updated');
      } else {
        await kongApi.createService(values);
        message.success('Service created');
      }
      setModalOpen(false);
      fetchServices();
    } catch {
      message.error('Failed to save service');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Host', dataIndex: 'host', key: 'host' },
    { title: 'Port', dataIndex: 'port', key: 'port' },
    { title: 'Protocol', dataIndex: 'protocol', key: 'protocol', render: (p: string) => <Tag>{p}</Tag> },
    { title: 'Path', dataIndex: 'path', key: 'path' },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: KongService) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
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
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Service name" />
          </Form.Item>
          <Form.Item name="host" label="Host" rules={[{ required: true }]}>
            <Input placeholder="example.com" />
          </Form.Item>
          <Form.Item name="port" label="Port">
            <InputNumber min={1} max={65535} />
          </Form.Item>
          <Form.Item name="protocol" label="Protocol">
            <Select options={PROTOCOLS.map(p => ({ value: p, label: p }))} />
          </Form.Item>
          <Form.Item name="path" label="Path">
            <Input placeholder="/api" />
          </Form.Item>
          <Form.Item name="retries" label="Retries">
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item name="connect_timeout" label="Connect Timeout (ms)">
            <InputNumber min={0} />
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
          </Descriptions>
        )}
      </Drawer>
    </Card>
  );
};

export default Services;
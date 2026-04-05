import React from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select,
  message, Popconfirm, Tag, Drawer, Descriptions, Switch
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongRoute } from '../../types';
import { PROTOCOLS, HTTP_METHODS } from '../../utils/constants';

const Routes: React.FC = () => {
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
    form.setFieldsValue({ protocols: ['http', 'https'], strip_path: true, preserve_host: false });
    setModalOpen(true);
  };

  const handleEdit = (route: KongRoute) => {
    setEditingRoute(route);
    form.setFieldsValue({
      ...route,
      service: route.service?.id, // Extract service ID from object
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

  const handleSubmit = async (values: Partial<KongRoute>) => {
    try {
      // Kong expects service to be { id: "..." } not a plain string
      const data = {
        ...values,
        service: values.service ? { id: values.service } : undefined,
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
    { title: 'Name', dataIndex: 'name', key: 'name' },
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
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: KongRoute) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
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
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name">
            <Input placeholder="Route name" />
          </Form.Item>
          <Form.Item name="protocols" label="Protocols">
            <Select mode="multiple" options={PROTOCOLS.map(p => ({ value: p, label: p }))} />
          </Form.Item>
          <Form.Item name="methods" label="Methods">
            <Select mode="multiple" options={HTTP_METHODS.map(m => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item name="paths" label="Paths">
            <Select mode="tags" placeholder="Enter paths" tokenSeparators={[',']} />
          </Form.Item>
          <Form.Item name="hosts" label="Hosts">
            <Select mode="tags" placeholder="Enter hosts" tokenSeparators={[',']} />
          </Form.Item>
          <Form.Item name="strip_path" label="Strip Path" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="preserve_host" label="Preserve Host" valuePropName="checked">
            <Switch />
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
          </Descriptions>
        )}
      </Drawer>
    </Card>
  );
};

export default Routes;
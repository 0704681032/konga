import React from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select,
  Switch, message, Popconfirm, Tag
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongPlugin } from '../../types';
import { PROTOCOLS } from '../../utils/constants';

const Plugins: React.FC = () => {
  const [plugins, setPlugins] = React.useState<KongPlugin[]>([]);
  const [availablePlugins, setAvailablePlugins] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingPlugin, setEditingPlugin] = React.useState<KongPlugin | null>(null);
  const [form] = Form.useForm();
  const { hasPermission } = useAuthStore();

  const fetchPlugins = React.useCallback(async () => {
    setLoading(true);
    try {
      const [pluginsRes, availableRes] = await Promise.all([
        kongApi.listPlugins(),
        kongApi.listAvailablePlugins(),
      ]);
      setPlugins(pluginsRes.data || []);
      // Backend returns grouped plugins: [{ name: "Authentication", plugins: { "basic-auth": {...}, ... } }]
      // Extract plugin names from the nested structure
      // listAvailablePlugins returns the array directly (not wrapped in { data: ... })
      const pluginNames: string[] = [];
      if (Array.isArray(availableRes)) {
        availableRes.forEach((group: { plugins?: Record<string, unknown> }) => {
          if (group.plugins) {
            Object.keys(group.plugins).forEach(name => pluginNames.push(name));
          }
        });
      }
      setAvailablePlugins(pluginNames);
    } catch {
      message.error('Failed to fetch plugins');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPlugins();
  }, []);

  const handleCreate = () => {
    setEditingPlugin(null);
    form.resetFields();
    form.setFieldsValue({ enabled: true, protocols: ['http', 'https'] });
    setModalOpen(true);
  };

  const handleEdit = (plugin: KongPlugin) => {
    setEditingPlugin(plugin);
    form.setFieldsValue({
      ...plugin,
      service: plugin.service?.id,
      route: plugin.route?.id,
      consumer: plugin.consumer?.id,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await kongApi.deletePlugin(id);
      message.success('Plugin deleted');
      fetchPlugins();
    } catch {
      message.error('Failed to delete plugin');
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const data: Partial<KongPlugin> = {
        name: values.name as string,
        enabled: values.enabled as boolean,
        protocols: values.protocols as string[],
        service: values.service ? { id: values.service as string } : undefined,
        route: values.route ? { id: values.route as string } : undefined,
        consumer: values.consumer ? { id: values.consumer as string } : undefined,
        config: {},
      };
      if (editingPlugin) {
        await kongApi.updatePlugin(editingPlugin.id, data);
        message.success('Plugin updated');
      } else {
        await kongApi.createPlugin(data);
        message.success('Plugin created');
      }
      setModalOpen(false);
      fetchPlugins();
    } catch {
      message.error('Failed to save plugin');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (name: string) => <Tag color="blue">{name}</Tag> },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>{enabled ? 'Yes' : 'No'}</Tag>
      ),
    },
    { title: 'Service', dataIndex: 'service', key: 'service', render: (s: { id: string }) => s?.id },
    { title: 'Route', dataIndex: 'route', key: 'route', render: (r: { id: string }) => r?.id },
    { title: 'Consumer', dataIndex: 'consumer', key: 'consumer', render: (c: { id: string }) => c?.id },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: KongPlugin) => (
        <Space>
          {hasPermission('plugins', 'update') && (
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          )}
          {hasPermission('plugins', 'delete') && (
            <Popconfirm title="Delete this plugin?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Plugins"
      extra={
        hasPermission('plugins', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Plugin
          </Button>
        )
      }
    >
      <Table columns={columns} dataSource={plugins} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        title={editingPlugin ? 'Edit Plugin' : 'Add Plugin'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Plugin Name" rules={[{ required: true }]}>
            <Select
              showSearch
              options={availablePlugins.map(p => ({ value: p, label: p }))}
              placeholder="Select plugin"
            />
          </Form.Item>
          <Form.Item name="enabled" label="Enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="protocols" label="Protocols">
            <Select mode="multiple" options={PROTOCOLS.map(p => ({ value: p, label: p }))} />
          </Form.Item>
          <Form.Item name="service" label="Service ID">
            <Input placeholder="Optional - apply to specific service" />
          </Form.Item>
          <Form.Item name="route" label="Route ID">
            <Input placeholder="Optional - apply to specific route" />
          </Form.Item>
          <Form.Item name="consumer" label="Consumer ID">
            <Input placeholder="Optional - apply to specific consumer" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Plugins;
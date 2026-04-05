import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Modal, Form, Input,
  message, Popconfirm, Tag
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongConsumer } from '../../types';
import TagsInput from '../../components/TagsInput';

const Consumers: React.FC = () => {
  const navigate = useNavigate();
  const [consumers, setConsumers] = React.useState<KongConsumer[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingConsumer, setEditingConsumer] = React.useState<KongConsumer | null>(null);
  const [existingTags, setExistingTags] = React.useState<string[]>([]);
  const [form] = Form.useForm();
  const { hasPermission } = useAuthStore();

  const fetchConsumers = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await kongApi.listConsumers();
      setConsumers(response.data || []);
      // Extract all existing tags for autocomplete
      const allTags = new Set<string>();
      (response.data || []).forEach((c: KongConsumer) => c.tags?.forEach(t => allTags.add(t)));
      setExistingTags(Array.from(allTags));
    } catch {
      message.error('Failed to fetch consumers');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchConsumers();
  }, []);

  const handleCreate = () => {
    setEditingConsumer(null);
    form.resetFields();
    form.setFieldsValue({ tags: [] });
    setModalOpen(true);
  };

  const handleEdit = (consumer: KongConsumer) => {
    setEditingConsumer(consumer);
    form.setFieldsValue({
      ...consumer,
      tags: consumer.tags || [],
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await kongApi.deleteConsumer(id);
      message.success('Consumer deleted');
      fetchConsumers();
    } catch {
      message.error('Failed to delete consumer');
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const data = { ...values };
      if (editingConsumer) {
        await kongApi.updateConsumer(editingConsumer.id, data);
        message.success('Consumer updated');
      } else {
        await kongApi.createConsumer(data);
        message.success('Consumer created');
      }
      setModalOpen(false);
      fetchConsumers();
    } catch {
      message.error('Failed to save consumer');
    }
  };

  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: KongConsumer) => (
        <a onClick={() => navigate(`/consumers/${record.id}`)} style={{ fontWeight: 500 }}>
          {username || record.id.substring(0, 8)}
        </a>
      )
    },
    { title: 'Custom ID', dataIndex: 'custom_id', key: 'custom_id' },
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
      render: (_: unknown, record: KongConsumer) => (
        <Space>
          {hasPermission('consumers', 'update') && (
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          )}
          {hasPermission('consumers', 'delete') && (
            <Popconfirm title="Delete this consumer?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Consumers"
      extra={
        hasPermission('consumers', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            New Consumer
          </Button>
        )
      }
    >
      <Table columns={columns} dataSource={consumers} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        title={editingConsumer ? 'Edit Consumer' : 'New Consumer'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="username" label="Username">
            <Input placeholder="Username" />
          </Form.Item>
          <Form.Item name="custom_id" label="Custom ID">
            <Input placeholder="Custom ID" />
          </Form.Item>
          <Form.Item name="tags" label="Tags">
            <TagsInput
              existingTags={existingTags}
              help="Optionally add tags to the consumer"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Consumers;
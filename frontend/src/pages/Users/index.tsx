import React from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, Switch,
  message, Popconfirm, Tag
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import apiClient from '../../api/client';
import type { User } from '../../types';
import { formatDate } from '../../utils/format';

const Users: React.FC = () => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [form] = Form.useForm();

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<User[]>('/user');
      // Backend returns array directly
      setUsers(response.data || []);
    } catch {
      message.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ admin: false, active: true });
    setModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/user/${id}`);
      message.success('User deleted');
      fetchUsers();
    } catch {
      message.error('Failed to delete user');
    }
  };

  const handleSubmit = async (values: Partial<User>) => {
    try {
      if (editingUser) {
        await apiClient.put(`/user/${editingUser.id}`, values);
        message.success('User updated');
      } else {
        await apiClient.post('/user', values);
        message.success('User created');
      }
      setModalOpen(false);
      fetchUsers();
    } catch {
      message.error('Failed to save user');
    }
  };

  const columns = [
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'First Name', dataIndex: 'firstName', key: 'firstName' },
    { title: 'Last Name', dataIndex: 'lastName', key: 'lastName' },
    {
      title: 'Admin',
      dataIndex: 'admin',
      key: 'admin',
      render: (admin: boolean) => admin ? <Tag color="blue">Admin</Tag> : null
    },
    {
      title: 'Active',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>
    },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', render: (d: number) => formatDate(d) },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: User) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this user?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Users"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          New User
        </Button>
      }
    >
      <Table columns={columns} dataSource={users} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        title={editingUser ? 'Edit User' : 'New User'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input placeholder="Username" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="Email" />
          </Form.Item>
          <Form.Item name="firstName" label="First Name">
            <Input placeholder="First Name" />
          </Form.Item>
          <Form.Item name="lastName" label="Last Name">
            <Input placeholder="Last Name" />
          </Form.Item>
          {!editingUser && (
            <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
              <Input.Password placeholder="Password" />
            </Form.Item>
          )}
          <Form.Item name="admin" label="Admin" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Users;
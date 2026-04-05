import React from 'react';
import {
  Card, Table, Button, Space, Tag, Modal, Form, Input, Select,
  message, Popconfirm, Tooltip, Switch
} from 'antd';
import {
  PlusOutlined, DeleteOutlined,
  CheckCircleOutlined, CloseCircleOutlined, HeartOutlined
} from '@ant-design/icons';
import { useConnectionStore } from '../../stores/connectionStore';
import { useAuthStore } from '../../stores/authStore';
import connectionApi from '../../api/connections';
import type { CreateConnectionData } from '../../api/connections';
import { formatDate } from '../../utils/format';
import { CONNECTION_TYPES } from '../../utils/constants';
import type { KongNode } from '../../types';
import styles from './Connections.module.css';

const Connections: React.FC = () => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingNode, setEditingNode] = React.useState<KongNode | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [form] = Form.useForm();

  const { nodes, activeNode, fetchNodes, activateNode, deactivateNode } = useConnectionStore();
  const { hasPermission } = useAuthStore();

  React.useEffect(() => {
    fetchNodes();
  }, []);

  const handleCreate = () => {
    setEditingNode(null);
    form.resetFields();
    form.setFieldsValue({ type: 'default', health_checks: false });
    setModalOpen(true);
  };

  const handleEdit = (node: KongNode) => {
    setEditingNode(node);
    form.setFieldsValue(node);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await connectionApi.delete(id);
      message.success('Connection deleted');
      fetchNodes();
    } catch {
      message.error('Failed to delete connection');
    }
  };

  const handleToggleActive = async (node: KongNode) => {
    try {
      if (activeNode?.id === node.id) {
        await deactivateNode();
        message.success('Connection deactivated');
      } else {
        await activateNode(node.id);
        message.success('Connection activated');
      }
      fetchNodes();
    } catch {
      message.error('Failed to toggle connection');
    }
  };

  const handleSubmit = async (values: CreateConnectionData) => {
    setLoading(true);
    try {
      if (editingNode) {
        await connectionApi.update(editingNode.id, values);
        message.success('Connection updated');
      } else {
        await connectionApi.create(values);
        message.success('Connection created');
      }
      setModalOpen(false);
      fetchNodes();
    } catch {
      message.error(editingNode ? 'Failed to update connection' : 'Failed to create connection');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Status',
      key: 'status',
      width: 80,
      render: (_: unknown, record: KongNode) => (
        <Tooltip title={activeNode?.id === record.id ? 'Active' : 'Inactive'}>
          {activeNode?.id === record.id ? (
            <CheckCircleOutlined className={styles.activeIcon} />
          ) : (
            <CloseCircleOutlined className={styles.inactiveIcon} />
          )}
        </Tooltip>
      ),
    },
    {
      title: 'Health',
      key: 'health',
      width: 80,
      render: (_: unknown, record: KongNode) => (
        record.health_checks ? (
          <Tooltip title={record.health_check_details?.isHealthy ? 'Healthy' : 'Unhealthy'}>
            <HeartOutlined
              className={record.health_check_details?.isHealthy ? styles.healthyIcon : styles.unhealthyIcon}
            />
          </Tooltip>
        ) : (
          <HeartOutlined className={styles.disabledIcon} />
        )
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: KongNode) => (
        hasPermission('connections', 'update') ? (
          <a onClick={() => handleEdit(record)}><strong>{name || 'undefined'}</strong></a>
        ) : (
          <strong>{name || 'undefined'}</strong>
        )
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{type || 'default'}</Tag>,
    },
    {
      title: 'Kong Admin URL',
      dataIndex: 'kong_admin_url',
      key: 'kong_admin_url',
    },
    {
      title: 'Kong Version',
      dataIndex: 'kong_version',
      key: 'kong_version',
      render: (version: string) => version === '0-10-x' ? 'undefined' : version,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: number) => formatDate(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: KongNode) => (
        <Space>
          <Button
            size="small"
            type={activeNode?.id === record.id ? 'primary' : 'default'}
            onClick={() => handleToggleActive(record)}
          >
            {activeNode?.id === record.id ? 'Deactivate' : 'Activate'}
          </Button>
          {hasPermission('connections', 'delete') && (
            <Popconfirm
              title="Delete this connection?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Card
        title="Connections"
        extra={
          hasPermission('connections', 'create') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              New Connection
            </Button>
          )
        }
      >
        <p className={styles.description}>
          Create connections to Kong Nodes and activate the one you want to use.
        </p>
        <Table
          columns={columns}
          dataSource={nodes}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          rowClassName={(record) => activeNode?.id === record.id ? styles.activeRow : ''}
        />
      </Card>

      <Modal
        title={editingNode ? 'Edit Connection' : 'New Connection'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="A unique connection name" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true }]}
          >
            <Select options={CONNECTION_TYPES.map(t => ({ value: t.value, label: t.label }))} />
          </Form.Item>

          <Form.Item
            name="kong_admin_url"
            label="Kong Admin URL"
            rules={[
              { required: true, message: 'Please enter Kong Admin URL' },
              { type: 'url', message: 'Please enter a valid URL' }
            ]}
          >
            <Input placeholder="http://localhost:8001" />
          </Form.Item>

          {form.getFieldValue('type') === 'key_auth' && (
            <Form.Item name="kong_api_key" label="API Key">
              <Input.Password placeholder="Kong API Key" />
            </Form.Item>
          )}

          {form.getFieldValue('type') === 'jwt' && (
            <>
              <Form.Item name="jwt_algorithm" label="JWT Algorithm">
                <Select options={[{ value: 'HS256', label: 'HS256' }, { value: 'RS256', label: 'RS256' }]} />
              </Form.Item>
              <Form.Item name="jwt_key" label="JWT Key">
                <Input placeholder="JWT Key" />
              </Form.Item>
              <Form.Item name="jwt_secret" label="JWT Secret">
                <Input.Password placeholder="JWT Secret" />
              </Form.Item>
            </>
          )}

          {form.getFieldValue('type') === 'basic_auth' && (
            <>
              <Form.Item name="username" label="Username">
                <Input placeholder="Username" />
              </Form.Item>
              <Form.Item name="password" label="Password">
                <Input.Password placeholder="Password" />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="health_checks"
            label="Enable Health Checks"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Connections;
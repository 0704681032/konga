import React from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, message, Popconfirm
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongUpstream, KongTarget } from '../../types';

const Upstreams: React.FC = () => {
  const [upstreams, setUpstreams] = React.useState<KongUpstream[]>([]);
  const [targets, setTargets] = React.useState<Record<string, KongTarget[]>>({});
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [targetModalOpen, setTargetModalOpen] = React.useState(false);
  const [selectedUpstream, setSelectedUpstream] = React.useState<KongUpstream | null>(null);
  const [editingUpstream, setEditingUpstream] = React.useState<KongUpstream | null>(null);
  const [form] = Form.useForm();
  const [targetForm] = Form.useForm();
  const { hasPermission } = useAuthStore();

  const fetchUpstreams = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await kongApi.listUpstreams();
      setUpstreams(response.data || []);
      // Fetch targets for each upstream
      const targetsMap: Record<string, KongTarget[]> = {};
      for (const upstream of response.data || []) {
        try {
          const targetsRes = await kongApi.listTargets(upstream.id);
          targetsMap[upstream.id] = targetsRes.data || [];
        } catch {
          targetsMap[upstream.id] = [];
        }
      }
      setTargets(targetsMap);
    } catch {
      message.error('Failed to fetch upstreams');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUpstreams();
  }, []);

  const handleCreate = () => {
    setEditingUpstream(null);
    form.resetFields();
    form.setFieldsValue({ algorithm: 'round-robin', slots: 10000 });
    setModalOpen(true);
  };

  const handleEdit = (upstream: KongUpstream) => {
    setEditingUpstream(upstream);
    form.setFieldsValue(upstream);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await kongApi.deleteUpstream(id);
      message.success('Upstream deleted');
      fetchUpstreams();
    } catch {
      message.error('Failed to delete upstream');
    }
  };

  const handleSubmit = async (values: Partial<KongUpstream>) => {
    try {
      if (editingUpstream) {
        await kongApi.updateUpstream(editingUpstream.id, values);
        message.success('Upstream updated');
      } else {
        await kongApi.createUpstream(values);
        message.success('Upstream created');
      }
      setModalOpen(false);
      fetchUpstreams();
    } catch {
      message.error('Failed to save upstream');
    }
  };

  // Target management
  const handleAddTarget = (upstream: KongUpstream) => {
    setSelectedUpstream(upstream);
    targetForm.resetFields();
    targetForm.setFieldsValue({ weight: 100 });
    setTargetModalOpen(true);
  };

  const handleDeleteTarget = async (upstreamId: string, targetId: string) => {
    try {
      await kongApi.deleteTarget(upstreamId, targetId);
      message.success('Target deleted');
      fetchUpstreams();
    } catch {
      message.error('Failed to delete target');
    }
  };

  const handleTargetSubmit = async (values: { target: string; weight: number }) => {
    if (!selectedUpstream) return;
    try {
      await kongApi.addTarget(selectedUpstream.id, values);
      message.success('Target added');
      setTargetModalOpen(false);
      fetchUpstreams();
    } catch {
      message.error('Failed to add target');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Algorithm', dataIndex: 'algorithm', key: 'algorithm' },
    { title: 'Slots', dataIndex: 'slots', key: 'slots' },
    {
      title: 'Targets',
      key: 'targets',
      render: (_: unknown, record: KongUpstream) => (
        <span>{targets[record.id]?.length || 0} targets</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: KongUpstream) => (
        <Space>
          {hasPermission('upstreams', 'update') && (
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          )}
          {hasPermission('upstreams', 'delete') && (
            <Popconfirm title="Delete this upstream?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Upstreams"
      extra={
        hasPermission('upstreams', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            New Upstream
          </Button>
        )
      }
    >
      <Table
        columns={columns}
        dataSource={upstreams}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        expandable={{
          expandedRowRender: (record) => (
            <div>
              <div style={{ marginBottom: 8 }}>
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleAddTarget(record)}
                >
                  Add Target
                </Button>
              </div>
              <Table
                columns={[
                  { title: 'Target', dataIndex: 'target', key: 'target' },
                  { title: 'Weight', dataIndex: 'weight', key: 'weight' },
                  {
                    title: 'Actions',
                    key: 'actions',
                    width: 80,
                    render: (_: unknown, target: KongTarget) => (
                      <Popconfirm title="Delete this target?" onConfirm={() => handleDeleteTarget(record.id, target.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    ),
                  },
                ]}
                dataSource={targets[record.id] || []}
                rowKey="id"
                size="small"
                pagination={false}
              />
            </div>
          ),
        }}
      />

      <Modal
        title={editingUpstream ? 'Edit Upstream' : 'New Upstream'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Upstream name" />
          </Form.Item>
          <Form.Item name="algorithm" label="Algorithm">
            <Select
              options={[
                { value: 'round-robin', label: 'Round Robin' },
                { value: 'consistent-hashing', label: 'Consistent Hashing' },
                { value: 'least-connections', label: 'Least Connections' },
              ]}
            />
          </Form.Item>
          <Form.Item name="slots" label="Slots">
            <InputNumber min={10} max={65536} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Add Target"
        open={targetModalOpen}
        onCancel={() => setTargetModalOpen(false)}
        onOk={() => targetForm.submit()}
      >
        <Form form={targetForm} layout="vertical" onFinish={handleTargetSubmit}>
          <Form.Item name="target" label="Target" rules={[{ required: true }]} help="e.g., 192.168.1.1:8080">
            <Input placeholder="host:port" />
          </Form.Item>
          <Form.Item name="weight" label="Weight" rules={[{ required: true }]}>
            <InputNumber min={0} max={1000} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Upstreams;
import React from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, message, Popconfirm, Collapse, Switch, Tag
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
    form.setFieldsValue({
      algorithm: 'round-robin',
      slots: 10000,
      hash_on: 'none',
      hash_fallback: 'none',
    });
    setModalOpen(true);
  };

  const handleEdit = (upstream: KongUpstream) => {
    setEditingUpstream(upstream);
    form.setFieldsValue({
      ...upstream,
      tags: upstream.tags?.join(', '),
    });
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

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const data = {
        ...values,
        tags: values.tags ? String(values.tags).split(',').map(t => t.trim()).filter(Boolean) : undefined,
      };

      if (editingUpstream) {
        await kongApi.updateUpstream(editingUpstream.id, data);
        message.success('Upstream updated');
      } else {
        await kongApi.createUpstream(data);
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
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => tags?.map(t => <Tag key={t} color="blue">{t}</Tag>),
    },
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

  const hashOnOptions = [
    { value: 'none', label: 'None (Round Robin)' },
    { value: 'consumer', label: 'Consumer' },
    { value: 'ip', label: 'IP' },
    { value: 'header', label: 'Header' },
    { value: 'cookie', label: 'Cookie' },
  ];

  const algorithmOptions = [
    { value: 'round-robin', label: 'Round Robin' },
    { value: 'consistent-hashing', label: 'Consistent Hashing' },
    { value: 'least-connections', label: 'Least Connections' },
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
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Upstream name" />
          </Form.Item>

          <Form.Item name="tags" label="Tags" help="Comma-separated values">
            <Input placeholder="tag1, tag2, tag3" />
          </Form.Item>

          <Form.Item name="algorithm" label="Algorithm">
            <Select options={algorithmOptions} />
          </Form.Item>

          <Form.Item name="slots" label="Slots">
            <InputNumber min={10} max={65536} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="hash_on" label="Hash On">
            <Select options={hashOnOptions} />
          </Form.Item>

          <Form.Item name="hash_fallback" label="Hash Fallback">
            <Select options={hashOnOptions.filter(o => o.value !== 'cookie')} />
          </Form.Item>

          <Form.Item name="hash_on_header" label="Hash On Header" help="Required when hash_on is 'header'">
            <Input placeholder="Header name" />
          </Form.Item>

          <Form.Item name="hash_fallback_header" label="Hash Fallback Header" help="Required when hash_fallback is 'header'">
            <Input placeholder="Header name" />
          </Form.Item>

          <Form.Item name="hash_on_cookie" label="Hash On Cookie" help="Required when hash_on or hash_fallback is 'cookie'">
            <Input placeholder="Cookie name" />
          </Form.Item>

          <Form.Item name="hash_on_cookie_path" label="Hash On Cookie Path">
            <Input placeholder="/" />
          </Form.Item>

          <Collapse
            items={[
              {
                key: 'healthchecks',
                label: 'Health Checks (Advanced)',
                children: (
                  <>
                    <h4>Active Health Checks</h4>
                    <Form.Item name={['healthchecks', 'active', 'type']} label="Type">
                      <Select allowClear options={[
                        { value: 'http', label: 'HTTP' },
                        { value: 'https', label: 'HTTPS' },
                        { value: 'tcp', label: 'TCP' },
                      ]} />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'http_path']} label="HTTP Path">
                      <Input placeholder="/" />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'timeout']} label="Timeout (seconds)">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'concurrency']} label="Concurrency">
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'https_verify_certificate']} label="Verify HTTPS Certificate" valuePropName="checked">
                      <Switch />
                    </Form.Item>

                    <h5 style={{ marginTop: 16 }}>Healthy Thresholds</h5>
                    <Form.Item name={['healthchecks', 'active', 'healthy', 'interval']} label="Interval (seconds)">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'healthy', 'successes']} label="Successes">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>

                    <h5>Unhealthy Thresholds</h5>
                    <Form.Item name={['healthchecks', 'active', 'unhealthy', 'interval']} label="Interval (seconds)">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'unhealthy', 'http_failures']} label="HTTP Failures">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'unhealthy', 'tcp_failures']} label="TCP Failures">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'unhealthy', 'timeouts']} label="Timeouts">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>

                    <h4 style={{ marginTop: 24 }}>Passive Health Checks</h4>
                    <Form.Item name={['healthchecks', 'passive', 'type']} label="Type">
                      <Select allowClear options={[
                        { value: 'http', label: 'HTTP' },
                        { value: 'https', label: 'HTTPS' },
                        { value: 'tcp', label: 'TCP' },
                      ]} />
                    </Form.Item>

                    <h5>Healthy Thresholds</h5>
                    <Form.Item name={['healthchecks', 'passive', 'healthy', 'successes']} label="Successes">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>

                    <h5>Unhealthy Thresholds</h5>
                    <Form.Item name={['healthchecks', 'passive', 'unhealthy', 'http_failures']} label="HTTP Failures">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'passive', 'unhealthy', 'tcp_failures']} label="TCP Failures">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'passive', 'unhealthy', 'timeouts']} label="Timeouts">
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
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
            <InputNumber min={0} max={1000} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Upstreams;
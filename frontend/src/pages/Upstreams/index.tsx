import React from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, message, Popconfirm, Collapse, Switch, Tag
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, HeartOutlined, HeartFilled, CheckCircleOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongUpstream, KongTarget } from '../../types';
import TagsInput from '../../components/TagsInput';

const Upstreams: React.FC = () => {
  const [upstreams, setUpstreams] = React.useState<KongUpstream[]>([]);
  const [targets, setTargets] = React.useState<Record<string, KongTarget[]>>({});
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [targetModalOpen, setTargetModalOpen] = React.useState(false);
  const [selectedUpstream, setSelectedUpstream] = React.useState<KongUpstream | null>(null);
  const [editingUpstream, setEditingUpstream] = React.useState<KongUpstream | null>(null);
  const [existingTags, setExistingTags] = React.useState<string[]>([]);
  const [form] = Form.useForm();
  const [targetForm] = Form.useForm();
  const { hasPermission } = useAuthStore();

  const fetchUpstreams = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await kongApi.listUpstreams();
      setUpstreams(response.data || []);
      // Extract all existing tags for autocomplete
      const allTags = new Set<string>();
      (response.data || []).forEach((u: KongUpstream) => u.tags?.forEach(t => allTags.add(t)));
      setExistingTags(Array.from(allTags));
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
      tags: [],
    });
    setModalOpen(true);
  };

  const handleEdit = (upstream: KongUpstream) => {
    setEditingUpstream(upstream);
    form.setFieldsValue({
      ...upstream,
      tags: upstream.tags || [],
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
      // Clean up values - remove nulls, undefined, and empty strings
      const cleanObject = (obj: Record<string, unknown>): Record<string, unknown> | undefined => {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== null && value !== undefined && value !== '') {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              const cleaned = cleanObject(value as Record<string, unknown>);
              if (cleaned && Object.keys(cleaned).length > 0) {
                result[key] = cleaned;
              }
            } else {
              result[key] = value;
            }
          }
        }
        return Object.keys(result).length > 0 ? result : undefined;
      };

      const data = {
        ...values,
        healthchecks: values.healthchecks ? cleanObject(values.healthchecks as Record<string, unknown>) : undefined,
      };

      // Remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );

      if (editingUpstream) {
        await kongApi.updateUpstream(editingUpstream.id, cleanData);
        message.success('Upstream updated');
      } else {
        await kongApi.createUpstream(cleanData);
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

  const handleSetTargetHealthy = async (upstreamId: string, targetId: string) => {
    try {
      await kongApi.setTargetHealthy(upstreamId, targetId);
      message.success('Target marked as healthy');
      fetchUpstreams();
    } catch {
      message.error('Failed to set target healthy');
    }
  };

  const handleSetTargetUnhealthy = async (upstreamId: string, targetId: string) => {
    try {
      await kongApi.setTargetUnhealthy(upstreamId, targetId);
      message.success('Target marked as unhealthy');
      fetchUpstreams();
    } catch {
      message.error('Failed to set target unhealthy');
    }
  };

  const getHealthIcon = (health?: string) => {
    switch (health) {
      case 'HEALTHY':
        return <span style={{ color: '#52c41a' }}><HeartFilled /> Healthy</span>;
      case 'UNHEALTHY':
        return <span style={{ color: '#ff4d4f' }}><HeartOutlined /> Unhealthy</span>;
      case 'DNS_ERROR':
        return <span style={{ color: '#ff4d4f' }}>DNS Error</span>;
      case 'HEALTHCHECKS_OFF':
        return <span style={{ color: '#999' }}><HeartOutlined /> Checks Off</span>;
      default:
        return <span style={{ color: '#999' }}>-</span>;
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
                    title: 'Health',
                    dataIndex: 'health',
                    key: 'health',
                    render: (health: string) => getHealthIcon(health),
                  },
                  {
                    title: 'Actions',
                    key: 'actions',
                    width: 180,
                    render: (_: unknown, target: KongTarget) => (
                      <Space size="small">
                        <Button
                          size="small"
                          type="primary"
                          ghost
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleSetTargetHealthy(record.id, target.id)}
                          title="Set healthy"
                        />
                        <Button
                          size="small"
                          icon={<HeartOutlined />}
                          onClick={() => handleSetTargetUnhealthy(record.id, target.id)}
                          title="Set unhealthy"
                        />
                        <Popconfirm title="Delete this target?" onConfirm={() => handleDeleteTarget(record.id, target.id)}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
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
          <Form.Item name="name" label="Name" rules={[{ required: true }]} help="A hostname-like name that can be referenced in the host field of a service.">
            <Input placeholder="my-upstream" />
          </Form.Item>

          <Form.Item name="tags" label="Tags">
            <TagsInput
              existingTags={existingTags}
              help="Optionally add tags to the upstream"
            />
          </Form.Item>

          <Form.Item name="algorithm" label="Algorithm" help="The load-balancing algorithm to use. Default: round-robin.">
            <Select options={algorithmOptions} />
          </Form.Item>

          <Form.Item name="slots" label="Slots" help="The number of slots in the loadbalancer algorithm (10-65536). Default: 10000.">
            <InputNumber min={10} max={65536} style={{ width: '100%' }} placeholder="10000" />
          </Form.Item>

          <Form.Item name="hash_on" label="Hash On" help="What to use as hashing input. Default: none (weighted-round-robin).">
            <Select options={hashOnOptions} />
          </Form.Item>

          <Form.Item name="hash_fallback" label="Hash Fallback" help="What to use as hashing input if the primary hash_on does not return a hash.">
            <Select options={hashOnOptions.filter(o => o.value !== 'cookie')} />
          </Form.Item>

          <Form.Item name="hash_on_header" label="Hash On Header" help="The header name to take the value from as hash input. Required when hash_on is 'header'.">
            <Input placeholder="X-User-ID" />
          </Form.Item>

          <Form.Item name="hash_fallback_header" label="Hash Fallback Header" help="The header name to take the value from as hash input. Required when hash_fallback is 'header'.">
            <Input placeholder="X-Session-ID" />
          </Form.Item>

          <Form.Item name="hash_on_cookie" label="Hash On Cookie" help="The cookie name to take the value from as hash input. Required when hash_on or hash_fallback is 'cookie'.">
            <Input placeholder="session_id" />
          </Form.Item>

          <Form.Item name="hash_on_cookie_path" label="Hash On Cookie Path" help="The cookie path to set in the response headers. Default: '/'">
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
                    <p style={{ color: '#666', marginBottom: 16 }}>
                      Active health checks actively probe targets for their health status.
                    </p>
                    <Form.Item name={['healthchecks', 'active', 'type']} label="Type" help="The protocol to use for health checks. Default: http.">
                      <Select allowClear options={[
                        { value: 'http', label: 'HTTP' },
                        { value: 'https', label: 'HTTPS' },
                        { value: 'tcp', label: 'TCP' },
                      ]} />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'http_path']} label="HTTP Path" help="The path to use in HTTP/HTTPS health check requests. Default: '/'">
                      <Input placeholder="/" />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'timeout']} label="Timeout (seconds)" help="Timeout for health check requests. Default: 1.">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="1" />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'concurrency']} label="Concurrency" help="Number of targets to check concurrently. Default: 10.">
                      <InputNumber min={1} style={{ width: '100%' }} placeholder="10" />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'https_verify_certificate']} label="Verify HTTPS Certificate" help="Whether to verify SSL certificates for HTTPS health checks. Default: true." valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'https_sni']} label="HTTPS SNI" help="The SNI (Server Name Indication) to use for HTTPS health checks. Useful when targets are IPs.">
                      <Input placeholder="example.com" />
                    </Form.Item>

                    <h5 style={{ marginTop: 16 }}>Healthy Thresholds</h5>
                    <Form.Item name={['healthchecks', 'active', 'healthy', 'interval']} label="Interval (seconds)" help="Interval between health checks for healthy targets. 0 disables active probes. Default: 0.">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'healthy', 'successes']} label="Successes" help="Number of successful probes to consider a target healthy. Default: 0.">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'healthy', 'http_statuses']} label="HTTP Statuses" help="HTTP status codes indicating healthiness. Default: 200, 302.">
                      <Select mode="tags" placeholder="200, 302" tokenSeparators={[',']} />
                    </Form.Item>

                    <h5>Unhealthy Thresholds</h5>
                    <Form.Item name={['healthchecks', 'active', 'unhealthy', 'interval']} label="Interval (seconds)" help="Interval between health checks for unhealthy targets. 0 disables active probes. Default: 0.">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'unhealthy', 'http_failures']} label="HTTP Failures" help="Number of HTTP failures to consider a target unhealthy. Default: 0.">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'unhealthy', 'tcp_failures']} label="TCP Failures" help="Number of TCP failures to consider a target unhealthy. Default: 0.">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'unhealthy', 'timeouts']} label="Timeouts" help="Number of timeouts to consider a target unhealthy. Default: 0.">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'active', 'unhealthy', 'http_statuses']} label="HTTP Statuses" help="HTTP status codes indicating unhealthiness. Default: 429, 404, 500, 501, 502, 503, 504, 505.">
                      <Select mode="tags" placeholder="429, 404, 500, 501, 502, 503, 504, 505" tokenSeparators={[',']} />
                    </Form.Item>

                    <h4 style={{ marginTop: 24 }}>Passive Health Checks</h4>
                    <p style={{ color: '#666', marginBottom: 16 }}>
                      Passive health checks monitor traffic to determine target health without active probing.
                    </p>
                    <Form.Item name={['healthchecks', 'passive', 'type']} label="Type" help="The protocol to use for passive health checks. Default: http.">
                      <Select allowClear options={[
                        { value: 'http', label: 'HTTP' },
                        { value: 'https', label: 'HTTPS' },
                        { value: 'tcp', label: 'TCP' },
                      ]} />
                    </Form.Item>

                    <h5>Healthy Thresholds</h5>
                    <Form.Item name={['healthchecks', 'passive', 'healthy', 'successes']} label="Successes" help="Number of successful proxied requests to consider a target healthy. Default: 0.">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'passive', 'healthy', 'http_statuses']} label="HTTP Statuses" help="HTTP status codes indicating healthiness in proxied traffic. Default: 200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 300, 301, 302, 303, 304, 305, 306, 307, 308.">
                      <Select mode="tags" placeholder="200, 201, 202..." tokenSeparators={[',']} />
                    </Form.Item>

                    <h5>Unhealthy Thresholds</h5>
                    <Form.Item name={['healthchecks', 'passive', 'unhealthy', 'http_failures']} label="HTTP Failures" help="Number of HTTP failures in proxied traffic to consider a target unhealthy. Default: 0.">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'passive', 'unhealthy', 'tcp_failures']} label="TCP Failures" help="Number of TCP failures in proxied traffic to consider a target unhealthy. Default: 0.">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'passive', 'unhealthy', 'timeouts']} label="Timeouts" help="Number of timeouts in proxied traffic to consider a target unhealthy. Default: 0.">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                    </Form.Item>
                    <Form.Item name={['healthchecks', 'passive', 'unhealthy', 'http_statuses']} label="HTTP Statuses" help="HTTP status codes indicating unhealthiness in proxied traffic. Default: 429, 500, 503.">
                      <Select mode="tags" placeholder="429, 500, 503" tokenSeparators={[',']} />
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
          <Form.Item name="target" label="Target" rules={[{ required: true }]} help="The target address (IP or hostname) with port, e.g., 192.168.1.1:8080.">
            <Input placeholder="192.168.1.1:8080" />
          </Form.Item>
          <Form.Item name="weight" label="Weight" rules={[{ required: true }]} help="The weight of this target relative to others in the upstream (0-1000).">
            <InputNumber min={0} max={1000} style={{ width: '100%' }} placeholder="100" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Upstreams;
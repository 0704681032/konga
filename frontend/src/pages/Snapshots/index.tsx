import React from 'react';
import {
  Card, Table, Button, Space,
  message, Popconfirm, Tag
} from 'antd';
import {
  PlusOutlined, DownloadOutlined, ReloadOutlined, DeleteOutlined
} from '@ant-design/icons';
import apiClient from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import type { Snapshot } from '../../types';
import { formatDateTime } from '../../utils/format';

const Snapshots: React.FC = () => {
  const [snapshots, setSnapshots] = React.useState<Snapshot[]>([]);
  const [loading, setLoading] = React.useState(false);
  const { hasPermission } = useAuthStore();

  const fetchSnapshots = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<Snapshot[]>('/snapshot');
      setSnapshots(response.data || []);
    } catch {
      message.error('Failed to fetch snapshots');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSnapshots();
  }, []);

  const handleCreate = async () => {
    try {
      await apiClient.post('/snapshots/take');
      message.success('Snapshot created');
      fetchSnapshots();
    } catch {
      message.error('Failed to create snapshot');
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await apiClient.post(`/snapshots/${id}/restore`);
      message.success('Snapshot restored');
    } catch {
      message.error('Failed to restore snapshot');
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const response = await apiClient.get(`/snapshots/${id}/download`, {
        responseType: 'blob'
      });
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `snapshot_${id}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to download snapshot');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/snapshot/${id}`);
      message.success('Snapshot deleted');
      fetchSnapshots();
    } catch {
      message.error('Failed to delete snapshot');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Kong Version', dataIndex: 'kong_version', key: 'kong_version', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', render: (d: number) => formatDateTime(d) },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: Snapshot) => (
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => handleRestore(record.id)}>
            Restore
          </Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record.id)}>
            Download
          </Button>
          {hasPermission('snapshots', 'delete') && (
            <Popconfirm title="Delete this snapshot?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Snapshots"
      extra={
        hasPermission('snapshots', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Take Snapshot
          </Button>
        )
      }
    >
      <p style={{ color: '#666', marginBottom: 16 }}>
        Create and restore Kong configuration snapshots
      </p>
      <Table columns={columns} dataSource={snapshots} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
    </Card>
  );
};

export default Snapshots;
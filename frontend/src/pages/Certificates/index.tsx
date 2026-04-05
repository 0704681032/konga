import React from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select,
  message, Popconfirm, Tag
} from 'antd';
import {
  PlusOutlined, DeleteOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongCertificate } from '../../types';

const Certificates: React.FC = () => {
  const [certificates, setCertificates] = React.useState<KongCertificate[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form] = Form.useForm();
  const { hasPermission } = useAuthStore();

  const fetchCertificates = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await kongApi.listCertificates();
      setCertificates(response.data || []);
    } catch {
      message.error('Failed to fetch certificates');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCertificates();
  }, []);

  const handleCreate = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await kongApi.deleteCertificate(id);
      message.success('Certificate deleted');
      fetchCertificates();
    } catch {
      message.error('Failed to delete certificate');
    }
  };

  const handleSubmit = async (values: Partial<KongCertificate>) => {
    try {
      await kongApi.createCertificate(values);
      message.success('Certificate created');
      setModalOpen(false);
      fetchCertificates();
    } catch {
      message.error('Failed to create certificate');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 300, ellipsis: true },
    {
      title: 'SNIs',
      dataIndex: 'snis',
      key: 'snis',
      render: (snis: string[]) => snis?.map(s => <Tag key={s}>{s}</Tag>)
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: KongCertificate) => (
        hasPermission('certificates', 'delete') && (
          <Popconfirm title="Delete this certificate?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        )
      ),
    },
  ];

  return (
    <Card
      title="Certificates"
      extra={
        hasPermission('certificates', 'create') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Certificate
          </Button>
        )
      }
    >
      <Table columns={columns} dataSource={certificates} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        title="Add Certificate"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="cert" label="Certificate" rules={[{ required: true }]}>
            <Input.TextArea rows={6} placeholder="PEM encoded certificate" />
          </Form.Item>
          <Form.Item name="key" label="Private Key" rules={[{ required: true }]}>
            <Input.TextArea rows={6} placeholder="PEM encoded private key" />
          </Form.Item>
          <Form.Item name="snis" label="SNIs (domains)">
            <Select mode="tags" placeholder="Enter domain names" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Certificates;
import React from 'react';
import { Card, Form, Input, Button, Switch, message, Spin, Divider } from 'antd';
import apiClient from '../../api/client';
import type { Settings } from '../../types';

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [settingsId, setSettingsId] = React.useState<number | null>(null);
  const [form] = Form.useForm();

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<Settings[]>('/settings');
      const settings = response.data?.[0];
      if (settings) {
        setSettingsId(settings.id);
        form.setFieldsValue(settings.data);
      }
    } catch {
      message.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, [form]);

  React.useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (settingsId) {
        await apiClient.put(`/settings/${settingsId}`, { data: values });
      } else {
        await apiClient.post('/settings', { data: values });
      }
      message.success('Settings saved');
      fetchSettings();
    } catch {
      message.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card title="Settings">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Settings">
      <Form form={form} layout="vertical" onFinish={handleSave} style={{ maxWidth: 600 }}>
        <Divider>General</Divider>

        <Form.Item name={['site_title']} label="Site Title">
          <Input placeholder="Konga" />
        </Form.Item>

        <Form.Item name={['signup_enabled']} label="Enable Signup" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Divider>Email Settings</Divider>

        <Form.Item name={['email', 'from']} label="From Email">
          <Input placeholder="noreply@example.com" />
        </Form.Item>

        <Form.Item name={['email', 'host']} label="SMTP Host">
          <Input placeholder="smtp.example.com" />
        </Form.Item>

        <Form.Item name={['email', 'port']} label="SMTP Port">
          <Input placeholder="587" />
        </Form.Item>

        <Form.Item name={['email', 'user']} label="SMTP User">
          <Input placeholder="user@example.com" />
        </Form.Item>

        <Form.Item name={['email', 'password']} label="SMTP Password">
          <Input.Password placeholder="Password" />
        </Form.Item>

        <Divider>Session Settings</Divider>

        <Form.Item name={['session', 'secret']} label="Session Secret">
          <Input.Password placeholder="Secret key" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save Settings
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SettingsPage;
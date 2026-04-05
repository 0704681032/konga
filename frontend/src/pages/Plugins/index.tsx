import React from 'react';
import {
  Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select,
  Switch, message, Popconfirm, Tag, Drawer, Descriptions, Spin
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CodeOutlined,
  SecurityScanOutlined, ApiOutlined, LockOutlined,
  ThunderboltOutlined, GlobalOutlined, UserOutlined,
  FileProtectOutlined, LinkOutlined, DatabaseOutlined, CloudOutlined,
  SettingOutlined, WarningOutlined, CheckCircleOutlined, StopOutlined,
  KeyOutlined, SafetyOutlined, SyncOutlined, FilterOutlined
} from '@ant-design/icons';
import kongApi from '../../api/kong';
import { useAuthStore } from '../../stores/authStore';
import type { KongPlugin } from '../../types';
import { PROTOCOLS } from '../../utils/constants';

// Field schema type
interface FieldSchema {
  type?: string;
  required?: boolean;
  default?: unknown;
  one_of?: string[];
  enum?: string[];
  help?: string;
  description?: string;
  fields?: Record<string, FieldSchema>;
  schema?: {
    fields?: Record<string, FieldSchema>;
    flexible?: boolean;
  };
}

// Dynamic form field renderer component
const DynamicField: React.FC<{
  name: string;
  schema: FieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}> = ({ name, schema, value, onChange }) => {
  const type = schema.type || 'string';
  const required = schema.required;
  const help = schema.help || schema.description;
  const oneOf = schema.one_of || schema.enum;

  // Handle nested record type
  if (type === 'record' && schema.fields) {
    const recordValue = (value as Record<string, unknown>) || {};
    return (
      <Form.Item label={name} help={help} required={required}>
        <div style={{ padding: 8, background: '#fafafa', borderRadius: 4 }}>
          {Object.entries(schema.fields).map(([subKey, subSchema]) => (
            <Form.Item key={subKey} label={subKey} style={{ marginBottom: 8 }}>
              <DynamicField
                name={subKey}
                schema={subSchema}
                value={recordValue[subKey]}
                onChange={(val) => onChange({ ...recordValue, [subKey]: val })}
              />
            </Form.Item>
          ))}
        </div>
      </Form.Item>
    );
  }

  // Handle table type (map of records)
  if (type === 'table' && schema.schema?.fields) {
    const tableValue = (value as Record<string, Record<string, unknown>>) || {};
    const keys = Object.keys(tableValue);

    const addKey = () => {
      const newKey = `key_${Date.now()}`;
      onChange({ ...tableValue, [newKey]: {} });
    };

    const removeKey = (key: string) => {
      const newVal = { ...tableValue };
      delete newVal[key];
      onChange(newVal);
    };

    return (
      <Form.Item label={name} help={help} required={required}>
        <div style={{ padding: 8, background: '#fafafa', borderRadius: 4 }}>
          {keys.map(key => (
            <div key={key} style={{ marginBottom: 8, padding: 8, border: '1px solid #d9d9d9', borderRadius: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Input
                  value={key}
                  onChange={(e) => {
                    const newVal = { ...tableValue };
                    newVal[e.target.value] = newVal[key];
                    delete newVal[key];
                    onChange(newVal);
                  }}
                  style={{ width: 200 }}
                  placeholder="Key name"
                />
                <Button size="small" danger onClick={() => removeKey(key)}>
                  <DeleteOutlined />
                </Button>
              </div>
              {Object.entries(schema.schema!.fields!).map(([subKey, subSchema]) => (
                <Form.Item key={subKey} label={subKey} style={{ marginBottom: 4 }}>
                  <DynamicField
                    name={subKey}
                    schema={subSchema}
                    value={(tableValue[key] || {})[subKey]}
                    onChange={(val) => onChange({
                      ...tableValue,
                      [key]: { ...(tableValue[key] || {}), [subKey]: val }
                    })}
                  />
                </Form.Item>
              ))}
            </div>
          ))}
          <Button type="dashed" onClick={addKey} block icon={<PlusOutlined />}>
            Add Entry
          </Button>
        </div>
      </Form.Item>
    );
  }

  // Handle array type
  if (type === 'array' || type === 'set') {
    const arrValue = (value as string[]) || [];
    return (
      <Form.Item label={name} help={help} required={required}>
        <Select
          mode="tags"
          value={arrValue}
          onChange={onChange}
          placeholder="Press Enter to add values"
          style={{ width: '100%' }}
        />
      </Form.Item>
    );
  }

  // Handle map type (simple key-value)
  if (type === 'map') {
    const mapValue = (value as Record<string, string>) || {};
    return (
      <Form.Item label={name} help={help} required={required}>
        {Object.entries(mapValue).map(([k, v]) => (
          <Space key={k} style={{ display: 'flex', marginBottom: 4 }}>
            <Input value={k} onChange={(e) => {
              const newVal = { ...mapValue };
              delete newVal[k];
              newVal[e.target.value] = v as string;
              onChange(newVal);
            }} placeholder="Key" style={{ width: 120 }} />
            <Input value={v as string} onChange={(e) => {
              onChange({ ...mapValue, [k]: e.target.value });
            }} placeholder="Value" style={{ width: 200 }} />
            <Button size="small" danger onClick={() => {
              const newVal = { ...mapValue };
              delete newVal[k];
              onChange(newVal);
            }}><DeleteOutlined /></Button>
          </Space>
        ))}
        <Button type="dashed" onClick={() => onChange({ ...mapValue, '': '' })} block icon={<PlusOutlined />}>
          Add
        </Button>
      </Form.Item>
    );
  }

  // Handle boolean
  if (type === 'boolean') {
    return (
      <Form.Item label={name} help={help} required={required}>
        <Switch checked={value as boolean} onChange={onChange} />
      </Form.Item>
    );
  }

  // Handle number/integer
  if (type === 'number' || type === 'integer') {
    return (
      <Form.Item label={name} help={help} required={required}>
        <InputNumber
          value={value as number}
          onChange={onChange}
          style={{ width: '100%' }}
        />
      </Form.Item>
    );
  }

  // Handle string with one_of (enum)
  if (oneOf && oneOf.length > 0) {
    return (
      <Form.Item label={name} help={help} required={required}>
        <Select value={value as string} onChange={onChange} allowClear>
          {oneOf.map(opt => (
            <Select.Option key={opt} value={opt}>{opt}</Select.Option>
          ))}
        </Select>
      </Form.Item>
    );
  }

  // Default: string
  const strValue = value as string || '';
  return (
    <Form.Item label={name} help={help} required={required}>
      <Input.TextArea
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        rows={strValue.length > 100 ? 4 : 1}
      />
    </Form.Item>
  );
};

// Dynamic config form component
const DynamicConfigForm: React.FC<{
  schema: Record<string, unknown>;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}> = ({ schema, values, onChange }) => {
  const fields = (schema.fields || {}) as Record<string, FieldSchema>;

  return (
    <>
      {Object.entries(fields).map(([key, fieldSchema]) => (
        <DynamicField
          key={key}
          name={key}
          schema={fieldSchema}
          value={values[key]}
          onChange={(value) => onChange(key, value)}
        />
      ))}
    </>
  );
};

// Plugin icon mapping
const PLUGIN_ICONS: Record<string, React.ReactNode> = {
  // Authentication plugins
  'key-auth': <KeyOutlined />,
  'basic-auth': <LockOutlined />,
  'jwt': <FileProtectOutlined />,
  'oauth2': <SafetyOutlined />,
  'hmac-auth': <SecurityScanOutlined />,
  'ldap-auth': <UserOutlined />,
  'session': <SecurityScanOutlined />,

  // Security plugins
  'acl': <LockOutlined />,
  'cors': <GlobalOutlined />,
  'ip-restriction': <StopOutlined />,
  'bot-detection': <WarningOutlined />,
  'rate-limiting': <ThunderboltOutlined />,
  'request-size-limiting': <DatabaseOutlined />,
  'response-ratelimiting': <ThunderboltOutlined />,
  'security': <SafetyOutlined />,

  // Traffic control plugins
  'request-transformer': <SyncOutlined />,
  'response-transformer': <SyncOutlined />,
  'request-termination': <StopOutlined />,
  'proxy-cache': <DatabaseOutlined />,
  'canary': <FilterOutlined />,

  // Transformation plugins
  'correlation-id': <LinkOutlined />,
  'grpc-web': <ApiOutlined />,
  'websocket': <CloudOutlined />,

  // Logging plugins
  'file-log': <DatabaseOutlined />,
  'http-log': <ApiOutlined />,
  'tcp-log': <ApiOutlined />,
  'udp-log': <ApiOutlined />,
  'syslog': <DatabaseOutlined />,
  'loggly': <DatabaseOutlined />,
  'statsd': <DatabaseOutlined />,
  'datadog': <DatabaseOutlined />,
  'prometheus': <CheckCircleOutlined />,

  // Analytics plugins
  'galileo': <CloudOutlined />,
  'kubernetes-sidecar': <CloudOutlined />,

  // Default
  'default': <SettingOutlined />,
};

const getPluginIcon = (name: string): React.ReactNode => {
  return PLUGIN_ICONS[name] || PLUGIN_ICONS['default'];
};

const Plugins: React.FC = () => {
  const [plugins, setPlugins] = React.useState<KongPlugin[]>([]);
  const [availablePlugins, setAvailablePlugins] = React.useState<Array<{ name: string; description?: string }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingPlugin, setEditingPlugin] = React.useState<KongPlugin | null>(null);
  const [pluginSchema, setPluginSchema] = React.useState<Record<string, unknown>>({});
  const [schemaLoading, setSchemaLoading] = React.useState(false);
  const [rawViewPlugin, setRawViewPlugin] = React.useState<KongPlugin | null>(null);
  const [configValues, setConfigValues] = React.useState<Record<string, unknown>>({});
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
      // Extract plugin names and descriptions from grouped structure
      const pluginList: Array<{ name: string; description?: string }> = [];
      if (Array.isArray(availableRes)) {
        availableRes.forEach((group: { name?: string; plugins?: Record<string, unknown> }) => {
          if (group.plugins) {
            Object.entries(group.plugins).forEach(([name, info]) => {
              const infoObj = info as { description?: string };
              pluginList.push({ name, description: infoObj?.description });
            });
          }
        });
      }
      setAvailablePlugins(pluginList);
    } catch {
      message.error('Failed to fetch plugins');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPlugins();
  }, []);

  const loadPluginSchema = async (pluginName: string) => {
    setSchemaLoading(true);
    try {
      const schema = await kongApi.getPluginSchema(pluginName);
      setPluginSchema(schema);
      // Initialize config values with defaults
      const defaults: Record<string, unknown> = {};
      const fields = (schema.fields || {}) as Record<string, { default?: unknown }>;
      Object.entries(fields).forEach(([key, field]) => {
        if (field.default !== undefined) {
          defaults[key] = field.default;
        }
      });
      setConfigValues(defaults);
    } catch {
      setPluginSchema({});
    } finally {
      setSchemaLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPlugin(null);
    setPluginSchema({});
    setConfigValues({});
    form.resetFields();
    form.setFieldsValue({ enabled: true, protocols: ['http', 'https'], config: {} });
    setModalOpen(true);
  };

  const handleEdit = async (plugin: KongPlugin) => {
    setEditingPlugin(plugin);
    form.setFieldsValue({
      ...plugin,
      service: plugin.service?.id,
      route: plugin.route?.id,
      consumer: plugin.consumer?.id,
      config: plugin.config || {},
    });
    setConfigValues(plugin.config || {});
    await loadPluginSchema(plugin.name);
    setModalOpen(true);
  };

  const handleToggle = async (plugin: KongPlugin) => {
    try {
      await kongApi.updatePlugin(plugin.id, { enabled: !plugin.enabled });
      message.success(`Plugin ${!plugin.enabled ? 'enabled' : 'disabled'}`);
      fetchPlugins();
    } catch {
      message.error('Failed to toggle plugin');
    }
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

  const handlePluginNameChange = (name: string) => {
    loadPluginSchema(name);
  };

  const handleConfigChange = (key: string, value: unknown) => {
    setConfigValues(prev => ({ ...prev, [key]: value }));
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
        config: configValues,
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

  const getContext = (plugin: KongPlugin): string => {
    if (plugin.service) return 'Service';
    if (plugin.route) return 'Route';
    if (plugin.consumer) return 'Consumer';
    return 'Global';
  };

  const columns = [
    {
      title: '',
      key: 'toggle',
      width: 60,
      render: (_: unknown, record: KongPlugin) => (
        <Switch
          checked={record.enabled}
          onChange={() => handleToggle(record)}
          disabled={!hasPermission('plugins', 'update')}
        />
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: KongPlugin) => (
        <a onClick={() => handleEdit(record)}>
          <Space>
            {getPluginIcon(name)}
            <Tag color="blue">{name}</Tag>
          </Space>
        </a>
      ),
    },
    {
      title: 'Context',
      key: 'context',
      render: (_: unknown, record: KongPlugin) => {
        const context = getContext(record);
        const color = context === 'Global' ? 'default' : 'processing';
        return <Tag color={color}>{context}</Tag>;
      },
    },
    {
      title: 'Applied To',
      key: 'appliedTo',
      render: (_: unknown, record: KongPlugin) => {
        if (record.service?.id) {
          return <a href={`#/services/${record.service.id}`}>{record.service.id.substring(0, 8)}...</a>;
        }
        if (record.route?.id) {
          return <a href={`#/routes/${record.route.id}`}>{record.route.id.substring(0, 8)}...</a>;
        }
        if (record.consumer?.id) {
          return <a href={`#/consumers/${record.consumer.id}`}>{record.consumer.id.substring(0, 8)}...</a>;
        }
        return <span style={{ color: '#999' }}>All Entrypoints</span>;
      },
    },
    {
      title: 'Consumer',
      dataIndex: 'consumer',
      key: 'consumer',
      render: (consumer: { id: string }) => consumer?.id ? (
        <a href={`#/consumers/${consumer.id}`}>{consumer.id.substring(0, 8)}...</a>
      ) : <span style={{ color: '#999' }}>All consumers</span>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (timestamp: number) => new Date(timestamp * 1000).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: KongPlugin) => (
        <Space>
          <Button
            size="small"
            icon={<CodeOutlined />}
            onClick={() => setRawViewPlugin(record)}
            title="Raw View"
          />
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
            Add Global Plugin
          </Button>
        )
      }
    >
      <Table columns={columns} dataSource={plugins} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        title={editingPlugin ? `Edit ${editingPlugin.name}` : 'Add Plugin'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Spin spinning={schemaLoading}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="name" label="Plugin Name" rules={[{ required: true }]}>
              <Select
                showSearch
                options={availablePlugins.map(p => ({ value: p.name, label: p.name }))}
                placeholder="Select plugin"
                onChange={handlePluginNameChange}
                disabled={!!editingPlugin}
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

            {/* Dynamic Config Form */}
            {Object.keys(pluginSchema).length > 0 && (
              <>
                <h4 style={{ marginTop: 16, marginBottom: 8 }}>Plugin Configuration</h4>
                <DynamicConfigForm
                  schema={pluginSchema}
                  values={configValues}
                  onChange={handleConfigChange}
                />
              </>
            )}
          </Form>
        </Spin>
      </Modal>

      <Drawer
        title="Plugin Raw View"
        open={!!rawViewPlugin}
        onClose={() => setRawViewPlugin(null)}
        width={600}
      >
        {rawViewPlugin && (
          <Descriptions column={1} bordered size="small">
            {Object.entries(rawViewPlugin).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {typeof value === 'object' ? (
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(value, null, 2)}
                  </pre>
                ) : (
                  String(value)
                )}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Drawer>
    </Card>
  );
};

export default Plugins;
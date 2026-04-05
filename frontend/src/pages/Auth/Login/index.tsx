import React from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import authApi from '../../../api/auth';
import type { LoginCredentials } from '../../../api/auth';
import styles from '../Auth.module.css';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  const onFinish = async (values: LoginCredentials) => {
    setLoading(true);
    try {
      const credentials = await authApi.login(values);
      login(credentials);
      message.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.logo}>
          <img src="/images/konga-logo-white-no-icon.png" alt="Konga" />
        </div>
        <Title level={3} className={styles.title}>
          Sign In
        </Title>
        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="identifier"
            rules={[{ required: true, message: 'Please enter your username or email' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Username or Email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Sign In
            </Button>
          </Form.Item>
        </Form>
        <div className={styles.footer}>
          <Text type="secondary">
            Don't have an account?{' '}
            <Link to="/register">Sign Up</Link>
          </Text>
        </div>
      </Card>
      <div className={styles.version}>Konga v0.14.9</div>
    </div>
  );
};

export default Login;
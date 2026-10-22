import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Tag, Space, Divider } from 'antd';
import { UserOutlined, LockOutlined, CoffeeOutlined, CrownOutlined, IdcardOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const Login = () => {
  const [form] = Form.useForm();
  const [errorMsg, setErrorMsg] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleFinish = async (values) => {
    setErrorMsg('');
    const result = await login(values.username, values.password);
    if (result.success) {
      navigate('/pos');
    } else {
      setErrorMsg(result.message || 'Đăng nhập không thành công');
    }
  };

  const setDemoAccount = (username, password) => {
    form.setFieldsValue({ username, password });
    setErrorMsg('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#faf7f4',
        padding: 24,
        position: 'relative'
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 18,
          boxShadow: '0 4px 20px rgba(111, 78, 55, 0.06)',
          background: '#ffffff',
          border: '1px solid #eee7e1',
          padding: '16px 20px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              background: '#f5efe8',
              border: '1px solid #e5dbd2',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}
          >
            <CoffeeOutlined style={{ fontSize: 28, color: '#6f4e37' }} />
          </div>
          <Title level={3} style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 800, color: '#2d2420', letterSpacing: '-0.02em' }}>
            Smart Coffee POS
          </Title>
          <Text style={{ color: '#8d7b72', fontSize: 13, display: 'block', marginTop: 4 }}>
            Quản Lý Chuỗi Cà Phê & Phân Tích AI
          </Text>
        </div>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 18, borderRadius: 8, background: '#fdf2f0', borderColor: '#f9deda' }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ username: 'admin', password: 'password123' }}>
          <Form.Item
            name="username"
            label={<span style={{ fontWeight: 600, color: '#5c4d44', fontSize: 13 }}>Tên đăng nhập</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bdae9f' }} />}
              placeholder="Nhập username"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ fontWeight: 600, color: '#5c4d44', fontSize: 13 }}>Mật khẩu</span>}
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bdae9f' }} />}
              placeholder="Nhập mật khẩu"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            style={{
              height: 44,
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              background: '#6f4e37',
              borderColor: '#6f4e37',
              marginTop: 6
            }}
          >
            Đăng Nhập
          </Button>
        </Form>

        <Divider style={{ margin: '22px 0 16px 0', borderColor: '#eee7e1' }}>
          <span style={{ fontSize: 12, color: '#8d7b72' }}>Tài khoản demo</span>
        </Divider>

        <Space wrap size={[8, 8]} style={{ width: '100%', justifyContent: 'center' }}>
          <Tag
            icon={<CrownOutlined />}
            style={{ cursor: 'pointer', padding: '5px 12px', borderRadius: 8, fontWeight: 600, background: '#f5efe8', color: '#6f4e37', borderColor: '#ded5cd' }}
            onClick={() => setDemoAccount('admin', 'password123')}
          >
            Super Admin
          </Tag>
          <Tag
            icon={<IdcardOutlined />}
            style={{ cursor: 'pointer', padding: '5px 12px', borderRadius: 8, fontWeight: 600, background: '#f0f4f8', color: '#3b5998', borderColor: '#d0dbe5' }}
            onClick={() => setDemoAccount('manager_sontay', 'password123')}
          >
            Quản Lý Thành Cổ
          </Tag>
          <Tag
            icon={<CoffeeOutlined />}
            style={{ cursor: 'pointer', padding: '5px 12px', borderRadius: 8, fontWeight: 600, background: '#f2f6f4', color: '#4a6b5d', borderColor: '#d3e0d8' }}
            onClick={() => setDemoAccount('staff_sontay1', 'password123')}
          >
            Thu Ngân Thành Cổ
          </Tag>
        </Space>
      </Card>
    </div>
  );
};

export default Login;

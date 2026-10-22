import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Tag, Space, Modal, Form, Input, Select, message, Typography, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ShopOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { branchService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const Branches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [form] = Form.useForm();
  const { fetchBranches } = useAuth();

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await branchService.getAll();
      if (res.success) {
        setBranches(res.branches);
        fetchBranches();
      }
    } catch {
      // Mock fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values) => {
    try {
      if (editingBranch) {
        await branchService.update(editingBranch.id, values);
        message.success('Cập nhật chi nhánh thành công');
      } else {
        await branchService.create(values);
        message.success('Tạo chi nhánh mới thành công');
      }
      setModalVisible(false);
      form.resetFields();
      loadBranches();
      fetchBranches();
    } catch {
      message.error('Lỗi khi lưu chi nhánh');
    }
  };

  return (
    <div style={{ padding: '24px', background: '#faf8f5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, color: '#2d2420' }}>
            Quản Trị Chi Nhánh Toàn Chuỗi
          </Title>
          <Text style={{ color: '#8d7b72', fontSize: 13 }}>
            Thêm mới, cấu hình địa chỉ và trạng thái hoạt động của từng cửa hàng
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingBranch(null);
            form.resetFields();
            setModalVisible(true);
          }}
          style={{ borderRadius: 8, fontWeight: 500 }}
        >
          + Thêm Chi Nhánh
        </Button>
      </div>

      <Card style={{ borderRadius: 14, border: '1px solid #eee7e1' }}>
        <Table
          dataSource={branches}
          rowKey="id"
          loading={loading}
          columns={[
            {
              title: 'Tên Chi Nhánh',
              dataIndex: 'name',
              key: 'name',
              render: (t) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShopOutlined style={{ color: '#6f4e37', fontSize: 16 }} />
                  <strong style={{ fontSize: 13, color: '#2d2420' }}>{t}</strong>
                </div>
              )
            },
            {
              title: 'Địa Chỉ',
              dataIndex: 'address',
              key: 'address',
              render: (addr) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#5c4d44', fontSize: 12 }}>
                  <EnvironmentOutlined style={{ color: '#4a6b5d' }} /> {addr}
                </div>
              )
            },
            {
              title: 'Hotline',
              dataIndex: 'phone',
              key: 'phone',
              render: (p) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5c4d44' }}>
                  <PhoneOutlined /> {p || '---'}
                </div>
              )
            },
            {
              title: 'Trạng Thái',
              dataIndex: 'status',
              key: 'status',
              render: (st) => (
                <Tag style={{
                  background: st === 'ACTIVE' ? '#f2f6f4' : '#f8f8f8',
                  color: st === 'ACTIVE' ? '#4a6b5d' : '#8d7b72',
                  borderColor: st === 'ACTIVE' ? '#d3e0d8' : '#eee7e1',
                  fontWeight: 600
                }}>
                  {st === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
                </Tag>
              )
            },
            {
              title: 'Thao Tác',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingBranch(record);
                      form.setFieldsValue(record);
                      setModalVisible(true);
                    }}
                  />
                  <Popconfirm
                    title="Xóa chi nhánh này?"
                    onConfirm={async () => {
                      await branchService.delete(record.id);
                      loadBranches();
                    }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              )
            }
          ]}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      <Modal
        title={editingBranch ? 'Cập Nhật Chi Nhánh' : 'Thêm Chi Nhánh'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Tên chi nhánh" rules={[{ required: true }]}>
            <Input placeholder="Chi nhánh Quận 3 - Lê Văn Sỹ" />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ" rules={[{ required: true }]}>
            <Input placeholder="Số nhà, Đường, Quận/Huyện..." />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="028..." />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" initialValue="ACTIVE">
            <Select
              options={[
                { value: 'ACTIVE', label: 'Đang hoạt động (Active)' },
                { value: 'INACTIVE', label: 'Tạm đóng cửa (Inactive)' }
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ height: 38, borderRadius: 8 }}>
            Lưu Chi Nhánh
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default Branches;

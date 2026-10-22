import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Tag, Space, Modal, Form, Input, Select, message, Typography, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, UserOutlined, CrownOutlined, IdcardOutlined, CoffeeOutlined } from '@ant-design/icons';
import { userService, branchService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const Users = () => {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const { isSuperAdmin, isBranchManager, activeBranchId, user } = useAuth();

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, bRes] = await Promise.all([
        userService.getAll({ branch_id: isSuperAdmin ? undefined : activeBranchId }),
        branchService.getAll()
      ]);
      if (uRes.success) setUsers(uRes.users);
      if (bRes.success) setBranches(bRes.branches);
    } catch {
      // Mock fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (values) => {
    try {
      // Nếu là Branch Manager, cố định branch_id là chi nhánh hiện tại
      if (!isSuperAdmin) {
        values.branch_id = activeBranchId;
        values.role = 'STAFF';
      }

      if (editingUser) {
        await userService.update(editingUser.id, values);
        message.success('Cập nhật người dùng thành công');
      } else {
        await userService.create(values);
        message.success('Tạo tài khoản mới thành công');
      }
      setModalVisible(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error(err.message || 'Lỗi khi lưu thông tin');
    }
  };

  const handleResetPassword = async (userId) => {
    try {
      const res = await userService.resetPassword(userId, { new_password: 'password123' });
      message.success(res.message || 'Đặt lại mật khẩu thành công (Mặc định: password123)');
    } catch {
      message.error('Lỗi khi đặt lại mật khẩu');
    }
  };

  return (
    <div style={{ padding: '24px', background: '#faf8f5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, color: '#2d2420' }}>
            Quản Lý Nhân Sự & Phân Quyền
          </Title>
          <Text style={{ color: '#8d7b72', fontSize: 13 }}>
            {isSuperAdmin
              ? 'Phân quyền Super Admin (Chuỗi), Quản Lý Chi Nhánh và Nhân Viên POS'
              : 'Quản lý danh sách nhân viên thu ngân / phục vụ thuộc chi nhánh'}
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingUser(null);
            form.resetFields();
            if (!isSuperAdmin) {
              form.setFieldsValue({ branch_id: activeBranchId, role: 'STAFF' });
            }
            setModalVisible(true);
          }}
          style={{ borderRadius: 8, fontWeight: 500 }}
        >
          + Thêm Tài Khoản
        </Button>
      </div>

      <Card style={{ borderRadius: 14, border: '1px solid #eee7e1' }}>
        <Table
          dataSource={users}
          rowKey="id"
          loading={loading}
          columns={[
            {
              title: 'Họ và Tên',
              dataIndex: 'full_name',
              key: 'name',
              render: (name, r) => (
                <div>
                  <strong style={{ color: '#2d2420' }}>{name}</strong>
                  <div style={{ fontSize: 11, color: '#8d7b72' }}>@{r.username}</div>
                </div>
              )
            },
            {
              title: 'Chi Nhánh',
              dataIndex: 'branch_name',
              key: 'branch',
              render: (b) => b || <Tag style={{ background: '#f5efe8', color: '#6f4e37', borderColor: '#ded5cd' }}>Toàn Chuỗi</Tag>
            },
            {
              title: 'Vai Trò',
              dataIndex: 'role',
              key: 'role',
              render: (role) => {
                if (role === 'SUPER_ADMIN') {
                  return <Tag icon={<CrownOutlined />} style={{ background: '#f5efe8', color: '#6f4e37', borderColor: '#ded5cd', fontWeight: 600 }}>Super Admin</Tag>;
                } else if (role === 'BRANCH_MANAGER') {
                  return <Tag icon={<IdcardOutlined />} style={{ background: '#f0f4f8', color: '#3b5998', borderColor: '#d0dbe5', fontWeight: 600 }}>Quản Lý</Tag>;
                } else {
                  return <Tag icon={<CoffeeOutlined />} style={{ background: '#f2f6f4', color: '#4a6b5d', borderColor: '#d3e0d8', fontWeight: 600 }}>Thu Ngân</Tag>;
                }
              }
            },
            {
              title: 'Trạng Thái',
              dataIndex: 'status',
              key: 'status',
              render: (s) => (
                <Tag style={{
                  background: s === 'ACTIVE' ? '#f2f6f4' : '#fdf2f0',
                  color: s === 'ACTIVE' ? '#4a6b5d' : '#b85042',
                  borderColor: s === 'ACTIVE' ? '#d3e0d8' : '#f9deda',
                  fontWeight: 600
                }}>
                  {s === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                </Tag>
              )
            },
            {
              title: 'Thao Tác',
              key: 'actions',
              render: (_, record) => {
                const canEdit = isSuperAdmin || (record.role === 'STAFF' && record.branch_id === activeBranchId);
                if (!canEdit) return <span style={{ color: '#8d7b72', fontSize: 11 }}>---</span>;

                return (
                  <Space>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => {
                        setEditingUser(record);
                        form.setFieldsValue(record);
                        setModalVisible(true);
                      }}
                    />
                    <Popconfirm
                      title="Đặt lại mật khẩu về 'password123'?"
                      onConfirm={() => handleResetPassword(record.id)}
                    >
                      <Button size="small" icon={<KeyOutlined />}>Reset</Button>
                    </Popconfirm>
                    {isSuperAdmin && (
                      <Popconfirm
                        title="Xóa tài khoản này?"
                        onConfirm={async () => {
                          await userService.delete(record.id);
                          loadData();
                        }}
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    )}
                  </Space>
                );
              }
            }
          ]}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* MODAL THÊM/SỬA */}
      <Modal
        title={editingUser ? 'Cập Nhật Tài Khoản' : 'Thêm Người Dùng'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleSaveUser}>
          <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true }]}>
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          {!editingUser && (
            <>
              <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true }]}>
                <Input placeholder="staff_nv1" />
              </Form.Item>
              <Form.Item name="password" label="Mật khẩu" initialValue="password123">
                <Input.Password />
              </Form.Item>
            </>
          )}
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="090..." />
          </Form.Item>
          {isSuperAdmin && (
            <Form.Item name="role" label="Vai trò" initialValue="STAFF">
              <Select
                options={[
                  { value: 'SUPER_ADMIN', label: 'Super Admin (Quản trị chuỗi)' },
                  { value: 'BRANCH_MANAGER', label: 'Quản lý chi nhánh (Manager)' },
                  { value: 'STAFF', label: 'Nhân viên thu ngân / phục vụ (Staff)' }
                ]}
              />
            </Form.Item>
          )}
          {isSuperAdmin && (
            <Form.Item name="branch_id" label="Chi nhánh làm việc">
              <Select
                allowClear
                placeholder="Chọn chi nhánh..."
                options={branches.map(b => ({ value: b.id, label: b.name }))}
              />
            </Form.Item>
          )}
          <Form.Item name="status" label="Trạng thái" initialValue="ACTIVE">
            <Select
              options={[
                { value: 'ACTIVE', label: 'Hoạt động (Active)' },
                { value: 'LOCKED', label: 'Khóa tài khoản (Locked)' }
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ height: 38, borderRadius: 8 }}>
            Lưu Tài Khoản
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;

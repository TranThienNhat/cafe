import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Spin,
  Typography,
  Space,
  Popconfirm,
  Tooltip,
  Empty
} from 'antd';
import {
  TableOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CoffeeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { tableService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const DEFAULT_AREAS = ['Tầng 1', 'Tầng 2', 'Sân Vườn', 'Khu VIP'];

const Tables = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const { activeBranchId, isBranchManager } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadTables();
  }, [activeBranchId]);

  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await tableService.getAll({ branch_id: activeBranchId });
      if (res && res.success) {
        setTables(res.tables || []);
      }
    } catch {
      // Mock fallback
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (tableId, newStatus) => {
    try {
      const res = await tableService.updateStatus(tableId, newStatus);
      if (res && res.success) {
        message.success('Cập nhật trạng thái bàn thành công');
        loadTables();
      } else {
        message.error(res?.message || 'Lỗi khi cập nhật trạng thái');
      }
    } catch {
      message.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleOpenAddModal = () => {
    setEditingTable(null);
    form.resetFields();
    form.setFieldsValue({ area: 'Tầng 1', status: 'AVAILABLE' });
    setModalVisible(true);
  };

  const handleOpenEditModal = (table) => {
    setEditingTable(table);
    form.resetFields();
    form.setFieldsValue({
      table_name: table.table_name,
      area: table.area || 'Tầng 1',
      status: table.status || 'AVAILABLE'
    });
    setModalVisible(true);
  };

  const handleSaveTable = async (values) => {
    setSaving(true);
    try {
      if (editingTable) {
        const res = await tableService.update(editingTable.id, {
          table_name: values.table_name,
          area: values.area || 'Tầng 1',
          status: values.status || editingTable.status
        });
        if (res && res.success) {
          message.success(`Cập nhật bàn "${values.table_name}" thành công`);
          setModalVisible(false);
          setEditingTable(null);
          form.resetFields();
          loadTables();
        } else {
          message.error(res?.message || 'Lỗi khi cập nhật bàn');
        }
      } else {
        const res = await tableService.create({
          branch_id: activeBranchId,
          table_name: values.table_name,
          area: values.area || 'Tầng 1'
        });
        if (res && res.success) {
          message.success(`Thêm bàn mới "${values.table_name}" thành công`);
          setModalVisible(false);
          form.resetFields();
          loadTables();
        } else {
          message.error(res?.message || 'Lỗi khi thêm bàn');
        }
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Đã có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTable = async (table) => {
    if (table.status === 'OCCUPIED') {
      message.warning('Không thể xóa bàn đang có khách phục vụ');
      return;
    }
    try {
      const res = await tableService.delete(table.id);
      if (res && res.success) {
        message.success(`Đã xóa bàn "${table.table_name}" thành công`);
        loadTables();
      } else {
        message.error(res?.message || 'Lỗi khi xóa bàn');
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Lỗi khi xóa bàn');
    }
  };

  // Gom nhóm danh sách khu vực
  const existingAreas = Array.from(new Set(tables.map((t) => t.area || 'Tầng 1')));
  const areas = existingAreas.length > 0 ? existingAreas : ['Tầng 1'];
  const allAreaOptions = Array.from(new Set([...DEFAULT_AREAS, ...existingAreas]));

  const getStatusInfo = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          border: '#d3e0d8',
          text: '#4a6b5d',
          bg: '#f2f6f4',
          label: 'Bàn trống',
          icon: <CheckCircleOutlined />
        };
      case 'OCCUPIED':
        return {
          border: '#f9deda',
          text: '#b85042',
          bg: '#fdf2f0',
          label: 'Có khách',
          icon: <UserOutlined />
        };
      case 'RESERVED':
        return {
          border: '#e8ded4',
          text: '#9c6644',
          bg: '#faf5f0',
          label: 'Đã đặt',
          icon: <ClockCircleOutlined />
        };
      default:
        return {
          border: '#eee7e1',
          text: '#8d7b72',
          bg: '#ffffff',
          label: '---',
          icon: null
        };
    }
  };

  return (
    <div style={{ padding: '24px', background: '#faf8f5', minHeight: '100%' }}>
      {/* HEADER SECTION */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div>
          <Title
            level={3}
            style={{
              margin: 0,
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 700,
              color: '#2d2420'
            }}
          >
            Sơ Đồ Bàn Phục Vụ
          </Title>
          <Text style={{ color: '#8d7b72', fontSize: 13 }}>
            Theo dõi trạng thái phục vụ, tùy chỉnh và quản lý bàn theo từng khu vực
          </Text>
        </div>

        <Space>
          {isBranchManager && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenAddModal}
              style={{
                borderRadius: 8,
                fontWeight: 600,
                background: '#6f4e37',
                borderColor: '#6f4e37',
                height: 38
              }}
            >
              Thêm Bàn
            </Button>
          )}
        </Space>
      </div>

      {/* CONTENT SECTION */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" />
        </div>
      ) : tables.length === 0 ? (
        <Card
          style={{
            borderRadius: 14,
            border: '1px dashed #d9d2cb',
            textAlign: 'center',
            padding: '40px 0',
            background: '#ffffff'
          }}
        >
          <Empty
            description={
              <span style={{ color: '#8d7b72', fontSize: 14 }}>
                Chưa có bàn nào được cấu hình cho chi nhánh này
              </span>
            }
          >
            {isBranchManager && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenAddModal}
                style={{
                  borderRadius: 8,
                  marginTop: 12,
                  background: '#6f4e37',
                  borderColor: '#6f4e37'
                }}
              >
                Thêm Bàn Đầu Tiên
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        areas.map((areaName) => {
          const areaTables = tables.filter((t) => (t.area || 'Tầng 1') === areaName);
          if (areaTables.length === 0) return null;

          return (
            <div key={areaName} style={{ marginBottom: 28 }}>
              {/* Tên khu vực */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 18,
                    background: '#6f4e37',
                    borderRadius: 2
                  }}
                />
                <h4
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#2d2420'
                  }}
                >
                  Khu vực: {areaName}
                </h4>
                <Tag
                  style={{
                    borderRadius: 10,
                    fontSize: 12,
                    border: 'none',
                    background: '#eee7e1',
                    color: '#6f4e37',
                    fontWeight: 600
                  }}
                >
                  {areaTables.length} bàn
                </Tag>
              </div>

              {/* Lưới các bàn */}
              <Row gutter={[16, 16]}>
                {areaTables.map((table) => {
                  const statusInfo = getStatusInfo(table.status);
                  const isOccupied = table.status === 'OCCUPIED';

                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={table.id}>
                      <Card
                        hoverable
                        style={{
                          borderRadius: 12,
                          border: `1.5px solid ${statusInfo.border}`,
                          background: '#ffffff',
                          boxShadow: '0 2px 8px rgba(111, 78, 55, 0.04)',
                          transition: 'all 0.25s ease'
                        }}
                        bodyStyle={{ padding: 16 }}
                      >
                        {/* Hàng trên: Tên bàn + Tag trạng thái + Nút Sửa / Xóa */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start'
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: '#2d2420'
                              }}
                            >
                              {table.table_name}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: '#8d7b72',
                                marginTop: 2
                              }}
                            >
                              {table.area || 'Tầng 1'}
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              gap: 6
                            }}
                          >
                            <Tag
                              icon={statusInfo.icon}
                              style={{
                                margin: 0,
                                background: statusInfo.bg,
                                color: statusInfo.text,
                                borderColor: statusInfo.border,
                                fontWeight: 600,
                                fontSize: 11,
                                borderRadius: 6
                              }}
                            >
                              {statusInfo.label}
                            </Tag>

                            {/* Nút Sửa & Xóa dành cho Quản lý */}
                            {isBranchManager && (
                              <Space size={2} style={{ marginTop: 2 }}>
                                <Tooltip title="Sửa thông tin bàn">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined style={{ color: '#6f4e37' }} />}
                                    onClick={() => handleOpenEditModal(table)}
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 6,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  />
                                </Tooltip>

                                <Popconfirm
                                  title="Xác nhận xóa bàn"
                                  description={
                                    isOccupied
                                      ? 'Bàn đang có khách phục vụ, không thể xóa!'
                                      : `Bạn có chắc muốn xóa "${table.table_name}" không?`
                                  }
                                  onConfirm={() => handleDeleteTable(table)}
                                  okText="Xóa bàn"
                                  cancelText="Hủy"
                                  okButtonProps={{
                                    danger: true,
                                    disabled: isOccupied
                                  }}
                                  disabled={isOccupied}
                                >
                                  <Tooltip
                                    title={
                                      isOccupied
                                        ? 'Không thể xóa bàn đang có khách'
                                        : 'Xóa bàn'
                                    }
                                  >
                                    <Button
                                      type="text"
                                      danger
                                      size="small"
                                      disabled={isOccupied}
                                      icon={<DeleteOutlined />}
                                      style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 6,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    />
                                  </Tooltip>
                                </Popconfirm>
                              </Space>
                            )}
                          </div>
                        </div>

                        {/* Hàng dưới: Nút Gọi món + Dropdown Đổi trạng thái nhanh */}
                        <div
                          style={{
                            marginTop: 16,
                            paddingTop: 12,
                            borderTop: '1px dashed #f0eae4',
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <Button
                            size="small"
                            type="primary"
                            icon={<CoffeeOutlined />}
                            onClick={() => navigate('/pos')}
                            style={{
                              borderRadius: 6,
                              fontSize: 12,
                              height: 30,
                              background: '#6f4e37',
                              borderColor: '#6f4e37',
                              fontWeight: 500
                            }}
                          >
                            Gọi món
                          </Button>

                          <Select
                            size="small"
                            value={table.status}
                            onChange={(val) => handleStatusChange(table.id, val)}
                            style={{ width: 130 }}
                            options={[
                              {
                                value: 'AVAILABLE',
                                label: (
                                  <span>
                                    <CheckCircleOutlined
                                      style={{ color: '#4a6b5d', marginRight: 4 }}
                                    />
                                    Trống
                                  </span>
                                )
                              },
                              {
                                value: 'OCCUPIED',
                                label: (
                                  <span>
                                    <UserOutlined
                                      style={{ color: '#b85042', marginRight: 4 }}
                                    />
                                    Có khách
                                  </span>
                                )
                              },
                              {
                                value: 'RESERVED',
                                label: (
                                  <span>
                                    <ClockCircleOutlined
                                      style={{ color: '#9c6644', marginRight: 4 }}
                                    />
                                    Đã đặt
                                  </span>
                                )
                              }
                            ]}
                          />
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </div>
          );
        })
      )}

      {/* MODAL THÊM / CHỈNH SỬA BÀN */}
      <Modal
        title={
          <Space>
            <TableOutlined style={{ color: '#6f4e37' }} />
            <span style={{ fontWeight: 600 }}>
              {editingTable ? 'Chỉnh Sửa Thông Tin Bàn' : 'Thêm Bàn Mới'}
            </span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingTable(null);
        }}
        footer={null}
        centered
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveTable}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="table_name"
            label="Tên bàn"
            rules={[
              { required: true, message: 'Vui lòng nhập tên bàn' },
              { max: 50, message: 'Tên bàn tối đa 50 ký tự' }
            ]}
          >
            <Input
              placeholder="VD: Bàn 08, VIP 01, Sân Vườn 03..."
              prefix={<TableOutlined style={{ color: '#8d7b72' }} />}
            />
          </Form.Item>

          <Form.Item
            name="area"
            label="Khu vực"
            rules={[{ required: true, message: 'Vui lòng chọn khu vực' }]}
            initialValue="Tầng 1"
          >
            <Select
              placeholder="Chọn khu vực bàn đặt"
              options={allAreaOptions.map((area) => ({
                value: area,
                label: area
              }))}
            />
          </Form.Item>

          {editingTable && (
            <Form.Item
              name="status"
              label="Trạng thái phục vụ"
              rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
            >
              <Select
                options={[
                  {
                    value: 'AVAILABLE',
                    label: (
                      <span>
                        <CheckCircleOutlined
                          style={{ color: '#4a6b5d', marginRight: 6 }}
                        />
                        Bàn trống (AVAILABLE)
                      </span>
                    )
                  },
                  {
                    value: 'OCCUPIED',
                    label: (
                      <span>
                        <UserOutlined
                          style={{ color: '#b85042', marginRight: 6 }}
                        />
                        Có khách (OCCUPIED)
                      </span>
                    )
                  },
                  {
                    value: 'RESERVED',
                    label: (
                      <span>
                        <ClockCircleOutlined
                          style={{ color: '#9c6644', marginRight: 6 }}
                        />
                        Đã đặt trước (RESERVED)
                      </span>
                    )
                  }
                ]}
              />
            </Form.Item>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 24
            }}
          >
            <Button
              onClick={() => {
                setModalVisible(false);
                setEditingTable(null);
              }}
              style={{ borderRadius: 8 }}
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              style={{
                borderRadius: 8,
                background: '#6f4e37',
                borderColor: '#6f4e37',
                fontWeight: 600
              }}
            >
              {editingTable ? 'Cập Nhật' : 'Tạo Bàn'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Tables;


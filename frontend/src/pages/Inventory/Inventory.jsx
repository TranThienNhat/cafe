import React, { useState, useEffect } from 'react';
import {
  Table, Card, Button, Tag, Space, Modal, Form, InputNumber,
  Input, Select, Tabs, message, Typography, Row, Col, Alert, Divider
} from 'antd';
import {
  DatabaseOutlined,
  AlertOutlined,
  PlusOutlined,
  ShoppingOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { inventoryService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const Inventory = () => {
  const { activeBranchId } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [poModalVisible, setPoModalVisible] = useState(false);
  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);

  const [poSupplierId, setPoSupplierId] = useState(null);
  const [poItems, setPoItems] = useState([]);

  const [supplierForm] = Form.useForm();
  const [adjustForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, supRes, poRes] = await Promise.all([
        inventoryService.getInventory(activeBranchId),
        inventoryService.getSuppliers(),
        inventoryService.getPurchaseOrders(activeBranchId)
      ]);
      if (invRes.success) setInventory(invRes.inventory);
      if (supRes.success) setSuppliers(supRes.suppliers);
      if (poRes.success) setPurchaseOrders(poRes.purchase_orders);
    } catch {
      // Mock fallback
    } finally {
      setLoading(false);
    }
  };

  const lowStockItems = inventory.filter(i => i.stock_quantity <= i.safety_stock);

  const openAdjustModal = (item) => {
    setSelectedIngredient(item);
    adjustForm.setFieldsValue({
      stock_quantity: item.stock_quantity,
      safety_stock: item.safety_stock
    });
    setAdjustModalVisible(true);
  };

  const handleSaveAdjust = async (values) => {
    try {
      await inventoryService.updateStock({
        branch_id: activeBranchId,
        ingredient_id: selectedIngredient.ingredient_id,
        stock_quantity: values.stock_quantity,
        safety_stock: values.safety_stock
      });
      message.success('Cập nhật tồn kho thành công');
      setAdjustModalVisible(false);
      loadData();
    } catch {
      message.error('Lỗi khi điều chỉnh tồn kho');
    }
  };

  const openPoModal = () => {
    if (suppliers.length > 0) setPoSupplierId(suppliers[0].id);
    if (inventory.length > 0) {
      setPoItems([
        {
          ingredient_id: inventory[0].ingredient_id,
          quantity: 1000,
          unit_price: inventory[0].cost_price || 100
        }
      ]);
    }
    setPoModalVisible(true);
  };

  const addPoItem = () => {
    if (inventory.length === 0) return;
    setPoItems([
      ...poItems,
      {
        ingredient_id: inventory[0].ingredient_id,
        quantity: 500,
        unit_price: inventory[0].cost_price || 100
      }
    ]);
  };

  const updatePoItem = (index, field, value) => {
    const updated = [...poItems];
    updated[index][field] = Number(value) || 0;
    setPoItems(updated);
  };

  const removePoItem = (index) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleCreatePO = async () => {
    if (!poSupplierId || poItems.length === 0) {
      message.warning('Vui lòng chọn NCC và danh sách nguyên liệu');
      return;
    }
    try {
      const res = await inventoryService.createPurchaseOrder({
        branch_id: activeBranchId,
        supplier_id: poSupplierId,
        items: poItems
      });
      if (res.success) {
        message.success(`Tạo phiếu nhập kho thành công và đã cộng dồn tồn kho`);
        setPoModalVisible(false);
        loadData();
      }
    } catch {
      message.error('Lỗi khi tạo phiếu nhập kho');
    }
  };

  const totalPoCost = poItems.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);

  return (
    <div style={{ padding: '24px', background: '#faf8f5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, color: '#2d2420' }}>
            Quản Lý Tồn Kho & Chuỗi Cung Ứng
          </Title>
          <Text style={{ color: '#8d7b72', fontSize: 13 }}>
            Theo dõi lượng tồn kho thời gian thực, cảnh báo an toàn và phiếu nhập hàng
          </Text>
        </div>

        <Space>
          <Button
            type="default"
            icon={<ShopOutlined />}
            onClick={() => setSupplierModalVisible(true)}
            style={{ borderRadius: 8, fontWeight: 500 }}
          >
            + Nhà Cung Cấp
          </Button>
          <Button
            type="primary"
            icon={<ShoppingOutlined />}
            onClick={openPoModal}
            style={{ borderRadius: 8, fontWeight: 500, background: '#4a6b5d', borderColor: '#4a6b5d' }}
          >
            + Tạo Phiếu Nhập Kho
          </Button>
        </Space>
      </div>

      {lowStockItems.length > 0 && (
        <Alert
          message={`Cảnh báo: Có ${lowStockItems.length} nguyên liệu sắp hết hoặc dưới ngưỡng tồn kho an toàn!`}
          description="Vui lòng tạo phiếu nhập hàng để không gián đoạn hoạt động pha chế tại quầy."
          type="error"
          showIcon
          icon={<AlertOutlined />}
          style={{ marginBottom: 16, borderRadius: 8, background: '#fdf2f0', borderColor: '#f9deda', color: '#b85042' }}
        />
      )}

      <Tabs
        defaultActiveKey="stock"
        items={[
          {
            key: 'stock',
            label: (
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                <DatabaseOutlined /> Tồn Kho Hiện Tại ({inventory.length})
              </span>
            ),
            children: (
              <Card style={{ borderRadius: 14, border: '1px solid #eee7e1' }}>
                <Table
                  dataSource={inventory}
                  rowKey="ingredient_id"
                  loading={loading}
                  columns={[
                    {
                      title: 'Nguyên Liệu',
                      dataIndex: 'ingredient_name',
                      key: 'name',
                      render: (text) => <strong>{text}</strong>
                    },
                    {
                      title: 'Đơn Vị',
                      dataIndex: 'unit',
                      key: 'unit',
                      render: (u) => <Tag style={{ background: '#f5efe8', color: '#6f4e37', borderColor: '#ded5cd' }}>{u}</Tag>
                    },
                    {
                      title: 'Tồn Kho Thực Tế',
                      dataIndex: 'stock_quantity',
                      key: 'stock',
                      render: (val, record) => {
                        const isLow = val <= record.safety_stock;
                        return (
                          <strong style={{ color: isLow ? '#b85042' : '#4a6b5d', fontSize: 14 }}>
                            {Number(val).toLocaleString('vi-VN')} {record.unit}
                          </strong>
                        );
                      }
                    },
                    {
                      title: 'Ngưỡng An Toàn',
                      dataIndex: 'safety_stock',
                      key: 'safety',
                      render: (val, record) => `${Number(val).toLocaleString('vi-VN')} ${record.unit}`
                    },
                    {
                      title: 'Trạng Thái',
                      key: 'status',
                      render: (_, record) => {
                        const isLow = record.stock_quantity <= record.safety_stock;
                        return (
                          <Tag style={{
                            background: isLow ? '#fdf2f0' : '#f2f6f4',
                            color: isLow ? '#b85042' : '#4a6b5d',
                            borderColor: isLow ? '#f9deda' : '#d3e0d8',
                            fontWeight: 600
                          }}>
                            {isLow ? 'Thiếu hàng' : 'Đủ hàng'}
                          </Tag>
                        );
                      }
                    },
                    {
                      title: 'Thao Tác',
                      key: 'actions',
                      render: (_, record) => (
                        <Button size="small" onClick={() => openAdjustModal(record)} style={{ borderRadius: 6 }}>
                          Điều chỉnh
                        </Button>
                      )
                    }
                  ]}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            )
          },
          {
            key: 'po',
            label: (
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                <FileTextOutlined /> Lịch Sử Nhập Kho ({purchaseOrders.length})
              </span>
            ),
            children: (
              <Card style={{ borderRadius: 14, border: '1px solid #eee7e1' }}>
                <Table
                  dataSource={purchaseOrders}
                  rowKey="id"
                  columns={[
                    { title: 'Mã Phiếu', dataIndex: 'id', key: 'id', render: (id) => <strong>#{id}</strong> },
                    { title: 'Nhà Cung Cấp', dataIndex: 'supplier_name', key: 'sup' },
                    { title: 'Người Lập Phiếu', dataIndex: 'created_by_name', key: 'user' },
                    {
                      title: 'Tổng Giá Trị',
                      dataIndex: 'total_cost',
                      key: 'cost',
                      render: (c) => <strong style={{ color: '#4a6b5d' }}>{Number(c).toLocaleString('vi-VN')} đ</strong>
                    },
                    { title: 'Trạng Thái', dataIndex: 'status', key: 'status', render: () => <Tag style={{ background: '#f2f6f4', color: '#4a6b5d', borderColor: '#d3e0d8' }}>Đã nhập kho</Tag> },
                    { title: 'Thời Gian', dataIndex: 'created_at', key: 'time' }
                  ]}
                  pagination={{ pageSize: 8 }}
                />
              </Card>
            )
          },
          {
            key: 'suppliers',
            label: (
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                <ShopOutlined /> Nhà Cung Cấp ({suppliers.length})
              </span>
            ),
            children: (
              <Card style={{ borderRadius: 14, border: '1px solid #eee7e1' }}>
                <Table
                  dataSource={suppliers}
                  rowKey="id"
                  columns={[
                    { title: 'Tên Nhà Cung Cấp', dataIndex: 'name', key: 'name', render: (t) => <strong>{t}</strong> },
                    { title: 'Số Điện Thoại', dataIndex: 'phone', key: 'phone' },
                    { title: 'Địa Chỉ', dataIndex: 'address', key: 'address' }
                  ]}
                  pagination={{ pageSize: 8 }}
                />
              </Card>
            )
          }
        ]}
      />

      {/* MODAL ĐIỀU CHỈNH */}
      <Modal
        title={`Điều chỉnh: ${selectedIngredient?.ingredient_name}`}
        open={adjustModalVisible}
        onCancel={() => setAdjustModalVisible(false)}
        footer={null}
        centered
      >
        <Form form={adjustForm} layout="vertical" onFinish={handleSaveAdjust}>
          <Form.Item name="stock_quantity" label="Số lượng tồn thực tế">
            <InputNumber style={{ width: '100%' }} min={0} addonAfter={selectedIngredient?.unit} />
          </Form.Item>
          <Form.Item name="safety_stock" label="Ngưỡng an toàn">
            <InputNumber style={{ width: '100%' }} min={0} addonAfter={selectedIngredient?.unit} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ height: 38, borderRadius: 8 }}>
            Lưu Thay Đổi
          </Button>
        </Form>
      </Modal>

      {/* MODAL NHẬP KHO */}
      <Modal
        title="Tạo Phiếu Nhập Kho"
        open={poModalVisible}
        onCancel={() => setPoModalVisible(false)}
        onOk={handleCreatePO}
        okText="Xác Nhận Nhập Kho"
        width={560}
        centered
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 14 }}>
            <Text strong style={{ fontSize: 13 }}>Nhà Cung Cấp:</Text>
            <Select
              value={poSupplierId}
              onChange={setPoSupplierId}
              style={{ width: '100%', marginTop: 4 }}
              options={suppliers.map(s => ({ value: s.id, label: `${s.name} (${s.phone || ''})` }))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 13 }}>Danh sách nguyên liệu:</Text>
            <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addPoItem}>
              Thêm dòng
            </Button>
          </div>

          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            {poItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Select
                  value={item.ingredient_id}
                  onChange={(val) => updatePoItem(idx, 'ingredient_id', val)}
                  style={{ flex: 2 }}
                  options={inventory.map(i => ({ value: i.ingredient_id, label: `${i.ingredient_name} (${i.unit})` }))}
                />
                <InputNumber
                  placeholder="SL"
                  min={1}
                  value={item.quantity}
                  onChange={(val) => updatePoItem(idx, 'quantity', val)}
                  style={{ flex: 1 }}
                />
                <InputNumber
                  placeholder="Đơn giá"
                  min={0}
                  value={item.unit_price}
                  onChange={(val) => updatePoItem(idx, 'unit_price', val)}
                  style={{ flex: 1.5 }}
                />
                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removePoItem(idx)} />
              </div>
            ))}
          </Space>

          <Divider style={{ margin: '14px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>Tổng tiền nhập hàng:</Text>
            <strong style={{ fontSize: 16, color: '#4a6b5d' }}>{totalPoCost.toLocaleString('vi-VN')} đ</strong>
          </div>
        </div>
      </Modal>

      {/* MODAL THÊM NCC */}
      <Modal
        title="Thêm Nhà Cung Cấp"
        open={supplierModalVisible}
        onCancel={() => setSupplierModalVisible(false)}
        footer={null}
        centered
      >
        <Form form={supplierForm} layout="vertical" onFinish={async (vals) => {
          await inventoryService.createSupplier(vals);
          setSupplierModalVisible(false);
          supplierForm.resetFields();
          loadData();
        }}>
          <Form.Item name="name" label="Tên nhà cung cấp" rules={[{ required: true }]}>
            <Input placeholder="VD: Công ty TNHH Dalat Milk" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="090..." />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input placeholder="Lâm Đồng..." />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ height: 38, borderRadius: 8 }}>
            Thêm Nhà Cung Cấp
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default Inventory;

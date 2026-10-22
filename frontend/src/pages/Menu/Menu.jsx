import React, { useState, useEffect } from 'react';
import {
  Table, Card, Button, Input, Select, Tag, Space, Modal, Form,
  InputNumber, Tabs, message, Typography, Popconfirm, Drawer, Row, Col
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  AppstoreOutlined,
  CoffeeOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { menuService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const Menu = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals & Drawers
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm] = Form.useForm();

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoryForm] = Form.useForm();

  const [ingredientModalVisible, setIngredientModalVisible] = useState(false);
  const [ingredientForm] = Form.useForm();

  const [bomDrawerVisible, setBomDrawerVisible] = useState(false);
  const [selectedProductForBom, setSelectedProductForBom] = useState(null);
  const [bomList, setBomList] = useState([]);

  const { isBranchManager } = useAuth();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, iRes] = await Promise.all([
        menuService.getProducts(),
        menuService.getCategories(),
        menuService.getIngredients()
      ]);
      if (pRes.success) setProducts(pRes.products);
      if (cRes.success) setCategories(cRes.categories);
      if (iRes.success) setIngredients(iRes.ingredients);
    } catch {
      // Mockup fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (values) => {
    try {
      if (editingProduct) {
        await menuService.updateProduct(editingProduct.id, values);
        message.success('Cập nhật món thành công');
      } else {
        await menuService.createProduct(values);
        message.success('Thêm món mới thành công');
      }
      setProductModalVisible(false);
      productForm.resetFields();
      loadAllData();
    } catch {
      message.error('Lỗi khi lưu thông tin món');
    }
  };

  const openBomDrawer = (product) => {
    setSelectedProductForBom(product);
    setBomList(product.recipes || []);
    setBomDrawerVisible(true);
  };

  const addBomRow = () => {
    if (ingredients.length === 0) return;
    const defaultIng = ingredients[0];
    setBomList([
      ...bomList,
      {
        ingredient_id: defaultIng.id,
        ingredient_name: defaultIng.name,
        unit: defaultIng.unit,
        cost_price: defaultIng.cost_price,
        amount_needed: 10
      }
    ]);
  };

  const updateBomRow = (index, field, value) => {
    const updated = [...bomList];
    if (field === 'ingredient_id') {
      const ing = ingredients.find(i => i.id === value);
      if (ing) {
        updated[index].ingredient_id = ing.id;
        updated[index].ingredient_name = ing.name;
        updated[index].unit = ing.unit;
        updated[index].cost_price = ing.cost_price;
      }
    } else if (field === 'amount_needed') {
      updated[index].amount_needed = Number(value) || 0;
    }
    setBomList(updated);
  };

  const removeBomRow = (index) => {
    setBomList(bomList.filter((_, idx) => idx !== index));
  };

  const saveBomConfiguration = async () => {
    if (!selectedProductForBom) return;
    try {
      await menuService.updateProduct(selectedProductForBom.id, {
        category_id: selectedProductForBom.category_id,
        name: selectedProductForBom.name,
        base_price: selectedProductForBom.base_price,
        status: selectedProductForBom.status,
        recipes: bomList.map(b => ({
          ingredient_id: b.ingredient_id,
          amount_needed: b.amount_needed
        }))
      });
      message.success('Lưu cấu hình định lượng BOM thành công');
      setBomDrawerVisible(false);
      loadAllData();
    } catch {
      message.error('Lỗi khi lưu định lượng BOM');
    }
  };

  const totalCogs = bomList.reduce((sum, item) => sum + (item.cost_price || 0) * (item.amount_needed || 0), 0);
  const profitMargin = selectedProductForBom?.base_price > 0
    ? Math.round(((selectedProductForBom.base_price - totalCogs) / selectedProductForBom.base_price) * 100)
    : 0;

  const productColumns = [
    {
      title: 'Tên Món',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#2d2420' }}>{text}</div>
          <div style={{ fontSize: 11, color: '#8d7b72' }}>{record.category_name}</div>
        </div>
      )
    },
    {
      title: 'Đơn Giá Bán',
      dataIndex: 'base_price',
      key: 'base_price',
      render: (val) => <strong style={{ color: '#6f4e37' }}>{Number(val).toLocaleString('vi-VN')} đ</strong>
    },
    {
      title: 'Định Lượng (BOM)',
      key: 'bom',
      render: (_, record) => {
        const count = record.recipes?.length || 0;
        return (
          <Button
            size="small"
            icon={<ExperimentOutlined />}
            onClick={() => openBomDrawer(record)}
            style={{ borderRadius: 6, fontSize: 11, borderColor: count > 0 ? '#4a6b5d' : '#eee7e1', color: count > 0 ? '#4a6b5d' : '#8d7b72' }}
          >
            {count > 0 ? `${count} nguyên liệu` : 'Xem định lượng'}
          </Button>
        );
      }
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag style={{
          background: status === 'AVAILABLE' ? '#f2f6f4' : status === 'OUT_OF_STOCK' ? '#faf5f0' : '#f8f8f8',
          color: status === 'AVAILABLE' ? '#4a6b5d' : status === 'OUT_OF_STOCK' ? '#9c6644' : '#8d7b72',
          borderColor: status === 'AVAILABLE' ? '#d3e0d8' : status === 'OUT_OF_STOCK' ? '#e8ded4' : '#eee7e1',
          fontWeight: 600
        }}>
          {status === 'AVAILABLE' ? 'Đang bán' : status === 'OUT_OF_STOCK' ? 'Tạm hết' : 'Ngưng bán'}
        </Tag>
      )
    },
    ...(isBranchManager ? [
      {
        title: 'Thao Tác',
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingProduct(record);
                productForm.setFieldsValue(record);
                setProductModalVisible(true);
              }}
            />
            <Popconfirm
              title="Xóa món này?"
              onConfirm={async () => {
                await menuService.deleteProduct(record.id);
                loadAllData();
              }}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        )
      }
    ] : [])
  ];

  return (
    <div style={{ padding: '24px', background: '#faf8f5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, color: '#2d2420' }}>
            {isBranchManager ? 'Quản Lý Thực Đơn & Công Thức Định Lượng (BOM)' : 'Danh Mục Thực Đơn Món'}
          </Title>
          <Text style={{ color: '#8d7b72', fontSize: 13 }}>
            {isBranchManager ? 'Thiết lập danh mục, giá bán và cấu hình định lượng tự động trừ kho' : 'Xem thông tin danh mục và đơn giá bán'}
          </Text>
        </div>

        {isBranchManager && (
          <Space>
            <Button
              type="default"
              icon={<FolderOpenOutlined />}
              onClick={() => setCategoryModalVisible(true)}
              style={{ borderRadius: 8, fontWeight: 500 }}
            >
              + Danh Mục
            </Button>
            <Button
              type="default"
              icon={<ExperimentOutlined />}
              onClick={() => setIngredientModalVisible(true)}
              style={{ borderRadius: 8, fontWeight: 500 }}
            >
              + Nguyên Liệu Thô
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingProduct(null);
                productForm.resetFields();
                setProductModalVisible(true);
              }}
              style={{ borderRadius: 8, fontWeight: 500 }}
            >
              + Thêm Món
            </Button>
          </Space>
        )}
      </div>

      <Tabs
        defaultActiveKey="products"
        items={[
          {
            key: 'products',
            label: (
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                <CoffeeOutlined /> Danh Sách Món ({products.length})
              </span>
            ),
            children: (
              <Card style={{ borderRadius: 14, border: '1px solid #eee7e1' }}>
                <Table
                  dataSource={products}
                  columns={productColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 8 }}
                />
              </Card>
            )
          },
          ...(isBranchManager ? [
            {
              key: 'ingredients',
              label: (
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  <ExperimentOutlined /> Nguyên Liệu Thô ({ingredients.length})
                </span>
              ),
              children: (
                <Card style={{ borderRadius: 14, border: '1px solid #eee7e1' }}>
                  <Table
                    dataSource={ingredients}
                    rowKey="id"
                    columns={[
                      { title: 'Tên Nguyên Liệu', dataIndex: 'name', key: 'name', render: (t) => <strong>{t}</strong> },
                      { title: 'Đơn Vị', dataIndex: 'unit', key: 'unit', render: (u) => <Tag style={{ background: '#f5efe8', color: '#6f4e37', borderColor: '#ded5cd' }}>{u}</Tag> },
                      {
                        title: 'Giá Vốn Ước Tính',
                        dataIndex: 'cost_price',
                        key: 'cost_price',
                        render: (c, r) => `${Number(c).toLocaleString('vi-VN')} đ / ${r.unit}`
                      }
                    ]}
                    pagination={{ pageSize: 8 }}
                  />
                </Card>
              )
            },
            {
              key: 'categories',
              label: (
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  <FolderOpenOutlined /> Danh Mục Món ({categories.length})
                </span>
              ),
              children: (
                <Card style={{ borderRadius: 14, border: '1px solid #eee7e1' }}>
                  <Table
                    dataSource={categories}
                    rowKey="id"
                    columns={[
                      { title: 'Tên Danh Mục', dataIndex: 'name', key: 'name', render: (t) => <strong>{t}</strong> },
                      { title: 'Mô Tả', dataIndex: 'description', key: 'description' }
                    ]}
                    pagination={{ pageSize: 8 }}
                  />
                </Card>
              )
            }
          ] : [])
        ]}
      />

      {/* DRAWER CẤU HÌNH ĐỊNH LƯỢNG BOM */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExperimentOutlined style={{ color: '#6f4e37', fontSize: 18 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#2d2420' }}>Định Lượng BOM: {selectedProductForBom?.name}</div>
              <div style={{ fontSize: 11, color: '#8d7b72' }}>
                Giá bán: {Number(selectedProductForBom?.base_price).toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>
        }
        placement="right"
        width={500}
        open={bomDrawerVisible}
        onClose={() => setBomDrawerVisible(false)}
        footer={
          isBranchManager ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button onClick={() => setBomDrawerVisible(false)}>Đóng</Button>
              <Button type="primary" onClick={saveBomConfiguration} style={{ fontWeight: 500 }}>
                Lưu Định Lượng BOM
              </Button>
            </div>
          ) : null
        }
      >
        <div style={{ background: '#faf8f5', padding: 12, borderRadius: 10, marginBottom: 16, border: '1px solid #eee7e1' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Text style={{ color: '#8d7b72', fontSize: 11 }}>Giá vốn nguyên liệu (COGS):</Text>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#2d2420' }}>
                {Math.round(totalCogs).toLocaleString('vi-VN')} đ
              </div>
            </Col>
            <Col span={12}>
              <Text style={{ color: '#8d7b72', fontSize: 11 }}>Biên lợi nhuận gộp:</Text>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#4a6b5d' }}>
                {profitMargin}%
              </div>
            </Col>
          </Row>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text strong style={{ fontSize: 13 }}>Thành phần nguyên liệu:</Text>
          {isBranchManager && (
            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addBomRow}>
              Thêm nguyên liệu
            </Button>
          )}
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {bomList.map((item, idx) => (
            <Card key={idx} size="small" style={{ borderRadius: 8, border: '1px solid #eee7e1' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Select
                  value={item.ingredient_id}
                  onChange={(val) => updateBomRow(idx, 'ingredient_id', val)}
                  style={{ flex: 1 }}
                  disabled={!isBranchManager}
                  options={ingredients.map(i => ({
                    value: i.id,
                    label: `${i.name} (${i.unit})`
                  }))}
                />
                <InputNumber
                  min={0.1}
                  value={item.amount_needed}
                  onChange={(val) => updateBomRow(idx, 'amount_needed', val)}
                  style={{ width: 90 }}
                  disabled={!isBranchManager}
                  addonAfter={item.unit}
                />
                {isBranchManager && (
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => removeBomRow(idx)}
                  />
                )}
              </div>
            </Card>
          ))}
        </Space>
      </Drawer>

      {/* MODAL THÊM MÓN */}
      <Modal
        title={editingProduct ? 'Cập Nhật Món' : 'Thêm Món Mới'}
        open={productModalVisible}
        onCancel={() => setProductModalVisible(false)}
        footer={null}
        centered
      >
        <Form form={productForm} layout="vertical" onFinish={handleSaveProduct}>
          <Form.Item name="name" label="Tên món" rules={[{ required: true }]}>
            <Input placeholder="VD: Cà Phê Muối" />
          </Form.Item>
          <Form.Item name="category_id" label="Danh mục" rules={[{ required: true }]}>
            <Select options={categories.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="base_price" label="Giá bán (VNĐ)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={1000} />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" initialValue="AVAILABLE">
            <Select
              options={[
                { value: 'AVAILABLE', label: 'Đang bán' },
                { value: 'OUT_OF_STOCK', label: 'Tạm hết hàng' },
                { value: 'DISCONTINUED', label: 'Ngưng kinh doanh' }
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ height: 40, borderRadius: 8 }}>
            Lưu Sản Phẩm
          </Button>
        </Form>
      </Modal>

      {/* MODAL THÊM DANH MỤC */}
      <Modal
        title="Thêm Danh Mục"
        open={categoryModalVisible}
        onCancel={() => setCategoryModalVisible(false)}
        footer={null}
        centered
      >
        <Form form={categoryForm} layout="vertical" onFinish={async (vals) => {
          await menuService.createCategory(vals);
          setCategoryModalVisible(false);
          categoryForm.resetFields();
          loadAllData();
        }}>
          <Form.Item name="name" label="Tên danh mục" rules={[{ required: true }]}>
            <Input placeholder="VD: Trà Trái Cây" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ height: 38, borderRadius: 8 }}>
            Thêm Danh Mục
          </Button>
        </Form>
      </Modal>

      {/* MODAL THÊM NGUYÊN LIỆU */}
      <Modal
        title="Thêm Nguyên Liệu Thô"
        open={ingredientModalVisible}
        onCancel={() => setIngredientModalVisible(false)}
        footer={null}
        centered
      >
        <Form form={ingredientForm} layout="vertical" onFinish={async (vals) => {
          await menuService.createIngredient(vals);
          setIngredientModalVisible(false);
          ingredientForm.resetFields();
          loadAllData();
        }}>
          <Form.Item name="name" label="Tên nguyên liệu" rules={[{ required: true }]}>
            <Input placeholder="VD: Hạt Sen Tươi" />
          </Form.Item>
          <Form.Item name="unit" label="Đơn vị" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'gram', label: 'Gram (g)' },
                { value: 'ml', label: 'Mililit (ml)' },
                { value: 'kg', label: 'Kilogram (kg)' },
                { value: 'cái', label: 'Cái / Miếng' }
              ]}
            />
          </Form.Item>
          <Form.Item name="cost_price" label="Giá vốn (VNĐ/đơn vị)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ height: 38, borderRadius: 8 }}>
            Thêm Nguyên Liệu
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default Menu;

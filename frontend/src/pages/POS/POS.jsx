import React, { useState, useEffect } from 'react';
import {
  Row, Col, Card, Input, Button, Tag, Badge, Tabs, Modal, Radio,
  Divider, message, Spin, Typography, Space, Tooltip, Avatar
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  QrcodeOutlined,
  DollarOutlined,
  CreditCardOutlined,
  ThunderboltOutlined,
  CoffeeOutlined,
  UserOutlined,
  ShopOutlined,
  ShoppingOutlined,
  PrinterOutlined,
  StarFilled,
  EditOutlined,
  FireOutlined
} from '@ant-design/icons';
import confetti from 'canvas-confetti';
import { menuService, tableService, orderService, aiService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const POS = () => {
  const { activeBranchId } = useAuth();
  
  // Data states
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Order & Cart states
  const [orderType, setOrderType] = useState('DINE_IN');
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Customer loyalty state
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerInfo, setCustomerInfo] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);

  // AI Cross-Sell Suggestions
  const [aiSuggestions, setAiSuggestions] = useState([]);

  // Modals
  const [modifierModalVisible, setModifierModalVisible] = useState(false);
  const [selectedProductForMod, setSelectedProductForMod] = useState(null);
  const [modSugar, setModSugar] = useState('100%');
  const [modIce, setModIce] = useState('100%');
  const [modNote, setModNote] = useState('');

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerCashGiven, setCustomerCashGiven] = useState(0);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Fetch initial data
  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  // Update AI cross sell when cart changes
  useEffect(() => {
    if (cart.length > 0) {
      const itemNames = cart.map(item => item.product_name);
      aiService.getPosCrossSell(itemNames)
        .then((res) => {
          if (res.success && res.recommendations) {
            setAiSuggestions(res.recommendations);
          }
        })
        .catch(() => {});
    } else {
      setAiSuggestions([]);
    }
  }, [cart]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, prodRes, tableRes] = await Promise.all([
        menuService.getCategories(),
        menuService.getProducts(),
        tableService.getAll({ branch_id: activeBranchId })
      ]);

      if (catRes.success) setCategories(catRes.categories);
      if (prodRes.success) setProducts(prodRes.products);
      if (tableRes.success) {
        setTables(tableRes.tables);
        if (tableRes.tables.length > 0 && !selectedTableId) {
          setSelectedTableId(tableRes.tables[0].id);
        }
      }
    } catch {
      // Fallback mockup
    } finally {
      setLoading(false);
    }
  };

  const openModifierModal = (product) => {
    setSelectedProductForMod(product);
    setModSugar('100%');
    setModIce('100%');
    setModNote('');
    setModifierModalVisible(true);
  };

  const confirmAddToCart = () => {
    if (!selectedProductForMod) return;
    const noteParts = [];
    if (modSugar !== '100%') noteParts.push(`${modSugar} đường`);
    if (modIce !== '100%') noteParts.push(`${modIce} đá`);
    if (modNote.trim()) noteParts.push(modNote.trim());
    const finalNote = noteParts.join(', ');

    addToCart(selectedProductForMod, finalNote);
    setModifierModalVisible(false);
  };

  const addToCart = (product, note = '') => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product_id === product.id && item.item_notes === note
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          unit_price: product.base_price,
          quantity: 1,
          item_notes: note
        }
      ];
    });
  };

  const updateQuantity = (index, delta) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, idx) => idx !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Tra cứu thành viên
  const handleLookupCustomer = async () => {
    if (!customerPhone.trim()) return;
    setCustomerLoading(true);
    try {
      const res = await orderService.searchCustomers(customerPhone);
      if (res.success && res.customers.length > 0) {
        const found = res.customers.find(c => c.phone === customerPhone) || res.customers[0];
        setCustomerInfo(found);
        message.success(`Tìm thấy khách hàng: ${found.full_name} (${found.loyalty_points} điểm)`);
      } else {
        const createRes = await orderService.createCustomer({
          full_name: `Khách hàng ${customerPhone.slice(-4)}`,
          phone: customerPhone
        });
        if (createRes.success) {
          setCustomerInfo(createRes.customer);
          message.info('Đã đăng ký thành viên mới tự động');
        }
      }
    } catch {
      message.error('Lỗi khi tra cứu khách hàng');
    } finally {
      setCustomerLoading(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Mở modal thanh toán
  const openPaymentModal = () => {
    if (cart.length === 0) {
      message.warning('Vui lòng chọn món vào giỏ hàng trước khi thanh toán');
      return;
    }
    setCustomerCashGiven(finalTotal);
    setPaymentModalVisible(true);
  };

  // Xử lý tạo đơn hàng POS
  const handleCompleteOrder = async () => {
    setSubmittingOrder(true);
    try {
      const orderPayload = {
        branch_id: activeBranchId,
        table_id: orderType === 'DINE_IN' ? selectedTableId : null,
        customer_id: customerInfo?.id || null,
        order_type: orderType,
        items: cart,
        discount_amount: discountAmount,
        payment_method: paymentMethod
      };

      const res = await orderService.createOrder(orderPayload);
      if (res.success) {
        setPaymentModalVisible(false);
        setCompletedOrder({
          ...orderPayload,
          id: res.order_id,
          final_amount: res.final_amount,
          created_at: new Date().toISOString(),
          table_name: tables.find(t => t.id === selectedTableId)?.table_name || 'Mang đi',
          customer_name: customerInfo?.full_name || 'Khách vãng lai'
        });
        setReceiptModalVisible(true);
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
        setCart([]);
        setDiscountAmount(0);
        setCustomerInfo(null);
        setCustomerPhone('');
        loadData();
      }
    } catch (err) {
      message.error(err.message || 'Lỗi khi tạo đơn hàng');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchCat = activeCategory === 'ALL' || p.category_id.toString() === activeCategory.toString();
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ padding: '16px 20px', background: '#faf8f5' }}>
      <Row gutter={[16, 16]}>
        {/* CỘT TRÁI: THỰC ĐƠN & DANH MỤC */}
        <Col xs={24} lg={15} xl={16}>
          {/* Thanh lọc & Bàn */}
          <Card
            style={{
              marginBottom: 16,
              borderRadius: 14,
              border: '1px solid #eee7e1',
              background: '#ffffff',
              boxShadow: '0 1px 4px rgba(111, 78, 55, 0.03)'
            }}
            bodyStyle={{ padding: '14px 18px' }}
          >
            <Row gutter={[16, 12]} align="middle" justify="space-between">
              <Col xs={24} md={12}>
                <Space wrap size={[8, 8]}>
                  <Radio.Group
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                    buttonStyle="solid"
                    size="middle"
                  >
                    <Radio.Button value="DINE_IN" style={{ fontWeight: 500 }}>
                      <ShopOutlined style={{ marginRight: 4 }} /> Tại bàn
                    </Radio.Button>
                    <Radio.Button value="TAKE_AWAY" style={{ fontWeight: 500 }}>
                      <ShoppingOutlined style={{ marginRight: 4 }} /> Mang đi
                    </Radio.Button>
                  </Radio.Group>

                  {orderType === 'DINE_IN' && (
                    <Radio.Group
                      value={selectedTableId}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      size="middle"
                    >
                      {tables.map((t) => (
                        <Radio.Button
                          key={t.id}
                          value={t.id}
                          style={{
                            borderRadius: 6,
                            marginRight: 4,
                            borderColor: t.status === 'OCCUPIED' ? '#f4eee9' : '#eee7e1'
                          }}
                        >
                          <Badge status={t.status === 'AVAILABLE' ? 'success' : 'error'} />
                          {t.table_name}
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  )}
                </Space>
              </Col>

              <Col xs={24} md={12}>
                <Input
                  prefix={<SearchOutlined style={{ color: '#bdae9f' }} />}
                  placeholder="Tìm món (Bạc xỉu, Espresso, Croissant...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                  style={{ borderRadius: 8, height: 38 }}
                />
              </Col>
            </Row>

            {/* Danh mục Tabs */}
            <div style={{ marginTop: 12, display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              <Button
                type={activeCategory === 'ALL' ? 'primary' : 'default'}
                shape="round"
                size="small"
                onClick={() => setActiveCategory('ALL')}
                style={{
                  fontWeight: 600,
                  fontSize: 12,
                  background: activeCategory === 'ALL' ? '#6f4e37' : '#ffffff',
                  borderColor: activeCategory === 'ALL' ? '#6f4e37' : '#eee7e1',
                  color: activeCategory === 'ALL' ? '#ffffff' : '#5c4d44'
                }}
              >
                Tất cả ({products.length})
              </Button>
              {categories.map((c) => (
                <Button
                  key={c.id}
                  type={activeCategory === c.id.toString() ? 'primary' : 'default'}
                  shape="round"
                  size="small"
                  onClick={() => setActiveCategory(c.id.toString())}
                  style={{
                    fontWeight: 600,
                    fontSize: 12,
                    background: activeCategory === c.id.toString() ? '#6f4e37' : '#ffffff',
                    borderColor: activeCategory === c.id.toString() ? '#6f4e37' : '#eee7e1',
                    color: activeCategory === c.id.toString() ? '#ffffff' : '#5c4d44'
                  }}
                >
                  {c.name}
                </Button>
              ))}
            </div>
          </Card>

          {/* Lưới sản phẩm */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin /></div>
          ) : (
            <Row gutter={[12, 12]}>
              {filteredProducts.map((p) => (
                <Col xs={12} sm={8} md={8} xl={6} key={p.id}>
                  <div
                    className="product-card"
                    style={{ minHeight: 140 }}
                    onClick={() => openModifierModal(p)}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: '#f5efe8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6f4e37',
                            fontSize: 16
                          }}
                        >
                          <CoffeeOutlined />
                        </div>
                        {p.recipes && p.recipes.length > 0 && (
                          <Tag style={{ fontSize: 10, margin: 0, background: '#f2f6f4', color: '#4a6b5d', borderColor: '#d3e0d8' }}>
                            BOM
                          </Tag>
                        )}
                      </div>

                      <div style={{ fontWeight: 600, fontSize: 13, color: '#2d2420', marginTop: 10, minHeight: 36, lineHeight: 1.3 }}>
                        {p.name}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                      <span style={{ color: '#6f4e37', fontWeight: 700, fontSize: 14 }}>
                        {Number(p.base_price).toLocaleString('vi-VN')} đ
                      </span>
                      <Button
                        type="primary"
                        shape="circle"
                        size="small"
                        icon={<PlusOutlined style={{ fontSize: 11 }} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(p);
                        }}
                      />
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </Col>

        {/* CỘT PHẢI: GIỎ HÀNG & AI COMBO */}
        <Col xs={24} lg={9} xl={8}>
          <Card
            style={{
              borderRadius: 16,
              border: '1px solid #eee7e1',
              background: '#ffffff',
              boxShadow: '0 2px 8px rgba(111, 78, 55, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 'calc(100vh - 120px)'
            }}
            bodyStyle={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Title level={5} style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, color: '#2d2420' }}>
                Đơn Hàng ({cart.reduce((sum, i) => sum + i.quantity, 0)} món)
              </Title>
              {cart.length > 0 && (
                <Button type="text" size="small" style={{ color: '#8d7b72' }} onClick={() => setCart([])}>
                  Xóa tất cả
                </Button>
              )}
            </div>

            {/* Tra cứu khách hàng */}
            <div style={{ background: '#faf8f5', padding: 8, borderRadius: 8, marginBottom: 10, border: '1px solid #eee7e1' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <Input
                  prefix={<UserOutlined style={{ color: '#bdae9f' }} />}
                  placeholder="SĐT tích điểm..."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  size="small"
                  style={{ borderRadius: 6 }}
                />
                <Button size="small" type="primary" onClick={handleLookupCustomer} loading={customerLoading}>
                  Tra cứu
                </Button>
              </div>
              {customerInfo && (
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: 600, color: '#2d2420' }}>{customerInfo.full_name}</Text>
                  <Tag icon={<StarFilled style={{ color: '#d97706' }} />} style={{ fontSize: 10, background: '#f5efe8', color: '#6f4e37', borderColor: '#ded5cd' }}>
                    {customerInfo.loyalty_points} điểm
                  </Tag>
                </div>
              )}
            </div>

            {/* Danh sách giỏ hàng */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 270, paddingRight: 2 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: '#8d7b72' }}>
                  <CoffeeOutlined style={{ fontSize: 32, marginBottom: 6, color: '#ded5cd' }} />
                  <div style={{ fontSize: 13 }}>Chưa có món nào</div>
                  <div style={{ fontSize: 11, color: '#bdae9f' }}>Chọn món từ thực đơn để bán</div>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: '1px solid #f4eee9'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#2d2420' }}>{item.product_name}</div>
                      {item.item_notes && (
                        <div style={{ fontSize: 11, color: '#9c6644' }}>
                          <EditOutlined style={{ marginRight: 2 }} /> {item.item_notes}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: '#8d7b72' }}>
                        {Number(item.unit_price).toLocaleString('vi-VN')} đ
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Button
                        size="small"
                        shape="circle"
                        icon={<MinusOutlined style={{ fontSize: 9 }} />}
                        onClick={() => updateQuantity(idx, -1)}
                      />
                      <span style={{ fontWeight: 600, minWidth: 18, textAlign: 'center', fontSize: 13 }}>{item.quantity}</span>
                      <Button
                        size="small"
                        shape="circle"
                        icon={<PlusOutlined style={{ fontSize: 9 }} />}
                        onClick={() => updateQuantity(idx, 1)}
                      />
                      <Button
                        size="small"
                        type="text"
                        icon={<DeleteOutlined style={{ fontSize: 12, color: '#b85042' }} />}
                        onClick={() => removeFromCart(idx)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* AI GỢI Ý MÓN BÁN KÈM (MINIMALIST) */}
            {aiSuggestions.length > 0 && (
              <div className="ai-recommend-card" style={{ marginTop: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <ThunderboltOutlined style={{ color: '#6f4e37', fontSize: 13 }} />
                  <span style={{ fontWeight: 600, fontSize: 11, color: '#5c4d44' }}>
                    AI Gợi Ý Bán Chéo (Apriori)
                  </span>
                </div>
                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                  {aiSuggestions.slice(0, 2).map((sug, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#ffffff',
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid #eee7e1'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#2d2420' }}>{sug.product_name}</div>
                        <div style={{ fontSize: 10, color: '#8d7b72' }}>{sug.reason} ({sug.confidence})</div>
                      </div>
                      <Button
                        size="small"
                        type="primary"
                        style={{ fontSize: 10, height: 22, padding: '0 6px' }}
                        onClick={() => {
                          const p = products.find(prod => prod.name === sug.product_name);
                          if (p) addToCart(p);
                        }}
                      >
                        + Thêm
                      </Button>
                    </div>
                  ))}
                </Space>
              </div>
            )}

            {/* TỔNG TIỀN & THANH TOÁN */}
            <div style={{ borderTop: '1px solid #eee7e1', paddingTop: 10, marginTop: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 13 }}>
                <Text style={{ color: '#8d7b72' }}>Tiền hàng:</Text>
                <Text style={{ fontWeight: 500 }}>{subtotal.toLocaleString('vi-VN')} đ</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <Text style={{ color: '#8d7b72' }}>Chiết khấu:</Text>
                <Input
                  size="small"
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  style={{ width: 90, textAlign: 'right', borderRadius: 6 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#2d2420' }}>Tổng thu:</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: '#6f4e37' }}>
                  {finalTotal.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <Button
                type="primary"
                size="large"
                block
                disabled={cart.length === 0}
                onClick={openPaymentModal}
                style={{
                  height: 44,
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 15,
                  background: '#6f4e37',
                  borderColor: '#6f4e37'
                }}
              >
                Thanh Toán
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* MODAL PHA CHẾ */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CoffeeOutlined style={{ color: '#6f4e37' }} />
            <span>Tùy chỉnh: {selectedProductForMod?.name}</span>
          </div>
        }
        open={modifierModalVisible}
        onCancel={() => setModifierModalVisible(false)}
        onOk={confirmAddToCart}
        okText="Thêm vào giỏ"
        cancelText="Hủy"
        centered
      >
        <div style={{ padding: '10px 0' }}>
          <div style={{ marginBottom: 14 }}>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#5c4d44' }}>Độ ngọt (Đường):</Text>
            <Radio.Group value={modSugar} onChange={(e) => setModSugar(e.target.value)} size="small">
              <Radio.Button value="100%">100% Chuẩn</Radio.Button>
              <Radio.Button value="70%">70%</Radio.Button>
              <Radio.Button value="50%">50%</Radio.Button>
              <Radio.Button value="30%">30%</Radio.Button>
              <Radio.Button value="0%">0%</Radio.Button>
            </Radio.Group>
          </div>

          <div style={{ marginBottom: 14 }}>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#5c4d44' }}>Lượng đá:</Text>
            <Radio.Group value={modIce} onChange={(e) => setModIce(e.target.value)} size="small">
              <Radio.Button value="100%">100% Đầy đá</Radio.Button>
              <Radio.Button value="70%">70%</Radio.Button>
              <Radio.Button value="50%">50%</Radio.Button>
              <Radio.Button value="0%">Không đá</Radio.Button>
              <Radio.Button value="NÓNG">
                <CoffeeOutlined style={{ marginRight: 2 }} /> Nóng
              </Radio.Button>
            </Radio.Group>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#5c4d44' }}>Ghi chú:</Text>
            <Input
              placeholder="VD: Nhiều sữa đặc..."
              value={modNote}
              onChange={(e) => setModNote(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* MODAL THANH TOÁN */}
      <Modal
        title={<Title level={4} style={{ margin: 0, color: '#2d2420' }}>Thanh Toán</Title>}
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        width={460}
        centered
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ textAlign: 'center', background: '#f5efe8', padding: '12px', borderRadius: 10, marginBottom: 16 }}>
            <div style={{ color: '#8d7b72', fontSize: 12 }}>Số tiền cần thanh toán</div>
            <div style={{ color: '#6f4e37', fontSize: 24, fontWeight: 800 }}>
              {finalTotal.toLocaleString('vi-VN')} đ
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 6, color: '#5c4d44' }}>Phương thức thanh toán:</Text>
            <Radio.Group
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              buttonStyle="solid"
              style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}
            >
              <Radio.Button value="CASH" style={{ textAlign: 'center', height: 40, lineHeight: '38px', borderRadius: 6 }}>
                <DollarOutlined /> Tiền mặt
              </Radio.Button>
              <Radio.Button value="TRANSFER_QR" style={{ textAlign: 'center', height: 40, lineHeight: '38px', borderRadius: 6 }}>
                <QrcodeOutlined /> Chuyển QR
              </Radio.Button>
              <Radio.Button value="CARD" style={{ textAlign: 'center', height: 40, lineHeight: '38px', borderRadius: 6 }}>
                <CreditCardOutlined /> Thẻ
              </Radio.Button>
            </Radio.Group>
          </div>

          {paymentMethod === 'CASH' && (
            <div style={{ background: '#faf8f5', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid #eee7e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text>Tiền khách đưa:</Text>
                <Input
                  type="number"
                  value={customerCashGiven}
                  onChange={(e) => setCustomerCashGiven(Number(e.target.value) || 0)}
                  style={{ width: 130, textAlign: 'right', fontWeight: 600 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>Tiền thừa trả khách:</Text>
                <Text strong style={{ color: '#4a6b5d', fontSize: 15 }}>
                  {Math.max(0, customerCashGiven - finalTotal).toLocaleString('vi-VN')} đ
                </Text>
              </div>
            </div>
          )}

          {paymentMethod === 'TRANSFER_QR' && (
            <div style={{ textAlign: 'center', padding: '12px 0', background: '#faf8f5', borderRadius: 8, marginBottom: 16, border: '1px solid #eee7e1' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=SMART_COFFEE_${finalTotal}`}
                alt="VietQR Demo"
                style={{ width: 140, height: 140, borderRadius: 6 }}
              />
              <div style={{ marginTop: 6, fontSize: 11, color: '#8d7b72' }}>
                Quét mã VietQR để thanh toán
              </div>
            </div>
          )}

          <Button
            type="primary"
            size="large"
            block
            loading={submittingOrder}
            onClick={handleCompleteOrder}
            style={{
              height: 44,
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              background: '#4a6b5d',
              borderColor: '#4a6b5d'
            }}
          >
            Hoàn Tất Đơn Hàng
          </Button>
        </div>
      </Modal>

      {/* MODAL HÓA ĐƠN */}
      <Modal
        open={receiptModalVisible}
        onCancel={() => setReceiptModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setReceiptModalVisible(false)}>
            Đóng
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            In Hóa Đơn
          </Button>
        ]}
        width={380}
        centered
      >
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 40, color: '#4a6b5d', marginBottom: 6 }} />
          <Title level={4} style={{ margin: 0, color: '#2d2420' }}>ĐÃ THANH TOÁN</Title>
          <Text style={{ color: '#8d7b72', fontSize: 12 }}>Tự động trừ kho nguyên liệu theo BOM</Text>
          
          <Divider style={{ margin: '12px 0' }} />
          
          <div style={{ textAlign: 'left', fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Mã đơn:</span>
              <strong>#{completedOrder?.id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Vị trí:</span>
              <strong>{completedOrder?.table_name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Khách hàng:</span>
              <strong>{completedOrder?.customer_name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Tổng thu:</span>
              <strong style={{ color: '#6f4e37', fontSize: 15 }}>
                {completedOrder?.final_amount?.toLocaleString('vi-VN')} đ
              </strong>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default POS;

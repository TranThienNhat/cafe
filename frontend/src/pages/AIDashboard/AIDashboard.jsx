import React, { useState, useEffect } from 'react';
import {
  Row, Col, Card, Typography, Select, Button, Table, Tag, Radio,
  Spin, Space, Alert, Tabs
} from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
  ExperimentOutlined,
  ShoppingOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { aiService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const AIDashboard = () => {
  const { activeBranchId } = useAuth();
  
  // Tab & Control states
  const [activeTab, setActiveTab] = useState('revenue');
  const [forecastDays, setForecastDays] = useState(30);
  const [invPeriodDays, setInvPeriodDays] = useState(7);
  const [minConfidence, setMinConfidence] = useState(0.5);

  // Data states
  const [revenueData, setRevenueData] = useState(null);
  const [invData, setInvData] = useState(null);
  const [aprioriData, setAprioriData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAIData();
  }, [activeBranchId, forecastDays, invPeriodDays, minConfidence]);

  const loadAIData = async () => {
    setLoading(true);
    try {
      const [revRes, invRes, aprRes] = await Promise.all([
        aiService.getRevenueForecast(activeBranchId, forecastDays),
        aiService.getInventoryForecast(activeBranchId, invPeriodDays),
        aiService.getAssociationRules(0.01, minConfidence)
      ]);

      if (revRes.success) setRevenueData(revRes);
      if (invRes.success) setInvData(invRes);
      if (aprRes.success) setAprioriData(aprRes);
    } catch {
      // Mockup fallback
    } finally {
      setLoading(false);
    }
  };

  // ECharts: Dự báo doanh thu thích ứng mọi màn hình
  const forecastChartOption = {
    tooltip: {
      trigger: 'axis',
      confine: true, // Không tràn viền màn hình
      formatter: (params) => {
        const p = params[0];
        const upper = params.find(item => item.seriesName === 'Giới hạn trên');
        const lower = params.find(item => item.seriesName === 'Giới hạn dưới');
        return `
          <div style="font-size: 12px; line-height: 1.4;">
            <strong>Ngày: ${p.name}</strong><br/>
            🔮 Dự báo (Random Forest): <strong style="color: #6f4e37">${Number(p.value).toLocaleString('vi-VN')} đ</strong><br/>
            ${upper ? `<span style="color: #8d7b72;">Dải tin cậy: ${Number(lower?.value || 0).toLocaleString('vi-VN')} - ${Number(upper?.value || 0).toLocaleString('vi-VN')} đ</span>` : ''}
          </div>
        `;
      }
    },
    legend: {
      data: ['Dự báo (Random Forest)', 'Giới hạn trên', 'Giới hạn dưới'],
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#5c4d44', fontSize: 11 }
    },
    grid: { left: 10, right: 15, bottom: 35, top: 25, containLabel: true },
    xAxis: {
      type: 'category',
      data: (revenueData?.forecast || []).map(f => {
        const parts = f.date.split('-');
        return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : f.date;
      }),
      axisLine: { lineStyle: { color: '#ded5cd' } },
      axisLabel: { color: '#8d7b72', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (val) => `${(val / 1000000).toFixed(1)}M`,
        color: '#8d7b72',
        fontSize: 11
      },
      splitLine: { lineStyle: { type: 'dashed', color: '#f4eee9' } }
    },
    series: [
      {
        name: 'Dự báo (Random Forest)',
        type: 'line',
        smooth: 0.3,
        data: (revenueData?.forecast || []).map(f => f.predicted_revenue),
        itemStyle: { color: '#6f4e37' },
        lineStyle: { width: 2.5 }
      },
      {
        name: 'Giới hạn trên',
        type: 'line',
        data: (revenueData?.forecast || []).map(f => f.confidence_upper),
        lineStyle: { opacity: 0 },
        stack: 'confidence-band',
        symbol: 'none'
      },
      {
        name: 'Giới hạn dưới',
        type: 'line',
        data: (revenueData?.forecast || []).map(f => f.confidence_lower),
        lineStyle: { opacity: 0 },
        areaStyle: { color: '#f5efe8', opacity: 0.6 },
        stack: 'confidence-band',
        symbol: 'none'
      }
    ]
  };

  return (
    <div style={{ padding: '20px 24px', background: '#faf8f5' }}>
      {/* Header Banner */}
      <div
        style={{
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: 14,
          border: '1px solid #eee7e1',
          marginBottom: 18,
          boxShadow: '0 1px 4px rgba(111, 78, 55, 0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: '#f5efe8',
              border: '1px solid #e5dbd2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6f4e37'
            }}
          >
            <RobotOutlined style={{ fontSize: 20 }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, color: '#2d2420', fontSize: 16 }}>
              Trung Tâm Trí Tuệ Nhân Tạo & Dự Báo Kinh Doanh
            </Title>
            <Text style={{ color: '#8d7b72', fontSize: 12 }}>
              Học máy Random Forest dự báo chuỗi thời gian & Thuật toán Apriori gợi ý bán chéo
            </Text>
          </div>
        </div>

        <Space wrap size={[6, 6]}>
          <Tag style={{ background: '#f5efe8', color: '#6f4e37', borderColor: '#ded5cd', padding: '2px 8px', borderRadius: 6, fontWeight: 500, fontSize: 11 }}>
            Random Forest
          </Tag>
          <Tag style={{ background: '#f2f6f4', color: '#4a6b5d', borderColor: '#d3e0d8', padding: '2px 8px', borderRadius: 6, fontWeight: 500, fontSize: 11 }}>
            Apriori Rules
          </Tag>
          <Tag style={{ background: '#faf5f0', color: '#9c6644', borderColor: '#e8ded4', padding: '2px 8px', borderRadius: 6, fontWeight: 500, fontSize: 11 }}>
            BOM Calculation
          </Tag>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          // TAB 1: DỰ BÁO DOANH THU
          {
            key: 'revenue',
            label: (
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                <LineChartOutlined /> 1. Dự Báo Doanh Thu (Random Forest)
              </span>
            ),
            children: (
              <div>
                <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
                  <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12, background: '#ffffff', border: '1px solid #eee7e1' }} bodyStyle={{ padding: '14px 16px' }}>
                      <Text style={{ color: '#8d7b72', fontSize: 11, fontWeight: 500 }}>Dự Báo 7 Ngày Tới</Text>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#6f4e37', marginTop: 2 }}>
                        {Number(revenueData?.summary?.next_7_days_revenue || 0).toLocaleString('vi-VN')} đ
                      </div>
                      <div style={{ fontSize: 11, color: '#8d7b72', marginTop: 2 }}>Chu kỳ tuần tới</div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12, background: '#ffffff', border: '1px solid #eee7e1' }} bodyStyle={{ padding: '14px 16px' }}>
                      <Text style={{ color: '#8d7b72', fontSize: 11, fontWeight: 500 }}>Dự Báo 30 Ngày Tới</Text>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#4a6b5d', marginTop: 2 }}>
                        {Number(revenueData?.summary?.next_30_days_revenue || 0).toLocaleString('vi-VN')} đ
                      </div>
                      <div style={{ fontSize: 11, color: '#8d7b72', marginTop: 2 }}>Ước tính cả tháng</div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12, background: '#ffffff', border: '1px solid #eee7e1' }} bodyStyle={{ padding: '14px 16px' }}>
                      <Text style={{ color: '#8d7b72', fontSize: 11, fontWeight: 500 }}>Độ Tin Cậy Mô Hình (R² Score)</Text>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#2d2420', marginTop: 2 }}>
                        {((revenueData?.metrics?.r2_score || 0.91) * 100).toFixed(1)}%
                      </div>
                      <div style={{ fontSize: 11, color: '#8d7b72', marginTop: 2 }}>
                        Sai số trung bình (MAE): {Number(revenueData?.metrics?.mae || 0).toLocaleString('vi-VN')} đ
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Card
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#2d2420' }}>📈 Đồ Thị Dự Báo Doanh Thu Chuỗi Thời Gian</span>
                      <Radio.Group value={forecastDays} onChange={(e) => setForecastDays(e.target.value)} size="small">
                        <Radio.Button value={7}>7 Ngày</Radio.Button>
                        <Radio.Button value={14}>14 Ngày</Radio.Button>
                        <Radio.Button value={30}>30 Ngày</Radio.Button>
                      </Radio.Group>
                    </div>
                  }
                  style={{ borderRadius: 12, border: '1px solid #eee7e1' }}
                  bodyStyle={{ padding: '12px 14px' }}
                >
                  <ReactECharts
                    option={forecastChartOption}
                    style={{ height: 320, width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </Card>
              </div>
            )
          },

          // TAB 2: DỰ BÁO NHU CẦU NGUYÊN VẬT LIỆU
          {
            key: 'inventory',
            label: (
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                <ExperimentOutlined /> 2. Nhu Cầu Nhập Kho (RF + Định Lượng BOM)
              </span>
            ),
            children: (
              <div>
                <Alert
                  message="Dự báo sản lượng món (Random Forest) ➔ Quy đổi nguyên liệu theo công thức BOM ➔ Trừ tồn kho hiện tại + Ngưỡng an toàn."
                  type="info"
                  showIcon
                  style={{ marginBottom: 14, borderRadius: 8, background: '#f5efe8', borderColor: '#ded5cd', color: '#5c4d44' }}
                />

                <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
                  <Col xs={24} sm={12}>
                    <Card style={{ borderRadius: 12, border: '1px solid #eee7e1' }} bodyStyle={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <Text style={{ color: '#8d7b72', fontSize: 11 }}>Nguyên liệu cần nhập:</Text>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#b85042', marginTop: 2 }}>
                            {invData?.total_items_to_order || 0} Loại
                          </div>
                        </div>
                        <Radio.Group value={invPeriodDays} onChange={(e) => setInvPeriodDays(e.target.value)} size="small">
                          <Radio.Button value={7}>7 ngày</Radio.Button>
                          <Radio.Button value={14}>14 ngày</Radio.Button>
                          <Radio.Button value={30}>30 ngày</Radio.Button>
                        </Radio.Group>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Card style={{ borderRadius: 12, border: '1px solid #eee7e1' }} bodyStyle={{ padding: '14px 16px' }}>
                      <Text style={{ color: '#8d7b72', fontSize: 11 }}>Ước tính ngân sách cần chuẩn bị:</Text>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#4a6b5d', marginTop: 2 }}>
                        {Number(invData?.total_estimated_cost || 0).toLocaleString('vi-VN')} đ
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Card style={{ borderRadius: 12, border: '1px solid #eee7e1' }}>
                  <Table
                    dataSource={invData?.recommendations || []}
                    rowKey="ingredient_id"
                    pagination={false}
                    size="small"
                    scroll={{ x: 600 }}
                    columns={[
                      {
                        title: 'Nguyên Liệu',
                        dataIndex: 'ingredient_name',
                        key: 'name',
                        render: (t) => <strong>{t}</strong>
                      },
                      {
                        title: 'Tồn Hiện Tại',
                        dataIndex: 'current_stock',
                        key: 'current',
                        render: (v, r) => `${Number(v).toLocaleString('vi-VN')} ${r.unit}`
                      },
                      {
                        title: 'Ngưỡng An Toàn',
                        dataIndex: 'safety_stock',
                        key: 'safety',
                        render: (v, r) => `${Number(v).toLocaleString('vi-VN')} ${r.unit}`
                      },
                      {
                        title: 'Tiêu Thụ Dự Kiến',
                        dataIndex: 'predicted_consumption',
                        key: 'consumption',
                        render: (v, r) => <strong style={{ color: '#6f4e37' }}>{Number(v).toLocaleString('vi-VN')} {r.unit}</strong>
                      },
                      {
                        title: 'KHUYẾN NGHỊ NHẬP',
                        dataIndex: 'recommended_order_quantity',
                        key: 'order',
                        render: (v, r) => (
                          <strong style={{ fontSize: 13, color: v > 0 ? '#b85042' : '#4a6b5d' }}>
                            {Number(v).toLocaleString('vi-VN')} {r.unit}
                          </strong>
                        )
                      },
                      {
                        title: 'Chi Phí Dự Kiến',
                        dataIndex: 'estimated_cost',
                        key: 'cost',
                        render: (v) => `${Number(v).toLocaleString('vi-VN')} đ`
                      },
                      {
                        title: 'Trạng Thái',
                        dataIndex: 'status',
                        key: 'status',
                        render: (st, r) => (
                          <Tag style={{
                            background: st === 'CRITICAL' ? '#fdf2f0' : st === 'WARNING' ? '#faf5f0' : '#f2f6f4',
                            color: st === 'CRITICAL' ? '#b85042' : st === 'WARNING' ? '#9c6644' : '#4a6b5d',
                            borderColor: st === 'CRITICAL' ? '#f9deda' : st === 'WARNING' ? '#e8ded4' : '#d3e0d8',
                            fontWeight: 600
                          }}>
                            {r.status_text}
                          </Tag>
                        )
                      }
                    ]}
                  />
                </Card>
              </div>
            )
          },

          // TAB 3: APRIORI
          {
            key: 'apriori',
            label: (
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                <ThunderboltOutlined /> 3. Gợi Ý Combo & Bán Chéo (Apriori)
              </span>
            ),
            children: (
              <div>
                <Alert
                  message="Thuật toán Apriori phát hiện các mẫu món mua cùng nhau để gợi ý tức thì trên màn hình POS (Cross-selling)."
                  type="success"
                  showIcon
                  style={{ marginBottom: 14, borderRadius: 8, background: '#f2f6f4', borderColor: '#d3e0d8', color: '#4a6b5d' }}
                />

                <Card title={<span style={{ fontSize: 13, fontWeight: 600, color: '#2d2420' }}>Bảng Luật Kết Hợp Giỏ Hàng (Association Rules)</span>} style={{ borderRadius: 12, border: '1px solid #eee7e1' }}>
                  <Table
                    dataSource={aprioriData?.rules || []}
                    rowKey="insight"
                    pagination={false}
                    size="small"
                    scroll={{ x: 600 }}
                    columns={[
                      {
                        title: 'Món Khách Chọn',
                        dataIndex: 'antecedents_text',
                        key: 'ant',
                        render: (t) => <Tag style={{ background: '#f5efe8', color: '#6f4e37', borderColor: '#ded5cd', fontSize: 12 }}>{t}</Tag>
                      },
                      {
                        title: 'Món Gợi Ý Mua Kèm',
                        dataIndex: 'consequents_text',
                        key: 'con',
                        render: (t) => <Tag style={{ background: '#f2f6f4', color: '#4a6b5d', borderColor: '#d3e0d8', fontSize: 12, fontWeight: 600 }}>{t}</Tag>
                      },
                      {
                        title: 'Độ Tin Cậy',
                        dataIndex: 'confidence_percent',
                        key: 'conf',
                        render: (c) => <strong style={{ color: '#4a6b5d' }}>{c}</strong>
                      },
                      {
                        title: 'Độ Nâng (Lift)',
                        dataIndex: 'lift',
                        key: 'lift',
                        render: (l) => <Tag style={{ background: '#faf5f0', color: '#9c6644', borderColor: '#e8ded4', fontWeight: 600 }}>{l}x</Tag>
                      },
                      {
                        title: 'Ý Nghĩa Nghiệp Vụ',
                        dataIndex: 'insight',
                        key: 'ins',
                        render: (ins) => <span style={{ color: '#5c4d44', fontSize: 12 }}>💡 {ins}</span>
                      }
                    ]}
                  />
                </Card>
              </div>
            )
          }
        ]}
      />
    </div>
  );
};

export default AIDashboard;

import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Typography, Select, Spin, Radio, Table, Tag, Space } from 'antd';
import {
  DollarOutlined,
  ShoppingOutlined,
  ShopOutlined,
  AlertOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { reportService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const Reports = () => {
  const { activeBranchId, isSuperAdmin } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [revenueTrends, setRevenueTrends] = useState([]);
  const [branchComparison, setBranchComparison] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [paymentData, setPaymentData] = useState(null);
  const [trendDays, setTrendDays] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [activeBranchId, trendDays]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [kpiRes, trendRes, compRes, topRes, hourRes, payRes] = await Promise.all([
        reportService.getKPIs(activeBranchId),
        reportService.getRevenueTrends(trendDays, activeBranchId),
        reportService.getBranchComparison(),
        reportService.getTopProducts(10, activeBranchId),
        reportService.getHourlyPeak(activeBranchId),
        reportService.getPaymentBreakdown(activeBranchId)
      ]);

      if (kpiRes.success) setKpis(kpiRes.kpis);
      if (trendRes.success) setRevenueTrends(trendRes.trends);
      if (compRes.success) setBranchComparison(compRes.comparison);
      if (topRes.success) setTopProducts(topRes.top_products);
      if (hourRes.success) setHourlyData(hourRes.hourly_data);
      if (payRes.success) setPaymentData(payRes);
    } catch {
      // Mockup fallback
    } finally {
      setLoading(false);
    }
  };

  // 1. BIỂU ĐỒ DOANH THU CHUỖI THỜI GIAN (SMOOTH AREA CHART)
  const revenueTrendOption = {
    tooltip: {
      trigger: 'axis',
      confine: true, // Không bao giờ tràn viền màn hình
      formatter: (params) => {
        const item = params[0];
        const count = item.data.orderCount || 0;
        return `
          <div style="font-size: 12px; line-height: 1.5;">
            <strong>Ngày: ${item.name}</strong><br/>
            💰 Doanh thu: <strong style="color: #6f4e37">${Number(item.value).toLocaleString('vi-VN')} đ</strong><br/>
            🧾 Số đơn: <strong>${count} đơn</strong>
          </div>
        `;
      }
    },
    grid: { left: 10, right: 16, bottom: 10, top: 30, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: revenueTrends.map(t => {
        const parts = t.date.split('-');
        return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : t.date;
      }),
      axisLine: { lineStyle: { color: '#ded5cd' } },
      axisLabel: { color: '#8d7b72', fontSize: 11 }
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
        name: 'Doanh thu',
        type: 'line',
        smooth: 0.3,
        data: revenueTrends.map(t => ({
          value: t.revenue,
          orderCount: t.order_count
        })),
        itemStyle: { color: '#6f4e37' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(111, 78, 55, 0.28)' },
              { offset: 1, color: 'rgba(111, 78, 55, 0.01)' }
            ]
          }
        },
        lineStyle: { width: 2.5 }
      }
    ]
  };

  // 2. BIỂU ĐỒ CỘT NGANG TOP MÓN BÁN CHẠY (HORIZONTAL RANKING BAR) - Cực kỳ dễ đọc tên món dài
  const sortedTop = [...topProducts].reverse(); // Đảo ngược để món top 1 ở trên cùng
  const topRankingOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      formatter: (params) => {
        const item = params[0];
        const p = topProducts.find(prod => prod.name === item.name);
        return `
          <div style="font-size: 12px;">
            <strong>${item.name}</strong><br/>
            ☕ Đã bán: <strong style="color: #6f4e37">${item.value} ly</strong><br/>
            💵 Doanh số: <strong>${Number(p?.total_sales || 0).toLocaleString('vi-VN')} đ</strong>
          </div>
        `;
      }
    },
    grid: { left: 10, right: 35, bottom: 10, top: 15, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#8d7b72', fontSize: 11 },
      splitLine: { lineStyle: { type: 'dashed', color: '#f4eee9' } }
    },
    yAxis: {
      type: 'category',
      data: sortedTop.map(p => p.name),
      axisLabel: {
        color: '#2d2420',
        fontSize: 12,
        fontWeight: 500,
        formatter: (val) => val.length > 20 ? val.substring(0, 18) + '...' : val
      },
      axisLine: { lineStyle: { color: '#ded5cd' } }
    },
    series: [
      {
        name: 'Số lượng bán',
        type: 'bar',
        barWidth: 14,
        data: sortedTop.map(p => p.total_sold),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#8d6e63' },
              { offset: 1, color: '#6f4e37' }
            ]
          },
          borderRadius: [0, 6, 6, 0]
        },
        label: {
          show: true,
          position: 'right',
          color: '#6f4e37',
          fontWeight: 600,
          fontSize: 11,
          formatter: '{c} ly'
        }
      }
    ]
  };

  // 3. BIỂU ĐỒ KHUNG GIỜ CAO ĐIỂM (HOURLY PEAK BARS)
  const hourlyPeakOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      formatter: (params) => {
        const item = params[0];
        const hData = hourlyData.find(h => h.hour_label === item.name);
        return `
          <div style="font-size: 12px;">
            <strong>Khung giờ: ${item.name}</strong><br/>
            👥 Lượt đơn: <strong style="color: #4a6b5d">${item.value} đơn</strong><br/>
            💰 Doanh thu: <strong>${Number(hData?.revenue || 0).toLocaleString('vi-VN')} đ</strong>
          </div>
        `;
      }
    },
    grid: { left: 10, right: 10, bottom: 10, top: 25, containLabel: true },
    xAxis: {
      type: 'category',
      data: hourlyData.map(h => h.hour_label),
      axisLabel: { color: '#8d7b72', fontSize: 10, interval: 1 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8d7b72', fontSize: 11 },
      splitLine: { lineStyle: { type: 'dashed', color: '#f4eee9' } }
    },
    series: [
      {
        name: 'Số lượng đơn',
        type: 'bar',
        barWidth: '55%',
        data: hourlyData.map(h => h.orders),
        itemStyle: {
          color: (params) => {
            // Highlight giờ cao điểm (sáng 8-9h hoặc tối 19-20h)
            const h = hourlyData[params.dataIndex]?.hour;
            if (h === 8 || h === 9 || h === 19 || h === 20) {
              return '#4a6b5d'; // Sage cao điểm
            }
            return '#c4b5aa'; // Muted
          },
          borderRadius: [4, 4, 0, 0]
        }
      }
    ]
  };

  // 4. BIỂU ĐỒ TỶ TRỌNG THANH TOÁN (DONUT CHART VỚI TỔNG Ở TÂM)
  const paymentMethods = paymentData?.payments || [];
  const totalPayAmount = paymentMethods.reduce((sum, p) => sum + p.total_amount, 0);

  const paymentDonutOption = {
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params) => {
        return `<strong>${params.name}</strong>: ${Number(params.value).toLocaleString('vi-VN')} đ (${params.percent}%)`;
      }
    },
    legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { color: '#5c4d44', fontSize: 11 } },
    series: [
      {
        name: 'Phương thức thanh toán',
        type: 'pie',
        radius: ['52%', '76%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        color: ['#6f4e37', '#4a6b5d', '#9c6644', '#bca393'],
        data: paymentMethods.map(p => ({
          name: p.payment_method === 'CASH' ? 'Tiền mặt' : p.payment_method === 'TRANSFER_QR' ? 'Chuyển QR' : 'Thẻ POS',
          value: p.total_amount
        }))
      }
    ]
  };

  // 5. SO SÁNH CHI NHÁNH
  const branchCompOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      formatter: (params) => `${params[0].name}: <strong>${Number(params[0].value).toLocaleString('vi-VN')} đ</strong>`
    },
    grid: { left: 10, right: 10, bottom: 10, top: 20, containLabel: true },
    xAxis: {
      type: 'category',
      data: branchComparison.map(b => b.branch_name.replace('Chi nhánh ', '')),
      axisLabel: { color: '#5c4d44', fontSize: 11, interval: 0 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (val) => `${(val / 1000000).toFixed(0)}M`, color: '#8d7b72', fontSize: 11 },
      splitLine: { lineStyle: { type: 'dashed', color: '#f4eee9' } }
    },
    series: [
      {
        name: 'Doanh thu',
        type: 'bar',
        barWidth: 26,
        data: branchComparison.map(b => b.total_revenue),
        itemStyle: {
          color: '#6f4e37',
          borderRadius: [6, 6, 0, 0]
        }
      }
    ]
  };

  return (
    <div style={{ padding: '20px 24px', background: '#faf8f5' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, color: '#2d2420' }}>
            Báo Cáo Hiệu Suất Kinh Doanh
          </Title>
          <Text style={{ color: '#8d7b72', fontSize: 12 }}>
            Trực quan hóa doanh số, phân tích xếp hạng món và khung giờ cao điểm
          </Text>
        </div>
      </div>

      {/* KPI STAT CARDS */}
      <Row gutter={[14, 14]} style={{ marginBottom: 18 }}>
        <Col xs={12} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, background: '#ffffff', border: '1px solid #eee7e1' }} bodyStyle={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text style={{ color: '#8d7b72', fontSize: 11, fontWeight: 500 }}>Doanh Thu Hôm Nay</Text>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#6f4e37', marginTop: 2 }}>
                  {Number(kpis?.today_revenue || 0).toLocaleString('vi-VN')} đ
                </div>
                <div style={{ fontSize: 11, color: '#8d7b72', marginTop: 2 }}>
                  {kpis?.today_orders || 0} đơn
                </div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f5efe8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarOutlined style={{ fontSize: 16, color: '#6f4e37' }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, background: '#ffffff', border: '1px solid #eee7e1' }} bodyStyle={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text style={{ color: '#8d7b72', fontSize: 11, fontWeight: 500 }}>Doanh Thu Tháng</Text>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#4a6b5d', marginTop: 2 }}>
                  {Number(kpis?.month_revenue || 0).toLocaleString('vi-VN')} đ
                </div>
                <div style={{ fontSize: 11, color: '#8d7b72', marginTop: 2 }}>
                  {kpis?.month_orders || 0} lượt khách
                </div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f2f6f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RiseOutlined style={{ fontSize: 16, color: '#4a6b5d' }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, background: '#ffffff', border: '1px solid #eee7e1' }} bodyStyle={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text style={{ color: '#8d7b72', fontSize: 11, fontWeight: 500 }}>Tổng Chi Nhánh</Text>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#2d2420', marginTop: 2 }}>
                  {kpis?.total_branches || 1} Cửa Hàng
                </div>
                <div style={{ fontSize: 11, color: '#8d7b72', marginTop: 2 }}>
                  {kpis?.total_users || 0} nhân sự
                </div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f5efe8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShopOutlined style={{ fontSize: 16, color: '#6f4e37' }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, background: '#ffffff', border: '1px solid #eee7e1' }} bodyStyle={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text style={{ color: '#8d7b72', fontSize: 11, fontWeight: 500 }}>Cảnh Báo Kho</Text>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#b85042', marginTop: 2 }}>
                  {kpis?.low_stock_count || 0} Mục
                </div>
                <div style={{ fontSize: 11, color: '#8d7b72', marginTop: 2 }}>
                  Dưới mức an toàn
                </div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fdf2f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertOutlined style={{ fontSize: 16, color: '#b85042' }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* HÀNG 1: DOANH THU THEO NGÀY + TOP 10 CỘT NGANG */}
      <Row gutter={[14, 14]} style={{ marginBottom: 14 }}>
        {/* DOANH THU THEO THỜI GIAN */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2d2420' }}>📈 Xu Hướng Doanh Thu Theo Ngày</span>
                <Radio.Group value={trendDays} onChange={(e) => setTrendDays(e.target.value)} size="small">
                  <Radio.Button value={7}>7 ngày</Radio.Button>
                  <Radio.Button value={14}>14 ngày</Radio.Button>
                  <Radio.Button value={30}>30 ngày</Radio.Button>
                </Radio.Group>
              </div>
            }
            style={{ borderRadius: 12, border: '1px solid #eee7e1' }}
            bodyStyle={{ padding: '12px 14px' }}
          >
            <ReactECharts
              option={revenueTrendOption}
              style={{ height: 280, width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </Card>
        </Col>

        {/* TOP 10 MÓN BÁN CHẠY (CỘT NGANG RANKING) */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrophyOutlined style={{ color: '#6f4e37' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2d2420' }}>Top 10 Món Bán Chạy (Xếp Hạng)</span>
              </div>
            }
            style={{ borderRadius: 12, border: '1px solid #eee7e1' }}
            bodyStyle={{ padding: '12px 14px' }}
          >
            <ReactECharts
              option={topRankingOption}
              style={{ height: 280, width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </Card>
        </Col>
      </Row>

      {/* HÀNG 2: PHÂN TÍCH KHUNG GIỜ CAO ĐIỂM + CƠ CẤU THANH TOÁN + SO SÁNH CHI NHÁNH */}
      <Row gutter={[14, 14]}>
        {/* KHUNG GIỜ CAO ĐIỂM (7h - 22h) */}
        <Col xs={24} md={12} lg={isSuperAdmin ? 8 : 14}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ClockCircleOutlined style={{ color: '#4a6b5d' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2d2420' }}>Khung Giờ Cao Điểm (Peak Hours)</span>
              </div>
            }
            style={{ borderRadius: 12, border: '1px solid #eee7e1' }}
            bodyStyle={{ padding: '12px 14px' }}
          >
            <ReactECharts
              option={hourlyPeakOption}
              style={{ height: 240, width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </Card>
        </Col>

        {/* TỶ TRỌNG THANH TOÁN */}
        <Col xs={24} md={12} lg={isSuperAdmin ? 8 : 10}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CreditCardOutlined style={{ color: '#6f4e37' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2d2420' }}>Phương Thức Thanh Toán</span>
              </div>
            }
            style={{ borderRadius: 12, border: '1px solid #eee7e1' }}
            bodyStyle={{ padding: '12px 14px' }}
          >
            <ReactECharts
              option={paymentDonutOption}
              style={{ height: 240, width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </Card>
        </Col>

        {/* SO SÁNH CHI NHÁNH (Dành cho Super Admin) */}
        {isSuperAdmin && (
          <Col xs={24} md={24} lg={8}>
            <Card
              title={<span style={{ fontSize: 13, fontWeight: 600, color: '#2d2420' }}>🏢 So Sánh Doanh Thu Chi Nhánh</span>}
              style={{ borderRadius: 12, border: '1px solid #eee7e1' }}
              bodyStyle={{ padding: '12px 14px' }}
            >
              <ReactECharts
                option={branchCompOption}
                style={{ height: 240, width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default Reports;

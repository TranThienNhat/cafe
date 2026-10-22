import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Typography, Button } from 'antd';
import { HistoryOutlined, ReloadOutlined, LoginOutlined, CoffeeOutlined, DatabaseOutlined, PlusCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { reportService } from '../../api/services';

const { Title, Text } = Typography;

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await reportService.getAuditLogs(100);
      if (res.success) setLogs(res.logs);
    } catch {
      // Mock fallback
    } finally {
      setLoading(false);
    }
  };

  const getActionTag = (action) => {
    switch (action) {
      case 'LOGIN':
        return <Tag icon={<LoginOutlined />} style={{ background: '#f0f4f8', color: '#3b5998', borderColor: '#d0dbe5' }}>ĐĂNG NHẬP</Tag>;
      case 'CREATE_ORDER':
        return <Tag icon={<CoffeeOutlined />} style={{ background: '#f2f6f4', color: '#4a6b5d', borderColor: '#d3e0d8' }}>TẠO ĐƠN POS</Tag>;
      case 'UPDATE_STOCK':
        return <Tag icon={<DatabaseOutlined />} style={{ background: '#faf5f0', color: '#9c6644', borderColor: '#e8ded4' }}>CẬP NHẬT KHO</Tag>;
      case 'CREATE_PRODUCT':
        return <Tag icon={<PlusCircleOutlined />} style={{ background: '#f5efe8', color: '#6f4e37', borderColor: '#ded5cd' }}>TẠO MÓN</Tag>;
      case 'CANCEL_ORDER':
        return <Tag icon={<CloseCircleOutlined />} style={{ background: '#fdf2f0', color: '#b85042', borderColor: '#f9deda' }}>HỦY ĐƠN</Tag>;
      default:
        return <Tag style={{ background: '#f8f8f8', color: '#5c4d44', borderColor: '#eee7e1' }}>{action}</Tag>;
    }
  };

  return (
    <div style={{ padding: '24px', background: '#faf8f5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontFamily: 'Outfit', fontWeight: 700, color: '#2d2420' }}>
            Nhật Ký Hoạt Động Hệ Thống
          </Title>
          <Text style={{ color: '#8d7b72', fontSize: 13 }}>
            Ghi nhận toàn bộ thao tác người dùng, thanh toán đơn hàng và phân quyền
          </Text>
        </div>

        <Button icon={<ReloadOutlined />} onClick={loadLogs} loading={loading} style={{ borderRadius: 8, fontSize: 12 }}>
          Làm mới
        </Button>
      </div>

      <Card style={{ borderRadius: 14, border: '1px solid #eee7e1' }}>
        <Table
          dataSource={logs}
          rowKey="id"
          loading={loading}
          size="small"
          columns={[
            { title: 'ID', dataIndex: 'id', key: 'id', width: 60, render: (id) => <span style={{ color: '#8d7b72' }}>#{id}</span> },
            {
              title: 'Người Thực Hiện',
              dataIndex: 'user_name',
              key: 'user',
              render: (name, r) => (
                <div>
                  <strong style={{ color: '#2d2420' }}>{name || 'Hệ thống'}</strong>
                  {r.username && <div style={{ fontSize: 11, color: '#8d7b72' }}>@{r.username}</div>}
                </div>
              )
            },
            {
              title: 'Hành Động',
              dataIndex: 'action',
              key: 'action',
              render: (act) => getActionTag(act)
            },
            { title: 'Chi Tiết Thao Tác', dataIndex: 'detail', key: 'detail' },
            { title: 'Địa Chỉ IP', dataIndex: 'ip_address', key: 'ip', render: (ip) => <code style={{ fontSize: 11, color: '#5c4d44' }}>{ip || '---'}</code> },
            { title: 'Thời Gian', dataIndex: 'created_at', key: 'time', render: (t) => <span style={{ color: '#8d7b72', fontSize: 12 }}>{t}</span> }
          ]}
          pagination={{ pageSize: 12 }}
        />
      </Card>
    </div>
  );
};

export default AuditLogs;

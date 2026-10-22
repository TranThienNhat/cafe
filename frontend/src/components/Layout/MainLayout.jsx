import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Select, Dropdown, Avatar, Badge, Tag, Space } from 'antd';
import {
  ShopOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  RobotOutlined,
  TeamOutlined,
  HistoryOutlined,
  LogoutOutlined,
  BellOutlined,
  CoffeeOutlined,
  TableOutlined,
  BranchesOutlined,
  UserOutlined,
  CrownOutlined,
  IdcardOutlined,
  LockOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { inventoryService } from '../../api/services';

const { Header, Sider, Content } = Layout;

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, branches, activeBranchId, switchBranch, isSuperAdmin, isBranchManager } = useAuth();

  useEffect(() => {
    // Tải số lượng cảnh báo tồn kho (chỉ dành cho Super Admin và Branch Manager)
    if (isBranchManager) {
      inventoryService.getLowStockAlerts(activeBranchId)
        .then((res) => {
          if (res.success) {
            setLowStockCount(res.count);
          }
        })
        .catch(() => {});
    }
  }, [activeBranchId, isBranchManager]);

  // Menu items được phân quyền chặt chẽ theo vai trò
  const menuItems = [
    // 1. Phân hệ Bán hàng POS (Mọi vai trò đều có quyền truy cập)
    {
      key: '/pos',
      icon: <CoffeeOutlined style={{ fontSize: 16, color: '#6f4e37' }} />,
      label: 'Bán Hàng (POS)',
    },
    // 2. Sơ đồ bàn (Mọi vai trò)
    {
      key: '/tables',
      icon: <TableOutlined style={{ fontSize: 16 }} />,
      label: 'Sơ Đồ Bàn',
    },
    // 3. Thực đơn & BOM (Mọi vai trò có thể xem, Quản lý/Admin có thể sửa)
    {
      key: '/menu',
      icon: <AppstoreOutlined style={{ fontSize: 16 }} />,
      label: isBranchManager ? 'Thực Đơn & Định Lượng' : 'Xem Thực Đơn',
    },
    // 4. Quản lý kho & NCC (Chỉ Super Admin và Quản lý Chi nhánh)
    ...(isBranchManager ? [
      {
        key: '/inventory',
        icon: (
          <Badge count={lowStockCount} size="small" offset={[4, -2]}>
            <DatabaseOutlined style={{ fontSize: 16 }} />
          </Badge>
        ),
        label: 'Kho & Chuỗi Cung Ứng',
      }
    ] : []),
    // 5. Báo cáo doanh thu (Chỉ Super Admin và Quản lý)
    ...(isBranchManager ? [
      {
        key: '/reports',
        icon: <BarChartOutlined style={{ fontSize: 16 }} />,
        label: isSuperAdmin ? 'Báo Cáo Toàn Chuỗi' : 'Báo Cáo Chi Nhánh',
      }
    ] : []),
    // 6. AI Insights (Chỉ Super Admin và Quản lý)
    ...(isBranchManager ? [
      {
        key: '/ai-dashboard',
        icon: <RobotOutlined style={{ fontSize: 16, color: '#4a6b5d' }} />,
        label: (
          <span>
            AI Insights <Tag style={{ marginLeft: 4, fontSize: 9, background: '#f5efe8', color: '#6f4e37', borderColor: '#ded5cd' }}>ML</Tag>
          </span>
        ),
      }
    ] : []),
    // 7. Quản trị nhân sự (Quản lý chi nhánh & Super Admin)
    ...(isBranchManager ? [
      {
        key: '/users',
        icon: <TeamOutlined style={{ fontSize: 16 }} />,
        label: 'Nhân Sự & Phân Quyền',
      }
    ] : []),
    // 8. Quản trị chuỗi chi nhánh (Duy nhất Super Admin)
    ...(isSuperAdmin ? [
      {
        key: '/branches',
        icon: <BranchesOutlined style={{ fontSize: 16 }} />,
        label: 'Quản Lý Chi Nhánh',
      }
    ] : []),
    // 9. Nhật ký kiểm vết (Duy nhất Super Admin & Quản lý)
    ...(isBranchManager ? [
      {
        key: '/audit-logs',
        icon: <HistoryOutlined style={{ fontSize: 16 }} />,
        label: 'Nhật Ký Hoạt Động',
      }
    ] : []),
  ];

  const userMenuItems = [
    {
      key: 'role-info',
      label: (
        <div style={{ padding: '4px 2px' }}>
          <div style={{ fontWeight: 600, color: '#2d2420' }}>{user?.full_name || 'Người dùng'}</div>
          <div style={{ fontSize: 12, color: '#8d7b72' }}>@{user?.username}</div>
          <Tag
            icon={user?.role === 'SUPER_ADMIN' ? <CrownOutlined /> : user?.role === 'BRANCH_MANAGER' ? <IdcardOutlined /> : <CoffeeOutlined />}
            style={{ marginTop: 6, background: '#f5efe8', color: '#6f4e37', borderColor: '#ded5cd', fontWeight: 600 }}
          >
            {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'BRANCH_MANAGER' ? 'Quản Lý Chi Nhánh' : 'Thu Ngân / Phục Vụ'}
          </Tag>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ color: '#b85042' }} />,
      label: <span style={{ color: '#b85042' }}>Đăng xuất</span>,
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const roleTag = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return (
          <Tag icon={<CrownOutlined />} style={{ background: '#f5efe8', color: '#6f4e37', borderColor: '#ded5cd', fontWeight: 600, padding: '2px 8px' }}>
            SUPER ADMIN
          </Tag>
        );
      case 'BRANCH_MANAGER':
        return (
          <Tag icon={<IdcardOutlined />} style={{ background: '#f0f4f8', color: '#3b5998', borderColor: '#d0dbe5', fontWeight: 600, padding: '2px 8px' }}>
            QUẢN LÝ
          </Tag>
        );
      default:
        return (
          <Tag icon={<CoffeeOutlined />} style={{ background: '#f2f6f4', color: '#4a6b5d', borderColor: '#d3e0d8', fontWeight: 600, padding: '2px 8px' }}>
            THU NGÂN
          </Tag>
        );
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#faf8f5' }}>
      {/* Sider Navigation */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={250}
        theme="light"
        style={{
          background: '#ffffff',
          borderRight: '1px solid #eee7e1',
          zIndex: 10,
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            background: '#ffffff',
            borderBottom: '1px solid #eee7e1',
            gap: 12,
            cursor: 'pointer'
          }}
          onClick={() => navigate('/pos')}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#f5efe8',
              border: '1px solid #e5dbd2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CoffeeOutlined style={{ fontSize: 20, color: '#6f4e37' }} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ color: '#2d2420', fontWeight: 800, fontSize: 16, fontFamily: 'Outfit', letterSpacing: '-0.02em' }}>
                Smart Coffee
              </div>
              <div style={{ color: '#8d7b72', fontSize: 10, fontWeight: 500, letterSpacing: '0.5px' }}>
                {user?.role === 'SUPER_ADMIN' ? 'CHAIN SYSTEM' : user?.role === 'BRANCH_MANAGER' ? 'BRANCH SYSTEM' : 'POS TERMINAL'}
              </div>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: '#ffffff',
            marginTop: 10,
            borderRight: 0,
            fontSize: 13,
            fontWeight: 500
          }}
        />
      </Sider>

      {/* Main Layout Area */}
      <Layout style={{ background: '#faf8f5' }}>
        {/* Header */}
        <Header
          style={{
            background: '#ffffff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #eee7e1',
            height: 64,
            zIndex: 9
          }}
        >
          {/* Branch Switcher / Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Space align="center">
              <ShopOutlined style={{ fontSize: 17, color: '#6f4e37' }} />
              <span style={{ fontWeight: 600, color: '#5c4d44', fontSize: 13 }}>Chi nhánh:</span>
              {isSuperAdmin ? (
                <Select
                  value={activeBranchId}
                  onChange={switchBranch}
                  style={{ width: 250 }}
                  options={branches.map((b) => ({
                    value: b.id,
                    label: b.name,
                  }))}
                />
              ) : (
                <Tag style={{ background: '#f5efe8', color: '#6f4e37', borderColor: '#ded5cd', fontWeight: 600, fontSize: 13, padding: '3px 10px' }}>
                  {branches.find(b => b.id === activeBranchId)?.name || 'Chi nhánh hiện tại'}
                </Tag>
              )}
            </Space>
          </div>

          {/* User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {lowStockCount > 0 && isBranchManager && (
              <Button
                type="text"
                icon={<BellOutlined style={{ color: '#b85042', fontSize: 16 }} />}
                onClick={() => navigate('/inventory')}
                style={{ background: '#fdf2f0', borderRadius: 8, color: '#b85042', fontWeight: 600, fontSize: 12, border: '1px solid #f9deda' }}
              >
                {lowStockCount} Thiếu kho
              </Button>
            )}

            {roleTag()}

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: 8,
                  transition: 'all 0.2s',
                  border: '1px solid #eee7e1',
                  background: '#ffffff'
                }}
              >
                <Avatar
                  style={{ backgroundColor: '#6f4e37', verticalAlign: 'middle', color: '#ffffff' }}
                  icon={<UserOutlined />}
                  size="small"
                >
                  {user?.full_name?.charAt(0) || 'U'}
                </Avatar>
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#2d2420' }}>
                    {user?.full_name || 'Người dùng'}
                  </div>
                  <div style={{ fontSize: 11, color: '#8d7b72' }}>
                    @{user?.username || 'user'}
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content style={{ margin: 0, minHeight: 'calc(100vh - 64px)', background: '#faf8f5' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;

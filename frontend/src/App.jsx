import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login/Login';
import POS from './pages/POS/POS';
import Tables from './pages/Tables/Tables';
import Menu from './pages/Menu/Menu';
import Inventory from './pages/Inventory/Inventory';
import Reports from './pages/Reports/Reports';
import AIDashboard from './pages/AIDashboard/AIDashboard';
import Users from './pages/Users/Users';
import Branches from './pages/Branches/Branches';
import AuditLogs from './pages/AuditLogs/AuditLogs';

// Protected Route Component với phân quyền RBAC
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  if (!user && !token) {
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra phân quyền vai trò
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/pos" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* 1. Mọi vai trò: POS, Sơ đồ bàn, Xem thực đơn */}
      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <POS />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tables"
        element={
          <ProtectedRoute>
            <Tables />
          </ProtectedRoute>
        }
      />
      <Route
        path="/menu"
        element={
          <ProtectedRoute>
            <Menu />
          </ProtectedRoute>
        }
      />

      {/* 2. Chỉ Quản lý chi nhánh & Super Admin: Kho, Báo cáo, AI Insights, Nhân sự, Audit logs */}
      <Route
        path="/inventory"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'BRANCH_MANAGER']}>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'BRANCH_MANAGER']}>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-dashboard"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'BRANCH_MANAGER']}>
            <AIDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'BRANCH_MANAGER']}>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'BRANCH_MANAGER']}>
            <AuditLogs />
          </ProtectedRoute>
        }
      />

      {/* 3. Duy nhất Super Admin: Quản lý chi nhánh toàn chuỗi */}
      <Route
        path="/branches"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <Branches />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#6f4e37',
          colorInfo: '#6f4e37',
          colorSuccess: '#4a6b5d',
          colorWarning: '#9c6644',
          colorError: '#b85042',
          colorBgBase: '#ffffff',
          colorBgLayout: '#faf8f5',
          colorBgContainer: '#ffffff',
          colorBorder: '#eee7e1',
          colorBorderSecondary: '#f4eee9',
          colorText: '#2d2420',
          colorTextSecondary: '#5c4d44',
          colorTextTertiary: '#8d7b72',
          borderRadius: 10,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        },
        components: {
          Button: {
            borderRadius: 8,
            controlHeight: 38,
          },
          Card: {
            borderRadiusLG: 14,
          },
          Table: {
            headerBg: '#fbf9f6',
            headerColor: '#4a3b32',
            rowHoverBg: '#fbf9f6',
          },
          Menu: {
            itemSelectedBg: '#f5efe8',
            itemSelectedColor: '#6f4e37',
            itemHoverBg: '#faf5f0',
          }
        }
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;

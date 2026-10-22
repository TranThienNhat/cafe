import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, branchService } from '../api/services';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState(() => {
    const saved = localStorage.getItem('activeBranchId');
    return saved ? Number(saved) : 1;
  });
  const [loading, setLoading] = useState(false);

  // Tải danh sách chi nhánh trực tiếp 100% từ Database
  const fetchBranches = useCallback(async () => {
    try {
      const res = await branchService.getAll();
      if (res.success && Array.isArray(res.branches) && res.branches.length > 0) {
        setBranches(res.branches);
        // Tự động đồng bộ chi nhánh đang chọn nếu ID không còn tồn tại trong DB
        setActiveBranchId((currentId) => {
          const exists = res.branches.some((b) => b.id === currentId);
          if (!exists) {
            const firstId = res.branches[0].id;
            localStorage.setItem('activeBranchId', String(firstId));
            return firstId;
          }
          return currentId;
        });
      }
    } catch {
      // Không hardcode dữ liệu giả
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await authService.login({ username, password });
      if (res.success) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        
        // Tải lại danh sách chi nhánh mới nhất từ DB
        await fetchBranches();

        if (res.user.branch_id) {
          setActiveBranchId(res.user.branch_id);
          localStorage.setItem('activeBranchId', String(res.user.branch_id));
        }
        return { success: true };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message || 'Đăng nhập thất bại' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeBranchId');
  };

  const switchBranch = (branchId) => {
    const numId = Number(branchId);
    setActiveBranchId(numId);
    localStorage.setItem('activeBranchId', String(numId));
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isBranchManager = user?.role === 'BRANCH_MANAGER' || isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        branches,
        activeBranchId,
        loading,
        login,
        logout,
        switchBranch,
        fetchBranches,
        isSuperAdmin,
        isBranchManager
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import apiClient from './client';

export const authService = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  getProfile: () => apiClient.get('/auth/me'),
  changePassword: (data) => apiClient.post('/auth/change-password', data),
};

export const branchService = {
  getAll: () => apiClient.get('/branches'),
  getById: (id) => apiClient.get(`/branches/${id}`),
  create: (data) => apiClient.post('/branches', data),
  update: (id, data) => apiClient.put(`/branches/${id}`, data),
  delete: (id) => apiClient.delete(`/branches/${id}`),
};

export const userService = {
  getAll: (params) => apiClient.get('/users', { params }),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.put(`/users/${id}`, data),
  resetPassword: (id, data) => apiClient.post(`/users/${id}/reset-password`, data),
  delete: (id) => apiClient.delete(`/users/${id}`),
};

export const tableService = {
  getAll: (params) => apiClient.get('/tables', { params }),
  updateStatus: (id, status) => apiClient.put(`/tables/${id}/status`, { status }),
  create: (data) => apiClient.post('/tables', data),
  update: (id, data) => apiClient.put(`/tables/${id}`, data),
  delete: (id) => apiClient.delete(`/tables/${id}`),
};

export const menuService = {
  getCategories: () => apiClient.get('/menu/categories'),
  createCategory: (data) => apiClient.post('/menu/categories', data),
  getProducts: (params) => apiClient.get('/menu/products', { params }),
  createProduct: (data) => apiClient.post('/menu/products', data),
  updateProduct: (id, data) => apiClient.put(`/menu/products/${id}`, data),
  deleteProduct: (id) => apiClient.delete(`/menu/products/${id}`),
  getIngredients: () => apiClient.get('/menu/ingredients'),
  createIngredient: (data) => apiClient.post('/menu/ingredients', data),
};

export const inventoryService = {
  getInventory: (branchId) => apiClient.get('/inventory', { params: { branch_id: branchId } }),
  getLowStockAlerts: (branchId) => apiClient.get('/inventory/low-stock-alerts', { params: { branch_id: branchId } }),
  updateStock: (data) => apiClient.put('/inventory/update-stock', data),
  getSuppliers: () => apiClient.get('/inventory/suppliers'),
  createSupplier: (data) => apiClient.post('/inventory/suppliers', data),
  getPurchaseOrders: (branchId) => apiClient.get('/inventory/purchase-orders', { params: { branch_id: branchId } }),
  createPurchaseOrder: (data) => apiClient.post('/inventory/purchase-orders', data),
};

export const orderService = {
  createOrder: (orderData) => apiClient.post('/orders', orderData),
  getOrders: (params) => apiClient.get('/orders', { params }),
  getOrderDetail: (id) => apiClient.get(`/orders/${id}`),
  cancelOrder: (id) => apiClient.put(`/orders/${id}/cancel`),
  searchCustomers: (query) => apiClient.get('/orders/customers', { params: { q: query } }),
  createCustomer: (data) => apiClient.post('/orders/customers', data),
};

export const reportService = {
  getKPIs: (branchId) => apiClient.get('/reports/kpis', { params: { branch_id: branchId } }),
  getRevenueTrends: (days = 30, branchId) => apiClient.get('/reports/revenue-trends', { params: { days, branch_id: branchId } }),
  getBranchComparison: () => apiClient.get('/reports/branch-comparison'),
  getTopProducts: (limit = 10, branchId) => apiClient.get('/reports/top-products', { params: { limit, branch_id: branchId } }),
  getHourlyPeak: (branchId) => apiClient.get('/reports/hourly-peak', { params: { branch_id: branchId } }),
  getPaymentBreakdown: (branchId) => apiClient.get('/reports/payment-breakdown', { params: { branch_id: branchId } }),
  getAuditLogs: (limit = 100) => apiClient.get('/reports/audit-logs', { params: { limit } }),
};

export const aiService = {
  getRevenueForecast: (branchId, days = 30) => apiClient.get('/ai/revenue-forecast', { params: { branch_id: branchId, days } }),
  getInventoryForecast: (branchId, period = 7) => apiClient.get('/ai/inventory-forecast', { params: { branch_id: branchId, period } }),
  getAssociationRules: (minSupport = 0.01, minConfidence = 0.5) => apiClient.get('/ai/association-rules', { params: { min_support: minSupport, min_confidence: minConfidence } }),
  getPosCrossSell: (currentItems) => apiClient.post('/ai/pos-cross-sell', { current_items: currentItems }),
};

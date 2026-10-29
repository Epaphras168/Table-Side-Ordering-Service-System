import { api } from './client';

export const authApi = {
  login: (username, password) => api.post('/api/auth/login', { username, password }),
  me: () => api.get('/api/auth/me'),
};

export const menuApi = {
  list: (category) => api.get(`/api/menu${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  create: (item) => api.post('/api/menu', item),
  update: (itemId, changes) => api.put(`/api/menu/${itemId}`, changes),
  remove: (itemId) => api.del(`/api/menu/${itemId}`),
};

export const tablesApi = {
  list: () => api.get('/api/tables'),
  get: (tableId) => api.get(`/api/tables/${tableId}`),
  seat: (tableId) => api.post(`/api/tables/${tableId}/seat`),
  create: (table) => api.post('/api/tables', table),
  update: (tableId, changes) => api.put(`/api/tables/${tableId}`, changes),
  remove: (tableId) => api.del(`/api/tables/${tableId}`),
};

export const ordersApi = {
  list: (params) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/orders${qs ? `?${qs}` : ''}`);
  },
  get: (orderId) => api.get(`/api/orders/${orderId}`),
  place: (order) => api.post('/api/orders', order),
  addItem: (orderId, item) => api.post(`/api/orders/${orderId}/items`, item),
  updateItem: (orderId, itemId, quantity) => api.put(`/api/orders/${orderId}/items/${itemId}`, { quantity }),
  removeItem: (orderId, itemId) => api.del(`/api/orders/${orderId}/items/${itemId}`),
  accept: (orderId) => api.post(`/api/orders/${orderId}/accept`),
  ready: (orderId) => api.post(`/api/orders/${orderId}/ready`),
  serve: (orderId) => api.post(`/api/orders/${orderId}/serve`),
  cancel: (orderId, reason) => api.post(`/api/orders/${orderId}/cancel`, { confirm: true, reason }),
};

export const notificationsApi = {
  list: (limit) => api.get(`/api/notifications${limit ? `?limit=${limit}` : ''}`),
  urgentAlert: (tableId, message) => api.post('/api/notifications/urgent-alert', { tableId, message }),
};

export const billsApi = {
  get: (billId) => api.get(`/api/bills/${billId}`),
  openForTable: (tableId) => api.get(`/api/bills/table/${tableId}/open`),
  generate: (tableIds) => api.post('/api/bills', { tableIds }),
  split: (billId, body) => api.post(`/api/bills/${billId}/split`, body),
  pay: (billId, body) => api.post(`/api/bills/${billId}/payments`, body),
};

export const staffApi = {
  list: () => api.get('/api/staff'),
  create: (staff) => api.post('/api/staff', staff),
  update: (staffId, changes) => api.put(`/api/staff/${staffId}`, changes),
};

export const reportsApi = {
  sales: (params) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/reports/sales${qs ? `?${qs}` : ''}`);
  },
};

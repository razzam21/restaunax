import axios from 'axios';

// Make sure we include /api in the URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const orderService = {
  // Get all orders with optional status filter
  getOrders: async (status) => {
    try {
      console.log(`Making API request to: ${API_URL}/orders with params:`, status ? { status } : {});
      const params = status ? { status } : {};
      const response = await api.get('/orders', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  // Get a single order by ID
  getOrderById: async (id) => {
    try {
      console.log(`Making API request to: ${API_URL}/orders/${id}`);
      const response = await api.get(`/orders/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching order ${id}:`, error);
      throw error;
    }
  },

  // Create a new order
  createOrder: async (orderData) => {
    try {
      console.log(`Making API request to: ${API_URL}/orders with data:`, orderData);
      const response = await api.post('/orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Update order status
  updateOrderStatus: async (id, status) => {
    try {
      console.log(`Making API request to: ${API_URL}/orders/${id} with status:`, status);
      const response = await api.patch(`/orders/${id}`, { status });
      return response.data;
    } catch (error) {
      console.error(`Error updating order ${id} status:`, error);
      throw error;
    }
  },
};

export const menuService = {
  // Get all menu items with optional category filter
  getMenuItems: async (category) => {
    try {
      const params = category ? { category } : {};
      const response = await api.get('/menu-items', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching menu items:', error);
      throw error;
    }
  },

  // Get a single menu item by ID
  getMenuItemById: async (id) => {
    try {
      const response = await api.get(`/menu-items/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching menu item ${id}:`, error);
      throw error;
    }
  }
};

// Add an interceptor for debugging
api.interceptors.request.use(request => {
  console.log('API Request:', request);
  return request;
});

api.interceptors.response.use(
  response => {
    console.log('API Response:', response);
    return response;
  },
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api;
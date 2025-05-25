import axios from 'axios';
import { shouldAttemptRefresh, clearAuthData } from '../utils/tokenUtils';

// Get API URL from runtime config (loaded by /config.js) or fallback to environment/default
const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.API_URL) {
    return window.CONFIG.API_URL;
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:8081/api';
};

const API_URL = getApiUrl();

console.log('Using API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Allow cookies to be sent with requests
});

// Add interceptor to attach token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add interceptor to handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh logic if we're trying to access auth endpoints
    const isAuthRequest = originalRequest.url.includes('/auth/');
    
    // Only refresh token if:
    // 1. It's a 401 error
    // 2. Not already retrying
    // 3. Not an auth endpoint (prevent infinite loops)
    // 4. We have an accessToken (we're supposed to be logged in)
    // 5. We're not refreshing too frequently
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !isAuthRequest && 
      localStorage.getItem('accessToken') &&
      shouldAttemptRefresh()
    ) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const response = await api.post('/auth/refresh-token');
        
        // Check if we got a valid response with accessToken
        if (!response.data?.accessToken) {
          throw new Error('Invalid refresh token response');
        }
        
        const { accessToken } = response.data;

        // Update token in localStorage
        localStorage.setItem('accessToken', accessToken);

        // Update header and retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh failed, clean up and redirect to login
        // But only if we're not already on the login page
        clearAuthData();
        
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const orderService = {
  // Get orders with pagination and optional status filter
  getOrders: async (queryString) => {
    try {
      const url = queryString ? `/orders?${queryString}` : '/orders';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  // Get a single order by ID
  getOrderById: async (id) => {
    try {
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

// Restaurant service
export const restaurantService = {
  // Get restaurant by ID
  getRestaurantById: async (id) => {
    try {
      const response = await api.get(`/restaurants/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching restaurant ${id}:`, error);
      throw error;
    }
  },

  // Get restaurant theme
  getRestaurantTheme: async (id) => {
    try {
      const response = await api.get(`/restaurants/${id}/theme`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching restaurant theme ${id}:`, error);
      throw error;
    }
  },
  
  // Get available themes
  getAvailableThemes: async () => {
    try {
      const response = await api.get('/restaurants/themes');
      return response.data;
    } catch (error) {
      console.error('Error fetching available themes:', error);
      throw error;
    }
  },
  
  // Update restaurant settings
  updateRestaurantSettings: async (id, data) => {
    try {
      console.log(`Updating restaurant settings for ${id}`, data);
      const response = await api.patch(`/restaurants/${id}`, data);
      console.log('Restaurant update response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating restaurant ${id}:`, error);
      // Create a more user-friendly error response
      return {
        success: false,
        error: error.response?.data?.error || 'An error occurred while updating restaurant settings'
      };
    }
  }
};

// Add an interceptor for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  // Lightweight logging that doesn't spam the console
  api.interceptors.request.use(request => {
    // Skip logging refresh token requests to avoid console spam
    if (!request.url.includes('/auth/refresh-token')) {
      console.log(`API Request: ${request.method} ${request.url}`);
    }
    return request;
  });

  api.interceptors.response.use(
    response => {
      // Skip logging refresh token responses to avoid console spam
      if (!response.config.url.includes('/auth/refresh-token')) {
        console.log(`API Response: ${response.status} ${response.config.method} ${response.config.url}`);
      }
      return response;
    },
    error => {
      // Log all errors except refresh token errors (to avoid spam)
      if (!error.config?.url?.includes('/auth/refresh-token')) {
        console.error(`API Error: ${error.response?.status || 'Unknown'} ${error.config?.method || ''} ${error.config?.url || ''}`);
      }
      return Promise.reject(error);
    }
  );
}

// Auth service
export const authService = {
  // Login with username and password
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Register a new user
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  // Refresh access token
  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh-token');
      return response.data;
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  },

  // Logout user
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
};

export default api;
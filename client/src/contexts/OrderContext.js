import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { orderService } from '../services/api';

const OrderContext = createContext();

export const useOrders = () => useContext(OrderContext);

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });

  // Fetch orders with pagination
  const fetchOrders = useCallback(async (status, page = 1, limit = 20) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching orders with status:', status || 'all', 'page:', page);
      
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      const data = await orderService.getOrders(params.toString());
      console.log('Orders fetched:', data);
      
      setOrders(data.orders || []);
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false
      });
    } catch (err) {
      console.error('Error in fetchOrders:', err);
      setError(err.response?.data?.error || 'Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a single order by ID
  const getOrderById = useCallback(async (id) => {
    try {
      console.log('Fetching order by ID:', id);
      const data = await orderService.getOrderById(id);
      console.log('Order fetched:', data);
      return data;
    } catch (err) {
      console.error('Error in getOrderById:', err);
      setError(err.response?.data?.error || 'Failed to fetch order');
      return null;
    }
  }, []);

  // Create a new order
  const createOrder = useCallback(async (orderData) => {
    try {
      console.log('Creating order with data:', orderData);
      const data = await orderService.createOrder(orderData);
      console.log('Order created:', data);
      setOrders((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error in createOrder:', err);
      setError(err.response?.data?.error || 'Failed to create order');
      throw err;
    }
  }, []);

  // Update order status
  const updateOrderStatus = useCallback(async (id, status) => {
    try {
      console.log('Updating order status:', { id, status });
      const updatedOrder = await orderService.updateOrderStatus(id, status);
      console.log('Order updated:', updatedOrder);
      setOrders((prev) =>
        prev.map((order) => (order.id === id ? updatedOrder : order))
      );
      return updatedOrder;
    } catch (err) {
      console.error('Error in updateOrderStatus:', err);
      setError(err.response?.data?.error || 'Failed to update order status');
      throw err;
    }
  }, []);

  // Initial fetch only
  useEffect(() => {
    console.log('OrderContext mounted, fetching initial orders');
    fetchOrders().catch(err => {
      console.error('Initial fetch error:', err);
    });
    
    // No polling - relying on user actions and WebSocket updates instead
    
    return () => {
      console.log('OrderContext unmounting');
    };
  }, [fetchOrders]);

  const contextValue = {
    orders,
    loading,
    error,
    pagination,
    fetchOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
  };

  console.log('OrderContext current state:', { 
    ordersCount: orders.length, 
    loading, 
    hasError: !!error 
  });

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
};
import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { orderService } from '../services/api';
import { useAuth } from './AuthContext';
import webSocketService from '../services/websocket';

const OrderContext = createContext();

export const useOrders = () => useContext(OrderContext);

export const OrderProvider = ({ children }) => {
  const { accessToken, isAuthenticated, user } = useAuth();
  
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
  
  // WebSocket state
  const [isConnected, setIsConnected] = useState(false);


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

  // Handle WebSocket message events for orders
  const handleWebSocketMessage = useCallback((data) => {
    console.log('OrderContext received WebSocket message:', data.type);
    
    switch (data.type) {
      case 'orders_data':
        console.log('Received initial orders data via WebSocket');
        setOrders(data.data.orders || []);
        setPagination(data.data.pagination || {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false
        });
        break;
      
      case 'orders_list_update':
        console.log('Received order list update via WebSocket');
        setOrders(data.data.orders || []);
        setPagination(prev => data.data.pagination || prev);
        break;
      
      case 'new_order':
      case 'order_status_change':
        console.log('Received order change via WebSocket, refreshing list');
        // Trigger a refresh of the orders
        fetchOrders().catch(err => console.error('Refresh error:', err));
        break;
      
      default:
        // Ignore other message types (they're handled by other contexts)
        break;
    }
  }, [fetchOrders]);

  // Handle WebSocket connection state changes
  const handleConnectionStateChange = useCallback((state) => {
    setIsConnected(state.connected);
  }, []);

  // Initialize WebSocket and fetch orders when authenticated  
  useEffect(() => {
    console.log('OrderContext mounted, checking authentication');
    
    if (!isAuthenticated) {
      console.log('OrderContext: Not authenticated, skipping initialization');
      return;
    }

    console.log('OrderContext: User authenticated, role:', user?.role, 'setting up WebSocket and fetching orders');
    
    // Always fetch orders on mount
    fetchOrders().catch(err => {
      console.error('Initial fetch error:', err);
    });

    // Connect to WebSocket service if not already connected
    webSocketService.connect(accessToken, isAuthenticated, user?.role);
    
    // Subscribe to WebSocket events
    const messageUnsubscribe = webSocketService.subscribe('message', handleWebSocketMessage);
    const connectionUnsubscribe = webSocketService.subscribe('connectionStateChange', handleConnectionStateChange);
    
    return () => {
      console.log('OrderContext unmounting');
      messageUnsubscribe();
      connectionUnsubscribe();
      // Don't disconnect the WebSocket service here as other contexts might be using it
    };
  }, [isAuthenticated, accessToken, user?.role, fetchOrders, handleWebSocketMessage, handleConnectionStateChange]);

  const contextValue = {
    orders,
    loading,
    error,
    pagination,
    isConnected,
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
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { orderService } from '../services/api';

const OrderContext = createContext();

export const useOrders = () => useContext(OrderContext);

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all orders, optionally filtered by status
  const fetchOrders = useCallback(async (status) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching orders with status:', status || 'all');
      const data = await orderService.getOrders(status);
      console.log('Orders fetched:', data);
      setOrders(data || []);
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

  // Initial fetch
  useEffect(() => {
    console.log('OrderContext mounted, fetching initial orders');
    fetchOrders().catch(err => {
      console.error('Initial fetch error:', err);
    });

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      console.log('Polling for order updates');
      fetchOrders().catch(err => {
        console.error('Polling fetch error:', err);
      });
    }, 30000);

    return () => {
      console.log('OrderContext unmounting, clearing interval');
      clearInterval(interval);
    };
  }, [fetchOrders]);

  const contextValue = {
    orders,
    loading,
    error,
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
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import webSocketService from '../services/websocket';

// Create context
export const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
  const { accessToken, isAuthenticated, user } = useAuth();
  
  // Dashboard state
  const [metrics, setMetrics] = useState({
    dailyRevenue: { today: 0, previous: 0, percentChange: 0 },
    orderMetrics: { totalToday: 0, averageValue: 0, averagePrepTime: 0 },
    hourlyData: [],
    itemPerformance: [],
    operationalStatus: { 
      kitchenLoad: 0, 
      pendingOrders: 0, 
      staffProductivity: 0, 
      peakHours: [] 
    }
  });
  
  const [loading, setLoading] = useState(false); // Initialize to false to prevent immediate loading state
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Early return check - skip all dashboard operations if not authenticated or wrong role
  const hasAccess = isAuthenticated && ['manager', 'owner'].includes(user?.role);

  // Load dashboard metrics from API
  const loadDashboardMetrics = useCallback(async () => {
    if (!hasAccess) {
      console.log('Dashboard metrics not loaded: user is not authenticated or has insufficient permissions');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading dashboard metrics from API');
      const response = await api.get('/reports/dashboard/metrics', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.data.success) {
        setMetrics(response.data.data);
        console.log('Dashboard metrics loaded successfully');
      } else {
        setError('Failed to load dashboard metrics');
        console.error('Failed to load dashboard metrics: API success=false');
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
      console.error('Error loading dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [hasAccess, accessToken]);

  // Handle WebSocket message events
  const handleWebSocketMessage = useCallback((data) => {
    console.log('Dashboard received WebSocket message:', data.type);
    
    switch (data.type) {
      case 'dashboard_data':
        console.log('Received dashboard data via WebSocket');
        setMetrics(data.data);
        break;
      
      case 'new_order':
        console.log('Received new order notification via WebSocket');
        // Update dashboard with new order info
        setMetrics(prevMetrics => ({
          ...prevMetrics,
          orderMetrics: {
            ...prevMetrics.orderMetrics,
            totalToday: prevMetrics.orderMetrics.totalToday + 1
          },
          dailyRevenue: {
            ...prevMetrics.dailyRevenue,
            today: prevMetrics.dailyRevenue.today + data.data.total
          },
          operationalStatus: {
            ...prevMetrics.operationalStatus,
            pendingOrders: prevMetrics.operationalStatus.pendingOrders + 1
          }
        }));
        break;
      
      case 'order_status_change':
        console.log('Received order status change via WebSocket');
        // Update dashboard with status change
        if (data.data.status === 'pending') {
          setMetrics(prevMetrics => ({
            ...prevMetrics,
            operationalStatus: {
              ...prevMetrics.operationalStatus,
              pendingOrders: prevMetrics.operationalStatus.pendingOrders + 1
            }
          }));
        } else if (data.data.status === 'preparing') {
          setMetrics(prevMetrics => ({
            ...prevMetrics,
            operationalStatus: {
              ...prevMetrics.operationalStatus,
              pendingOrders: prevMetrics.operationalStatus.pendingOrders - 1,
              kitchenLoad: Math.min(100, prevMetrics.operationalStatus.kitchenLoad + 5)
            }
          }));
        }
        break;
      
      case 'revenue_update':
        console.log('Received revenue update via WebSocket');
        // Update dashboard with revenue data
        setMetrics(prevMetrics => ({
          ...prevMetrics,
          dailyRevenue: data.data.dailyRevenue || prevMetrics.dailyRevenue,
          orderMetrics: data.data.orderMetrics || prevMetrics.orderMetrics
        }));
        break;
      
      default:
        console.log('Dashboard received unknown message type:', data.type);
        break;
    }
  }, []);

  // Handle WebSocket connection state changes
  const handleConnectionStateChange = useCallback((state) => {
    setIsConnected(state.connected);
  }, []);

  // Initialize dashboard and WebSocket connection only once when authenticated
  useEffect(() => {
    console.log('DashboardContext main useEffect running, hasAccess:', hasAccess);
    
    // Skip everything if not authenticated or not the right role
    if (!hasAccess) {
      console.log('Dashboard initialization skipped - user has no access');
      return;
    }
    
    console.log('Initializing dashboard for authenticated user with proper role');
    
    // Initial data load
    loadDashboardMetrics();
    
    // Connect to WebSocket service
    webSocketService.connect(accessToken, isAuthenticated, user?.role);
    
    // Subscribe to WebSocket events
    const messageUnsubscribe = webSocketService.subscribe('message', handleWebSocketMessage);
    const connectionUnsubscribe = webSocketService.subscribe('connectionStateChange', handleConnectionStateChange);

    // Cleanup on unmount or when access changes
    return () => {
      console.log('DashboardContext cleanup');
      messageUnsubscribe();
      connectionUnsubscribe();
      // Don't disconnect the WebSocket service here as other contexts might be using it
    };
  }, [hasAccess, accessToken, isAuthenticated, user?.role, loadDashboardMetrics, handleWebSocketMessage, handleConnectionStateChange]);

  // Completely removed all polling - this useEffect is no longer needed

  // Provide context value
  const contextValue = {
    metrics,
    loading,
    error,
    isConnected,
    refreshDashboard: loadDashboardMetrics
  };

  // Customize the context value based on access
  const finalContextValue = hasAccess 
    ? contextValue 
    : { ...contextValue, loading: false, error: null };

  // Still provide the context even if not authenticated,
  // but with empty/default values to prevent errors in components that use it
  return (
    <DashboardContext.Provider value={finalContextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

// Custom hook for using the dashboard context
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
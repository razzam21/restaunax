import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

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
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsConnection, setWsConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Load dashboard metrics from API
  const loadDashboardMetrics = useCallback(async () => {
    if (!isAuthenticated || !['manager', 'owner'].includes(user?.role)) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/reports/dashboard/metrics', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.data.success) {
        setMetrics(response.data.data);
      } else {
        setError('Failed to load dashboard metrics');
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
      console.error('Error loading dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, accessToken, user?.role]);

  // Setup WebSocket connection for real-time updates
  const setupWebSocket = useCallback(() => {
    console.log('Setting up WebSocket connection. Auth status:', isAuthenticated, 'Role:', user?.role);
    
    if (!isAuthenticated || !accessToken || !['manager', 'owner'].includes(user?.role)) {
      console.log('Not setting up WebSocket - authentication or role requirements not met');
      return;
    }

    // Close existing connection if any
    if (wsConnection) {
      console.log('Closing existing WebSocket connection before creating a new one');
      wsConnection.close();
    }

    // Create new WebSocket connection
    // Use the correct WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const wsUrl = `${protocol}://${host}/ws/dashboard?token=${accessToken}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data.type);
        
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
            console.log('Received unknown message type:', data.type);
            break;
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
      setWsConnection(null);
      
      // Only try to reconnect if still authenticated
      // Use a longer interval (10 seconds) to prevent excessive reconnection attempts
      setTimeout(() => {
        if (isAuthenticated && ['manager', 'owner'].includes(user?.role)) {
          console.log('Attempting to reconnect WebSocket...');
          setupWebSocket();
        }
      }, 10000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      // Fetch data via API as fallback when WebSocket fails
      loadDashboardMetrics();
    };

    setWsConnection(ws);

    // Cleanup function
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [isAuthenticated, accessToken, wsConnection, user?.role]);

  // Initialize dashboard and WebSocket connection only once when authenticated
  useEffect(() => {
    if (isAuthenticated && ['manager', 'owner'].includes(user?.role) && !wsConnection) {
      // Initial data load
      loadDashboardMetrics();
      
      // Set up WebSocket for real-time updates
      setupWebSocket();
    }

    // Cleanup on unmount
    return () => {
      if (wsConnection) {
        console.log('Closing WebSocket connection on cleanup');
        wsConnection.close();
      }
    };
  }, [isAuthenticated, user?.role, wsConnection, loadDashboardMetrics, setupWebSocket]);

  // Completely removed all polling - this useEffect is no longer needed

  // Provide context value
  const contextValue = {
    metrics,
    loading,
    error,
    isConnected,
    refreshDashboard: loadDashboardMetrics
  };

  return (
    <DashboardContext.Provider value={contextValue}>
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
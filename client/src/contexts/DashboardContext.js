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
  
  const [loading, setLoading] = useState(false); // Initialize to false to prevent immediate loading state
  const [error, setError] = useState(null);
  const [wsConnection, setWsConnection] = useState(null);
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

  // Setup WebSocket connection for real-time updates
  const setupWebSocket = useCallback(() => {
    console.log('Setup WebSocket called. Auth status:', isAuthenticated, 'Role:', user?.role);
    
    if (!hasAccess || !accessToken) {
      console.log('Not setting up WebSocket - authentication or role requirements not met');
      return;
    }

    // Close existing connection if any
    if (wsConnection) {
      console.log('Closing existing WebSocket connection before creating a new one');
      wsConnection.close();
    }

    // Create new WebSocket connection
    // Use the correct WebSocket URL - connect to backend server, not frontend
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const backendHost = window.location.hostname + ':8081';
    const wsUrl = `${protocol}://${backendHost}/ws/dashboard?token=${accessToken}`;
    
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
      
      // Only try to reconnect if still authenticated and has proper role
      // Use a longer interval (10 seconds) to prevent excessive reconnection attempts
      setTimeout(() => {
        if (hasAccess) {
          console.log('Attempting to reconnect WebSocket...');
          setupWebSocket();
        } else {
          console.log('Not reconnecting WebSocket - user no longer has access');
        }
      }, 10000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      // Disabled API fallback to prevent excessive polling
      // Only load initial data, don't keep polling on WebSocket failures
      console.log('WebSocket failed - not falling back to API polling');
    };

    setWsConnection(ws);

    // Cleanup function
    return () => {
      if (ws) {
        ws.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess, accessToken, wsConnection]);

  // Initialize dashboard and WebSocket connection only once when authenticated
  useEffect(() => {
    console.log('DashboardContext main useEffect running, hasAccess:', hasAccess);
    
    // Skip everything if not authenticated or not the right role
    if (!hasAccess) {
      console.log('Dashboard initialization skipped - user has no access');
      
      // Clean up any existing connection
      if (wsConnection) {
        console.log('Closing existing WebSocket connection due to lost access');
        wsConnection.close();
        setWsConnection(null);
      }
      
      return;
    }
    
    // Only initialize if we have access but no active connection
    if (hasAccess && !wsConnection) {
      console.log('Initializing dashboard for authenticated user with proper role');
      
      // Initial data load
      loadDashboardMetrics();
      
      // Set up WebSocket for real-time updates
      setupWebSocket();
    }

    // Cleanup on unmount or when access changes
    return () => {
      if (wsConnection) {
        console.log('Closing WebSocket connection on cleanup');
        wsConnection.close();
        setWsConnection(null);
      }
    };
  }, [hasAccess, wsConnection, loadDashboardMetrics, setupWebSocket]);

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
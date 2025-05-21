import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

// Create context
export const ReportContext = createContext();

export const ReportProvider = ({ children }) => {
  const { accessToken, isAuthenticated, user } = useAuth();
  
  // Reports state
  const [ordersReport, setOrdersReport] = useState({
    orders: [],
    totalOrders: 0,
    totalRevenue: 0,
    ordersByStatus: {},
    ordersByType: {},
    dateRange: { startDate: null, endDate: null }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load orders report from API
  const loadOrdersReport = useCallback(async (filters = {}) => {
    if (!isAuthenticated || !['manager', 'owner'].includes(user?.role)) {
      setError('Only managers and owners can access reports');
      return;
    }

    try {
      setLoading(true);
      
      // Build query string
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.orderType) queryParams.append('orderType', filters.orderType);
      
      const url = `/reports/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await api.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.data.success) {
        setOrdersReport(response.data.data);
      } else {
        setError('Failed to load orders report');
      }
    } catch (err) {
      setError(err.message || 'Failed to load orders report');
      console.error('Error loading orders report:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, accessToken, user?.role]);

  // Generate report download URL
  const getReportDownloadUrl = useCallback((format = 'csv', filters = {}) => {
    if (!isAuthenticated || !['manager', 'owner'].includes(user?.role)) {
      return null;
    }

    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.append('format', format);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.orderType) queryParams.append('orderType', filters.orderType);
    
    // Get base API URL from the api service
    const baseURL = api.defaults.baseURL || '';
    
    return `${baseURL}/reports/orders/download?${queryParams.toString()}`;
  }, [isAuthenticated, user?.role]);

  // Download report
  const downloadReport = useCallback(async (format = 'csv', filters = {}) => {
    if (!isAuthenticated || !['manager', 'owner'].includes(user?.role)) {
      setError('Only managers and owners can download reports');
      return;
    }

    try {
      setLoading(true);
      
      // Build query string
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.orderType) queryParams.append('orderType', filters.orderType);
      
      const url = `/reports/orders/download?${queryParams.toString()}`;
      
      // Use fetch with blob response type to handle file download
      const response = await fetch(`${api.defaults.baseURL}${url}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to download report');
      }
      
      // Get filename from content-disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'report';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // Create download link
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
    } catch (err) {
      setError(err.message || 'Failed to download report');
      console.error('Error downloading report:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, accessToken, user?.role]);

  // Provide context value
  const contextValue = {
    ordersReport,
    loading,
    error,
    loadOrdersReport,
    getReportDownloadUrl,
    downloadReport,
    clearError: () => setError(null)
  };

  return (
    <ReportContext.Provider value={contextValue}>
      {children}
    </ReportContext.Provider>
  );
};

// Custom hook for using the report context
export const useReports = () => {
  const context = useContext(ReportContext);
  if (context === undefined) {
    throw new Error('useReports must be used within a ReportProvider');
  }
  return context;
};
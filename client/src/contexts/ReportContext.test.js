import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { ReportProvider, useReports } from './ReportContext';
import { AuthContext } from './AuthContext';
import api from '../services/api';

// Mock the API service
jest.mock('../services/api', () => ({
  get: jest.fn(),
  defaults: {
    baseURL: 'http://localhost:3000/api'
  }
}));

// Mock fetch for download functionality
global.fetch = jest.fn();

// Mock the AuthContext
const mockAuthContext = {
  token: 'mock-token',
  isAuthenticated: true,
  user: { id: 'user-1', role: 'manager', restaurantId: 'rest-1' }
};

// Test component that uses the reports context
const TestComponent = () => {
  const { 
    ordersReport, 
    loading, 
    error, 
    loadOrdersReport, 
    getReportDownloadUrl, 
    downloadReport 
  } = useReports();
  
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="total-orders">{ordersReport.totalOrders}</div>
      <div data-testid="total-revenue">{ordersReport.totalRevenue}</div>
      <div data-testid="download-url">{getReportDownloadUrl('csv')}</div>
      <button 
        data-testid="load-btn" 
        onClick={() => loadOrdersReport({ startDate: '2025-05-01', endDate: '2025-05-21' })}
      >
        Load Report
      </button>
      <button 
        data-testid="download-btn" 
        onClick={() => downloadReport('pdf')}
      >
        Download Report
      </button>
    </div>
  );
};

// Mock response data
const mockReportData = {
  success: true,
  data: {
    orders: [
      {
        id: 'order-1',
        orderNumber: 'R1-001',
        customerName: 'John Doe',
        orderType: 'delivery',
        status: 'delivered',
        total: 42.50,
        createdAt: '2025-05-20T12:00:00Z'
      }
    ],
    totalOrders: 1,
    totalRevenue: 42.50,
    ordersByStatus: { delivered: 1 },
    ordersByType: { delivery: 1 },
    dateRange: {
      startDate: '2025-05-01T00:00:00Z',
      endDate: '2025-05-21T00:00:00Z'
    }
  }
};

// Mock blob and URL methods
const mockBlob = {};
global.Blob = jest.fn(() => mockBlob);
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document methods for download
document.createElement = jest.fn(() => ({
  href: '',
  download: '',
  click: jest.fn(),
}));
document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();

describe('ReportContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API response
    api.get.mockResolvedValue(mockReportData);
    
    // Mock fetch response for download
    global.fetch.mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(mockBlob),
      headers: {
        get: jest.fn().mockReturnValue('attachment; filename="report.csv"')
      }
    });
  });
  
  test('should load report data', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ReportProvider>
          <TestComponent />
        </ReportProvider>
      </AuthContext.Provider>
    );
    
    // Click load button
    act(() => {
      screen.getByTestId('load-btn').click();
    });
    
    // Should be loading
    expect(screen.getByTestId('loading').textContent).toBe('true');
    
    // After data loads
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('total-orders').textContent).toBe('1');
      expect(screen.getByTestId('total-revenue').textContent).toBe('42.5');
    });
    
    // Should call API with correct params
    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('/reports/orders'), 
      { headers: { Authorization: 'Bearer mock-token' } }
    );
    
    // URL should contain date params
    const apiCallUrl = api.get.mock.calls[0][0];
    expect(apiCallUrl).toContain('startDate=2025-05-01');
    expect(apiCallUrl).toContain('endDate=2025-05-21');
  });
  
  test('should generate download URL', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ReportProvider>
          <TestComponent />
        </ReportProvider>
      </AuthContext.Provider>
    );
    
    // Check download URL
    const downloadUrl = screen.getByTestId('download-url').textContent;
    expect(downloadUrl).toBe('http://localhost:3000/api/reports/orders/download?format=csv');
  });
  
  test('should handle report download', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ReportProvider>
          <TestComponent />
        </ReportProvider>
      </AuthContext.Provider>
    );
    
    // Click download button
    act(() => {
      screen.getByTestId('download-btn').click();
    });
    
    // Should be loading
    expect(screen.getByTestId('loading').textContent).toBe('true');
    
    // After download completes
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    
    // Should call fetch with correct URL
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/reports/orders/download?format=pdf',
      { headers: { Authorization: 'Bearer mock-token' } }
    );
    
    // Should create download link
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(document.body.appendChild).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalled();
  });
  
  test('should handle API errors', async () => {
    // Mock API error
    api.get.mockRejectedValue(new Error('API Error'));
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ReportProvider>
          <TestComponent />
        </ReportProvider>
      </AuthContext.Provider>
    );
    
    // Click load button
    act(() => {
      screen.getByTestId('load-btn').click();
    });
    
    // After error
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('error').textContent).toBe('API Error');
    });
  });
  
  test('should handle download errors', async () => {
    // Mock fetch error
    global.fetch.mockRejectedValue(new Error('Download Error'));
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ReportProvider>
          <TestComponent />
        </ReportProvider>
      </AuthContext.Provider>
    );
    
    // Click download button
    act(() => {
      screen.getByTestId('download-btn').click();
    });
    
    // After error
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('error').textContent).toBe('Download Error');
    });
  });
  
  test('should not allow wait staff to access reports', async () => {
    // Mock user as wait staff
    const waitStaffContext = {
      ...mockAuthContext,
      user: { ...mockAuthContext.user, role: 'wait_staff' }
    };
    
    render(
      <AuthContext.Provider value={waitStaffContext}>
        <ReportProvider>
          <TestComponent />
        </ReportProvider>
      </AuthContext.Provider>
    );
    
    // Click load button
    act(() => {
      screen.getByTestId('load-btn').click();
    });
    
    // Should show error
    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Only managers and owners can access reports');
    });
    
    // Should not call API
    expect(api.get).not.toHaveBeenCalled();
  });
});
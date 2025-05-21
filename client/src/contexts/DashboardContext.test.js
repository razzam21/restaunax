import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { DashboardProvider, useDashboard } from './DashboardContext';
import { AuthContext } from './AuthContext';
import api from '../services/api';

// Mock the API service
jest.mock('../services/api', () => ({
  get: jest.fn()
}));

// Mock the AuthContext
const mockAuthContext = {
  token: 'mock-token',
  isAuthenticated: true,
  user: { id: 'user-1', role: 'manager', restaurantId: 'rest-1' }
};

// Test component that uses the dashboard context
const TestComponent = () => {
  const { metrics, loading, error, isConnected, refreshDashboard } = useDashboard();
  
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="connected">{isConnected.toString()}</div>
      <div data-testid="total-orders">{metrics.orderMetrics.totalToday}</div>
      <div data-testid="total-revenue">{metrics.dailyRevenue.today}</div>
      <button data-testid="refresh-btn" onClick={refreshDashboard}>Refresh</button>
    </div>
  );
};

// Mock WebSocket implementation
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    
    // Simulate connection after delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 0);
  }
  
  send(data) {
    // Mock send
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
}

// Mock response data
const mockDashboardData = {
  success: true,
  data: {
    dailyRevenue: {
      today: 1250.75,
      previous: 1124.50,
      percentChange: 11.2
    },
    orderMetrics: {
      totalToday: 42,
      averageValue: 29.78,
      averagePrepTime: 18.5
    },
    hourlyData: [
      { hour: '10:00', revenue: 325.50, orderCount: 12 }
    ],
    itemPerformance: [
      { itemName: 'Pizza', quantity: 28, revenue: 447.72, averagePrepTime: 12.5 }
    ],
    operationalStatus: {
      kitchenLoad: 75,
      pendingOrders: 8,
      staffProductivity: 5.2,
      peakHours: ['12:00', '19:00']
    }
  }
};

describe('DashboardContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the WebSocket
    global.WebSocket = MockWebSocket;
    
    // Mock API response
    api.get.mockResolvedValue(mockDashboardData);
  });
  
  afterEach(() => {
    // Restore original WebSocket
    delete global.WebSocket;
  });
  
  test('should load dashboard metrics on mount', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <DashboardProvider>
          <TestComponent />
        </DashboardProvider>
      </AuthContext.Provider>
    );
    
    // Initially loading
    expect(screen.getByTestId('loading').textContent).toBe('true');
    
    // After data loads
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('total-orders').textContent).toBe('42');
      expect(screen.getByTestId('total-revenue').textContent).toBe('1250.75');
    });
    
    // Should call API
    expect(api.get).toHaveBeenCalledWith('/dashboard/metrics', {
      headers: { Authorization: 'Bearer mock-token' }
    });
  });
  
  test('should refresh dashboard on button click', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <DashboardProvider>
          <TestComponent />
        </DashboardProvider>
      </AuthContext.Provider>
    );
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    
    // Reset the mock
    api.get.mockClear();
    
    // Trigger refresh
    act(() => {
      screen.getByTestId('refresh-btn').click();
    });
    
    // Should be loading again
    expect(screen.getByTestId('loading').textContent).toBe('true');
    
    // After refresh completes
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    
    // Should call API again
    expect(api.get).toHaveBeenCalledTimes(1);
  });
  
  test('should handle API errors', async () => {
    // Mock API error
    api.get.mockRejectedValue(new Error('API Error'));
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <DashboardProvider>
          <TestComponent />
        </DashboardProvider>
      </AuthContext.Provider>
    );
    
    // After error
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('error').textContent).toBe('API Error');
    });
  });
  
  test('should not fetch data for wait staff', async () => {
    // Mock user as wait staff
    const waitStaffContext = {
      ...mockAuthContext,
      user: { ...mockAuthContext.user, role: 'wait_staff' }
    };
    
    render(
      <AuthContext.Provider value={waitStaffContext}>
        <DashboardProvider>
          <TestComponent />
        </DashboardProvider>
      </AuthContext.Provider>
    );
    
    // Should not call API
    await waitFor(() => {
      expect(api.get).not.toHaveBeenCalled();
    });
  });
});
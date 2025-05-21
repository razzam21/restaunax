import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPage from './DashboardPage';
import { DashboardContext } from '../contexts/DashboardContext';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

// Mock the contexts
jest.mock('../contexts/DashboardContext', () => ({
  ...jest.requireActual('../contexts/DashboardContext'),
  useDashboard: jest.fn()
}));

jest.mock('../contexts/AuthContext', () => ({
  ...jest.requireActual('../contexts/AuthContext'),
  useAuth: jest.fn()
}));

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="recharts-responsive-container">{children}</div>
    ),
    BarChart: () => <div data-testid="recharts-bar-chart" />,
    PieChart: () => <div data-testid="recharts-pie-chart" />
  };
});

// Create a theme for testing
const theme = createTheme();

describe('DashboardPage', () => {
  beforeEach(() => {
    // Mock auth context
    jest.requireMock('../contexts/AuthContext').useAuth.mockReturnValue({
      user: { role: 'manager' }
    });
  });
  
  test('renders loading state', () => {
    // Mock dashboard context with loading state
    jest.requireMock('../contexts/DashboardContext').useDashboard.mockReturnValue({
      metrics: {
        dailyRevenue: { today: 0, previous: 0, percentChange: 0 },
        orderMetrics: { totalToday: 0, averageValue: 0, averagePrepTime: 0 },
        hourlyData: [],
        itemPerformance: [],
        operationalStatus: { kitchenLoad: 0, pendingOrders: 0, staffProductivity: 0, peakHours: [] }
      },
      loading: true,
      error: null,
      isConnected: false,
      refreshDashboard: jest.fn()
    });
    
    render(
      <ThemeProvider theme={theme}>
        <DashboardPage />
      </ThemeProvider>
    );
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
  
  test('renders dashboard content', () => {
    // Mock dashboard context with data
    jest.requireMock('../contexts/DashboardContext').useDashboard.mockReturnValue({
      metrics: {
        dailyRevenue: { today: 1250.75, previous: 1124.50, percentChange: 11.2 },
        orderMetrics: { totalToday: 42, averageValue: 29.78, averagePrepTime: 18.5 },
        hourlyData: [{ hour: '10:00', revenue: 325.50, orderCount: 12 }],
        itemPerformance: [{ itemName: 'Pizza', quantity: 28, revenue: 447.72, averagePrepTime: 12.5 }],
        operationalStatus: { kitchenLoad: 75, pendingOrders: 8, staffProductivity: 5.2, peakHours: ['12:00', '19:00'] }
      },
      loading: false,
      error: null,
      isConnected: true,
      refreshDashboard: jest.fn()
    });
    
    render(
      <ThemeProvider theme={theme}>
        <DashboardPage />
      </ThemeProvider>
    );
    
    // Check main title
    expect(screen.getByText('Management Dashboard')).toBeInTheDocument();
    
    // Check KPI cards
    expect(screen.getByText('Today\'s Revenue')).toBeInTheDocument();
    expect(screen.getByText('$1250.75')).toBeInTheDocument();
    expect(screen.getByText('Orders Today')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Load')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Avg Prep Time')).toBeInTheDocument();
    expect(screen.getByText('18.5 min')).toBeInTheDocument();
    
    // Check charts
    expect(screen.getByText('Hourly Revenue & Order Volume')).toBeInTheDocument();
    expect(screen.getByText('Top Menu Items')).toBeInTheDocument();
    
    // Check operational insights
    expect(screen.getByText('Operational Insights')).toBeInTheDocument();
    expect(screen.getByText('Pending Orders')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Staff Productivity')).toBeInTheDocument();
    expect(screen.getByText('5.2 orders/hour')).toBeInTheDocument();
    expect(screen.getByText('Peak Hours')).toBeInTheDocument();
    expect(screen.getByText('12:00, 19:00')).toBeInTheDocument();
    
    // Check live status indicator
    expect(screen.getByText('Live Data')).toBeInTheDocument();
  });
  
  test('renders error state', () => {
    // Mock dashboard context with error
    jest.requireMock('../contexts/DashboardContext').useDashboard.mockReturnValue({
      metrics: {
        dailyRevenue: { today: 0, previous: 0, percentChange: 0 },
        orderMetrics: { totalToday: 0, averageValue: 0, averagePrepTime: 0 },
        hourlyData: [],
        itemPerformance: [],
        operationalStatus: { kitchenLoad: 0, pendingOrders: 0, staffProductivity: 0, peakHours: [] }
      },
      loading: false,
      error: 'Failed to load dashboard data',
      isConnected: false,
      refreshDashboard: jest.fn()
    });
    
    render(
      <ThemeProvider theme={theme}>
        <DashboardPage />
      </ThemeProvider>
    );
    
    expect(screen.getByText('Error loading dashboard data')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
  
  test('blocks access for wait staff', () => {
    // Mock auth context with wait_staff role
    jest.requireMock('../contexts/AuthContext').useAuth.mockReturnValue({
      user: { role: 'wait_staff' }
    });
    
    // Mock dashboard context
    jest.requireMock('../contexts/DashboardContext').useDashboard.mockReturnValue({
      metrics: {
        dailyRevenue: { today: 0, previous: 0, percentChange: 0 },
        orderMetrics: { totalToday: 0, averageValue: 0, averagePrepTime: 0 },
        hourlyData: [],
        itemPerformance: [],
        operationalStatus: { kitchenLoad: 0, pendingOrders: 0, staffProductivity: 0, peakHours: [] }
      },
      loading: false,
      error: null,
      isConnected: false,
      refreshDashboard: jest.fn()
    });
    
    render(
      <ThemeProvider theme={theme}>
        <DashboardPage />
      </ThemeProvider>
    );
    
    expect(screen.getByText('Only managers and owners can view the dashboard')).toBeInTheDocument();
  });
});
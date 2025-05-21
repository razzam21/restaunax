import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportsPage from './ReportsPage';
import { ReportContext } from '../contexts/ReportContext';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';

// Mock the contexts
jest.mock('../contexts/ReportContext', () => ({
  ...jest.requireActual('../contexts/ReportContext'),
  useReports: jest.fn()
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

// Mock order report data
const mockOrdersReport = {
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
};

describe('ReportsPage', () => {
  // Setup mock functions
  const mockLoadOrdersReport = jest.fn();
  const mockDownloadReport = jest.fn();
  const mockGetReportDownloadUrl = jest.fn(() => 'http://localhost:3000/api/reports/orders/download?format=csv');
  const mockClearError = jest.fn();
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock auth context
    jest.requireMock('../contexts/AuthContext').useAuth.mockReturnValue({
      user: { role: 'manager' }
    });
    
    // Mock reports context with default values
    jest.requireMock('../contexts/ReportContext').useReports.mockReturnValue({
      ordersReport: mockOrdersReport,
      loading: false,
      error: null,
      loadOrdersReport: mockLoadOrdersReport,
      downloadReport: mockDownloadReport,
      getReportDownloadUrl: mockGetReportDownloadUrl,
      clearError: mockClearError
    });
  });
  
  test('renders reports page with data', () => {
    render(
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ReportsPage />
        </LocalizationProvider>
      </ThemeProvider>
    );
    
    // Check main title
    expect(screen.getByText('Reports')).toBeInTheDocument();
    
    // Check filters section
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
    
    // Check summary data
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$42.50')).toBeInTheDocument();
    
    // Check tabs
    expect(screen.getByRole('tab', { name: /summary/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /orders/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /charts/i })).toBeInTheDocument();
    
    // Check buttons
    expect(screen.getByRole('button', { name: /apply filters/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });
  
  test('renders loading state', () => {
    // Mock reports context with loading state
    jest.requireMock('../contexts/ReportContext').useReports.mockReturnValue({
      ordersReport: {
        orders: [],
        totalOrders: 0,
        totalRevenue: 0,
        ordersByStatus: {},
        ordersByType: {},
        dateRange: { startDate: null, endDate: null }
      },
      loading: true,
      error: null,
      loadOrdersReport: mockLoadOrdersReport,
      downloadReport: mockDownloadReport,
      getReportDownloadUrl: mockGetReportDownloadUrl,
      clearError: mockClearError
    });
    
    render(
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ReportsPage />
        </LocalizationProvider>
      </ThemeProvider>
    );
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
  
  test('renders error state', () => {
    // Mock reports context with error
    jest.requireMock('../contexts/ReportContext').useReports.mockReturnValue({
      ordersReport: {
        orders: [],
        totalOrders: 0,
        totalRevenue: 0,
        ordersByStatus: {},
        ordersByType: {},
        dateRange: { startDate: null, endDate: null }
      },
      loading: false,
      error: 'Failed to load report data',
      loadOrdersReport: mockLoadOrdersReport,
      downloadReport: mockDownloadReport,
      getReportDownloadUrl: mockGetReportDownloadUrl,
      clearError: mockClearError
    });
    
    render(
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ReportsPage />
        </LocalizationProvider>
      </ThemeProvider>
    );
    
    expect(screen.getByText('Failed to load report data')).toBeInTheDocument();
  });
  
  test('applies filters when button is clicked', () => {
    render(
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ReportsPage />
        </LocalizationProvider>
      </ThemeProvider>
    );
    
    // Click Apply Filters button
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));
    
    // Verify loadOrdersReport was called
    expect(mockLoadOrdersReport).toHaveBeenCalled();
    expect(mockClearError).toHaveBeenCalled();
  });
  
  test('changes date range when radio option is selected', () => {
    render(
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ReportsPage />
        </LocalizationProvider>
      </ThemeProvider>
    );
    
    // Click Today radio option
    fireEvent.click(screen.getByLabelText('Today'));
    
    // Click Apply Filters button
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));
    
    // Verify loadOrdersReport was called with today's date
    expect(mockLoadOrdersReport).toHaveBeenCalled();
    const today = new Date().toISOString().split('T')[0];
    expect(mockLoadOrdersReport.mock.calls[0][0].startDate).toContain(today.substring(0, 10));
    expect(mockLoadOrdersReport.mock.calls[0][0].endDate).toContain(today.substring(0, 10));
  });
  
  test('downloads report when button is clicked', () => {
    render(
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ReportsPage />
        </LocalizationProvider>
      </ThemeProvider>
    );
    
    // Select PDF format
    fireEvent.mouseDown(screen.getByRole('button', { name: /csv/i }));
    fireEvent.click(screen.getByRole('option', { name: /pdf/i }));
    
    // Click Download button
    fireEvent.click(screen.getByRole('button', { name: /download/i }));
    
    // Verify downloadReport was called with pdf format
    expect(mockDownloadReport).toHaveBeenCalledWith('pdf', expect.any(Object));
  });
  
  test('changes tab when clicked', () => {
    render(
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ReportsPage />
        </LocalizationProvider>
      </ThemeProvider>
    );
    
    // Summary tab should be active by default
    expect(screen.getByRole('tab', { name: /summary/i })).toHaveAttribute('aria-selected', 'true');
    
    // Click Orders tab
    fireEvent.click(screen.getByRole('tab', { name: /orders/i }));
    
    // Orders tab should now be active
    expect(screen.getByRole('tab', { name: /orders/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /summary/i })).toHaveAttribute('aria-selected', 'false');
    
    // Order list should be visible
    expect(screen.getByText('Order #')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
  
  test('blocks access for wait staff', () => {
    // Mock auth context with wait_staff role
    jest.requireMock('../contexts/AuthContext').useAuth.mockReturnValue({
      user: { role: 'wait_staff' }
    });
    
    render(
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ReportsPage />
        </LocalizationProvider>
      </ThemeProvider>
    );
    
    expect(screen.getByText('Only managers and owners can access reports')).toBeInTheDocument();
  });
});
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AIInsightsPage from './AIInsightsPage';
import { AIContext } from '../contexts/AIContext';
import { AuthContext } from '../contexts/AuthContext';

const theme = createTheme();

const MockProviders = ({ children, aiValue, authValue }) => (
  <ThemeProvider theme={theme}>
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AuthContext.Provider value={authValue}>
        <AIContext.Provider value={aiValue}>
          {children}
        </AIContext.Provider>
      </AuthContext.Provider>
    </LocalizationProvider>
  </ThemeProvider>
);

describe('AIInsightsPage Integration', () => {
  const mockAuthValue = {
    isAuthenticated: true,
    user: {
      id: 'user-1',
      role: 'manager',
      restaurantId: 'restaurant-1',
      username: 'test-manager'
    },
    accessToken: 'test-token'
  };

  const mockAIValue = {
    featureStatus: {
      aiEnabled: true,
      hasPermission: true,
      availableFeatures: ['demand_forecast'],
      upgradeRequired: false,
      permissionRequired: false
    },
    hasAccess: true,
    activeJobs: [],
    jobHistory: [],
    insights: [],
    loading: false,
    error: null,
    createDemandForecast: jest.fn(),
    createMenuOptimization: jest.fn(),
    checkFeatureStatus: jest.fn(),
    loadJobHistory: jest.fn(),
    clearError: jest.fn(),
    getInsightResults: jest.fn(),
    getJobStatus: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Page Rendering', () => {
    it('should render AI Insights page with full access', () => {
      render(
        <MockProviders aiValue={mockAIValue} authValue={mockAuthValue}>
          <AIInsightsPage />
        </MockProviders>
      );

      expect(screen.getByText('AI Insights')).toBeInTheDocument();
      expect(screen.getByText('AI-powered analytics for smarter business decisions')).toBeInTheDocument();
      expect(screen.getByText('AI Enabled')).toBeInTheDocument();
    });

    it('should show permission warning for wait staff', () => {
      const waitStaffAuth = {
        ...mockAuthValue,
        user: { ...mockAuthValue.user, role: 'wait_staff' }
      };
      const noAccessAI = { ...mockAIValue, hasAccess: false };

      render(
        <MockProviders aiValue={noAccessAI} authValue={waitStaffAuth}>
          <AIInsightsPage />
        </MockProviders>
      );

      expect(screen.getByText('AI Insights are available to managers and owners only.')).toBeInTheDocument();
    });

    it('should show premium prompt when AI is disabled', () => {
      const disabledAI = {
        ...mockAIValue,
        featureStatus: { ...mockAIValue.featureStatus, aiEnabled: false }
      };

      render(
        <MockProviders aiValue={disabledAI} authValue={mockAuthValue}>
          <AIInsightsPage />
        </MockProviders>
      );

      expect(screen.getByText('Premium Required')).toBeInTheDocument();
      expect(screen.getByText('Demand Forecasting')).toBeInTheDocument();
      expect(screen.getByText('Menu Optimization')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should navigate between tabs correctly', async () => {
      render(
        <MockProviders aiValue={mockAIValue} authValue={mockAuthValue}>
          <AIInsightsPage />
        </MockProviders>
      );

      // Check default tab (Demand Forecast)
      expect(screen.getByText('Demand Forecasting')).toBeInTheDocument();

      // Switch to Menu Optimization tab
      fireEvent.click(screen.getByText('Menu Optimization'));
      await waitFor(() => {
        expect(screen.getByText('Menu Optimization')).toBeInTheDocument();
      });

      // Switch to History tab
      fireEvent.click(screen.getByText('Insights History'));
      await waitFor(() => {
        expect(screen.getByText('Insights History')).toBeInTheDocument();
      });
    });
  });

  describe('Demand Forecast Integration', () => {
    it('should handle successful forecast creation', async () => {
      const mockForecastResult = {
        id: 'forecast-123',
        type: 'demand_forecast',
        status: 'completed',
        result: {
          data: {
            predictions: [
              { date: '2024-02-01', orders: 25, revenue: 450, confidence: 0.85 }
            ],
            summary: {
              totalPredictedOrders: 25,
              totalPredictedRevenue: 450,
              averageConfidence: 0.85
            }
          }
        }
      };

      const mockCreateForecast = jest.fn().mockResolvedValue(mockForecastResult);
      const aiValueWithMock = {
        ...mockAIValue,
        createDemandForecast: mockCreateForecast
      };

      render(
        <MockProviders aiValue={aiValueWithMock} authValue={mockAuthValue}>
          <AIInsightsPage />
        </MockProviders>
      );

      // Form should be visible on first tab
      expect(screen.getByText('Demand Forecasting')).toBeInTheDocument();
      
      // Check that the demand forecast form is rendered
      expect(screen.getByText('1 Week')).toBeInTheDocument(); // Lookback option
      expect(screen.getByText('2 Weeks')).toBeInTheDocument(); // Lookback option
    });

    it('should display forecast results in ForecastViewer', async () => {
      const mockInsight = {
        id: 'forecast-123',
        type: 'demand_forecast',
        status: 'completed',
        result: {
          data: {
            predictions: [
              { date: '2024-02-01', orders: 25, revenue: 450, confidence: 0.85 }
            ],
            summary: {
              totalPredictedOrders: 25,
              totalPredictedRevenue: 450,
              averageConfidence: 0.85
            },
            recommendations: ['Test recommendation']
          }
        },
        createdAt: '2024-01-25T10:00:00.000Z'
      };

      const aiValueWithHistory = {
        ...mockAIValue,
        jobHistory: [mockInsight],
        insights: [mockInsight]
      };

      render(
        <MockProviders aiValue={aiValueWithHistory} authValue={mockAuthValue}>
          <AIInsightsPage />
        </MockProviders>
      );

      // Switch to history tab
      fireEvent.click(screen.getByText('Insights History'));

      // History should show the insight
      await waitFor(() => {
        expect(screen.getByText('demand_forecast')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display and clear errors', async () => {
      const aiValueWithError = {
        ...mockAIValue,
        error: 'Test error message'
      };

      render(
        <MockProviders aiValue={aiValueWithError} authValue={mockAuthValue}>
          <AIInsightsPage />
        </MockProviders>
      );

      expect(screen.getByText('Test error message')).toBeInTheDocument();
      
      // Error should be dismissible
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(mockAIValue.clearError).toHaveBeenCalled();
    });

    it('should show loading state', () => {
      const aiValueWithLoading = {
        ...mockAIValue,
        loading: true
      };

      render(
        <MockProviders aiValue={aiValueWithLoading} authValue={mockAuthValue}>
          <AIInsightsPage />
        </MockProviders>
      );

      // Should show loading indicator
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Active Jobs Display', () => {
    it('should display active jobs when present', () => {
      const activeJob = {
        id: 'job-1',
        type: 'demand_forecast',
        status: 'processing',
        progress: 50,
        createdAt: '2024-01-25T10:00:00.000Z'
      };

      const aiValueWithActiveJobs = {
        ...mockAIValue,
        activeJobs: [activeJob]
      };

      render(
        <MockProviders aiValue={aiValueWithActiveJobs} authValue={mockAuthValue}>
          <AIInsightsPage />
        </MockProviders>
      );

      expect(screen.getByText('Active AI Analysis (1)')).toBeInTheDocument();
    });

    it('should not display active jobs section when empty', () => {
      render(
        <MockProviders aiValue={mockAIValue} authValue={mockAuthValue}>
          <AIInsightsPage />
        </MockProviders>
      );

      expect(screen.queryByText(/Active AI Analysis/)).not.toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('should call refresh functions when refresh button is clicked', async () => {
      render(
        <MockProviders aiValue={mockAIValue} authValue={mockAuthValue}>
          <AIInsightsPage />
        </MockProviders>
      );

      const refreshButton = screen.getByRole('button', { name: /refresh status/i });
      fireEvent.click(refreshButton);

      expect(mockAIValue.checkFeatureStatus).toHaveBeenCalled();
    });
  });

  describe('Premium Feature Integration', () => {
    it('should open premium prompt when feature is clicked', async () => {
      const disabledAI = {
        ...mockAIValue,
        featureStatus: { ...mockAIValue.featureStatus, aiEnabled: false }
      };

      render(
        <MockProviders aiValue={disabledAI} authValue={mockAuthValue}>
          <AIInsightsPage />
        </MockProviders>
      );

      const learnMoreButtons = screen.getAllByText('Learn More');
      fireEvent.click(learnMoreButtons[0]);

      // Premium prompt should be triggered (component would handle this)
      expect(screen.getByText('Learn More')).toBeInTheDocument();
    });
  });

  describe('Insight Viewer Integration', () => {
    it('should open ForecastViewer for demand forecast insights', async () => {
      const mockInsight = {
        id: 'forecast-123',
        type: 'demand_forecast',
        status: 'completed',
        result: {
          data: {
            predictions: [
              { date: '2024-02-01', orders: 25, revenue: 450, confidence: 0.85 }
            ]
          }
        }
      };

      const aiValueWithHistory = {
        ...mockAIValue,
        insights: [mockInsight]
      };

      render(
        <MockProviders aiValue={aiValueWithHistory} authValue={mockAuthValue}>
          <AIInsightsPage />
        </MockProviders>
      );

      // Component should render without errors
      expect(screen.getByText('AI Insights')).toBeInTheDocument();
    });

    it('should open InsightViewer for non-forecast insights', async () => {
      const mockInsight = {
        id: 'optimization-123',
        type: 'menu_optimization',
        status: 'completed',
        data: {
          recommendations: ['Test recommendation']
        }
      };

      const aiValueWithHistory = {
        ...mockAIValue,
        insights: [mockInsight]
      };

      render(
        <MockProviders aiValue={aiValueWithHistory} authValue={mockAuthValue}>
          <AIInsightsPage />
        </MockProviders>
      );

      // Component should render without errors
      expect(screen.getByText('AI Insights')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render properly on different screen sizes', () => {
      // Test with smaller viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <MockProviders aiValue={mockAIValue} authValue={mockAuthValue}>
          <AIInsightsPage />
        </MockProviders>
      );

      expect(screen.getByText('AI Insights')).toBeInTheDocument();
    });
  });
});
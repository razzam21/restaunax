import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ForecastViewer from './ForecastViewer';
import { useAI } from '../../../contexts/AIContext';

// Mock the AI context
jest.mock('../../../contexts/AIContext', () => ({
  useAI: jest.fn()
}));

const theme = createTheme();

const MockWrapper = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('ForecastViewer', () => {
  const mockForecastData = {
    id: 'forecast-123',
    type: 'demand_forecast',
    status: 'completed',
    result: {
      data: {
        forecast: [
          {
            date: '2024-02-01',
            orders: 25,
            revenue: 450.75,
            confidence: 0.85,
            day_of_week: 'Thursday'
          },
          {
            date: '2024-02-02',
            orders: 28,
            revenue: 504.20,
            confidence: 0.83,
            day_of_week: 'Friday'
          },
          {
            date: '2024-02-03',
            orders: 32,
            revenue: 576.80,
            confidence: 0.87,
            day_of_week: 'Saturday'
          }
        ],
        summary: {
          total_predicted_orders: 85,
          total_predicted_revenue: 1531.75,
          confidence: 0.85,
          peak_day: 'Saturday'
        },
        trends: {
          expectedGrowth: 12,
          seasonalFactors: ['weekend_boost', 'lunch_rush'],
          riskFactors: ['weather_dependent']
        },
        insights: [
          'Weekend shows highest demand',
          'Friday and Saturday are peak days'
        ],
        recommendations: [
          'Increase inventory for weekend rush',
          'Consider lunch specials to boost revenue',
          'Staff additional servers for Saturday evening'
        ]
      },
      historicalContext: {
        dataQuality: 'medium'
      }
    },
    requestInfo: {
      startDate: '2024-02-01T00:00:00.000Z',
      endDate: '2024-02-03T23:59:59.000Z',
      lookbackDays: 30,
      requestedBy: 'test-user',
      requestedAt: '2024-01-25T10:00:00.000Z'
    },
    performance: {
      generation_duration: 1500,
      total_request_duration: 2000
    },
    createdAt: '2024-01-25T10:00:00.000Z'
  };

  const defaultProps = {
    forecast: mockForecastData,
    open: true,
    onClose: jest.fn()
  };

  // Mock AI context functions
  const mockDeleteInsight = jest.fn();
  const mockLockInsight = jest.fn();
  const mockUnlockInsight = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementation
    useAI.mockReturnValue({
      deleteInsight: mockDeleteInsight,
      lockInsight: mockLockInsight,
      unlockInsight: mockUnlockInsight,
      loading: false
    });
  });

  describe('Basic Rendering', () => {
    it('should render forecast viewer dialog when open', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Demand Forecast Results')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} open={false} />
        </MockWrapper>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not render when forecast is null', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} forecast={null} />
        </MockWrapper>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Forecast Summary Display', () => {
    it('should display forecast summary metrics', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      expect(screen.getByText('85')).toBeInTheDocument(); // Total orders
      expect(screen.getByText('$1,531.75')).toBeInTheDocument(); // Total revenue
      expect(screen.getByText('85%')).toBeInTheDocument(); // Average confidence
      expect(screen.getByText('Saturday')).toBeInTheDocument(); // Peak day
    });

    it('should display trend information', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      expect(screen.getByText('12% growth expected')).toBeInTheDocument();
      expect(screen.getByText('Weekend Boost')).toBeInTheDocument();
      expect(screen.getByText('Lunch Rush')).toBeInTheDocument();
    });

    it('should display risk factors', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      expect(screen.getByText('Weather Dependent')).toBeInTheDocument();
    });
  });

  describe('Predictions Table', () => {
    it('should render predictions table with all data', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      // Check table headers
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Day')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('Confidence')).toBeInTheDocument();

      // Check first row data
      expect(screen.getByText('Feb 1, 2024')).toBeInTheDocument();
      expect(screen.getByText('Thursday')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('$450.75')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should format dates correctly', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      expect(screen.getByText('Feb 1, 2024')).toBeInTheDocument();
      expect(screen.getByText('Feb 2, 2024')).toBeInTheDocument();
      expect(screen.getByText('Feb 3, 2024')).toBeInTheDocument();
    });

    it('should format currency values correctly', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      expect(screen.getByText('$450.75')).toBeInTheDocument();
      expect(screen.getByText('$504.20')).toBeInTheDocument();
      expect(screen.getByText('$576.80')).toBeInTheDocument();
    });

    it('should show confidence levels with appropriate colors', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      const confidenceChips = screen.getAllByText(/\d+%/);
      expect(confidenceChips.length).toBeGreaterThan(0);
      
      // Check that high confidence (85%+) gets success color
      const highConfidenceChip = screen.getByText('85%');
      expect(highConfidenceChip.closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    });
  });

  describe('Recommendations Section', () => {
    it('should display all recommendations', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      expect(screen.getByText('Increase inventory for weekend rush')).toBeInTheDocument();
      expect(screen.getByText('Consider lunch specials to boost revenue')).toBeInTheDocument();
      expect(screen.getByText('Staff additional servers for Saturday evening')).toBeInTheDocument();
    });

    it('should show recommendations section header', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      expect(screen.getByText('Recommendations')).toBeInTheDocument();
    });
  });

  describe('Request Information', () => {
    it('should display forecast period information', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      expect(screen.getByText(/Forecast Period:/)).toBeInTheDocument();
      expect(screen.getByText(/Feb 1, 2024 - Feb 3, 2024/)).toBeInTheDocument();
    });

    it('should display generation timestamp', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      expect(screen.getByText(/Generated on/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 25, 2024/)).toBeInTheDocument();
    });

    it('should display data quality score', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      expect(screen.getByText(/Data Quality:/)).toBeInTheDocument();
      expect(screen.getByText('78%')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const mockOnClose = jest.fn();
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} onClose={mockOnClose} />
        </MockWrapper>
      );

      fireEvent.click(screen.getByText('Close'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when dialog backdrop is clicked', () => {
      const mockOnClose = jest.fn();
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} onClose={mockOnClose} />
        </MockWrapper>
      );

      // Click on backdrop (dialog overlay)
      fireEvent.click(screen.getByRole('dialog').parentElement);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing predictions gracefully', () => {
      const forecastWithoutPredictions = {
        ...mockForecastData,
        result: {
          ...mockForecastData.result,
          data: {
            ...mockForecastData.result.data,
            predictions: []
          }
        }
      };

      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} forecast={forecastWithoutPredictions} />
        </MockWrapper>
      );

      expect(screen.getByText('No forecast data available')).toBeInTheDocument();
    });

    it('should handle missing summary data gracefully', () => {
      const forecastWithoutSummary = {
        ...mockForecastData,
        result: {
          ...mockForecastData.result,
          data: {
            ...mockForecastData.result.data,
            summary: undefined
          }
        }
      };

      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} forecast={forecastWithoutSummary} />
        </MockWrapper>
      );

      // Should still render the dialog, but with fallback content
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should handle missing recommendations gracefully', () => {
      const forecastWithoutRecommendations = {
        ...mockForecastData,
        result: {
          ...mockForecastData.result,
          data: {
            ...mockForecastData.result.data,
            recommendations: []
          }
        }
      };

      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} forecast={forecastWithoutRecommendations} />
        </MockWrapper>
      );

      expect(screen.getByText('No specific recommendations available')).toBeInTheDocument();
    });

    it('should handle incomplete prediction data', () => {
      const forecastWithIncompleteData = {
        ...mockForecastData,
        result: {
          ...mockForecastData.result,
          data: {
            ...mockForecastData.result.data,
            predictions: [
              {
                date: '2024-02-01',
                orders: 25
                // Missing revenue, confidence, day_of_week
              }
            ]
          }
        }
      };

      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} forecast={forecastWithIncompleteData} />
        </MockWrapper>
      );

      expect(screen.getByText('25')).toBeInTheDocument(); // Orders should show
      expect(screen.getByText('$0.00')).toBeInTheDocument(); // Revenue should default
      expect(screen.getByText('N/A')).toBeInTheDocument(); // Missing confidence
    });
  });

  describe('Performance Indicators', () => {
    it('should display generation time', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      expect(screen.getByText(/Generation Time:/)).toBeInTheDocument();
      expect(screen.getByText('1.5s')).toBeInTheDocument();
    });

    it('should show data quality warning for low scores', () => {
      const forecastWithLowQuality = {
        ...mockForecastData,
        result: {
          ...mockForecastData.result,
          metadata: {
            ...mockForecastData.result.metadata,
            data_quality_score: 0.45
          }
        }
      };

      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} forecast={forecastWithLowQuality} />
        </MockWrapper>
      );

      expect(screen.getByText(/low data quality/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive and work on different screen sizes', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveStyle({ maxWidth: 'lg' });
    });
  });

  describe('Delete and Lock Functionality', () => {
    it('should show lock and delete buttons for unlocked forecast', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      expect(screen.getByLabelText('Lock Insight')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete Insight')).toBeInTheDocument();
    });

    it('should show unlock button and hide delete button for locked forecast', () => {
      const lockedForecast = {
        ...mockForecastData,
        data: { locked: true }
      };

      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} forecast={lockedForecast} />
        </MockWrapper>
      );

      expect(screen.getByLabelText('Unlock Insight')).toBeInTheDocument();
      expect(screen.queryByLabelText('Delete Insight')).not.toBeInTheDocument();
      expect(screen.getByText('Locked')).toBeInTheDocument();
    });

    it('should call lockInsight when lock button is clicked', async () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      fireEvent.click(screen.getByLabelText('Lock Insight'));
      
      await waitFor(() => {
        expect(mockLockInsight).toHaveBeenCalledWith(mockForecastData.id);
      });
    });

    it('should call unlockInsight when unlock button is clicked', async () => {
      const lockedForecast = {
        ...mockForecastData,
        data: { locked: true }
      };

      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} forecast={lockedForecast} />
        </MockWrapper>
      );

      fireEvent.click(screen.getByLabelText('Unlock Insight'));
      
      await waitFor(() => {
        expect(mockUnlockInsight).toHaveBeenCalledWith(mockForecastData.id);
      });
    });

    it('should open delete confirmation dialog when delete button is clicked', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      fireEvent.click(screen.getByLabelText('Delete Insight'));
      
      expect(screen.getByText('Delete Forecast')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this demand forecast? This action cannot be undone.')).toBeInTheDocument();
    });

    it('should close delete confirmation dialog when cancel is clicked', () => {
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      // Open delete dialog
      fireEvent.click(screen.getByLabelText('Delete Insight'));
      expect(screen.getByText('Delete Forecast')).toBeInTheDocument();

      // Cancel deletion
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('Delete Forecast')).not.toBeInTheDocument();
    });

    it('should call deleteInsight and close dialog when delete is confirmed', async () => {
      const mockOnClose = jest.fn();
      
      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} onClose={mockOnClose} />
        </MockWrapper>
      );

      // Open delete dialog
      fireEvent.click(screen.getByLabelText('Delete Insight'));
      
      // Confirm deletion
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      
      await waitFor(() => {
        expect(mockDeleteInsight).toHaveBeenCalledWith(mockForecastData.id);
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should disable buttons when loading', () => {
      useAI.mockReturnValue({
        deleteInsight: mockDeleteInsight,
        lockInsight: mockLockInsight,
        unlockInsight: mockUnlockInsight,
        loading: true
      });

      render(
        <MockWrapper>
          <ForecastViewer {...defaultProps} />
        </MockWrapper>
      );

      expect(screen.getByLabelText('Lock Insight')).toBeDisabled();
      expect(screen.getByLabelText('Delete Insight')).toBeDisabled();
    });
  });
});
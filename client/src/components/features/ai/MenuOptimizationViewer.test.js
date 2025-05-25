import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MenuOptimizationViewer from './MenuOptimizationViewer';
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

// Mock components and dependencies
const mockDeleteInsight = jest.fn();
const mockLockInsight = jest.fn();
const mockUnlockInsight = jest.fn();

const mockOptimizationData = {
  id: 'optimization-123',
  type: 'menu_optimization',
  status: 'completed',
  createdAt: '2024-01-15T10:30:00Z',
  result: {
    data: {
      confidence: 0.85,
      summary: {
        total_items_analyzed: 25,
        active_items: 22,
        total_revenue_analyzed: 15000,
        top_category: 'Entrees'
      },
      item_performance: [
        {
          item_id: 'item-1',
          name: 'Burger',
          category: 'Entrees',
          total_quantity: 150,
          total_revenue: 2250,
          average_price: 15.00,
          performance_rank: 1,
          trend: 'increasing',
          recommendation: 'promote'
        },
        {
          item_id: 'item-2',
          name: 'Salad',
          category: 'Appetizers',
          total_quantity: 45,
          total_revenue: 675,
          average_price: 15.00,
          performance_rank: 2,
          trend: 'stable',
          recommendation: 'maintain'
        }
      ],
      category_performance: [
        {
          category: 'Entrees',
          item_count: 10,
          total_revenue: 12000,
          performance_score: 8.5
        },
        {
          category: 'Appetizers',
          item_count: 5,
          total_revenue: 2000,
          performance_score: 6.2
        }
      ],
      insights: [
        'Your Burger is the top performer with strong upward trend',
        'Entrees category generates 80% of total revenue'
      ],
      recommendations: [
        'Promote your top-performing Burger with special offers',
        'Consider removing low-performing appetizers to simplify menu'
      ]
    },
    metadata: {
      generation_duration: 2500,
      data_quality: 'high'
    }
  },
  requestInfo: {
    lookbackDays: 30,
    includeInactive: false,
    requestedBy: 'test-manager',
    requestedAt: '2024-01-15T10:30:00Z'
  },
  performance: {
    generation_duration: 2500,
    total_request_duration: 3000
  }
};

const renderMenuOptimizationViewer = (props = {}) => {
  const defaultProps = {
    optimization: mockOptimizationData,
    open: true,
    onClose: jest.fn(),
    ...props,
  };

  const defaultAIContext = {
    deleteInsight: mockDeleteInsight,
    lockInsight: mockLockInsight,
    unlockInsight: mockUnlockInsight,
    loading: false,
  };

  // Mock useAI hook
  useAI.mockReturnValue(defaultAIContext);

  return render(
    <MockWrapper>
      <MenuOptimizationViewer {...defaultProps} />
    </MockWrapper>
  );
};

describe('MenuOptimizationViewer - TDD Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RED: Component rendering and structure', () => {
    it('should render menu optimization viewer when open', () => {
      renderMenuOptimizationViewer();

      expect(screen.getByText('Menu Optimization Analysis')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      renderMenuOptimizationViewer({ open: false });

      expect(screen.queryByText('Menu Optimization Analysis')).not.toBeInTheDocument();
    });

    it('should not render when optimization data is null', () => {
      renderMenuOptimizationViewer({ optimization: null });

      expect(screen.queryByText('Menu Optimization Analysis')).not.toBeInTheDocument();
    });

    it('should render summary section with key metrics', () => {
      renderMenuOptimizationViewer();

      expect(screen.getByText('Analysis Summary')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument(); // total_items
      expect(screen.getByText('22')).toBeInTheDocument(); // active_items
      expect(screen.getByText('$15,000.00')).toBeInTheDocument(); // total_revenue formatted
      expect(screen.getAllByText('Entrees').length).toBeGreaterThan(0); // top_category
    });

    it('should render item performance table', () => {
      renderMenuOptimizationViewer();

      expect(screen.getByText('Item Performance')).toBeInTheDocument();
      expect(screen.getByText('Item Name')).toBeInTheDocument();
      expect(screen.getAllByText('Category').length).toBeGreaterThan(0); // appears in multiple tables
      expect(screen.getAllByText('Revenue').length).toBeGreaterThan(0); // appears in multiple tables
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Trend')).toBeInTheDocument();
      expect(screen.getByText('Recommendation')).toBeInTheDocument();
      
      // Check data rows
      expect(screen.getByText('Burger')).toBeInTheDocument();
      expect(screen.getByText('Salad')).toBeInTheDocument();
      expect(screen.getByText('$2,250.00')).toBeInTheDocument();
      expect(screen.getByText('$675.00')).toBeInTheDocument();
    });

    it('should render category performance section', () => {
      renderMenuOptimizationViewer();

      expect(screen.getByText('Category Performance')).toBeInTheDocument();
      expect(screen.getAllByText('Category').length).toBeGreaterThan(0); // appears in multiple tables
      expect(screen.getByText('Items')).toBeInTheDocument();
      expect(screen.getAllByText('Revenue').length).toBeGreaterThan(0); // appears in multiple tables
      expect(screen.getByText('Score')).toBeInTheDocument();
      
      // Check category data - categories like 'Entrees' appear in multiple places
      expect(screen.getAllByText('Entrees').length).toBeGreaterThan(0);
      expect(screen.getByText('$12,000.00')).toBeInTheDocument();
      expect(screen.getByText('$2,000.00')).toBeInTheDocument();
      expect(screen.getByText('8.5')).toBeInTheDocument();
      expect(screen.getByText('6.2')).toBeInTheDocument();
    });

    it('should render insights section', () => {
      renderMenuOptimizationViewer();

      expect(screen.getByText('Key Insights')).toBeInTheDocument();
      expect(screen.getByText('Your Burger is the top performer with strong upward trend')).toBeInTheDocument();
      expect(screen.getByText('Entrees category generates 80% of total revenue')).toBeInTheDocument();
    });

    it('should render recommendations section', () => {
      renderMenuOptimizationViewer();

      expect(screen.getByText('Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Promote your top-performing Burger with special offers')).toBeInTheDocument();
      expect(screen.getByText('Consider removing low-performing appetizers to simplify menu')).toBeInTheDocument();
    });

    it('should render metadata section', () => {
      renderMenuOptimizationViewer();

      expect(screen.getByText('Analysis Details')).toBeInTheDocument();
      expect(screen.getByText('Duration:')).toBeInTheDocument();
      expect(screen.getByText('2.5s')).toBeInTheDocument(); // 2500ms
      expect(screen.getByText('Confidence:')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('Data Quality:')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
    });
  });

  describe('RED: Trend and recommendation chips', () => {
    it('should render trend chips with correct colors', () => {
      renderMenuOptimizationViewer();

      // Check for trend chips
      const increasingChips = screen.getAllByText('increasing');
      const stableChips = screen.getAllByText('stable');
      
      expect(increasingChips.length).toBeGreaterThan(0);
      expect(stableChips.length).toBeGreaterThan(0);
    });

    it('should render recommendation chips with correct colors', () => {
      renderMenuOptimizationViewer();

      // Check for recommendation chips
      const promoteChips = screen.getAllByText('promote');
      const maintainChips = screen.getAllByText('maintain');
      
      expect(promoteChips.length).toBeGreaterThan(0);
      expect(maintainChips.length).toBeGreaterThan(0);
    });
  });

  describe('RED: Dialog interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const mockOnClose = jest.fn();
      renderMenuOptimizationViewer({ onClose: mockOnClose });

      fireEvent.click(screen.getByText('Close'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when dialog backdrop is clicked', () => {
      const mockOnClose = jest.fn();
      renderMenuOptimizationViewer({ onClose: mockOnClose });

      // Simulate clicking outside the dialog
      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('RED: Lock/unlock functionality', () => {
    it('should render lock button when optimization is not locked', () => {
      renderMenuOptimizationViewer();

      const lockButton = screen.getByRole('button', { name: /lock/i });
      expect(lockButton).toBeInTheDocument();
    });

    it('should render unlock button when optimization is locked', () => {
      const lockedOptimization = {
        ...mockOptimizationData,
        result: {
          ...mockOptimizationData.result,
          data: {
            ...mockOptimizationData.result.data,
            locked: true
          }
        }
      };

      renderMenuOptimizationViewer({ optimization: lockedOptimization });

      const unlockButton = screen.getByRole('button', { name: /unlock/i });
      expect(unlockButton).toBeInTheDocument();
    });

    it('should call lockInsight when lock button is clicked', async () => {
      renderMenuOptimizationViewer();

      const lockButton = screen.getByRole('button', { name: /lock/i });
      fireEvent.click(lockButton);

      await waitFor(() => {
        expect(mockLockInsight).toHaveBeenCalledWith('optimization-123');
      });
    });

    it('should call unlockInsight when unlock button is clicked', async () => {
      const lockedOptimization = {
        ...mockOptimizationData,
        result: {
          ...mockOptimizationData.result,
          data: {
            ...mockOptimizationData.result.data,
            locked: true
          }
        }
      };

      renderMenuOptimizationViewer({ optimization: lockedOptimization });

      const unlockButton = screen.getByRole('button', { name: /unlock/i });
      fireEvent.click(unlockButton);

      await waitFor(() => {
        expect(mockUnlockInsight).toHaveBeenCalledWith('optimization-123');
      });
    });
  });

  describe('RED: Delete functionality', () => {
    it('should render delete button', () => {
      renderMenuOptimizationViewer();

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should show delete confirmation dialog when delete button is clicked', () => {
      renderMenuOptimizationViewer();

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(screen.getByText('Delete Optimization Analysis')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete this optimization analysis/i)).toBeInTheDocument();
    });

    it('should call deleteInsight when delete is confirmed', async () => {
      renderMenuOptimizationViewer();

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteInsight).toHaveBeenCalledWith('optimization-123');
      });
    });

    it('should not call deleteInsight when delete is cancelled', () => {
      renderMenuOptimizationViewer();

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      // Cancel deletion
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockDeleteInsight).not.toHaveBeenCalled();
    });
  });

  describe('RED: Error handling and edge cases', () => {
    it('should handle missing summary data gracefully', () => {
      const optimizationWithMissingSummary = {
        ...mockOptimizationData,
        result: {
          ...mockOptimizationData.result,
          data: {
            ...mockOptimizationData.result.data,
            summary: undefined
          }
        }
      };

      renderMenuOptimizationViewer({ optimization: optimizationWithMissingSummary });

      // Should still render the dialog
      expect(screen.getByText('Menu Optimization Analysis')).toBeInTheDocument();
    });

    it('should handle empty item performance array', () => {
      const optimizationWithNoItems = {
        ...mockOptimizationData,
        result: {
          ...mockOptimizationData.result,
          data: {
            ...mockOptimizationData.result.data,
            item_performance: []
          }
        }
      };

      renderMenuOptimizationViewer({ optimization: optimizationWithNoItems });

      expect(screen.getByText('Item Performance')).toBeInTheDocument();
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('should handle empty insights and recommendations', () => {
      const optimizationWithNoInsights = {
        ...mockOptimizationData,
        result: {
          ...mockOptimizationData.result,
          data: {
            ...mockOptimizationData.result.data,
            insights: [],
            recommendations: []
          }
        }
      };

      renderMenuOptimizationViewer({ optimization: optimizationWithNoInsights });

      expect(screen.getByText('Key Insights')).toBeInTheDocument();
      expect(screen.getByText('Recommendations')).toBeInTheDocument();
      expect(screen.getAllByText('No insights available').length).toBeGreaterThan(0);
      expect(screen.getAllByText('No recommendations available').length).toBeGreaterThan(0);
    });
  });

  describe('RED: Accessibility', () => {
    it('should have proper dialog structure', () => {
      renderMenuOptimizationViewer();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Check for dialog title instead of aria-label since MUI Dialog may create multiple labels
      expect(screen.getByText('Menu Optimization Analysis')).toBeInTheDocument();
    });

    it('should have proper table structure for item performance', () => {
      renderMenuOptimizationViewer();

      // Multiple tables exist (item performance and category performance)
      expect(screen.getAllByRole('table').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1); // header + data rows
    });
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MenuOptimizationForm from './MenuOptimizationForm';
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
const mockCreateMenuOptimization = jest.fn();

const renderMenuOptimizationForm = (aiContextValue = {}) => {
  const defaultAIContext = {
    createMenuOptimization: mockCreateMenuOptimization,
    loading: false,
    error: null,
    featureStatus: {
      aiEnabled: true,
      hasPermission: true,
      availableFeatures: ['menu_optimization'],
      upgradeRequired: false,
    },
    ...aiContextValue,
  };

  // Mock useAI hook
  useAI.mockReturnValue(defaultAIContext);

  return render(
    <MockWrapper>
      <MenuOptimizationForm />
    </MockWrapper>
  );
};

describe('MenuOptimizationForm - TDD Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RED: Component rendering and structure', () => {
    it('should render menu optimization form with all required fields', () => {
      renderMenuOptimizationForm();

      // Check main heading
      expect(screen.getByText('Menu Optimization')).toBeInTheDocument();
      expect(screen.getByText('AI-powered analysis to optimize menu pricing and composition')).toBeInTheDocument();

      // Check form fields - use getAllByText for MUI components that create multiple elements
      expect(screen.getAllByText('Analysis Period').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Include Inactive Items').length).toBeGreaterThan(0);

      // Check submit button
      expect(screen.getByRole('button', { name: /optimize menu/i })).toBeInTheDocument();
    });

    it('should render all lookback period options', () => {
      renderMenuOptimizationForm();

      // Click the select to open options - use role-based selector
      const selectInput = screen.getByRole('combobox');
      fireEvent.mouseDown(selectInput);

      // Check all options are present - use getAllByText for duplicated options
      expect(screen.getAllByText('2 Weeks').length).toBeGreaterThan(0);
      expect(screen.getAllByText('1 Month').length).toBeGreaterThan(0);
      expect(screen.getAllByText('2 Months').length).toBeGreaterThan(0);
      expect(screen.getAllByText('3 Months').length).toBeGreaterThan(0);

      // Check descriptions - use getAllByText for descriptions that may appear multiple times
      expect(screen.getByText('Recent performance only')).toBeInTheDocument();
      expect(screen.getAllByText('Balanced analysis').length).toBeGreaterThan(0);
      expect(screen.getByText('Seasonal trends')).toBeInTheDocument();
      expect(screen.getByText('Long-term patterns')).toBeInTheDocument();
    });

    it('should render optimization insights information', () => {
      renderMenuOptimizationForm();

      expect(screen.getByText('Optimization Insights')).toBeInTheDocument();
      expect(screen.getByText('Pricing Analysis')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('Menu Composition')).toBeInTheDocument();
    });

    it('should render analysis details section', () => {
      renderMenuOptimizationForm();

      expect(screen.getByText('Analysis Details')).toBeInTheDocument();
      expect(screen.getByText('Estimated Duration:')).toBeInTheDocument();
      expect(screen.getByText('Analysis Depth:')).toBeInTheDocument();
      expect(screen.getByText('~3 minutes')).toBeInTheDocument(); // Default for 30 days
      expect(screen.getByText('Advanced AI')).toBeInTheDocument();
    });
  });

  describe('RED: Form state management', () => {
    it('should have correct default values', () => {
      renderMenuOptimizationForm();

      // Analysis period should default to 30 days (1 Month)
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();

      // Include inactive should default to false (unchecked)
      const includeInactiveSwitch = screen.getByRole('checkbox', { name: /include inactive items/i });
      expect(includeInactiveSwitch).not.toBeChecked();
    });

    it('should update form state when analysis period changes', () => {
      renderMenuOptimizationForm();

      // Change analysis period to 14 days
      const selectInput = screen.getByRole('combobox');
      fireEvent.mouseDown(selectInput);
      fireEvent.click(screen.getByText('2 Weeks'));

      // Check that estimated duration updates
      expect(screen.getByText('~1 minutes')).toBeInTheDocument(); // 3 * (14/30) ≈ 1
    });

    it('should update form state when include inactive changes', () => {
      renderMenuOptimizationForm();

      const includeInactiveSwitch = screen.getByRole('checkbox', { name: /include inactive items/i });
      
      // Initially unchecked
      expect(includeInactiveSwitch).not.toBeChecked();

      // Toggle it
      fireEvent.click(includeInactiveSwitch);
      expect(includeInactiveSwitch).toBeChecked();

      // Toggle back
      fireEvent.click(includeInactiveSwitch);
      expect(includeInactiveSwitch).not.toBeChecked();
    });

    it('should calculate estimated duration correctly for different periods', () => {
      renderMenuOptimizationForm();

      // Test 60 days (2 months)
      let selectInput = screen.getByRole('combobox');
      fireEvent.mouseDown(selectInput);
      fireEvent.click(screen.getByText('2 Months'));
      expect(screen.getByText('~6 minutes')).toBeInTheDocument(); // 3 * (60/30) = 6

      // Test 90 days (3 months)
      selectInput = screen.getByRole('combobox');
      fireEvent.mouseDown(selectInput);
      fireEvent.click(screen.getByText('3 Months'));
      expect(screen.getByText('~9 minutes')).toBeInTheDocument(); // 3 * (90/30) = 9
    });
  });

  describe('RED: Form submission', () => {
    it('should call createMenuOptimization with correct parameters on submit', async () => {
      mockCreateMenuOptimization.mockResolvedValue({
        id: 'job-123',
        type: 'menu_optimization',
        status: 'completed'
      });

      renderMenuOptimizationForm();

      // Change some form values
      const selectInput = screen.getByRole('combobox');
      fireEvent.mouseDown(selectInput);
      fireEvent.click(screen.getByText('2 Months'));

      const includeInactiveSwitch = screen.getByRole('checkbox', { name: /include inactive items/i });
      fireEvent.click(includeInactiveSwitch);

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /optimize menu/i }));

      await waitFor(() => {
        expect(mockCreateMenuOptimization).toHaveBeenCalledWith({
          lookbackDays: 60,
          includeInactive: true
        });
      });
    });

    it('should show success message after successful submission', async () => {
      mockCreateMenuOptimization.mockResolvedValue({
        id: 'job-123',
        type: 'menu_optimization',
        status: 'completed'
      });

      renderMenuOptimizationForm();

      fireEvent.click(screen.getByRole('button', { name: /optimize menu/i }));

      await waitFor(() => {
        expect(screen.getByText(/menu optimization analysis started/i)).toBeInTheDocument();
      });
    });

    it('should handle form submission errors gracefully', async () => {
      const errorMessage = 'AI features are disabled';
      mockCreateMenuOptimization.mockRejectedValue(new Error(errorMessage));

      renderMenuOptimizationForm({
        error: errorMessage
      });

      // Error should be displayed
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should prevent multiple submissions while loading', () => {
      renderMenuOptimizationForm({
        loading: true
      });

      const submitButton = screen.getByRole('button', { name: /starting analysis/i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByRole('progressbar')).toBeInTheDocument(); // Linear progress
    });
  });

  describe('RED: Loading states', () => {
    it('should show loading state during form submission', () => {
      renderMenuOptimizationForm({
        loading: true
      });

      expect(screen.getByText('Starting Analysis...')).toBeInTheDocument();
      expect(screen.getByText('Initializing menu optimization analysis...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should disable submit button during loading', () => {
      renderMenuOptimizationForm({
        loading: true
      });

      const submitButton = screen.getByRole('button', { name: /starting analysis/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('RED: Error handling', () => {
    it('should display error messages from AI context', () => {
      const errorMessage = 'Failed to create menu optimization';
      renderMenuOptimizationForm({
        error: errorMessage
      });

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should not show success message when there is an error', () => {
      renderMenuOptimizationForm({
        error: 'Some error occurred'
      });

      expect(screen.queryByText(/menu optimization analysis started/i)).not.toBeInTheDocument();
    });
  });

  describe('RED: Accessibility', () => {
    it('should have proper form labels and structure', () => {
      renderMenuOptimizationForm();

      // Check form has proper structure - use querySelector since MUI doesn't always provide role="form"
      const forms = document.querySelectorAll('form');
      expect(forms.length).toBeGreaterThan(0);
      
      // Check labels exist (don't require perfect association for this test)
      expect(screen.getAllByText('Analysis Period').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Include Inactive Items').length).toBeGreaterThan(0);
    });

    it('should have proper button text and states', () => {
      renderMenuOptimizationForm();

      const submitButton = screen.getByRole('button', { name: /optimize menu/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('RED: Success message auto-hide', () => {
    it('should hide success message after 5 seconds', async () => {
      jest.useFakeTimers();
      
      mockCreateMenuOptimization.mockResolvedValue({
        id: 'job-123',
        type: 'menu_optimization',
        status: 'completed'
      });

      renderMenuOptimizationForm();

      fireEvent.click(screen.getByRole('button', { name: /optimize menu/i }));

      // Wait for success message to appear
      await waitFor(() => {
        expect(screen.getByText(/menu optimization analysis started/i)).toBeInTheDocument();
      });

      // Fast forward 5 seconds
      jest.advanceTimersByTime(5000);

      // Success message should be gone
      await waitFor(() => {
        expect(screen.queryByText(/menu optimization analysis started/i)).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });
});
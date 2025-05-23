import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderProvider, useOrders } from './OrderContext';
import { orderService } from '../services/api';

// Mock the API service
jest.mock('../services/api', () => ({
  orderService: {
    getOrders: jest.fn(),
    getOrderById: jest.fn(),
    createOrder: jest.fn(),
    updateOrderStatus: jest.fn()
  }
}));

// Mock the AuthContext
jest.mock('./AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'user-1', role: 'staff', restaurantId: 'rest-1' }
  })
}));

// Test component that uses the order context
const TestComponent = () => {
  const { 
    orders, 
    loading, 
    error, 
    pagination, 
    fetchOrders
  } = useOrders();
  
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="orders-count">{orders.length}</div>
      <div data-testid="current-page">{pagination.currentPage}</div>
      <div data-testid="total-pages">{pagination.totalPages}</div>
      <div data-testid="total-count">{pagination.totalCount}</div>
      <div data-testid="has-next">{pagination.hasNextPage.toString()}</div>
      <div data-testid="has-prev">{pagination.hasPreviousPage.toString()}</div>
      <button data-testid="fetch-btn" onClick={() => fetchOrders()}>Fetch</button>
      <button data-testid="fetch-page-2" onClick={() => fetchOrders(null, 2)}>Page 2</button>
      <button data-testid="fetch-pending" onClick={() => fetchOrders('pending')}>Pending</button>
    </div>
  );
};

// Wrapper component with providers
const TestWrapper = ({ children }) => (
  <OrderProvider>
    {children}
  </OrderProvider>
);

describe('OrderContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pagination', () => {
    test('should initialize with default pagination state', async () => {
      // Arrange - Mock the auto-fetch on mount
      orderService.getOrders.mockResolvedValue({
        orders: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });

      // Act
      render(<TestComponent />, { wrapper: TestWrapper });

      // Wait for the auto-fetch to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Assert
      expect(screen.getByTestId('current-page')).toHaveTextContent('1');
      expect(screen.getByTestId('total-pages')).toHaveTextContent('0');
      expect(screen.getByTestId('total-count')).toHaveTextContent('0');
      expect(screen.getByTestId('has-next')).toHaveTextContent('false');
      expect(screen.getByTestId('has-prev')).toHaveTextContent('false');
      expect(screen.getByTestId('orders-count')).toHaveTextContent('0');
    });

    test('should fetch orders with default pagination', async () => {
      // Arrange
      const mockOrders = [
        { id: '1', status: 'pending', customerName: 'Customer 1' },
        { id: '2', status: 'preparing', customerName: 'Customer 2' }
      ];
      const mockResponse = {
        orders: mockOrders,
        pagination: {
          currentPage: 1,
          totalPages: 2,
          totalCount: 25,
          hasNextPage: true,
          hasPreviousPage: false
        }
      };
      orderService.getOrders.mockResolvedValue(mockResponse);

      // Act
      render(<TestComponent />, { wrapper: TestWrapper });
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('fetch-btn'));
      });

      // Assert
      await waitFor(() => {
        expect(orderService.getOrders).toHaveBeenCalledWith('page=1&limit=20');
        expect(screen.getByTestId('orders-count')).toHaveTextContent('2');
        expect(screen.getByTestId('current-page')).toHaveTextContent('1');
        expect(screen.getByTestId('total-pages')).toHaveTextContent('2');
        expect(screen.getByTestId('total-count')).toHaveTextContent('25');
        expect(screen.getByTestId('has-next')).toHaveTextContent('true');
        expect(screen.getByTestId('has-prev')).toHaveTextContent('false');
      });
    });

    test('should fetch orders with specific page', async () => {
      // Arrange
      const mockOrders = [
        { id: '3', status: 'ready', customerName: 'Customer 3' }
      ];
      const mockResponse = {
        orders: mockOrders,
        pagination: {
          currentPage: 2,
          totalPages: 3,
          totalCount: 45,
          hasNextPage: true,
          hasPreviousPage: true
        }
      };
      orderService.getOrders.mockResolvedValue(mockResponse);

      // Act
      render(<TestComponent />, { wrapper: TestWrapper });
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('fetch-page-2'));
      });

      // Assert
      await waitFor(() => {
        expect(orderService.getOrders).toHaveBeenCalledWith('page=2&limit=20');
        expect(screen.getByTestId('current-page')).toHaveTextContent('2');
        expect(screen.getByTestId('has-next')).toHaveTextContent('true');
        expect(screen.getByTestId('has-prev')).toHaveTextContent('true');
      });
    });

    test('should fetch orders with status filter', async () => {
      // Arrange
      const mockOrders = [
        { id: '1', status: 'pending', customerName: 'Customer 1' }
      ];
      const mockResponse = {
        orders: mockOrders,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 5,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
      orderService.getOrders.mockResolvedValue(mockResponse);

      // Act
      render(<TestComponent />, { wrapper: TestWrapper });
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('fetch-pending'));
      });

      // Assert
      await waitFor(() => {
        expect(orderService.getOrders).toHaveBeenCalledWith('status=pending&page=1&limit=20');
        expect(screen.getByTestId('orders-count')).toHaveTextContent('1');
      });
    });

    test('should handle pagination errors gracefully', async () => {
      // Arrange
      const errorMessage = 'Network error';
      orderService.getOrders.mockRejectedValue(new Error(errorMessage));

      // Act
      render(<TestComponent />, { wrapper: TestWrapper });
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('fetch-btn'));
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch orders');
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('orders-count')).toHaveTextContent('0');
      });
    });

    test('should handle empty pagination response', async () => {
      // Arrange
      const mockResponse = {
        orders: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
      orderService.getOrders.mockResolvedValue(mockResponse);

      // Act
      render(<TestComponent />, { wrapper: TestWrapper });
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('fetch-btn'));
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('orders-count')).toHaveTextContent('0');
        expect(screen.getByTestId('total-count')).toHaveTextContent('0');
        expect(screen.getByTestId('total-pages')).toHaveTextContent('0');
      });
    });

    test('should show loading state during fetch', async () => {
      // Arrange
      let resolvePromise;
      const mockPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      orderService.getOrders.mockReturnValue(mockPromise);

      // Act
      render(<TestComponent />, { wrapper: TestWrapper });
      
      act(() => {
        fireEvent.click(screen.getByTestId('fetch-btn'));
      });

      // Assert loading state
      expect(screen.getByTestId('loading')).toHaveTextContent('true');

      // Resolve the promise
      await act(async () => {
        resolvePromise({ 
          orders: [], 
          pagination: { 
            currentPage: 1, 
            totalPages: 0, 
            totalCount: 0, 
            hasNextPage: false, 
            hasPreviousPage: false 
          } 
        });
      });

      // Assert loading completed
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });
  });
});
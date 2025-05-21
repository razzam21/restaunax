import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OrderCard from './OrderCard';

// Mock the useNavigate hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe('OrderCard Component', () => {
  const mockOrder = {
    id: 'order_123',
    orderNumber: 'R1-20250520-001',
    customerName: 'John Doe',
    orderType: 'delivery',
    status: 'pending',
    total: 42.50,
    createdAt: '2025-05-20T14:30:00Z',
    items: [
      { id: 'item_1', name: 'Margherita Pizza', quantity: 2, price: 15.99 },
      { id: 'item_2', name: 'Caesar Salad', quantity: 1, price: 10.52 },
    ],
  };

  const mockOrderWithoutOrderNumber = {
    ...mockOrder,
    orderNumber: null,
  };

  const mockOnUpdateStatus = jest.fn();

  test('renders order card with correct order number', () => {
    render(
      <BrowserRouter>
        <OrderCard order={mockOrder} onUpdateStatus={mockOnUpdateStatus} />
      </BrowserRouter>
    );

    // Check if the order number is displayed correctly
    expect(screen.getByText(/Order #R1-20250520-001/i)).toBeTruthy();
    
    // Other order details
    expect(screen.getByText(/John Doe/i)).toBeTruthy();
    expect(screen.getByText(/delivery/i)).toBeTruthy();
    expect(screen.getByText(/\$42.50/i)).toBeTruthy();
  });

  test('falls back to ID when order number is not available', () => {
    render(
      <BrowserRouter>
        <OrderCard order={mockOrderWithoutOrderNumber} onUpdateStatus={mockOnUpdateStatus} />
      </BrowserRouter>
    );

    // Should display part of the ID as fallback
    expect(screen.getByText(/Order #order_12/i)).toBeTruthy();
  });

  test('displays correct status label', () => {
    render(
      <BrowserRouter>
        <OrderCard order={mockOrder} onUpdateStatus={mockOnUpdateStatus} />
      </BrowserRouter>
    );

    // Status label should be displayed and be uppercase
    expect(screen.getByText('PENDING')).toBeTruthy();
  });

  test('allows status update with the appropriate button', () => {
    render(
      <BrowserRouter>
        <OrderCard order={mockOrder} onUpdateStatus={mockOnUpdateStatus} />
      </BrowserRouter>
    );

    // Find and click the status update button
    const updateButton = screen.getByText(/Mark preparing/i);
    expect(updateButton).toBeTruthy();
    
    fireEvent.click(updateButton);
    
    // Check if the update function was called with the correct parameters
    expect(mockOnUpdateStatus).toHaveBeenCalledWith(mockOrder.id, 'preparing');
  });

  test('shows view details button', () => {
    render(
      <BrowserRouter>
        <OrderCard order={mockOrder} onUpdateStatus={mockOnUpdateStatus} />
      </BrowserRouter>
    );

    // View details button should be present
    expect(screen.getByText(/View Details/i)).toBeTruthy();
  });
});
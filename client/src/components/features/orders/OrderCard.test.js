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
    id: 'ord_123456',
    restaurantId: 'rest_1',
    customerName: 'Alex Johnson',
    orderType: 'delivery',
    status: 'pending',
    total: 42.5,
    createdAt: '2023-01-01T12:00:00Z',
    items: [
      {
        id: 'item_1',
        name: 'Margherita Pizza',
        quantity: 2,
        price: 15.99,
      },
      {
        id: 'item_2',
        name: 'Caesar Salad',
        quantity: 1,
        price: 8.99,
      },
    ],
  };

  const mockUpdateStatus = jest.fn();

  const renderOrderCard = (order = mockOrder) => {
    return render(
      <BrowserRouter>
        <OrderCard order={order} onUpdateStatus={mockUpdateStatus} />
      </BrowserRouter>
    );
  };

  it('should render order details correctly', () => {
    renderOrderCard();

    // Check if order information is displayed
    expect(screen.getByText(/Order #123456/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer:/i)).toBeInTheDocument();
    expect(screen.getByText(/Alex Johnson/i)).toBeInTheDocument();
    expect(screen.getByText(/delivery/i)).toBeInTheDocument();
    expect(screen.getByText(/\$42.50/i)).toBeInTheDocument();
    
    // Check for status chip
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    
    // Check for buttons
    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByText('Mark preparing')).toBeInTheDocument();
  });

  it('should call onUpdateStatus when update button is clicked', () => {
    renderOrderCard();
    
    // Click the update status button
    fireEvent.click(screen.getByText('Mark preparing'));
    
    // Check if update function was called with correct parameters
    expect(mockUpdateStatus).toHaveBeenCalledWith('ord_123456', 'preparing');
  });

  it('should not show update button for delivered orders', () => {
    const deliveredOrder = {
      ...mockOrder,
      status: 'delivered',
    };
    
    renderOrderCard(deliveredOrder);
    
    // Status chip should show DELIVERED
    expect(screen.getByText('DELIVERED')).toBeInTheDocument();
    
    // Update button should not be present
    expect(screen.queryByText(/Mark/i)).not.toBeInTheDocument();
  });

  it('should show correct next status button based on current status', () => {
    // Test with preparing status
    const preparingOrder = {
      ...mockOrder,
      status: 'preparing',
    };
    
    renderOrderCard(preparingOrder);
    expect(screen.getByText('Mark ready')).toBeInTheDocument();
    
    // Test with ready status
    const readyOrder = {
      ...mockOrder,
      status: 'ready',
    };
    
    renderOrderCard(readyOrder);
    expect(screen.getByText('Mark delivered')).toBeInTheDocument();
  });
});
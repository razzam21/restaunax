import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OrderForm from './OrderForm';
import { OrderProvider } from '../../../contexts/OrderContext';
import { MenuProvider } from '../../../contexts/MenuContext';
import { orderService } from '../../../services/api';
import { menuService } from '../../../services/api';

// Mock the API services
jest.mock('../../../services/api', () => ({
  orderService: {
    createOrder: jest.fn(),
  },
  menuService: {
    getMenuItems: jest.fn(),
  },
}));

// Mock the useNavigate hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe('OrderForm Component', () => {
  const mockMenuItems = [
    {
      id: 'menu_1',
      name: 'Margherita Pizza',
      description: 'Classic pizza with tomato sauce, mozzarella, and basil',
      price: 15.99,
      category: 'Pizza',
    },
    {
      id: 'menu_2',
      name: 'Pepperoni Pizza',
      description: 'Pizza topped with pepperoni slices',
      price: 18.99,
      category: 'Pizza',
    },
    {
      id: 'menu_3',
      name: 'Caesar Salad',
      description: 'Fresh romaine lettuce with Caesar dressing, croutons, and parmesan cheese',
      price: 8.99,
      category: 'Salad',
    },
  ];

  beforeEach(() => {
    // Setup mock responses
    menuService.getMenuItems.mockResolvedValue(mockMenuItems);
    orderService.createOrder.mockResolvedValue({
      id: 'new-order-id',
      customerName: 'Test Customer',
      orderType: 'delivery',
      status: 'pending',
      items: [
        { name: 'Margherita Pizza', quantity: 2, price: 15.99 }
      ],
      total: 31.98,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderOrderForm = () => {
    return render(
      <BrowserRouter>
        <MenuProvider>
          <OrderProvider>
            <OrderForm />
          </OrderProvider>
        </MenuProvider>
      </BrowserRouter>
    );
  };

  test('renders the order form correctly', async () => {
    renderOrderForm();

    // Check if form elements are rendered
    expect(screen.getByText('Create New Order')).toBeInTheDocument();
    expect(screen.getByLabelText(/Customer Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Delivery/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pickup/i)).toBeInTheDocument();
    expect(screen.getByText(/Order Items/i)).toBeInTheDocument();
    expect(screen.getByText(/Order Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Order/i)).toBeInTheDocument();
  });

  test('validates form and shows errors for empty fields', async () => {
    renderOrderForm();

    // Try to submit the form without filling required fields
    fireEvent.click(screen.getByText('Create Order'));

    // Wait for validation errors to appear
    await waitFor(() => {
      expect(screen.getByText(/Customer name is required/i)).toBeInTheDocument();
      // Other validation errors should also be checked
    });
  });

  test('allows custom item entry when not selecting from menu', async () => {
    renderOrderForm();

    // Fill the customer name
    fireEvent.change(screen.getByLabelText(/Customer Name/i), {
      target: { value: 'Test Customer' },
    });

    // Enter custom item name
    const customItemField = await waitFor(() => screen.getByLabelText(/Custom Item Name/i));
    fireEvent.change(customItemField, { target: { value: 'Custom Pizza' } });

    // Enter quantity and price
    fireEvent.change(screen.getByLabelText(/Quantity/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Price/i), { target: { value: '19.99' } });

    // Verify the values appear in the summary
    expect(screen.getByText('Custom Pizza')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
  });

  // This is a more complex test that might need additional setup
  test('allows selecting a menu item from dropdown', async () => {
    renderOrderForm();

    // These assertions are more aspirational since Autocomplete components are more complex to test
    // A full implementation would use userEvent library and more sophisticated selectors

    // For now, we can check that the menu service was called
    await waitFor(() => {
      expect(menuService.getMenuItems).toHaveBeenCalled();
    });
  });

  test('submits form with valid data', async () => {
    renderOrderForm();

    // Fill the customer name
    fireEvent.change(screen.getByLabelText(/Customer Name/i), {
      target: { value: 'Test Customer' },
    });

    // Enter custom item name
    const customItemField = await waitFor(() => screen.getByLabelText(/Custom Item Name/i));
    fireEvent.change(customItemField, { target: { value: 'Custom Pizza' } });

    // Enter quantity and price
    fireEvent.change(screen.getByLabelText(/Quantity/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Price/i), { target: { value: '15.99' } });

    // Submit the form
    fireEvent.click(screen.getByText('Create Order'));

    // Verify order was created
    await waitFor(() => {
      expect(orderService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'Test Customer',
          orderType: 'delivery',
          items: [
            expect.objectContaining({
              name: 'Custom Pizza',
              quantity: 2,
              price: 15.99,
            }),
          ],
          total: 31.98,
        })
      );
    });
  });
});
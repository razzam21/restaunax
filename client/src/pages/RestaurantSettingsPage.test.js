import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RestaurantSettingsPage from './RestaurantSettingsPage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { restaurantService } from '../services/api';

// Mock dependencies
jest.mock('../contexts/AuthContext');
jest.mock('../contexts/ThemeContext');
jest.mock('../services/api', () => ({
  restaurantService: {
    getRestaurantById: jest.fn(),
    getAvailableThemes: jest.fn(),
    updateRestaurantSettings: jest.fn()
  }
}));

// Mock hook for useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

describe('RestaurantSettingsPage', () => {
  const mockOwnerUser = {
    id: 'user_1',
    username: 'owner',
    role: 'owner',
    restaurantId: 'rest_1'
  };
  
  const mockNonOwnerUser = {
    id: 'user_2',
    username: 'staff',
    role: 'wait_staff',
    restaurantId: 'rest_1'
  };
  
  const mockRestaurant = {
    id: 'rest_1',
    name: 'Test Restaurant',
    themeId: 'rest_1',
    primaryColor: '#1A365D',
    secondaryColor: '#9C4221'
  };
  
  const mockThemes = [
    {
      id: 'default',
      name: 'Default Theme',
      description: 'The default theme',
      primaryColor: '#2C4A7A',
      secondaryColor: '#D97A3A'
    },
    {
      id: 'rest_1',
      name: 'Blue Ocean Theme',
      description: 'Blue theme',
      primaryColor: '#1A365D',
      secondaryColor: '#9C4221'
    }
  ];
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mocks
    useAuth.mockReturnValue({
      user: mockOwnerUser
    });
    
    useTheme.mockReturnValue({
      theme: {
        palette: {
          primary: { main: '#1A365D' },
          secondary: { main: '#9C4221' }
        }
      },
      themeInfo: {
        name: 'Blue Ocean Theme'
      },
      loading: false,
      changeTheme: jest.fn()
    });
    
    restaurantService.getRestaurantById.mockResolvedValue({
      success: true,
      data: mockRestaurant
    });
    
    restaurantService.getAvailableThemes.mockResolvedValue({
      success: true,
      data: mockThemes
    });
    
    restaurantService.updateRestaurantSettings.mockResolvedValue({
      success: true,
      data: mockRestaurant,
      message: 'Settings updated successfully'
    });
  });
  
  test('renders access denied message for non-owner users', () => {
    // Override auth mock to return non-owner user
    useAuth.mockReturnValue({
      user: mockNonOwnerUser
    });
    
    render(
      <MemoryRouter>
        <RestaurantSettingsPage />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('Only restaurant owners can access these settings.')).toBeInTheDocument();
  });
  
  test('renders loading state initially', () => {
    // Mock loading state
    useTheme.mockReturnValue({
      ...useTheme(),
      loading: true
    });
    
    render(
      <MemoryRouter>
        <RestaurantSettingsPage />
      </MemoryRouter>
    );
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
  
  test('displays restaurant information when loaded', async () => {
    render(
      <MemoryRouter>
        <RestaurantSettingsPage />
      </MemoryRouter>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(restaurantService.getRestaurantById).toHaveBeenCalledWith('rest_1');
      expect(restaurantService.getAvailableThemes).toHaveBeenCalled();
    });
    
    // Check if the form contains restaurant data
    const nameInput = screen.getByLabelText('Restaurant Name');
    expect(nameInput).toHaveValue('Test Restaurant');
  });
  
  test('shows theme selection dropdown with available themes', async () => {
    render(
      <MemoryRouter>
        <RestaurantSettingsPage />
      </MemoryRouter>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(restaurantService.getAvailableThemes).toHaveBeenCalled();
    });
    
    // Open the dropdown
    fireEvent.mouseDown(screen.getByLabelText('Theme'));
    
    // Verify themes are displayed
    await waitFor(() => {
      expect(screen.getByText('Default Theme')).toBeInTheDocument();
      expect(screen.getByText('Blue Ocean Theme')).toBeInTheDocument();
    });
  });
  
  test('previews theme when preview button is clicked', async () => {
    const changeThemeMock = jest.fn();
    useTheme.mockReturnValue({
      ...useTheme(),
      changeTheme: changeThemeMock
    });
    
    render(
      <MemoryRouter>
        <RestaurantSettingsPage />
      </MemoryRouter>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(restaurantService.getRestaurantById).toHaveBeenCalled();
    });
    
    // Click the preview button
    fireEvent.click(screen.getByText('Preview Theme'));
    
    // Verify changeTheme was called
    expect(changeThemeMock).toHaveBeenCalledWith('rest_1');
  });
  
  test('saves settings when form is submitted', async () => {
    render(
      <MemoryRouter>
        <RestaurantSettingsPage />
      </MemoryRouter>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(restaurantService.getRestaurantById).toHaveBeenCalled();
    });
    
    // Update the restaurant name
    const nameInput = screen.getByLabelText('Restaurant Name');
    fireEvent.change(nameInput, { target: { value: 'Updated Restaurant Name' } });
    
    // Submit the form
    fireEvent.click(screen.getAllByText('Save Changes')[0]);
    
    // Verify API was called with updated data
    await waitFor(() => {
      expect(restaurantService.updateRestaurantSettings).toHaveBeenCalledWith(
        'rest_1',
        expect.objectContaining({
          name: 'Updated Restaurant Name',
          themeId: 'rest_1'
        })
      );
    });
    
    // Verify success message appears
    expect(screen.getByText('Restaurant settings updated successfully!')).toBeInTheDocument();
  });
  
  test('displays error message when API call fails', async () => {
    // Mock API error
    restaurantService.updateRestaurantSettings.mockRejectedValue({
      response: {
        data: {
          error: 'Failed to update settings'
        }
      }
    });
    
    render(
      <MemoryRouter>
        <RestaurantSettingsPage />
      </MemoryRouter>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(restaurantService.getRestaurantById).toHaveBeenCalled();
    });
    
    // Submit the form
    fireEvent.click(screen.getAllByText('Save Changes')[0]);
    
    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText('Failed to update settings')).toBeInTheDocument();
    });
  });
});
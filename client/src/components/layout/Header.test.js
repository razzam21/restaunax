import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

// Mock the auth and theme hooks
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

// Mock useNavigate hook
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    useNavigate: () => jest.fn(),
  };
});

describe('Header', () => {
  // Mock theme data
  const mockTheme = {
    palette: {
      primary: { main: '#1A365D' },
      secondary: { main: '#9C4221' }
    }
  };

  // Default auth data setup
  beforeEach(() => {
    useAuth.mockReturnValue({
      user: {
        username: 'testuser',
        restaurantId: 'rest_1',
        role: 'wait_staff'
      },
      logout: jest.fn(),
    });
    
    useTheme.mockReturnValue({
      theme: mockTheme,
      themeInfo: {
        id: 'rest_1',
        name: 'Restaunax Demo Restaurant',
        theme: {
          id: 'rest_1',
          primaryColor: '#2C4A7A',
          secondaryColor: '#D97A3A'
        }
      },
      loading: false,
    });
  });

  test('displays the application title', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Restaunax Dashboard')).toBeInTheDocument();
  });

  test('displays user information when user is logged in', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('Restaurant ID: rest_1')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  test('displays theme information with restaurant name', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Restaunax Demo Restaurant')).toBeInTheDocument();
  });

  test('displays theme loading state', () => {
    // Override the mock to simulate theme loading
    useTheme.mockReturnValue({
      theme: mockTheme,
      themeInfo: null,
      loading: true,
    });
    
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Loading theme...')).toBeInTheDocument();
  });

  test('falls back to restaurant ID when theme info is missing', () => {
    // Override the mock to simulate missing theme info
    useTheme.mockReturnValue({
      theme: mockTheme,
      themeInfo: null,
      loading: false,
    });
    
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Theme: rest_1')).toBeInTheDocument();
  });

  test('does not display user information when user is not logged in', () => {
    // Override the mock to simulate not logged in
    useAuth.mockReturnValue({
      user: null,
      logout: jest.fn(),
    });
    
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    
    expect(screen.queryByText('testuser')).not.toBeInTheDocument();
    expect(screen.queryByText('Restaurant ID: rest_1')).not.toBeInTheDocument();
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    expect(screen.queryByText('Theme: rest_1')).not.toBeInTheDocument();
  });
  
  test('displays settings icon for users with owner role', () => {
    // Override auth mock to return owner user
    useAuth.mockReturnValue({
      user: {
        username: 'owneruser',
        restaurantId: 'rest_1',
        role: 'owner'
      },
      logout: jest.fn(),
    });
    
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    
    // Find the settings button using the aria-label from the Tooltip
    const settingsButton = screen.getByLabelText('Restaurant Settings');
    expect(settingsButton).toBeInTheDocument();
  });
  
  test('does not display settings icon for non-owner users', () => {
    // Default auth mock returns wait_staff role
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    
    // Settings button should not be present
    expect(screen.queryByLabelText('Restaurant Settings')).not.toBeInTheDocument();
  });
  
  test('calls logout function when logout button is clicked', () => {
    const mockLogout = jest.fn();
    useAuth.mockReturnValue({
      user: {
        username: 'testuser',
        restaurantId: 'rest_1',
        role: 'wait_staff'
      },
      logout: mockLogout,
    });
    
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    
    // Click the logout button
    fireEvent.click(screen.getByText('Logout'));
    
    // Verify logout was called
    expect(mockLogout).toHaveBeenCalled();
  });
});
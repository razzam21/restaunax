import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import { AuthProvider } from './AuthContext';
import * as authHooks from './AuthContext';
import defaultTheme from '../themes/default';
import rest1Theme from '../themes/rest_1';
import rest2Theme from '../themes/rest_2';

// Mock the AuthContext to control its values
jest.mock('./AuthContext', () => {
  const originalModule = jest.requireActual('./AuthContext');
  return {
    ...originalModule,
    useAuth: jest.fn(),
  };
});

// Component to test the useTheme hook
const TestComponent = () => {
  const { theme, changeTheme } = useTheme();
  
  return (
    <div>
      <div data-testid="primary-color">{theme.palette.primary.main}</div>
      <div data-testid="secondary-color">{theme.palette.secondary.main}</div>
      <button 
        data-testid="change-theme-btn" 
        onClick={() => changeTheme('rest_2')}
      >
        Change Theme
      </button>
    </div>
  );
};

describe('ThemeContext', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses default theme when user is not authenticated', () => {
    // Mock AuthContext to return not authenticated
    authHooks.useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
    });

    render(
      <AuthProvider>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthProvider>
    );

    // Default theme's primary color
    expect(screen.getByTestId('primary-color')).toHaveTextContent(defaultTheme.palette.primary.main);
  });
  
  test('uses restaurant specific theme when user is authenticated', () => {
    // Mock AuthContext to return authenticated with restaurant ID
    authHooks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        restaurantId: 'rest_1',
        username: 'test',
        role: 'wait_staff',
      },
    });

    render(
      <AuthProvider>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthProvider>
    );

    // Restaurant 1 theme's primary color
    expect(screen.getByTestId('primary-color')).toHaveTextContent(rest1Theme.palette.primary.main);
  });
  
  test('switches theme when user changes restaurant', () => {
    // Start with restaurant 1
    authHooks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        restaurantId: 'rest_1',
        username: 'test',
        role: 'wait_staff',
      },
    });

    render(
      <AuthProvider>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthProvider>
    );

    // Initial theme is for restaurant 1
    expect(screen.getByTestId('primary-color')).toHaveTextContent(rest1Theme.palette.primary.main);
    
    // Now update the mock to change restaurant ID
    act(() => {
      authHooks.useAuth.mockReturnValue({
        isAuthenticated: true,
        user: {
          restaurantId: 'rest_2',
          username: 'test2',
          role: 'wait_staff',
        },
      });
    });
    
    // Re-render to trigger the effect
    render(
      <AuthProvider>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthProvider>
    );
    
    // Theme should now be for restaurant 2
    expect(screen.getByTestId('primary-color')).toHaveTextContent(rest2Theme.palette.primary.main);
  });
  
  test('can manually change theme', () => {
    // Start with default theme
    authHooks.useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
    });

    render(
      <AuthProvider>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthProvider>
    );

    // Initial theme is default
    expect(screen.getByTestId('primary-color')).toHaveTextContent(defaultTheme.palette.primary.main);
    
    // Manually change theme using the changeTheme function
    act(() => {
      screen.getByTestId('change-theme-btn').click();
    });
    
    // Theme should now be for restaurant 2
    expect(screen.getByTestId('primary-color')).toHaveTextContent(rest2Theme.palette.primary.main);
  });
});
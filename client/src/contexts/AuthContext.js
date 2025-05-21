import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authService } from '../services/api';
import { clearAuthData } from '../utils/tokenUtils';

// Create auth context
const AuthContext = createContext();

// Hook to use auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth from localStorage
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedToken = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear any invalid data
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = useCallback(async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.login({ username, password });
      
      // Save to state
      setAccessToken(response.accessToken);
      setUser(response.user);
      setIsAuthenticated(true);
      
      // Save to localStorage for persistence
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      return response;
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      
      await authService.logout();
      
      // Clear state
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
      
      // Clear localStorage
      clearAuthData();
    } catch (error) {
      console.error('Logout error:', error);
      
      // Clear auth state anyway
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
      clearAuthData();
      
      setError(error.response?.data?.error || 'Logout failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await authService.refreshToken();
      
      // Update access token
      setAccessToken(response.accessToken);
      
      // Save to localStorage
      localStorage.setItem('accessToken', response.accessToken);
      
      return response;
    } catch (error) {
      console.error('Token refresh error:', error);
      
      // On error, force logout
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
      clearAuthData();
      
      setError(error.response?.data?.error || 'Token refresh failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user has required role
  const hasRole = useCallback((requiredRoles) => {
    if (!user) return false;
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(user.role);
  }, [user]);

  // Context value
  const contextValue = {
    user,
    accessToken,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    refreshToken,
    hasRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
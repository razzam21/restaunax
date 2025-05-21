import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

import Header from './components/layout/Header';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrderFormPage from './pages/OrderFormPage';
import LoginPage from './components/auth/LoginPage';
import UnauthorizedPage from './components/auth/UnauthorizedPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { OrderProvider } from './contexts/OrderContext';
import { MenuProvider } from './contexts/MenuContext';
import { AuthProvider } from './contexts/AuthContext';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#2C4A7A', // Slightly Dark Blue
    },
    secondary: {
      main: '#D97A3A', // Slightly Dark Orange
    },
    background: {
      default: '#F9FAFB', // Off-White
      paper: '#FFFFFF',
    },
    info: {
      main: '#4A8B8C', // Muted Teal
    },
    error: {
      main: '#A8333B', // Deep Red
    },
  },
});

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <MenuProvider>
          <OrderProvider>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                bgcolor: 'background.default',
              }}
            >
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                
                {/* Root redirect */}
                <Route path="/" element={<Navigate to="/orders" replace />} />
                
                {/* Handle common typo of "/order" instead of "/orders" */}
                <Route path="/order" element={<Navigate to="/orders" replace />} />
                
                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<>
                    <Header />
                    <Box component="main" sx={{ flexGrow: 1 }}>
                      <Outlet />
                    </Box>
                  </>}>
                    {/* Order routes */}
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/orders/new" element={<OrderFormPage />} />
                    <Route path="/orders/:id" element={<OrderDetailPage />} />
                  </Route>
                </Route>
                
                {/* Catch any other routes and redirect to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Box>
          </OrderProvider>
        </MenuProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
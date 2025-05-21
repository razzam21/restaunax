import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

import Header from './components/layout/Header';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrderFormPage from './pages/OrderFormPage';
import RestaurantSettingsPage from './pages/RestaurantSettingsPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import LoginPage from './components/auth/LoginPage';
import UnauthorizedPage from './components/auth/UnauthorizedPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { OrderProvider } from './contexts/OrderContext';
import { MenuProvider } from './contexts/MenuContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DashboardProvider } from './contexts/DashboardContext';
import { ReportProvider } from './contexts/ReportContext';

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MenuProvider>
          <OrderProvider>
            <DashboardProvider>
              <ReportProvider>
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
                    
                    {/* Dashboard & Reports - accessible by manager & owner */}
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    
                    {/* Restaurant settings - accessible by owner */}
                    <Route path="/settings" element={<RestaurantSettingsPage />} />
                  </Route>
                </Route>
                
                {/* Catch any other routes and redirect to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Box>
              </ReportProvider>
            </DashboardProvider>
          </OrderProvider>
        </MenuProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
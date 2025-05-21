import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import Header from './components/layout/Header';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrderFormPage from './pages/OrderFormPage';
import { OrderProvider } from './contexts/OrderContext';
import { MenuProvider } from './contexts/MenuContext';

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
            <Header />
            <Box component="main" sx={{ flexGrow: 1 }}>
              <Routes>
                <Route path="/" element={<Navigate to="/orders" replace />} />
                
                {/* Handle common typo of "/order" instead of "/orders" */}
                <Route path="/order" element={<Navigate to="/orders" replace />} />
                
                {/* Main routes */}
                <Route path="/orders" element={<OrdersPage />} />
                
                {/* Important: Order matters - put more specific routes first */}
                <Route path="/orders/new" element={<OrderFormPage />} />
                <Route path="/orders/:id" element={<OrderDetailPage />} />
                
                {/* Catch any other routes and redirect to orders */}
                <Route path="*" element={<Navigate to="/orders" replace />} />
              </Routes>
            </Box>
          </Box>
        </OrderProvider>
      </MenuProvider>
    </ThemeProvider>
  );
};

export default App;
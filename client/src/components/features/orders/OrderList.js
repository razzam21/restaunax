import { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Grid,
  Typography,
  Divider,
  Button,
  Pagination,
  Paper,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useNavigate } from 'react-router-dom';

import OrderCard from './OrderCard';
import Loading from '../../common/Loading';
import ErrorMessage from '../../common/ErrorMessage';
import { useOrders } from '../../../contexts/OrderContext';

const OrderList = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { orders, loading, error, pagination, isConnected, fetchOrders, updateOrderStatus } = useOrders();
  const navigate = useNavigate();

  // Re-fetch orders on mount
  useEffect(() => {
    console.log('OrderList mounted, fetching orders');
    fetchOrders(activeTab === 'all' ? null : activeTab, currentPage).catch(err => {
      console.error('OrderList fetch error:', err);
    });
  }, [fetchOrders, activeTab, currentPage]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setCurrentPage(1); // Reset to first page when changing tabs
    // Fetch orders for the new tab
    const status = newValue === 'all' ? null : newValue;
    fetchOrders(status, 1);
  };

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
    const status = activeTab === 'all' ? null : activeTab;
    fetchOrders(status, page);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateOrderStatus(id, status);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleCreateOrder = () => {
    navigate('/orders/new');
  };

  const handleRetry = () => {
    console.log('Retrying order fetch');
    const status = activeTab !== 'all' ? activeTab : null;
    fetchOrders(status, currentPage);
  };

  console.log('OrderList render state:', { 
    activeTab, 
    currentPage,
    orders: orders.length, 
    pagination,
    loading, 
    error 
  });

  if (loading && orders.length === 0) {
    return <Loading message="Loading orders..." />;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Orders
          </Typography>
          <Chip
            icon={isConnected ? <WifiIcon /> : <WifiOffIcon />}
            label={isConnected ? 'Live' : 'Offline'}
            color={isConnected ? 'success' : 'default'}
            size="small"
          />
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateOrder}
        >
          New Order
        </Button>
      </Box>

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        sx={{ mb: 3 }}
      >
        <Tab label="All" value="all" />
        <Tab label="Pending" value="pending" />
        <Tab label="Preparing" value="preparing" />
        <Tab label="Ready" value="ready" />
        <Tab label="Delivered" value="delivered" />
      </Tabs>

      <Divider sx={{ mb: 3 }} />

      {error && (
        <ErrorMessage 
          message={`Error: ${error}. Please check your connection and try again.`} 
          onRetry={handleRetry} 
        />
      )}

      {!error && orders.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6">No orders found</Typography>
          <Typography variant="body1" color="textSecondary">
            {activeTab === 'all'
              ? 'Create a new order to get started'
              : `No ${activeTab} orders available`}
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            {orders.map((order) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={order.id}>
                <OrderCard
                  order={order}
                  onUpdateStatus={handleUpdateStatus}
                />
              </Grid>
            ))}
          </Grid>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Paper sx={{ p: 2, mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Showing {orders.length} of {pagination.totalCount} orders
                  {activeTab !== 'all' && ` (${activeTab} status)`}
                </Typography>
                <Pagination
                  count={pagination.totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </Box>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default OrderList;
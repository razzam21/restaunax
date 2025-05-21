import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Grid,
  Typography,
  Divider,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

import OrderCard from './OrderCard';
import Loading from '../../common/Loading';
import ErrorMessage from '../../common/ErrorMessage';
import { useOrders } from '../../../contexts/OrderContext';

const OrderList = () => {
  const [activeTab, setActiveTab] = useState('all');
  const { orders, loading, error, fetchOrders, updateOrderStatus } = useOrders();
  const navigate = useNavigate();

  // Re-fetch orders on mount
  useEffect(() => {
    console.log('OrderList mounted, fetching orders');
    fetchOrders().catch(err => {
      console.error('OrderList fetch error:', err);
    });
  }, [fetchOrders]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // If not 'all', filter by status
    if (newValue !== 'all') {
      fetchOrders(newValue);
    } else {
      fetchOrders();
    }
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
    fetchOrders(activeTab !== 'all' ? activeTab : undefined);
  };

  // Filter orders based on active tab
  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter(order => order.status === activeTab);

  console.log('OrderList render state:', { 
    activeTab, 
    orders: orders.length, 
    filteredOrders: filteredOrders.length, 
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
        <Typography variant="h4" component="h1" gutterBottom>
          Orders
        </Typography>
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

      {!error && filteredOrders.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6">No orders found</Typography>
          <Typography variant="body1" color="textSecondary">
            {activeTab === 'all'
              ? 'Create a new order to get started'
              : `No ${activeTab} orders available`}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredOrders.map((order) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={order.id}>
              <OrderCard
                order={order}
                onUpdateStatus={handleUpdateStatus}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default OrderList;
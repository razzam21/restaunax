import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Chip,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';

import { useOrders } from '../../../contexts/OrderContext';
import Loading from '../../common/Loading';
import ErrorMessage from '../../common/ErrorMessage';
import webSocketService from '../../../services/websocket';

// Status colors
const statusColors = {
  pending: 'warning',
  preparing: 'info',
  ready: 'success',
  delivered: 'secondary',
};

// Format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getOrderById, updateOrderStatus, isConnected } = useOrders();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const data = await getOrderById(id);
        if (data) {
          setOrder(data);
          setSelectedStatus(data.status);
        }
      } catch (err) {
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, getOrderById]);

  // Handle WebSocket messages for real-time order updates
  const handleWebSocketMessage = useCallback((data) => {
    if (!order) return;

    // Only handle order status changes for this specific order
    if (data.type === 'order_status_change' && data.data.orderId === order.id) {
      console.log('OrderDetail: Received status change for current order');
      setOrder(prevOrder => ({
        ...prevOrder,
        status: data.data.status
      }));
      setSelectedStatus(data.data.status);
    }
  }, [order]);

  // Subscribe to WebSocket events for real-time updates
  useEffect(() => {
    if (!order) return;

    console.log('OrderDetail: Setting up WebSocket subscription for order', order.id);
    const unsubscribe = webSocketService.subscribe('message', handleWebSocketMessage);

    return () => {
      console.log('OrderDetail: Cleaning up WebSocket subscription');
      unsubscribe();
    };
  }, [order, handleWebSocketMessage]);

  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value);
  };

  const handleUpdateStatus = async () => {
    if (selectedStatus && selectedStatus !== order.status) {
      try {
        const updatedOrder = await updateOrderStatus(id, selectedStatus);
        setOrder(updatedOrder);
      } catch (err) {
        setError('Failed to update order status');
      }
    }
  };

  const getValidStatusTransitions = () => {
    switch (order?.status) {
      case 'pending':
        return ['pending', 'preparing'];
      case 'preparing':
        return ['preparing', 'ready'];
      case 'ready':
        return ['ready', 'delivered'];
      case 'delivered':
        return ['delivered'];
      default:
        return ['pending'];
    }
  };

  if (loading) {
    return <Loading message="Loading order details..." />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!order) {
    return <ErrorMessage message="Order not found" />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/orders')}
          sx={{ mr: 2 }}
        >
          Back to Orders
        </Button>
        <Typography variant="h4" component="h1">
          Order Details
        </Typography>
        <Chip
          icon={isConnected ? <WifiIcon /> : <WifiOffIcon />}
          label={isConnected ? 'Live' : 'Offline'}
          color={isConnected ? 'success' : 'default'}
          size="small"
          sx={{ ml: 2 }}
        />
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h5">
            Order #{order.orderNumber || order.id.slice(0, 8)}
          </Typography>
          <Chip
            label={order.status.toUpperCase()}
            color={statusColors[order.status]}
          />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Order Information
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Customer:</strong> {order.customerName}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Order Type:</strong> {order.orderType}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Total:</strong> ${order.total.toFixed(2)}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Created At:</strong> {formatDate(order.createdAt)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Status Management
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 2,
                  }}
                >
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={selectedStatus}
                      label="Status"
                      onChange={handleStatusChange}
                    >
                      {getValidStatusTransitions().map((status) => (
                        <MenuItem key={status} value={status}>
                          {status.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleUpdateStatus}
                    disabled={selectedStatus === order.status}
                    sx={{ mb: 2 }}
                  >
                    Update Status
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ mb: 2 }}>
          Order Items
        </Typography>

        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Subtotal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">${item.price.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    ${(item.quantity * item.price).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} align="right">
                  <strong>Total</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>${order.total.toFixed(2)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default OrderDetail;
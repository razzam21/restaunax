import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

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

const OrderCard = ({ order, onUpdateStatus }) => {
  const navigate = useNavigate();

  const getNextStatus = () => {
    switch (order.status) {
      case 'pending':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'delivered';
      default:
        return null;
    }
  };

  const handleUpdateStatus = async () => {
    const nextStatus = getNextStatus();
    if (nextStatus) {
      try {
        await onUpdateStatus(order.id, nextStatus);
      } catch (error) {
        console.error('Error updating status:', error);
      }
    }
  };

  const handleViewDetails = () => {
    navigate(`/orders/${order.id}`);
  };

  return (
    <Card
      sx={{
        mb: 2,
        boxShadow: 2,
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3,
        },
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1,
          }}
        >
          <Typography variant="h6">Order #{order.orderNumber || order.id.slice(0, 8)}</Typography>
          <Chip
            label={order.status.toUpperCase()}
            color={statusColors[order.status]}
            size="small"
          />
        </Box>

        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Customer:</strong> {order.customerName}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Type:</strong> {order.orderType}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Total:</strong> ${order.total.toFixed(2)}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Created:</strong> {formatDate(order.createdAt)}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 2,
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={handleViewDetails}
          >
            View Details
          </Button>
          {getNextStatus() && (
            <Button
              variant="contained"
              size="small"
              onClick={handleUpdateStatus}
              color={statusColors[getNextStatus()]}
            >
              Mark {getNextStatus()}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default OrderCard;
import React from 'react';
import { Container } from '@mui/material';
import OrderDetail from '../components/features/orders/OrderDetail';

const OrderDetailPage = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <OrderDetail />
    </Container>
  );
};

export default OrderDetailPage;
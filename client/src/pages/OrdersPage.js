// Orders page component
import { Container } from '@mui/material';
import OrderList from '../components/features/orders/OrderList';

const OrdersPage = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <OrderList />
    </Container>
  );
};

export default OrdersPage;
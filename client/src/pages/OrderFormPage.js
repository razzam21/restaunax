// No React import needed for this component
import { Container } from '@mui/material';
import OrderForm from '../components/features/orders/OrderForm';

const OrderFormPage = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <OrderForm />
    </Container>
  );
};

export default OrderFormPage;
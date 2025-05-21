// Unauthorized access page
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import { Link } from 'react-router-dom';
import BlockIcon from '@mui/icons-material/Block';

/**
 * Page displayed when a user tries to access a route they don't have permission for
 */
const UnauthorizedPage = () => {
  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <BlockIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
          
          <Typography variant="h4" component="h1" gutterBottom>
            Access Denied
          </Typography>
          
          <Typography variant="body1" paragraph>
            You don&apos;t have permission to access this page. This area requires higher privileges.
          </Typography>
          
          <Button
            component={Link}
            to="/orders"
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
          >
            Go to Orders
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default UnauthorizedPage;
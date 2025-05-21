// Error message component
import { Box, Alert, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const ErrorMessage = ({ message, onRetry }) => {
  return (
    <Box sx={{ p: 2 }}>
      <Alert
        severity="error"
        icon={<ErrorOutlineIcon fontSize="inherit" />}
        action={
          onRetry && (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        <Typography>{message || 'An error occurred'}</Typography>
      </Alert>
    </Box>
  );
};

export default ErrorMessage;
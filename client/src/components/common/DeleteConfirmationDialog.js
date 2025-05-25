import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';

const DeleteConfirmationDialog = ({ open, onClose, onConfirm, title, content }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="delete-confirmation-dialog-title"
      aria-describedby="delete-confirmation-dialog-description"
      fullScreen={isMobile}
      PaperProps={{
        sx: { 
          m: isMobile ? 0 : 2,
        }
      }}
    >
      <DialogTitle id="delete-confirmation-dialog-title">
        {title || "Confirm Deletion"}
      </DialogTitle>
      <DialogContent sx={{ px: isMobile ? 2 : 3 }}>
        <DialogContentText id="delete-confirmation-dialog-description">
          {content || "Are you sure you want to delete this item? This action cannot be undone."}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{
        px: isMobile ? 2 : 3,
        py: isMobile ? 1.5 : 2,
        gap: isMobile ? 1 : 0,
        flexDirection: isMobile ? 'column-reverse' : 'row',
      }}>
        <Button 
          onClick={onClose} 
          color="primary"
          sx={{ 
            minHeight: isMobile ? 48 : isTablet ? 44 : 'auto',
            order: isMobile ? 2 : 1,
          }}
          fullWidth={isMobile}
        >
          Cancel
        </Button>
        <Button 
          onClick={onConfirm} 
          color="error" 
          variant="contained" 
          autoFocus
          sx={{ 
            minHeight: isMobile ? 48 : isTablet ? 44 : 'auto',
            order: isMobile ? 1 : 2,
          }}
          fullWidth={isMobile}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
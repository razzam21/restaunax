import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Button, 
  Avatar, 
  Chip,
  Divider
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Handle logout button click
  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent multiple clicks
    
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };


  return (
    <AppBar position="static">
      <Toolbar>
        <RestaurantIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Restaunax Dashboard
        </Typography>
        
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Restaurant info */}
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Restaurant ID: {user.restaurantId}
            </Typography>
            
            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
            
            {/* User info */}
            <Chip
              avatar={<Avatar><AccountCircleIcon /></Avatar>}
              label={user.username}
              variant="filled"
              color="primary"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.15)',
                fontWeight: 'bold'
              }}
            />
            
            {/* Logout button */}
            <Button 
              color="inherit"
              size="small"
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              disabled={isLoggingOut}
              sx={{
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.2)'
                }
              }}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
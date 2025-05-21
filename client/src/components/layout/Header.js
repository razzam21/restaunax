import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Button, 
  Avatar, 
  Chip,
  Divider,
  Tooltip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import { Link } from 'react-router-dom';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PaletteIcon from '@mui/icons-material/Palette';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuth();
  const { theme, themeInfo, loading: themeLoading } = useTheme();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Menu state
  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);

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

  // Determine the theme label to show
  const getThemeLabel = () => {
    if (themeLoading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
          Loading theme...
        </Box>
      );
    }
    
    if (themeInfo?.name) {
      return `${themeInfo.name}`;
    }
    
    // Fallback to restaurant ID
    return `Theme: ${user.restaurantId}`;
  };

  // Handle menu open
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle settings click
  const handleSettingsClick = () => {
    navigate('/settings');
    handleMenuClose();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <RestaurantIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link to="/orders" style={{ color: 'inherit', textDecoration: 'none' }}>
            Restaunax Dashboard
          </Link>
        </Typography>
        
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Theme indicator */}
            <Tooltip title={`Current Theme: ${user.restaurantId}`}>
              <Chip
                icon={<PaletteIcon />}
                label={getThemeLabel()}
                size="small"
                variant="outlined"
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  display: { xs: 'none', md: 'flex' }
                }}
              />
            </Tooltip>
            
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
            
            {/* Settings icon for owners */}
            {user.role === 'owner' && (
              <Tooltip title="Restaurant Settings">
                <IconButton 
                  color="inherit" 
                  size="small"
                  onClick={handleSettingsClick}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.2)'
                    }
                  }}
                >
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            )}
            
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
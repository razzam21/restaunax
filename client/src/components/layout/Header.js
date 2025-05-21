import { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Avatar, 
  Chip,
  Divider,
  Tooltip,
  CircularProgress,
  IconButton,
  Tab,
  Tabs
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PaletteIcon from '@mui/icons-material/Palette';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuth();
  const { themeInfo, loading: themeLoading } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Determine which tab is active based on current path
  const getCurrentPath = () => {
    const path = location.pathname;
    if (path.startsWith('/orders')) return '/orders';
    if (path.startsWith('/dashboard')) return '/dashboard';
    if (path.startsWith('/reports')) return '/reports';
    if (path.startsWith('/settings')) return '/settings';
    return '/orders'; // Default
  };

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

  // No longer need menu handlers as we're now using tabs

  return (
    <AppBar position="static">
      <Toolbar>
        <RestaurantIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component={Link} to="/orders" sx={{ 
          color: 'inherit', 
          textDecoration: 'none',
          display: { xs: 'none', sm: 'block' },
          mr: 4
        }}>
          Restaunax
        </Typography>
        
        {user && (
          <>
            {/* Navigation Tabs */}
            <Tabs 
              value={getCurrentPath()} 
              aria-label="navigation tabs"
              textColor="inherit"
              indicatorColor="secondary"
              sx={{ flexGrow: 1 }}
            >
              <Tab 
                label="Orders" 
                value="/orders" 
                component={Link} 
                to="/orders" 
                icon={<RestaurantIcon />} 
                iconPosition="start"
              />
              
              {/* Dashboard & Reports tabs for manager/owner only */}
              {(user.role === 'manager' || user.role === 'owner') && (
                <>
                  <Tab 
                    label="Dashboard" 
                    value="/dashboard" 
                    component={Link} 
                    to="/dashboard" 
                    icon={<DashboardIcon />} 
                    iconPosition="start"
                  />
                  <Tab 
                    label="Reports" 
                    value="/reports" 
                    component={Link} 
                    to="/reports" 
                    icon={<AssessmentIcon />} 
                    iconPosition="start"
                  />
                </>
              )}
              
              {/* Settings tab for owner only */}
              {user.role === 'owner' && (
                <Tab 
                  label="Settings" 
                  value="/settings" 
                  component={Link} 
                  to="/settings" 
                  icon={<SettingsIcon />} 
                  iconPosition="start"
                />
              )}
            </Tabs>
            
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
              <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>
                {user.restaurantId}
              </Typography>
              
              <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
              
              {/* User info */}
              <Tooltip title={`Role: ${user.role}`}>
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
              </Tooltip>
              
              {/* Logout button */}
              <Tooltip title="Logout">
                <IconButton 
                  color="inherit" 
                  size="small"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.2)'
                    }
                  }}
                >
                  {isLoggingOut ? <CircularProgress size={20} color="inherit" /> : <LogoutIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
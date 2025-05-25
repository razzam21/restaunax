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
  Tabs,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  useTheme as useMuiTheme,
  useMediaQuery,
  Badge
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PaletteIcon from '@mui/icons-material/Palette';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, logout } = useAuth();
  const { themeInfo, loading: themeLoading } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useMuiTheme();
  
  // Responsive breakpoints
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(muiTheme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('md'));
  
  // State management
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // Determine which tab is active based on current path
  const getCurrentPath = () => {
    const path = location.pathname;
    if (path.startsWith('/orders')) return '/orders';
    if (path.startsWith('/menu')) return '/menu';
    if (path.startsWith('/dashboard')) return '/dashboard';
    if (path.startsWith('/reports')) return '/reports';
    if (path.startsWith('/ai-insights')) return '/ai-insights';
    if (path.startsWith('/system-health')) return '/system-health';
    if (path.startsWith('/settings')) return '/settings';
    return '/orders'; // Default
  };

  // Navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      { path: '/orders', label: 'Orders', icon: <RestaurantIcon />, roles: ['wait_staff', 'manager', 'owner'] }
    ];

    const managerOwnerItems = [
      { path: '/menu', label: 'Menu', icon: <RestaurantMenuIcon />, roles: ['manager', 'owner'] },
      { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, roles: ['manager', 'owner'] },
      { path: '/reports', label: 'Reports', icon: <AssessmentIcon />, roles: ['manager', 'owner'] },
      { 
        path: '/ai-insights', 
        label: 'AI Insights', 
        icon: <SmartToyIcon />, 
        roles: ['owner'],
        badge: 'Premium' 
      },
      { path: '/system-health', label: 'System Health', icon: <MonitorHeartIcon />, roles: ['manager', 'owner'] }
    ];

    const ownerItems = [
      { path: '/settings', label: 'Settings', icon: <SettingsIcon />, roles: ['owner'] }
    ];

    return [...baseItems, ...managerOwnerItems, ...ownerItems].filter(item => 
      item.roles.includes(user?.role)
    );
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

  // Mobile Drawer component
  const MobileDrawer = () => (
    <Drawer
      anchor="left"
      open={mobileDrawerOpen}
      onClose={() => setMobileDrawerOpen(false)}
      PaperProps={{
        sx: { width: 280, bgcolor: 'primary.main', color: 'white' }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RestaurantIcon />
          <Typography variant="h6">Restaunax</Typography>
        </Box>
        <IconButton color="inherit" onClick={() => setMobileDrawerOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
      
      {/* User info in drawer */}
      <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Avatar sx={{ width: 32, height: 32 }}>
            <AccountCircleIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {user?.username}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {user?.role}
            </Typography>
          </Box>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          {getThemeLabel()}
        </Typography>
      </Box>
      
      <List sx={{ flexGrow: 1 }}>
        {getNavigationItems().map((item) => (
          <ListItemButton
            key={item.path}
            component={Link}
            to={item.path}
            selected={getCurrentPath() === item.path}
            onClick={() => setMobileDrawerOpen(false)}
            sx={{
              '&.Mui-selected': {
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
              }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
              {item.badge ? (
                <Badge badgeContent={item.badge} color="secondary" variant="dot">
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            <ListItemText 
              primary={item.label}
              primaryTypographyProps={{ fontSize: '0.9rem' }}
            />
          </ListItemButton>
        ))}
      </List>
      
      {/* Logout at bottom */}
      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={handleLogout}
          disabled={isLoggingOut}
          sx={{
            bgcolor: 'rgba(255,255,255,0.1)',
            borderRadius: 1,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
            {isLoggingOut ? <CircularProgress size={20} color="inherit" /> : <LogoutIcon />}
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </Box>
    </Drawer>
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          {/* MOBILE LAYOUT (xs: 0-600px) */}
          {isMobile && (
            <>
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setMobileDrawerOpen(true)}
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
              
              <RestaurantIcon sx={{ mr: 1 }} />
              <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '1.1rem' }}>
                Restaunax
              </Typography>
              
              {/* Mobile user avatar */}
              <Tooltip title={`${user?.username} (${user?.role})`}>
                <Avatar sx={{ width: 32, height: 32 }}>
                  <AccountCircleIcon />
                </Avatar>
              </Tooltip>
            </>
          )}

          {/* TABLET LAYOUT (sm: 600-960px) */}
          {isTablet && (
            <>
              <RestaurantIcon sx={{ mr: 2 }} />
              <Typography variant="h6" component={Link} to="/orders" sx={{ 
                color: 'inherit', 
                textDecoration: 'none',
                mr: 3
              }}>
                Restaunax
              </Typography>
              
              {/* Compact tabs for tablet */}
              <Tabs 
                value={getCurrentPath()} 
                textColor="inherit"
                indicatorColor="secondary"
                variant="scrollable"
                scrollButtons="auto"
                sx={{ flexGrow: 1 }}
              >
                {getNavigationItems().map((item) => (
                  <Tab
                    key={item.path}
                    label={item.badge ? (
                      <Badge badgeContent={item.badge} color="secondary" variant="dot">
                        {item.label}
                      </Badge>
                    ) : item.label}
                    value={item.path}
                    component={Link}
                    to={item.path}
                    icon={item.icon}
                    iconPosition="top"
                    sx={{ minWidth: 80, fontSize: '0.75rem' }}
                  />
                ))}
              </Tabs>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                <Tooltip title={`${user?.username} (${user?.role})`}>
                  <Chip
                    avatar={<Avatar sx={{ width: 24, height: 24 }}><AccountCircleIcon /></Avatar>}
                    label={user?.username}
                    size="small"
                    sx={{ bgcolor: 'rgba(255,255,255,0.15)' }}
                  />
                </Tooltip>
                <IconButton color="inherit" size="small" onClick={handleLogout} disabled={isLoggingOut}>
                  {isLoggingOut ? <CircularProgress size={16} /> : <LogoutIcon />}
                </IconButton>
              </Box>
            </>
          )}

          {/* DESKTOP LAYOUT (md: 960px+) */}
          {isDesktop && (
            <>
              <RestaurantIcon sx={{ mr: 2 }} />
              <Typography variant="h6" component={Link} to="/orders" sx={{ 
                color: 'inherit', 
                textDecoration: 'none',
                mr: 4
              }}>
                Restaunax
              </Typography>
              
              {/* Full navigation tabs */}
              <Tabs 
                value={getCurrentPath()} 
                textColor="inherit"
                indicatorColor="secondary"
                sx={{ flexGrow: 1 }}
              >
                {getNavigationItems().map((item) => (
                  <Tab
                    key={item.path}
                    label={item.badge ? (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        {item.label}
                        <Chip 
                          label={item.badge} 
                          size="small" 
                          color="secondary" 
                          sx={{ 
                            fontSize: '0.6rem', 
                            height: 16,
                            '& .MuiChip-label': { px: 0.5 }
                          }} 
                        />
                      </Box>
                    ) : item.label}
                    value={item.path}
                    component={Link}
                    to={item.path}
                    icon={item.icon}
                    iconPosition="start"
                  />
                ))}
              </Tabs>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Theme indicator */}
                <Tooltip title={`Current Theme: ${user?.restaurantId}`}>
                  <Chip
                    icon={<PaletteIcon />}
                    label={getThemeLabel()}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      color: 'white',
                      borderColor: 'rgba(255,255,255,0.3)'
                    }}
                  />
                </Tooltip>
              
                {/* Restaurant info */}
                <Typography variant="body2">
                  {user?.restaurantId}
                </Typography>
                
                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                
                {/* User info */}
                <Tooltip title={`Role: ${user?.role}`}>
                  <Chip
                    avatar={<Avatar><AccountCircleIcon /></Avatar>}
                    label={user?.username}
                    sx={{ bgcolor: 'rgba(255,255,255,0.15)' }}
                  />
                </Tooltip>
                
                {/* Logout button */}
                <Tooltip title="Logout">
                  <IconButton 
                    color="inherit" 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.1)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                    }}
                  >
                    {isLoggingOut ? <CircularProgress size={20} /> : <LogoutIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Mobile Drawer */}
      {isMobile && <MobileDrawer />}
    </>
  );
};

export default Header;
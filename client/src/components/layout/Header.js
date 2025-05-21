import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';

const Header = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <RestaurantIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Restaunax Dashboard
        </Typography>
        <Box>
          <Typography variant="body2">Restaurant ID: rest_1</Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab,
  CircularProgress,
  Alert
} from '@mui/material';
import MenuItemsList from '../components/features/menu/MenuItemsList';
import MenuCategoriesList from '../components/features/menu/MenuCategoriesList';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const MenuManagementPage = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Tabs control
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Refresh data function
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Fetch menu items and categories
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch categories and menu items in parallel
        const [categoriesResponse, menuItemsResponse] = await Promise.all([
          api.get('/menu/categories'),
          api.get('/menu/items')
        ]);
        
        setCategories(categoriesResponse.data);
        setMenuItems(menuItemsResponse.data.items || menuItemsResponse.data);
      } catch (err) {
        console.error('Error fetching menu data:', err);
        setError('Failed to load menu data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [refreshTrigger]);

  // Render loading or error state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Menu Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Menu Items" />
          {user.role === 'owner' && <Tab label="Categories" />}
        </Tabs>
      </Paper>
      
      {tabValue === 0 && (
        <MenuItemsList 
          menuItems={menuItems} 
          categories={categories} 
          refreshData={refreshData}
          isOwner={user.role === 'owner'}
        />
      )}
      
      {tabValue === 1 && user.role === 'owner' && (
        <MenuCategoriesList 
          categories={categories} 
          refreshData={refreshData}
        />
      )}
    </Box>
  );
};

export default MenuManagementPage;
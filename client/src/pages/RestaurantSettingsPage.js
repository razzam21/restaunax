import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  AlertTitle,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Divider,
  useTheme as useMuiTheme
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { restaurantService } from '../services/api';

const RestaurantSettingsPage = () => {
  const { user } = useAuth();
  const { changeTheme } = useTheme();
  const muiTheme = useMuiTheme();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [availableThemes, setAvailableThemes] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    themeId: '',
    primaryColor: '',
    secondaryColor: ''
  });
  
  // Fetch restaurant data and available themes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Only proceed if we have a user and restaurantId
        if (!user?.restaurantId) {
          throw new Error('No restaurant ID found');
        }
        
        // Fetch restaurant data and available themes in parallel
        const [restaurantResponse, themesResponse] = await Promise.all([
          restaurantService.getRestaurantById(user.restaurantId),
          restaurantService.getAvailableThemes()
        ]);
        
        if (restaurantResponse.success && restaurantResponse.data) {
          setRestaurant(restaurantResponse.data);
          
          // Set form data based on restaurant
          setFormData({
            name: restaurantResponse.data.name || '',
            themeId: restaurantResponse.data.themeId || '',
            primaryColor: restaurantResponse.data.primaryColor || '#2C4A7A',
            secondaryColor: restaurantResponse.data.secondaryColor || '#D97A3A'
          });
        }
        
        if (themesResponse.success && themesResponse.data) {
          setAvailableThemes(themesResponse.data);
        }
      } catch (err) {
        console.error('Error fetching restaurant data:', err);
        setError('Failed to load restaurant settings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Preview theme change
  const handlePreviewTheme = () => {
    if (formData.themeId) {
      changeTheme(formData.themeId);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.restaurantId) {
      setError('No restaurant ID found');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    console.log('Submitting form data:', formData);
    
    try {
      // Log the data being sent
      console.log(`Updating restaurant ${user.restaurantId} with:`, formData);
      
      const response = await restaurantService.updateRestaurantSettings(
        user.restaurantId,
        formData
      );
      
      console.log('Response from server:', response);
      
      if (response.success) {
        setSuccess('Restaurant settings updated successfully!');
        
        // Apply the theme change to ensure it persists
        if (formData.themeId) {
          console.log(`Applying theme change to: ${formData.themeId}`);
          changeTheme(formData.themeId);
        }
      } else {
        console.error('Update failed:', response.error);
        setError(response.error || 'Failed to update settings');
      }
    } catch (err) {
      console.error('Exception updating restaurant settings:', err);
      setError('An error occurred while updating settings. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Access control - only owners should see this page
  if (user && user.role !== 'owner') {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          <AlertTitle>Access Denied</AlertTitle>
          Only restaurant owners can access these settings.
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Restaurant Settings
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error && !restaurant ? (
        <Alert severity="error" sx={{ my: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      ) : (
        <form onSubmit={handleSubmit}>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              General Information
            </Typography>
            
            <TextField
              fullWidth
              margin="normal"
              id="name"
              name="name"
              label="Restaurant Name"
              value={formData.name}
              onChange={handleChange}
            />
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {success}
              </Alert>
            )}
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Theme Settings
            </Typography>
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="theme-select-label">Theme</InputLabel>
              <Select
                labelId="theme-select-label"
                id="themeId"
                name="themeId"
                value={formData.themeId || ''}
                label="Theme"
                onChange={handleChange}
              >
                <MenuItem value="">
                  <em>Default</em>
                </MenuItem>
                {availableThemes.map((theme) => (
                  <MenuItem key={theme.id} value={theme.id}>
                    {theme.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={handlePreviewTheme}
                disabled={!formData.themeId}
                sx={{ mt: 2 }}
              >
                Preview Theme
              </Button>
              
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitting}
                sx={{ mt: 2 }}
              >
                {submitting ? 'Saving...' : 'Save Theme'}
              </Button>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Theme Preview
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h5" component="div" color="primary">
                      Primary Color
                    </Typography>
                    <Box 
                      sx={{ 
                        height: 50, 
                        width: '100%', 
                        backgroundColor: 'primary.main',
                        mt: 1,
                        borderRadius: 1
                      }} 
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {muiTheme.palette.primary.main}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h5" component="div" color="secondary">
                      Secondary Color
                    </Typography>
                    <Box 
                      sx={{ 
                        height: 50, 
                        width: '100%', 
                        backgroundColor: 'secondary.main',
                        mt: 1,
                        borderRadius: 1
                      }} 
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {muiTheme.palette.secondary.main}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="body1">
                      Text Sample
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Secondary text sample
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="body1">
                      Default Button
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small">Button</Button>
                    <Button size="small" color="primary">Primary</Button>
                    <Button size="small" color="secondary">Secondary</Button>
                  </CardActions>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="body1">
                      Contained Button
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button variant="contained" size="small">Default</Button>
                    <Button variant="contained" color="primary" size="small">Primary</Button>
                    <Button variant="contained" color="secondary" size="small">Secondary</Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </form>
      )}
    </Container>
  );
};

export default RestaurantSettingsPage;
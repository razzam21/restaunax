import { useState, useEffect } from 'react';
import { 
  Box,
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  FormGroup,
  FormLabel,
  Slider,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TimerIcon from '@mui/icons-material/Timer';
import api from '../../../services/api';

const initialDietaryInfo = {
  vegetarian: false,
  vegan: false,
  glutenFree: false,
  containsNuts: false,
  spicyLevel: 0
};

const MenuItemForm = ({ item, categories, onClose, onSave }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    image: '',
    dietaryInfo: { ...initialDietaryInfo },
    preparationTime: '',
    isActive: true
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  // Initialize form with item data if editing
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        price: item.price?.toString() || '',
        categoryId: item.categoryId || '',
        image: item.image || '',
        dietaryInfo: item.dietaryInfo ? { ...item.dietaryInfo } : { ...initialDietaryInfo },
        preparationTime: item.preparationTime?.toString() || '',
        isActive: item.isActive !== undefined ? item.isActive : true
      });
    }
  }, [item]);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked
    });
  };
  
  // Handle dietary info changes
  const handleDietaryChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      dietaryInfo: {
        ...formData.dietaryInfo,
        [name]: checked
      }
    });
  };
  
  // Handle spicy level change
  const handleSpicyLevelChange = (event, newValue) => {
    setFormData({
      ...formData,
      dietaryInfo: {
        ...formData.dietaryInfo,
        spicyLevel: newValue
      }
    });
  };
  
  // Validate the form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else if (isNaN(formData.price) || parseFloat(formData.price) < 0) {
      newErrors.price = 'Price must be a valid number greater than or equal to 0';
    }
    
    if (formData.preparationTime && (isNaN(formData.preparationTime) || parseInt(formData.preparationTime) < 0)) {
      newErrors.preparationTime = 'Preparation time must be a valid number greater than or equal to 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Prepare data for API
    const apiData = {
      ...formData,
      price: parseFloat(formData.price),
      preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : null
    };
    
    setLoading(true);
    
    try {
      if (item) {
        // Update existing item
        await api.patch(`/menu/items/${item.id}`, apiData);
      } else {
        // Create new item
        await api.post('/menu/items', apiData);
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving menu item:', error);
      setSubmitError(error.response?.data?.error || 'Failed to save menu item');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <DialogTitle>{item ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
      <DialogContent sx={{ px: isMobile ? 2 : 3 }}>
        <Box component="form" noValidate sx={{ mt: isMobile ? 1 : 2 }}>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          
          <Grid container spacing={isMobile ? 1 : 2}>
            {/* Basic Info Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Basic Information
              </Typography>
            </Grid>
            
            {/* Name */}
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Item Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
              />
            </Grid>
            
            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={3}
              />
            </Grid>
            
            {/* Price */}
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                error={!!errors.price}
                helperText={errors.price}
                size={isMobile ? "medium" : "medium"}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoneyIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            {/* Preparation Time */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={isMobile ? "Prep Time (min)" : "Preparation Time (minutes)"}
                name="preparationTime"
                value={formData.preparationTime}
                onChange={handleChange}
                error={!!errors.preparationTime}
                helperText={errors.preparationTime}
                size={isMobile ? "medium" : "medium"}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimerIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            {/* Category */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size={isMobile ? "medium" : "medium"}>
                <InputLabel>Category</InputLabel>
                <Select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  label="Category"
                >
                  <MenuItem value="">
                    <em>Uncategorized</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Active Status */}
            <Grid item xs={12} sm={6} sx={{
              display: 'flex',
              alignItems: isMobile ? 'flex-start' : 'center',
              pt: isMobile ? 2 : 0,
            }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isActive}
                    onChange={handleCheckboxChange}
                    name="isActive"
                  />
                }
                label="Item is active"
              />
            </Grid>
            
            {/* Image URL */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Image URL"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
              />
            </Grid>
            
            {/* Dietary Information Section */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Dietary Information
              </Typography>
            </Grid>
            
            {/* Dietary Checkboxes */}
            <Grid item xs={12}>
              <FormGroup row={!isMobile} sx={{ flexDirection: isMobile ? 'column' : 'row' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.dietaryInfo.vegetarian}
                      onChange={handleDietaryChange}
                      name="vegetarian"
                    />
                  }
                  label="Vegetarian"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.dietaryInfo.vegan}
                      onChange={handleDietaryChange}
                      name="vegan"
                    />
                  }
                  label="Vegan"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.dietaryInfo.glutenFree}
                      onChange={handleDietaryChange}
                      name="glutenFree"
                    />
                  }
                  label="Gluten Free"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.dietaryInfo.containsNuts}
                      onChange={handleDietaryChange}
                      name="containsNuts"
                    />
                  }
                  label="Contains Nuts"
                />
              </FormGroup>
            </Grid>
            
            {/* Spicy Level */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <FormLabel>Spicy Level</FormLabel>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs>
                    <Slider
                      value={formData.dietaryInfo.spicyLevel}
                      onChange={handleSpicyLevelChange}
                      step={1}
                      marks
                      min={0}
                      max={3}
                      valueLabelDisplay="auto"
                    />
                  </Grid>
                  <Grid item>
                    <Typography>
                      {formData.dietaryInfo.spicyLevel === 0 && 'Not Spicy'}
                      {formData.dietaryInfo.spicyLevel === 1 && 'Mild'}
                      {formData.dietaryInfo.spicyLevel === 2 && 'Medium'}
                      {formData.dietaryInfo.spicyLevel === 3 && 'Hot'}
                    </Typography>
                  </Grid>
                </Grid>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions sx={{
        px: isMobile ? 2 : 3,
        py: isMobile ? 1.5 : 2,
        gap: isMobile ? 1 : 0,
        flexDirection: isMobile ? 'column-reverse' : 'row',
      }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          sx={{ 
            minHeight: isMobile ? 48 : 'auto',
            order: isMobile ? 2 : 1,
          }}
          fullWidth={isMobile}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{ 
            minHeight: isMobile ? 48 : 'auto',
            order: isMobile ? 1 : 2,
          }}
          fullWidth={isMobile}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </>
  );
};

export default MenuItemForm;
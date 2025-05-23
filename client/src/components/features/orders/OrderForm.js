import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
  IconButton,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useOrders } from '../../../contexts/OrderContext';
import { useMenu } from '../../../contexts/MenuContext';

const OrderForm = () => {
  const navigate = useNavigate();
  const { createOrder } = useOrders();
  const { menuItems, fetchMenuItems } = useMenu();
  const navigateTimeoutRef = useRef(null);
  
  // Fetch menu items on component mount
  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);
  
  // Add debugging for menu items when component renders
  useEffect(() => {
    if (menuItems && menuItems.length > 0) {
      console.log('OrderForm - menuItems available for Autocomplete:');
      menuItems.forEach((item, index) => {
        console.log(`${index}: ${item.name} (${item.category})`);
      });
    }
  }, [menuItems]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
        navigateTimeoutRef.current = null;
      }
    };
  }, []);
  
  const [formData, setFormData] = useState({
    customerName: '',
    orderType: 'delivery',
    items: [{ name: '', quantity: 1, price: 0, menuItemId: null }], // Use null instead of empty string
    restaurantId: 'rest_1',
  });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    
    // Handle numbers for quantity and price
    if (field === 'quantity' || field === 'price') {
      newItems[index][field] = parseFloat(value);
    } else {
      newItems[index][field] = value;
    }
    
    setFormData({
      ...formData,
      items: newItems,
    });
    
    // Clear item error when field is edited
    const errorKey = `items[${index}].${field}`;
    if (errors[errorKey]) {
      setErrors({
        ...errors,
        [errorKey]: '',
      });
    }
  };

  // When menu item is selected from dropdown
  const handleMenuItemSelect = (index, value) => {
    if (!value) {
      // If no item selected, reset but keep any manually entered name
      const name = formData.items[index].name;
      const newItems = [...formData.items];
      newItems[index] = {
        ...newItems[index],
        menuItemId: null, // Use null instead of empty string for optional fields
        price: 0,
        // Keep the name if it was manually entered
        name: typeof value === 'string' ? value : name
      };
      
      setFormData({
        ...formData,
        items: newItems,
      });
      return;
    }
    
    // If a menu item object is selected
    if (value && typeof value === 'object') {
      console.log('Menu item selected:', value);
      // Update the item with menu item data
      const newItems = [...formData.items];
      newItems[index] = {
        ...newItems[index],
        name: value.name,
        price: value.price,
        menuItemId: value.id,
      };
      
      console.log(`Updated item[${index}]:`, newItems[index]);
      
      setFormData({
        ...formData,
        items: newItems,
      });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: 1, price: 0, menuItemId: null }],
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) {
      return; // Keep at least one item
    }
    
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    
    setFormData({
      ...formData,
      items: newItems,
    });
  };

  const calculateTotal = () => {
    return formData.items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate customer name
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    
    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.name.trim()) {
        newErrors[`items[${index}].name`] = 'Item name is required';
      }
      
      if (isNaN(item.quantity) || item.quantity < 1) {
        newErrors[`items[${index}].quantity`] = 'Quantity must be at least 1';
      }
      
      if (isNaN(item.price) || item.price <= 0) {
        newErrors[`items[${index}].price`] = 'Price must be greater than 0';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setAlert({
        open: true,
        message: 'Please fix the errors in the form',
        severity: 'error',
      });
      return;
    }
    
    try {
      // Calculate total
      const total = calculateTotal();
      
      // Clean up order data before submission - remove menuItemId completely for items that don't have one
      const cleanedItems = formData.items.map(item => {
        // Start with a clean copy
        const cleanItem = {
          name: item.name,
          quantity: item.quantity,
          price: item.price
        };
        
        // Only add menuItemId if it has a value
        if (item.menuItemId) {
          cleanItem.menuItemId = item.menuItemId;
        }
        
        return cleanItem;
      });
      
      const orderPayload = {
        customerName: formData.customerName,
        orderType: formData.orderType,
        restaurantId: formData.restaurantId,
        items: cleanedItems,
        total,
      };
      
      console.log('Submitting order with payload:', JSON.stringify(orderPayload, null, 2));
      
      // Create order
      await createOrder(orderPayload);
      
      setAlert({
        open: true,
        message: 'Order created successfully',
        severity: 'success',
      });
      
      // Navigate back to orders list after successful creation
      // Clear any existing timeout first
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
      }
      
      navigateTimeoutRef.current = setTimeout(() => {
        navigate('/orders');
        navigateTimeoutRef.current = null;
      }, 1500);
    } catch (error) {
      console.error('Order creation error:', error);
      setAlert({
        open: true,
        message: `Failed to create order: ${error.message || 'Unknown error'}`,
        severity: 'error',
      });
    }
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/orders')}
          sx={{ mr: 2 }}
        >
          Back to Orders
        </Button>
        <Typography variant="h4" component="h1">
          Create New Order
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Customer Name"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                error={!!errors.customerName}
                helperText={errors.customerName}
                required
                sx={{ mb: 3 }}
              />

              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <FormLabel component="legend">Order Type</FormLabel>
                <RadioGroup
                  row
                  name="orderType"
                  value={formData.orderType}
                  onChange={handleChange}
                >
                  <FormControlLabel
                    value="delivery"
                    control={<Radio />}
                    label="Delivery"
                  />
                  <FormControlLabel
                    value="pickup"
                    control={<Radio />}
                    label="Pickup"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Order Items
          </Typography>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              {formData.items.map((item, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={5}>
                    <Autocomplete
                      // Sort options alphabetically by name before providing to Autocomplete
                      options={menuItems ? [...menuItems].sort((a, b) => 
                        a.name.localeCompare(b.name)) : []}
                      getOptionLabel={(option) => {
                        // Handle both string and object options
                        if (typeof option === 'string') return option;
                        return option.name || '';
                      }}
                      freeSolo
                      disablePortal
                      value={item.menuItemId ? menuItems?.find(m => m.id === item.menuItemId) || null : item.name}
                      onChange={(event, newValue) => handleMenuItemSelect(index, newValue)}
                      onInputChange={(event, newValue) => {
                        if (typeof newValue === 'string') {
                          handleItemChange(index, 'name', newValue);
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          label="Item Name"
                          placeholder="Select from menu or enter custom item"
                          error={!!errors[`items[${index}].name`]}
                          helperText={errors[`items[${index}].name`]}
                          required
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={6} sm={2}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      InputProps={{ inputProps: { min: 1 } }}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      error={!!errors[`items[${index}].quantity`]}
                      helperText={errors[`items[${index}].quantity`]}
                      required
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      label="Price"
                      type="number"
                      InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                      error={!!errors[`items[${index}].price`]}
                      helperText={errors[`items[${index}].price`]}
                      required
                      disabled={!!item.menuItemId} // Disable if selected from menu
                    />
                  </Grid>
                  <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                      color="error"
                      onClick={() => removeItem(index)}
                      disabled={formData.items.length === 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}

              <Button
                startIcon={<AddIcon />}
                onClick={addItem}
                sx={{ mt: 1 }}
              >
                Add Item
              </Button>
            </CardContent>
          </Card>

          <Typography variant="h6" sx={{ mb: 2 }}>
            Order Summary
          </Typography>

          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formData.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name || '(No name)'}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">${Number(item.price).toFixed(2)}</TableCell>
                    <TableCell align="right">
                      ${(item.quantity * item.price).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} align="right">
                    <strong>Total</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>${calculateTotal().toFixed(2)}</strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              size="large"
            >
              Create Order
            </Button>
          </Box>
        </form>
      </Paper>

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseAlert}
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrderForm;
import { useState } from 'react';
import { 
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  Chip,
  Tooltip,
  Dialog,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ResponsiveTable from '../../common/ResponsiveTable';
import MenuItemForm from './MenuItemForm';
import DeleteConfirmationDialog from '../../common/DeleteConfirmationDialog';
import api from '../../../services/api';

const MenuItemsList = ({ menuItems, categories, refreshData, isOwner }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialog states
  const [editItem, setEditItem] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Handle form dialog
  const handleOpenForm = (item = null) => {
    setEditItem(item);
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditItem(null);
  };
  
  // Handle delete dialog
  const handleOpenDeleteDialog = (item) => {
    setDeleteItem(item);
    setIsDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeleteItem(null);
  };
  
  // Handle toggle item visibility
  const handleToggleVisibility = async (item) => {
    try {
      if (item.isActive) {
        await api.patch(`/menu/items/${item.id}/deactivate`);
      } else {
        await api.patch(`/menu/items/${item.id}`, { isActive: true });
      }
      refreshData();
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };
  
  // Handle item deletion
  const handleDeleteItem = async () => {
    if (!deleteItem) return;
    
    try {
      await api.delete(`/menu/items/${deleteItem.id}`);
      handleCloseDeleteDialog();
      refreshData();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };
  
  // Apply filters
  const filteredItems = menuItems.filter(item => {
    // Search filter
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
    // Category filter
    const matchesCategory = !categoryFilter || item.categoryId === categoryFilter;
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && item.isActive) || 
      (statusFilter === 'inactive' && !item.isActive);
      
    return matchesSearch && matchesCategory && matchesStatus;
  });
  
  // Apply pagination
  const paginatedItems = filteredItems.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  // Get category name helper
  const getCategoryName = (categoryId) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };
  
  return (
    <>
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: isMobile ? 1 : 2, 
        alignItems: 'center',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        {/* Search field */}
        <TextField
          label="Search Items"
          variant="outlined"
          size={isMobile ? "medium" : "small"}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ 
            flexGrow: isMobile ? 0 : 1, 
            minWidth: isMobile ? '100%' : '200px',
            width: isMobile ? '100%' : 'auto',
          }}
          fullWidth={isMobile}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        
        <Box sx={{
          display: 'flex',
          gap: isMobile ? 1 : 2,
          width: isMobile ? '100%' : 'auto',
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          {/* Category filter */}
          <FormControl 
            sx={{ minWidth: isMobile ? '100%' : '200px' }} 
            size={isMobile ? "medium" : "small"}
            fullWidth={isMobile}
          >
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(category => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Status filter */}
          <FormControl 
            sx={{ minWidth: isMobile ? '100%' : '150px' }} 
            size={isMobile ? "medium" : "small"}
            fullWidth={isMobile}
          >
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Items</MenuItem>
              <MenuItem value="active">Active Only</MenuItem>
              <MenuItem value="inactive">Inactive Only</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        {/* Add new item button */}
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
          sx={{ 
            minHeight: isMobile ? 48 : 'auto',
            width: isMobile ? '100%' : 'auto',
          }}
          size={isMobile ? "medium" : "medium"}
          fullWidth={isMobile}
        >
          Add Item
        </Button>
      </Box>
      
      <ResponsiveTable component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No menu items found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item) => (
                <TableRow 
                  key={item.id}
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    opacity: item.isActive ? 1 : 0.6
                  }}
                >
                  <TableCell component="th" scope="row">
                    <Box sx={{ fontWeight: 'bold' }}>{item.name}</Box>
                    {item.description && (
                      <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                        {item.description.length > 50 
                          ? `${item.description.substring(0, 50)}...` 
                          : item.description}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{getCategoryName(item.categoryId)}</TableCell>
                  <TableCell>${item.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={item.isActive ? 'Active' : 'Inactive'} 
                      color={item.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Tooltip title={item.isActive ? 'Deactivate' : 'Activate'}>
                        <IconButton 
                          onClick={() => handleToggleVisibility(item)}
                          color={item.isActive ? 'default' : 'primary'}
                        >
                          {item.isActive ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Edit">
                        <IconButton 
                          onClick={() => handleOpenForm(item)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {isOwner && (
                        <Tooltip title="Delete">
                          <IconButton 
                            onClick={() => handleOpenDeleteDialog(item)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ResponsiveTable>
      
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredItems.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      
      {/* Menu Item Form Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { 
            m: isMobile ? 0 : 2,
          }
        }}
      >
        <MenuItemForm 
          item={editItem}
          categories={categories}
          onClose={handleCloseForm}
          onSave={refreshData}
        />
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteItem}
        title="Delete Menu Item"
        content={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`}
      />
    </>
  );
};

export default MenuItemsList;
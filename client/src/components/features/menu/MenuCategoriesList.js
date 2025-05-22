import { useState } from 'react';
import { 
  Box, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction,
  IconButton,
  Button,
  Tooltip,
  Dialog,
  Typography,
  Chip
} from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import MenuCategoryForm from './MenuCategoryForm';
import DeleteConfirmationDialog from '../../common/DeleteConfirmationDialog';
import api from '../../../services/api';

// Sortable Item Component
const SortableCategoryItem = ({ category, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      divider
      sx={{
        backgroundColor: isDragging ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.02)'
        }
      }}
    >
      <Box 
        {...attributes}
        {...listeners}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mr: 2,
          color: 'text.secondary',
          cursor: 'grab',
          '&:active': {
            cursor: 'grabbing'
          }
        }}
      >
        <DragHandleIcon />
      </Box>
      
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {category.name}
            {!category.isActive && (
              <Chip 
                label="Inactive" 
                size="small" 
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        }
        secondary={category.description}
      />
    
      <ListItemSecondaryAction>
        <Tooltip title="Edit">
          <IconButton
            edge="end"
            onClick={() => onEdit(category)}
            color="primary"
            sx={{ mr: 1 }}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Delete">
          <IconButton
            edge="end"
            onClick={() => onDelete(category)}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

const MenuCategoriesList = ({ categories, refreshData }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState(null);
  
  // Sort categories by display order
  const sortedCategories = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Handle form dialog
  const handleOpenForm = (category = null) => {
    setEditCategory(category);
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditCategory(null);
  };
  
  // Handle delete dialog
  const handleOpenDeleteDialog = (category) => {
    setDeleteCategory(category);
    setIsDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeleteCategory(null);
  };
  
  // Handle category deletion
  const handleDeleteCategory = async () => {
    if (!deleteCategory) return;
    
    try {
      await api.delete(`/menu/categories/${deleteCategory.id}`);
      handleCloseDeleteDialog();
      refreshData();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error.response?.data?.error || 'Cannot delete category that has menu items assigned');
    }
  };
  
  // Handle drag end
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = sortedCategories.findIndex((item) => item.id === active.id);
      const newIndex = sortedCategories.findIndex((item) => item.id === over.id);

      const reorderedCategories = arrayMove(sortedCategories, oldIndex, newIndex);
      
      // Create the order payload
      const categoryOrders = reorderedCategories.map((cat, index) => ({
        id: cat.id,
        order: index
      }));
      
      try {
        await api.patch('/menu/categories/order', { categoryOrders });
        refreshData();
      } catch (error) {
        console.error('Error updating category order:', error);
        alert('Failed to update category order. Please try again.');
      }
    }
  };
  
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Menu Categories</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Category
        </Button>
      </Box>
      
      <Paper>
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={sortedCategories.map(cat => cat.id)}
            strategy={verticalListSortingStrategy}
          >
            <List
              sx={{ 
                width: '100%',
                bgcolor: 'background.paper'
              }}
            >
              {sortedCategories.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No categories found. Create a new category to get started." />
                </ListItem>
              ) : (
                sortedCategories.map((category) => (
                  <SortableCategoryItem
                    key={category.id}
                    category={category}
                    onEdit={handleOpenForm}
                    onDelete={handleOpenDeleteDialog}
                  />
                ))
              )}
            </List>
          </SortableContext>
        </DndContext>
      </Paper>
      
      {/* Category Form Dialog */}
      <Dialog open={isFormOpen} onClose={handleCloseForm}>
        <MenuCategoryForm
          category={editCategory}
          onClose={handleCloseForm}
          onSave={refreshData}
        />
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        content={`Are you sure you want to delete "${deleteCategory?.name}"? This is only possible if no menu items are assigned to this category.`}
      />
    </>
  );
};

export default MenuCategoriesList;
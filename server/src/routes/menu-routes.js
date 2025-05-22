const express = require('express');
const { 
  getMenuItems, 
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deactivateMenuItem,
  deleteMenuItem,
  bulkUpdateMenuItems,
  getMenuCategories,
  getMenuCategoryById,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  updateCategoryOrder,
  getMenuItemsByCategory
} = require('../controllers/menu-controller');
const { requireAuth, hasRole } = require('../middleware/auth');
const { validateMenuItemCreate, validateMenuItemUpdate, validateMenuCategory } = require('../middleware/validation');

const router = express.Router();

// Legacy endpoint (for backward compatibility)
router.get('/category/:category', getMenuItemsByCategory);

// Menu Items routes
router
  .route('/items')
  .get(getMenuItems)
  .post(hasRole(['manager', 'owner']), validateMenuItemCreate, createMenuItem);

router
  .route('/items/bulk')
  .patch(hasRole(['manager', 'owner']), bulkUpdateMenuItems);

router
  .route('/items/:id')
  .get(getMenuItemById)
  .patch(hasRole(['manager', 'owner']), validateMenuItemUpdate, updateMenuItem)
  .delete(hasRole('owner'), deleteMenuItem);

router
  .route('/items/:id/deactivate')
  .patch(hasRole(['manager', 'owner']), deactivateMenuItem);

// Menu Categories routes
router
  .route('/categories')
  .get(getMenuCategories)
  .post(hasRole('owner'), validateMenuCategory, createMenuCategory);

router
  .route('/categories/order')
  .patch(hasRole('owner'), updateCategoryOrder);

router
  .route('/categories/:id')
  .get(getMenuCategoryById)
  .patch(hasRole('owner'), validateMenuCategory, updateMenuCategory)
  .delete(hasRole('owner'), deleteMenuCategory);

module.exports = router;
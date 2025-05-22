const asyncHandler = require('express-async-handler');
const menuService = require('../services/menu-service');
const { sanitizeObject } = require('../middleware/validation');

/**
 * Menu Item Controllers
 */

// @desc    Get all menu items with optional filtering
// @route   GET /api/menu-items
// @access  Public
const getMenuItems = asyncHandler(async (req, res) => {
  const { categoryId, isActive, search, page, limit } = req.query;
  const restaurantId = req.user?.restaurantId || 'rest_1'; // Fallback for compatibility
  
  const menuItems = await menuService.getMenuItems(restaurantId, {
    categoryId,
    isActive,
    search,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50
  });
  
  res.json(menuItems);
});

// @desc    Get a single menu item by ID
// @route   GET /api/menu-items/:id
// @access  Public
const getMenuItemById = asyncHandler(async (req, res) => {
  const menuItem = await menuService.getMenuItemById(req.params.id);
  res.json(menuItem);
});

// @desc    Create a new menu item
// @route   POST /api/menu-items
// @access  Private (manager, owner)
const createMenuItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const restaurantId = req.user.restaurantId;
  
  // Sanitize and prepare data
  const sanitizedData = sanitizeObject(req.body);
  
  // Ensure restaurantId from authenticated user
  const menuItemData = {
    ...sanitizedData,
    restaurantId
  };
  
  // Create menu item
  const menuItem = await menuService.createMenuItem(menuItemData, userId);
  
  res.status(201).json(menuItem);
});

// @desc    Update a menu item
// @route   PATCH /api/menu-items/:id
// @access  Private (manager, owner)
const updateMenuItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const itemId = req.params.id;
  
  // Sanitize and prepare data
  const sanitizedData = sanitizeObject(req.body);
  
  // Remove forbidden fields
  delete sanitizedData.restaurantId; // Don't allow changing restaurant
  delete sanitizedData.id; // Don't allow changing ID
  delete sanitizedData.createdAt; // Don't allow changing creation time
  delete sanitizedData.updatedAt; // Don't allow changing update time
  
  // Update menu item
  const menuItem = await menuService.updateMenuItem(itemId, sanitizedData, userId);
  
  res.json(menuItem);
});

// @desc    Deactivate a menu item (soft delete)
// @route   PATCH /api/menu-items/:id/deactivate
// @access  Private (manager, owner)
const deactivateMenuItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const itemId = req.params.id;
  
  // Deactivate menu item
  const menuItem = await menuService.deactivateMenuItem(itemId, userId);
  
  res.json(menuItem);
});

// @desc    Delete a menu item (permanent delete)
// @route   DELETE /api/menu-items/:id
// @access  Private (owner only)
const deleteMenuItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const itemId = req.params.id;
  
  // Delete menu item
  const result = await menuService.deleteMenuItem(itemId, userId);
  
  res.json(result);
});

// @desc    Bulk update multiple menu items
// @route   PATCH /api/menu-items/bulk
// @access  Private (manager, owner)
const bulkUpdateMenuItems = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { ids, data } = req.body;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400);
    throw new Error('Menu item IDs are required');
  }
  
  if (!data || Object.keys(data).length === 0) {
    res.status(400);
    throw new Error('Update data is required');
  }
  
  // Sanitize data
  const sanitizedData = sanitizeObject(data);
  
  // Remove forbidden fields
  delete sanitizedData.restaurantId;
  delete sanitizedData.id;
  delete sanitizedData.createdAt;
  delete sanitizedData.updatedAt;
  
  // Bulk update
  const result = await menuService.bulkUpdateMenuItems(ids, sanitizedData, userId);
  
  res.json(result);
});

/**
 * Menu Category Controllers
 */

// @desc    Get all menu categories
// @route   GET /api/menu-categories
// @access  Public
const getMenuCategories = asyncHandler(async (req, res) => {
  const { isActive } = req.query;
  const restaurantId = req.user?.restaurantId || 'rest_1'; // Fallback for compatibility
  
  const categories = await menuService.getMenuCategories(restaurantId, { isActive });
  
  res.json(categories);
});

// @desc    Get a single menu category by ID
// @route   GET /api/menu-categories/:id
// @access  Public
const getMenuCategoryById = asyncHandler(async (req, res) => {
  const category = await menuService.getMenuCategoryById(req.params.id);
  res.json(category);
});

// @desc    Create a new menu category
// @route   POST /api/menu-categories
// @access  Private (owner only)
const createMenuCategory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const restaurantId = req.user.restaurantId;
  
  // Sanitize and prepare data
  const sanitizedData = sanitizeObject(req.body);
  
  // Ensure restaurantId from authenticated user
  const categoryData = {
    ...sanitizedData,
    restaurantId
  };
  
  // Create category
  const category = await menuService.createMenuCategory(categoryData, userId);
  
  res.status(201).json(category);
});

// @desc    Update a menu category
// @route   PATCH /api/menu-categories/:id
// @access  Private (owner only)
const updateMenuCategory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const categoryId = req.params.id;
  
  // Sanitize and prepare data
  const sanitizedData = sanitizeObject(req.body);
  
  // Remove forbidden fields
  delete sanitizedData.restaurantId;
  delete sanitizedData.id;
  delete sanitizedData.createdAt;
  delete sanitizedData.updatedAt;
  
  // Update category
  const category = await menuService.updateMenuCategory(categoryId, sanitizedData, userId);
  
  res.json(category);
});

// @desc    Delete a menu category
// @route   DELETE /api/menu-categories/:id
// @access  Private (owner only)
const deleteMenuCategory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const categoryId = req.params.id;
  
  // Delete category
  const result = await menuService.deleteMenuCategory(categoryId, userId);
  
  res.json(result);
});

// @desc    Update category display order
// @route   PATCH /api/menu-categories/order
// @access  Private (owner only)
const updateCategoryOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const restaurantId = req.user.restaurantId;
  const { categoryOrders } = req.body;
  
  if (!categoryOrders || !Array.isArray(categoryOrders) || categoryOrders.length === 0) {
    res.status(400);
    throw new Error('Category orders are required');
  }
  
  // Update category order
  const result = await menuService.updateCategoryOrder(restaurantId, categoryOrders, userId);
  
  res.json(result);
});

// Legacy functions (for backward compatibility)
const getMenuItemsByCategory = asyncHandler(async (req, res) => {
  const category = req.params.category;
  const restaurantId = req.user?.restaurantId || 'rest_1'; // Fallback for compatibility
  
  const menuItems = await menuService.getMenuItemsByCategory(category, restaurantId);
  
  res.json(menuItems);
});

module.exports = {
  // Menu Items
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deactivateMenuItem,
  deleteMenuItem,
  bulkUpdateMenuItems,
  
  // Menu Categories
  getMenuCategories,
  getMenuCategoryById,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  updateCategoryOrder,
  
  // Legacy functions (for backward compatibility)
  getMenuItemsByCategory
};
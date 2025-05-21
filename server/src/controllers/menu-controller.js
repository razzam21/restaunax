const asyncHandler = require('express-async-handler');
const menuService = require('../services/menu-service');

// @desc    Get all menu items
// @route   GET /api/menu-items
// @access  Public (for MVP1, will be restricted in MVP2)
const getMenuItems = asyncHandler(async (req, res) => {
  const { category } = req.query;
  let menuItems;
  
  if (category) {
    menuItems = await menuService.getMenuItemsByCategory(category);
  } else {
    menuItems = await menuService.getMenuItems();
  }
  
  res.json(menuItems);
});

// @desc    Get a single menu item by ID
// @route   GET /api/menu-items/:id
// @access  Public (for MVP1, will be restricted in MVP2)
const getMenuItemById = asyncHandler(async (req, res) => {
  const menuItem = await menuService.getMenuItemById(req.params.id);
  res.json(menuItem);
});

module.exports = {
  getMenuItems,
  getMenuItemById
};
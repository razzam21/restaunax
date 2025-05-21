const express = require('express');
const { getMenuItems, getMenuItemById } = require('../controllers/menu-controller');

const router = express.Router();

// Get all menu items with optional category filter
router.get('/', getMenuItems);

// Get a single menu item by ID
router.get('/:id', getMenuItemById);

module.exports = router;
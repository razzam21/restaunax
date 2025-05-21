const express = require('express');
const orderRoutes = require('./order-routes');
const menuRoutes = require('./menu-routes');
const authRoutes = require('./auth-routes');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes (no authentication required)
router.use('/auth', authRoutes);

// Protected routes (authentication required)
router.use('/orders', requireAuth, orderRoutes);
router.use('/menu-items', requireAuth, menuRoutes);

// Add additional routes here as needed

module.exports = router;
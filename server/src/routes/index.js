const express = require('express');
const orderRoutes = require('./order-routes');
const menuRoutes = require('./menu-routes');
const authRoutes = require('./auth-routes');
const restaurantRoutes = require('./restaurant-routes');
const reportRoutes = require('./report-routes');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes (no authentication required)
router.use('/auth', authRoutes);

// Protected routes (authentication required)
router.use('/orders', requireAuth, orderRoutes);
router.use('/menu-items', requireAuth, menuRoutes);
router.use('/restaurants', restaurantRoutes); // Auth middleware applied in restaurant-routes.js
router.use('/reports', requireAuth, reportRoutes);
router.use('/dashboard', requireAuth, reportRoutes);

// Add additional routes here as needed

module.exports = router;
const express = require('express');
const orderRoutes = require('./order-routes');
const menuRoutes = require('./menu-routes');

const router = express.Router();

// Mount order routes
router.use('/orders', orderRoutes);

// Mount menu routes
router.use('/menu-items', menuRoutes);

// Add additional routes here as needed

module.exports = router;
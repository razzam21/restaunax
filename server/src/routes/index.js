const express = require('express');
const orderRoutes = require('./order-routes');
const menuRoutes = require('./menu-routes');
const authRoutes = require('./auth-routes');
const restaurantRoutes = require('./restaurant-routes');
const reportRoutes = require('./report-routes');
const insightsRoutes = require('./insights-routes');
const systemHealthRoutes = require('./system-health-routes');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes (no authentication required)
router.use('/auth', authRoutes);

// Protected routes (authentication required)
router.use('/orders', requireAuth, orderRoutes);

// Legacy route for backward compatibility (use /menu/ for new routes)
router.use('/menu-items', requireAuth, menuRoutes);

// New menu management routes (MVP 5)
router.use('/menu', requireAuth, menuRoutes);

router.use('/restaurants', restaurantRoutes); // Auth middleware applied in restaurant-routes.js
router.use('/reports', requireAuth, reportRoutes);
router.use('/dashboard', requireAuth, reportRoutes);

// AI Insights routes (MVP 6)
router.use('/insights', requireAuth, insightsRoutes);

// System Health Monitoring routes (MVP 7) - Owner only
router.use('/system', systemHealthRoutes);

// Simple AI status endpoint
router.get('/ai-status', requireAuth, (req, res) => {
  const config = require('../config');
  
  // Add timestamp to prevent caching
  const response = {
    success: true,
    timestamp: new Date().toISOString(),
    features: {
      aiEnabled: config.ai.enabled,
      hasPermission: ['manager', 'owner'].includes(req.user.role),
      upgradeRequired: !config.ai.enabled,
      availableFeatures: config.ai.enabled && ['manager', 'owner'].includes(req.user.role) ? [
        'demand_forecast',
        'menu_optimization'
      ] : [],
      permissionRequired: !['manager', 'owner'].includes(req.user.role),
    },
    debug: {
      configEnabled: config.ai.enabled,
      userRole: req.user.role,
      hasPermission: ['manager', 'owner'].includes(req.user.role)
    }
  };
  
  // Disable caching
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  res.json(response);
});

// Add additional routes here as needed

module.exports = router;
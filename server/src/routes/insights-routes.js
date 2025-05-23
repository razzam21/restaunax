const express = require('express');
const {
  // createDemandForecast,
  // createMenuOptimization,
  // getJobStatus,
  // getDemandForecast,
  // getMenuOptimization,
  getInsightsHistory,
  getFeatureStatus,
} = require('../controllers/insights-controller');
const { authenticateToken } = require('../middleware/auth');
const { validateInsightRequest } = require('../middleware/validation');

const router = express.Router();

/**
 * AI Insights Routes
 * All routes require authentication and are designed for manager/owner roles
 */

// Feature status (available to all authenticated users)
router.get('/feature-status', authenticateToken, getFeatureStatus);

// Job management
// router.get('/jobs/:jobId', authenticateToken, getJobStatus);

// Demand forecasting
// router.post('/demand-forecast', 
//   authenticateToken, 
//   validateInsightRequest('demand_forecast'), 
//   createDemandForecast
// );

// router.get('/demand-forecast/:jobId', 
//   authenticateToken, 
//   getDemandForecast
// );

// Menu optimization
// router.post('/menu-optimization', 
//   authenticateToken, 
//   validateInsightRequest('menu_optimization'), 
//   createMenuOptimization
// );

// router.get('/menu-optimization/:jobId', 
//   authenticateToken, 
//   getMenuOptimization
// );

// Insights history
router.get('/history', authenticateToken, getInsightsHistory);

module.exports = router;
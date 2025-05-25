const express = require('express');
const {
  // getJobStatus,
  getInsightsHistory,
  getFeatureStatus,
  deleteInsight,
  lockInsight,
  unlockInsight,
} = require('../controllers/insights-controller');
const {
  createDemandForecast,
  getDemandForecast,
  getServiceStatus,
  getDataQuality,
} = require('../controllers/demand-forecast-controller');
const {
  createMenuOptimization,
  getServiceStatus: getMenuOptimizationServiceStatus,
} = require('../controllers/menu-optimization-controller');
const { requireAuth } = require('../middleware/auth');
const { validateInsightRequest } = require('../middleware/validation');

const router = express.Router();

/**
 * AI Insights Routes
 * All routes require authentication and are designed for manager/owner roles
 */

// Feature status (available to all authenticated users)
router.get('/feature-status', requireAuth, getFeatureStatus);

// Job management
// router.get('/jobs/:jobId', requireAuth, getJobStatus);

// Demand forecasting
router.post('/demand-forecast', 
  requireAuth, 
  createDemandForecast
);

router.get('/demand-forecast/:id', 
  requireAuth, 
  getDemandForecast
);

// Service status and data quality
router.get('/demand-forecast-status', 
  requireAuth, 
  getServiceStatus
);

router.get('/demand-forecast/data-quality/:restaurantId', 
  requireAuth, 
  getDataQuality
);

// Menu optimization
router.post('/menu-optimization', 
  requireAuth, 
  createMenuOptimization
);

router.get('/menu-optimization-status', 
  requireAuth, 
  getMenuOptimizationServiceStatus
);

// Insights history
router.get('/history', requireAuth, getInsightsHistory);

// Insight management
router.delete('/:id', requireAuth, deleteInsight);
router.post('/:id/lock', requireAuth, lockInsight);
router.delete('/:id/lock', requireAuth, unlockInsight);

module.exports = router;
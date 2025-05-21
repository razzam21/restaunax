const express = require('express');
const { requireAuth } = require('../middleware/auth');
const reportController = require('../controllers/report-controller');

const router = express.Router();

// All report routes require authentication
router.use(requireAuth);

/**
 * @route GET /api/reports/orders
 * @desc Get orders report
 * @access Private - Manager/Owner only
 */
router.get('/orders', reportController.getOrdersReport);

/**
 * @route GET /api/reports/orders/download
 * @desc Download orders report as CSV or PDF
 * @access Private - Manager/Owner only
 */
router.get('/orders/download', reportController.downloadOrdersReport);

/**
 * @route GET /api/dashboard/metrics
 * @desc Get real-time dashboard metrics
 * @access Private - Manager/Owner only
 */
router.get('/dashboard/metrics', reportController.getDashboardMetrics);

module.exports = router;
const { createLogger } = require('../utils/logger');
const reportService = require('../services/report-service');
const sanitizeHtml = require('sanitize-html');

const logger = createLogger('report-controller');

/**
 * Authorize user access to reports
 * @param {Object} user - User object from request
 * @returns {boolean} - True if user is authorized
 */
const isAuthorizedForReports = (user) => {
  return user && (user.role === 'manager' || user.role === 'owner');
};

/**
 * Get orders report for a restaurant
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getOrdersReport = async (req, res) => {
  try {
    // Check authorization
    if (!isAuthorizedForReports(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Only managers and owners can access reports'
      });
    }

    // Sanitize query parameters
    const options = {
      startDate: req.query.startDate ? sanitizeHtml(req.query.startDate) : undefined,
      endDate: req.query.endDate ? sanitizeHtml(req.query.endDate) : undefined,
      status: req.query.status ? sanitizeHtml(req.query.status) : undefined,
      orderType: req.query.orderType ? sanitizeHtml(req.query.orderType) : undefined,
    };

    // Get report from service
    const report = await reportService.getOrdersReport(req.user.restaurantId, options);

    // Return success response
    return res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error in getOrdersReport controller', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'An error occurred while generating the report'
    });
  }
};

/**
 * Download orders report as CSV or PDF
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const downloadOrdersReport = async (req, res) => {
  try {
    // Check authorization
    if (!isAuthorizedForReports(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Only managers and owners can access reports'
      });
    }

    // Sanitize query parameters
    const options = {
      format: req.query.format ? sanitizeHtml(req.query.format) : 'csv',
      startDate: req.query.startDate ? sanitizeHtml(req.query.startDate) : undefined,
      endDate: req.query.endDate ? sanitizeHtml(req.query.endDate) : undefined,
    };

    // Generate report file
    const reportData = await reportService.generateOrdersReportData(
      req.user.restaurantId,
      options
    );

    // Disable all caching for downloads
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.removeHeader('ETag');
    res.removeHeader('Last-Modified');
    
    // Add timestamp to prevent caching
    res.set('X-Timestamp', Date.now().toString());

    // Set content type based on format
    if (reportData.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
    } else {
      res.setHeader('Content-Type', 'application/pdf');
    }

    // Set file download headers
    res.attachment(reportData.filename);
    
    // Send the file data
    return res.send(reportData.data);
  } catch (error) {
    logger.error('Error in downloadOrdersReport controller', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'An error occurred while generating the report'
    });
  }
};

/**
 * Get real-time dashboard metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardMetrics = async (req, res) => {
  try {
    // Check authorization
    if (!isAuthorizedForReports(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Only managers and owners can access dashboard metrics'
      });
    }

    // Get metrics from service
    const metrics = await reportService.getDashboardMetrics(req.user.restaurantId);

    // Return success response
    return res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error in getDashboardMetrics controller', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching dashboard metrics'
    });
  }
};

module.exports = {
  getOrdersReport,
  downloadOrdersReport,
  getDashboardMetrics
};
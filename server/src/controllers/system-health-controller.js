const asyncHandler = require('express-async-handler');
const SystemHealthService = require('../services/system-health-service');

// Lazy initialization of the service
let systemHealthService = null;
const getSystemHealthService = () => {
  if (!systemHealthService) {
    systemHealthService = new SystemHealthService();
  }
  return systemHealthService;
};
const { createLogger } = require('../utils/logger');
const Joi = require('joi');

const logger = createLogger('system-health-controller');

/**
 * @desc    Get overall system health status
 * @route   GET /api/system/health
 * @access  Private (Owner only)
 */
const getSystemHealth = asyncHandler(async (req, res) => {
  try {
    const health = await getSystemHealthService().getSystemHealth();
    
    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get system health',
      error,
      userId: req.user?.id,
      context: 'getSystemHealth',
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system health status',
    });
  }
});

/**
 * @desc    Get service health status
 * @route   GET /api/system/health/services
 * @access  Private (Owner only)
 */
const getServiceHealth = asyncHandler(async (req, res) => {
  try {
    const services = await getSystemHealthService().getServiceHealth();
    
    res.json({
      success: true,
      data: services,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get service health',
      error,
      userId: req.user?.id,
      context: 'getServiceHealth',
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve service health status',
    });
  }
});

/**
 * @desc    Get container status
 * @route   GET /api/system/containers
 * @access  Private (Owner only)
 */
const getContainers = asyncHandler(async (req, res) => {
  try {
    const containers = await getSystemHealthService().getContainerHealth();
    
    res.json({
      success: true,
      data: containers,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get container status',
      error,
      userId: req.user?.id,
      context: 'getContainers',
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve container status',
    });
  }
});

/**
 * @desc    Get feature flags
 * @route   GET /api/system/features
 * @access  Private (Owner only)
 */
const getFeatures = asyncHandler(async (req, res) => {
  try {
    const features = await getSystemHealthService().getFeatureFlags();
    
    res.json({
      success: true,
      data: features,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get feature flags',
      error,
      userId: req.user?.id,
      context: 'getFeatures',
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve feature flags',
    });
  }
});

/**
 * @desc    Update feature flag
 * @route   POST /api/system/features/:feature
 * @access  Private (Owner only)
 */
const updateFeature = asyncHandler(async (req, res) => {
  try {
    // Validate request body
    const schema = Joi.object({
      enabled: Joi.boolean().required(),
      config: Joi.object().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.details,
      });
    }

    const { feature } = req.params;
    const { enabled, config } = value;

    // Validate feature name
    if (!feature || typeof feature !== 'string' || feature.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Feature name is required',
      });
    }

    const updatedFeature = await getSystemHealthService().updateFeatureFlag(
      feature.trim(),
      enabled,
      config
    );

    // Log the action
    await getSystemHealthService().logSystemEvent(
      'info',
      `Feature flag '${feature}' ${enabled ? 'enabled' : 'disabled'}`,
      'system',
      { feature, enabled, config },
      req.user?.sub
    );

    res.json({
      success: true,
      data: updatedFeature,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to update feature flag',
      error,
      userId: req.user?.id,
      feature: req.params.feature,
      context: 'updateFeature',
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to update feature flag',
    });
  }
});

/**
 * @desc    Get system logs
 * @route   GET /api/system/logs
 * @access  Private (Owner only)
 */
const getSystemLogs = asyncHandler(async (req, res) => {
  try {
    // Validate query parameters
    const schema = Joi.object({
      level: Joi.string().valid('error', 'warn', 'info', 'debug').optional(),
      service: Joi.string().optional(),
      limit: Joi.number().integer().min(1).max(1000).optional(),
      offset: Joi.number().integer().min(0).optional(),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional(),
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details,
      });
    }

    const logs = await getSystemHealthService().getSystemLogs(value);
    
    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get system logs',
      error,
      userId: req.user?.id,
      context: 'getSystemLogs',
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system logs',
    });
  }
});

/**
 * @desc    Get system metrics
 * @route   GET /api/system/metrics
 * @access  Private (Owner only)
 */
const getSystemMetrics = asyncHandler(async (req, res) => {
  try {
    const metrics = await getSystemHealthService().getSystemMetrics();
    
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get system metrics',
      error,
      userId: req.user?.id,
      context: 'getSystemMetrics',
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system metrics',
    });
  }
});

/**
 * @desc    Trigger manual health check
 * @route   POST /api/system/health/check
 * @access  Private (Owner only)
 */
const triggerHealthCheck = asyncHandler(async (req, res) => {
  try {
    // Trigger manual health check
    await getSystemHealthService().performHealthChecks();
    
    // Log the action
    await getSystemHealthService().logSystemEvent(
      'info',
      'Manual health check triggered',
      'system',
      { triggeredBy: req.user?.username },
      req.user?.sub
    );

    res.json({
      success: true,
      message: 'Health check triggered successfully',
    });
  } catch (error) {
    logger.error({
      message: 'Failed to trigger health check',
      error,
      userId: req.user?.id,
      context: 'triggerHealthCheck',
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to trigger health check',
    });
  }
});

/**
 * @desc    Update container status
 * @route   POST /api/system/containers/update
 * @access  Private (Owner only)
 */
const updateContainerStatus = asyncHandler(async (req, res) => {
  try {
    // Trigger manual container status update
    await getSystemHealthService().updateContainerStatus();
    
    // Log the action
    await getSystemHealthService().logSystemEvent(
      'info',
      'Manual container status update triggered',
      'system',
      { triggeredBy: req.user?.username },
      req.user?.sub
    );

    res.json({
      success: true,
      message: 'Container status update triggered successfully',
    });
  } catch (error) {
    logger.error({
      message: 'Failed to update container status',
      error,
      userId: req.user?.id,
      context: 'updateContainerStatus',
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to update container status',
    });
  }
});

module.exports = {
  getSystemHealth,
  getServiceHealth,
  getContainers,
  getFeatures,
  updateFeature,
  getSystemLogs,
  getSystemMetrics,
  triggerHealthCheck,
  updateContainerStatus,
};
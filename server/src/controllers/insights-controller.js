const asyncHandler = require('express-async-handler');
const { createLogger } = require('../utils/logger');
// const aiService = require('../services/ai-service');
// const jobQueue = require('../services/job-queue');
const prisma = require('../db/client');
const { v4: uuidv4 } = require('uuid');

const logger = createLogger('insights-controller');

/**
 * AI Insights Controller
 * Handles all AI-powered insight generation with proper feature flag checking
 */

/**
 * POST /insights/demand-forecast
 * Request demand forecast analysis
 */
const createDemandForecast = asyncHandler(async (req, res) => {
  const config = require('../config');
  
  // Early feature flag check
  if (!config.ai.enabled) {
    return res.status(402).json({
      success: false,
      error: 'AI features are not available with your current plan. Upgrade to Premium to access demand forecasting and AI insights.',
      code: 'AI_FEATURES_DISABLED',
      upgradeRequired: true
    });
  }

  const { user } = req;
  const { restaurantId } = user;
  const { startDate, endDate, lookbackDays = 30 } = req.body;

  try {
    // Validate user has required permissions
    if (!['manager', 'owner'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Only managers and owners can access AI insights.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Validate input parameters
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required',
        code: 'MISSING_PARAMETERS'
      });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        code: 'INVALID_DATE_FORMAT'
      });
    }

    if (startDateObj >= endDateObj) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before end date',
        code: 'INVALID_DATE_RANGE'
      });
    }

    // Check if user has sufficient historical data
    const dataCheckDate = new Date(Date.now() - (lookbackDays * 24 * 60 * 60 * 1000));
    const orderCount = await prisma.order.count({
      where: {
        restaurantId,
        createdAt: {
          gte: dataCheckDate,
        },
      },
    });

    if (orderCount < 10) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient historical data. At least 10 orders are required for demand forecasting.',
        code: 'INSUFFICIENT_DATA',
        currentOrderCount: orderCount,
        requiredOrderCount: 10
      });
    }

    // Add job to queue
    const job = await jobQueue.addJob({
      type: 'demand_forecast',
      restaurantId,
      userId: user.id,
      parameters: {
        startDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
        lookbackDays,
        dataStartDate: dataCheckDate.toISOString(),
      },
    });

    logger.info('Demand forecast job created', {
      jobId: job.id,
      restaurantId,
      userId: user.id,
      startDate,
      endDate
    });

    res.status(202).json({
      success: true,
      message: 'Demand forecast analysis started',
      job: {
        id: job.id,
        status: job.status,
        estimatedCompletion: job.estimatedCompletion,
        type: 'demand_forecast'
      }
    });
  } catch (error) {
    logger.error('Failed to create demand forecast job', {
      error: error.message,
      restaurantId,
      userId: user.id
    });

    if (error.code === 'AI_FEATURES_DISABLED') {
      return res.status(402).json({
        success: false,
        error: error.message,
        code: error.code,
        upgradeRequired: true
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to start demand forecast analysis',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /insights/menu-optimization
 * Request menu optimization analysis
 */
const createMenuOptimization = asyncHandler(async (req, res) => {
  // Early feature flag check
  const config = require("../config");
  if (!config.ai.enabled) {
    return res.status(402).json({
      success: false,
      error: 'AI features are not available with your current plan. Upgrade to Premium to access menu optimization and AI insights.',
      code: 'AI_FEATURES_DISABLED',
      upgradeRequired: true
    });
  }

  const { user } = req;
  const { restaurantId } = user;
  const { lookbackDays = 30, includeInactive = false } = req.body;

  try {
    // Validate user has required permissions
    if (!['manager', 'owner'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Only managers and owners can access AI insights.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Check if restaurant has menu items
    const menuItemCount = await prisma.menuItem.count({
      where: {
        restaurantId,
        ...(includeInactive ? {} : { isActive: true }),
      },
    });

    if (menuItemCount < 3) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient menu items. At least 3 menu items are required for optimization analysis.',
        code: 'INSUFFICIENT_MENU_ITEMS',
        currentItemCount: menuItemCount,
        requiredItemCount: 3
      });
    }

    // Check order history
    const dataCheckDate = new Date(Date.now() - (lookbackDays * 24 * 60 * 60 * 1000));
    const orderCount = await prisma.order.count({
      where: {
        restaurantId,
        createdAt: {
          gte: dataCheckDate,
        },
      },
    });

    if (orderCount < 20) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient order history. At least 20 orders are required for menu optimization.',
        code: 'INSUFFICIENT_ORDER_HISTORY',
        currentOrderCount: orderCount,
        requiredOrderCount: 20
      });
    }

    // Add job to queue
    const job = await jobQueue.addJob({
      type: 'menu_optimization',
      restaurantId,
      userId: user.id,
      parameters: {
        lookbackDays,
        includeInactive,
        dataStartDate: dataCheckDate.toISOString(),
      },
    });

    logger.info('Menu optimization job created', {
      jobId: job.id,
      restaurantId,
      userId: user.id,
      lookbackDays
    });

    res.status(202).json({
      success: true,
      message: 'Menu optimization analysis started',
      job: {
        id: job.id,
        status: job.status,
        estimatedCompletion: job.estimatedCompletion,
        type: 'menu_optimization'
      }
    });
  } catch (error) {
    logger.error('Failed to create menu optimization job', {
      error: error.message,
      restaurantId,
      userId: user.id
    });

    if (error.code === 'AI_FEATURES_DISABLED') {
      return res.status(402).json({
        success: false,
        error: error.message,
        code: error.code,
        upgradeRequired: true
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to start menu optimization analysis',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /insights/jobs/:jobId
 * Get job status and progress
 */
const getJobStatus = asyncHandler(async (req, res) => {
  // Early feature flag check
  const config = require("../config");
  if (!config.ai.enabled) {
    return res.status(402).json({
      success: false,
      error: 'AI features are not available with your current plan. Upgrade to Premium to access AI insights.',
      code: 'AI_FEATURES_DISABLED',
      upgradeRequired: true
    });
  }

  const { user } = req;
  const { jobId } = req.params;

  try {
    // Validate user has required permissions
    if (!['manager', 'owner'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Only managers and owners can access AI insights.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Get job status
    const jobStatus = await jobQueue.getJobStatus(jobId);

    // Verify job belongs to user's restaurant
    const job = await prisma.aIJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        code: 'JOB_NOT_FOUND'
      });
    }

    if (job.restaurantId !== user.restaurantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Job belongs to different restaurant.',
        code: 'ACCESS_DENIED'
      });
    }

    logger.debug('Job status retrieved', {
      jobId,
      status: jobStatus.status,
      progress: jobStatus.progress,
      userId: user.id
    });

    res.json({
      success: true,
      job: jobStatus
    });
  } catch (error) {
    logger.error('Failed to get job status', {
      error: error.message,
      jobId,
      userId: user.id
    });

    if (error.message === 'Job not found') {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        code: 'JOB_NOT_FOUND'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve job status',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /insights/demand-forecast/:jobId
 * Get completed demand forecast results
 */
const getDemandForecast = asyncHandler(async (req, res) => {
  // Early feature flag check
  const config = require("../config");
  if (!config.ai.enabled) {
    return res.status(402).json({
      success: false,
      error: 'AI features are not available with your current plan. Upgrade to Premium to access AI insights.',
      code: 'AI_FEATURES_DISABLED',
      upgradeRequired: true
    });
  }

  const { user } = req;
  const { jobId } = req.params;

  try {
    // Validate user has required permissions
    if (!['manager', 'owner'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Only managers and owners can access AI insights.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Get insight with job data
    const insight = await prisma.aIInsight.findUnique({
      where: { jobId },
      include: {
        job: true,
      },
    });

    if (!insight) {
      return res.status(404).json({
        success: false,
        error: 'Forecast not found or not completed yet',
        code: 'FORECAST_NOT_FOUND'
      });
    }

    // Verify access
    if (insight.restaurantId !== user.restaurantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Forecast belongs to different restaurant.',
        code: 'ACCESS_DENIED'
      });
    }

    if (insight.job.status !== 'COMPLETED') {
      return res.status(409).json({
        success: false,
        error: 'Forecast is not completed yet',
        code: 'FORECAST_NOT_READY',
        currentStatus: insight.job.status.toLowerCase()
      });
    }

    logger.info('Demand forecast retrieved', {
      jobId,
      insightId: insight.id,
      userId: user.id
    });

    res.json({
      success: true,
      forecast: {
        id: insight.id,
        jobId: insight.jobId,
        title: insight.title,
        summary: insight.summary,
        confidence: insight.confidence,
        data: insight.data,
        createdAt: insight.createdAt,
        validUntil: insight.validUntil,
      }
    });
  } catch (error) {
    logger.error('Failed to get demand forecast', {
      error: error.message,
      jobId,
      userId: user.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve demand forecast',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /insights/menu-optimization/:jobId
 * Get completed menu optimization results
 */
const getMenuOptimization = asyncHandler(async (req, res) => {
  // Early feature flag check
  const config = require("../config");
  if (!config.ai.enabled) {
    return res.status(402).json({
      success: false,
      error: 'AI features are not available with your current plan. Upgrade to Premium to access AI insights.',
      code: 'AI_FEATURES_DISABLED',
      upgradeRequired: true
    });
  }

  const { user } = req;
  const { jobId } = req.params;

  try {
    // Validate user has required permissions
    if (!['manager', 'owner'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Only managers and owners can access AI insights.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Get insight with job data
    const insight = await prisma.aIInsight.findUnique({
      where: { jobId },
      include: {
        job: true,
      },
    });

    if (!insight) {
      return res.status(404).json({
        success: false,
        error: 'Menu optimization not found or not completed yet',
        code: 'OPTIMIZATION_NOT_FOUND'
      });
    }

    // Verify access
    if (insight.restaurantId !== user.restaurantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Optimization belongs to different restaurant.',
        code: 'ACCESS_DENIED'
      });
    }

    if (insight.job.status !== 'COMPLETED') {
      return res.status(409).json({
        success: false,
        error: 'Menu optimization is not completed yet',
        code: 'OPTIMIZATION_NOT_READY',
        currentStatus: insight.job.status.toLowerCase()
      });
    }

    logger.info('Menu optimization retrieved', {
      jobId,
      insightId: insight.id,
      userId: user.id
    });

    res.json({
      success: true,
      optimization: {
        id: insight.id,
        jobId: insight.jobId,
        title: insight.title,
        summary: insight.summary,
        confidence: insight.confidence,
        data: insight.data,
        createdAt: insight.createdAt,
        validUntil: insight.validUntil,
      }
    });
  } catch (error) {
    logger.error('Failed to get menu optimization', {
      error: error.message,
      jobId,
      userId: user.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve menu optimization',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /insights/history
 * Get list of user's insights history
 */
const getInsightsHistory = asyncHandler(async (req, res) => {
  const config = require('../config');
  
  // Early feature flag check
  if (!config.ai.enabled) {
    return res.status(402).json({
      success: false,
      error: 'AI features are not available with your current plan. Upgrade to Premium to access AI insights.',
      code: 'AI_FEATURES_DISABLED',
      upgradeRequired: true
    });
  }

  const { user } = req;
  const { page = 1, limit = 20, type } = req.query;

  try {
    // Validate user has required permissions
    if (!['manager', 'owner'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Only managers and owners can access AI insights.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {
      restaurantId: user.restaurantId,
      isActive: true,
    };

    if (type) {
      where.type = type.toUpperCase();
    }

    // Get insights with pagination
    const [insights, totalCount] = await Promise.all([
      prisma.aIInsight.findMany({
        where,
        include: {
          job: {
            select: {
              id: true,
              type: true,
              status: true,
              createdAt: true,
              completedAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.aIInsight.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    logger.debug('Insights history retrieved', {
      userId: user.id,
      page,
      limit,
      totalCount,
      type: type || 'all'
    });

    res.json({
      success: true,
      insights: insights.map(insight => ({
        id: insight.id,
        jobId: insight.jobId,
        type: insight.type.toLowerCase(),
        title: insight.title,
        summary: insight.summary,
        confidence: insight.confidence,
        createdAt: insight.createdAt,
        validUntil: insight.validUntil,
        job: {
          id: insight.job.id,
          status: insight.job.status.toLowerCase(),
          createdAt: insight.job.createdAt,
          completedAt: insight.job.completedAt,
        },
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPreviousPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    logger.error('Failed to get insights history', {
      error: error.message,
      userId: user.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve insights history',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /insights/feature-status
 * Get AI feature availability status
 */
const getFeatureStatus = asyncHandler(async (req, res) => {
  const { user } = req;

  try {
    const config = require('../config');
    const isEnabled = config.ai.enabled;
    const hasPermission = ['manager', 'owner'].includes(user.role);

    res.json({
      success: true,
      features: {
        aiEnabled: isEnabled,
        hasPermission,
        availableFeatures: isEnabled && hasPermission ? [
          'demand_forecast',
          'menu_optimization'
        ] : [],
        upgradeRequired: !isEnabled,
        permissionRequired: !hasPermission,
      }
    });
  } catch (error) {
    logger.error('Failed to get feature status', {
      error: error.message,
      userId: user.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve feature status',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = {
  createDemandForecast,
  createMenuOptimization,
  getJobStatus,
  getDemandForecast,
  getMenuOptimization,
  getInsightsHistory,
  getFeatureStatus,
};
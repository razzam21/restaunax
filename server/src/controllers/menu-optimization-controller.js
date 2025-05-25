const asyncHandler = require('express-async-handler');
const { createLogger } = require('../utils/logger');
const MenuOptimizationService = require('../services/menu-optimization-service');
const AIReportService = require('../services/ai-report-service');
const sanitizeHtml = require('sanitize-html');

const logger = createLogger('menu-optimization-controller');

/**
 * Menu Optimization Controller
 * Handles menu optimization requests with proper validation and error handling
 */

// Initialize services
let menuOptimizationService = null;
let aiReportService = null;

const getMenuOptimizationService = () => {
  if (!menuOptimizationService) {
    menuOptimizationService = new MenuOptimizationService();
  }
  return menuOptimizationService;
};

const getAIReportService = () => {
  if (!aiReportService) {
    aiReportService = new AIReportService();
  }
  return aiReportService;
};

/**
 * Sanitize string input to prevent XSS
 * @private
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {}
  });
};

/**
 * Validate user permissions for AI features
 * @private
 * @param {Object} user - User object from request
 * @param {Object} res - Express response object
 * @returns {boolean} True if user has access, false if response was sent
 */
const validateUserPermissions = (user, res) => {
  if (!['manager', 'owner'].includes(user.role)) {
    res.status(403).json({
      success: false,
      error: 'Insufficient permissions. Only managers and owners can access menu optimization.',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
    return false;
  }
  return true;
};

/**
 * Validate AI service availability
 * @private
 * @param {Object} res - Express response object
 * @returns {boolean} True if AI service is available, false if response was sent
 */
const validateAIService = (res) => {
  try {
    const aiService = getAIReportService();
    aiService.validateEnabled();
    return true;
  } catch (error) {
    if (error.code === 'AI_FEATURES_DISABLED') {
      res.status(402).json({
        success: false,
        error: error.message,
        code: 'AI_FEATURES_DISABLED',
        upgradeRequired: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'AI service validation failed',
        code: 'AI_SERVICE_ERROR'
      });
    }
    return false;
  }
};

/**
 * Validate optimization request parameters
 * @private
 * @param {Object} body - Request body
 * @param {Object} res - Express response object
 * @returns {Object|null} Validated parameters or null if validation failed
 */
const validateOptimizationRequest = (body, res) => {
  const { lookbackDays, includeInactive = false } = body;
  const errors = [];

  // Check required fields
  if (lookbackDays === undefined || lookbackDays === null) {
    errors.push('lookbackDays is required');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameters',
      code: 'VALIDATION_ERROR',
      details: errors
    });
    return null;
  }

  // Validate lookback days
  if (typeof lookbackDays !== 'number' || lookbackDays < 1) {
    res.status(400).json({
      success: false,
      error: 'Lookback days must be at least 1',
      code: 'VALIDATION_ERROR'
    });
    return null;
  }

  if (lookbackDays > 365) {
    res.status(400).json({
      success: false,
      error: 'Lookback days cannot exceed 365',
      code: 'VALIDATION_ERROR'
    });
    return null;
  }

  return {
    lookbackDays: parseInt(lookbackDays, 10),
    includeInactive: Boolean(includeInactive)
  };
};

/**
 * POST /menu-optimization/optimize
 * Create a new menu optimization analysis
 */
const createMenuOptimization = asyncHandler(async (req, res) => {
  const requestStartTime = Date.now();
  const { user } = req;
  
  logger.info('Menu optimization request received', {
    userId: user.id,
    restaurantId: user.restaurantId,
    role: user.role
  });

  // Validate AI service availability
  if (!validateAIService(res)) return;

  // Validate user permissions
  if (!validateUserPermissions(user, res)) return;

  // Validate request parameters
  const validatedParams = validateOptimizationRequest(req.body, res);
  if (!validatedParams) return;

  try {
    const optimizationService = getMenuOptimizationService();
    
    // Generate menu optimization
    const optimizationParams = {
      restaurantId: user.restaurantId,
      ...validatedParams
    };

    const optimizationResult = await optimizationService.generateMenuOptimization(optimizationParams);
    
    const totalDuration = Date.now() - requestStartTime;

    logger.info('Menu optimization generated successfully', {
      userId: user.id,
      restaurantId: user.restaurantId,
      confidence: optimizationResult.metadata?.confidence,
      itemCount: optimizationResult.data.item_performance?.length || 0,
      categoryCount: optimizationResult.data.category_performance?.length || 0,
      totalDuration,
      optimizationSummary: {
        totalItems: optimizationResult.data.summary?.total_items,
        activeItems: optimizationResult.data.summary?.active_items,
        totalRevenue: optimizationResult.data.summary?.total_revenue,
        insightsCount: optimizationResult.data.insights?.length || 0,
        recommendationsCount: optimizationResult.data.recommendations?.length || 0
      }
    });

    // Log detailed optimization data for debugging
    logger.debug('Generated optimization details', {
      userId: user.id,
      restaurantId: user.restaurantId,
      optimizationData: {
        summary: optimizationResult.data.summary,
        insights: optimizationResult.data.insights,
        recommendations: optimizationResult.data.recommendations,
        itemPerformanceCount: optimizationResult.data.item_performance?.length,
        categoryPerformanceCount: optimizationResult.data.category_performance?.length
      },
      metadata: optimizationResult.metadata
    });

    // Save optimization to database for history
    try {
      const prisma = require('../db/client');
      
      logger.debug('User object for database save', {
        userId: user.id,
        userSub: user.sub,
        restaurantId: user.restaurantId,
        username: user.username,
        role: user.role,
        allUserFields: Object.keys(user)
      });
      
      // First create the AIJob
      const aiJob = await prisma.aIJob.create({
        data: {
          restaurantId: user.restaurantId,
          userId: user.sub, // JWT uses 'sub' field for user ID
          type: 'menu_optimization',
          status: 'completed',
          parameters: {
            lookbackDays: validatedParams.lookbackDays,
            includeInactive: validatedParams.includeInactive
          },
          progress: 100,
          startedAt: new Date(requestStartTime),
          completedAt: new Date(),
          result: optimizationResult.data
        }
      });

      // Then create the AIInsight linked to the job
      const aiInsight = await prisma.aIInsight.create({
        data: {
          jobId: aiJob.id,
          restaurantId: user.restaurantId,
          type: 'menu_optimization',
          title: `Menu Optimization Analysis - ${validatedParams.lookbackDays} days of data`,
          summary: `AI-generated menu optimization analysis using ${validatedParams.lookbackDays} days of historical data${validatedParams.includeInactive ? ' (including inactive items)' : ''}.`,
          data: optimizationResult.data,
          confidence: optimizationResult.metadata?.confidence || 0.7
        }
      });
      
      logger.info('Optimization saved to database successfully', {
        userId: user.id,
        restaurantId: user.restaurantId,
        aiJobId: aiJob.id,
        aiInsightId: aiInsight.id,
        optimizationTitle: aiInsight.title,
        confidence: aiInsight.confidence,
        dataSize: JSON.stringify(optimizationResult.data).length
      });
    } catch (saveError) {
      
      logger.error('Failed to save optimization to history', { 
        error: saveError.message,
        stack: saveError.stack,
        code: saveError.code,
        userId: user.id,
        restaurantId: user.restaurantId,
        errorName: saveError.name,
        fullError: saveError.toString()
      });
      // Continue - don't fail the request if saving fails
    }

    // Build response with comprehensive information
    res.status(200).json({
      success: true,
      optimization: optimizationResult,
      requestInfo: {
        lookbackDays: validatedParams.lookbackDays,
        includeInactive: validatedParams.includeInactive,
        requestedBy: user.username,
        requestedAt: new Date().toISOString()
      },
      performance: {
        generation_duration: optimizationResult.metadata?.generation_duration || optimizationResult.metadata?.duration,
        total_request_duration: totalDuration
      }
    });

  } catch (error) {
    const totalDuration = Date.now() - requestStartTime;
    
    logger.error('Menu optimization generation failed', {
      userId: user.id,
      restaurantId: user.restaurantId,
      error: error.message,
      totalDuration
    });

    // Handle specific error types
    if (error.code === 'TIMEOUT') {
      return res.status(504).json({
        success: false,
        error: 'Request timeout while generating optimization',
        code: 'REQUEST_TIMEOUT'
      });
    }

    // Generic error response with fallback suggestions
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'OPTIMIZATION_GENERATION_FAILED',
      fallbackSuggestions: [
        'Check your internet connection and try again later',
        'Ensure you have sufficient menu and order data for accurate analysis',
        'Try reducing the lookback period if the analysis is taking too long',
        'Contact support if the issue persists'
      ]
    });
  }
});

/**
 * GET /menu-optimization/status
 * Get menu optimization service status
 */
const getServiceStatus = asyncHandler(async (req, res) => {
  const { user } = req;
  
  logger.debug('Service status request', {
    userId: user.id,
    restaurantId: user.restaurantId
  });

  try {
    const aiService = getAIReportService();
    const isEnabled = aiService.isEnabled();
    const connectionHealthy = isEnabled ? await aiService.testConnection() : false;

    const status = {
      enabled: isEnabled,
      connectionHealthy,
      availableFeatures: isEnabled ? ['menu_optimization'] : [],
      upgradeRequired: !isEnabled,
      lastChecked: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      status
    });

  } catch (error) {
    logger.error('Service status check failed', {
      userId: user.id,
      error: error.message
    });

    res.status(200).json({
      success: true,
      status: {
        enabled: false,
        connectionHealthy: false,
        availableFeatures: [],
        upgradeRequired: true,
        lastChecked: new Date().toISOString(),
        error: 'Status check failed'
      }
    });
  }
});

module.exports = {
  createMenuOptimization,
  getServiceStatus
};
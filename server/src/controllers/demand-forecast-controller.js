const asyncHandler = require('express-async-handler');
const { createLogger } = require('../utils/logger');
const DemandForecastService = require('../services/demand-forecast-service');
const AIReportService = require('../services/ai-report-service');
const sanitizeHtml = require('sanitize-html');

const logger = createLogger('demand-forecast-controller');

/**
 * Demand Forecast Controller
 * Handles demand forecasting requests with proper validation and error handling
 */

// Initialize services
let demandForecastService = null;
let aiReportService = null;

const getDemandForecastService = () => {
  if (!demandForecastService) {
    demandForecastService = new DemandForecastService();
  }
  return demandForecastService;
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
      error: 'Insufficient permissions. Only managers and owners can access demand forecasting.',
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
 * Validate forecast request parameters
 * @private
 * @param {Object} body - Request body
 * @param {Object} res - Express response object
 * @returns {Object|null} Validated parameters or null if validation failed
 */
const validateForecastRequest = (body, res) => {
  const { startDate, endDate, lookbackDays = 30 } = body;
  const errors = [];

  // Check required fields
  if (!startDate) errors.push('startDate is required');
  if (!endDate) errors.push('endDate is required');

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameters',
      code: 'VALIDATION_ERROR',
      details: errors
    });
    return null;
  }

  // Validate date formats
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  if (isNaN(startDateObj.getTime())) {
    res.status(400).json({
      success: false,
      error: 'Invalid date format for startDate',
      code: 'VALIDATION_ERROR'
    });
    return null;
  }

  if (isNaN(endDateObj.getTime())) {
    res.status(400).json({
      success: false,
      error: 'Invalid date format for endDate',
      code: 'VALIDATION_ERROR'
    });
    return null;
  }

  // Validate date range
  if (endDateObj <= startDateObj) {
    res.status(400).json({
      success: false,
      error: 'End date must be after start date',
      code: 'VALIDATION_ERROR'
    });
    return null;
  }

  // Validate forecast period length (max 90 days)
  const daysDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
  if (daysDiff > 90) {
    res.status(400).json({
      success: false,
      error: 'Forecast period cannot exceed 90 days',
      code: 'VALIDATION_ERROR'
    });
    return null;
  }

  // Validate lookback days
  if (typeof lookbackDays !== 'number' || lookbackDays < 1) {
    res.status(400).json({
      success: false,
      error: 'Lookback days must be a number greater than or equal to 1',
      code: 'VALIDATION_ERROR'
    });
    return null;
  }

  return {
    startDate: startDateObj,
    endDate: endDateObj,
    lookbackDays: parseInt(lookbackDays, 10)
  };
};

/**
 * POST /demand-forecast/forecast
 * Create a new demand forecast
 */
const createDemandForecast = asyncHandler(async (req, res) => {
  const requestStartTime = Date.now();
  const { user } = req;
  
  logger.info('Demand forecast request received', {
    userId: user.id,
    restaurantId: user.restaurantId,
    role: user.role
  });

  // Validate AI service availability
  if (!validateAIService(res)) return;

  // Validate user permissions
  if (!validateUserPermissions(user, res)) return;

  // Validate request parameters
  const validatedParams = validateForecastRequest(req.body, res);
  if (!validatedParams) return;

  try {
    const forecastService = getDemandForecastService();
    
    // Generate demand forecast
    const forecastParams = {
      restaurantId: user.restaurantId,
      ...validatedParams
    };

    const forecastResult = await forecastService.generateDemandForecast(forecastParams);
    
    const totalDuration = Date.now() - requestStartTime;

    logger.info('Demand forecast generated successfully', {
      userId: user.id,
      restaurantId: user.restaurantId,
      confidence: forecastResult.data.confidence,
      forecastDays: forecastResult.data.forecast?.length || 0,
      totalDuration
    });

    // Save forecast to database for history
    try {
      const prisma = require('../db/client');
      
      // First create the AIJob
      const aiJob = await prisma.aIJob.create({
        data: {
          restaurantId: user.restaurantId,
          userId: user.sub, // JWT uses 'sub' field for user ID
          type: 'demand_forecast',
          status: 'completed',
          parameters: {
            startDate: validatedParams.startDate.toISOString(),
            endDate: validatedParams.endDate.toISOString(),
            lookbackDays: validatedParams.lookbackDays
          },
          progress: 100,
          startedAt: new Date(requestStartTime),
          completedAt: new Date(),
          result: forecastResult.data
        }
      });

      // Then create the AIInsight linked to the job
      await prisma.aIInsight.create({
        data: {
          jobId: aiJob.id,
          restaurantId: user.restaurantId,
          type: 'demand_forecast',
          title: `Demand Forecast - ${validatedParams.startDate.toLocaleDateString()} to ${validatedParams.endDate.toLocaleDateString()}`,
          summary: `AI-generated demand forecast for ${Math.ceil((validatedParams.endDate - validatedParams.startDate) / (1000 * 60 * 60 * 24))} days using ${validatedParams.lookbackDays} days of historical data.`,
          data: forecastResult.data,
          confidence: forecastResult.data.confidence || 0.7
        }
      });
      
      logger.debug('Forecast saved to insights history');
    } catch (saveError) {
      logger.error('Failed to save forecast to history', { 
        error: saveError.message,
        stack: saveError.stack,
        userId: user.id,
        restaurantId: user.restaurantId
      });
      // Continue - don't fail the request if saving fails
    }

    // Build response with comprehensive information
    res.status(200).json({
      success: true,
      forecast: forecastResult,
      requestInfo: {
        startDate: validatedParams.startDate.toISOString(),
        endDate: validatedParams.endDate.toISOString(),
        lookbackDays: validatedParams.lookbackDays,
        requestedBy: user.username,
        requestedAt: new Date().toISOString()
      },
      performance: {
        generation_duration: forecastResult.metadata?.generation_duration || forecastResult.metadata?.duration,
        total_request_duration: totalDuration
      }
    });

  } catch (error) {
    const totalDuration = Date.now() - requestStartTime;
    
    logger.error('Demand forecast generation failed', {
      userId: user.id,
      restaurantId: user.restaurantId,
      error: error.message,
      totalDuration
    });

    // Handle specific error types
    if (error.code === 'TIMEOUT') {
      return res.status(504).json({
        success: false,
        error: 'Request timeout while generating forecast',
        code: 'REQUEST_TIMEOUT'
      });
    }

    // Generic error response with fallback suggestions
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FORECAST_GENERATION_FAILED',
      fallbackSuggestions: [
        'Check your internet connection and try again later',
        'Ensure you have sufficient historical data for accurate forecasting',
        'Contact support if the issue persists'
      ]
    });
  }
});

/**
 * GET /demand-forecast/forecast/:forecastId
 * Retrieve a previously generated forecast
 */
const getDemandForecast = asyncHandler(async (req, res) => {
  const { user } = req;
  const { forecastId } = req.params;

  logger.info('Forecast retrieval request', {
    userId: user.id,
    restaurantId: user.restaurantId,
    forecastId
  });

  // Validate user permissions
  if (!validateUserPermissions(user, res)) return;

  try {
    const forecastService = getDemandForecastService();
    
    // Mock forecast retrieval - in real implementation, this would query database
    const storedForecast = await forecastService.getForecastById?.(forecastId);
    
    if (!storedForecast) {
      return res.status(404).json({
        success: false,
        error: 'Forecast not found',
        code: 'FORECAST_NOT_FOUND'
      });
    }

    // Ensure user can only access forecasts from their restaurant
    if (storedForecast.restaurantId !== user.restaurantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to forecast from different restaurant',
        code: 'ACCESS_DENIED'
      });
    }

    res.status(200).json({
      success: true,
      forecast: storedForecast
    });

  } catch (error) {
    logger.error('Forecast retrieval failed', {
      userId: user.id,
      restaurantId: user.restaurantId,
      forecastId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve forecast',
      code: 'FORECAST_RETRIEVAL_FAILED'
    });
  }
});

/**
 * GET /demand-forecast/status
 * Get demand forecasting service status
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
      availableFeatures: isEnabled ? ['demand_forecast'] : [],
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

/**
 * GET /demand-forecast/data-quality/:restaurantId
 * Assess data quality for demand forecasting
 */
const getDataQuality = asyncHandler(async (req, res) => {
  const { user } = req;
  const { restaurantId } = req.params;

  logger.info('Data quality assessment request', {
    userId: user.id,
    requestedRestaurantId: restaurantId,
    userRestaurantId: user.restaurantId
  });

  // Validate user permissions
  if (!validateUserPermissions(user, res)) return;

  // Ensure user can only assess data from their restaurant
  if (restaurantId !== user.restaurantId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied to data from different restaurant',
      code: 'ACCESS_DENIED'
    });
  }

  try {
    const forecastService = getDemandForecastService();
    
    // Aggregate historical data for quality assessment
    const historicalData = await forecastService.aggregateHistoricalData(restaurantId, 30);
    const dataQuality = forecastService.assessDataQuality(historicalData.totalOrders, 30);

    // Generate quality-specific recommendations
    const recommendations = [];
    if (dataQuality === 'low') {
      recommendations.push(
        'Increase order volume to improve forecast accuracy',
        'Consider running promotions to generate more historical data',
        'Wait for more data before generating forecasts'
      );
    } else if (dataQuality === 'medium') {
      recommendations.push(
        'Data quality is sufficient for basic forecasting',
        'More historical data will improve accuracy',
        'Consider seasonal variations in your analysis'
      );
    } else {
      recommendations.push(
        'Excellent data quality for accurate forecasting',
        'Historical patterns are well established',
        'Forecasts should have high confidence levels'
      );
    }

    const assessment = {
      quality: dataQuality,
      totalOrders: historicalData.totalOrders,
      totalRevenue: historicalData.totalRevenue,
      averageOrderValue: historicalData.averageOrderValue,
      dateRange: historicalData.dateRange,
      recommendations,
      assessedAt: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      assessment
    });

  } catch (error) {
    logger.error('Data quality assessment failed', {
      userId: user.id,
      restaurantId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to assess data quality',
      code: 'DATA_QUALITY_ASSESSMENT_FAILED'
    });
  }
});

module.exports = {
  createDemandForecast,
  getDemandForecast,
  getServiceStatus,
  getDataQuality
};
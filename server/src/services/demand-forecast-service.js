const prisma = require('../db/client');
const { createLogger } = require('../utils/logger');
const AIReportService = require('./ai-report-service');
const sanitizeHtml = require('sanitize-html');

const logger = createLogger('demand-forecast-service');

/**
 * Demand Forecast Service
 * Handles business logic for generating AI-powered demand forecasts
 * Uses historical order data to predict future demand patterns
 */
class DemandForecastService {
  constructor() {
    this.aiReportService = new AIReportService();
    logger.info('Demand Forecast Service initialized');
  }

  /**
   * Sanitize input to prevent XSS and injection attacks
   * @private
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  _sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return sanitizeHtml(input, {
      allowedTags: [],
      allowedAttributes: {}
    });
  }

  /**
   * Validate demand forecast parameters
   * @private
   * @param {Object} params - Forecast parameters
   * @throws {Error} If parameters are invalid
   */
  _validateParams(params) {
    const required = ['restaurantId', 'startDate', 'endDate', 'lookbackDays'];
    const missing = required.filter(field => !params[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }

    // Validate date range
    if (params.startDate >= params.endDate) {
      throw new Error('End date must be after start date');
    }

    // Validate forecast period length (max 90 days)
    const daysDiff = Math.ceil((params.endDate - params.startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      throw new Error('Forecast period cannot exceed 90 days');
    }

    // Validate lookback period
    if (params.lookbackDays < 1) {
      throw new Error('Lookback days must be at least 1');
    }
  }

  /**
   * Aggregate historical order data for analysis
   * @param {string} restaurantId - Restaurant ID
   * @param {number} lookbackDays - Number of days to look back
   * @returns {Promise<Object>} Aggregated historical data
   */
  async aggregateHistoricalData(restaurantId, lookbackDays) {
    try {
      const sanitizedRestaurantId = this._sanitizeInput(restaurantId);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - lookbackDays);

      logger.debug('Aggregating historical data', {
        restaurantId: sanitizedRestaurantId,
        lookbackDays,
        dateRange: { startDate, endDate }
      });

      // Fetch orders within the date range
      const orders = await prisma.order.findMany({
        where: {
          restaurantId: sanitizedRestaurantId,
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: 'delivered' // Only include delivered orders
        },
        include: {
          items: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // Initialize aggregation containers
      const hourlyBreakdown = {};
      const dailyBreakdown = {};
      const orderTypeBreakdown = {};
      const menuItemPerformance = {};
      
      let totalRevenue = 0;

      // Process each order
      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const hour = orderDate.getHours();
        const dayOfWeek = orderDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        totalRevenue += order.total;

        // Hourly breakdown
        if (!hourlyBreakdown[hour]) {
          hourlyBreakdown[hour] = { orderCount: 0, revenue: 0 };
        }
        hourlyBreakdown[hour].orderCount++;
        hourlyBreakdown[hour].revenue += order.total;

        // Daily breakdown (by day of week)
        if (!dailyBreakdown[dayOfWeek]) {
          dailyBreakdown[dayOfWeek] = { orderCount: 0, revenue: 0 };
        }
        dailyBreakdown[dayOfWeek].orderCount++;
        dailyBreakdown[dayOfWeek].revenue += order.total;

        // Order type breakdown
        if (!orderTypeBreakdown[order.orderType]) {
          orderTypeBreakdown[order.orderType] = { orderCount: 0, revenue: 0 };
        }
        orderTypeBreakdown[order.orderType].orderCount++;
        orderTypeBreakdown[order.orderType].revenue += order.total;

        // Menu item performance
        if (order.items) {
          order.items.forEach(item => {
            if (!menuItemPerformance[item.menuItemId]) {
              menuItemPerformance[item.menuItemId] = {
                totalQuantity: 0,
                totalRevenue: 0,
                orderCount: 0
              };
            }
            menuItemPerformance[item.menuItemId].totalQuantity += item.quantity;
            menuItemPerformance[item.menuItemId].totalRevenue += (item.price * item.quantity);
            menuItemPerformance[item.menuItemId].orderCount++;
          });
        }
      });

      const aggregatedData = {
        totalOrders: orders.length,
        totalRevenue,
        averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        hourlyBreakdown,
        dailyBreakdown,
        orderTypeBreakdown,
        menuItemPerformance,
        dateRange: { startDate, endDate }
      };

      logger.info('Historical data aggregation completed', {
        restaurantId: sanitizedRestaurantId,
        totalOrders: orders.length,
        totalRevenue,
        lookbackDays
      });

      return aggregatedData;
    } catch (error) {
      logger.error('Failed to aggregate historical data', {
        restaurantId,
        lookbackDays,
        error: error.message
      });
      throw new Error(`Failed to aggregate historical data: ${error.message}`);
    }
  }

  /**
   * Generate system prompt for demand forecasting
   * @returns {string} System prompt
   */
  generateSystemPrompt() {
    return `You are a restaurant demand forecasting expert with deep knowledge of:

- Restaurant industry trends and seasonal patterns
- Customer behavior analysis and ordering patterns
- Peak hours identification and capacity planning
- Menu item performance correlation with demand
- Day-of-week and time-of-day demand variations

Your task is to analyze historical order data and generate accurate demand forecasts.

IMPORTANT INSTRUCTIONS:
1. Provide predictions for each day in the forecast period
2. Include hourly predictions for peak identification
3. Consider seasonal trends, day-of-week patterns, and historical growth
4. Assess confidence levels based on data quality and consistency
5. Provide actionable insights and staffing recommendations

REQUIRED RESPONSE FORMAT (JSON):
{
  "confidence": number (0-1),
  "forecast": [
    {
      "date": "YYYY-MM-DD",
      "predicted_orders": number,
      "predicted_revenue": number,
      "confidence": number (0-1),
      "peak_hours": ["HH:00", "HH:00"],
      "notes": "string"
    }
  ],
  "insights": [
    "string - pattern observations"
  ],
  "recommendations": [
    "string - actionable recommendations"
  ],
  "summary": {
    "total_predicted_orders": number,
    "total_predicted_revenue": number,
    "average_confidence": number,
    "growth_trend": "increasing|stable|decreasing"
  }
}

Focus on accuracy, provide confidence levels, and give practical recommendations for restaurant operations.`;
  }

  /**
   * Generate user prompt with forecast parameters and historical data
   * @param {Object} params - Forecast parameters
   * @param {Object} historicalData - Aggregated historical data
   * @returns {string} User prompt
   */
  generateUserPrompt(params, historicalData) {
    const { startDate, endDate, lookbackDays } = params;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    let prompt = `Please generate a demand forecast for the following period:

## Forecast Period
- Start Date: ${startDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}
- End Date: ${endDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}
- Analysis Period: ${lookbackDays} days of historical data

## Historical Summary (Last ${lookbackDays} Days)
- Total Orders: ${historicalData.totalOrders}
- Total Revenue: $${historicalData.totalRevenue.toFixed(2)}
- Average Order Value: $${historicalData.averageOrderValue.toFixed(2)}

## Hourly Patterns
`;

    // Add hourly breakdown
    Object.entries(historicalData.hourlyBreakdown)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([hour, data]) => {
        prompt += `- Hour ${hour}: ${data.orderCount} orders, $${data.revenue.toFixed(2)} revenue\n`;
      });

    prompt += `\n## Daily Patterns (by Day of Week)
`;

    // Add daily breakdown
    Object.entries(historicalData.dailyBreakdown)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([dayOfWeek, data]) => {
        prompt += `- ${dayNames[parseInt(dayOfWeek)]}: ${data.orderCount} orders, $${data.revenue.toFixed(2)} revenue\n`;
      });

    prompt += `\n## Order Type Distribution
`;

    // Add order type breakdown
    if (historicalData.orderTypeBreakdown && Object.keys(historicalData.orderTypeBreakdown).length > 0) {
      Object.entries(historicalData.orderTypeBreakdown).forEach(([type, data]) => {
        prompt += `- ${type}: ${data.orderCount} orders (${((data.orderCount / historicalData.totalOrders) * 100).toFixed(1)}%)\n`;
      });
    } else {
      prompt += `- No order type data available\n`;
    }

    prompt += `\nBased on this historical data, please provide a detailed forecast for the specified period. Consider trends, patterns, and any seasonal factors that might affect demand.`;

    return prompt;
  }

  /**
   * Assess data quality based on order volume and timeframe
   * @param {number} orderCount - Total number of orders
   * @param {number} lookbackDays - Lookback period in days
   * @returns {string} Quality assessment: 'high', 'medium', or 'low'
   */
  assessDataQuality(orderCount, lookbackDays) {
    const ordersPerDay = orderCount / lookbackDays;
    
    if (ordersPerDay >= 3) return 'high';
    if (ordersPerDay >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Validate and enhance AI response structure
   * @private
   * @param {Object} aiResponse - Raw AI response
   * @param {Object} historicalData - Historical data context
   * @returns {Object} Enhanced response
   */
  _enhanceAIResponse(aiResponse, historicalData) {
    const data = aiResponse.data || {};
    
    // Ensure required structure exists
    const enhancedData = {
      confidence: data.confidence || 0.7,
      forecast: data.forecast || [],
      insights: data.insights || [],
      recommendations: data.recommendations || [],
      summary: data.summary || {
        total_predicted_orders: 0,
        total_predicted_revenue: 0,
        average_confidence: data.confidence || 0.7,
        growth_trend: 'stable'
      },
      ...data
    };

    // Add data quality warnings if applicable but only for the assessment call in generateDemandForecast
    // This prevents duplicate warnings during testing

    return enhancedData;
  }

  /**
   * Generate demand forecast using AI analysis
   * @param {Object} params - Forecast parameters
   * @param {string} params.restaurantId - Restaurant ID
   * @param {Date} params.startDate - Forecast start date
   * @param {Date} params.endDate - Forecast end date
   * @param {number} params.lookbackDays - Historical data lookback period
   * @returns {Promise<Object>} Demand forecast result
   */
  async generateDemandForecast(params) {
    this._validateParams(params);
    
    const startTime = Date.now();
    
    try {
      logger.info('Starting demand forecast generation', {
        restaurantId: params.restaurantId,
        forecastPeriod: {
          start: params.startDate,
          end: params.endDate
        },
        lookbackDays: params.lookbackDays
      });

      // Aggregate historical data
      const historicalData = await this.aggregateHistoricalData(
        params.restaurantId, 
        params.lookbackDays
      );

      // Assess data quality
      const dataQuality = this.assessDataQuality(historicalData.totalOrders, params.lookbackDays);
      
      // Generate AI report
      const systemPrompt = this.generateSystemPrompt();
      const userPrompt = this.generateUserPrompt(params, historicalData);
      
      const aiResponse = await this.aiReportService.generateReport({
        reportType: 'demand_forecast',
        systemPrompt,
        userPrompt,
        data: {
          historicalData,
          forecastParams: params
        },
        temperature: 0.3, // Lower temperature for more consistent predictions
        maxTokens: 2000
      });

      // Enhance and validate response
      const enhancedData = this._enhanceAIResponse(aiResponse, historicalData);
      
      // Add data quality warnings for low quality data
      if (dataQuality === 'low') {
        const lowDataInsight = 'Note: Forecast based on limited historical data. Confidence may be reduced.';
        const lowDataRecommendation = 'Collect more historical data to improve forecast accuracy.';
        
        if (!enhancedData.insights.includes(lowDataInsight)) {
          enhancedData.insights.unshift(lowDataInsight);
        }
        if (!enhancedData.recommendations.includes(lowDataRecommendation)) {
          enhancedData.recommendations.unshift(lowDataRecommendation);
        }
      }
      
      const duration = Date.now() - startTime;
      
      logger.info('Demand forecast generation completed', {
        restaurantId: params.restaurantId,
        dataQuality,
        confidence: enhancedData.confidence,
        forecastDays: enhancedData.forecast.length,
        duration
      });

      return {
        success: true,
        type: 'demand_forecast',
        data: enhancedData,
        historicalContext: {
          lookbackDays: params.lookbackDays,
          totalOrders: historicalData.totalOrders,
          totalRevenue: historicalData.totalRevenue,
          dataQuality,
          dateRange: historicalData.dateRange
        },
        metadata: {
          ...aiResponse.metadata,
          generation_duration: duration,
          forecast_period: {
            start: params.startDate.toISOString(),
            end: params.endDate.toISOString(),
            days: Math.ceil((params.endDate - params.startDate) / (1000 * 60 * 60 * 24))
          }
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Demand forecast generation failed', {
        restaurantId: params.restaurantId,
        error: error.message,
        duration
      });
      
      throw new Error(`Failed to generate demand forecast: ${error.message}`);
    }
  }
}

module.exports = DemandForecastService;
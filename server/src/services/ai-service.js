const { createLogger } = require('../utils/logger');
const config = require('../config');
const AIManager = require('./ai-manager');

const logger = createLogger('ai-service');

/**
 * AI Service - Engine-agnostic AI integration layer
 * This service provides a standardized interface for AI operations
 * Uses the AI Manager to abstract away specific AI engine implementations
 */
class AIService {
  constructor() {
    this.aiManager = new AIManager();
    this.enabled = config.ai.enabled;
    
    logger.info('AI Service initialized with AI Manager', {
      enabled: this.enabled,
      availableEngines: this.aiManager.getAvailableEngines()
    });
  }

  /**
   * Check if AI features are enabled
   * @returns {boolean} True if AI is enabled
   */
  isEnabled() {
    return this.aiManager.isEnabled();
  }

  /**
   * Validate that AI features are enabled, throw error if not
   * @throws {Error} Human-readable error if AI features are disabled
   */
  validateEnabled() {
    try {
      this.aiManager.validateEnabled();
    } catch (error) {
      // Provide user-friendly error message for premium feature
      const userError = new Error('AI features are not available with your current plan. Upgrade to Premium to access demand forecasting and AI insights.');
      userError.code = 'AI_FEATURES_DISABLED';
      userError.statusCode = 402; // Payment Required
      throw userError;
    }
  }

  /**
   * Test connection to AI services
   * @returns {Promise<boolean>} True if at least one engine is available
   */
  async testConnection() {
    if (!this.enabled) {
      return false;
    }

    try {
      const results = await this.aiManager.testConnection();
      const hasWorkingEngine = Object.values(results).some(result => 
        result === true || (typeof result === 'object' && result.success)
      );
      
      logger.info('AI service connection test completed', { results, hasWorkingEngine });
      return hasWorkingEngine;
    } catch (error) {
      logger.error('AI service connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Generate demand forecast using AI
   * @param {Object} params - Forecast parameters
   * @param {string} params.restaurantId - Restaurant ID
   * @param {Date} params.startDate - Start date for historical data
   * @param {Date} params.endDate - End date for forecast
   * @param {Array} params.historicalData - Historical order data
   * @returns {Promise<Object>} Forecast result
   */
  async generateDemandForecast(params) {
    this.validateEnabled();
    
    const { restaurantId, startDate, endDate, historicalData } = params;
    
    logger.info('Generating demand forecast', {
      restaurantId,
      startDate,
      endDate,
      dataPoints: historicalData.length
    });

    try {
      const systemPrompt = `You are a restaurant demand forecasting expert. Analyze historical order data and provide accurate forecasts with actionable insights for restaurant operations.

Format your response as JSON with the following structure:
{
  "confidence": 0.85,
  "periods": [
    {
      "date": "2024-01-01",
      "hour": 12,
      "predicted_orders": 15,
      "predicted_revenue": 450.00,
      "confidence": 0.87
    }
  ],
  "insights": [
    "Peak hours are typically 12-2 PM and 6-8 PM",
    "Weekend demand is 40% higher than weekdays"
  ],
  "recommendations": [
    "Staff 2 additional servers during peak hours",
    "Prepare 20% more ingredients on weekends"
  ]
}

Focus on identifying patterns in order volume, revenue, and timing. Consider seasonality, day-of-week effects, and time-of-day patterns.`;

      const userPrompt = `Analyze the following historical order data and provide a forecast for the period from ${startDate.toISOString()} to ${endDate.toISOString()}:

Historical Data:
${JSON.stringify(historicalData, null, 2)}

Please provide detailed forecasting with confidence intervals and actionable recommendations for restaurant operations.`;

      const result = await this.aiManager.generateInsight(systemPrompt, userPrompt, {
        timeout: 45000 // Longer timeout for complex forecasting
      });
      
      // Parse the AI response as JSON
      let forecastData;
      try {
        forecastData = JSON.parse(result.text);
      } catch (parseError) {
        logger.warn('Failed to parse AI response as JSON, using fallback', {
          error: parseError.message
        });
        
        forecastData = {
          confidence: result.confidence || 0.7,
          periods: [],
          insights: ['Forecast could not be generated due to parsing error'],
          recommendations: ['Please try again with different parameters']
        };
      }
      
      logger.info('Demand forecast generated successfully', {
        restaurantId,
        forecastPeriods: forecastData.periods?.length || 0,
        engine: result.metadata?.engine || 'unknown'
      });

      return {
        type: 'demand_forecast',
        confidence: forecastData.confidence || result.confidence || 0.75,
        data: forecastData,
        metadata: {
          ...result.metadata,
          generatedAt: new Date().toISOString(),
          dataPoints: historicalData.length
        }
      };
    } catch (error) {
      logger.error('Failed to generate demand forecast', {
        error: error.message,
        restaurantId
      });
      throw new Error(`Failed to generate demand forecast: ${error.message}`);
    }
  }

  /**
   * Generate menu optimization insights using AI
   * @param {Object} params - Optimization parameters
   * @param {string} params.restaurantId - Restaurant ID
   * @param {Array} params.menuItems - Menu items with performance data
   * @param {Array} params.orderHistory - Order history data
   * @returns {Promise<Object>} Optimization insights
   */
  async generateMenuOptimization(params) {
    this.validateEnabled();
    
    const { restaurantId, menuItems, orderHistory } = params;
    
    logger.info('Generating menu optimization', {
      restaurantId,
      menuItemCount: menuItems.length,
      orderCount: orderHistory.length
    });

    try {
      const systemPrompt = `You are a restaurant menu optimization expert. Analyze menu performance and order data to provide actionable recommendations for improving profitability and customer satisfaction.

Format your response as JSON with the following structure:
{
  "confidence": 0.82,
  "recommendations": [
    {
      "type": "pricing",
      "item_id": "uuid",
      "item_name": "Pasta Carbonara",
      "current_price": 14.99,
      "suggested_price": 16.99,
      "reason": "High demand item with low profit margin",
      "expected_impact": "+15% revenue"
    },
    {
      "type": "removal",
      "item_id": "uuid",
      "item_name": "Unpopular Dish",
      "reason": "Low order frequency and negative reviews",
      "expected_impact": "-2% costs"
    }
  ],
  "insights": [
    "Top 3 items generate 45% of revenue",
    "Vegetarian options have 25% higher profit margins"
  ],
  "performance_metrics": {
    "best_performers": ["item1", "item2"],
    "underperformers": ["item3", "item4"],
    "profit_leaders": ["item5", "item6"]
  }
}

Focus on identifying high-performing items, underperforming items, pricing opportunities, and menu composition optimization.`;

      const userPrompt = `Analyze the following menu items and order history to provide optimization recommendations:

Menu Items:
${JSON.stringify(menuItems, null, 2)}

Recent Order History (sample):
${JSON.stringify(orderHistory.slice(0, 100), null, 2)}

Please provide specific, actionable recommendations for improving menu performance, pricing strategy, and overall profitability.`;

      const result = await this.aiManager.generateInsight(systemPrompt, userPrompt, {
        timeout: 45000 // Longer timeout for complex analysis
      });
      
      // Parse the AI response as JSON
      let optimizationData;
      try {
        optimizationData = JSON.parse(result.text);
      } catch (parseError) {
        logger.warn('Failed to parse AI response as JSON, using fallback', {
          error: parseError.message
        });
        
        optimizationData = {
          confidence: result.confidence || 0.7,
          recommendations: [],
          insights: ['Menu optimization could not be generated due to parsing error'],
          performance_metrics: {
            best_performers: [],
            underperformers: [],
            profit_leaders: []
          }
        };
      }
      
      logger.info('Menu optimization generated successfully', {
        restaurantId,
        recommendationCount: optimizationData.recommendations?.length || 0,
        engine: result.metadata?.engine || 'unknown'
      });

      return {
        type: 'menu_optimization',
        confidence: optimizationData.confidence || result.confidence || 0.8,
        data: optimizationData,
        metadata: {
          ...result.metadata,
          generatedAt: new Date().toISOString(),
          menuItemsAnalyzed: menuItems.length
        }
      };
    } catch (error) {
      logger.error('Failed to generate menu optimization', {
        error: error.message,
        restaurantId
      });
      throw new Error(`Failed to generate menu optimization: ${error.message}`);
    }
  }

  /**
   * Get information about available AI engines
   * @returns {Object} Engine information
   */
  getEngineInfo() {
    return {
      enabled: this.enabled,
      availableEngines: this.aiManager.getAvailableEngines(),
      primaryEngine: this.aiManager.primaryEngine,
      enginesInfo: this.aiManager.getEnginesInfo()
    };
  }
}

// Export singleton instance
module.exports = new AIService();
const axios = require('axios');
const { createLogger } = require('../utils/logger');
const config = require('../config');

const logger = createLogger('ai-service');

/**
 * AI Service - Isolated and replaceable AI integration layer
 * This service provides a standardized interface for AI operations
 * and can be easily replaced with different AI providers
 */
class AIService {
  constructor() {
    this.enabled = config.ai.enabled;
    this.baseURL = config.ai.baseURL;
    this.model = config.ai.model;
    this.timeout = config.ai.timeout;
    
    // Create axios instance for Ollama API
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info('AI Service initialized', {
      enabled: this.enabled,
      baseURL: this.baseURL,
      model: this.model
    });
  }

  /**
   * Check if AI features are enabled
   * @returns {boolean} True if AI is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Validate that AI features are enabled, throw error if not
   * @throws {Error} Human-readable error if AI features are disabled
   */
  validateEnabled() {
    if (!this.enabled) {
      const error = new Error('AI features are not available with your current plan. Upgrade to Premium to access demand forecasting and AI insights.');
      error.code = 'AI_FEATURES_DISABLED';
      error.statusCode = 402; // Payment Required
      throw error;
    }
  }

  /**
   * Test connection to AI service
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await this.client.get('/api/tags');
      logger.info('AI service connection test successful');
      return response.status === 200;
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
      const prompt = this._buildDemandForecastPrompt(historicalData, startDate, endDate);
      
      const response = await this.client.post('/api/generate', {
        model: this.model,
        prompt: prompt,
        stream: false,
        format: 'json'
      });

      const aiResponse = response.data.response;
      const forecast = this._parseDemandForecastResponse(aiResponse);
      
      logger.info('Demand forecast generated successfully', {
        restaurantId,
        forecastPeriods: forecast.periods?.length || 0
      });

      return {
        type: 'demand_forecast',
        confidence: forecast.confidence || 0.75,
        data: forecast,
        metadata: {
          model: this.model,
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
      const prompt = this._buildMenuOptimizationPrompt(menuItems, orderHistory);
      
      const response = await this.client.post('/api/generate', {
        model: this.model,
        prompt: prompt,
        stream: false,
        format: 'json'
      });

      const aiResponse = response.data.response;
      const optimization = this._parseMenuOptimizationResponse(aiResponse);
      
      logger.info('Menu optimization generated successfully', {
        restaurantId,
        recommendationCount: optimization.recommendations?.length || 0
      });

      return {
        type: 'menu_optimization',
        confidence: optimization.confidence || 0.8,
        data: optimization,
        metadata: {
          model: this.model,
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
   * Build prompt for demand forecasting
   * @private
   */
  _buildDemandForecastPrompt(historicalData, startDate, endDate) {
    const dataStr = JSON.stringify(historicalData, null, 2);
    
    return `You are a restaurant demand forecasting expert. Analyze the following historical order data and provide a forecast for the period from ${startDate.toISOString()} to ${endDate.toISOString()}.

Historical Data:
${dataStr}

Please provide a JSON response with the following structure:
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
  }

  /**
   * Build prompt for menu optimization
   * @private
   */
  _buildMenuOptimizationPrompt(menuItems, orderHistory) {
    const menuStr = JSON.stringify(menuItems, null, 2);
    const orderStr = JSON.stringify(orderHistory.slice(0, 100), null, 2); // Limit to avoid token limits
    
    return `You are a restaurant menu optimization expert. Analyze the following menu items and order history to provide optimization recommendations.

Menu Items:
${menuStr}

Recent Order History (sample):
${orderStr}

Please provide a JSON response with the following structure:
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
  }

  /**
   * Parse demand forecast response from AI
   * @private
   */
  _parseDemandForecastResponse(response) {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(response);
      
      // Validate required fields
      if (!parsed.periods || !Array.isArray(parsed.periods)) {
        throw new Error('Invalid forecast format: missing periods array');
      }
      
      return parsed;
    } catch (parseError) {
      logger.warn('Failed to parse AI response as JSON, using fallback', {
        error: parseError.message
      });
      
      // Fallback: create a basic forecast structure
      return {
        confidence: 0.7,
        periods: [],
        insights: ['Forecast could not be generated due to parsing error'],
        recommendations: ['Please try again with different parameters']
      };
    }
  }

  /**
   * Parse menu optimization response from AI
   * @private
   */
  _parseMenuOptimizationResponse(response) {
    try {
      const parsed = JSON.parse(response);
      
      // Validate required fields
      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('Invalid optimization format: missing recommendations array');
      }
      
      return parsed;
    } catch (parseError) {
      logger.warn('Failed to parse AI response as JSON, using fallback', {
        error: parseError.message
      });
      
      return {
        confidence: 0.7,
        recommendations: [],
        insights: ['Menu optimization could not be generated due to parsing error'],
        performance_metrics: {
          best_performers: [],
          underperformers: [],
          profit_leaders: []
        }
      };
    }
  }
}

// Export singleton instance
module.exports = new AIService();
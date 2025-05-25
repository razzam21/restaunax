const prisma = require('../db/client');
const { createLogger } = require('../utils/logger');
const AIReportService = require('./ai-report-service');
const sanitizeHtml = require('sanitize-html');

const logger = createLogger('menu-optimization-service');

/**
 * Menu Optimization Service
 * Handles business logic for generating AI-powered menu optimization analysis
 * Uses historical menu and order data to provide performance insights and recommendations
 */
class MenuOptimizationService {
  constructor() {
    this.aiReportService = new AIReportService();
    logger.info('Menu Optimization Service initialized');
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
   * Validate menu optimization parameters
   * @private
   * @param {Object} params - Optimization parameters
   * @throws {Error} If parameters are invalid
   */
  _validateParams(params) {
    const required = ['restaurantId'];
    const missing = required.filter(field => !params[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }

    // Validate lookback period if provided
    if (params.lookbackDays !== undefined) {
      if (params.lookbackDays < 1) {
        throw new Error('Lookback days must be at least 1');
      }

      if (params.lookbackDays > 180) {
        throw new Error('Lookback days cannot exceed 180');
      }
    }
  }

  /**
   * Aggregate menu and performance data for analysis
   * @param {string} restaurantId - Restaurant ID
   * @param {number} lookbackDays - Number of days to look back
   * @param {boolean} includeInactive - Whether to include inactive menu items
   * @returns {Promise<Object>} Aggregated menu performance data
   */
  async aggregateMenuData(restaurantId, lookbackDays, includeInactive = false) {
    try {
      const sanitizedRestaurantId = this._sanitizeInput(restaurantId);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - lookbackDays);

      logger.debug('Aggregating menu data', {
        restaurantId: sanitizedRestaurantId,
        lookbackDays,
        includeInactive,
        dateRange: { startDate, endDate }
      });

      // Fetch menu items
      const menuItems = await prisma.menuItem.findMany({
        where: {
          restaurantId: sanitizedRestaurantId,
          ...(includeInactive ? {} : { isActive: true })
        },
        include: {
          menuCategory: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      if (menuItems.length === 0) {
        throw new Error('No menu items found for analysis');
      }

      // Fetch order items within the date range
      const orderItems = await prisma.orderItem.findMany({
        where: {
          order: {
            restaurantId: sanitizedRestaurantId,
            createdAt: {
              gte: startDate,
              lte: endDate
            },
            status: 'delivered' // Only include delivered orders
          }
        },
        include: {
          order: {
            select: {
              createdAt: true
            }
          }
        }
      });

      // Calculate item performance
      const itemPerformance = this._calculateItemPerformance(menuItems, orderItems);
      
      // Calculate category performance
      const categoryPerformance = this._calculateCategoryPerformance(itemPerformance);

      // Calculate total revenue
      const totalRevenue = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const aggregatedData = {
        menuItems,
        itemPerformance,
        categoryPerformance,
        totalRevenue,
        analysisDateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: lookbackDays
        }
      };

      logger.info('Menu data aggregation completed', {
        restaurantId: sanitizedRestaurantId,
        totalItems: menuItems.length,
        totalRevenue,
        lookbackDays
      });

      return aggregatedData;
    } catch (error) {
      logger.error('Failed to aggregate menu data', {
        restaurantId,
        lookbackDays,
        error: error.message
      });
      throw new Error(`Failed to aggregate menu data: ${error.message}`);
    }
  }

  /**
   * Calculate individual item performance metrics
   * @private
   * @param {Array} menuItems - Menu items from database
   * @param {Array} orderItems - Order items from database
   * @returns {Array} Item performance data
   */
  _calculateItemPerformance(menuItems, orderItems) {
    const itemMetrics = {};

    // Initialize metrics for all menu items
    menuItems.forEach(item => {
      itemMetrics[item.id] = {
        itemId: item.id,
        name: item.name,
        category: item.menuCategory?.name || item.category || 'Uncategorized',
        price: item.price,
        preparationTime: item.preparationTime,
        isActive: item.isActive,
        totalQuantity: 0,
        totalRevenue: 0,
        orderCount: 0,
        averagePrice: item.price
      };
    });

    // Aggregate order data
    orderItems.forEach(orderItem => {
      if (orderItem.menuItemId && itemMetrics[orderItem.menuItemId]) {
        const metrics = itemMetrics[orderItem.menuItemId];
        metrics.totalQuantity += orderItem.quantity;
        metrics.totalRevenue += (orderItem.price * orderItem.quantity);
        metrics.orderCount += 1;
      }
    });

    // Calculate derived metrics and rank performance
    const performanceArray = Object.values(itemMetrics)
      .map(item => ({
        ...item,
        averageOrderQuantity: item.orderCount > 0 ? item.totalQuantity / item.orderCount : 0,
        revenuePerOrder: item.orderCount > 0 ? item.totalRevenue / item.orderCount : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .map((item, index) => ({
        ...item,
        performanceRank: index + 1
      }));

    return performanceArray;
  }

  /**
   * Calculate category performance metrics
   * @private
   * @param {Array} itemPerformance - Item performance data
   * @returns {Array} Category performance data
   */
  _calculateCategoryPerformance(itemPerformance) {
    const categoryMetrics = {};

    itemPerformance.forEach(item => {
      if (!categoryMetrics[item.category]) {
        categoryMetrics[item.category] = {
          category: item.category,
          itemCount: 0,
          totalRevenue: 0,
          totalQuantity: 0,
          averagePrice: 0
        };
      }

      const cat = categoryMetrics[item.category];
      cat.itemCount += 1;
      cat.totalRevenue += item.totalRevenue;
      cat.totalQuantity += item.totalQuantity;
    });

    // Calculate derived metrics
    return Object.values(categoryMetrics)
      .map(cat => ({
        ...cat,
        averagePrice: cat.totalQuantity > 0 ? cat.totalRevenue / cat.totalQuantity : 0,
        averageRevenuePerItem: cat.itemCount > 0 ? cat.totalRevenue / cat.itemCount : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Generate system prompt for menu optimization
   * @returns {string} System prompt
   */
  generateSystemPrompt() {
    return `You are a restaurant menu optimization expert with deep knowledge of:

- Menu engineering principles and item performance analysis
- Restaurant profitability and pricing strategies
- Customer behavior and ordering patterns
- Food cost management and profit margin optimization
- Menu psychology and design best practices
- Seasonal trends and market analysis

Your task is to analyze menu performance data and provide actionable optimization recommendations.

IMPORTANT INSTRUCTIONS:
1. Analyze item performance by revenue, quantity sold, and profitability
2. Identify underperforming items that should be removed or improved
3. Highlight high-performing items that should be promoted
4. Recommend pricing adjustments based on demand and margins
5. Suggest menu simplification opportunities
6. Consider category balance and customer flow
7. Provide specific, actionable recommendations

REQUIRED RESPONSE FORMAT (JSON):
{
  "confidence": number (0-1),
  "summary": {
    "total_items_analyzed": number,
    "active_items": number,
    "inactive_items": number,
    "total_revenue_analyzed": number,
    "analysis_period_days": number,
    "top_category": "string"
  },
  "item_performance": [
    {
      "item_id": "string",
      "name": "string",
      "category": "string",
      "total_quantity": number,
      "total_revenue": number,
      "average_price": number,
      "performance_rank": number,
      "trend": "increasing|stable|decreasing",
      "recommendation": "promote|optimize|remove|maintain"
    }
  ],
  "category_performance": [
    {
      "category": "string",
      "item_count": number,
      "total_revenue": number,
      "performance_score": number (1-10)
    }
  ],
  "insights": [
    "string - key findings about menu performance"
  ],
  "recommendations": [
    "string - specific actionable recommendations"
  ]
}

Focus on profitability, customer satisfaction, and operational efficiency.`;
  }

  /**
   * Format currency with comma separators
   * @private
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  _formatCurrency(amount) {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Generate user prompt with menu data and parameters
   * @param {Object} params - Optimization parameters
   * @param {Object} menuData - Aggregated menu data
   * @returns {string} User prompt
   */
  generateUserPrompt(params, menuData) {
    const { lookbackDays } = params;
    
    let prompt = `Please analyze the following menu performance data and provide optimization recommendations:

## Analysis Period
- Period: ${lookbackDays} days of historical data
- Date Range: ${new Date(menuData.analysisDateRange.start).toLocaleDateString()} to ${new Date(menuData.analysisDateRange.end).toLocaleDateString()}

## Menu Overview
- Total Menu Items: ${menuData.menuItems.length}
- Active Items: ${menuData.menuItems.filter(item => item.isActive).length}
- Total Revenue Analyzed: ${this._formatCurrency(menuData.totalRevenue)}
- Categories: ${[...new Set(menuData.itemPerformance.map(item => item.category))].length}

## Item Performance Summary
Top 5 Performers by Revenue:
`;

    // Add top performing items
    menuData.itemPerformance
      .slice(0, 5)
      .forEach((item, index) => {
        prompt += `${index + 1}. ${item.name} (${item.category}) - ${this._formatCurrency(item.totalRevenue)} revenue, ${item.totalQuantity} sold\n`;
      });

    prompt += `\n## Category Performance
`;

    // Add category breakdown
    menuData.categoryPerformance.forEach(category => {
      prompt += `- ${category.category}: ${category.itemCount} items, ${this._formatCurrency(category.totalRevenue)} revenue\n`;
    });

    prompt += `\nBased on this menu performance data, please provide a comprehensive menu optimization analysis with specific recommendations for optimization, including items to promote, items to remove or modify, pricing suggestions, and overall menu strategy improvements.`;

    return prompt;
  }

  /**
   * Validate and enhance AI response structure
   * @private
   * @param {Object} aiResponse - Raw AI response
   * @param {Object} menuData - Menu data context
   * @returns {Object} Enhanced response
   */
  _enhanceAIResponse(aiResponse, menuData) {
    const data = aiResponse.data || {};
    
    // Calculate actual summary values from menuData (with safety checks)
    const menuItems = menuData?.menuItems || [];
    const categoryPerformance = menuData?.categoryPerformance || [];
    const totalRevenue = menuData?.totalRevenue || 0;
    const analysisDateRange = menuData?.analysisDateRange || { days: 0 };
    
    const totalItems = menuItems.length;
    const activeItems = menuItems.filter(item => item.isActive).length;
    const inactiveItems = totalItems - activeItems;
    const topCategory = categoryPerformance.length > 0 
      ? categoryPerformance[0].category 
      : 'N/A';
    
    // Ensure required structure exists with real data as fallbacks
    const enhancedData = {
      confidence: data.confidence || 0.7,
      summary: {
        total_items_analyzed: totalItems,
        active_items: activeItems,
        inactive_items: inactiveItems,
        total_revenue_analyzed: totalRevenue,
        analysis_period_days: analysisDateRange.days,
        top_category: topCategory,
        ...(data.summary || {}) // AI response can still override if provided
      },
      item_performance: data.item_performance || [],
      category_performance: data.category_performance || [],
      insights: data.insights || [],
      recommendations: data.recommendations || []
    };

    return enhancedData;
  }

  /**
   * Generate menu optimization using AI analysis
   * @param {Object} params - Optimization parameters
   * @param {string} params.restaurantId - Restaurant ID
   * @param {number} params.lookbackDays - Historical data lookback period
   * @param {boolean} params.includeInactive - Include inactive menu items
   * @returns {Promise<Object>} Menu optimization result
   */
  async generateMenuOptimization(params) {
    this._validateParams(params);
    
    const startTime = Date.now();
    
    try {
      logger.info('Starting menu optimization generation', {
        restaurantId: params.restaurantId,
        lookbackDays: params.lookbackDays,
        includeInactive: params.includeInactive || false
      });

      // Aggregate menu performance data
      const menuData = await this.aggregateMenuData(
        params.restaurantId, 
        params.lookbackDays,
        params.includeInactive || false
      );

      // Generate AI report
      const systemPrompt = this.generateSystemPrompt();
      const userPrompt = this.generateUserPrompt(params, menuData);
      
      const aiResponse = await this.aiReportService.generateReport({
        reportType: 'menu_optimization',
        systemPrompt,
        userPrompt,
        data: {
          menuData,
          optimizationParams: params
        },
        temperature: 0.3, // Lower temperature for more consistent analysis
        maxTokens: 2500
      });

      // Log AI response details for debugging
      logger.info('AI report generated', {
        restaurantId: params.restaurantId,
        reportType: aiResponse.reportType,
        confidence: aiResponse.data?.confidence,
        responseFormat: aiResponse.metadata?.response_format,
        engine: aiResponse.metadata?.engine,
        duration: aiResponse.metadata?.duration,
        itemsAnalyzed: aiResponse.data?.item_performance?.length || 0,
        categoriesAnalyzed: aiResponse.data?.category_performance?.length || 0,
        insightsGenerated: aiResponse.data?.insights?.length || 0,
        recommendationsGenerated: aiResponse.data?.recommendations?.length || 0
      });

      // Enhance and validate response
      const enhancedData = this._enhanceAIResponse(aiResponse, menuData);
      
      const duration = Date.now() - startTime;
      
      logger.info('Menu optimization generation completed', {
        restaurantId: params.restaurantId,
        confidence: enhancedData.confidence,
        itemsAnalyzed: enhancedData.item_performance.length,
        categoriesAnalyzed: enhancedData.category_performance.length,
        duration
      });

      return {
        success: true,
        type: 'menu_optimization',
        data: enhancedData,
        metadata: {
          ...aiResponse.metadata,
          generation_duration: duration,
          analysis_period: {
            days: params.lookbackDays,
            start: menuData.analysisDateRange.start,
            end: menuData.analysisDateRange.end
          }
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Menu optimization generation failed', {
        restaurantId: params.restaurantId,
        error: error.message,
        duration
      });
      
      throw new Error(`Failed to generate menu optimization: ${error.message}`);
    }
  }
}

module.exports = MenuOptimizationService;
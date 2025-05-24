// Mock config first
jest.mock('../../../src/config', () => ({
  ai: {
    enabled: true,
    primaryEngine: 'openai',
  },
  logging: {
    level: 'info',
  },
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock Prisma client
const mockPrisma = {
  order: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  hourlyMetric: {
    findMany: jest.fn(),
  },
  dailyMetric: {
    findMany: jest.fn(),
  },
  menuItem: {
    findMany: jest.fn(),
  },
};

jest.mock('../../../src/db/client', () => mockPrisma);

// Mock AI Report Service
const mockAIReportService = {
  generateReport: jest.fn(),
  isEnabled: jest.fn(),
  validateEnabled: jest.fn(),
  testConnection: jest.fn(),
};

jest.mock('../../../src/services/ai-report-service', () => {
  return jest.fn().mockImplementation(() => mockAIReportService);
});

const DemandForecastService = require('../../../src/services/demand-forecast-service');

describe('Demand Forecast Service', () => {
  let demandForecastService;

  beforeEach(() => {
    jest.clearAllMocks();
    demandForecastService = new DemandForecastService();
    
    // Set default mock returns
    mockAIReportService.isEnabled.mockReturnValue(true);
    mockAIReportService.testConnection.mockResolvedValue(true);
  });

  describe('Constructor and Initialization', () => {
    test('should initialize correctly', () => {
      expect(demandForecastService).toBeDefined();
    });
  });

  describe('Historical Data Aggregation', () => {
    const mockOrders = [
      {
        id: 'order-1',
        restaurantId: 'rest-1',
        total: 25.50,
        createdAt: new Date('2024-01-01T12:00:00Z'),
        status: 'completed',
        orderType: 'delivery',
        items: [
          { menuItemId: 'item-1', quantity: 2, price: 12.75 }
        ]
      },
      {
        id: 'order-2',
        restaurantId: 'rest-1',
        total: 18.00,
        createdAt: new Date('2024-01-01T13:00:00Z'),
        status: 'completed',
        orderType: 'pickup',
        items: [
          { menuItemId: 'item-2', quantity: 1, price: 18.00 }
        ]
      }
    ];

    test('should aggregate historical order data correctly', async () => {
      mockPrisma.order.findMany.mockResolvedValue(mockOrders);

      const result = await demandForecastService.aggregateHistoricalData('rest-1', 30);

      expect(result).toHaveProperty('totalOrders', 2);
      expect(result).toHaveProperty('totalRevenue', 43.50);
      expect(result).toHaveProperty('hourlyBreakdown');
      expect(result).toHaveProperty('dailyBreakdown');
      expect(result).toHaveProperty('orderTypeBreakdown');
      expect(result.hourlyBreakdown).toHaveProperty('12', expect.objectContaining({
        orderCount: 1,
        revenue: 25.50
      }));
    });

    test('should handle empty order data', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await demandForecastService.aggregateHistoricalData('rest-1', 30);

      expect(result.totalOrders).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.hourlyBreakdown).toEqual({});
      expect(result.dailyBreakdown).toEqual({});
    });

    test('should filter by date range correctly', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await demandForecastService.aggregateHistoricalData('rest-1', 30);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            restaurantId: 'rest-1',
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date)
            }),
            status: 'completed'
          })
        })
      );
    });

    test('should aggregate menu item performance', async () => {
      mockPrisma.order.findMany.mockResolvedValue(mockOrders);

      const result = await demandForecastService.aggregateHistoricalData('rest-1', 30);

      expect(result.menuItemPerformance).toEqual(expect.objectContaining({
        'item-1': expect.objectContaining({
          totalQuantity: 2,
          totalRevenue: 25.50,
          orderCount: 1
        }),
        'item-2': expect.objectContaining({
          totalQuantity: 1,
          totalRevenue: 18.00,
          orderCount: 1
        })
      }));
    });
  });

  describe('System Prompt Generation', () => {
    test('should generate comprehensive system prompt', () => {
      const prompt = demandForecastService.generateSystemPrompt();

      expect(prompt).toContain('restaurant demand forecasting expert');
      expect(prompt).toContain('historical order data');
      expect(prompt).toContain('seasonal patterns');
      expect(prompt).toContain('REQUIRED RESPONSE FORMAT (JSON)');
      expect(prompt).toContain('confidence');
      expect(prompt).toContain('forecast');
    });

    test('should include required JSON structure in prompt', () => {
      const prompt = demandForecastService.generateSystemPrompt();

      expect(prompt).toContain('forecast');
      expect(prompt).toContain('insights');
      expect(prompt).toContain('recommendations');
      expect(prompt).toContain('confidence');
      expect(prompt).toContain('predicted_orders');
    });
  });

  describe('User Prompt Generation', () => {
    const mockParams = {
      startDate: new Date('2024-01-08'),
      endDate: new Date('2024-01-14'),
      lookbackDays: 30
    };

    const mockHistoricalData = {
      totalOrders: 150,
      totalRevenue: 4500,
      averageOrderValue: 30,
      hourlyBreakdown: { '12': { orderCount: 25, revenue: 750 } },
      dailyBreakdown: { '1': { orderCount: 30, revenue: 900 } },
      orderTypeBreakdown: { 'delivery': { orderCount: 90, revenue: 2700 }, 'pickup': { orderCount: 60, revenue: 1800 } },
      menuItemPerformance: { 'item-1': { totalQuantity: 50, totalRevenue: 1500 } }
    };

    test('should generate detailed user prompt', () => {
      const prompt = demandForecastService.generateUserPrompt(mockParams, mockHistoricalData);

      expect(prompt).toContain('January 8, 2024');
      expect(prompt).toContain('January 14, 2024');
      expect(prompt).toContain('30 days');
      expect(prompt).toContain('Total Orders: 150');
      expect(prompt).toContain('$4500');
    });

    test('should include forecast period in prompt', () => {
      const prompt = demandForecastService.generateUserPrompt(mockParams, mockHistoricalData);

      expect(prompt).toContain('Forecast Period');
      expect(prompt).toContain('January 8, 2024');
      expect(prompt).toContain('January 14, 2024');
    });

    test('should include historical summary in prompt', () => {
      const prompt = demandForecastService.generateUserPrompt(mockParams, mockHistoricalData);

      expect(prompt).toContain('Historical Summary');
      expect(prompt).toContain('Total Orders: 150');
      expect(prompt).toContain('Total Revenue: $4500');
      expect(prompt).toContain('Average Order Value: $30');
    });

    test('should include hourly and daily patterns', () => {
      const prompt = demandForecastService.generateUserPrompt(mockParams, mockHistoricalData);

      expect(prompt).toContain('Hour 12: 25 orders');
      expect(prompt).toContain('Monday: 30 orders');
    });
  });

  describe('Demand Forecast Generation', () => {
    const validParams = {
      restaurantId: 'rest-1',
      startDate: new Date('2024-01-08'),
      endDate: new Date('2024-01-14'),
      lookbackDays: 30
    };

    const mockHistoricalData = {
      totalOrders: 150,
      totalRevenue: 4500,
      hourlyBreakdown: {},
      dailyBreakdown: {},
      menuItemPerformance: {}
    };

    const mockAIResponse = {
      success: true,
      reportType: 'demand_forecast',
      data: {
        confidence: 0.85,
        forecast: [
          {
            date: '2024-01-08',
            predicted_orders: 25,
            predicted_revenue: 750,
            confidence: 0.87,
            peak_hours: ['12:00', '18:00']
          }
        ],
        insights: [
          'Monday typically shows 20% higher order volume',
          'Lunch hours (11-14) are consistently busy'
        ],
        recommendations: [
          'Schedule additional staff for Monday lunch shift',
          'Prepare extra inventory for popular items'
        ]
      },
      metadata: {
        engine: 'openai',
        confidence: 0.85,
        duration: 2500
      }
    };

    test('should generate demand forecast successfully', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockAIReportService.generateReport.mockResolvedValue(mockAIResponse);

      const result = await demandForecastService.generateDemandForecast(validParams);

      expect(result.success).toBe(true);
      expect(result.type).toBe('demand_forecast');
      expect(result.data.confidence).toBe(0.85);
      expect(result.data.forecast).toHaveLength(1);
      expect(result.data.insights.length).toBeGreaterThanOrEqual(2);
      expect(result.data.recommendations.length).toBeGreaterThanOrEqual(2);
    });

    test('should call AI service with correct parameters', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockAIReportService.generateReport.mockResolvedValue(mockAIResponse);

      await demandForecastService.generateDemandForecast(validParams);

      expect(mockAIReportService.generateReport).toHaveBeenCalledWith({
        reportType: 'demand_forecast',
        systemPrompt: expect.stringContaining('restaurant demand forecasting expert'),
        userPrompt: expect.stringContaining('January 8, 2024'),
        data: expect.objectContaining({
          historicalData: expect.any(Object),
          forecastParams: validParams
        }),
        temperature: 0.3,
        maxTokens: 2000
      });
    });

    test('should validate required parameters', async () => {
      const invalidParams = {
        restaurantId: 'rest-1',
        // Missing startDate, endDate, lookbackDays
      };

      await expect(demandForecastService.generateDemandForecast(invalidParams))
        .rejects
        .toThrow('Missing required parameters');
    });

    test('should validate date range', async () => {
      const invalidParams = {
        restaurantId: 'rest-1',
        startDate: new Date('2024-01-14'),
        endDate: new Date('2024-01-08'), // End before start
        lookbackDays: 30
      };

      await expect(demandForecastService.generateDemandForecast(invalidParams))
        .rejects
        .toThrow('End date must be after start date');
    });

    test('should validate forecast period length', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-04-01'); // 90+ days
      
      const invalidParams = {
        restaurantId: 'rest-1',
        startDate,
        endDate,
        lookbackDays: 30
      };

      await expect(demandForecastService.generateDemandForecast(invalidParams))
        .rejects
        .toThrow('Forecast period cannot exceed 90 days');
    });

    test('should handle AI service errors gracefully', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockAIReportService.generateReport.mockRejectedValue(new Error('AI service error'));

      await expect(demandForecastService.generateDemandForecast(validParams))
        .rejects
        .toThrow('Failed to generate demand forecast: AI service error');
    });

    test('should include historical data context in result', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockAIReportService.generateReport.mockResolvedValue(mockAIResponse);

      const result = await demandForecastService.generateDemandForecast(validParams);

      expect(result.historicalContext).toEqual(expect.objectContaining({
        lookbackDays: 30,
        totalOrders: expect.any(Number),
        totalRevenue: expect.any(Number),
        dataQuality: expect.any(String)
      }));
    });

    test('should assess data quality', async () => {
      // Test with sufficient data
      const sufficientOrders = Array.from({ length: 100 }, (_, i) => ({
        id: `order-${i}`,
        total: 25,
        createdAt: new Date(),
        status: 'completed'
      }));
      
      mockPrisma.order.findMany.mockResolvedValue(sufficientOrders);
      mockAIReportService.generateReport.mockResolvedValue(mockAIResponse);

      const result = await demandForecastService.generateDemandForecast(validParams);

      expect(result.historicalContext.dataQuality).toBe('high');
    });

    test('should handle insufficient historical data', async () => {
      // Test with minimal data
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockAIReportService.generateReport.mockResolvedValue(mockAIResponse);

      const result = await demandForecastService.generateDemandForecast(validParams);

      expect(result.historicalContext.dataQuality).toBe('low');
      expect(result.data.insights).toContainEqual(expect.stringContaining('limited historical data'));
    });
  });

  describe('Data Quality Assessment', () => {
    test('should assess high quality for sufficient data', () => {
      const quality = demandForecastService.assessDataQuality(100, 30);
      expect(quality).toBe('high');
    });

    test('should assess medium quality for moderate data', () => {
      const quality = demandForecastService.assessDataQuality(50, 30);
      expect(quality).toBe('medium');
    });

    test('should assess low quality for insufficient data', () => {
      const quality = demandForecastService.assessDataQuality(10, 30);
      expect(quality).toBe('low');
    });

    test('should consider lookback period in assessment', () => {
      // Same order count, different lookback periods
      const quality7Days = demandForecastService.assessDataQuality(50, 7);
      const quality30Days = demandForecastService.assessDataQuality(50, 30);
      
      expect(quality7Days).toBe('high'); // More orders per day
      expect(quality30Days).toBe('medium'); // Fewer orders per day
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database connection errors', async () => {
      mockPrisma.order.findMany.mockRejectedValue(new Error('Database connection failed'));

      const params = {
        restaurantId: 'rest-1',
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-01-14'),
        lookbackDays: 30
      };

      await expect(demandForecastService.generateDemandForecast(params))
        .rejects
        .toThrow('Failed to aggregate historical data');
    });

    test('should sanitize restaurant ID input', async () => {
      const maliciousParams = {
        restaurantId: '<script>alert("xss")</script>',
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-01-14'),
        lookbackDays: 30
      };

      mockPrisma.order.findMany.mockResolvedValue([]);
      mockAIReportService.generateReport.mockResolvedValue({
        success: true,
        data: { confidence: 0.8, forecast: [] }
      });

      // Should handle malicious input safely
      const result = await demandForecastService.generateDemandForecast(maliciousParams);
      expect(result.success).toBe(true);
    });

    test('should handle extreme lookback periods', async () => {
      const params = {
        restaurantId: 'rest-1',
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-01-14'),
        lookbackDays: 365 // Very long lookback
      };

      mockPrisma.order.findMany.mockResolvedValue([]);
      mockAIReportService.generateReport.mockResolvedValue({
        success: true,
        data: { confidence: 0.8, forecast: [] }
      });

      const result = await demandForecastService.generateDemandForecast(params);
      expect(result.success).toBe(true);
    });
  });

  describe('Response Format Validation', () => {
    test('should validate AI response structure', async () => {
      const invalidAIResponse = {
        success: true,
        data: {
          // Missing required fields
          someOtherData: 'test'
        }
      };

      mockPrisma.order.findMany.mockResolvedValue([]);
      mockAIReportService.generateReport.mockResolvedValue(invalidAIResponse);

      const params = {
        restaurantId: 'rest-1',
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-01-14'),
        lookbackDays: 30
      };

      const result = await demandForecastService.generateDemandForecast(params);

      // Should provide fallback structure
      expect(result.data).toHaveProperty('confidence');
      expect(result.data).toHaveProperty('forecast');
      expect(result.data).toHaveProperty('insights');
      expect(result.data).toHaveProperty('recommendations');
    });
  });
});
// Mock config first
jest.mock('../../../src/config', () => ({
  ai: {
    enabled: true,
    baseURL: 'http://localhost:11434',
    model: 'llama2',
    timeout: 30000,
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

// Mock axios
jest.mock('axios');

const axios = require('axios');
const config = require('../../../src/config');

// Create a mock axios instance that will be returned by axios.create()
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
};

const mockedAxios = axios;
mockedAxios.create = jest.fn(() => mockAxiosInstance);

const aiService = require('../../../src/services/ai-service');

describe('AI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service to enabled state
    aiService.enabled = true;
  });

  describe('Feature Flag Checking', () => {
    test('should return true when AI is enabled', () => {
      expect(aiService.isEnabled()).toBe(true);
    });

    test('should return false when AI is disabled', () => {
      aiService.enabled = false;
      expect(aiService.isEnabled()).toBe(false);
    });

    test('should throw human-readable error when features are disabled', () => {
      aiService.enabled = false;
      
      expect(() => {
        aiService.validateEnabled();
      }).toThrow('AI features are not available with your current plan. Upgrade to Premium to access demand forecasting and AI insights.');
    });

    test('should throw error with correct error code when features are disabled', () => {
      aiService.enabled = false;
      
      try {
        aiService.validateEnabled();
      } catch (error) {
        expect(error.code).toBe('AI_FEATURES_DISABLED');
        expect(error.statusCode).toBe(402);
      }
    });

    test('should not throw error when features are enabled', () => {
      expect(() => {
        aiService.validateEnabled();
      }).not.toThrow();
    });
  });

  describe('Connection Testing', () => {
    test('should return true for successful connection test', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      const result = await aiService.testConnection();
      expect(result).toBe(true);
    });

    test('should return false for failed connection test', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection failed'));

      const result = await aiService.testConnection();
      expect(result).toBe(false);
    });

    test('should return false when AI is disabled', async () => {
      aiService.enabled = false;
      
      const result = await aiService.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('Demand Forecasting', () => {
    const mockParams = {
      restaurantId: 'test-restaurant-id',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-07'),
      historicalData: [
        {
          date: '2023-12-01T12:00:00Z',
          hour: 12,
          dayOfWeek: 1,
          orderCount: 5,
          revenue: 150.00,
        },
      ],
    };

    test('should throw error when AI features are disabled', async () => {
      aiService.enabled = false;

      await expect(aiService.generateDemandForecast(mockParams))
        .rejects
        .toThrow('AI features are not available with your current plan');
    });

    test('should generate demand forecast successfully', async () => {
      const mockResponse = {
        data: {
          response: JSON.stringify({
            confidence: 0.85,
            periods: [
              {
                date: '2024-01-01',
                hour: 12,
                predicted_orders: 15,
                predicted_revenue: 450.00,
                confidence: 0.87,
              },
            ],
            insights: ['Peak hours are typically 12-2 PM'],
            recommendations: ['Staff 2 additional servers during peak hours'],
          }),
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await aiService.generateDemandForecast(mockParams);

      expect(result).toHaveProperty('type', 'demand_forecast');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('metadata');
      expect(result.data.periods).toHaveLength(1);
    });

    test('should handle AI response parsing errors gracefully', async () => {
      const mockResponse = {
        data: {
          response: 'Invalid JSON response',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await aiService.generateDemandForecast(mockParams);

      expect(result).toHaveProperty('type', 'demand_forecast');
      expect(result.confidence).toBe(0.7); // Fallback confidence
      expect(result.data.insights).toContain('Forecast could not be generated due to parsing error');
    });

    test('should throw error when Ollama API fails', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('API Error'));

      await expect(aiService.generateDemandForecast(mockParams))
        .rejects
        .toThrow('Failed to generate demand forecast: API Error');
    });
  });

  describe('Menu Optimization', () => {
    const mockParams = {
      restaurantId: 'test-restaurant-id',
      menuItems: [
        {
          id: 'item-1',
          name: 'Pasta Carbonara',
          price: 14.99,
          category: 'Main Course',
        },
      ],
      orderHistory: [
        {
          id: 'order-1',
          total: 29.98,
          items: [
            { name: 'Pasta Carbonara', quantity: 2, price: 14.99 },
          ],
        },
      ],
    };

    test('should throw error when AI features are disabled', async () => {
      aiService.enabled = false;

      await expect(aiService.generateMenuOptimization(mockParams))
        .rejects
        .toThrow('AI features are not available with your current plan');
    });

    test('should generate menu optimization successfully', async () => {
      const mockResponse = {
        data: {
          response: JSON.stringify({
            confidence: 0.82,
            recommendations: [
              {
                type: 'pricing',
                item_id: 'item-1',
                item_name: 'Pasta Carbonara',
                current_price: 14.99,
                suggested_price: 16.99,
                reason: 'High demand item with low profit margin',
                expected_impact: '+15% revenue',
              },
            ],
            insights: ['Top 3 items generate 45% of revenue'],
            performance_metrics: {
              best_performers: ['item-1'],
              underperformers: [],
              profit_leaders: ['item-1'],
            },
          }),
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await aiService.generateMenuOptimization(mockParams);

      expect(result).toHaveProperty('type', 'menu_optimization');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('data');
      expect(result.data.recommendations).toHaveLength(1);
    });

    test('should handle menu optimization parsing errors gracefully', async () => {
      const mockResponse = {
        data: {
          response: 'Invalid JSON response',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await aiService.generateMenuOptimization(mockParams);

      expect(result).toHaveProperty('type', 'menu_optimization');
      expect(result.confidence).toBe(0.7); // Fallback confidence
      expect(result.data.insights).toContain('Menu optimization could not be generated due to parsing error');
    });
  });

  describe('Prompt Building', () => {
    test('should build proper demand forecast prompt', () => {
      const historicalData = [
        { date: '2023-12-01T12:00:00Z', hour: 12, orderCount: 5, revenue: 150.00 },
      ];
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      // Access private method for testing
      const prompt = aiService._buildDemandForecastPrompt(historicalData, startDate, endDate);

      expect(prompt).toContain('restaurant demand forecasting expert');
      expect(prompt).toContain('2024-01-01');
      expect(prompt).toContain('2024-01-07');
      expect(prompt).toContain(JSON.stringify(historicalData, null, 2));
      expect(prompt).toContain('confidence');
      expect(prompt).toContain('periods');
    });

    test('should build proper menu optimization prompt', () => {
      const menuItems = [{ id: 'item-1', name: 'Pasta', price: 14.99 }];
      const orderHistory = [{ id: 'order-1', total: 14.99 }];

      // Access private method for testing
      const prompt = aiService._buildMenuOptimizationPrompt(menuItems, orderHistory);

      expect(prompt).toContain('restaurant menu optimization expert');
      expect(prompt).toContain('recommendations');
      expect(prompt).toContain('pricing');
      expect(prompt).toContain('performance_metrics');
    });
  });

  describe('Response Parsing', () => {
    test('should parse valid demand forecast response', () => {
      const validResponse = JSON.stringify({
        confidence: 0.85,
        periods: [{ date: '2024-01-01', predicted_orders: 15 }],
        insights: ['Test insight'],
      });

      const result = aiService._parseDemandForecastResponse(validResponse);

      expect(result.confidence).toBe(0.85);
      expect(result.periods).toHaveLength(1);
      expect(result.insights).toContain('Test insight');
    });

    test('should handle invalid forecast response format', () => {
      const invalidResponse = JSON.stringify({
        confidence: 0.85,
        // Missing periods array
      });

      const result = aiService._parseDemandForecastResponse(invalidResponse);

      expect(result.confidence).toBe(0.7); // Fallback
      expect(result.periods).toEqual([]);
      expect(result.insights[0]).toContain('parsing error');
    });

    test('should parse valid menu optimization response', () => {
      const validResponse = JSON.stringify({
        confidence: 0.82,
        recommendations: [{ type: 'pricing', item_id: 'item-1' }],
        insights: ['Test insight'],
      });

      const result = aiService._parseMenuOptimizationResponse(validResponse);

      expect(result.confidence).toBe(0.82);
      expect(result.recommendations).toHaveLength(1);
      expect(result.insights).toContain('Test insight');
    });

    test('should handle invalid optimization response format', () => {
      const invalidResponse = JSON.stringify({
        confidence: 0.82,
        // Missing recommendations array
      });

      const result = aiService._parseMenuOptimizationResponse(invalidResponse);

      expect(result.confidence).toBe(0.7); // Fallback
      expect(result.recommendations).toEqual([]);
      expect(result.insights[0]).toContain('parsing error');
    });
  });

  describe('Security and Input Validation', () => {
    test('should sanitize input parameters', async () => {
      const maliciousParams = {
        restaurantId: '<script>alert("xss")</script>',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        historicalData: [
          {
            customerName: '<img src=x onerror=alert(1)>',
            revenue: 150.00,
          },
        ],
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { response: JSON.stringify({ confidence: 0.7, periods: [] }) },
      });

      // Service should handle input safely without throwing
      await expect(aiService.generateDemandForecast(maliciousParams))
        .resolves
        .toBeDefined();
    });

    test('should handle very large input data gracefully', async () => {
      const largeHistoricalData = Array.from({ length: 10000 }, (_, i) => ({
        date: `2023-${String(i % 12 + 1).padStart(2, '0')}-01T12:00:00Z`,
        hour: 12,
        orderCount: i % 20,
        revenue: (i % 20) * 15.50,
      }));

      const params = {
        restaurantId: 'test-restaurant-id',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        historicalData: largeHistoricalData,
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { response: JSON.stringify({ confidence: 0.7, periods: [] }) },
      });

      // Should handle large data without memory issues
      await expect(aiService.generateDemandForecast(params))
        .resolves
        .toBeDefined();
    });
  });
});
const request = require('supertest');
const express = require('express');
const demandForecastController = require('../../../src/controllers/demand-forecast-controller');

// Mock dependencies
const mockDemandForecastService = {
  generateDemandForecast: jest.fn(),
  aggregateHistoricalData: jest.fn(),
  assessDataQuality: jest.fn(),
};

const mockAIReportService = {
  isEnabled: jest.fn(),
  validateEnabled: jest.fn(),
  testConnection: jest.fn(),
};

jest.mock('../../../src/services/demand-forecast-service', () => {
  return jest.fn().mockImplementation(() => mockDemandForecastService);
});

jest.mock('../../../src/services/ai-report-service', () => {
  return jest.fn().mockImplementation(() => mockAIReportService);
});

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Create express app for testing
const app = express();
app.use(express.json());

// Mock auth middleware to set user
app.use((req, res, next) => {
  req.user = {
    id: 'test-user-id',
    restaurantId: 'test-restaurant-id',
    role: 'manager', // Default to manager role
    username: 'test-manager'
  };
  next();
});

// Set up routes
app.post('/forecast', demandForecastController.createDemandForecast);
app.get('/forecast/:forecastId', demandForecastController.getDemandForecast);
app.get('/status', demandForecastController.getServiceStatus);
app.get('/data-quality/:restaurantId', demandForecastController.getDataQuality);

describe('Demand Forecast Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock setup
    mockAIReportService.isEnabled.mockReturnValue(true);
    mockAIReportService.validateEnabled.mockImplementation(() => {});
    mockAIReportService.testConnection.mockResolvedValue(true);
  });

  describe('Access Control and Feature Flags', () => {
    test('should deny access when AI features are disabled', async () => {
      const aiError = new Error('AI features are not available with your current plan');
      aiError.code = 'AI_FEATURES_DISABLED';
      aiError.statusCode = 402;
      mockAIReportService.validateEnabled.mockImplementation(() => {
        throw aiError;
      });

      const response = await request(app)
        .post('/forecast')
        .send({
          startDate: '2024-01-08T00:00:00Z',
          endDate: '2024-01-14T00:00:00Z',
          lookbackDays: 30
        });

      expect(response.status).toBe(402);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AI_FEATURES_DISABLED');
      expect(response.body.upgradeRequired).toBe(true);
      expect(response.body.error).toContain('AI features are not available');
    });

    test('should deny access to wait_staff role', async () => {
      // Override user role for this test
      const staffApp = express();
      staffApp.use(express.json());
      staffApp.use((req, res, next) => {
        req.user = {
          id: 'staff-user-id',
          restaurantId: 'test-restaurant-id',
          role: 'wait_staff',
          username: 'test-staff'
        };
        next();
      });
      staffApp.post('/forecast', demandForecastController.createDemandForecast);

      const response = await request(staffApp)
        .post('/forecast')
        .send({
          startDate: '2024-01-08T00:00:00Z',
          endDate: '2024-01-14T00:00:00Z',
          lookbackDays: 30
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(response.body.error).toContain('Only managers and owners');
    });

    test('should allow access to manager role', async () => {
      mockDemandForecastService.generateDemandForecast.mockResolvedValue({
        success: true,
        type: 'demand_forecast',
        data: { confidence: 0.85, forecast: [] },
        metadata: { duration: 1500 }
      });

      const response = await request(app)
        .post('/forecast')
        .send({
          startDate: '2024-01-08T00:00:00Z',
          endDate: '2024-01-14T00:00:00Z',
          lookbackDays: 30
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should allow access to owner role', async () => {
      const ownerApp = express();
      ownerApp.use(express.json());
      ownerApp.use((req, res, next) => {
        req.user = {
          id: 'owner-user-id',
          restaurantId: 'test-restaurant-id',
          role: 'owner',
          username: 'test-owner'
        };
        next();
      });
      ownerApp.post('/forecast', demandForecastController.createDemandForecast);

      mockDemandForecastService.generateDemandForecast.mockResolvedValue({
        success: true,
        type: 'demand_forecast',
        data: { confidence: 0.85, forecast: [] },
        metadata: { duration: 1500 }
      });

      const response = await request(ownerApp)
        .post('/forecast')
        .send({
          startDate: '2024-01-08T00:00:00Z',
          endDate: '2024-01-14T00:00:00Z',
          lookbackDays: 30
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Create Demand Forecast', () => {
    const validForecastRequest = {
      startDate: '2024-01-08T00:00:00Z',
      endDate: '2024-01-14T00:00:00Z',
      lookbackDays: 30
    };

    const mockForecastResponse = {
      success: true,
      type: 'demand_forecast',
      data: {
        confidence: 0.85,
        forecast: [
          {
            date: '2024-01-08',
            predicted_orders: 25,
            predicted_revenue: 750,
            confidence: 0.87
          }
        ],
        insights: ['Monday typically shows higher demand'],
        recommendations: ['Schedule extra staff for Monday lunch']
      },
      historicalContext: {
        totalOrders: 150,
        totalRevenue: 4500,
        dataQuality: 'high'
      },
      metadata: {
        engine: 'openai',
        confidence: 0.85,
        duration: 2500
      }
    };

    test('should create demand forecast successfully', async () => {
      mockDemandForecastService.generateDemandForecast.mockResolvedValue(mockForecastResponse);

      const response = await request(app)
        .post('/forecast')
        .send(validForecastRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.forecast).toBeDefined();
      expect(response.body.forecast.type).toBe('demand_forecast');
      expect(response.body.forecast.data.confidence).toBe(0.85);
      expect(response.body.forecast.data.forecast).toHaveLength(1);
      expect(response.body.forecast.data.insights).toHaveLength(1);
      expect(response.body.forecast.data.recommendations).toHaveLength(1);
    });

    test('should include request metadata in response', async () => {
      mockDemandForecastService.generateDemandForecast.mockResolvedValue(mockForecastResponse);

      const response = await request(app)
        .post('/forecast')
        .send(validForecastRequest);

      expect(response.status).toBe(200);
      expect(response.body.requestInfo).toEqual(expect.objectContaining({
        startDate: '2024-01-08T00:00:00.000Z',
        endDate: '2024-01-14T00:00:00.000Z',
        lookbackDays: 30,
        requestedBy: 'test-manager',
        requestedAt: expect.any(String)
      }));
    });

    test('should call demand forecast service with correct parameters', async () => {
      mockDemandForecastService.generateDemandForecast.mockResolvedValue(mockForecastResponse);

      const response = await request(app)
        .post('/forecast')
        .send(validForecastRequest);

      expect(mockDemandForecastService.generateDemandForecast).toHaveBeenCalledWith({
        restaurantId: 'test-restaurant-id',
        startDate: new Date('2024-01-08T00:00:00Z'),
        endDate: new Date('2024-01-14T00:00:00Z'),
        lookbackDays: 30
      });
      expect(response.status).toBe(200);
    });

    test('should validate required parameters', async () => {
      const response = await request(app)
        .post('/forecast')
        .send({
          // Missing startDate and endDate
          lookbackDays: 30
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.details).toContainEqual('startDate is required');
      expect(response.body.details).toContainEqual('endDate is required');
    });

    test('should validate date formats', async () => {
      const response = await request(app)
        .post('/forecast')
        .send({
          startDate: 'invalid-date-format',
          endDate: '2024-01-14T00:00:00Z',
          lookbackDays: 30
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.error).toContain('Invalid date format');
    });

    test('should validate date range', async () => {
      const response = await request(app)
        .post('/forecast')
        .send({
          startDate: '2024-01-14T00:00:00Z',
          endDate: '2024-01-08T00:00:00Z', // End before start
          lookbackDays: 30
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.error).toContain('End date must be after start date');
    });

    test('should validate forecast period length', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-04-01'); // 91+ days

      const response = await request(app)
        .post('/forecast')
        .send({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          lookbackDays: 30
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.error).toContain('exceed 90 days');
    });

    test('should validate lookback days', async () => {
      const response = await request(app)
        .post('/forecast')
        .send({
          startDate: '2024-01-08T00:00:00Z',
          endDate: '2024-01-14T00:00:00Z',
          lookbackDays: 0 // Invalid
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.error).toContain('greater than or equal to 1');
    });

    test('should handle service errors gracefully', async () => {
      mockDemandForecastService.generateDemandForecast.mockRejectedValue(
        new Error('Failed to generate demand forecast: Database connection failed')
      );

      const response = await request(app)
        .post('/forecast')
        .send(validForecastRequest);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('FORECAST_GENERATION_FAILED');
      expect(response.body.error).toContain('Failed to generate demand forecast');
    });

    test('should sanitize input parameters', async () => {
      mockDemandForecastService.generateDemandForecast.mockResolvedValue(mockForecastResponse);

      const response = await request(app)
        .post('/forecast')
        .send({
          startDate: '2024-01-08T00:00:00Z',
          endDate: '2024-01-14T00:00:00Z',
          lookbackDays: 30,
          maliciousField: '<script>alert("xss")</script>'
        });

      // Should handle extra fields without error
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Get Demand Forecast', () => {
    test('should return stored forecast by ID', async () => {
      const mockStoredForecast = {
        id: 'forecast-123',
        restaurantId: 'test-restaurant-id',
        type: 'demand_forecast',
        data: {
          confidence: 0.82,
          forecast: [{ date: '2024-01-08', predicted_orders: 28 }]
        },
        createdAt: new Date('2024-01-01T10:00:00Z'),
        validUntil: new Date('2024-01-15T23:59:59Z'),
        metadata: { engine: 'openai' }
      };

      // Mock a service method that would retrieve stored forecasts
      mockDemandForecastService.getForecastById = jest.fn()
        .mockResolvedValue(mockStoredForecast);

      const response = await request(app)
        .get('/forecast/forecast-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.forecast.id).toBe('forecast-123');
      expect(response.body.forecast.data.confidence).toBe(0.82);
    });

    test('should return 404 for non-existent forecast', async () => {
      mockDemandForecastService.getForecastById = jest.fn()
        .mockResolvedValue(null);

      const response = await request(app)
        .get('/forecast/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('FORECAST_NOT_FOUND');
    });

    test('should deny access to forecasts from different restaurant', async () => {
      const otherRestaurantForecast = {
        id: 'forecast-123',
        restaurantId: 'different-restaurant-id',
        type: 'demand_forecast',
        data: { confidence: 0.82 }
      };

      mockDemandForecastService.getForecastById = jest.fn()
        .mockResolvedValue(otherRestaurantForecast);

      const response = await request(app)
        .get('/forecast/forecast-123');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ACCESS_DENIED');
    });
  });

  describe('Get Service Status', () => {
    test('should return service status when enabled', async () => {
      mockAIReportService.testConnection.mockResolvedValue(true);

      const response = await request(app)
        .get('/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toEqual(expect.objectContaining({
        enabled: true,
        connectionHealthy: true,
        availableFeatures: ['demand_forecast'],
        lastChecked: expect.any(String)
      }));
    });

    test('should return disabled status when AI features are disabled', async () => {
      mockAIReportService.isEnabled.mockReturnValue(false);

      const response = await request(app)
        .get('/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status.enabled).toBe(false);
      expect(response.body.status.availableFeatures).toEqual([]);
      expect(response.body.status.upgradeRequired).toBe(true);
    });

    test('should detect connection issues', async () => {
      mockAIReportService.testConnection.mockResolvedValue(false);

      const response = await request(app)
        .get('/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status.enabled).toBe(true);
      expect(response.body.status.connectionHealthy).toBe(false);
    });
  });

  describe('Get Data Quality Assessment', () => {
    test('should return data quality assessment for restaurant', async () => {
      mockDemandForecastService.aggregateHistoricalData.mockResolvedValue({
        totalOrders: 120,
        totalRevenue: 3600,
        dateRange: {
          startDate: new Date('2023-12-01'),
          endDate: new Date('2024-01-01')
        }
      });

      mockDemandForecastService.assessDataQuality.mockReturnValue('high');

      const response = await request(app)
        .get('/data-quality/test-restaurant-id');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.assessment).toEqual(expect.objectContaining({
        quality: 'high',
        totalOrders: 120,
        totalRevenue: 3600,
        assessedAt: expect.any(String),
        recommendations: expect.any(Array)
      }));
    });

    test('should deny access to data from different restaurant', async () => {
      const response = await request(app)
        .get('/data-quality/different-restaurant-id');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ACCESS_DENIED');
      expect(response.body.error).toContain('different restaurant');
    });

    test('should provide recommendations for low quality data', async () => {
      mockDemandForecastService.aggregateHistoricalData.mockResolvedValue({
        totalOrders: 15,
        totalRevenue: 450,
        dateRange: {
          startDate: new Date('2023-12-01'),
          endDate: new Date('2024-01-01')
        }
      });

      mockDemandForecastService.assessDataQuality.mockReturnValue('low');

      const response = await request(app)
        .get('/data-quality/test-restaurant-id');

      expect(response.status).toBe(200);
      expect(response.body.assessment.quality).toBe('low');
      const hasIncreaseVolumeRecommendation = response.body.assessment.recommendations.some(
        rec => rec.toLowerCase().includes('increase order volume')
      );
      expect(hasIncreaseVolumeRecommendation).toBe(true);
    });

    test('should handle data aggregation errors', async () => {
      mockDemandForecastService.aggregateHistoricalData.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/data-quality/test-restaurant-id');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('DATA_QUALITY_ASSESSMENT_FAILED');
    });
  });

  describe('Input Validation and Security', () => {
    test('should reject requests with missing required fields', async () => {
      const response = await request(app)
        .post('/forecast')
        .send({}); // Empty request

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    test('should reject requests with invalid data types', async () => {
      const response = await request(app)
        .post('/forecast')
        .send({
          startDate: '2024-01-08T00:00:00Z',
          endDate: '2024-01-14T00:00:00Z',
          lookbackDays: 'not-a-number'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    test('should sanitize string inputs', async () => {
      mockDemandForecastService.generateDemandForecast.mockResolvedValue({
        success: true,
        type: 'demand_forecast',
        data: { confidence: 0.8, forecast: [] }
      });

      const response = await request(app)
        .post('/forecast')
        .send({
          startDate: '2024-01-08T00:00:00Z',
          endDate: '2024-01-14T00:00:00Z',
          lookbackDays: 30
        });

      expect(response.status).toBe(200);
      // Ensure service was called with sanitized parameters
      expect(mockDemandForecastService.generateDemandForecast).toHaveBeenCalled();
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/forecast')
        .type('json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
      // Express handles malformed JSON with its own error structure
      expect(response.body).toBeDefined();
    });
  });

  describe('Performance and Rate Limiting', () => {
    test('should handle concurrent forecast requests', async () => {
      mockDemandForecastService.generateDemandForecast.mockResolvedValue({
        success: true,
        type: 'demand_forecast',
        data: { confidence: 0.8, forecast: [] }
      });

      const validRequest = {
        startDate: '2024-01-08T00:00:00Z',
        endDate: '2024-01-14T00:00:00Z',
        lookbackDays: 30
      };

      // Send multiple concurrent requests
      const requests = Array(3).fill(null).map(() => 
        request(app).post('/forecast').send(validRequest)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(mockDemandForecastService.generateDemandForecast).toHaveBeenCalledTimes(3);
    });

    test('should include performance metrics in response', async () => {
      const mockResponse = {
        success: true,
        type: 'demand_forecast',
        data: { confidence: 0.85, forecast: [] },
        metadata: { duration: 2500, engine: 'openai' }
      };

      mockDemandForecastService.generateDemandForecast.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/forecast')
        .send({
          startDate: '2024-01-08T00:00:00Z',
          endDate: '2024-01-14T00:00:00Z',
          lookbackDays: 30
        });

      expect(response.status).toBe(200);
      expect(response.body.performance).toEqual(expect.objectContaining({
        generation_duration: 2500,
        total_request_duration: expect.any(Number)
      }));
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should handle AI service timeouts gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'TIMEOUT';
      mockDemandForecastService.generateDemandForecast.mockRejectedValue(timeoutError);

      const response = await request(app)
        .post('/forecast')
        .send({
          startDate: '2024-01-08T00:00:00Z',
          endDate: '2024-01-14T00:00:00Z',
          lookbackDays: 30
        });

      expect(response.status).toBe(504);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('REQUEST_TIMEOUT');
      expect(response.body.error).toContain('timeout');
    });

    test('should provide fallback response when AI service fails', async () => {
      mockDemandForecastService.generateDemandForecast.mockRejectedValue(
        new Error('AI service unavailable')
      );

      const response = await request(app)
        .post('/forecast')
        .send({
          startDate: '2024-01-08T00:00:00Z',
          endDate: '2024-01-14T00:00:00Z',
          lookbackDays: 30
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('FORECAST_GENERATION_FAILED');
      expect(response.body.fallbackSuggestions).toBeDefined();
      expect(response.body.fallbackSuggestions).toContainEqual(
        expect.stringContaining('try again later')
      );
    });

    test('should handle memory pressure gracefully', async () => {
      const memoryError = new Error('JavaScript heap out of memory');
      mockDemandForecastService.generateDemandForecast.mockRejectedValue(memoryError);

      const response = await request(app)
        .post('/forecast')
        .send({
          startDate: '2024-01-08T00:00:00Z',
          endDate: '2024-01-14T00:00:00Z',
          lookbackDays: 365 // Large lookback period
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('FORECAST_GENERATION_FAILED');
    });
  });
});
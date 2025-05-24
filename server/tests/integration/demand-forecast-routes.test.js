const request = require('supertest');
const app = require('../../src/app');
const { PrismaClient } = require('@prisma/client');
const { generateTestToken } = require('../utils/auth');

// Mock Prisma client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    order: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    aiReport: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    menuItem: {
      findMany: jest.fn()
    }
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock AI Service
jest.mock('../../src/services/ai-service', () => ({
  generateCompletion: jest.fn()
}));

// Mock config
jest.mock('../../src/config', () => ({
  ai: {
    enabled: true,
    provider: 'openai'
  },
  logging: {
    level: 'info'
  },
  database: {
    url: 'test-db-url'
  },
  jwt: {
    accessSecret: 'test-secret'
  }
}));

const prisma = new PrismaClient();
const aiService = require('../../src/services/ai-service');

describe('Demand Forecast Routes Integration', () => {
  let ownerToken, managerToken, staffToken;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create valid auth tokens for each test
    ownerToken = generateTestToken({
      id: 'user_1',
      role: 'owner',
      restaurantId: 'rest_1',
    });
    
    managerToken = generateTestToken({
      id: 'user_2',
      role: 'manager',
      restaurantId: 'rest_1',
    });
    
    staffToken = generateTestToken({
      id: 'user_3',
      role: 'wait_staff',
      restaurantId: 'rest_1',
    });

    // Setup default mocks
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'order_1',
        total: 25.50,
        createdAt: new Date('2024-01-15T12:00:00Z'),
        items: [
          { name: 'Burger', quantity: 1, price: 15.50 },
          { name: 'Fries', quantity: 1, price: 5.00 },
          { name: 'Soda', quantity: 1, price: 5.00 }
        ]
      },
      {
        id: 'order_2',
        total: 18.00,
        createdAt: new Date('2024-01-16T18:30:00Z'),
        items: [
          { name: 'Pizza', quantity: 1, price: 18.00 }
        ]
      }
    ]);

    prisma.order.count.mockResolvedValue(50);

    prisma.menuItem.findMany.mockResolvedValue([
      { id: 'item_1', name: 'Burger', price: 15.50, category: 'Main' },
      { id: 'item_2', name: 'Pizza', price: 18.00, category: 'Main' },
      { id: 'item_3', name: 'Fries', price: 5.00, category: 'Sides' },
      { id: 'item_4', name: 'Soda', price: 5.00, category: 'Drinks' }
    ]);

    aiService.generateCompletion.mockResolvedValue({
      success: true,
      content: JSON.stringify({
        predictions: [
          { date: '2024-02-01', orders: 25, revenue: 450, confidence: 0.85 },
          { date: '2024-02-02', orders: 28, revenue: 504, confidence: 0.83 }
        ],
        trends: {
          expectedGrowth: 12,
          seasonalFactors: ['weekend_boost', 'lunch_rush']
        },
        recommendations: [
          'Increase inventory for weekend rush',
          'Consider lunch specials to boost revenue'
        ]
      }),
      usage: { totalTokens: 1500 }
    });

    prisma.aiReport.create.mockResolvedValue({
      id: 'report_1',
      type: 'demand_forecast',
      status: 'completed',
      result: {
        predictions: [
          { date: '2024-02-01', orders: 25, revenue: 450, confidence: 0.85 }
        ]
      },
      createdAt: new Date()
    });

    prisma.aiReport.findUnique.mockResolvedValue({
      id: 'report_1',
      type: 'demand_forecast',
      status: 'completed',
      result: {
        predictions: [
          { date: '2024-02-01', orders: 25, revenue: 450, confidence: 0.85 }
        ]
      },
      restaurantId: 'rest_1',
      createdAt: new Date()
    });
  });

  describe('POST /api/insights/demand-forecast', () => {
    const validRequest = {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      forecastDays: 7,
      lookbackDays: 30
    };

    it('should create demand forecast for owner', async () => {
      const response = await request(app)
        .post('/api/insights/demand-forecast')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('predictions');
      expect(response.body.data.predictions).toBeInstanceOf(Array);
      expect(response.body.data.predictions[0]).toHaveProperty('date');
      expect(response.body.data.predictions[0]).toHaveProperty('orders');
      expect(response.body.data.predictions[0]).toHaveProperty('revenue');
      expect(response.body.data.predictions[0]).toHaveProperty('confidence');
    });

    it('should create demand forecast for manager', async () => {
      const response = await request(app)
        .post('/api/insights/demand-forecast')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('predictions');
    });

    it('should deny access to wait staff', async () => {
      const response = await request(app)
        .post('/api/insights/demand-forecast')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(validRequest)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .post('/api/insights/demand-forecast')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should validate date formats', async () => {
      const response = await request(app)
        .post('/api/insights/demand-forecast')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          ...validRequest,
          startDate: 'invalid-date'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('date');
    });

    it('should handle AI service errors gracefully', async () => {
      aiService.generateCompletion.mockRejectedValue(new Error('AI service unavailable'));

      const response = await request(app)
        .post('/api/insights/demand-forecast')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('AI service unavailable');
    });
  });

  describe('GET /api/insights/demand-forecast/:id', () => {
    it('should retrieve demand forecast by ID', async () => {
      const response = await request(app)
        .get('/api/insights/demand-forecast/report_1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 'report_1');
      expect(response.body.data).toHaveProperty('type', 'demand_forecast');
      expect(response.body.data).toHaveProperty('result');
    });

    it('should return 404 for non-existent forecast', async () => {
      prisma.aiReport.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/insights/demand-forecast/nonexistent')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should deny access to forecasts from different restaurant', async () => {
      prisma.aiReport.findUnique.mockResolvedValue({
        id: 'report_1',
        restaurantId: 'different_restaurant',
        result: {}
      });

      const response = await request(app)
        .get('/api/insights/demand-forecast/report_1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/insights/demand-forecast-status', () => {
    it('should return service status when enabled', async () => {
      const response = await request(app)
        .get('/api/insights/demand-forecast-status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('available', true);
      expect(response.body.data).toHaveProperty('provider', 'openai');
    });

    it('should detect when AI features are disabled', async () => {
      const config = require('../../src/config');
      config.ai.enabled = false;

      const response = await request(app)
        .get('/api/insights/demand-forecast-status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('available', false);
      
      // Reset for other tests
      config.ai.enabled = true;
    });
  });

  describe('GET /api/insights/demand-forecast/data-quality/:restaurantId', () => {
    it('should return data quality assessment', async () => {
      const response = await request(app)
        .get('/api/insights/demand-forecast/data-quality/rest_1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('assessment');
      expect(response.body.data.assessment).toHaveProperty('score');
      expect(response.body.data.assessment).toHaveProperty('factors');
      expect(response.body.data.assessment).toHaveProperty('recommendations');
    });

    it('should deny access to data from different restaurant', async () => {
      const response = await request(app)
        .get('/api/insights/demand-forecast/data-quality/different_restaurant')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should handle insufficient data gracefully', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/insights/demand-forecast/data-quality/rest_1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assessment.score).toBeLessThan(0.5);
      expect(response.body.data.assessment.recommendations).toContain('increase order volume');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'post', path: '/api/insights/demand-forecast' },
        { method: 'get', path: '/api/insights/demand-forecast/test' },
        { method: 'get', path: '/api/insights/demand-forecast-status' },
        { method: 'get', path: '/api/insights/demand-forecast/data-quality/rest_1' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
      }
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .post('/api/insights/demand-forecast')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          forecastDays: 7,
          lookbackDays: 30
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      prisma.order.findMany.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/insights/demand-forecast')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          forecastDays: 7,
          lookbackDays: 30
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed AI responses', async () => {
      aiService.generateCompletion.mockResolvedValue({
        success: true,
        content: 'invalid json response',
        usage: { totalTokens: 100 }
      });

      const response = await request(app)
        .post('/api/insights/demand-forecast')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          forecastDays: 7,
          lookbackDays: 30
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('parsing');
    });

    it('should validate date ranges', async () => {
      const response = await request(app)
        .post('/api/insights/demand-forecast')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          startDate: '2024-01-31',
          endDate: '2024-01-01', // End before start
          forecastDays: 7,
          lookbackDays: 30
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('range');
    });
  });
});
const request = require('supertest');
const express = require('express');

// Mock services
const mockMenuOptimizationService = {
  generateMenuOptimization: jest.fn(),
  validateEnabled: jest.fn()
};

const mockAIReportService = {
  validateEnabled: jest.fn(),
  isEnabled: jest.fn(),
  testConnection: jest.fn()
};

jest.mock('../../../src/services/menu-optimization-service', () => {
  return jest.fn().mockImplementation(() => mockMenuOptimizationService);
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

// Mock Prisma client
const mockPrisma = {
  aIJob: {
    create: jest.fn(),
  },
  aIInsight: {
    create: jest.fn(),
  },
};

jest.mock('../../../src/db/client', () => mockPrisma);

const MenuOptimizationController = require('../../../src/controllers/menu-optimization-controller');
const MenuOptimizationService = require('../../../src/services/menu-optimization-service');
const AIReportService = require('../../../src/services/ai-report-service');
const { createLogger } = require('../../../src/utils/logger');

// Create express app for testing
const app = express();
app.use(express.json());

// Mock auth middleware to set user - we'll modify this in tests
let currentUser = {
  id: 'user-123',
  sub: 'auth0|user-123',
  restaurantId: 'restaurant-123',
  username: 'testuser',
  role: 'manager'
};

app.use((req, res, next) => {
  req.user = currentUser;
  next();
});

// Setup routes
app.post('/menu-optimization/optimize', MenuOptimizationController.createMenuOptimization);
app.get('/menu-optimization/status', MenuOptimizationController.getServiceStatus);

describe('MenuOptimizationController - TDD Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset current user to default
    currentUser = {
      id: 'user-123',
      sub: 'auth0|user-123',
      restaurantId: 'restaurant-123',
      username: 'testuser',
      role: 'manager'
    };

    // Default mock setup
    mockAIReportService.isEnabled.mockReturnValue(true);
    mockAIReportService.validateEnabled.mockImplementation(() => {});
    mockAIReportService.testConnection.mockResolvedValue(true);
  });

  describe('RED: Basic controller structure', () => {
    it('should have required controller methods', () => {
      expect(MenuOptimizationController.createMenuOptimization).toBeDefined();
      expect(MenuOptimizationController.getServiceStatus).toBeDefined();
      expect(typeof MenuOptimizationController.createMenuOptimization).toBe('function');
      expect(typeof MenuOptimizationController.getServiceStatus).toBe('function');
    });
  });

  describe('RED: Permission validation', () => {
    it('should reject requests from wait_staff users', async () => {
      currentUser.role = 'wait_staff';
      
      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          lookbackDays: 30,
          includeInactive: false
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow requests from manager users', async () => {
      currentUser.role = 'manager';
      mockAIReportService.validateEnabled.mockReturnValue(true);
      mockMenuOptimizationService.generateMenuOptimization.mockResolvedValue({
        success: true,
        type: 'menu_optimization',
        data: { recommendations: [] },
        metadata: { duration: 1000 }
      });

      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          lookbackDays: 30,
          includeInactive: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow requests from owner users', async () => {
      currentUser.role = 'owner';
      mockAIReportService.validateEnabled.mockReturnValue(true);
      mockMenuOptimizationService.generateMenuOptimization.mockResolvedValue({
        success: true,
        type: 'menu_optimization',
        data: { recommendations: [] },
        metadata: { duration: 1000 }
      });

      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          lookbackDays: 30,
          includeInactive: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('RED: AI service validation', () => {
    it('should reject requests when AI features are disabled', async () => {
      const aiError = new Error('AI features are disabled. Upgrade to premium plan to access AI-powered menu optimization.');
      aiError.code = 'AI_FEATURES_DISABLED';
      mockAIReportService.validateEnabled.mockImplementation(() => {
        throw aiError;
      });

      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          lookbackDays: 30,
          includeInactive: false
        });

      expect(response.status).toBe(402);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AI_FEATURES_DISABLED');
      expect(response.body.upgradeRequired).toBe(true);
    });

    it('should handle AI service validation errors', async () => {
      mockAIReportService.validateEnabled.mockImplementation(() => {
        throw new Error('Service connection failed');
      });

      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          lookbackDays: 30,
          includeInactive: false
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AI_SERVICE_ERROR');
    });
  });

  describe('RED: Request parameter validation', () => {
    beforeEach(() => {
      mockAIReportService.validateEnabled.mockReturnValue(true);
    });

    it('should validate lookbackDays parameter', async () => {
      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          // Missing lookbackDays
          includeInactive: false
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.details).toContain('lookbackDays is required');
    });

    it('should validate lookbackDays minimum value', async () => {
      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          lookbackDays: 0,
          includeInactive: false
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.error).toContain('Lookback days must be at least 1');
    });

    it('should validate lookbackDays maximum value', async () => {
      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          lookbackDays: 366,
          includeInactive: false
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.error).toContain('Lookback days cannot exceed 365');
    });

    it('should default includeInactive to false when not provided', async () => {
      mockMenuOptimizationService.generateMenuOptimization.mockResolvedValue({
        success: true,
        type: 'menu_optimization',
        data: { recommendations: [] },
        metadata: { duration: 1000 }
      });

      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          lookbackDays: 30
          // includeInactive not provided
        });

      expect(response.status).toBe(200);
      expect(mockMenuOptimizationService.generateMenuOptimization).toHaveBeenCalledWith({
        restaurantId: 'restaurant-123',
        lookbackDays: 30,
        includeInactive: false
      });
    });

    it('should accept valid parameters', async () => {
      mockMenuOptimizationService.generateMenuOptimization.mockResolvedValue({
        success: true,
        type: 'menu_optimization',
        data: { recommendations: [] },
        metadata: { duration: 1000 }
      });

      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          lookbackDays: 30,
          includeInactive: true
        });

      expect(response.status).toBe(200);
      expect(mockMenuOptimizationService.generateMenuOptimization).toHaveBeenCalledWith({
        restaurantId: 'restaurant-123',
        lookbackDays: 30,
        includeInactive: true
      });
    });
  });

  describe('RED: Menu optimization generation', () => {
    beforeEach(() => {
      mockAIReportService.validateEnabled.mockReturnValue(true);
    });

    it('should generate menu optimization successfully', async () => {
      const mockOptimizationResult = {
        success: true,
        type: 'menu_optimization',
        data: {
          summary: {
            total_items: 25,
            active_items: 22,
            total_revenue: 15000,
            top_category: 'Entrees'
          },
          item_performance: [
            {
              item_id: 'item-1',
              name: 'Burger',
              category: 'Entrees',
              total_quantity: 150,
              total_revenue: 2250,
              average_price: 15.00,
              performance_rank: 1,
              trend: 'increasing',
              recommendation: 'promote'
            }
          ],
          category_performance: [
            {
              category: 'Entrees',
              item_count: 10,
              total_revenue: 12000,
              performance_score: 8.5
            }
          ],
          insights: [
            'Your Burger is the top performer with strong upward trend',
            'Entrees category generates 80% of total revenue'
          ],
          recommendations: [
            'Promote your top-performing Burger with special offers',
            'Consider removing low-performing appetizers to simplify menu'
          ]
        },
        metadata: {
          generation_duration: 2500,
          confidence: 0.85,
          data_quality: 'high'
        }
      };

      mockMenuOptimizationService.generateMenuOptimization.mockResolvedValue(mockOptimizationResult);

      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          lookbackDays: 30,
          includeInactive: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.optimization).toEqual(mockOptimizationResult);
      expect(response.body.requestInfo).toBeDefined();
      expect(response.body.requestInfo.lookbackDays).toBe(30);
      expect(response.body.requestInfo.includeInactive).toBe(false);
      expect(response.body.requestInfo.requestedBy).toBe('testuser');
      expect(response.body.performance).toBeDefined();
      expect(response.body.performance.generation_duration).toBe(2500);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'TIMEOUT';
      mockMenuOptimizationService.generateMenuOptimization.mockRejectedValue(timeoutError);

      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          lookbackDays: 30,
          includeInactive: false
        });

      expect(response.status).toBe(504);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('REQUEST_TIMEOUT');
    });

    it('should handle service errors gracefully', async () => {
      mockMenuOptimizationService.generateMenuOptimization.mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          lookbackDays: 30,
          includeInactive: false
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('OPTIMIZATION_GENERATION_FAILED');
      expect(response.body.fallbackSuggestions).toBeDefined();
      expect(response.body.fallbackSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('RED: Service status endpoint', () => {
    it('should return service status when AI is enabled', async () => {
      mockAIReportService.isEnabled.mockReturnValue(true);
      mockAIReportService.testConnection.mockResolvedValue(true);

      const response = await request(app)
        .get('/menu-optimization/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status.enabled).toBe(true);
      expect(response.body.status.connectionHealthy).toBe(true);
      expect(response.body.status.availableFeatures).toContain('menu_optimization');
      expect(response.body.status.upgradeRequired).toBe(false);
    });

    it('should return service status when AI is disabled', async () => {
      mockAIReportService.isEnabled.mockReturnValue(false);

      const response = await request(app)
        .get('/menu-optimization/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status.enabled).toBe(false);
      expect(response.body.status.connectionHealthy).toBe(false);
      expect(response.body.status.availableFeatures).toEqual([]);
      expect(response.body.status.upgradeRequired).toBe(true);
    });

    it('should handle status check errors gracefully', async () => {
      mockAIReportService.isEnabled.mockImplementation(() => {
        throw new Error('Status check failed');
      });

      const response = await request(app)
        .get('/menu-optimization/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status.enabled).toBe(false);
      expect(response.body.status.error).toContain('Status check failed');
    });
  });

  describe('RED: Database integration', () => {
    beforeEach(() => {
      mockAIReportService.validateEnabled.mockReturnValue(true);
    });

    it('should save optimization results to database', async () => {
      mockPrisma.aIJob.create.mockResolvedValue({
        id: 'job-123',
        type: 'menu_optimization',
        status: 'completed'
      });
      mockPrisma.aIInsight.create.mockResolvedValue({
        id: 'insight-123',
        jobId: 'job-123',
        type: 'menu_optimization'
      });

      const mockOptimizationResult = {
        success: true,
        type: 'menu_optimization',
        data: { recommendations: [] },
        metadata: { duration: 1000 }
      };

      mockMenuOptimizationService.generateMenuOptimization.mockResolvedValue(mockOptimizationResult);

      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          lookbackDays: 30,
          includeInactive: false
        });

      expect(response.status).toBe(200);
      expect(mockPrisma.aIJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          restaurantId: 'restaurant-123',
          userId: 'auth0|user-123',
          type: 'menu_optimization',
          status: 'completed',
          parameters: {
            lookbackDays: 30,
            includeInactive: false
          }
        })
      });
      expect(mockPrisma.aIInsight.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobId: 'job-123',
          restaurantId: 'restaurant-123',
          type: 'menu_optimization',
          title: expect.stringContaining('Menu Optimization'),
          summary: expect.stringContaining('30 days of historical data')
        })
      });
    });

    it('should continue on database save errors', async () => {
      mockPrisma.aIJob.create.mockRejectedValue(new Error('Database connection failed'));

      const mockOptimizationResult = {
        success: true,
        type: 'menu_optimization',
        data: { recommendations: [] },
        metadata: { duration: 1000 }
      };

      mockMenuOptimizationService.generateMenuOptimization.mockResolvedValue(mockOptimizationResult);

      const response = await request(app)
        .post('/menu-optimization/optimize')
        .send({
          lookbackDays: 30,
          includeInactive: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Logger error call is tested implicitly - main test is that request succeeds despite DB error
    });
  });
});
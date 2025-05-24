const request = require('supertest');
const express = require('express');
const { 
  createDemandForecast,
  createMenuOptimization,
  getJobStatus,
  getDemandForecast,
  getMenuOptimization,
  getInsightsHistory,
  getFeatureStatus,
  deleteInsight,
  lockInsight,
  unlockInsight
} = require('../../../src/controllers/insights-controller');
const aiService = require('../../../src/services/ai-service');
const jobQueue = require('../../../src/services/job-queue');
const prisma = require('../../../src/db/client');

// Create express app for testing
const app = express();
app.use(express.json());

// Mock middleware to set user
app.use((req, res, next) => {
  req.user = {
    id: 'test-user-id',
    restaurantId: 'test-restaurant-id',
    role: 'manager', // Default to manager role
  };
  next();
});

// Set up routes
app.post('/demand-forecast', createDemandForecast);
app.post('/menu-optimization', createMenuOptimization);
app.get('/jobs/:jobId', getJobStatus);
app.get('/demand-forecast/:jobId', getDemandForecast);
app.get('/menu-optimization/:jobId', getMenuOptimization);
app.get('/history', getInsightsHistory);
app.get('/feature-status', getFeatureStatus);
app.delete('/insights/:id', deleteInsight);
app.post('/insights/:id/lock', lockInsight);
app.delete('/insights/:id/lock', unlockInsight);

// Mock dependencies
jest.mock('../../../src/services/ai-service');
jest.mock('../../../src/services/job-queue');
jest.mock('../../../src/db/client', () => ({
  order: {
    count: jest.fn(),
  },
  menuItem: {
    count: jest.fn(),
  },
  aIJob: {
    findUnique: jest.fn(),
  },
  aIInsight: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
}));

describe('Insights Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default AI service mock setup
    aiService.isEnabled.mockReturnValue(true);
    aiService.validateEnabled.mockImplementation(() => {});
  });

  describe('Feature Flag Protection', () => {
    test('should return 402 when AI features are disabled - demand forecast', async () => {
      aiService.isEnabled.mockReturnValue(false);

      const response = await request(app)
        .post('/demand-forecast')
        .send({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-07T00:00:00Z',
        });

      expect(response.status).toBe(402);
      expect(response.body.code).toBe('AI_FEATURES_DISABLED');
      expect(response.body.upgradeRequired).toBe(true);
      expect(response.body.error).toContain('Upgrade to Premium');
    });

    test('should return 402 when AI features are disabled - menu optimization', async () => {
      aiService.isEnabled.mockReturnValue(false);

      const response = await request(app)
        .post('/menu-optimization')
        .send({
          lookbackDays: 30,
        });

      expect(response.status).toBe(402);
      expect(response.body.code).toBe('AI_FEATURES_DISABLED');
      expect(response.body.upgradeRequired).toBe(true);
    });

    test('should return 402 when AI features are disabled - job status', async () => {
      aiService.isEnabled.mockReturnValue(false);

      const response = await request(app)
        .get('/jobs/test-job-id');

      expect(response.status).toBe(402);
      expect(response.body.code).toBe('AI_FEATURES_DISABLED');
    });
  });

  describe('Role-Based Access Control', () => {
    test('should deny access to wait_staff role', async () => {
      // Override user role
      app.use((req, res, next) => {
        req.user.role = 'wait_staff';
        next();
      });

      const response = await request(app)
        .post('/demand-forecast')
        .send({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-07T00:00:00Z',
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(response.body.error).toContain('Only managers and owners');
    });

    test('should allow access to manager role', async () => {
      prisma.order.count.mockResolvedValue(20); // Sufficient data
      jobQueue.addJob.mockResolvedValue({
        id: 'test-job-id',
        status: 'pending',
        estimatedCompletion: new Date(),
      });

      const response = await request(app)
        .post('/demand-forecast')
        .send({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-07T00:00:00Z',
        });

      expect(response.status).toBe(202);
    });

    test('should allow access to owner role', async () => {
      // Override user role
      app.use((req, res, next) => {
        req.user.role = 'owner';
        next();
      });

      prisma.order.count.mockResolvedValue(20); // Sufficient data
      jobQueue.addJob.mockResolvedValue({
        id: 'test-job-id',
        status: 'pending',
        estimatedCompletion: new Date(),
      });

      const response = await request(app)
        .post('/demand-forecast')
        .send({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-07T00:00:00Z',
        });

      expect(response.status).toBe(202);
    });
  });

  describe('Demand Forecast Creation', () => {
    beforeEach(() => {
      prisma.order.count.mockResolvedValue(20); // Sufficient data
      jobQueue.addJob.mockResolvedValue({
        id: 'test-job-id',
        status: 'pending',
        estimatedCompletion: new Date(),
      });
    });

    test('should create demand forecast job successfully', async () => {
      const response = await request(app)
        .post('/demand-forecast')
        .send({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-07T00:00:00Z',
          lookbackDays: 30,
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.job.id).toBe('test-job-id');
      expect(response.body.job.type).toBe('demand_forecast');
    });

    test('should validate required parameters', async () => {
      const response = await request(app)
        .post('/demand-forecast')
        .send({
          // Missing startDate and endDate
          lookbackDays: 30,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_PARAMETERS');
    });

    test('should validate date format', async () => {
      const response = await request(app)
        .post('/demand-forecast')
        .send({
          startDate: 'invalid-date',
          endDate: '2024-01-07T00:00:00Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_DATE_FORMAT');
    });

    test('should validate date range', async () => {
      const response = await request(app)
        .post('/demand-forecast')
        .send({
          startDate: '2024-01-07T00:00:00Z',
          endDate: '2024-01-01T00:00:00Z', // End before start
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_DATE_RANGE');
    });

    test('should check for sufficient historical data', async () => {
      prisma.order.count.mockResolvedValue(5); // Insufficient data

      const response = await request(app)
        .post('/demand-forecast')
        .send({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-07T00:00:00Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INSUFFICIENT_DATA');
      expect(response.body.currentOrderCount).toBe(5);
      expect(response.body.requiredOrderCount).toBe(10);
    });
  });

  describe('Menu Optimization Creation', () => {
    beforeEach(() => {
      prisma.menuItem.count.mockResolvedValue(5); // Sufficient menu items
      prisma.order.count.mockResolvedValue(25); // Sufficient orders
      jobQueue.addJob.mockResolvedValue({
        id: 'test-job-id',
        status: 'pending',
        estimatedCompletion: new Date(),
      });
    });

    test('should create menu optimization job successfully', async () => {
      const response = await request(app)
        .post('/menu-optimization')
        .send({
          lookbackDays: 30,
          includeInactive: false,
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.job.type).toBe('menu_optimization');
    });

    test('should check for sufficient menu items', async () => {
      prisma.menuItem.count.mockResolvedValue(2); // Insufficient items

      const response = await request(app)
        .post('/menu-optimization')
        .send({
          lookbackDays: 30,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INSUFFICIENT_MENU_ITEMS');
      expect(response.body.currentItemCount).toBe(2);
      expect(response.body.requiredItemCount).toBe(3);
    });

    test('should check for sufficient order history', async () => {
      prisma.order.count.mockResolvedValue(15); // Insufficient orders

      const response = await request(app)
        .post('/menu-optimization')
        .send({
          lookbackDays: 30,
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INSUFFICIENT_ORDER_HISTORY');
      expect(response.body.currentOrderCount).toBe(15);
      expect(response.body.requiredOrderCount).toBe(20);
    });
  });

  describe('Job Status Retrieval', () => {
    test('should get job status successfully', async () => {
      const mockJob = {
        id: 'test-job-id',
        restaurantId: 'test-restaurant-id',
        type: 'DEMAND_FORECAST',
        status: 'RUNNING',
        progress: 50,
      };

      prisma.aIJob.findUnique.mockResolvedValue(mockJob);
      jobQueue.getJobStatus.mockResolvedValue({
        id: 'test-job-id',
        type: 'demand_forecast',
        status: 'running',
        progress: 50,
      });

      const response = await request(app)
        .get('/jobs/test-job-id');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.job.id).toBe('test-job-id');
      expect(response.body.job.progress).toBe(50);
    });

    test('should return 404 for non-existent job', async () => {
      prisma.aIJob.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/jobs/non-existent-job');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('JOB_NOT_FOUND');
    });

    test('should deny access to jobs from different restaurant', async () => {
      const mockJob = {
        id: 'test-job-id',
        restaurantId: 'different-restaurant-id', // Different restaurant
        type: 'DEMAND_FORECAST',
        status: 'RUNNING',
      };

      prisma.aIJob.findUnique.mockResolvedValue(mockJob);

      const response = await request(app)
        .get('/jobs/test-job-id');

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('ACCESS_DENIED');
    });
  });

  describe('Insight Retrieval', () => {
    test('should get completed demand forecast', async () => {
      const mockInsight = {
        id: 'insight-id',
        jobId: 'test-job-id',
        restaurantId: 'test-restaurant-id',
        title: 'Demand Forecast Analysis',
        summary: 'Test summary',
        confidence: 0.85,
        data: { periods: [] },
        createdAt: new Date(),
        validUntil: new Date(),
        job: {
          id: 'test-job-id',
          status: 'COMPLETED',
        },
      };

      prisma.aIInsight.findUnique.mockResolvedValue(mockInsight);

      const response = await request(app)
        .get('/demand-forecast/test-job-id');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.forecast.id).toBe('insight-id');
      expect(response.body.forecast.confidence).toBe(0.85);
    });

    test('should return 404 for non-existent forecast', async () => {
      prisma.aIInsight.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/demand-forecast/non-existent-job');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('FORECAST_NOT_FOUND');
    });

    test('should return 409 for incomplete forecast', async () => {
      const mockInsight = {
        id: 'insight-id',
        jobId: 'test-job-id',
        restaurantId: 'test-restaurant-id',
        job: {
          id: 'test-job-id',
          status: 'RUNNING', // Not completed
        },
      };

      prisma.aIInsight.findUnique.mockResolvedValue(mockInsight);

      const response = await request(app)
        .get('/demand-forecast/test-job-id');

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('FORECAST_NOT_READY');
      expect(response.body.currentStatus).toBe('running');
    });
  });

  describe('Insights History', () => {
    test('should get insights history with pagination', async () => {
      const mockInsights = [
        {
          id: 'insight-1',
          jobId: 'job-1',
          type: 'DEMAND_FORECAST',
          title: 'Forecast 1',
          summary: 'Summary 1',
          confidence: 0.85,
          createdAt: new Date(),
          validUntil: new Date(),
          job: {
            id: 'job-1',
            status: 'COMPLETED',
            createdAt: new Date(),
            completedAt: new Date(),
          },
        },
      ];

      prisma.aIInsight.findMany.mockResolvedValue(mockInsights);
      prisma.aIInsight.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/history?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.insights).toHaveLength(1);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.totalCount).toBe(1);
    });

    test('should filter by insight type', async () => {
      prisma.aIInsight.findMany.mockResolvedValue([]);
      prisma.aIInsight.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/history?type=demand_forecast');

      expect(response.status).toBe(200);
      expect(prisma.aIInsight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'DEMAND_FORECAST',
          }),
        })
      );
    });
  });

  describe('Feature Status', () => {
    test('should return feature status for enabled AI with proper permissions', async () => {
      const response = await request(app)
        .get('/feature-status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.features.aiEnabled).toBe(true);
      expect(response.body.features.hasPermission).toBe(true);
      expect(response.body.features.availableFeatures).toContain('demand_forecast');
      expect(response.body.features.availableFeatures).toContain('menu_optimization');
      expect(response.body.features.upgradeRequired).toBe(false);
    });

    test('should return correct status when AI is disabled', async () => {
      aiService.isEnabled.mockReturnValue(false);

      const response = await request(app)
        .get('/feature-status');

      expect(response.status).toBe(200);
      expect(response.body.features.aiEnabled).toBe(false);
      expect(response.body.features.upgradeRequired).toBe(true);
      expect(response.body.features.availableFeatures).toEqual([]);
    });

    test('should return correct status for insufficient permissions', async () => {
      // Override user role
      app.use((req, res, next) => {
        req.user.role = 'wait_staff';
        next();
      });

      const response = await request(app)
        .get('/feature-status');

      expect(response.status).toBe(200);
      expect(response.body.features.hasPermission).toBe(false);
      expect(response.body.features.permissionRequired).toBe(true);
      expect(response.body.features.availableFeatures).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      prisma.order.count.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/demand-forecast')
        .send({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-07T00:00:00Z',
        });

      expect(response.status).toBe(500);
      expect(response.body.code).toBe('INTERNAL_ERROR');
    });

    test('should handle job queue errors gracefully', async () => {
      prisma.order.count.mockResolvedValue(20);
      jobQueue.addJob.mockRejectedValue(new Error('Queue error'));

      const response = await request(app)
        .post('/demand-forecast')
        .send({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-07T00:00:00Z',
        });

      expect(response.status).toBe(500);
      expect(response.body.code).toBe('INTERNAL_ERROR');
    });

    test('should handle AI service validation errors', async () => {
      const validationError = new Error('AI features are disabled');
      validationError.code = 'AI_FEATURES_DISABLED';
      validationError.statusCode = 402;

      aiService.validateEnabled.mockImplementation(() => {
        throw validationError;
      });

      const response = await request(app)
        .post('/demand-forecast')
        .send({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-07T00:00:00Z',
        });

      expect(response.status).toBe(402);
      expect(response.body.code).toBe('AI_FEATURES_DISABLED');
      expect(response.body.upgradeRequired).toBe(true);
    });
  });

  describe('Input Sanitization and Security', () => {
    test('should handle malicious input safely', async () => {
      prisma.order.count.mockResolvedValue(20);
      jobQueue.addJob.mockResolvedValue({
        id: 'test-job-id',
        status: 'pending',
        estimatedCompletion: new Date(),
      });

      const response = await request(app)
        .post('/demand-forecast')
        .send({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-07T00:00:00Z',
          lookbackDays: '<script>alert("xss")</script>',
        });

      // Should handle XSS attempts without error
      expect(response.status).toBe(202);
    });

    test('should validate numeric parameters', async () => {
      const response = await request(app)
        .post('/menu-optimization')
        .send({
          lookbackDays: 'not-a-number',
        });

      // Validation middleware should catch this
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /insights/:id', () => {
    const mockResponse = () => {
      const res = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };

    test('should soft delete an insight successfully', async () => {
      const mockInsight = {
        id: 'insight-1',
        restaurantId: 'rest-1',
        isActive: true,
        type: 'demand_forecast'
      };

      prisma.aIInsight.findUnique.mockResolvedValue(mockInsight);
      prisma.aIInsight.update.mockResolvedValue({ ...mockInsight, isActive: false });

      const req = {
        params: { id: 'insight-1' },
        user: { restaurantId: 'rest-1', role: 'manager' }
      };
      const res = mockResponse();

      await deleteInsight(req, res);

      expect(prisma.aIInsight.update).toHaveBeenCalledWith({
        where: { id: 'insight-1' },
        data: { isActive: false }
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Insight deleted successfully'
      });
    });

    test('should return 404 for non-existent insight', async () => {
      prisma.aIInsight.findUnique.mockResolvedValue(null);

      const req = {
        params: { id: 'non-existent' },
        user: { restaurantId: 'rest-1', role: 'manager' }
      };
      const res = mockResponse();

      await deleteInsight(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insight not found',
        code: 'INSIGHT_NOT_FOUND'
      });
    });

    test('should prevent deletion of insights from different restaurant', async () => {
      const mockInsight = {
        id: 'insight-1',
        restaurantId: 'rest-2', // Different restaurant
        isActive: true
      };

      prisma.aIInsight.findUnique.mockResolvedValue(mockInsight);

      const req = {
        params: { id: 'insight-1' },
        user: { restaurantId: 'rest-1', role: 'manager' }
      };
      const res = mockResponse();

      await deleteInsight(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied to insight from different restaurant',
        code: 'ACCESS_DENIED'
      });
    });

    test('should require manager or owner role for deletion', async () => {
      const req = {
        params: { id: 'insight-1' },
        user: { restaurantId: 'rest-1', role: 'wait_staff' }
      };
      const res = mockResponse();

      await deleteInsight(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions. Only managers and owners can delete insights.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    });

    test('should prevent deletion of locked insights', async () => {
      const mockInsight = {
        id: 'insight-1',
        restaurantId: 'rest-1',
        isActive: true,
        data: { locked: true, lockedBy: 'other-user' }
      };

      prisma.aIInsight.findUnique.mockResolvedValue(mockInsight);

      const req = {
        params: { id: 'insight-1' },
        user: { restaurantId: 'rest-1', role: 'manager' }
      };
      const res = mockResponse();

      await deleteInsight(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot delete a locked insight. Unlock it first.',
        code: 'INSIGHT_LOCKED'
      });
      expect(prisma.aIInsight.update).not.toHaveBeenCalled();
    });
  });

  describe('POST /insights/:id/lock', () => {
    const mockResponse = () => {
      const res = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };

    test('should lock an insight successfully', async () => {
      const mockInsight = {
        id: 'insight-1',
        restaurantId: 'rest-1',
        isActive: true,
        type: 'demand_forecast',
        data: { forecast: [], insights: [] }
      };

      prisma.aIInsight.findUnique.mockResolvedValue(mockInsight);
      prisma.aIInsight.update.mockResolvedValue({ 
        ...mockInsight, 
        data: { ...mockInsight.data, locked: true, lockedBy: 'user-1', lockedAt: new Date() }
      });

      const req = {
        params: { id: 'insight-1' },
        user: { sub: 'user-1', restaurantId: 'rest-1', role: 'manager', username: 'testuser' }
      };
      const res = mockResponse();

      await lockInsight(req, res);

      expect(prisma.aIInsight.update).toHaveBeenCalledWith({
        where: { id: 'insight-1' },
        data: {
          data: expect.objectContaining({
            locked: true,
            lockedBy: 'user-1',
            lockedByName: 'testuser',
            lockedAt: expect.any(String)
          })
        }
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Insight locked successfully'
      });
    });

    test('should prevent locking already locked insight', async () => {
      const mockInsight = {
        id: 'insight-1',
        restaurantId: 'rest-1',
        data: { locked: true, lockedBy: 'other-user' }
      };

      prisma.aIInsight.findUnique.mockResolvedValue(mockInsight);

      const req = {
        params: { id: 'insight-1' },
        user: { sub: 'user-1', restaurantId: 'rest-1', role: 'manager' }
      };
      const res = mockResponse();

      await lockInsight(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insight is already locked by another user',
        code: 'INSIGHT_LOCKED'
      });
    });
  });

  describe('DELETE /insights/:id/lock', () => {
    const mockResponse = () => {
      const res = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };

    test('should unlock an insight successfully', async () => {
      const mockInsight = {
        id: 'insight-1',
        restaurantId: 'rest-1',
        data: { locked: true, lockedBy: 'user-1', forecast: [] }
      };

      prisma.aIInsight.findUnique.mockResolvedValue(mockInsight);
      prisma.aIInsight.update.mockResolvedValue({ 
        ...mockInsight, 
        data: { forecast: [] } // locked fields removed
      });

      const req = {
        params: { id: 'insight-1' },
        user: { sub: 'user-1', restaurantId: 'rest-1', role: 'manager' }
      };
      const res = mockResponse();

      await unlockInsight(req, res);

      expect(prisma.aIInsight.update).toHaveBeenCalledWith({
        where: { id: 'insight-1' },
        data: {
          data: { forecast: [] } // No lock fields
        }
      });
    });

    test('should prevent unlocking by different user (non-owner)', async () => {
      const mockInsight = {
        id: 'insight-1',
        restaurantId: 'rest-1',
        data: { locked: true, lockedBy: 'other-user' }
      };

      prisma.aIInsight.findUnique.mockResolvedValue(mockInsight);

      const req = {
        params: { id: 'insight-1' },
        user: { sub: 'user-1', restaurantId: 'rest-1', role: 'manager' }
      };
      const res = mockResponse();

      await unlockInsight(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Only the user who locked this insight or an owner can unlock it',
        code: 'UNLOCK_DENIED'
      });
    });

    test('should allow owner to unlock any insight', async () => {
      const mockInsight = {
        id: 'insight-1',
        restaurantId: 'rest-1',
        data: { locked: true, lockedBy: 'other-user', forecast: [] }
      };

      prisma.aIInsight.findUnique.mockResolvedValue(mockInsight);
      prisma.aIInsight.update.mockResolvedValue({ 
        ...mockInsight, 
        data: { forecast: [] }
      });

      const req = {
        params: { id: 'insight-1' },
        user: { sub: 'user-1', restaurantId: 'rest-1', role: 'owner' }
      };
      const res = mockResponse();

      await unlockInsight(req, res);

      expect(prisma.aIInsight.update).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Insight unlocked successfully'
      });
    });
  });
});
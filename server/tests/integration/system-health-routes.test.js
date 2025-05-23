// Mock dependencies
jest.mock('../../src/services/system-health-service');
jest.mock('../../src/utils/logger');
jest.mock('../../src/middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    req.user = {
      id: 'user-1',
      sub: 'user-1',
      username: 'testowner',
      role: 'owner',
      restaurantId: 'restaurant-1',
    };
    next();
  },
  hasRole: () => (req, res, next) => next(),
  auditAction: () => (req, res, next) => next(),
}));

const request = require('supertest');
const express = require('express');
const systemHealthRoutes = require('../../src/routes/system-health-routes');
const systemHealthService = require('../../src/services/system-health-service');
const { createLogger } = require('../../src/utils/logger');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/system', systemHealthRoutes);

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

createLogger.mockReturnValue(mockLogger);

describe('System Health Routes Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/system/health', () => {
    it('should return system health status', async () => {
      const mockHealth = {
        status: 'healthy',
        services: [
          {
            id: '1',
            serviceName: 'database',
            status: 'healthy',
            lastCheckAt: new Date(),
          },
        ],
        containers: [
          {
            id: '1',
            name: 'api-container',
            status: 'running',
            image: 'api:latest',
          },
        ],
        features: [
          {
            id: '1',
            name: 'feature-a',
            enabled: true,
          },
        ],
        lastUpdated: '2023-01-01T00:00:00Z',
      };

      systemHealthService.getSystemHealth.mockResolvedValue(mockHealth);

      const response = await request(app)
        .get('/api/system/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockHealth,
      });
    });

    it('should handle service errors', async () => {
      systemHealthService.getSystemHealth.mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .get('/api/system/health')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve system health status',
      });
    });
  });

  describe('GET /api/system/health/services', () => {
    it('should return service health status', async () => {
      const mockServices = [
        {
          id: '1',
          serviceName: 'database',
          status: 'healthy',
          lastCheckAt: new Date(),
          responseTime: 10,
        },
      ];

      systemHealthService.getServiceHealth.mockResolvedValue(mockServices);

      const response = await request(app)
        .get('/api/system/health/services')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockServices,
      });
    });
  });

  describe('POST /api/system/health/check', () => {
    it('should trigger manual health check', async () => {
      systemHealthService.performHealthChecks.mockResolvedValue();
      systemHealthService.logSystemEvent.mockResolvedValue({});

      const response = await request(app)
        .post('/api/system/health/check')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Health check triggered successfully',
      });

      expect(systemHealthService.performHealthChecks).toHaveBeenCalled();
      expect(systemHealthService.logSystemEvent).toHaveBeenCalledWith(
        'info',
        'Manual health check triggered',
        'system',
        { triggeredBy: 'testowner' },
        'user-1'
      );
    });
  });

  describe('GET /api/system/containers', () => {
    it('should return container status', async () => {
      const mockContainers = [
        {
          id: '1',
          name: 'api-container',
          status: 'running',
          image: 'api:latest',
          cpuUsage: 15.5,
          memoryUsage: 512000000,
        },
      ];

      systemHealthService.getContainerHealth.mockResolvedValue(mockContainers);

      const response = await request(app)
        .get('/api/system/containers')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockContainers,
      });
    });
  });

  describe('POST /api/system/containers/update', () => {
    it('should update container status', async () => {
      systemHealthService.updateContainerStatus.mockResolvedValue();
      systemHealthService.logSystemEvent.mockResolvedValue({});

      const response = await request(app)
        .post('/api/system/containers/update')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Container status update triggered successfully',
      });

      expect(systemHealthService.updateContainerStatus).toHaveBeenCalled();
    });
  });

  describe('GET /api/system/features', () => {
    it('should return feature flags', async () => {
      const mockFeatures = [
        {
          id: '1',
          name: 'feature-a',
          enabled: true,
          description: 'Test feature A',
          config: { setting: 'value' },
        },
        {
          id: '2',
          name: 'feature-b',
          enabled: false,
          description: 'Test feature B',
          config: null,
        },
      ];

      systemHealthService.getFeatureFlags.mockResolvedValue(mockFeatures);

      const response = await request(app)
        .get('/api/system/features')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockFeatures,
      });
    });
  });

  describe('POST /api/system/features/:feature', () => {
    it('should update feature flag successfully', async () => {
      const mockFeature = {
        id: '1',
        name: 'test-feature',
        enabled: true,
        config: { setting: 'value' },
        updatedAt: new Date(),
      };

      systemHealthService.updateFeatureFlag.mockResolvedValue(mockFeature);
      systemHealthService.logSystemEvent.mockResolvedValue({});

      const response = await request(app)
        .post('/api/system/features/test-feature')
        .send({
          enabled: true,
          config: { setting: 'value' },
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockFeature,
      });

      expect(systemHealthService.updateFeatureFlag).toHaveBeenCalledWith(
        'test-feature',
        true,
        { setting: 'value' }
      );
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/system/features/test-feature')
        .send({
          enabled: 'invalid', // Should be boolean
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid request data',
        details: expect.any(Array),
      });
    });

    it('should handle empty feature name', async () => {
      const response = await request(app)
        .post('/api/system/features/')
        .send({ enabled: true })
        .expect(404); // Route not found for empty parameter
    });

    it('should handle service errors', async () => {
      systemHealthService.updateFeatureFlag.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/api/system/features/test-feature')
        .send({ enabled: true })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to update feature flag',
      });
    });
  });

  describe('GET /api/system/logs', () => {
    it('should return system logs with default filters', async () => {
      const mockLogs = {
        logs: [
          {
            id: '1',
            level: 'info',
            message: 'Test log message',
            service: 'api',
            timestamp: new Date(),
            user: {
              id: 'user-1',
              username: 'testuser',
              role: 'owner',
            },
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
      };

      systemHealthService.getSystemLogs.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/api/system/logs')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockLogs,
      });

      expect(systemHealthService.getSystemLogs).toHaveBeenCalledWith({});
    });

    it('should handle query parameters', async () => {
      const mockLogs = {
        logs: [],
        total: 0,
        limit: 50,
        offset: 10,
      };

      systemHealthService.getSystemLogs.mockResolvedValue(mockLogs);

      const response = await request(app)
        .get('/api/system/logs')
        .query({
          level: 'error',
          service: 'database',
          limit: '50',
          offset: '10',
          startDate: '2023-01-01T00:00:00Z',
          endDate: '2023-12-31T23:59:59Z',
        })
        .expect(200);

      expect(systemHealthService.getSystemLogs).toHaveBeenCalledWith({
        level: 'error',
        service: 'database',
        limit: 50,
        offset: 10,
        startDate: new Date('2023-01-01T00:00:00Z'),
        endDate: new Date('2023-12-31T23:59:59Z'),
      });
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/system/logs')
        .query({
          level: 'invalid-level',
          limit: '2000', // Exceeds maximum
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid query parameters',
        details: expect.any(Array),
      });
    });
  });

  describe('GET /api/system/metrics', () => {
    it('should return system metrics', async () => {
      const mockMetrics = {
        cpu: {
          manufacturer: 'Intel',
          brand: 'Core i7',
          cores: 8,
          physicalCores: 4,
          speed: 3.2,
        },
        memory: {
          total: 16777216000,
          free: 8388608000,
          used: 8388608000,
          active: 4194304000,
          available: 12582912000,
          percentage: 50,
        },
        disk: [
          {
            fs: '/dev/disk1',
            type: 'APFS',
            size: 500000000000,
            used: 250000000000,
            available: 250000000000,
            percentage: 50,
            mount: '/',
          },
        ],
        load: {
          currentLoad: 25.5,
          avgLoad: 1.5,
          cpus: [
            { load: 30.2 },
            { load: 20.8 },
          ],
        },
      };

      systemHealthService.getSystemMetrics.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/system/metrics')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMetrics,
      });
    });

    it('should handle service errors', async () => {
      systemHealthService.getSystemMetrics.mockRejectedValue(
        new Error('System info unavailable')
      );

      const response = await request(app)
        .get('/api/system/metrics')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve system metrics',
      });
    });
  });
});
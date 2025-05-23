// Mock dependencies
jest.mock('../../../src/services/system-health-service');
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const systemHealthService = require('../../../src/services/system-health-service');
const { createLogger } = require('../../../src/utils/logger');
const {
  getSystemHealth,
  getServiceHealth,
  getContainers,
  getFeatures,
  updateFeature,
  getSystemLogs,
  getSystemMetrics,
  triggerHealthCheck,
  updateContainerStatus,
} = require('../../../src/controllers/system-health-controller');

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

createLogger.mockReturnValue(mockLogger);

describe('SystemHealthController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: {
        id: 'user-1',
        sub: 'user-1',
        username: 'testowner',
        role: 'owner',
      },
      params: {},
      body: {},
      query: {},
    };

    res = {
      json: jest.fn(),
      status: jest.fn(() => res),
    };
  });

  describe('getSystemHealth', () => {
    it('should return system health successfully', async () => {
      const mockHealth = {
        status: 'healthy',
        services: [],
        containers: [],
        features: [],
        lastUpdated: '2023-01-01T00:00:00Z',
      };

      systemHealthService.getSystemHealth.mockResolvedValue(mockHealth);

      await getSystemHealth(req, res);

      expect(systemHealthService.getSystemHealth).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockHealth,
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service unavailable');
      systemHealthService.getSystemHealth.mockRejectedValue(error);

      await getSystemHealth(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve system health status',
      });
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Failed to get system health',
        error,
        userId: 'user-1',
        context: 'getSystemHealth',
      });
    });
  });

  describe('getServiceHealth', () => {
    it('should return service health successfully', async () => {
      const mockServices = [
        {
          id: '1',
          serviceName: 'database',
          status: 'healthy',
          lastCheckAt: new Date(),
        },
      ];

      systemHealthService.getServiceHealth.mockResolvedValue(mockServices);

      await getServiceHealth(req, res);

      expect(systemHealthService.getServiceHealth).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockServices,
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      systemHealthService.getServiceHealth.mockRejectedValue(error);

      await getServiceHealth(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve service health status',
      });
    });
  });

  describe('getContainers', () => {
    it('should return container status successfully', async () => {
      const mockContainers = [
        {
          id: '1',
          name: 'api-container',
          status: 'running',
          image: 'api:latest',
        },
      ];

      systemHealthService.getContainerHealth.mockResolvedValue(mockContainers);

      await getContainers(req, res);

      expect(systemHealthService.getContainerHealth).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockContainers,
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Docker API error');
      systemHealthService.getContainerHealth.mockRejectedValue(error);

      await getContainers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve container status',
      });
    });
  });

  describe('getFeatures', () => {
    it('should return feature flags successfully', async () => {
      const mockFeatures = [
        {
          id: '1',
          name: 'feature-a',
          enabled: true,
          description: 'Test feature',
        },
      ];

      systemHealthService.getFeatureFlags.mockResolvedValue(mockFeatures);

      await getFeatures(req, res);

      expect(systemHealthService.getFeatureFlags).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFeatures,
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      systemHealthService.getFeatureFlags.mockRejectedValue(error);

      await getFeatures(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve feature flags',
      });
    });
  });

  describe('updateFeature', () => {
    it('should update feature flag successfully', async () => {
      req.params.feature = 'test-feature';
      req.body = {
        enabled: true,
        config: { setting: 'value' },
      };

      const mockFeature = {
        id: '1',
        name: 'test-feature',
        enabled: true,
        config: { setting: 'value' },
      };

      systemHealthService.updateFeatureFlag.mockResolvedValue(mockFeature);
      systemHealthService.logSystemEvent.mockResolvedValue({});

      await updateFeature(req, res);

      expect(systemHealthService.updateFeatureFlag).toHaveBeenCalledWith(
        'test-feature',
        true,
        { setting: 'value' }
      );
      expect(systemHealthService.logSystemEvent).toHaveBeenCalledWith(
        'info',
        "Feature flag 'test-feature' enabled",
        'system',
        { feature: 'test-feature', enabled: true, config: { setting: 'value' } },
        'user-1'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFeature,
      });
    });

    it('should validate request body', async () => {
      req.params.feature = 'test-feature';
      req.body = {
        enabled: 'invalid', // Should be boolean
      };

      await updateFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid request data',
        details: expect.any(Array),
      });
    });

    it('should validate feature name', async () => {
      req.params.feature = ''; // Empty feature name
      req.body = { enabled: true };

      await updateFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Feature name is required',
      });
    });

    it('should handle service errors', async () => {
      req.params.feature = 'test-feature';
      req.body = { enabled: true };

      const error = new Error('Update failed');
      systemHealthService.updateFeatureFlag.mockRejectedValue(error);

      await updateFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update feature flag',
      });
    });
  });

  describe('getSystemLogs', () => {
    it('should return system logs successfully', async () => {
      req.query = {
        level: 'info',
        service: 'api',
        limit: '50',
        offset: '0',
      };

      const mockLogs = {
        logs: [
          {
            id: '1',
            level: 'info',
            message: 'Test log',
            service: 'api',
            timestamp: new Date(),
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      };

      systemHealthService.getSystemLogs.mockResolvedValue(mockLogs);

      await getSystemLogs(req, res);

      expect(systemHealthService.getSystemLogs).toHaveBeenCalledWith({
        level: 'info',
        service: 'api',
        limit: 50,
        offset: 0,
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockLogs,
      });
    });

    it('should validate query parameters', async () => {
      req.query = {
        level: 'invalid-level', // Invalid log level
        limit: '2000', // Exceeds maximum
      };

      await getSystemLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid query parameters',
        details: expect.any(Array),
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      systemHealthService.getSystemLogs.mockRejectedValue(error);

      await getSystemLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve system logs',
      });
    });
  });

  describe('getSystemMetrics', () => {
    it('should return system metrics successfully', async () => {
      const mockMetrics = {
        cpu: {
          manufacturer: 'Intel',
          brand: 'Core i7',
          cores: 8,
        },
        memory: {
          total: 16777216000,
          used: 8388608000,
          percentage: 50,
        },
        disk: [],
        load: {
          currentLoad: 25.5,
        },
      };

      systemHealthService.getSystemMetrics.mockResolvedValue(mockMetrics);

      await getSystemMetrics(req, res);

      expect(systemHealthService.getSystemMetrics).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMetrics,
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('System info error');
      systemHealthService.getSystemMetrics.mockRejectedValue(error);

      await getSystemMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve system metrics',
      });
    });
  });

  describe('triggerHealthCheck', () => {
    it('should trigger health check successfully', async () => {
      systemHealthService.performHealthChecks.mockResolvedValue();
      systemHealthService.logSystemEvent.mockResolvedValue({});

      await triggerHealthCheck(req, res);

      expect(systemHealthService.performHealthChecks).toHaveBeenCalled();
      expect(systemHealthService.logSystemEvent).toHaveBeenCalledWith(
        'info',
        'Manual health check triggered',
        'system',
        { triggeredBy: 'testowner' },
        'user-1'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Health check triggered successfully',
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Health check failed');
      systemHealthService.performHealthChecks.mockRejectedValue(error);

      await triggerHealthCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to trigger health check',
      });
    });
  });

  describe('updateContainerStatus', () => {
    it('should update container status successfully', async () => {
      systemHealthService.updateContainerStatus.mockResolvedValue();
      systemHealthService.logSystemEvent.mockResolvedValue({});

      await updateContainerStatus(req, res);

      expect(systemHealthService.updateContainerStatus).toHaveBeenCalled();
      expect(systemHealthService.logSystemEvent).toHaveBeenCalledWith(
        'info',
        'Manual container status update triggered',
        'system',
        { triggeredBy: 'testowner' },
        'user-1'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Container status update triggered successfully',
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Container update failed');
      systemHealthService.updateContainerStatus.mockRejectedValue(error);

      await updateContainerStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update container status',
      });
    });
  });
});
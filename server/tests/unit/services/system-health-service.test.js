// Mock dependencies first
jest.mock('dockerode');
jest.mock('systeminformation');
jest.mock('node-schedule');
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock Prisma Client
const mockPrisma = {
  systemHealth: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  container: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  featureFlag: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  systemLog: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const Docker = require('dockerode');
const si = require('systeminformation');
const schedule = require('node-schedule');
const { PrismaClient } = require('@prisma/client');
const logger = require('../../../src/utils/logger');

// Mock implementations
const mockDockerContainer = {
  inspect: jest.fn(),
  stats: jest.fn(),
};

const mockDocker = {
  listContainers: jest.fn(),
  getContainer: jest.fn(() => mockDockerContainer),
};

const mockScheduleJob = jest.fn();
const mockJobCancel = jest.fn();

Docker.mockImplementation(() => mockDocker);
schedule.scheduleJob.mockImplementation(mockScheduleJob);
logger.createLogger = jest.fn(() => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Import the service after mocking
const SystemHealthService = require('../../../src/services/system-health-service');

describe('SystemHealthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset scheduled jobs mock
    mockScheduleJob.mockReturnValue({
      cancel: mockJobCancel,
    });
  });

  describe('getSystemHealth', () => {
    it('should return complete system health status', async () => {
      const mockServices = [
        {
          id: '1',
          serviceName: 'database',
          status: 'healthy',
          lastCheckAt: new Date(),
          responseTime: 10,
        },
      ];

      const mockContainers = [
        {
          id: '1',
          name: 'api-container',
          status: 'running',
          image: 'api:latest',
        },
      ];

      const mockFeatures = [
        {
          id: '1',
          name: 'feature-a',
          enabled: true,
        },
      ];

      mockPrisma.systemHealth.findMany.mockResolvedValue(mockServices);
      mockPrisma.container.findMany.mockResolvedValue(mockContainers);
      mockPrisma.featureFlag.findMany.mockResolvedValue(mockFeatures);

      const result = await SystemHealthService.getSystemHealth();

      expect(result).toEqual({
        status: 'healthy',
        services: mockServices,
        containers: mockContainers,
        features: mockFeatures,
        lastUpdated: expect.any(String),
      });

      expect(mockPrisma.systemHealth.findMany).toHaveBeenCalledWith({
        orderBy: { serviceName: 'asc' },
      });
      expect(mockPrisma.container.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(mockPrisma.featureFlag.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.systemHealth.findMany.mockRejectedValue(error);

      await expect(SystemHealthService.getSystemHealth()).rejects.toThrow(error);
    });
  });

  describe('getServiceHealth', () => {
    it('should return service health status', async () => {
      const mockServices = [
        {
          id: '1',
          serviceName: 'database',
          status: 'healthy',
          lastCheckAt: new Date(),
        },
      ];

      mockPrisma.systemHealth.findMany.mockResolvedValue(mockServices);

      const result = await SystemHealthService.getServiceHealth();

      expect(result).toEqual(mockServices);
      expect(mockPrisma.systemHealth.findMany).toHaveBeenCalledWith({
        orderBy: { serviceName: 'asc' },
      });
    });
  });

  describe('getContainerHealth', () => {
    it('should return container health status', async () => {
      const mockContainers = [
        {
          id: '1',
          name: 'api-container',
          status: 'running',
          image: 'api:latest',
        },
      ];

      mockPrisma.container.findMany.mockResolvedValue(mockContainers);

      const result = await SystemHealthService.getContainerHealth();

      expect(result).toEqual(mockContainers);
      expect(mockPrisma.container.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getFeatureFlags', () => {
    it('should return feature flags', async () => {
      const mockFeatures = [
        {
          id: '1',
          name: 'feature-a',
          enabled: true,
          description: 'Test feature',
        },
      ];

      mockPrisma.featureFlag.findMany.mockResolvedValue(mockFeatures);

      const result = await SystemHealthService.getFeatureFlags();

      expect(result).toEqual(mockFeatures);
      expect(mockPrisma.featureFlag.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('updateFeatureFlag', () => {
    it('should update feature flag successfully', async () => {
      const mockFeature = {
        id: '1',
        name: 'test-feature',
        enabled: true,
        config: { setting: 'value' },
      };

      mockPrisma.featureFlag.upsert.mockResolvedValue(mockFeature);
      mockPrisma.systemLog.create.mockResolvedValue({});

      const result = await SystemHealthService.updateFeatureFlag(
        'test-feature',
        true,
        { setting: 'value' }
      );

      expect(result).toEqual(mockFeature);
      expect(mockPrisma.featureFlag.upsert).toHaveBeenCalledWith({
        where: { name: 'test-feature' },
        update: {
          enabled: true,
          config: { setting: 'value' },
          updatedAt: expect.any(Date),
        },
        create: {
          name: 'test-feature',
          enabled: true,
          config: { setting: 'value' },
        },
      });
    });
  });

  describe('getSystemLogs', () => {
    it('should return system logs with pagination', async () => {
      const mockLogs = [
        {
          id: '1',
          level: 'info',
          message: 'Test log',
          service: 'api',
          timestamp: new Date(),
          user: { id: '1', username: 'test' },
        },
      ];

      mockPrisma.systemLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.systemLog.count.mockResolvedValue(1);

      const filters = {
        level: 'info',
        service: 'api',
        limit: 50,
        offset: 0,
      };

      const result = await SystemHealthService.getSystemLogs(filters);

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
        limit: 50,
        offset: 0,
      });

      expect(mockPrisma.systemLog.findMany).toHaveBeenCalledWith({
        where: {
          level: 'info',
          service: 'api',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should handle date range filters', async () => {
      const mockLogs = [];
      mockPrisma.systemLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.systemLog.count.mockResolvedValue(0);

      const filters = {
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-12-31T23:59:59Z',
      };

      await SystemHealthService.getSystemLogs(filters);

      expect(mockPrisma.systemLog.findMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: new Date('2023-01-01T00:00:00Z'),
            lte: new Date('2023-12-31T23:59:59Z'),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
        skip: 0,
      });
    });
  });

  describe('logSystemEvent', () => {
    it('should create system log entry', async () => {
      const mockLog = {
        id: '1',
        level: 'info',
        message: 'Test event',
        service: 'system',
        metadata: { test: true },
        userId: 'user-1',
      };

      mockPrisma.systemLog.create.mockResolvedValue(mockLog);

      const result = await SystemHealthService.logSystemEvent(
        'info',
        'Test event',
        'system',
        { test: true },
        'user-1'
      );

      expect(result).toEqual(mockLog);
      expect(mockPrisma.systemLog.create).toHaveBeenCalledWith({
        data: {
          level: 'info',
          message: 'Test event',
          service: 'system',
          metadata: { test: true },
          userId: 'user-1',
        },
      });
    });
  });

  describe('updateServiceHealth', () => {
    it('should update existing service health', async () => {
      const existingService = {
        serviceName: 'database',
        errorCount: 0,
      };

      const healthData = {
        status: 'healthy',
        responseTime: 10,
        errorCount: 0,
        lastError: null,
        metadata: { connection: 'active' },
      };

      mockPrisma.systemHealth.findUnique.mockResolvedValue(existingService);
      mockPrisma.systemHealth.upsert.mockResolvedValue({});

      await SystemHealthService.updateServiceHealth('database', healthData);

      expect(mockPrisma.systemHealth.upsert).toHaveBeenCalledWith({
        where: { serviceName: 'database' },
        update: {
          status: 'healthy',
          lastCheckAt: expect.any(Date),
          responseTime: 10,
          errorCount: 0,
          lastError: null,
          metadata: { connection: 'active' },
          updatedAt: expect.any(Date),
        },
        create: {
          serviceName: 'database',
          status: 'healthy',
          lastCheckAt: expect.any(Date),
          responseTime: 10,
          errorCount: 0,
          lastError: null,
          metadata: { connection: 'active' },
        },
      });
    });

    it('should increment error count for unhealthy service', async () => {
      const existingService = {
        serviceName: 'database',
        errorCount: 2,
      };

      const healthData = {
        status: 'unhealthy',
        responseTime: null,
        errorCount: 1,
        lastError: 'Connection timeout',
        metadata: null,
      };

      mockPrisma.systemHealth.findUnique.mockResolvedValue(existingService);
      mockPrisma.systemHealth.upsert.mockResolvedValue({});

      await SystemHealthService.updateServiceHealth('database', healthData);

      expect(mockPrisma.systemHealth.upsert).toHaveBeenCalledWith({
        where: { serviceName: 'database' },
        update: {
          status: 'unhealthy',
          lastCheckAt: expect.any(Date),
          responseTime: null,
          errorCount: 3, // Incremented from existing 2
          lastError: 'Connection timeout',
          metadata: null,
          updatedAt: expect.any(Date),
        },
        create: {
          serviceName: 'database',
          status: 'unhealthy',
          lastCheckAt: expect.any(Date),
          responseTime: null,
          errorCount: 3,
          lastError: 'Connection timeout',
          metadata: null,
        },
      });
    });
  });

  describe('calculateOverallStatus', () => {
    it('should return healthy when all services are healthy', () => {
      const services = [
        { status: 'healthy' },
        { status: 'healthy' },
      ];

      const result = SystemHealthService.calculateOverallStatus(services);
      expect(result).toBe('healthy');
    });

    it('should return degraded when some services are degraded', () => {
      const services = [
        { status: 'healthy' },
        { status: 'degraded' },
      ];

      const result = SystemHealthService.calculateOverallStatus(services);
      expect(result).toBe('degraded');
    });

    it('should return unhealthy when any service is unhealthy', () => {
      const services = [
        { status: 'healthy' },
        { status: 'unhealthy' },
      ];

      const result = SystemHealthService.calculateOverallStatus(services);
      expect(result).toBe('unhealthy');
    });

    it('should return unknown for empty services array', () => {
      const services = [];

      const result = SystemHealthService.calculateOverallStatus(services);
      expect(result).toBe('unknown');
    });
  });

  describe('mapDockerStateToStatus', () => {
    it('should map Docker states correctly', () => {
      expect(SystemHealthService.mapDockerStateToStatus('running')).toBe('running');
      expect(SystemHealthService.mapDockerStateToStatus('exited')).toBe('exited');
      expect(SystemHealthService.mapDockerStateToStatus('restarting')).toBe('restarting');
      expect(SystemHealthService.mapDockerStateToStatus('paused')).toBe('paused');
      expect(SystemHealthService.mapDockerStateToStatus('dead')).toBe('dead');
      expect(SystemHealthService.mapDockerStateToStatus('unknown')).toBe('stopped');
    });
  });

  describe('calculateCPUUsage', () => {
    it('should calculate CPU usage percentage correctly', () => {
      const stats = {
        cpu_stats: {
          cpu_usage: { total_usage: 1000000 },
          system_cpu_usage: 10000000,
          online_cpus: 2,
        },
        precpu_stats: {
          cpu_usage: { total_usage: 900000 },
          system_cpu_usage: 9000000,
        },
      };

      const result = SystemHealthService.calculateCPUUsage(stats);
      expect(result).toBeCloseTo(20, 1); // (100000/1000000) * 2 * 100 = 20%
    });

    it('should return 0 for invalid stats', () => {
      const stats = {
        cpu_stats: {
          cpu_usage: { total_usage: 1000000 },
          system_cpu_usage: 10000000,
          online_cpus: 2,
        },
        precpu_stats: {
          cpu_usage: { total_usage: 1000000 }, // Same as current, no delta
          system_cpu_usage: 10000000,
        },
      };

      const result = SystemHealthService.calculateCPUUsage(stats);
      expect(result).toBe(0);
    });
  });

  describe('getSystemMetrics', () => {
    it('should return system metrics', async () => {
      const mockCpu = {
        manufacturer: 'Intel',
        brand: 'Core i7',
        cores: 8,
        physicalCores: 4,
        speed: 3.2,
      };

      const mockMemory = {
        total: 16777216000,
        free: 8388608000,
        used: 8388608000,
        active: 4194304000,
        available: 12582912000,
      };

      const mockDisk = [
        {
          fs: '/dev/disk1',
          type: 'APFS',
          size: 500000000000,
          used: 250000000000,
          available: 250000000000,
          use: 50,
          mount: '/',
        },
      ];

      const mockLoad = {
        currentLoad: 25.5,
        avgLoad: 1.5,
        cpus: [
          { load: 30.2 },
          { load: 20.8 },
        ],
      };

      si.cpu.mockResolvedValue(mockCpu);
      si.mem.mockResolvedValue(mockMemory);
      si.fsSize.mockResolvedValue(mockDisk);
      si.currentLoad.mockResolvedValue(mockLoad);

      const result = await SystemHealthService.getSystemMetrics();

      expect(result).toEqual({
        cpu: mockCpu,
        memory: {
          ...mockMemory,
          percentage: 50, // (8388608000 / 16777216000) * 100
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
      });
    });
  });
});
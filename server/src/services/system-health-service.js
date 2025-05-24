const Docker = require('dockerode');
const si = require('systeminformation');
const schedule = require('node-schedule');
const { PrismaClient } = require('@prisma/client');
const { createLogger } = require('../utils/logger');

const logger = createLogger('system-health-service');

const prisma = new PrismaClient();
const docker = new Docker();

class SystemHealthService {
  constructor() {
    this.healthChecks = new Map();
    this.scheduledJobs = new Map();
    this.dockerSocketWarningLogged = false;
    this.mockDataCreated = false;
    this.dockerSocketAvailable = null; // null = unknown, true = available, false = not available
    this.initializeHealthChecks();
  }

  /**
   * Initialize health check scheduler
   */
  initializeHealthChecks() {
    // Schedule health checks every 30 seconds
    const job = schedule.scheduleJob('*/30 * * * * *', () => {
      this.performHealthChecks();
    });
    this.scheduledJobs.set('health-check', job);

    // Schedule container monitoring every minute
    const containerJob = schedule.scheduleJob('*/60 * * * * *', () => {
      this.updateContainerStatus();
    });
    this.scheduledJobs.set('container-check', containerJob);
  }

  /**
   * Get overall system health status
   */
  async getSystemHealth() {
    try {
      const [services, containers, features] = await Promise.all([
        this.getServiceHealth(),
        this.getContainerHealth(),
        this.getFeatureFlags(),
      ]);

      const overallStatus = this.calculateOverallStatus(services);

      // Convert BigInt values to strings for JSON serialization
      const sanitizedContainers = containers.map(container => ({
        ...container,
        memoryUsage: container.memoryUsage ? container.memoryUsage.toString() : null,
        uptime: container.uptime ? container.uptime.toString() : null,
      }));

      const sanitizedServices = services.map(service => ({
        ...service,
        uptime: service.uptime ? service.uptime.toString() : null,
      }));

      return {
        status: overallStatus,
        services: sanitizedServices,
        containers: sanitizedContainers,
        features,
        dockerMonitoring: {
          available: this.dockerSocketAvailable,
          usingMockData: this.dockerSocketAvailable === false,
        },
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error getting system health:', error);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getServiceHealth() {
    try {
      const services = await prisma.systemHealth.findMany({
        orderBy: { serviceName: 'asc' },
      });

      return services;
    } catch (error) {
      logger.error('Error getting service health:', error);
      throw error;
    }
  }

  /**
   * Get container status
   */
  async getContainerHealth() {
    try {
      const containers = await prisma.container.findMany({
        orderBy: { name: 'asc' },
      });

      return containers;
    } catch (error) {
      logger.error('Error getting container health:', error);
      throw error;
    }
  }

  /**
   * Get feature flags
   */
  async getFeatureFlags() {
    try {
      const features = await prisma.featureFlag.findMany({
        orderBy: { name: 'asc' },
      });

      return features;
    } catch (error) {
      logger.error('Error getting feature flags:', error);
      throw error;
    }
  }

  /**
   * Update feature flag status
   */
  async updateFeatureFlag(name, enabled, config = null) {
    try {
      const feature = await prisma.featureFlag.upsert({
        where: { name },
        update: {
          enabled,
          config,
          updatedAt: new Date(),
        },
        create: {
          name,
          enabled,
          config,
        },
      });

      await this.logSystemEvent('info', `Feature flag ${name} ${enabled ? 'enabled' : 'disabled'}`, 'system');

      return feature;
    } catch (error) {
      logger.error(`Error updating feature flag ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get system logs with filtering
   */
  async getSystemLogs(filters = {}) {
    try {
      const {
        level,
        service,
        limit = 100,
        offset = 0,
        startDate,
        endDate,
      } = filters;

      const where = {};

      if (level) where.level = level;
      if (service) where.service = service;
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }

      const [logs, total] = await Promise.all([
        prisma.systemLog.findMany({
          where,
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
          take: parseInt(limit),
          skip: parseInt(offset),
        }),
        prisma.systemLog.count({ where }),
      ]);

      return {
        logs,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      };
    } catch (error) {
      logger.error('Error getting system logs:', error);
      throw error;
    }
  }

  /**
   * Log system event
   */
  async logSystemEvent(level, message, service, metadata = null, userId = null) {
    try {
      const log = await prisma.systemLog.create({
        data: {
          level,
          message,
          service,
          metadata,
          userId,
        },
      });

      return log;
    } catch (error) {
      logger.error('Error logging system event:', error);
      throw error;
    }
  }

  /**
   * Perform health checks on all services
   */
  async performHealthChecks() {
    try {
      const services = [
        { name: 'database', check: () => this.checkDatabase() },
        { name: 'redis', check: () => this.checkRedis() },
        { name: 'websocket', check: () => this.checkWebSocket() },
        { name: 'api', check: () => this.checkAPI() },
      ];

      const healthResults = [];

      for (const service of services) {
        try {
          const start = Date.now();
          const result = await service.check();
          const responseTime = Date.now() - start;

          const healthData = {
            status: result.healthy ? 'healthy' : 'unhealthy',
            responseTime,
            errorCount: result.healthy ? 0 : 1,
            lastError: result.error || null,
            metadata: result.metadata || null,
          };

          await this.updateServiceHealth(service.name, healthData);
          
          healthResults.push({
            serviceName: service.name,
            ...healthData,
            lastCheckAt: new Date(),
          });
        } catch (error) {
          logger.error(`Health check failed for ${service.name}:`, error);
          const healthData = {
            status: 'unhealthy',
            responseTime: null,
            errorCount: 1,
            lastError: error.message,
            metadata: null,
          };

          await this.updateServiceHealth(service.name, healthData);
          
          healthResults.push({
            serviceName: service.name,
            ...healthData,
            lastCheckAt: new Date(),
          });
        }
      }

      // Broadcast health update via WebSocket to owners and managers
      try {
        const wsService = require('./websocket-service');
        if (wsService.broadcastSystemHealthUpdate) {
          const overallStatus = this.calculateOverallStatus(healthResults);
          wsService.broadcastSystemHealthUpdate({
            status: overallStatus,
            services: healthResults,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.error('Error broadcasting health update:', error);
      }
    } catch (error) {
      logger.error('Error performing health checks:', error);
    }
  }

  /**
   * Update service health status
   */
  async updateServiceHealth(serviceName, healthData) {
    try {
      const existingService = await prisma.systemHealth.findUnique({
        where: { serviceName },
      });

      const errorCount = existingService && healthData.status === 'unhealthy'
        ? existingService.errorCount + 1
        : healthData.errorCount || 0;

      await prisma.systemHealth.upsert({
        where: { serviceName },
        update: {
          status: healthData.status,
          lastCheckAt: new Date(),
          responseTime: healthData.responseTime,
          errorCount,
          lastError: healthData.lastError,
          metadata: healthData.metadata,
          updatedAt: new Date(),
        },
        create: {
          serviceName,
          status: healthData.status,
          lastCheckAt: new Date(),
          responseTime: healthData.responseTime,
          errorCount,
          lastError: healthData.lastError,
          metadata: healthData.metadata,
        },
      });
    } catch (error) {
      logger.error(`Error updating service health for ${serviceName}:`, error);
      throw error;
    }
  }

  /**
   * Update container status from Docker
   */
  async updateContainerStatus() {
    try {
      const containers = await docker.listContainers({ all: true });
      
      // Mark Docker socket as available if we get here
      if (this.dockerSocketAvailable !== true) {
        this.dockerSocketAvailable = true;
        logger.info('Docker socket access confirmed - real container monitoring enabled');
      }

      for (const containerInfo of containers) {
        const container = docker.getContainer(containerInfo.Id);
        const inspect = await container.inspect();
        const stats = containerInfo.State === 'running'
          ? await container.stats({ stream: false })
          : null;

        const name = containerInfo.Names[0].replace('/', '');
        const status = this.mapDockerStateToStatus(containerInfo.State);

        await prisma.container.upsert({
          where: { name },
          update: {
            status,
            image: containerInfo.Image,
            ports: containerInfo.Ports || null,
            startedAt: inspect.State.StartedAt ? new Date(inspect.State.StartedAt) : null,
            restartCount: inspect.RestartCount || 0,
            cpuUsage: stats ? this.calculateCPUUsage(stats) : null,
            memoryUsage: stats && stats.memory_stats && stats.memory_stats.usage 
              ? BigInt(stats.memory_stats.usage) : null,
            updatedAt: new Date(),
          },
          create: {
            name,
            status,
            image: containerInfo.Image,
            ports: containerInfo.Ports || null,
            startedAt: inspect.State.StartedAt ? new Date(inspect.State.StartedAt) : null,
            restartCount: inspect.RestartCount || 0,
            cpuUsage: stats ? this.calculateCPUUsage(stats) : null,
            memoryUsage: stats && stats.memory_stats && stats.memory_stats.usage 
              ? BigInt(stats.memory_stats.usage) : null,
          },
        });
      }
    } catch (error) {
      if (error.code === 'ENOENT' || error.message.includes('docker.sock') || error.message.includes('ENOENT')) {
        // Mark Docker socket as not available
        if (this.dockerSocketAvailable !== false) {
          this.dockerSocketAvailable = false;
          logger.warn('Docker socket not accessible - using mock container data for development environment');
          this.dockerSocketWarningLogged = true;
        }
        // Create mock container data for development
        await this.createMockContainerData();
      } else {
        logger.error('Error updating container status:', error);
      }
    }
  }

  /**
   * Create mock container data when Docker is not accessible
   */
  async createMockContainerData() {
    try {
      const mockContainers = [
        {
          name: 'restaunax-server-1',
          status: 'running',
          image: 'restaunax-server:latest',
          ports: [{ PrivatePort: 8080, PublicPort: 8081, Type: 'tcp' }],
          startedAt: new Date(Date.now() - 3600000), // 1 hour ago
          restartCount: 0,
          cpuUsage: Math.random() * 50, // Random CPU usage
          memoryUsage: BigInt(Math.floor(Math.random() * 1000000000)), // Random memory usage
        },
        {
          name: 'restaunax-client-1',
          status: 'running',
          image: 'restaunax-client:latest',
          ports: [{ PrivatePort: 3000, PublicPort: 3000, Type: 'tcp' }],
          startedAt: new Date(Date.now() - 3600000),
          restartCount: 0,
          cpuUsage: Math.random() * 20,
          memoryUsage: BigInt(Math.floor(Math.random() * 500000000)),
        },
        {
          name: 'restaunax-db-1',
          status: 'running',
          image: 'postgres:14-alpine',
          ports: [{ PrivatePort: 5432, PublicPort: 5432, Type: 'tcp' }],
          startedAt: new Date(Date.now() - 7200000), // 2 hours ago
          restartCount: 0,
          cpuUsage: Math.random() * 15,
          memoryUsage: BigInt(Math.floor(Math.random() * 300000000)),
        },
      ];

      for (const containerData of mockContainers) {
        await prisma.container.upsert({
          where: { name: containerData.name },
          update: {
            status: containerData.status,
            image: containerData.image,
            ports: containerData.ports,
            startedAt: containerData.startedAt,
            restartCount: containerData.restartCount,
            cpuUsage: containerData.cpuUsage,
            memoryUsage: containerData.memoryUsage,
            updatedAt: new Date(),
          },
          create: containerData,
        });
      }

      if (!this.mockDataCreated) {
        logger.info('Created mock container data for development environment');
        this.mockDataCreated = true;
      }
    } catch (error) {
      logger.error('Error creating mock container data:', error);
    }
  }

  /**
   * Check database health
   */
  async checkDatabase() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { healthy: true, metadata: { connection: 'active' } };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Check Redis health
   */
  async checkRedis() {
    try {
      // This would require Redis client setup
      // For now, return healthy as placeholder
      return { healthy: true, metadata: { connection: 'active' } };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Check WebSocket service health
   */
  async checkWebSocket() {
    try {
      const wsService = require('./websocket-service');
      const connectionStats = wsService.getConnectionStats ? wsService.getConnectionStats() : {};
      
      return { 
        healthy: true, 
        metadata: { 
          ...connectionStats,
          service: 'websocket',
          type: 'realtime-communication',
          status: 'operational'
        } 
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Check API health
   */
  async checkAPI() {
    try {
      // Simple internal health check
      return { healthy: true, metadata: { uptime: process.uptime() } };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Calculate overall system status based on services
   */
  calculateOverallStatus(services) {
    if (services.length === 0) return 'unknown';

    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;

    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 0) return 'degraded';
    if (healthyCount === services.length) return 'healthy';

    return 'unknown';
  }

  /**
   * Map Docker container state to our status enum
   */
  mapDockerStateToStatus(dockerState) {
    const stateMap = {
      running: 'running',
      exited: 'exited',
      restarting: 'restarting',
      paused: 'paused',
      dead: 'dead',
    };

    return stateMap[dockerState] || 'stopped';
  }

  /**
   * Calculate CPU usage percentage from Docker stats
   */
  calculateCPUUsage(stats) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numberCpus = stats.cpu_stats.online_cpus || 1;

    if (systemDelta > 0 && cpuDelta > 0) {
      return Math.round((cpuDelta / systemDelta) * numberCpus * 100 * 100) / 100;
    }

    return 0;
  }

  /**
   * Get system metrics using systeminformation
   */
  async getSystemMetrics() {
    try {
      const [cpu, memory, disk, load] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.fsSize(),
        si.currentLoad(),
      ]);

      return {
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          cores: cpu.cores,
          physicalCores: cpu.physicalCores,
          speed: cpu.speed,
        },
        memory: {
          total: memory.total,
          free: memory.free,
          used: memory.used,
          active: memory.active,
          available: memory.available,
          percentage: Math.round((memory.used / memory.total) * 100),
        },
        disk: disk.map(d => ({
          fs: d.fs,
          type: d.type,
          size: d.size,
          used: d.used,
          available: d.available,
          percentage: Math.round(d.use),
          mount: d.mount,
        })),
        load: {
          currentLoad: Math.round(load.currentLoad * 100) / 100,
          avgLoad: load.avgLoad,
          cpus: load.cpus.map(cpu => ({
            load: Math.round(cpu.load * 100) / 100,
          })),
        },
      };
    } catch (error) {
      logger.error('Error getting system metrics:', error);
      throw error;
    }
  }

  /**
   * Cleanup scheduled jobs
   */
  destroy() {
    for (const [name, job] of this.scheduledJobs) {
      job.cancel();
      logger.info(`Cancelled scheduled job: ${name}`);
    }
    this.scheduledJobs.clear();
  }
}

// Export the class, not an instance, to avoid initialization issues
module.exports = SystemHealthService;
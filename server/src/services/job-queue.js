const Bull = require('bull');
const Redis = require('redis');
const { createLogger } = require('../utils/logger');
const config = require('../config');
const aiService = require('./ai-service');
const { broadcastAIJobUpdate } = require('./websocket-service');
const prisma = require('../db/client');

const logger = createLogger('job-queue');

/**
 * Job Queue Service for AI Processing
 * Handles asynchronous AI job processing with Redis/Bull
 */
class JobQueueService {
  constructor() {
    this.redis = null;
    this.aiQueue = null;
    this.initialized = false;
  }

  /**
   * Initialize the job queue system
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing job queue service...');
      
      // Initialize Redis connection
      this.redis = Redis.createClient({
        url: config.redis.url,
        db: config.redis.db,
      });

      this.redis.on('error', (err) => {
        logger.error('Redis connection error', { error: err.message });
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      // Connect with timeout
      await Promise.race([
        this.redis.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
        )
      ]);

      // Initialize Bull queue
      this.aiQueue = new Bull('AI Processing', config.redis.url, {
        defaultJobOptions: {
          removeOnComplete: 10, // Keep last 10 completed jobs
          removeOnFail: 50, // Keep last 50 failed jobs
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      // Set up job processors
      this.setupJobProcessors();

      this.initialized = true;
      logger.info('Job queue service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize job queue service', { error: error.message });
      throw error;
    }
  }

  /**
   * Setup job processors for different AI job types
   */
  setupJobProcessors() {
    // Demand forecasting processor
    this.aiQueue.process('demand_forecast', 1, async (job) => {
      return this.processDemandForecast(job);
    });

    // Menu optimization processor
    this.aiQueue.process('menu_optimization', 1, async (job) => {
      return this.processMenuOptimization(job);
    });

    // Job event handlers
    this.aiQueue.on('completed', (job, result) => {
      logger.info('Job completed', { jobId: job.id, type: job.data.type });
      this.handleJobCompleted(job, result);
    });

    this.aiQueue.on('failed', (job, err) => {
      logger.error('Job failed', { jobId: job.id, type: job.data.type, error: err.message });
      this.handleJobFailed(job, err);
    });

    this.aiQueue.on('progress', (job, progress) => {
      logger.debug('Job progress', { jobId: job.id, progress });
      this.handleJobProgress(job, progress);
    });

    this.aiQueue.on('stalled', (job) => {
      logger.warn('Job stalled', { jobId: job.id, type: job.data.type });
    });
  }

  /**
   * Add a new AI job to the queue
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} Job information
   */
  async addJob(jobData) {
    if (!this.initialized) {
      await this.initialize();
    }

    const { type, restaurantId, userId, parameters } = jobData;

    try {
      // Create job record in database
      const aiJob = await prisma.aIJob.create({
        data: {
          restaurantId,
          userId,
          type: type.toUpperCase(),
          parameters,
          status: 'pending',
          progress: 0,
        },
      });

      // Add job to Bull queue
      const bullJob = await this.aiQueue.add(type, {
        jobId: aiJob.id,
        type,
        restaurantId,
        userId,
        parameters,
      }, {
        delay: 1000, // 1 second delay to allow for database consistency
        priority: this.getJobPriority(type),
      });

      // Update database with Bull job ID
      await prisma.aIJob.update({
        where: { id: aiJob.id },
        data: { 
          startedAt: new Date(),
          estimatedCompletion: this.calculateEstimatedCompletion(type),
        },
      });

      logger.info('AI job added to queue', {
        jobId: aiJob.id,
        bullJobId: bullJob.id,
        type,
        restaurantId,
      });

      return {
        id: aiJob.id,
        bullJobId: bullJob.id,
        status: 'pending',
        estimatedCompletion: this.calculateEstimatedCompletion(type),
      };
    } catch (error) {
      logger.error('Failed to add job to queue', { error: error.message, type, restaurantId });
      throw error;
    }
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job status information
   */
  async getJobStatus(jobId) {
    try {
      const aiJob = await prisma.aIJob.findUnique({
        where: { id: jobId },
        include: {
          insight: true,
        },
      });

      if (!aiJob) {
        throw new Error('Job not found');
      }

      return {
        id: aiJob.id,
        type: aiJob.type.toLowerCase(),
        status: aiJob.status.toLowerCase(),
        progress: aiJob.progress,
        estimatedCompletion: aiJob.estimatedCompletion,
        startedAt: aiJob.startedAt,
        completedAt: aiJob.completedAt,
        error: aiJob.error,
        result: aiJob.result,
        insight: aiJob.insight,
      };
    } catch (error) {
      logger.error('Failed to get job status', { error: error.message, jobId });
      throw error;
    }
  }

  /**
   * Process demand forecast job
   */
  async processDemandForecast(job) {
    const { jobId, restaurantId, parameters } = job.data;
    
    try {
      // Update job status to running
      await this.updateJobStatus(jobId, 'running', 10);
      
      // Get historical data for forecasting
      job.progress(20);
      const historicalData = await this.getHistoricalOrderData(restaurantId, parameters);
      
      // Generate forecast using AI service
      job.progress(50);
      const forecastResult = await aiService.generateDemandForecast({
        restaurantId,
        startDate: new Date(parameters.startDate),
        endDate: new Date(parameters.endDate),
        historicalData,
      });
      
      // Save result and create insight
      job.progress(80);
      await this.saveJobResult(jobId, forecastResult);
      
      job.progress(100);
      return forecastResult;
    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', null, error.message);
      throw error;
    }
  }

  /**
   * Process menu optimization job
   */
  async processMenuOptimization(job) {
    const { jobId, restaurantId, parameters } = job.data;
    
    try {
      // Update job status to running
      await this.updateJobStatus(jobId, 'running', 10);
      
      // Get menu and order data
      job.progress(20);
      const menuData = await this.getMenuData(restaurantId);
      const orderHistory = await this.getOrderHistoryData(restaurantId, parameters);
      
      // Generate optimization using AI service
      job.progress(50);
      const optimizationResult = await aiService.generateMenuOptimization({
        restaurantId,
        menuItems: menuData,
        orderHistory,
      });
      
      // Save result and create insight
      job.progress(80);
      await this.saveJobResult(jobId, optimizationResult);
      
      job.progress(100);
      return optimizationResult;
    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', null, error.message);
      throw error;
    }
  }

  /**
   * Update job status in database
   */
  async updateJobStatus(jobId, status, progress, error = null) {
    const updateData = {
      status: status.toUpperCase(),
    };

    if (progress !== null && progress !== undefined) {
      updateData.progress = progress;
    }

    if (error) {
      updateData.error = error;
    }

    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    await prisma.aIJob.update({
      where: { id: jobId },
      data: updateData,
    });

    // Broadcast update via WebSocket
    const updatedJob = await prisma.aIJob.findUnique({
      where: { id: jobId },
      include: { restaurant: true, user: true },
    });

    if (updatedJob) {
      broadcastAIJobUpdate(updatedJob.restaurantId, {
        jobId: updatedJob.id,
        type: updatedJob.type.toLowerCase(),
        status: updatedJob.status.toLowerCase(),
        progress: updatedJob.progress,
        userId: updatedJob.userId,
      });
    }
  }

  /**
   * Save job result and create insight
   */
  async saveJobResult(jobId, result) {
    // Update job with result
    await prisma.aIJob.update({
      where: { id: jobId },
      data: {
        result,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Create AI insight record
    const job = await prisma.aIJob.findUnique({
      where: { id: jobId },
    });

    await prisma.aIInsight.create({
      data: {
        jobId,
        restaurantId: job.restaurantId,
        type: job.type,
        title: this.generateInsightTitle(job.type, result),
        summary: this.generateInsightSummary(result),
        data: result.data,
        confidence: result.confidence,
        validUntil: this.calculateInsightExpiry(job.type),
      },
    });
  }

  /**
   * Job event handlers
   */
  async handleJobCompleted(job, result) {
    // Job completion is handled in the processor
  }

  async handleJobFailed(job, err) {
    const { jobId } = job.data;
    await this.updateJobStatus(jobId, 'failed', null, err.message);
  }

  async handleJobProgress(job, progress) {
    const { jobId } = job.data;
    await this.updateJobStatus(jobId, 'running', progress);
  }

  /**
   * Helper methods
   */
  getJobPriority(type) {
    const priorities = {
      demand_forecast: 5,
      menu_optimization: 3,
      customer_segmentation: 1,
    };
    return priorities[type] || 1;
  }

  calculateEstimatedCompletion(type) {
    const durations = {
      demand_forecast: 120000, // 2 minutes
      menu_optimization: 180000, // 3 minutes
      customer_segmentation: 240000, // 4 minutes
    };
    
    const duration = durations[type] || 120000;
    return new Date(Date.now() + duration);
  }

  generateInsightTitle(type, result) {
    const titles = {
      DEMAND_FORECAST: 'Demand Forecast Analysis',
      MENU_OPTIMIZATION: 'Menu Optimization Recommendations',
      CUSTOMER_SEGMENTATION: 'Customer Segmentation Analysis',
    };
    return titles[type] || 'AI Insight';
  }

  generateInsightSummary(result) {
    if (result.data.insights && result.data.insights.length > 0) {
      return result.data.insights[0];
    }
    return 'AI analysis completed successfully';
  }

  calculateInsightExpiry(type) {
    const expiries = {
      DEMAND_FORECAST: 7, // 7 days
      MENU_OPTIMIZATION: 30, // 30 days
      CUSTOMER_SEGMENTATION: 14, // 14 days
    };
    
    const days = expiries[type] || 7;
    return new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
  }

  /**
   * Data retrieval methods
   */
  async getHistoricalOrderData(restaurantId, parameters) {
    const startDate = new Date(parameters.lookbackDays ? Date.now() - (parameters.lookbackDays * 24 * 60 * 60 * 1000) : parameters.dataStartDate);
    const endDate = new Date(parameters.dataEndDate || Date.now());

    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return orders.map(order => ({
      date: order.createdAt.toISOString(),
      hour: order.createdAt.getHours(),
      dayOfWeek: order.createdAt.getDay(),
      orderCount: 1,
      revenue: order.total,
      itemCount: order.items.length,
      type: order.orderType,
      status: order.status,
    }));
  }

  async getMenuData(restaurantId) {
    return await prisma.menuItem.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
      include: {
        menuCategory: true,
        itemMetrics: {
          where: {
            date: {
              gte: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)), // Last 30 days
            },
          },
        },
      },
    });
  }

  async getOrderHistoryData(restaurantId, parameters) {
    const startDate = new Date(parameters.lookbackDays ? Date.now() - (parameters.lookbackDays * 24 * 60 * 60 * 1000) : parameters.dataStartDate);
    
    return await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1000, // Limit to avoid memory issues
    });
  }

  /**
   * Cleanup method
   */
  async cleanup() {
    if (this.aiQueue) {
      await this.aiQueue.close();
    }
    if (this.redis) {
      await this.redis.disconnect();
    }
  }
}

// Export singleton instance
module.exports = new JobQueueService();
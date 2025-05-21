const request = require('supertest');
const app = require('../../src/app');
const { PrismaClient } = require('@prisma/client');
const { createTestToken } = require('../utils/auth');

// Mock Prisma client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    order: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    dailyMetric: {
      findMany: jest.fn()
    },
    hourlyMetric: {
      findMany: jest.fn()
    },
    itemMetric: {
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

const prisma = new PrismaClient();

describe('Report Routes', () => {
  let ownerToken, managerToken, staffToken;

  beforeEach(() => {
    // Create valid auth tokens for each test
    ownerToken = createTestToken({
      id: 'user_1',
      role: 'owner',
      restaurantId: 'rest_1',
    });
    
    managerToken = createTestToken({
      id: 'user_2',
      role: 'manager',
      restaurantId: 'rest_1',
    });
    
    staffToken = createTestToken({
      id: 'user_3',
      role: 'wait_staff',
      restaurantId: 'rest_1',
    });

    // Mock data
    const mockOrders = [
      {
        id: 'order_1',
        orderNumber: 'R1-20250520-001',
        customerName: 'John Doe',
        orderType: 'delivery',
        status: 'delivered',
        total: 42.50,
        createdAt: new Date('2025-05-20T12:00:00Z'),
        updatedAt: new Date('2025-05-20T12:30:00Z')
      }
    ];

    const mockDailyMetrics = [
      {
        id: 'daily_1',
        restaurantId: 'rest_1',
        date: new Date('2025-05-20'),
        totalOrders: 10,
        totalRevenue: 425.50,
        averageOrderValue: 42.55,
        averagePrepTime: 23.5,
      }
    ];

    const mockHourlyMetrics = [
      {
        id: 'hourly_1',
        restaurantId: 'rest_1',
        date: new Date('2025-05-20'),
        hour: 12,
        orderCount: 5,
        revenue: 215.75
      }
    ];

    const mockItemMetrics = [
      {
        id: 'item_metric_1',
        restaurantId: 'rest_1',
        menuItemId: 'menu_1',
        date: new Date('2025-05-20'),
        quantity: 12,
        revenue: 191.88,
        averagePrepTime: 15.2
      }
    ];

    // Set up the mock responses
    prisma.order.findMany.mockResolvedValue(mockOrders);
    prisma.order.count.mockResolvedValue(mockOrders.length);
    prisma.dailyMetric.findMany.mockResolvedValue(mockDailyMetrics);
    prisma.hourlyMetric.findMany.mockResolvedValue(mockHourlyMetrics);
    prisma.itemMetric.findMany.mockResolvedValue(mockItemMetrics);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/reports/orders', () => {
    test('should return orders report when authenticated as owner', async () => {
      // Execute
      const response = await request(app)
        .get('/api/reports/orders')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Verify
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          orders: expect.any(Array),
          totalOrders: expect.any(Number),
          totalRevenue: expect.any(Number)
        })
      });
    });

    test('should return orders report when authenticated as manager', async () => {
      // Execute
      const response = await request(app)
        .get('/api/reports/orders')
        .set('Authorization', `Bearer ${managerToken}`);

      // Verify
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          orders: expect.any(Array),
          totalOrders: expect.any(Number),
          totalRevenue: expect.any(Number)
        })
      });
    });

    test('should return 403 when authenticated as wait staff', async () => {
      // Execute
      const response = await request(app)
        .get('/api/reports/orders')
        .set('Authorization', `Bearer ${staffToken}`);

      // Verify
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Only managers and owners can access reports'
      });
    });

    test('should return 401 when not authenticated', async () => {
      // Execute
      const response = await request(app).get('/api/reports/orders');

      // Verify
      expect(response.status).toBe(401);
    });

    test('should filter orders by date range', async () => {
      // Execute
      const response = await request(app)
        .get('/api/reports/orders?startDate=2025-05-01&endDate=2025-05-31')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Verify
      expect(response.status).toBe(200);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date)
            })
          })
        })
      );
    });
  });

  describe('GET /api/reports/orders/download', () => {
    test('should return CSV file when format is csv', async () => {
      // Execute
      const response = await request(app)
        .get('/api/reports/orders/download?format=csv')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Verify
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="orders_report_rest_1/);
    });

    test('should return PDF file when format is pdf', async () => {
      // Execute
      const response = await request(app)
        .get('/api/reports/orders/download?format=pdf')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Verify
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="orders_report_rest_1/);
    });

    test('should return 400 for invalid format', async () => {
      // Execute
      const response = await request(app)
        .get('/api/reports/orders/download?format=invalid')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Verify
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid report format')
      });
    });

    test('should return 403 when authenticated as wait staff', async () => {
      // Execute
      const response = await request(app)
        .get('/api/reports/orders/download?format=csv')
        .set('Authorization', `Bearer ${staffToken}`);

      // Verify
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/dashboard/metrics', () => {
    test('should return dashboard metrics when authenticated as owner', async () => {
      // Execute
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Verify
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          dailyRevenue: expect.any(Object),
          orderMetrics: expect.any(Object),
          hourlyData: expect.any(Array),
          itemPerformance: expect.any(Array),
          operationalStatus: expect.any(Object)
        })
      });
    });

    test('should return dashboard metrics when authenticated as manager', async () => {
      // Execute
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${managerToken}`);

      // Verify
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          dailyRevenue: expect.any(Object),
          orderMetrics: expect.any(Object),
          hourlyData: expect.any(Array),
          itemPerformance: expect.any(Array),
          operationalStatus: expect.any(Object)
        })
      });
    });

    test('should return 403 when authenticated as wait staff', async () => {
      // Execute
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${staffToken}`);

      // Verify
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Only managers and owners can access dashboard metrics'
      });
    });

    test('should return 401 when not authenticated', async () => {
      // Execute
      const response = await request(app).get('/api/dashboard/metrics');

      // Verify
      expect(response.status).toBe(401);
    });
  });
});
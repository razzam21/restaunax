const { 
  getOrdersReport, 
  getDashboardMetrics, 
  generateOrdersReportData,
  updateMetricsForOrder
} = require('../../../src/services/report-service');
const { PrismaClient } = require('@prisma/client');

// Mock Prisma client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    order: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    dailyMetric: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn()
    },
    hourlyMetric: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn()
    },
    itemMetric: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn()
    },
    menuItem: {
      findMany: jest.fn()
    }
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

const prisma = new PrismaClient();

describe('Report Service', () => {
  // Sample test data
  const mockRestaurantId = 'rest_1';
  const mockOrders = [
    {
      id: 'order_1',
      orderNumber: 'R1-20250520-001',
      customerName: 'John Doe',
      orderType: 'delivery',
      status: 'delivered',
      total: 42.50,
      createdAt: new Date('2025-05-20T12:00:00Z'),
      updatedAt: new Date('2025-05-20T12:30:00Z'),
      items: [
        { id: 'item_1', name: 'Pizza', quantity: 2, price: 15.99 },
        { id: 'item_2', name: 'Salad', quantity: 1, price: 8.99 }
      ]
    },
    {
      id: 'order_2',
      orderNumber: 'R1-20250520-002',
      customerName: 'Jane Smith',
      orderType: 'pickup',
      status: 'delivered',
      total: 35.99,
      createdAt: new Date('2025-05-20T13:00:00Z'),
      updatedAt: new Date('2025-05-20T13:25:00Z'),
      items: [
        { id: 'item_3', name: 'Burger', quantity: 2, price: 12.99 },
        { id: 'item_4', name: 'Fries', quantity: 1, price: 4.99 }
      ]
    }
  ];

  const mockDailyMetrics = [
    {
      id: 'daily_1',
      restaurantId: mockRestaurantId,
      date: new Date('2025-05-20'),
      totalOrders: 10,
      totalRevenue: 425.50,
      averageOrderValue: 42.55,
      averagePrepTime: 23.5,
    },
    {
      id: 'daily_2',
      restaurantId: mockRestaurantId,
      date: new Date('2025-05-19'),
      totalOrders: 8,
      totalRevenue: 356.80,
      averageOrderValue: 44.60,
      averagePrepTime: 21.2,
    }
  ];

  const mockHourlyMetrics = [
    {
      id: 'hourly_1',
      restaurantId: mockRestaurantId,
      date: new Date('2025-05-20'),
      hour: 12,
      orderCount: 5,
      revenue: 215.75
    },
    {
      id: 'hourly_2',
      restaurantId: mockRestaurantId,
      date: new Date('2025-05-20'),
      hour: 13,
      orderCount: 5,
      revenue: 209.75
    }
  ];

  const mockItemMetrics = [
    {
      id: 'item_metric_1',
      restaurantId: mockRestaurantId,
      menuItemId: 'menu_1',
      date: new Date('2025-05-20'),
      quantity: 12,
      revenue: 191.88,
      averagePrepTime: 15.2
    },
    {
      id: 'item_metric_2',
      restaurantId: mockRestaurantId,
      menuItemId: 'menu_2',
      date: new Date('2025-05-20'),
      quantity: 8,
      revenue: 71.92,
      averagePrepTime: 8.5
    }
  ];

  const mockMenuItems = [
    {
      id: 'menu_1',
      name: 'Pizza',
      price: 15.99,
      category: 'Main'
    },
    {
      id: 'menu_2',
      name: 'Salad',
      price: 8.99,
      category: 'Side'
    }
  ];

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrdersReport', () => {
    test('should return orders report with date filtering', async () => {
      // Setup
      const startDate = '2025-05-01';
      const endDate = '2025-05-31';
      prisma.order.findMany.mockResolvedValue(mockOrders);
      prisma.order.count.mockResolvedValue(mockOrders.length);

      // Execute
      const result = await getOrdersReport(mockRestaurantId, { startDate, endDate });

      // Verify
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          restaurantId: mockRestaurantId,
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date)
          }
        },
        include: {
          items: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      expect(result).toEqual({
        orders: mockOrders,
        totalOrders: mockOrders.length,
        totalRevenue: 78.49, // Sum of order totals
        ordersByStatus: expect.any(Object),
        ordersByType: expect.any(Object),
        dateRange: {
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        }
      });
    });

    test('should handle empty results', async () => {
      // Setup
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      // Execute
      const result = await getOrdersReport(mockRestaurantId, {});

      // Verify
      expect(result).toEqual({
        orders: [],
        totalOrders: 0,
        totalRevenue: 0,
        ordersByStatus: expect.any(Object),
        ordersByType: expect.any(Object),
        dateRange: {
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        }
      });
    });
  });

  describe('getDashboardMetrics', () => {
    test('should return dashboard metrics', async () => {
      // Setup
      prisma.dailyMetric.findMany.mockResolvedValue(mockDailyMetrics);
      prisma.hourlyMetric.findMany.mockResolvedValue(mockHourlyMetrics);
      prisma.itemMetric.findMany.mockResolvedValue(mockItemMetrics);
      prisma.menuItem.findMany.mockResolvedValue(mockMenuItems);

      // Execute
      const result = await getDashboardMetrics(mockRestaurantId);

      // Verify
      expect(result).toEqual({
        dailyRevenue: {
          today: 425.5,
          previous: 356.8,
          percentChange: expect.any(Number)
        },
        orderMetrics: {
          totalToday: 10,
          averageValue: 42.55,
          averagePrepTime: 23.5
        },
        hourlyData: mockHourlyMetrics.map(h => ({
          hour: expect.any(String),
          revenue: h.revenue,
          orderCount: h.orderCount
        })),
        itemPerformance: expect.arrayContaining([
          expect.objectContaining({
            itemName: expect.any(String),
            quantity: expect.any(Number),
            revenue: expect.any(Number),
            averagePrepTime: expect.any(Number)
          })
        ]),
        operationalStatus: {
          kitchenLoad: expect.any(Number),
          pendingOrders: expect.any(Number),
          staffProductivity: expect.any(Number),
          peakHours: expect.any(Array)
        }
      });
    });

    test('should handle missing metrics', async () => {
      // Setup
      prisma.dailyMetric.findMany.mockResolvedValue([]);
      prisma.hourlyMetric.findMany.mockResolvedValue([]);
      prisma.itemMetric.findMany.mockResolvedValue([]);
      prisma.menuItem.findMany.mockResolvedValue([]);

      // Execute
      const result = await getDashboardMetrics(mockRestaurantId);

      // Verify
      expect(result).toEqual({
        dailyRevenue: {
          today: 0,
          previous: 0,
          percentChange: 0
        },
        orderMetrics: {
          totalToday: 0,
          averageValue: 0,
          averagePrepTime: 0
        },
        hourlyData: [],
        itemPerformance: [],
        operationalStatus: {
          kitchenLoad: 0,
          pendingOrders: 0,
          staffProductivity: 0,
          peakHours: []
        }
      });
    });
  });

  describe('updateMetricsForOrder', () => {
    test('should update metrics for a new order', async () => {
      // Setup
      const mockOrder = {
        id: 'order_1',
        restaurantId: mockRestaurantId,
        total: 42.50,
        createdAt: new Date(),
        status: 'pending',
        items: [
          { menuItemId: 'menu_1', quantity: 2, price: 15.99 },
          { menuItemId: 'menu_2', quantity: 1, price: 8.99 }
        ]
      };

      const mockDate = new Date();
      const day = mockDate.toISOString().split('T')[0];
      const hour = mockDate.getHours();

      // Mock the DailyMetric findUnique to return null (no existing metric)
      prisma.dailyMetric.findUnique.mockResolvedValue(null);
      
      // Mock the HourlyMetric findUnique to return null
      prisma.hourlyMetric.findUnique.mockResolvedValue(null);

      // Execute
      await updateMetricsForOrder(mockOrder);

      // Verify
      expect(prisma.dailyMetric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          restaurantId: mockRestaurantId,
          date: expect.any(Date),
          totalOrders: 1,
          totalRevenue: 42.50,
          averageOrderValue: 42.50
        })
      });

      expect(prisma.hourlyMetric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          restaurantId: mockRestaurantId,
          date: expect.any(Date),
          hour: hour,
          orderCount: 1,
          revenue: 42.50
        })
      });

      // Verify that item metrics were updated
      expect(prisma.itemMetric.upsert).toHaveBeenCalledTimes(2);
    });

    test('should update existing metrics for an order', async () => {
      // Setup
      const mockOrder = {
        id: 'order_1',
        restaurantId: mockRestaurantId,
        total: 42.50,
        createdAt: new Date(),
        status: 'pending',
        items: [
          { menuItemId: 'menu_1', quantity: 2, price: 15.99 },
          { menuItemId: 'menu_2', quantity: 1, price: 8.99 }
        ]
      };

      const mockDate = new Date();
      const day = mockDate.toISOString().split('T')[0];
      const hour = mockDate.getHours();

      // Mock existing metrics
      const existingDailyMetric = {
        id: 'daily_1',
        restaurantId: mockRestaurantId,
        date: mockDate,
        totalOrders: 5,
        totalRevenue: 200.0,
        averageOrderValue: 40.0
      };

      const existingHourlyMetric = {
        id: 'hourly_1',
        restaurantId: mockRestaurantId,
        date: mockDate,
        hour: hour,
        orderCount: 2,
        revenue: 80.0
      };

      prisma.dailyMetric.findUnique.mockResolvedValue(existingDailyMetric);
      prisma.hourlyMetric.findUnique.mockResolvedValue(existingHourlyMetric);

      // Execute
      await updateMetricsForOrder(mockOrder);

      // Verify
      expect(prisma.dailyMetric.update).toHaveBeenCalledWith({
        where: { id: existingDailyMetric.id },
        data: expect.objectContaining({
          totalOrders: 6,
          totalRevenue: 242.50,
          averageOrderValue: expect.any(Number) // Should be calculated as (200.0 + 42.50) / 6
        })
      });

      expect(prisma.hourlyMetric.update).toHaveBeenCalledWith({
        where: { id: existingHourlyMetric.id },
        data: expect.objectContaining({
          orderCount: 3,
          revenue: 122.50
        })
      });
    });
  });

  describe('generateOrdersReportData', () => {
    test('should generate CSV report data for orders', async () => {
      // Setup
      prisma.order.findMany.mockResolvedValue(mockOrders);

      // Execute
      const result = await generateOrdersReportData(mockRestaurantId, { format: 'csv' });

      // Verify
      expect(prisma.order.findMany).toHaveBeenCalled();
      expect(result).toEqual({
        format: 'csv',
        data: expect.stringContaining('Order Number,Customer Name,Order Type,Status,Total,Created At'),
        filename: expect.stringContaining('orders_report_rest_1')
      });
    });

    test('should generate PDF report data for orders', async () => {
      // Setup
      prisma.order.findMany.mockResolvedValue(mockOrders);

      // Execute
      const result = await generateOrdersReportData(mockRestaurantId, { format: 'pdf' });

      // Verify
      expect(prisma.order.findMany).toHaveBeenCalled();
      expect(result).toEqual({
        format: 'pdf',
        data: expect.any(Buffer),
        filename: expect.stringContaining('orders_report_rest_1')
      });
    });

    test('should handle invalid format', async () => {
      // Execute and verify
      await expect(generateOrdersReportData(mockRestaurantId, { format: 'invalid' }))
        .rejects.toThrow('Invalid report format');
    });
  });
});
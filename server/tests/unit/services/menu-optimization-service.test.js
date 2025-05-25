const MenuOptimizationService = require('../../../src/services/menu-optimization-service');
const prisma = require('../../../src/db/client');

// Mock dependencies
jest.mock('../../../src/db/client', () => ({
  menuItem: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
  },
  orderItem: {
    findMany: jest.fn(),
  },
}));

jest.mock('../../../src/services/ai-report-service');

describe('MenuOptimizationService - TDD Tests', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MenuOptimizationService();
  });

  describe('RED: Basic service initialization', () => {
    it('should initialize MenuOptimizationService', () => {
      expect(service).toBeInstanceOf(MenuOptimizationService);
      expect(service.aiReportService).toBeDefined();
    });

    it('should have required methods', () => {
      expect(typeof service.generateMenuOptimization).toBe('function');
      expect(typeof service.aggregateMenuData).toBe('function');
      expect(typeof service.generateSystemPrompt).toBe('function');
      expect(typeof service.generateUserPrompt).toBe('function');
    });
  });

  describe('RED: Parameter validation', () => {
    it('should validate required parameters', async () => {
      await expect(service.generateMenuOptimization({}))
        .rejects.toThrow('Missing required parameters');
    });

    it('should validate restaurantId', async () => {
      await expect(service.generateMenuOptimization({
        lookbackDays: 30
      })).rejects.toThrow('Missing required parameters: restaurantId');
    });

    it('should validate lookbackDays range', async () => {
      await expect(service.generateMenuOptimization({
        restaurantId: 'test-id',
        lookbackDays: 0
      })).rejects.toThrow('Lookback days must be at least 1');
    });

    it('should validate maximum lookback period', async () => {
      await expect(service.generateMenuOptimization({
        restaurantId: 'test-id',
        lookbackDays: 365
      })).rejects.toThrow('Lookback days cannot exceed 180');
    });
  });

  describe('RED: Data aggregation', () => {
    const mockMenuItems = [
      {
        id: 'item1',
        name: 'Grilled Salmon',
        price: 15.00,
        category: 'Main Dishes',
        isActive: true,
        preparationTime: 20,
        menuCategory: { name: 'Main Dishes' }
      },
      {
        id: 'item2', 
        name: 'Caesar Salad',
        price: 8.50,
        category: 'Salads',
        isActive: true,
        preparationTime: 10,
        menuCategory: { name: 'Salads' }
      }
    ];

    const mockOrderItems = [
      {
        menuItemId: 'item1',
        quantity: 5,
        price: 15.00,
        order: { createdAt: new Date('2024-01-15') }
      },
      {
        menuItemId: 'item2',
        quantity: 3,
        price: 8.50,
        order: { createdAt: new Date('2024-01-16') }
      }
    ];

    beforeEach(() => {
      prisma.menuItem.findMany.mockResolvedValue(mockMenuItems);
      prisma.orderItem.findMany.mockResolvedValue(mockOrderItems);
    });

    it('should aggregate menu data for analysis', async () => {
      const result = await service.aggregateMenuData('test-restaurant', 30);

      expect(result).toHaveProperty('menuItems');
      expect(result).toHaveProperty('itemPerformance');
      expect(result).toHaveProperty('categoryPerformance');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('analysisDateRange');
    });

    it('should calculate item performance metrics', async () => {
      const result = await service.aggregateMenuData('test-restaurant', 30);

      const salmonPerformance = result.itemPerformance.find(item => item.itemId === 'item1');
      expect(salmonPerformance).toMatchObject({
        itemId: 'item1',
        name: 'Grilled Salmon',
        totalQuantity: 5,
        totalRevenue: 75.00,
        averagePrice: 15.00
      });
    });

    it('should calculate category performance', async () => {
      const result = await service.aggregateMenuData('test-restaurant', 30);

      const mainDishesCategory = result.categoryPerformance.find(cat => cat.category === 'Main Dishes');
      expect(mainDishesCategory).toMatchObject({
        category: 'Main Dishes',
        itemCount: 1,
        totalRevenue: 75.00
      });
    });

    it('should handle restaurants with no menu items', async () => {
      prisma.menuItem.findMany.mockResolvedValue([]);
      prisma.orderItem.findMany.mockResolvedValue([]);

      await expect(service.aggregateMenuData('empty-restaurant', 30))
        .rejects.toThrow('No menu items found for analysis');
    });
  });

  describe('RED: AI prompt generation', () => {
    it('should generate system prompt with menu optimization expertise', () => {
      const prompt = service.generateSystemPrompt();

      expect(prompt).toContain('menu optimization');
      expect(prompt).toContain('restaurant');
      expect(prompt).toContain('performance');
      expect(prompt).toContain('recommendations');
    });

    it('should generate user prompt with menu data', () => {
      const mockData = {
        menuItems: [{ name: 'Test Item', price: 10 }],
        itemPerformance: [{ name: 'Test Item', totalRevenue: 100 }],
        categoryPerformance: [{ category: 'Test', totalRevenue: 100 }],
        totalRevenue: 1000,
        analysisDateRange: { start: '2024-01-01', end: '2024-01-31' }
      };

      const prompt = service.generateUserPrompt({ lookbackDays: 30 }, mockData);

      expect(prompt).toContain('menu optimization');
      expect(prompt).toContain('30 days');
      expect(prompt).toContain('Test Item');
      expect(prompt).toContain('$1,000.00');
    });
  });

  describe('RED: Data structure transformation', () => {
    it('should transform AI response to required format', () => {
      const mockAIResponse = {
        data: {
          confidence: 0.85,
          item_performance: [
            {
              item_id: 'item1',
              name: 'Test Item',
              performance_rank: 1,
              total_quantity: 100,
              total_revenue: 1500
            }
          ],
          insights: ['Test insight'],
          recommendations: ['Test recommendation']
        }
      };

      const result = service._enhanceAIResponse(mockAIResponse, {});

      expect(result).toHaveProperty('confidence', 0.85);
      expect(result).toHaveProperty('item_performance');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('recommendations');
      expect(result.item_performance[0]).toHaveProperty('item_id', 'item1');
    });

    it('should provide default values for missing fields', () => {
      const mockAIResponse = { data: {} };

      const result = service._enhanceAIResponse(mockAIResponse, {});

      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('item_performance', []);
      expect(result).toHaveProperty('category_performance', []);
      expect(result).toHaveProperty('insights', []);
      expect(result).toHaveProperty('recommendations', []);
    });
  });

  describe('RED: End-to-end optimization generation', () => {
    it('should generate complete menu optimization', async () => {
      // Mock successful data aggregation
      jest.spyOn(service, 'aggregateMenuData').mockResolvedValue({
        menuItems: [{ id: 'item1', name: 'Test' }],
        itemPerformance: [],
        categoryPerformance: [],
        totalRevenue: 1000,
        analysisDateRange: {
          start: new Date('2024-01-01').toISOString(),
          end: new Date('2024-01-31').toISOString(),
          days: 30
        }
      });

      // Mock AI service response
      service.aiReportService.generateReport = jest.fn().mockResolvedValue({
        data: {
          confidence: 0.85,
          item_performance: [],
          insights: ['Generated insight'],
          recommendations: ['Generated recommendation']
        },
        metadata: { duration: 1500 }
      });

      const result = await service.generateMenuOptimization({
        restaurantId: 'test-restaurant',
        lookbackDays: 30
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('type', 'menu_optimization');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('confidence');
      expect(result.data).toHaveProperty('insights');
      expect(result.data).toHaveProperty('recommendations');
    });
  });
});
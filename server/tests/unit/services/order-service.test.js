const orderService = require('../../../src/services/order-service');
const prisma = require('../../../src/db/client');
const { v4: uuidv4 } = require('uuid');

// Mock UUID to return predictable values
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid')
}));

// Mock Prisma client
jest.mock('../../../src/db/client', () => ({
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
}));

describe('Order Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrders', () => {
    test('should get all orders with default pagination when no parameters provided', async () => {
      // Arrange
      const mockOrders = [{ id: '1', status: 'pending' }, { id: '2', status: 'delivered' }];
      prisma.order.findMany.mockResolvedValue(mockOrders);
      prisma.order.count.mockResolvedValue(2);

      // Act
      const result = await orderService.getOrders();

      // Assert
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: {}
      });
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {},
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
      expect(result).toEqual({
        orders: mockOrders,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 2,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });
    });

    test('should filter orders by status when status is provided', async () => {
      // Arrange
      const mockOrders = [{ id: '1', status: 'pending' }];
      prisma.order.findMany.mockResolvedValue(mockOrders);
      prisma.order.count.mockResolvedValue(1);

      // Act
      const result = await orderService.getOrders('pending');

      // Assert
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: { status: 'pending' }
      });
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'pending' },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
      expect(result.orders).toEqual(mockOrders);
    });

    test('should handle pagination with specific page and limit', async () => {
      // Arrange
      const mockOrders = [{ id: '3', status: 'pending' }, { id: '4', status: 'delivered' }];
      prisma.order.findMany.mockResolvedValue(mockOrders);
      prisma.order.count.mockResolvedValue(25);

      // Act
      const result = await orderService.getOrders(null, 2, 10);

      // Assert
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: {}
      });
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {},
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: 10, // (page 2 - 1) * 10 limit
        take: 10
      });
      expect(result).toEqual({
        orders: mockOrders,
        pagination: {
          currentPage: 2,
          totalPages: 3, // Math.ceil(25 / 10)
          totalCount: 25,
          hasNextPage: true,
          hasPreviousPage: true
        }
      });
    });

    test('should filter by restaurant ID when provided', async () => {
      // Arrange
      const mockOrders = [{ id: '1', status: 'pending', restaurantId: 'rest_1' }];
      prisma.order.findMany.mockResolvedValue(mockOrders);
      prisma.order.count.mockResolvedValue(1);

      // Act
      const result = await orderService.getOrders(null, 1, 20, 'rest_1');

      // Assert
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: { restaurantId: 'rest_1' }
      });
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 'rest_1' },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
      expect(result.orders).toEqual(mockOrders);
    });

    test('should combine status and restaurant filters with pagination', async () => {
      // Arrange
      const mockOrders = [{ id: '1', status: 'pending', restaurantId: 'rest_1' }];
      prisma.order.findMany.mockResolvedValue(mockOrders);
      prisma.order.count.mockResolvedValue(15);

      // Act
      const result = await orderService.getOrders('pending', 3, 5, 'rest_1');

      // Assert
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: { status: 'pending', restaurantId: 'rest_1' }
      });
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'pending', restaurantId: 'rest_1' },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: 10, // (page 3 - 1) * 5 limit
        take: 5
      });
      expect(result).toEqual({
        orders: mockOrders,
        pagination: {
          currentPage: 3,
          totalPages: 3, // Math.ceil(15 / 5)
          totalCount: 15,
          hasNextPage: false,
          hasPreviousPage: true
        }
      });
    });

    test('should handle edge case with no orders', async () => {
      // Arrange
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      // Act
      const result = await orderService.getOrders();

      // Assert
      expect(result).toEqual({
        orders: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });
    });

    test('should handle pagination when requesting page beyond available pages', async () => {
      // Arrange
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(5);

      // Act
      const result = await orderService.getOrders(null, 10, 10);

      // Assert
      expect(result).toEqual({
        orders: [],
        pagination: {
          currentPage: 10,
          totalPages: 1, // Math.ceil(5 / 10)
          totalCount: 5,
          hasNextPage: false,
          hasPreviousPage: true
        }
      });
    });
  });

  describe('getOrderById', () => {
    test('should get order by ID', async () => {
      // Arrange
      const mockOrder = { id: '1', status: 'pending' };
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      // Act
      const result = await orderService.getOrderById('1');

      // Assert
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { items: true },
      });
      expect(result).toEqual(mockOrder);
    });

    test('should throw error when order is not found', async () => {
      // Arrange
      prisma.order.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(orderService.getOrderById('nonexistent')).rejects.toThrow('Order not found');
    });
  });

  describe('generateOrderNumber', () => {
    // Mocking the date to get consistent results
    const originalDate = global.Date;
    const mockDate = new Date('2025-05-20T12:00:00Z');
    
    beforeEach(() => {
      global.Date = jest.fn(() => mockDate);
      global.Date.now = jest.fn(() => mockDate.getTime());
      // Ensure Date methods are available
      ['getDate', 'getMonth', 'getFullYear', 'setHours'].forEach(method => {
        global.Date.prototype[method] = originalDate.prototype[method];
      });
    });
    
    afterEach(() => {
      global.Date = originalDate;
    });

    test('should generate restaurant-specific order number', async () => {
      // Arrange
      prisma.order.count.mockResolvedValue(5); // 5 orders today for this restaurant
      const restaurantId = 'rest_1';
      
      // Act
      const result = await orderService.generateOrderNumber(restaurantId);
      
      // Assert
      expect(result).toBe('R1-20250520-006'); // should be 6th order (5+1), for restaurant R1, on 5/20/2025
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: {
          restaurantId,
          createdAt: expect.any(Object),
        },
      });
    });
    
    test('should handle different restaurant IDs correctly', async () => {
      // Arrange
      prisma.order.count.mockResolvedValue(0); // No orders today for this restaurant
      const restaurantId = 'rest_2';
      
      // Act
      const result = await orderService.generateOrderNumber(restaurantId);
      
      // Assert
      expect(result).toBe('R2-20250520-001'); // should be 1st order, for restaurant R2
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: {
          restaurantId,
          createdAt: expect.any(Object),
        },
      });
    });
    
    test('should throw error when no restaurant ID is provided', async () => {
      // Act & Assert
      await expect(orderService.generateOrderNumber()).rejects.toThrow('Restaurant ID is required');
    });
  });

  describe('createOrder', () => {
    test('should create a new order with order data', async () => {
      // Arrange
      const orderData = {
        restaurantId: 'rest_1',
        customerName: 'Test Customer',
        orderType: 'delivery',
        total: 25.99,
        items: [
          { name: 'Test Item', quantity: 1, price: 25.99 },
        ],
      };
      
      const createdOrder = {
        id: 'mocked-uuid',
        orderNumber: 'R1-20250520-001', // This will come from the actual function
        ...orderData,
        status: 'pending',
      };
      
      prisma.order.create.mockResolvedValue(createdOrder);

      // Act
      const result = await orderService.createOrder(orderData);

      // Assert
      // We're not mocking generateOrderNumber since it's internal to the service
      expect(prisma.order.create).toHaveBeenCalled();
      // Verify that we passed the expected data to create
      expect(prisma.order.create.mock.calls[0][0].data).toMatchObject({
        restaurantId: orderData.restaurantId,
        customerName: orderData.customerName,
        orderType: orderData.orderType,
        status: 'pending',
        total: orderData.total,
      });
      // Verify the order has an ID and orderNumber
      expect(result.id).toBeDefined();
      expect(result.orderNumber).toBeDefined();
      // Verify the rest of the order
      expect(result).toEqual(createdOrder);
    });
  });

  describe('updateOrderStatus', () => {
    test('should update order status with valid transition', async () => {
      // Arrange
      const currentOrder = {
        id: '1',
        status: 'pending',
      };
      const updatedOrder = {
        ...currentOrder,
        status: 'preparing',
      };
      prisma.order.findUnique.mockResolvedValue(currentOrder);
      prisma.order.update.mockResolvedValue(updatedOrder);

      // Act
      const result = await orderService.updateOrderStatus('1', 'preparing');

      // Assert
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'preparing' },
        include: { items: true },
      });
      expect(result).toEqual(updatedOrder);
    });

    test('should throw error on invalid status transition', async () => {
      // Arrange
      const currentOrder = {
        id: '1',
        status: 'pending',
      };
      prisma.order.findUnique.mockResolvedValue(currentOrder);

      // Act & Assert
      await expect(orderService.updateOrderStatus('1', 'delivered')).rejects.toThrow('Invalid status transition');
    });

    test('should throw error when order is not found', async () => {
      // Arrange
      prisma.order.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(orderService.updateOrderStatus('nonexistent', 'preparing')).rejects.toThrow('Order not found');
    });
  });
});
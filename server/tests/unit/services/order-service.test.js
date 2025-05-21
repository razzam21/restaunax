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
    test('should get all orders when no status is provided', async () => {
      // Arrange
      const mockOrders = [{ id: '1', status: 'pending' }, { id: '2', status: 'delivered' }];
      prisma.order.findMany.mockResolvedValue(mockOrders);

      // Act
      const result = await orderService.getOrders();

      // Assert
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {},
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockOrders);
    });

    test('should filter orders by status when status is provided', async () => {
      // Arrange
      const mockOrders = [{ id: '1', status: 'pending' }];
      prisma.order.findMany.mockResolvedValue(mockOrders);

      // Act
      const result = await orderService.getOrders('pending');

      // Assert
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'pending' },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockOrders);
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
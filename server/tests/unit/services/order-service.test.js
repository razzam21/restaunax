const orderService = require('../../../src/services/order-service');
const prisma = require('../../../src/db/client');

// Mock Prisma client
jest.mock('../../../src/db/client', () => ({
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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

  describe('createOrder', () => {
    test('should create a new order', async () => {
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
        id: 'new-id',
        ...orderData,
        status: 'pending',
      };
      prisma.order.create.mockResolvedValue(createdOrder);

      // Act
      const result = await orderService.createOrder(orderData);

      // Assert
      expect(prisma.order.create).toHaveBeenCalled();
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
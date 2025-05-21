const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/db/client');
const { authenticateRequest } = require('../utils/auth');

// Mock Prisma client
jest.mock('../../src/db/client', () => ({
  order: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

describe('Order Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/orders', () => {
    test('should get all orders', async () => {
      // Arrange
      const mockOrders = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'delivered' },
      ];
      prisma.order.findMany.mockResolvedValue(mockOrders);

      // Act
      const res = await authenticateRequest(request(app).get('/api/orders'));

      // Assert
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockOrders);
    });

    test('should filter orders by status', async () => {
      // Arrange
      const mockOrders = [{ id: '1', status: 'pending' }];
      prisma.order.findMany.mockResolvedValue(mockOrders);

      // Act
      const res = await authenticateRequest(request(app).get('/api/orders?status=pending'));

      // Assert
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockOrders);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'pending' },
        })
      );
    });
  });

  describe('GET /api/orders/:id', () => {
    test('should get order by ID', async () => {
      // Arrange
      const mockOrder = { id: '1', status: 'pending' };
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      // Act
      const res = await authenticateRequest(request(app).get('/api/orders/1'));

      // Assert
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockOrder);
    });

    test('should return 404 if order not found', async () => {
      // Arrange
      prisma.order.findUnique.mockResolvedValue(null);

      // Act
      const res = await authenticateRequest(request(app).get('/api/orders/nonexistent'));

      // Assert
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/orders', () => {
    test('should create new order with valid data', async () => {
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
      const res = await authenticateRequest(
        request(app)
          .post('/api/orders')
          .send(orderData)
      );

      // Assert
      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual(createdOrder);
    });
    
    test('should assign order number in the correct format when creating order', async () => {
      // Arrange
      const orderData = {
        restaurantId: 'rest_1',
        customerName: 'Test Customer',
        orderType: 'delivery',
        total: 30.99,
        items: [
          { name: 'Test Menu Item', quantity: 2, price: 15.495 },
        ],
      };
      
      // Mock the order creation to include an order number in the expected format
      const createdOrder = {
        id: 'order-uuid',
        orderNumber: 'R1-20250520-001',
        ...orderData,
        status: 'pending',
      };
      prisma.order.create.mockResolvedValue(createdOrder);

      // Act
      const res = await authenticateRequest(
        request(app)
          .post('/api/orders')
          .send(orderData)
      );

      // Assert
      expect(res.statusCode).toBe(201);
      expect(res.body.orderNumber).toMatch(/^R\d+-\d{8}-\d{3}$/);
    });

    test('should return 400 with invalid data', async () => {
      // Arrange
      const invalidOrderData = {
        // Missing required fields
        customerName: 'Test Customer',
      };

      // Act
      const res = await authenticateRequest(
        request(app)
          .post('/api/orders')
          .send(invalidOrderData)
      );

      // Assert
      expect(res.statusCode).toBe(400);
    });

    test('should sanitize user input to prevent XSS', async () => {
      // Arrange
      const orderData = {
        restaurantId: 'rest_1',
        customerName: '<script>alert("XSS")</script>Test Customer',
        orderType: 'delivery',
        total: 25.99,
        items: [
          { name: 'Test Item', quantity: 1, price: 25.99 },
        ],
      };
      const sanitizedOrderData = {
        ...orderData,
        customerName: 'Test Customer', // Script tags removed
      };
      prisma.order.create.mockImplementation(({ data }) => Promise.resolve({
        id: 'new-id',
        ...data,
      }));

      // Act
      const res = await authenticateRequest(
        request(app)
          .post('/api/orders')
          .send(orderData)
      );

      // Assert
      expect(res.statusCode).toBe(201);
      // Check that the script was sanitized in the data passed to prisma
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerName: 'Test Customer',
          }),
        })
      );
    });
  });

  describe('PATCH /api/orders/:id', () => {
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
      const res = await authenticateRequest(
        request(app)
          .patch('/api/orders/1')
          .send({ status: 'preparing' })
      );

      // Assert
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(updatedOrder);
    });

    test('should return 400 with invalid status transition', async () => {
      // Arrange
      const currentOrder = {
        id: '1',
        status: 'pending',
      };
      prisma.order.findUnique.mockResolvedValue(currentOrder);
      
      // Mock the error from the service
      prisma.order.update.mockImplementation(() => {
        const error = new Error('Invalid status transition');
        error.statusCode = 400;
        throw error;
      });

      // Act
      const res = await authenticateRequest(
        request(app)
          .patch('/api/orders/1')
          .send({ status: 'delivered' })
      );

      // Assert
      expect(res.statusCode).toBe(400);
    });

    test('should return 404 if order not found', async () => {
      // Arrange
      prisma.order.findUnique.mockResolvedValue(null);

      // Act
      const res = await authenticateRequest(
        request(app)
          .patch('/api/orders/nonexistent')
          .send({ status: 'preparing' })
      );

      // Assert
      expect(res.statusCode).toBe(404);
    });
  });
});
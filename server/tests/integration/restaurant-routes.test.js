const request = require('supertest');
const app = require('../../src/app');
const { PrismaClient } = require('@prisma/client');
const { createTestToken } = require('../utils/auth');

// Mock Prisma client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    restaurant: {
      findUnique: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

const prisma = new PrismaClient();

describe('Restaurant Routes', () => {
  let token;

  beforeEach(() => {
    // Create a valid auth token for each test
    token = createTestToken({
      id: 'user_1',
      role: 'owner',
      restaurantId: 'rest_1',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/restaurants/:id', () => {
    const mockRestaurant = {
      id: 'rest_1',
      name: 'Test Restaurant',
      themeId: 'rest_1',
      primaryColor: '#2C4A7A',
      secondaryColor: '#D97A3A',
    };

    test('should return restaurant data when authenticated', async () => {
      // Setup
      prisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);

      // Execute
      const response = await request(app)
        .get('/api/restaurants/rest_1')
        .set('Authorization', `Bearer ${token}`);

      // Verify
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: 'rest_1',
          name: 'Test Restaurant',
        }),
      });
    });

    test('should return 401 when not authenticated', async () => {
      // Execute
      const response = await request(app).get('/api/restaurants/rest_1');

      // Verify
      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent restaurant', async () => {
      // Setup
      prisma.restaurant.findUnique.mockResolvedValue(null);

      // Execute
      const response = await request(app)
        .get('/api/restaurants/non-existent')
        .set('Authorization', `Bearer ${token}`);

      // Verify
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/restaurants/:id/theme', () => {
    const mockRestaurantTheme = {
      id: 'rest_1',
      name: 'Test Restaurant',
      themeId: 'rest_1',
      primaryColor: '#2C4A7A',
      secondaryColor: '#D97A3A',
    };

    test('should return theme data when authenticated', async () => {
      // Setup
      prisma.restaurant.findUnique.mockResolvedValue(mockRestaurantTheme);

      // Execute
      const response = await request(app)
        .get('/api/restaurants/rest_1/theme')
        .set('Authorization', `Bearer ${token}`);

      // Verify
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: 'rest_1',
          name: 'Test Restaurant',
          theme: expect.objectContaining({
            id: 'rest_1',
            primaryColor: '#2C4A7A',
            secondaryColor: '#D97A3A',
          }),
        }),
      });
    });

    test('should return 401 when not authenticated', async () => {
      // Execute
      const response = await request(app).get('/api/restaurants/rest_1/theme');

      // Verify
      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent restaurant', async () => {
      // Setup
      prisma.restaurant.findUnique.mockResolvedValue(null);

      // Execute
      const response = await request(app)
        .get('/api/restaurants/non-existent/theme')
        .set('Authorization', `Bearer ${token}`);

      // Verify
      expect(response.status).toBe(404);
    });
  });
});
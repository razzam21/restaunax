const { 
  getRestaurantById, 
  getRestaurantTheme, 
  updateRestaurantSettings,
  getAvailableThemes
} = require('../../../src/services/restaurant-service');
const { PrismaClient } = require('@prisma/client');

// Mock Prisma client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    restaurant: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    auditLog: {
      create: jest.fn()
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

describe('Restaurant Service', () => {
  const mockRestaurant = {
    id: 'rest_1',
    name: 'Test Restaurant',
    themeId: 'rest_1',
    primaryColor: '#2C4A7A',
    secondaryColor: '#D97A3A',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRestaurantById', () => {
    test('should return restaurant if found', async () => {
      // Setup
      prisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);

      // Execute
      const result = await getRestaurantById('rest_1');

      // Verify
      expect(prisma.restaurant.findUnique).toHaveBeenCalledWith({
        where: { id: 'rest_1' },
      });
      expect(result).toEqual(mockRestaurant);
    });

    test('should throw 404 error if restaurant not found', async () => {
      // Setup
      prisma.restaurant.findUnique.mockResolvedValue(null);

      // Execute and verify
      await expect(getRestaurantById('not-found')).rejects.toMatchObject({
        message: 'Restaurant with ID not-found not found',
        statusCode: 404,
      });
    });

    test('should propagate database errors', async () => {
      // Setup
      const dbError = new Error('Database connection failed');
      prisma.restaurant.findUnique.mockRejectedValue(dbError);

      // Execute and verify
      await expect(getRestaurantById('rest_1')).rejects.toThrow(dbError);
    });
  });

  describe('getRestaurantTheme', () => {
    test('should return theme settings if restaurant found', async () => {
      // Setup
      prisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);

      // Execute
      const result = await getRestaurantTheme('rest_1');

      // Verify
      expect(prisma.restaurant.findUnique).toHaveBeenCalledWith({
        where: { id: 'rest_1' },
        select: {
          id: true,
          name: true,
          themeId: true,
          primaryColor: true,
          secondaryColor: true,
        },
      });
      expect(result).toEqual({
        id: 'rest_1',
        name: 'Test Restaurant',
        theme: {
          id: 'rest_1',
          primaryColor: '#2C4A7A',
          secondaryColor: '#D97A3A',
        },
      });
    });

    test('should use default colors if restaurant has no theme colors', async () => {
      // Setup
      const restaurantWithoutTheme = {
        id: 'rest_1',
        name: 'Test Restaurant',
        themeId: null,
        primaryColor: null,
        secondaryColor: null,
      };
      prisma.restaurant.findUnique.mockResolvedValue(restaurantWithoutTheme);

      // Execute
      const result = await getRestaurantTheme('rest_1');

      // Verify
      expect(result.theme).toEqual({
        id: 'rest_1',
        primaryColor: '#2C4A7A',  // Default primary color
        secondaryColor: '#D97A3A', // Default secondary color
      });
    });

    test('should throw 404 error if restaurant not found', async () => {
      // Setup
      prisma.restaurant.findUnique.mockResolvedValue(null);

      // Execute and verify
      await expect(getRestaurantTheme('not-found')).rejects.toMatchObject({
        message: 'Restaurant with ID not-found not found',
        statusCode: 404,
      });
    });
  });
  
  describe('updateRestaurantSettings', () => {
    const mockUserId = 'user_1';
    const mockUserRole = 'owner';
    const updateData = {
      name: 'Updated Restaurant',
      themeId: 'rest_2',
      primaryColor: '#276749',
      secondaryColor: '#805AD5'
    };
    
    test('should update restaurant settings as owner', async () => {
      // Setup
      prisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);
      prisma.restaurant.update.mockResolvedValue({
        ...mockRestaurant,
        ...updateData
      });
      prisma.auditLog.create.mockResolvedValue({});
      
      // Execute
      const result = await updateRestaurantSettings('rest_1', updateData, mockUserId, mockUserRole);
      
      // Verify
      expect(prisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: 'rest_1' },
        data: updateData
      });
      
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          action: 'update_restaurant',
          details: expect.any(Object)
        })
      });
      
      expect(result).toEqual({
        ...mockRestaurant,
        ...updateData
      });
    });
    
    test('should throw 403 error if user is not an owner', async () => {
      // Setup
      prisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);
      
      // Execute and verify
      await expect(updateRestaurantSettings(
        'rest_1', 
        updateData, 
        mockUserId, 
        'wait_staff'
      )).rejects.toMatchObject({
        message: 'Only restaurant owners can update restaurant settings',
        statusCode: 403,
      });
      
      // Verify update was not called
      expect(prisma.restaurant.update).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
    
    test('should throw 404 error if restaurant not found', async () => {
      // Setup
      prisma.restaurant.findUnique.mockResolvedValue(null);
      
      // Execute and verify
      await expect(updateRestaurantSettings(
        'not-found', 
        updateData, 
        mockUserId, 
        mockUserRole
      )).rejects.toMatchObject({
        message: 'Restaurant with ID not-found not found',
        statusCode: 404,
      });
    });
  });
  
  describe('getAvailableThemes', () => {
    test('should return list of available themes', async () => {
      // Execute
      const result = await getAvailableThemes();
      
      // Verify
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'default',
          name: expect.any(String),
          description: expect.any(String),
          primaryColor: expect.any(String),
          secondaryColor: expect.any(String),
        }),
        // At least one more theme
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          primaryColor: expect.any(String),
          secondaryColor: expect.any(String),
        })
      ]));
    });
  });
});
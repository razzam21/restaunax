const { 
  getRestaurantById, 
  getRestaurantTheme, 
  updateRestaurantSettings,
  getAvailableThemes
} = require('../../../src/controllers/restaurant-controller');
const restaurantService = require('../../../src/services/restaurant-service');
const Joi = require('joi');

// Mock the restaurant service
jest.mock('../../../src/services/restaurant-service');

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('Restaurant Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { id: 'rest_1' },
      user: { id: 'user_1', role: 'owner' },
      body: {}
    };
    res = {
      json: jest.fn(() => res),
      status: jest.fn(() => res),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRestaurantById', () => {
    const mockRestaurant = {
      id: 'rest_1',
      name: 'Test Restaurant',
      themeId: 'rest_1',
      primaryColor: '#2C4A7A',
      secondaryColor: '#D97A3A',
    };

    test('should return restaurant data on success', async () => {
      // Setup
      restaurantService.getRestaurantById.mockResolvedValue(mockRestaurant);

      // Execute
      await getRestaurantById(req, res);

      // Verify
      expect(restaurantService.getRestaurantById).toHaveBeenCalledWith('rest_1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRestaurant,
      });
    });

    test('should handle 404 error properly', async () => {
      // Setup
      const error = new Error('Restaurant not found');
      error.statusCode = 404;
      restaurantService.getRestaurantById.mockRejectedValue(error);

      // Execute
      await getRestaurantById(req, res);

      // Verify
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Restaurant not found',
      });
    });

    test('should handle server errors properly', async () => {
      // Setup
      const error = new Error('Database error');
      restaurantService.getRestaurantById.mockRejectedValue(error);

      // Execute
      await getRestaurantById(req, res);

      // Verify
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'An error occurred while retrieving restaurant information',
      });
    });
  });

  describe('getRestaurantTheme', () => {
    const mockThemeData = {
      id: 'rest_1',
      name: 'Test Restaurant',
      theme: {
        id: 'rest_1',
        primaryColor: '#2C4A7A',
        secondaryColor: '#D97A3A',
      },
    };

    test('should return theme data on success', async () => {
      // Setup
      restaurantService.getRestaurantTheme.mockResolvedValue(mockThemeData);

      // Execute
      await getRestaurantTheme(req, res);

      // Verify
      expect(restaurantService.getRestaurantTheme).toHaveBeenCalledWith('rest_1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockThemeData,
      });
    });

    test('should handle 404 error properly', async () => {
      // Setup
      const error = new Error('Restaurant not found');
      error.statusCode = 404;
      restaurantService.getRestaurantTheme.mockRejectedValue(error);

      // Execute
      await getRestaurantTheme(req, res);

      // Verify
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Restaurant not found',
      });
    });

    test('should handle server errors properly', async () => {
      // Setup
      const error = new Error('Database error');
      restaurantService.getRestaurantTheme.mockRejectedValue(error);

      // Execute
      await getRestaurantTheme(req, res);

      // Verify
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'An error occurred while retrieving theme information',
      });
    });
  });
  
  describe('updateRestaurantSettings', () => {
    const mockUpdateData = {
      name: 'Updated Restaurant',
      themeId: 'rest_2',
      primaryColor: '#276749',
      secondaryColor: '#805AD5'
    };
    
    const mockUpdatedRestaurant = {
      id: 'rest_1',
      ...mockUpdateData
    };
    
    test('should update restaurant settings successfully', async () => {
      // Setup
      req.body = mockUpdateData;
      restaurantService.updateRestaurantSettings.mockResolvedValue(mockUpdatedRestaurant);
      
      // Execute
      await updateRestaurantSettings(req, res);
      
      // Verify
      expect(restaurantService.updateRestaurantSettings).toHaveBeenCalledWith(
        'rest_1',
        mockUpdateData,
        'user_1',
        'owner'
      );
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedRestaurant,
        message: 'Restaurant settings updated successfully'
      });
    });
    
    test('should validate request body and return 400 for invalid data', async () => {
      // Setup - invalid color format
      req.body = { 
        ...mockUpdateData,
        primaryColor: 'invalid-color'
      };
      
      // Execute
      await updateRestaurantSettings(req, res);
      
      // Verify
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Primary color must be a valid hex color')
      });
      
      // Service should not be called
      expect(restaurantService.updateRestaurantSettings).not.toHaveBeenCalled();
    });
    
    test('should return 400 if no fields to update', async () => {
      // Setup - empty body
      req.body = {};
      
      // Execute
      await updateRestaurantSettings(req, res);
      
      // Verify
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No valid fields to update'
      });
    });
    
    test('should handle 403 error properly', async () => {
      // Setup
      req.body = mockUpdateData;
      const error = new Error('Only restaurant owners can update restaurant settings');
      error.statusCode = 403;
      restaurantService.updateRestaurantSettings.mockRejectedValue(error);
      
      // Execute
      await updateRestaurantSettings(req, res);
      
      // Verify
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Only restaurant owners can update restaurant settings'
      });
    });
  });
  
  describe('getAvailableThemes', () => {
    const mockThemes = [
      {
        id: 'default',
        name: 'Default Theme',
        description: 'Default theme',
        primaryColor: '#2C4A7A',
        secondaryColor: '#D97A3A'
      },
      {
        id: 'rest_1',
        name: 'Blue Ocean Theme',
        description: 'Deep blue tones',
        primaryColor: '#1A365D',
        secondaryColor: '#9C4221'
      }
    ];
    
    test('should return list of available themes', async () => {
      // Setup
      restaurantService.getAvailableThemes.mockResolvedValue(mockThemes);
      
      // Execute
      await getAvailableThemes(req, res);
      
      // Verify
      expect(restaurantService.getAvailableThemes).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockThemes
      });
    });
    
    test('should handle errors properly', async () => {
      // Setup
      const error = new Error('Failed to get themes');
      restaurantService.getAvailableThemes.mockRejectedValue(error);
      
      // Execute
      await getAvailableThemes(req, res);
      
      // Verify
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'An error occurred while retrieving theme information'
      });
    });
  });
});
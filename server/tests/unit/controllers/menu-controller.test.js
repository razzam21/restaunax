const menuController = require('../../../src/controllers/menu-controller');
const menuService = require('../../../src/services/menu-service');

// Mock the menu service
jest.mock('../../../src/services/menu-service');

describe('Menu Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
    };

    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMenuItems', () => {
    test('should return all menu items when no category is provided', async () => {
      // Arrange
      const mockMenuItems = [
        { id: 'menu_1', name: 'Pizza', price: 10.99 },
        { id: 'menu_2', name: 'Pasta', price: 12.99 },
      ];
      menuService.getMenuItems.mockResolvedValue(mockMenuItems);

      // Act
      await menuController.getMenuItems(req, res);

      // Assert
      expect(menuService.getMenuItems).toHaveBeenCalledWith();
      expect(res.json).toHaveBeenCalledWith(mockMenuItems);
    });

    test('should filter menu items by category when category is provided', async () => {
      // Arrange
      req.query.category = 'Pizza';
      const mockMenuItems = [
        { id: 'menu_1', name: 'Margherita Pizza', price: 10.99, category: 'Pizza' },
      ];
      menuService.getMenuItemsByCategory.mockResolvedValue(mockMenuItems);

      // Act
      await menuController.getMenuItems(req, res);

      // Assert
      expect(menuService.getMenuItemsByCategory).toHaveBeenCalledWith('Pizza');
      expect(res.json).toHaveBeenCalledWith(mockMenuItems);
    });
  });

  describe('getMenuItemById', () => {
    test('should return a menu item when a valid ID is provided', async () => {
      // Arrange
      req.params.id = 'menu_1';
      const mockMenuItem = { id: 'menu_1', name: 'Pizza', price: 10.99 };
      menuService.getMenuItemById.mockResolvedValue(mockMenuItem);

      // Act
      await menuController.getMenuItemById(req, res);

      // Assert
      expect(menuService.getMenuItemById).toHaveBeenCalledWith('menu_1');
      expect(res.json).toHaveBeenCalledWith(mockMenuItem);
    });

    test('should handle errors when menu item is not found', async () => {
      // Arrange
      req.params.id = 'nonexistent';
      const error = new Error('Menu item not found');
      error.statusCode = 404;
      menuService.getMenuItemById.mockRejectedValue(error);

      // Need to create a mock implementation for the next function
      const next = jest.fn();

      // Act
      try {
        await menuController.getMenuItemById(req, res, next);
      } catch (err) {
        // Error will be caught by the error handler middleware
        expect(err).toEqual(error);
      }

      // Assert
      expect(menuService.getMenuItemById).toHaveBeenCalledWith('nonexistent');
    });
  });
});
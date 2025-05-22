const menuController = require('../../../src/controllers/menu-controller');
const menuService = require('../../../src/services/menu-service');
const { sanitizeObject } = require('../../../src/middleware/validation');

// Mock the menu service and sanitizeObject
jest.mock('../../../src/services/menu-service');
jest.mock('../../../src/middleware/validation', () => ({
  sanitizeObject: jest.fn(data => data) // Simple passthrough for testing
}));

describe('Menu Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: {
        id: 'user_123',
        restaurantId: 'rest_1',
        role: 'owner'
      }
    };

    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Menu Item Controllers', () => {
    describe('getMenuItems', () => {
      test('should return menu items with pagination', async () => {
        // Arrange
        const mockPaginatedResult = {
          items: [
            { id: 'item_1', name: 'Pizza', price: 10.99 }
          ],
          pagination: {
            page: 1,
            limit: 50,
            totalItems: 1,
            totalPages: 1
          }
        };
        
        menuService.getMenuItems.mockResolvedValue(mockPaginatedResult);
        
        // Act
        await menuController.getMenuItems(req, res);
        
        // Assert
        expect(menuService.getMenuItems).toHaveBeenCalledWith('rest_1', {
          categoryId: undefined,
          isActive: undefined,
          search: undefined,
          page: 1,
          limit: 50
        });
        expect(res.json).toHaveBeenCalledWith(mockPaginatedResult);
      });
      
      test('should pass filter parameters correctly', async () => {
        // Arrange
        req.query = {
          categoryId: 'cat_1',
          isActive: 'true',
          search: 'pizza',
          page: '2',
          limit: '10'
        };
        
        const mockPaginatedResult = { items: [], pagination: {} };
        menuService.getMenuItems.mockResolvedValue(mockPaginatedResult);
        
        // Act
        await menuController.getMenuItems(req, res);
        
        // Assert
        expect(menuService.getMenuItems).toHaveBeenCalledWith('rest_1', {
          categoryId: 'cat_1',
          isActive: 'true',
          search: 'pizza',
          page: 2,
          limit: 10
        });
      });
    });
    
    describe('getMenuItemById', () => {
      test('should return a menu item when a valid ID is provided', async () => {
        // Arrange
        req.params.id = 'item_1';
        const mockMenuItem = { id: 'item_1', name: 'Pizza', price: 10.99 };
        menuService.getMenuItemById.mockResolvedValue(mockMenuItem);
        
        // Act
        await menuController.getMenuItemById(req, res);
        
        // Assert
        expect(menuService.getMenuItemById).toHaveBeenCalledWith('item_1');
        expect(res.json).toHaveBeenCalledWith(mockMenuItem);
      });
    });
    
    describe('createMenuItem', () => {
      test('should create and return a new menu item', async () => {
        // Arrange
        req.body = {
          name: 'New Pizza',
          description: 'Delicious new pizza',
          price: 14.99,
          categoryId: 'cat_1'
        };
        
        const mockCreatedItem = {
          id: 'new_item_1',
          restaurantId: 'rest_1',
          name: 'New Pizza',
          description: 'Delicious new pizza',
          price: 14.99,
          categoryId: 'cat_1',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        menuService.createMenuItem.mockResolvedValue(mockCreatedItem);
        
        // Act
        await menuController.createMenuItem(req, res);
        
        // Assert
        expect(sanitizeObject).toHaveBeenCalledWith(req.body);
        expect(menuService.createMenuItem).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Pizza',
            price: 14.99,
            restaurantId: 'rest_1'
          }),
          'user_123'
        );
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(mockCreatedItem);
      });
    });
    
    describe('updateMenuItem', () => {
      test('should update and return the menu item', async () => {
        // Arrange
        req.params.id = 'item_1';
        req.body = {
          name: 'Updated Pizza',
          price: 16.99,
          restaurantId: 'should_be_ignored',
          id: 'should_be_ignored'
        };
        
        const mockUpdatedItem = {
          id: 'item_1',
          restaurantId: 'rest_1',
          name: 'Updated Pizza',
          price: 16.99
        };
        
        menuService.updateMenuItem.mockResolvedValue(mockUpdatedItem);
        
        // Act
        await menuController.updateMenuItem(req, res);
        
        // Assert
        expect(sanitizeObject).toHaveBeenCalledWith(req.body);
        expect(menuService.updateMenuItem).toHaveBeenCalledWith(
          'item_1',
          expect.objectContaining({
            name: 'Updated Pizza',
            price: 16.99
          }),
          'user_123'
        );
        
        // Make sure unauthorized fields are not passed
        expect(menuService.updateMenuItem).toHaveBeenCalledWith(
          'item_1',
          expect.not.objectContaining({
            restaurantId: 'should_be_ignored',
            id: 'should_be_ignored'
          }),
          'user_123'
        );
        
        expect(res.json).toHaveBeenCalledWith(mockUpdatedItem);
      });
    });
    
    describe('deactivateMenuItem', () => {
      test('should deactivate and return the menu item', async () => {
        // Arrange
        req.params.id = 'item_1';
        
        const mockDeactivatedItem = {
          id: 'item_1',
          restaurantId: 'rest_1',
          name: 'Pizza',
          isActive: false
        };
        
        menuService.deactivateMenuItem.mockResolvedValue(mockDeactivatedItem);
        
        // Act
        await menuController.deactivateMenuItem(req, res);
        
        // Assert
        expect(menuService.deactivateMenuItem).toHaveBeenCalledWith('item_1', 'user_123');
        expect(res.json).toHaveBeenCalledWith(mockDeactivatedItem);
      });
    });
    
    describe('deleteMenuItem', () => {
      test('should delete and return success message', async () => {
        // Arrange
        req.params.id = 'item_1';
        
        const mockResult = { success: true, message: 'Menu item deleted successfully' };
        menuService.deleteMenuItem.mockResolvedValue(mockResult);
        
        // Act
        await menuController.deleteMenuItem(req, res);
        
        // Assert
        expect(menuService.deleteMenuItem).toHaveBeenCalledWith('item_1', 'user_123');
        expect(res.json).toHaveBeenCalledWith(mockResult);
      });
    });
    
    describe('bulkUpdateMenuItems', () => {
      test('should update multiple items and return success message', async () => {
        // Arrange
        req.body = {
          ids: ['item_1', 'item_2'],
          data: {
            categoryId: 'cat_new',
            isActive: true
          }
        };
        
        const mockResult = { success: true, count: 2, message: '2 menu items updated successfully' };
        menuService.bulkUpdateMenuItems.mockResolvedValue(mockResult);
        
        // Act
        await menuController.bulkUpdateMenuItems(req, res);
        
        // Assert
        expect(sanitizeObject).toHaveBeenCalledWith(req.body.data);
        expect(menuService.bulkUpdateMenuItems).toHaveBeenCalledWith(
          ['item_1', 'item_2'],
          expect.objectContaining({
            categoryId: 'cat_new',
            isActive: true
          }),
          'user_123'
        );
        expect(res.json).toHaveBeenCalledWith(mockResult);
      });
      
      test('should return 400 when no ids are provided', async () => {
        // Arrange
        req.body = {
          ids: [], // Empty array
          data: { isActive: false }
        };
        
        // Act & Assert
        await expect(async () => {
          await menuController.bulkUpdateMenuItems(req, res);
        }).rejects.toThrow('Menu item IDs are required');
        
        expect(res.status).toHaveBeenCalledWith(400);
      });
      
      test('should return 400 when no data is provided', async () => {
        // Arrange
        req.body = {
          ids: ['item_1', 'item_2'],
          data: {} // Empty object
        };
        
        // Act & Assert
        await expect(async () => {
          await menuController.bulkUpdateMenuItems(req, res);
        }).rejects.toThrow('Update data is required');
        
        expect(res.status).toHaveBeenCalledWith(400);
      });
    });
  });
  
  describe('Menu Category Controllers', () => {
    describe('getMenuCategories', () => {
      test('should return categories for the restaurant', async () => {
        // Arrange
        const mockCategories = [
          { id: 'cat_1', name: 'Pizza', restaurantId: 'rest_1' },
          { id: 'cat_2', name: 'Pasta', restaurantId: 'rest_1' }
        ];
        
        menuService.getMenuCategories.mockResolvedValue(mockCategories);
        
        // Act
        await menuController.getMenuCategories(req, res);
        
        // Assert
        expect(menuService.getMenuCategories).toHaveBeenCalledWith('rest_1', { isActive: undefined });
        expect(res.json).toHaveBeenCalledWith(mockCategories);
      });
      
      test('should filter by isActive when provided', async () => {
        // Arrange
        req.query.isActive = 'true';
        
        const mockCategories = [
          { id: 'cat_1', name: 'Pizza', restaurantId: 'rest_1', isActive: true }
        ];
        
        menuService.getMenuCategories.mockResolvedValue(mockCategories);
        
        // Act
        await menuController.getMenuCategories(req, res);
        
        // Assert
        expect(menuService.getMenuCategories).toHaveBeenCalledWith('rest_1', { isActive: 'true' });
        expect(res.json).toHaveBeenCalledWith(mockCategories);
      });
    });
    
    describe('getMenuCategoryById', () => {
      test('should return a category when a valid ID is provided', async () => {
        // Arrange
        req.params.id = 'cat_1';
        
        const mockCategory = { id: 'cat_1', name: 'Pizza', restaurantId: 'rest_1' };
        menuService.getMenuCategoryById.mockResolvedValue(mockCategory);
        
        // Act
        await menuController.getMenuCategoryById(req, res);
        
        // Assert
        expect(menuService.getMenuCategoryById).toHaveBeenCalledWith('cat_1');
        expect(res.json).toHaveBeenCalledWith(mockCategory);
      });
    });
    
    describe('createMenuCategory', () => {
      test('should create and return a new category', async () => {
        // Arrange
        req.body = {
          name: 'New Category',
          description: 'Description for new category'
        };
        
        const mockCreatedCategory = {
          id: 'new_cat_1',
          restaurantId: 'rest_1',
          name: 'New Category',
          description: 'Description for new category',
          displayOrder: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        menuService.createMenuCategory.mockResolvedValue(mockCreatedCategory);
        
        // Act
        await menuController.createMenuCategory(req, res);
        
        // Assert
        expect(sanitizeObject).toHaveBeenCalledWith(req.body);
        expect(menuService.createMenuCategory).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Category',
            description: 'Description for new category',
            restaurantId: 'rest_1'
          }),
          'user_123'
        );
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(mockCreatedCategory);
      });
    });
    
    describe('updateMenuCategory', () => {
      test('should update and return the category', async () => {
        // Arrange
        req.params.id = 'cat_1';
        req.body = {
          name: 'Updated Category',
          displayOrder: 2,
          restaurantId: 'should_be_ignored',
          id: 'should_be_ignored'
        };
        
        const mockUpdatedCategory = {
          id: 'cat_1',
          restaurantId: 'rest_1',
          name: 'Updated Category',
          displayOrder: 2,
          isActive: true
        };
        
        menuService.updateMenuCategory.mockResolvedValue(mockUpdatedCategory);
        
        // Act
        await menuController.updateMenuCategory(req, res);
        
        // Assert
        expect(sanitizeObject).toHaveBeenCalledWith(req.body);
        expect(menuService.updateMenuCategory).toHaveBeenCalledWith(
          'cat_1',
          expect.objectContaining({
            name: 'Updated Category',
            displayOrder: 2
          }),
          'user_123'
        );
        
        // Make sure unauthorized fields are not passed
        expect(menuService.updateMenuCategory).toHaveBeenCalledWith(
          'cat_1',
          expect.not.objectContaining({
            restaurantId: 'should_be_ignored',
            id: 'should_be_ignored'
          }),
          'user_123'
        );
        
        expect(res.json).toHaveBeenCalledWith(mockUpdatedCategory);
      });
    });
    
    describe('deleteMenuCategory', () => {
      test('should delete and return success message', async () => {
        // Arrange
        req.params.id = 'cat_1';
        
        const mockResult = { success: true, message: 'Menu category deleted successfully' };
        menuService.deleteMenuCategory.mockResolvedValue(mockResult);
        
        // Act
        await menuController.deleteMenuCategory(req, res);
        
        // Assert
        expect(menuService.deleteMenuCategory).toHaveBeenCalledWith('cat_1', 'user_123');
        expect(res.json).toHaveBeenCalledWith(mockResult);
      });
    });
    
    describe('updateCategoryOrder', () => {
      test('should update categories order and return success message', async () => {
        // Arrange
        req.body = {
          categoryOrders: [
            { id: 'cat_1', order: 2 },
            { id: 'cat_2', order: 1 }
          ]
        };
        
        const mockResult = { success: true, count: 2, message: 'Updated order for 2 categories' };
        menuService.updateCategoryOrder.mockResolvedValue(mockResult);
        
        // Act
        await menuController.updateCategoryOrder(req, res);
        
        // Assert
        expect(menuService.updateCategoryOrder).toHaveBeenCalledWith(
          'rest_1',
          req.body.categoryOrders,
          'user_123'
        );
        expect(res.json).toHaveBeenCalledWith(mockResult);
      });
      
      test('should return 400 when no category orders are provided', async () => {
        // Arrange
        req.body = {
          categoryOrders: [] // Empty array
        };
        
        // Act & Assert
        await expect(async () => {
          await menuController.updateCategoryOrder(req, res);
        }).rejects.toThrow('Category orders are required');
        
        expect(res.status).toHaveBeenCalledWith(400);
      });
    });
  });
  
  // Legacy function tests
  describe('getMenuItemsByCategory', () => {
    test('should get menu items by category', async () => {
      // Arrange
      req.params.category = 'Pizza';
      
      const mockMenuItems = [
        { id: 'menu_1', name: 'Margherita Pizza', price: 10.99, category: 'Pizza' },
        { id: 'menu_2', name: 'Pepperoni Pizza', price: 12.99, category: 'Pizza' }
      ];
      
      menuService.getMenuItemsByCategory.mockResolvedValue(mockMenuItems);
      
      // Act
      await menuController.getMenuItemsByCategory(req, res);
      
      // Assert
      expect(menuService.getMenuItemsByCategory).toHaveBeenCalledWith('Pizza', 'rest_1');
      expect(res.json).toHaveBeenCalledWith(mockMenuItems);
    });
  });
});
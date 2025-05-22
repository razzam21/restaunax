const menuService = require('../../../src/services/menu-service');
const prisma = require('../../../src/db/client');
const auditLogger = require('../../../src/utils/audit-logger');

// Mock Prisma client and audit logger
jest.mock('../../../src/db/client', () => ({
  menuItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  menuCategory: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  $transaction: jest.fn(promises => Promise.all(promises))
}));

jest.mock('../../../src/utils/audit-logger', () => ({
  createAuditLog: jest.fn().mockResolvedValue(true)
}));

describe('Menu Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRestaurantId = 'rest_1';
  const mockUserId = 'user_123';
  
  describe('Menu Item Operations', () => {
    const mockMenuItem = {
      id: 'item_1',
      restaurantId: mockRestaurantId,
      name: 'Test Item',
      description: 'This is a test item',
      price: 9.99,
      categoryId: 'cat_1',
      menuCategory: {
        id: 'cat_1',
        name: 'Test Category'
      },
      isActive: true,
      preparationTime: 15,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    describe('getMenuItems', () => {
      test('should return menu items with pagination', async () => {
        // Arrange
        const mockItems = [mockMenuItem];
        const mockCount = 1;
        
        prisma.menuItem.findMany.mockResolvedValue(mockItems);
        prisma.menuItem.count.mockResolvedValue(mockCount);
        
        // Act
        const result = await menuService.getMenuItems(mockRestaurantId);
        
        // Assert
        expect(prisma.menuItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { restaurantId: mockRestaurantId },
            include: { menuCategory: true }
          })
        );
        expect(result.items).toEqual(mockItems);
        expect(result.pagination).toEqual({
          page: 1,
          limit: 50,
          totalItems: mockCount,
          totalPages: 1
        });
      });
      
      test('should filter by categoryId when provided', async () => {
        // Arrange
        const mockCategoryId = 'cat_1';
        prisma.menuItem.findMany.mockResolvedValue([mockMenuItem]);
        prisma.menuItem.count.mockResolvedValue(1);
        
        // Act
        await menuService.getMenuItems(mockRestaurantId, { categoryId: mockCategoryId });
        
        // Assert
        expect(prisma.menuItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { 
              restaurantId: mockRestaurantId,
              categoryId: mockCategoryId
            }
          })
        );
      });
      
      test('should filter by isActive when provided', async () => {
        // Arrange
        prisma.menuItem.findMany.mockResolvedValue([mockMenuItem]);
        prisma.menuItem.count.mockResolvedValue(1);
        
        // Act
        await menuService.getMenuItems(mockRestaurantId, { isActive: true });
        
        // Assert
        expect(prisma.menuItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { 
              restaurantId: mockRestaurantId,
              isActive: true
            }
          })
        );
      });
      
      test('should search by name or description when search term provided', async () => {
        // Arrange
        const searchTerm = 'test';
        prisma.menuItem.findMany.mockResolvedValue([mockMenuItem]);
        prisma.menuItem.count.mockResolvedValue(1);
        
        // Act
        await menuService.getMenuItems(mockRestaurantId, { search: searchTerm });
        
        // Assert
        expect(prisma.menuItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { 
              restaurantId: mockRestaurantId,
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } }
              ]
            }
          })
        );
      });
    });
    
    describe('getMenuItemById', () => {
      test('should return a menu item when found', async () => {
        // Arrange
        prisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
        
        // Act
        const result = await menuService.getMenuItemById(mockMenuItem.id);
        
        // Assert
        expect(prisma.menuItem.findUnique).toHaveBeenCalledWith({
          where: { id: mockMenuItem.id },
          include: { menuCategory: true }
        });
        expect(result).toEqual(mockMenuItem);
      });
      
      test('should throw error when menu item not found', async () => {
        // Arrange
        prisma.menuItem.findUnique.mockResolvedValue(null);
        
        // Act & Assert
        await expect(menuService.getMenuItemById('nonexistent_id'))
          .rejects
          .toThrow('Menu item not found');
      });
    });
    
    describe('createMenuItem', () => {
      test('should create and return a new menu item', async () => {
        // Arrange
        const newItemData = {
          restaurantId: mockRestaurantId,
          name: 'New Item',
          description: 'New item description',
          price: 12.99,
          categoryId: 'cat_1'
        };
        
        prisma.menuItem.create.mockResolvedValue({
          ...newItemData,
          id: 'new_item_1',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Act
        const result = await menuService.createMenuItem(newItemData, mockUserId);
        
        // Assert
        expect(prisma.menuItem.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              restaurantId: newItemData.restaurantId,
              name: newItemData.name,
              price: newItemData.price,
              createdBy: mockUserId,
              updatedBy: mockUserId
            })
          })
        );
        expect(auditLogger.createAuditLog).toHaveBeenCalledWith(
          mockUserId,
          'create_menu_item',
          expect.any(Object)
        );
        expect(result.id).toBe('new_item_1');
      });
    });
    
    describe('updateMenuItem', () => {
      test('should update and return the menu item', async () => {
        // Arrange
        const itemId = 'item_1';
        const updateData = {
          name: 'Updated Name',
          price: 14.99
        };
        
        prisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
        prisma.menuItem.update.mockResolvedValue({
          ...mockMenuItem,
          ...updateData
        });
        
        // Act
        const result = await menuService.updateMenuItem(itemId, updateData, mockUserId);
        
        // Assert
        expect(prisma.menuItem.findUnique).toHaveBeenCalledWith({
          where: { id: itemId }
        });
        expect(prisma.menuItem.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: itemId },
            data: expect.objectContaining({
              name: updateData.name,
              price: updateData.price,
              updatedBy: mockUserId
            })
          })
        );
        expect(auditLogger.createAuditLog).toHaveBeenCalledWith(
          mockUserId,
          'update_menu_item',
          expect.objectContaining({
            menuItemId: itemId,
            updatedFields: ['name', 'price']
          })
        );
        expect(result.name).toBe(updateData.name);
        expect(result.price).toBe(updateData.price);
      });
      
      test('should throw error when menu item not found', async () => {
        // Arrange
        prisma.menuItem.findUnique.mockResolvedValue(null);
        
        // Act & Assert
        await expect(menuService.updateMenuItem('nonexistent_id', { name: 'New Name' }, mockUserId))
          .rejects
          .toThrow('Menu item not found');
      });
    });
    
    describe('deactivateMenuItem', () => {
      test('should soft delete a menu item by setting isActive to false', async () => {
        // Arrange
        const itemId = 'item_1';
        
        prisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
        prisma.menuItem.update.mockResolvedValue({
          ...mockMenuItem,
          isActive: false
        });
        
        // Act
        const result = await menuService.deactivateMenuItem(itemId, mockUserId);
        
        // Assert
        expect(prisma.menuItem.findUnique).toHaveBeenCalledWith({
          where: { id: itemId }
        });
        expect(prisma.menuItem.update).toHaveBeenCalledWith({
          where: { id: itemId },
          data: { isActive: false, updatedBy: mockUserId }
        });
        expect(auditLogger.createAuditLog).toHaveBeenCalledWith(
          mockUserId,
          'deactivate_menu_item',
          expect.any(Object)
        );
        expect(result.isActive).toBe(false);
      });
      
      test('should throw error when menu item not found', async () => {
        // Arrange
        prisma.menuItem.findUnique.mockResolvedValue(null);
        
        // Act & Assert
        await expect(menuService.deactivateMenuItem('nonexistent_id', mockUserId))
          .rejects
          .toThrow('Menu item not found');
      });
    });
    
    describe('deleteMenuItem', () => {
      test('should permanently delete a menu item', async () => {
        // Arrange
        const itemId = 'item_1';
        
        prisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
        prisma.menuItem.delete.mockResolvedValue({ success: true });
        
        // Act
        const result = await menuService.deleteMenuItem(itemId, mockUserId);
        
        // Assert
        expect(prisma.menuItem.findUnique).toHaveBeenCalledWith({
          where: { id: itemId }
        });
        expect(prisma.menuItem.delete).toHaveBeenCalledWith({
          where: { id: itemId }
        });
        expect(auditLogger.createAuditLog).toHaveBeenCalledWith(
          mockUserId,
          'delete_menu_item',
          expect.any(Object)
        );
        expect(result.success).toBe(true);
      });
      
      test('should throw error when menu item not found', async () => {
        // Arrange
        prisma.menuItem.findUnique.mockResolvedValue(null);
        
        // Act & Assert
        await expect(menuService.deleteMenuItem('nonexistent_id', mockUserId))
          .rejects
          .toThrow('Menu item not found');
      });
    });
    
    describe('bulkUpdateMenuItems', () => {
      test('should update multiple menu items', async () => {
        // Arrange
        const itemIds = ['item_1', 'item_2'];
        const updateData = { categoryId: 'new_cat_1' };
        
        prisma.menuItem.findMany.mockResolvedValue([
          { id: 'item_1', restaurantId: mockRestaurantId, name: 'Item 1' },
          { id: 'item_2', restaurantId: mockRestaurantId, name: 'Item 2' }
        ]);
        prisma.menuItem.updateMany.mockResolvedValue({ count: 2 });
        
        // Act
        const result = await menuService.bulkUpdateMenuItems(itemIds, updateData, mockUserId);
        
        // Assert
        expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
          where: { id: { in: itemIds } },
          select: expect.any(Object)
        });
        expect(prisma.menuItem.updateMany).toHaveBeenCalledWith({
          where: { id: { in: itemIds } },
          data: expect.objectContaining({
            categoryId: updateData.categoryId,
            updatedBy: mockUserId
          })
        });
        expect(auditLogger.createAuditLog).toHaveBeenCalledWith(
          mockUserId,
          'bulk_update_menu_items',
          expect.any(Object)
        );
        expect(result.success).toBe(true);
        expect(result.count).toBe(2);
      });
      
      test('should throw error when no valid item IDs provided', async () => {
        // Arrange
        prisma.menuItem.findMany.mockResolvedValue([]);
        
        // Act & Assert
        await expect(menuService.bulkUpdateMenuItems(['nonexistent_id'], { isActive: false }, mockUserId))
          .rejects
          .toThrow('No valid menu items found');
      });
    });
  });
  
  describe('Menu Category Operations', () => {
    const mockCategory = {
      id: 'cat_1',
      restaurantId: mockRestaurantId,
      name: 'Test Category',
      description: 'This is a test category',
      displayOrder: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    describe('getMenuCategories', () => {
      test('should return menu categories for restaurant', async () => {
        // Arrange
        const mockCategories = [mockCategory];
        prisma.menuCategory.findMany.mockResolvedValue(mockCategories);
        
        // Act
        const result = await menuService.getMenuCategories(mockRestaurantId);
        
        // Assert
        expect(prisma.menuCategory.findMany).toHaveBeenCalledWith({
          where: { restaurantId: mockRestaurantId },
          orderBy: { displayOrder: 'asc' }
        });
        expect(result).toEqual(mockCategories);
      });
      
      test('should filter by isActive when provided', async () => {
        // Arrange
        prisma.menuCategory.findMany.mockResolvedValue([mockCategory]);
        
        // Act
        await menuService.getMenuCategories(mockRestaurantId, { isActive: true });
        
        // Assert
        expect(prisma.menuCategory.findMany).toHaveBeenCalledWith({
          where: { 
            restaurantId: mockRestaurantId,
            isActive: true
          },
          orderBy: { displayOrder: 'asc' }
        });
      });
    });
    
    describe('getMenuCategoryById', () => {
      test('should return a category when found', async () => {
        // Arrange
        prisma.menuCategory.findUnique.mockResolvedValue(mockCategory);
        
        // Act
        const result = await menuService.getMenuCategoryById(mockCategory.id);
        
        // Assert
        expect(prisma.menuCategory.findUnique).toHaveBeenCalledWith({
          where: { id: mockCategory.id }
        });
        expect(result).toEqual(mockCategory);
      });
      
      test('should throw error when category not found', async () => {
        // Arrange
        prisma.menuCategory.findUnique.mockResolvedValue(null);
        
        // Act & Assert
        await expect(menuService.getMenuCategoryById('nonexistent_id'))
          .rejects
          .toThrow('Menu category not found');
      });
    });
    
    describe('createMenuCategory', () => {
      test('should create and return a new category', async () => {
        // Arrange
        const newCategoryData = {
          restaurantId: mockRestaurantId,
          name: 'New Category',
          description: 'New category description'
        };
        
        prisma.menuCategory.create.mockResolvedValue({
          ...newCategoryData,
          id: 'new_cat_1',
          displayOrder: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Act
        const result = await menuService.createMenuCategory(newCategoryData, mockUserId);
        
        // Assert
        expect(prisma.menuCategory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            restaurantId: newCategoryData.restaurantId,
            name: newCategoryData.name,
            description: newCategoryData.description
          })
        });
        expect(auditLogger.createAuditLog).toHaveBeenCalledWith(
          mockUserId,
          'create_menu_category',
          expect.any(Object)
        );
        expect(result.id).toBe('new_cat_1');
      });
    });
    
    describe('updateMenuCategory', () => {
      test('should update and return the category', async () => {
        // Arrange
        const categoryId = 'cat_1';
        const updateData = {
          name: 'Updated Category',
          displayOrder: 2
        };
        
        prisma.menuCategory.findUnique.mockResolvedValue(mockCategory);
        prisma.menuCategory.update.mockResolvedValue({
          ...mockCategory,
          ...updateData
        });
        
        // Act
        const result = await menuService.updateMenuCategory(categoryId, updateData, mockUserId);
        
        // Assert
        expect(prisma.menuCategory.findUnique).toHaveBeenCalledWith({
          where: { id: categoryId }
        });
        expect(prisma.menuCategory.update).toHaveBeenCalledWith({
          where: { id: categoryId },
          data: expect.objectContaining({
            name: updateData.name,
            displayOrder: updateData.displayOrder
          })
        });
        expect(auditLogger.createAuditLog).toHaveBeenCalledWith(
          mockUserId,
          'update_menu_category',
          expect.any(Object)
        );
        expect(result.name).toBe(updateData.name);
        expect(result.displayOrder).toBe(updateData.displayOrder);
      });
      
      test('should throw error when category not found', async () => {
        // Arrange
        prisma.menuCategory.findUnique.mockResolvedValue(null);
        
        // Act & Assert
        await expect(menuService.updateMenuCategory('nonexistent_id', { name: 'New Name' }, mockUserId))
          .rejects
          .toThrow('Menu category not found');
      });
    });
    
    describe('deleteMenuCategory', () => {
      test('should delete a category when it has no items', async () => {
        // Arrange
        const categoryId = 'cat_1';
        
        prisma.menuItem.count.mockResolvedValue(0); // No items using this category
        prisma.menuCategory.findUnique.mockResolvedValue(mockCategory);
        prisma.menuCategory.delete.mockResolvedValue({ success: true });
        
        // Act
        const result = await menuService.deleteMenuCategory(categoryId, mockUserId);
        
        // Assert
        expect(prisma.menuItem.count).toHaveBeenCalledWith({
          where: { categoryId }
        });
        expect(prisma.menuCategory.findUnique).toHaveBeenCalledWith({
          where: { id: categoryId }
        });
        expect(prisma.menuCategory.delete).toHaveBeenCalledWith({
          where: { id: categoryId }
        });
        expect(auditLogger.createAuditLog).toHaveBeenCalledWith(
          mockUserId,
          'delete_menu_category',
          expect.any(Object)
        );
        expect(result.success).toBe(true);
      });
      
      test('should throw error when category has menu items', async () => {
        // Arrange
        prisma.menuItem.count.mockResolvedValue(3); // 3 items using this category
        
        // Act & Assert
        await expect(menuService.deleteMenuCategory('cat_with_items', mockUserId))
          .rejects
          .toThrow('Cannot delete category with 3 menu items. Remove items first.');
      });
      
      test('should throw error when category not found', async () => {
        // Arrange
        prisma.menuItem.count.mockResolvedValue(0);
        prisma.menuCategory.findUnique.mockResolvedValue(null);
        
        // Act & Assert
        await expect(menuService.deleteMenuCategory('nonexistent_id', mockUserId))
          .rejects
          .toThrow('Menu category not found');
      });
    });
    
    describe('updateCategoryOrder', () => {
      test('should update the display order of multiple categories', async () => {
        // Arrange
        const categoryOrders = [
          { id: 'cat_1', order: 2 },
          { id: 'cat_2', order: 1 }
        ];
        
        prisma.menuCategory.update.mockImplementation((params) => {
          return Promise.resolve({
            id: params.where.id,
            restaurantId: mockRestaurantId,
            name: 'Category',
            displayOrder: params.data.displayOrder
          });
        });
        
        // Act
        const result = await menuService.updateCategoryOrder(mockRestaurantId, categoryOrders, mockUserId);
        
        // Assert
        expect(prisma.$transaction).toHaveBeenCalled();
        expect(prisma.menuCategory.update).toHaveBeenCalledTimes(2);
        expect(auditLogger.createAuditLog).toHaveBeenCalledWith(
          mockUserId,
          'reorder_menu_categories',
          expect.any(Object)
        );
        expect(result.success).toBe(true);
        expect(result.count).toBe(2);
      });
      
      test('should throw error when no category orders provided', async () => {
        // Act & Assert
        await expect(menuService.updateCategoryOrder(mockRestaurantId, [], mockUserId))
          .rejects
          .toThrow('Invalid category order data');
      });
    });
  });
  
  // Legacy function test (for backward compatibility)
  describe('getMenuItemsByCategory', () => {
    test('should get menu items by category', async () => {
      // Arrange
      const mockMenuItems = [
        { id: 'menu_1', name: 'Margherita Pizza', price: 10.99, category: 'Pizza' },
        { id: 'menu_2', name: 'Pepperoni Pizza', price: 12.99, category: 'Pizza' },
      ];
      prisma.menuItem.findMany.mockResolvedValue(mockMenuItems);
      const category = 'Pizza';

      // Act
      const result = await menuService.getMenuItemsByCategory(category);

      // Assert
      expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 'rest_1', category },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockMenuItems);
    });
  });
});
const menuService = require('../../../src/services/menu-service');
const prisma = require('../../../src/db/client');

// Mock Prisma client
jest.mock('../../../src/db/client', () => ({
  menuItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
}));

describe('Menu Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMenuItems', () => {
    test('should get all menu items for the default restaurant', async () => {
      // Arrange
      const mockMenuItems = [
        { id: 'menu_1', name: 'Pizza', price: 10.99 },
        { id: 'menu_2', name: 'Pasta', price: 12.99 },
      ];
      prisma.menuItem.findMany.mockResolvedValue(mockMenuItems);

      // Act
      const result = await menuService.getMenuItems();

      // Assert
      expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 'rest_1' },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockMenuItems);
    });

    test('should get all menu items for a specific restaurant', async () => {
      // Arrange
      const mockMenuItems = [
        { id: 'menu_1', name: 'Pizza', price: 10.99 },
        { id: 'menu_2', name: 'Pasta', price: 12.99 },
      ];
      prisma.menuItem.findMany.mockResolvedValue(mockMenuItems);
      const restaurantId = 'rest_2';

      // Act
      const result = await menuService.getMenuItems(restaurantId);

      // Assert
      expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { restaurantId },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockMenuItems);
    });
  });

  describe('getMenuItemById', () => {
    test('should get menu item by ID', async () => {
      // Arrange
      const mockMenuItem = { id: 'menu_1', name: 'Pizza', price: 10.99 };
      prisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);

      // Act
      const result = await menuService.getMenuItemById('menu_1');

      // Assert
      expect(prisma.menuItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'menu_1' },
      });
      expect(result).toEqual(mockMenuItem);
    });

    test('should throw error when menu item is not found', async () => {
      // Arrange
      prisma.menuItem.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(menuService.getMenuItemById('nonexistent')).rejects.toThrow('Menu item not found');
    });
  });

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

    test('should get menu items by category for specific restaurant', async () => {
      // Arrange
      const mockMenuItems = [
        { id: 'menu_1', name: 'Margherita Pizza', price: 10.99, category: 'Pizza' },
        { id: 'menu_2', name: 'Pepperoni Pizza', price: 12.99, category: 'Pizza' },
      ];
      prisma.menuItem.findMany.mockResolvedValue(mockMenuItems);
      const category = 'Pizza';
      const restaurantId = 'rest_2';

      // Act
      const result = await menuService.getMenuItemsByCategory(category, restaurantId);

      // Assert
      expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { restaurantId, category },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockMenuItems);
    });
  });
});
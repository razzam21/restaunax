const prisma = require('../db/client');

// Get all menu items for a restaurant
const getMenuItems = async (restaurantId = 'rest_1') => {
  return prisma.menuItem.findMany({
    where: {
      restaurantId
    },
    orderBy: {
      name: 'asc'
    }
  });
};

// Get a menu item by ID
const getMenuItemById = async (id) => {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id }
  });

  if (!menuItem) {
    const error = new Error('Menu item not found');
    error.statusCode = 404;
    throw error;
  }

  return menuItem;
};

// Get menu items by category
const getMenuItemsByCategory = async (category, restaurantId = 'rest_1') => {
  return prisma.menuItem.findMany({
    where: {
      restaurantId,
      category
    },
    orderBy: {
      name: 'asc'
    }
  });
};

module.exports = {
  getMenuItems,
  getMenuItemById,
  getMenuItemsByCategory
};
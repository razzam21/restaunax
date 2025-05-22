const prisma = require('../db/client');
const sanitizeHtml = require('sanitize-html');
const auditLogger = require('../utils/audit-logger');

/**
 * Menu Item Operations
 */

// Get all menu items for a restaurant with filtering options
const getMenuItems = async (
  restaurantId, 
  { 
    categoryId = null, 
    isActive = null, 
    search = null,
    page = 1,
    limit = 50
  } = {}
) => {
  // Calculate pagination
  const skip = (page - 1) * limit;
  
  // Build where clause based on filters
  const where = { restaurantId };
  
  if (categoryId) {
    where.categoryId = categoryId;
  }
  
  if (isActive !== null) {
    where.isActive = isActive === 'true' || isActive === true;
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  // Execute query with pagination
  const [menuItems, totalCount] = await Promise.all([
    prisma.menuItem.findMany({
      where,
      include: {
        menuCategory: true
      },
      orderBy: [
        { menuCategory: { displayOrder: 'asc' } },
        { name: 'asc' }
      ],
      skip,
      take: limit
    }),
    prisma.menuItem.count({ where })
  ]);

  return {
    items: menuItems,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalItems: totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  };
};

// Get a menu item by ID
const getMenuItemById = async (id) => {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id },
    include: {
      menuCategory: true
    }
  });

  if (!menuItem) {
    const error = new Error('Menu item not found');
    error.statusCode = 404;
    throw error;
  }

  return menuItem;
};

// Create a new menu item
const createMenuItem = async (data, userId) => {
  // Sanitize inputs
  const sanitizedData = {
    ...data,
    name: sanitizeHtml(data.name),
    description: data.description ? sanitizeHtml(data.description) : null,
    createdBy: userId,
    updatedBy: userId
  };

  // Create the menu item
  const menuItem = await prisma.menuItem.create({
    data: sanitizedData,
    include: {
      menuCategory: true
    }
  });

  // Log the creation in audit log
  await auditLogger.createAuditLog(userId, 'create_menu_item', {
    menuItemId: menuItem.id,
    restaurantId: menuItem.restaurantId
  });

  return menuItem;
};

// Update a menu item
const updateMenuItem = async (id, data, userId) => {
  // Validate the item exists
  const existingItem = await prisma.menuItem.findUnique({
    where: { id }
  });

  if (!existingItem) {
    const error = new Error('Menu item not found');
    error.statusCode = 404;
    throw error;
  }

  // Sanitize inputs
  const sanitizedData = {
    ...data,
    name: data.name ? sanitizeHtml(data.name) : undefined,
    description: data.description ? sanitizeHtml(data.description) : undefined,
    updatedBy: userId
  };

  // Update the item
  const updatedItem = await prisma.menuItem.update({
    where: { id },
    data: sanitizedData,
    include: {
      menuCategory: true
    }
  });

  // Log the update in audit log
  await auditLogger.createAuditLog(userId, 'update_menu_item', {
    menuItemId: id,
    restaurantId: updatedItem.restaurantId,
    updatedFields: Object.keys(data)
  });

  return updatedItem;
};

// Delete a menu item (soft delete by setting isActive to false)
const deactivateMenuItem = async (id, userId) => {
  // Validate the item exists
  const existingItem = await prisma.menuItem.findUnique({
    where: { id }
  });

  if (!existingItem) {
    const error = new Error('Menu item not found');
    error.statusCode = 404;
    throw error;
  }

  // Soft delete (set isActive to false)
  const deactivatedItem = await prisma.menuItem.update({
    where: { id },
    data: { 
      isActive: false,
      updatedBy: userId
    }
  });

  // Log the deactivation in audit log
  await auditLogger.createAuditLog(userId, 'deactivate_menu_item', {
    menuItemId: id,
    restaurantId: deactivatedItem.restaurantId
  });

  return deactivatedItem;
};

// Permanently delete a menu item (only for owner role)
const deleteMenuItem = async (id, userId) => {
  // Validate the item exists
  const existingItem = await prisma.menuItem.findUnique({
    where: { id }
  });

  if (!existingItem) {
    const error = new Error('Menu item not found');
    error.statusCode = 404;
    throw error;
  }

  // Delete the item
  await prisma.menuItem.delete({
    where: { id }
  });

  // Log the deletion in audit log
  await auditLogger.createAuditLog(userId, 'delete_menu_item', {
    menuItemId: id,
    restaurantId: existingItem.restaurantId,
    itemName: existingItem.name
  });

  return { success: true, message: 'Menu item deleted successfully' };
};

// Bulk update menu items (for actions like changing category, toggling active status)
const bulkUpdateMenuItems = async (itemIds, data, userId) => {
  // Validate itemIds is an array
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    const error = new Error('No menu items specified for bulk update');
    error.statusCode = 400;
    throw error;
  }

  // Sanitize inputs
  const sanitizedData = {
    ...data,
    updatedBy: userId
  };

  // Get existing items to log the update
  const existingItems = await prisma.menuItem.findMany({
    where: {
      id: { in: itemIds }
    },
    select: {
      id: true,
      restaurantId: true,
      name: true
    }
  });

  if (existingItems.length === 0) {
    const error = new Error('No valid menu items found');
    error.statusCode = 404;
    throw error;
  }

  // Perform the bulk update
  const { count } = await prisma.menuItem.updateMany({
    where: {
      id: { in: itemIds }
    },
    data: sanitizedData
  });

  // Log the bulk update
  await auditLogger.createAuditLog(userId, 'bulk_update_menu_items', {
    menuItemIds: itemIds,
    restaurantId: existingItems[0].restaurantId,
    updatedFields: Object.keys(data),
    affectedCount: count
  });

  return { success: true, count, message: `${count} menu items updated successfully` };
};

/**
 * Menu Category Operations
 */

// Get all categories for a restaurant
const getMenuCategories = async (restaurantId, { isActive = null } = {}) => {
  // Build where clause based on filters
  const where = { restaurantId };
  
  if (isActive !== null) {
    where.isActive = isActive === 'true' || isActive === true;
  }
  
  // Execute query
  const categories = await prisma.menuCategory.findMany({
    where,
    orderBy: {
      displayOrder: 'asc'
    }
  });

  return categories;
};

// Get a category by ID
const getMenuCategoryById = async (id) => {
  const category = await prisma.menuCategory.findUnique({
    where: { id }
  });

  if (!category) {
    const error = new Error('Menu category not found');
    error.statusCode = 404;
    throw error;
  }

  return category;
};

// Create a new category
const createMenuCategory = async (data, userId) => {
  // Sanitize inputs
  const sanitizedData = {
    ...data,
    name: sanitizeHtml(data.name),
    description: data.description ? sanitizeHtml(data.description) : null
  };

  try {
    // Create the category
    const category = await prisma.menuCategory.create({
      data: sanitizedData
    });

    // Log the creation in audit log
    await auditLogger.createAuditLog(userId, 'create_menu_category', {
      categoryId: category.id,
      restaurantId: category.restaurantId
    });

    return category;
  } catch (error) {
    // Handle unique constraint violation
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      const duplicateError = new Error(`A category with the name "${sanitizedData.name}" already exists for this restaurant`);
      duplicateError.statusCode = 409; // Conflict
      throw duplicateError;
    }
    
    // Re-throw other errors
    throw error;
  }
};

// Update a category
const updateMenuCategory = async (id, data, userId) => {
  // Validate the category exists
  const existingCategory = await prisma.menuCategory.findUnique({
    where: { id }
  });

  if (!existingCategory) {
    const error = new Error('Menu category not found');
    error.statusCode = 404;
    throw error;
  }

  // Sanitize inputs
  const sanitizedData = {
    ...data,
    name: data.name ? sanitizeHtml(data.name) : undefined,
    description: data.description ? sanitizeHtml(data.description) : undefined
  };

  // Update the category
  const updatedCategory = await prisma.menuCategory.update({
    where: { id },
    data: sanitizedData
  });

  // Log the update in audit log
  await auditLogger.createAuditLog(userId, 'update_menu_category', {
    categoryId: id,
    restaurantId: updatedCategory.restaurantId,
    updatedFields: Object.keys(data)
  });

  return updatedCategory;
};

// Delete a category (only if no menu items are linked)
const deleteMenuCategory = async (id, userId) => {
  // Check if any menu items use this category
  const itemCount = await prisma.menuItem.count({
    where: { categoryId: id }
  });

  if (itemCount > 0) {
    const error = new Error(`Cannot delete category with ${itemCount} menu items. Remove items first.`);
    error.statusCode = 400;
    throw error;
  }

  // Validate the category exists
  const existingCategory = await prisma.menuCategory.findUnique({
    where: { id }
  });

  if (!existingCategory) {
    const error = new Error('Menu category not found');
    error.statusCode = 404;
    throw error;
  }

  // Delete the category
  await prisma.menuCategory.delete({
    where: { id }
  });

  // Log the deletion in audit log
  await auditLogger.createAuditLog(userId, 'delete_menu_category', {
    categoryId: id,
    restaurantId: existingCategory.restaurantId,
    categoryName: existingCategory.name
  });

  return { success: true, message: 'Menu category deleted successfully' };
};

// Update the display order of multiple categories
const updateCategoryOrder = async (restaurantId, categoryOrders, userId) => {
  // Validate the input
  if (!Array.isArray(categoryOrders) || categoryOrders.length === 0) {
    const error = new Error('Invalid category order data');
    error.statusCode = 400;
    throw error;
  }

  // Update each category's display order in a transaction
  const updates = await prisma.$transaction(
    categoryOrders.map(item => {
      return prisma.menuCategory.update({
        where: { 
          id: item.id,
          restaurantId // Ensure we only update categories for this restaurant
        },
        data: { displayOrder: item.order }
      });
    })
  );

  // Log the reordering
  await auditLogger.createAuditLog(userId, 'reorder_menu_categories', {
    restaurantId,
    categoryIds: categoryOrders.map(item => item.id)
  });

  return { 
    success: true, 
    count: updates.length, 
    message: `Updated order for ${updates.length} categories` 
  };
};

// Get menu items by category (keep for backward compatibility)
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
  // Menu Items
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deactivateMenuItem,
  deleteMenuItem,
  bulkUpdateMenuItems,
  
  // Menu Categories
  getMenuCategories,
  getMenuCategoryById,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  updateCategoryOrder,
  
  // Legacy function (keep for backward compatibility)
  getMenuItemsByCategory
};
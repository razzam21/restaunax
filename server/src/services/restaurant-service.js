const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createLogger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { logRestaurantUpdate } = require('../utils/audit-logger');

const logger = createLogger('restaurant-service');

/**
 * Get restaurant details by ID
 * @param {string} id - Restaurant ID
 * @returns {Promise<Object>} Restaurant data
 */
const getRestaurantById = async (id) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id }
    });
    
    if (!restaurant) {
      const error = new Error(`Restaurant with ID ${id} not found`);
      error.statusCode = 404;
      throw error;
    }
    
    return restaurant;
  } catch (error) {
    logger.error({
      message: 'Error getting restaurant',
      error,
      restaurantId: id,
      context: 'getRestaurantById'
    });
    throw error;
  }
};

/**
 * Get restaurant theme settings
 * @param {string} id - Restaurant ID
 * @returns {Promise<Object>} Theme settings
 */
const getRestaurantTheme = async (id) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        themeId: true,
        primaryColor: true,
        secondaryColor: true
      }
    });
    
    if (!restaurant) {
      const error = new Error(`Restaurant with ID ${id} not found`);
      error.statusCode = 404;
      throw error;
    }
    
    // Create a descriptive log of what we found
    logger.info({
      message: 'Retrieved restaurant theme data',
      restaurantId: id,
      themeId: restaurant.themeId,
      primaryColor: restaurant.primaryColor,
      secondaryColor: restaurant.secondaryColor,
      context: 'getRestaurantTheme'
    });
    
    // Ensure sensible defaults if values are missing
    const themeId = restaurant.themeId || restaurant.id;
    const primaryColor = restaurant.primaryColor || '#2C4A7A';
    const secondaryColor = restaurant.secondaryColor || '#D97A3A';
    
    return {
      id: restaurant.id,
      name: restaurant.name,
      theme: {
        id: themeId,
        primaryColor: primaryColor,
        secondaryColor: secondaryColor
      }
    };
  } catch (error) {
    logger.error({
      message: 'Error getting restaurant theme',
      error,
      restaurantId: id,
      context: 'getRestaurantTheme'
    });
    throw error;
  }
};

/**
 * Update restaurant settings
 * @param {string} id - Restaurant ID
 * @param {Object} data - Updated restaurant data
 * @param {string} userId - User ID making the update
 * @param {string} userRole - User role making the update
 * @returns {Promise<Object>} Updated restaurant data
 */
const updateRestaurantSettings = async (id, data, userId, userRole) => {
  try {
    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!restaurant) {
      const error = new Error(`Restaurant with ID ${id} not found`);
      error.statusCode = 404;
      throw error;
    }
    
    // Check if user has owner role
    if (userRole !== 'owner') {
      const error = new Error('Only restaurant owners can update restaurant settings');
      error.statusCode = 403;
      throw error;
    }
    
    // Prepare update data (only allow certain fields to be updated)
    const updateData = {};
    
    // Allow name update
    if (data.name) {
      updateData.name = data.name;
    }
    
    // Allow theme update - ensure it's a string type
    if (data.themeId !== undefined && data.themeId !== null) {
      // Make sure themeId is a string (could be empty string for default)
      updateData.themeId = String(data.themeId);
    }
    
    // Allow color updates - validate hex colors
    if (data.primaryColor) {
      // Ensure valid hex color format
      if (/^#[0-9A-Fa-f]{6}$/.test(data.primaryColor)) {
        updateData.primaryColor = data.primaryColor;
      } else {
        throw new Error('Primary color must be a valid hex color (e.g., #2C4A7A)');
      }
    }
    
    if (data.secondaryColor) {
      // Ensure valid hex color format
      if (/^#[0-9A-Fa-f]{6}$/.test(data.secondaryColor)) {
        updateData.secondaryColor = data.secondaryColor;
      } else {
        throw new Error('Secondary color must be a valid hex color (e.g., #D97A3A)');
      }
    }
    
    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    // Log what we're about to update
    logger.info({
      message: 'Attempting to update restaurant settings',
      restaurantId: id,
      userId,
      updateData,
      context: 'updateRestaurantSettings'
    });
    
    // Ensure we have a valid userId for audit logging
    let validUserId = userId;
    if (!userId) {
      // Get the owner user ID for this restaurant as a fallback
      try {
        const owner = await prisma.user.findFirst({
          where: { 
            restaurantId: id,
            role: 'owner'
          },
          select: { id: true }
        });
        
        if (owner) {
          validUserId = owner.id;
          logger.info({
            message: 'Using restaurant owner ID for audit log',
            ownerId: owner.id,
            restaurantId: id,
            context: 'updateRestaurantSettings'
          });
        }
      } catch (userError) {
        logger.warn({
          message: 'Failed to find fallback user ID for audit log',
          error: userError,
          restaurantId: id,
          context: 'updateRestaurantSettings'
        });
        // Continue anyway
      }
    }
    
    // Update restaurant
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: updateData
    });
    
    // Log successful update
    logger.info({
      message: 'Restaurant settings updated successfully',
      restaurantId: id,
      userId: validUserId,
      updatedFields: Object.keys(updateData),
      context: 'updateRestaurantSettings'
    });
    
    // Use the dedicated audit logger instead of inline logic
    const auditResult = await logRestaurantUpdate(validUserId || 'user_owner_1', id, updateData);
    
    if (auditResult.success) {
      logger.info({
        message: 'Audit log created for restaurant update',
        auditLogId: auditResult.id,
        restaurantId: id,
        context: 'updateRestaurantSettings'
      });
    } else {
      logger.warn({
        message: 'Audit log creation failed, but restaurant was updated',
        error: auditResult.error,
        restaurantId: id,
        context: 'updateRestaurantSettings'
      });
      // Continue - don't throw the error as the restaurant update was successful
    }
    
    return updatedRestaurant;
  } catch (error) {
    logger.error({
      message: 'Error updating restaurant settings',
      error,
      restaurantId: id,
      userId,
      data,
      context: 'updateRestaurantSettings'
    });
    throw error;
  }
};

/**
 * Get available themes
 * @returns {Promise<Array>} List of available themes
 */
const getAvailableThemes = async () => {
  try {
    // For now, we're returning hard-coded themes
    // In a real-world app, this might come from a database or file system
    return [
      {
        id: 'default',
        name: 'Default Theme',
        description: 'The default Restaunax theme',
        primaryColor: '#2C4A7A',
        secondaryColor: '#D97A3A'
      },
      {
        id: 'rest_1',
        name: 'Blue Ocean Theme',
        description: 'Deep blue tones with orange accents',
        primaryColor: '#1A365D',
        secondaryColor: '#9C4221'
      },
      {
        id: 'rest_2',
        name: 'Forest Theme',
        description: 'Forest green with purple accents',
        primaryColor: '#276749',
        secondaryColor: '#805AD5'
      }
    ];
  } catch (error) {
    logger.error({
      message: 'Error getting available themes',
      error,
      context: 'getAvailableThemes'
    });
    throw error;
  }
};

module.exports = {
  getRestaurantById,
  getRestaurantTheme,
  updateRestaurantSettings,
  getAvailableThemes
};
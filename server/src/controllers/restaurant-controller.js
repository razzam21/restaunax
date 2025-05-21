const asyncHandler = require('express-async-handler');
const restaurantService = require('../services/restaurant-service');
const { createLogger } = require('../utils/logger');
const Joi = require('joi');

const logger = createLogger('restaurant-controller');

/**
 * @desc    Get restaurant by ID
 * @route   GET /api/restaurants/:id
 * @access  Private
 */
const getRestaurantById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await restaurantService.getRestaurantById(id);
    
    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get restaurant',
      error,
      userId: req.user?.id,
      restaurantId: req.params.id,
      context: 'getRestaurantById'
    });
    
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500
      ? 'An error occurred while retrieving restaurant information'
      : error.message;
    
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
});

/**
 * @desc    Get restaurant theme settings
 * @route   GET /api/restaurants/:id/theme
 * @access  Private
 */
const getRestaurantTheme = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const themeData = await restaurantService.getRestaurantTheme(id);
    
    res.json({
      success: true,
      data: themeData
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get restaurant theme',
      error,
      userId: req.user?.id,
      restaurantId: req.params.id,
      context: 'getRestaurantTheme'
    });
    
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500
      ? 'An error occurred while retrieving theme information'
      : error.message;
    
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
});

/**
 * @desc    Update restaurant settings
 * @route   PATCH /api/restaurants/:id
 * @access  Private (owner only)
 */
const updateRestaurantSettings = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { name, themeId, primaryColor, secondaryColor } = req.body;
    
    // Validate request body
    const schema = Joi.object({
      name: Joi.string().min(2).max(50).optional(),
      themeId: Joi.string().optional(),
      primaryColor: Joi.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
        .messages({
          'string.pattern.base': 'Primary color must be a valid hex color (e.g., #2C4A7A)'
        }),
      secondaryColor: Joi.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
        .messages({
          'string.pattern.base': 'Secondary color must be a valid hex color (e.g., #D97A3A)'
        })
    });
    
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    // Create the update data object
    const updateData = {};
    if (name) updateData.name = name;
    if (themeId) updateData.themeId = themeId;
    if (primaryColor) updateData.primaryColor = primaryColor;
    if (secondaryColor) updateData.secondaryColor = secondaryColor;
    
    // Check if there's something to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    // Update restaurant settings
    const updatedRestaurant = await restaurantService.updateRestaurantSettings(
      id,
      updateData,
      req.user.id,
      req.user.role
    );
    
    res.json({
      success: true,
      data: updatedRestaurant,
      message: 'Restaurant settings updated successfully'
    });
  } catch (error) {
    logger.error({
      message: 'Failed to update restaurant settings',
      error,
      userId: req.user?.id,
      restaurantId: req.params.id,
      context: 'updateRestaurantSettings'
    });
    
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500
      ? 'An error occurred while updating restaurant settings'
      : error.message;
    
    res.status(statusCode).json({
      success: false,
      error: message
    });
  }
});

/**
 * @desc    Get available themes
 * @route   GET /api/restaurants/themes
 * @access  Private
 */
const getAvailableThemes = asyncHandler(async (req, res) => {
  try {
    const themes = await restaurantService.getAvailableThemes();
    
    res.json({
      success: true,
      data: themes
    });
  } catch (error) {
    logger.error({
      message: 'Failed to get available themes',
      error,
      userId: req.user?.id,
      context: 'getAvailableThemes'
    });
    
    res.status(500).json({
      success: false,
      error: 'An error occurred while retrieving theme information'
    });
  }
});

module.exports = {
  getRestaurantById,
  getRestaurantTheme,
  updateRestaurantSettings,
  getAvailableThemes
};
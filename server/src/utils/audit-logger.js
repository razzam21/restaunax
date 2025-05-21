const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('./logger');

const prisma = new PrismaClient();
const logger = createLogger('audit-logger');

/**
 * Create an audit log entry directly in the database
 * 
 * @param {string} userId - The ID of the user who performed the action
 * @param {string} action - The action that was performed
 * @param {object} details - Additional details about the action
 * @returns {Promise<object>} The created audit log entry
 */
const createAuditLog = async (userId, action, details) => {
  try {
    // Log what we're trying to do
    logger.info({
      message: 'Creating audit log entry',
      userId,
      action,
      detailsKeys: Object.keys(details),
      context: 'createAuditLog'
    });
    
    // Create the audit log using Prisma
    const auditLog = await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        userId,
        action,
        details: {
          ...details,
          timestamp: new Date().toISOString()
        }
      }
    });
    
    logger.info({
      message: 'Audit log entry created',
      userId,
      action,
      auditLogId: auditLog.id,
      context: 'createAuditLog'
    });
    
    return auditLog;
  } catch (error) {
    logger.error({
      message: 'Failed to create audit log entry',
      error: error,
      userId,
      action,
      context: 'createAuditLog'
    });
    
    // Don't throw - audit logs shouldn't break main functionality
    return null;
  }
};

/**
 * Create a restaurant settings update audit log
 * 
 * @param {string} userId - The ID of the user who performed the update
 * @param {string} restaurantId - The ID of the restaurant that was updated
 * @param {object} updateData - The data that was updated
 * @returns {Promise<object>} The created audit log entry
 */
const logRestaurantUpdate = async (userId, restaurantId, updateData) => {
  try {
    // Validate the userId is present
    if (!userId) {
      logger.error({
        message: 'Cannot create audit log: userId is required',
        restaurantId,
        context: 'logRestaurantUpdate'
      });
      return { success: false, error: 'userId is required' };
    }
    
    logger.debug({
      message: 'Preparing to create restaurant update audit log',
      userId,
      restaurantId,
      context: 'logRestaurantUpdate'
    });
    
    // Format the details in a way that will work with JSONB
    const details = {
      restaurantId,
      updatedFields: Object.keys(updateData),
      timestamp: new Date().toISOString()
    };
    
    // Add simple string values for each updated field
    if (updateData.name) details.name = updateData.name;
    if (updateData.themeId) details.themeId = updateData.themeId;
    if (updateData.primaryColor) details.primaryColor = updateData.primaryColor;
    if (updateData.secondaryColor) details.secondaryColor = updateData.secondaryColor;
    
    // Create the audit log using Prisma's standard API first
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          id: uuidv4(),
          userId, 
          action: 'update_restaurant',
          details
        }
      });
      
      logger.info({
        message: 'Created audit log with Prisma',
        auditLogId: auditLog.id,
        userId,
        restaurantId,
        context: 'logRestaurantUpdate'
      });
      
      return { id: auditLog.id, success: true };
    } catch (prismaError) {
      // Prisma error, fallback to direct SQL
      logger.warn({
        message: 'Prisma audit log failed, falling back to SQL',
        error: prismaError.message,
        userId,
        restaurantId,
        context: 'logRestaurantUpdate'
      });
      
      // Create the audit log using direct SQL as fallback
      const id = uuidv4();
      const action = 'update_restaurant';
      const detailsJson = JSON.stringify(details);
      
      // Use parameterized query for safety
      await prisma.$executeRaw`
        INSERT INTO "AuditLog" ("id", "userId", "action", "details", "createdAt")
        VALUES (${id}, ${userId}, ${action}, ${detailsJson}::jsonb, now())
      `;
      
      logger.info({
        message: 'Created audit log with SQL fallback',
        auditLogId: id,
        userId,
        restaurantId,
        context: 'logRestaurantUpdate'
      });
      
      return { id, success: true };
    }
  } catch (error) {
    logger.error({
      message: 'Failed to create restaurant update audit log',
      error: error,
      userId,
      restaurantId,
      context: 'logRestaurantUpdate'
    });
    
    return { success: false, error: error.message };
  }
};

module.exports = {
  createAuditLog,
  logRestaurantUpdate
};
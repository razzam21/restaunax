const jwt = require('jsonwebtoken');
const config = require('../config');
const { createLogger } = require('../utils/logger');
const prisma = require('../db/client');

const logger = createLogger('auth-middleware');

/**
 * Middleware to require authentication
 * Validates JWT access token and attaches the decoded user to the request
 */
const requireAuth = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.',
    });
  }

  // Check format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Invalid token format.',
    });
  }

  const token = parts[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // Attach user to request
    req.user = decoded;
    next();
  } catch (error) {
    logger.error({
      message: 'Token verification failed',
      error: error,
      token: token ? token.substring(0, 10) + '...' : 'none', // Only log a portion of the token
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent'],
      context: 'auth-middleware.requireAuth'
    });
    
    // Don't expose internal error details to the client
    res.status(401).json({
      success: false,
      error: 'Authentication failed. Please log in again.',
    });
  }
};

/**
 * Middleware to check if the user has the required role
 * @param {string|string[]} roles Required role(s) for access
 */
const hasRole = (roles) => {
  return (req, res, next) => {
    // Check if user exists on the request
    if (!req.user) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. User not authenticated.',
      });
    }

    // Convert roles to array if it's a string
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    // Check if user has one of the required roles
    if (requiredRoles.includes(req.user.role)) {
      return next();
    }

    // If role doesn't match, deny access
    return res.status(403).json({
      success: false,
      error: 'Access denied. Insufficient permissions.',
    });
  };
};

/**
 * Middleware to audit user actions
 * @param {string} action Action name
 */
const auditAction = (action) => {
  return async (req, res, next) => {
    // Original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    // Add a hook to the response object to log after the response is sent
    res.on('finish', async () => {
      if (!req.user) return; // Skip if no user authenticated

      try {
        // Create audit log entry
        try {
          await prisma.auditLog.create({
            data: {
              userId: req.user.sub,
              action,
              details: {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                statusCode: res.statusCode,
                timestamp: new Date().toISOString(),
              },
            },
          });
        } catch (dbError) {
          logger.error({
            message: 'Failed to create audit log entry',
            error: dbError,
            userId: req.user.sub,
            action: action,
            ip: req.ip,
            path: req.originalUrl,
            method: req.method,
            statusCode: res.statusCode,
            context: 'auth-middleware.auditAction'
          });
          // We don't want to break the application flow if audit logging fails
        }
      } catch (error) {
        logger.error({
          message: `Failed to create audit log for action: ${action}`,
          error: error,
          action: action,
          context: 'auth-middleware.auditAction.outer',
          path: req.originalUrl
        });
      }
    });

    next();
  };
};

module.exports = {
  requireAuth,
  hasRole,
  auditAction,
};
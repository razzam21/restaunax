const jwt = require('jsonwebtoken');
const { requireAuth, hasRole } = require('../../../src/middleware/auth');
const config = require('../../../src/config');
const { createLogger } = require('../../../src/utils/logger');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../../src/config', () => ({
  jwt: {
    accessSecret: 'test-access-secret',
  },
}));
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    error: jest.fn(),
  }),
}));

describe('Auth Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    // Setup mocks before each test
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    
    // Clear all mock calls
    jest.clearAllMocks();
  });

  describe('requireAuth middleware', () => {
    test('should continue if valid token provided', () => {
      // Setup request with token
      req.headers.authorization = 'Bearer valid-token';
      
      // Mock jwt.verify to return decoded token
      const decodedToken = {
        sub: 'user_123',
        username: 'test',
        role: 'wait_staff',
        restaurantId: 'rest_1',
      };
      jwt.verify.mockReturnValue(decodedToken);
      
      // Execute middleware
      requireAuth(req, res, next);
      
      // Assertions
      expect(jwt.verify).toHaveBeenCalledWith(
        'valid-token',
        config.jwt.accessSecret
      );
      expect(req.user).toEqual(decodedToken);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('should return 401 if no token provided', () => {
      // No token in request
      requireAuth(req, res, next);
      
      // Assertions
      expect(jwt.verify).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Access denied. No token provided.',
        })
      );
    });
    
    test('should return 401 if token malformed', () => {
      // Invalid token format
      req.headers.authorization = 'invalid-token-format';
      
      requireAuth(req, res, next);
      
      // Assertions
      expect(jwt.verify).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Access denied. Invalid token format.',
        })
      );
    });
    
    test('should return 401 if token invalid/expired', () => {
      // Setup request with token
      req.headers.authorization = 'Bearer invalid-token';
      
      // Mock jwt.verify to throw error
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Execute middleware
      requireAuth(req, res, next);
      
      // Assertions
      expect(jwt.verify).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication failed. Please log in again.',
        })
      );
    });
  });
  
  describe('hasRole middleware', () => {
    beforeEach(() => {
      // Setup user in request (as if requireAuth already ran)
      req.user = {
        sub: 'user_123',
        username: 'test',
        role: 'wait_staff',
        restaurantId: 'rest_1',
      };
    });
    
    test('should continue if user has required role', () => {
      // Test with matching role
      const middleware = hasRole('wait_staff');
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('should continue if user has one of required roles', () => {
      // Test with array of roles
      const middleware = hasRole(['manager', 'wait_staff']);
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('should return 403 if user does not have required role', () => {
      // Test with non-matching role
      const middleware = hasRole('manager');
      middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Access denied. Insufficient permissions.',
        })
      );
    });
    
    test('should return 403 if user does not have any of required roles', () => {
      // Test with array of non-matching roles
      const middleware = hasRole(['manager', 'owner']);
      middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Access denied. Insufficient permissions.',
        })
      );
    });
    
    test('should return 403 if user property missing', () => {
      // Remove user from request
      delete req.user;
      
      const middleware = hasRole('wait_staff');
      middleware(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Access denied. User not authenticated.',
        })
      );
    });
  });
});
const authController = require('../../../src/controllers/auth-controller');
const userService = require('../../../src/services/user-service');
const { createLogger } = require('../../../src/utils/logger');

// Mock dependencies
jest.mock('../../../src/services/user-service');
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    error: jest.fn(),
  }),
}));

describe('Auth Controller', () => {
  let req, res;
  
  beforeEach(() => {
    // Setup request and response objects
    req = {
      body: {},
      cookies: {},
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Test User Agent'
      },
      originalUrl: '/api/test'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  describe('register', () => {
    beforeEach(() => {
      req.body = {
        username: 'test',
        password: 'Test1234',
        role: 'wait_staff',
        restaurantId: 'rest_1',
      };
    });
    
    test('should register user and return 201 status', async () => {
      // Mock service response
      const mockUser = {
        id: 'user_123',
        username: 'test',
        role: 'wait_staff',
        restaurantId: 'rest_1',
      };
      userService.registerUser.mockResolvedValue(mockUser);
      
      // Execute controller
      await authController.register(req, res);
      
      // Assertions
      expect(userService.registerUser).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: mockUser,
      });
    });
    
    test('should return 400 for validation error', async () => {
      // Mock validation error
      const error = new Error('Password must be at least 8 characters long');
      error.statusCode = 400;
      userService.registerUser.mockRejectedValue(error);
      
      // Execute controller
      await authController.register(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: error.message,
      });
    });
    
    test('should return 409 for duplicate username', async () => {
      // Mock duplicate username error
      const error = new Error('Username already exists');
      error.statusCode = 409;
      userService.registerUser.mockRejectedValue(error);
      
      // Execute controller
      await authController.register(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: error.message,
      });
    });
  });
  
  describe('login', () => {
    beforeEach(() => {
      req.body = {
        username: 'test',
        password: 'Test1234',
      };
    });
    
    test('should log in user and return tokens', async () => {
      // Mock service response
      const mockResponse = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: 'user_123',
          username: 'test',
          role: 'wait_staff',
          restaurantId: 'rest_1',
        },
      };
      userService.loginUser.mockResolvedValue(mockResponse);
      
      // Execute controller
      await authController.login(req, res);
      
      // Assertions
      expect(userService.loginUser).toHaveBeenCalledWith(req.body);
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockResponse.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: expect.any(Number),
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        accessToken: mockResponse.accessToken,
        user: mockResponse.user,
      });
    });
    
    test('should return 401 for invalid credentials', async () => {
      // Mock authentication error
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      userService.loginUser.mockRejectedValue(error);
      
      // Execute controller
      await authController.login(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: error.message,
      });
    });
  });
  
  describe('refreshToken', () => {
    beforeEach(() => {
      // Setup refresh token in cookies
      req.cookies.refreshToken = 'valid-refresh-token';
    });
    
    test('should refresh access token successfully', async () => {
      // Mock service response
      const mockResponse = {
        accessToken: 'new-access-token',
      };
      userService.refreshToken.mockResolvedValue(mockResponse);
      
      // Execute controller
      await authController.refreshToken(req, res);
      
      // Assertions
      expect(userService.refreshToken).toHaveBeenCalledWith(req.cookies.refreshToken);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        accessToken: mockResponse.accessToken,
      });
    });
    
    test('should return 401 for missing refresh token', async () => {
      // Remove refresh token from cookies
      delete req.cookies.refreshToken;
      
      // Execute controller
      await authController.refreshToken(req, res);
      
      // Assertions
      expect(userService.refreshToken).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Refresh token is required',
          errorCode: 'REFRESH_TOKEN_MISSING'
        })
      );
    });
    
    test('should return 401 for invalid refresh token', async () => {
      // Mock token validation error
      const error = new Error('Invalid refresh token');
      error.statusCode = 401;
      userService.refreshToken.mockRejectedValue(error);
      
      // Execute controller
      await authController.refreshToken(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: error.message,
      });
    });
  });
  
  describe('logout', () => {
    beforeEach(() => {
      // Setup refresh token in cookies
      req.cookies.refreshToken = 'valid-refresh-token';
    });
    
    test('should revoke refresh token and clear cookie', async () => {
      // Mock service response
      userService.revokeRefreshToken.mockResolvedValue(undefined);
      
      // Execute controller
      await authController.logout(req, res);
      
      // Assertions
      expect(userService.revokeRefreshToken).toHaveBeenCalledWith(req.cookies.refreshToken);
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully',
      });
    });
    
    test('should return success even if no refresh token', async () => {
      // Remove refresh token from cookies
      delete req.cookies.refreshToken;
      
      // Execute controller
      await authController.logout(req, res);
      
      // Assertions
      expect(userService.revokeRefreshToken).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });
});
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userService = require('../../../src/services/user-service');
const prisma = require('../../../src/db/client');
const config = require('../../../src/config');

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../../src/db/client', () => ({
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(prisma)),
}));

// Mock config
jest.mock('../../../src/config', () => ({
  jwt: {
    accessSecret: 'test-access-secret',
    refreshSecret: 'test-refresh-secret',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  bcrypt: {
    saltRounds: 12,
  },
}));

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const userData = {
      username: 'test',
      password: 'Test1234',
      role: 'wait_staff',
      restaurantId: 'rest_1',
    };

    test('should register a new user with hashed password', async () => {
      // Mock bcrypt hash
      bcrypt.hash.mockResolvedValue('hashed_password');
      
      // Mock user creation
      const createdUser = {
        id: 'user_123',
        username: userData.username,
        role: userData.role,
        restaurantId: userData.restaurantId,
        password: 'hashed_password', // This would be hashed in real scenario
      };
      prisma.user.create.mockResolvedValue(createdUser);

      // Mock auditLog creation
      prisma.auditLog.create.mockResolvedValue({
        id: 'log_123',
        userId: 'user_123',
        action: 'user_created',
      });

      // Execute the function
      const result = await userService.registerUser(userData);

      // Assertions
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, config.bcrypt.saltRounds);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: userData.username,
          password: 'hashed_password',
          role: userData.role,
          restaurantId: userData.restaurantId,
        },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: createdUser.id,
          action: 'user_created',
          details: expect.any(Object),
        },
      });
      expect(result).toEqual({
        id: createdUser.id,
        username: createdUser.username,
        role: createdUser.role,
        restaurantId: createdUser.restaurantId,
        // password should not be returned
      });
      expect(result.password).toBeUndefined();
    });

    test('should reject registration with invalid password', async () => {
      // Test with weak password
      const weakPasswordData = {
        ...userData,
        password: 'weak',
      };

      await expect(userService.registerUser(weakPasswordData)).rejects.toThrow(
        'Password must be at least 8 characters long and include uppercase, lowercase, and numbers'
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    test('should reject registration with duplicate username', async () => {
      // Mock user findUnique to simulate duplicate
      prisma.user.findUnique.mockResolvedValue({ id: 'existing_user' });

      await expect(userService.registerUser(userData)).rejects.toThrow(
        'Username already exists'
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    const loginData = {
      username: 'test',
      password: 'Test1234',
    };

    test('should login user with valid credentials and return tokens', async () => {
      // Mock user retrieval
      const foundUser = {
        id: 'user_123',
        username: 'test',
        password: 'hashed_password',
        role: 'wait_staff',
        restaurantId: 'rest_1',
      };
      prisma.user.findUnique.mockResolvedValue(foundUser);

      // Mock password comparison
      bcrypt.compare.mockResolvedValue(true);

      // Mock token generation
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';
      jwt.sign.mockImplementation((payload, secret, options) => {
        if (secret === config.jwt.accessSecret) return mockAccessToken;
        if (secret === config.jwt.refreshSecret) return mockRefreshToken;
        return 'unknown-token';
      });

      // Mock refresh token creation
      prisma.refreshToken.create.mockResolvedValue({
        id: 'token_123',
        token: mockRefreshToken,
        userId: foundUser.id,
        expiresAt: expect.any(Date),
      });

      // Mock auditLog creation
      prisma.auditLog.create.mockResolvedValue({
        id: 'log_123',
        userId: foundUser.id,
        action: 'user_login',
      });

      // Execute the function
      const result = await userService.loginUser(loginData);

      // Assertions
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: loginData.username },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, foundUser.password);
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: mockRefreshToken,
          userId: foundUser.id,
          expiresAt: expect.any(Date),
        },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: foundUser.id,
          action: 'user_login',
          details: expect.any(Object),
        },
      });
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        user: {
          id: foundUser.id,
          username: foundUser.username,
          role: foundUser.role,
          restaurantId: foundUser.restaurantId,
        },
      });
      // Password should not be returned
      expect(result.user.password).toBeUndefined();
    });

    test('should reject login with invalid username', async () => {
      // Mock user not found
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.loginUser(loginData)).rejects.toThrow(
        'Invalid username or password'
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    test('should reject login with invalid password', async () => {
      // Mock user retrieval
      const foundUser = {
        id: 'user_123',
        username: 'test',
        password: 'hashed_password',
        role: 'wait_staff',
        restaurantId: 'rest_1',
      };
      prisma.user.findUnique.mockResolvedValue(foundUser);

      // Mock password comparison (fails)
      bcrypt.compare.mockResolvedValue(false);

      await expect(userService.loginUser(loginData)).rejects.toThrow(
        'Invalid username or password'
      );
      expect(jwt.sign).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const refreshTokenData = {
      refreshToken: 'valid-refresh-token',
    };

    test('should generate new access token with valid refresh token', async () => {
      // Mock current date for testing
      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementation(() => now);

      // Mock refresh token retrieval
      const foundToken = {
        id: 'token_123',
        token: refreshTokenData.refreshToken,
        userId: 'user_123',
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
        revoked: false,
      };
      prisma.refreshToken.findFirst.mockResolvedValue(foundToken);

      // Mock user retrieval
      const foundUser = {
        id: 'user_123',
        username: 'test',
        role: 'wait_staff',
        restaurantId: 'rest_1',
      };
      prisma.user.findUnique.mockResolvedValue(foundUser);

      // Mock token generation
      const mockAccessToken = 'new-access-token';
      jwt.sign.mockReturnValue(mockAccessToken);

      // Execute the function
      const result = await userService.refreshToken(refreshTokenData.refreshToken);

      // Assertions
      expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
        where: { 
          token: refreshTokenData.refreshToken,
          revoked: false,
          expiresAt: { gt: now },
        },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: foundToken.userId },
      });
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: foundUser.id,
          username: foundUser.username,
          role: foundUser.role,
          restaurantId: foundUser.restaurantId,
        }),
        config.jwt.accessSecret,
        { expiresIn: config.jwt.accessExpiresIn }
      );
      expect(result).toEqual({
        accessToken: mockAccessToken,
      });
    });

    test('should reject with invalid refresh token', async () => {
      // Mock refresh token not found
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(userService.refreshToken(refreshTokenData.refreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    test('should reject with expired refresh token', async () => {
      // Mock current date for testing
      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementation(() => now);

      // Mock expired refresh token
      const expiredToken = {
        id: 'token_123',
        token: refreshTokenData.refreshToken,
        userId: 'user_123',
        expiresAt: new Date(now.getTime() - 1000), // Already expired
        revoked: false,
      };
      prisma.refreshToken.findFirst.mockResolvedValue(expiredToken);

      await expect(userService.refreshToken(refreshTokenData.refreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    test('should reject with revoked refresh token', async () => {
      // Mock revoked refresh token
      const revokedToken = {
        id: 'token_123',
        token: refreshTokenData.refreshToken,
        userId: 'user_123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid expiry
        revoked: true,
      };
      prisma.refreshToken.findFirst.mockResolvedValue(revokedToken);

      await expect(userService.refreshToken(refreshTokenData.refreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('revokeRefreshToken', () => {
    test('should revoke a refresh token', async () => {
      // Mock refresh token update
      prisma.refreshToken.update.mockResolvedValue({
        id: 'token_123',
        revoked: true,
        revokedAt: expect.any(Date),
      });

      // Execute the function
      await userService.revokeRefreshToken('valid-refresh-token');

      // Assertions
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { token: 'valid-refresh-token' },
        data: {
          revoked: true,
          revokedAt: expect.any(Date),
        },
      });
    });
  });

  describe('revokeAllUserRefreshTokens', () => {
    test('should revoke all refresh tokens for a user', async () => {
      // Mock refresh token update for all user tokens
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 }); // 3 tokens revoked

      // Execute the function
      await userService.revokeAllUserRefreshTokens('user_123');

      // Assertions
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user_123', revoked: false },
        data: {
          revoked: true,
          revokedAt: expect.any(Date),
        },
      });
    });
  });

  describe('validatePassword', () => {
    test('should return true for valid password', () => {
      // Valid password: 8+ chars, upper, lower, number
      expect(userService.validatePassword('Passw0rd')).toBe(true);
      expect(userService.validatePassword('Test1234')).toBe(true);
      expect(userService.validatePassword('ABCdef123')).toBe(true);
    });

    test('should return false for password less than 8 characters', () => {
      expect(userService.validatePassword('Test12')).toBe(false);
    });

    test('should return false for password without uppercase letters', () => {
      expect(userService.validatePassword('password123')).toBe(false);
    });

    test('should return false for password without lowercase letters', () => {
      expect(userService.validatePassword('PASSWORD123')).toBe(false);
    });

    test('should return false for password without numbers', () => {
      expect(userService.validatePassword('PasswordTest')).toBe(false);
    });
  });
});
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../db/client');
const config = require('../config');
const { createLogger } = require('../utils/logger');

const logger = createLogger('user-service');

/**
 * Register a new user
 * @param {Object} userData User data including username, password, role, and restaurantId
 * @returns {Promise<Object>} Created user (without password)
 */
const registerUser = async (userData) => {
  // Check if username already exists
  const existingUser = await prisma.user.findUnique({
    where: { username: userData.username },
  });

  if (existingUser) {
    const error = new Error('Username already exists');
    error.statusCode = 409;
    throw error;
  }

  // Validate password strength
  if (!validatePassword(userData.password)) {
    const error = new Error('Password must be at least 8 characters long and include uppercase, lowercase, and numbers');
    error.statusCode = 400;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, config.bcrypt.saltRounds);

  // Create user
  const createdUser = await prisma.user.create({
    data: {
      username: userData.username,
      password: hashedPassword,
      role: userData.role,
      restaurantId: userData.restaurantId,
    },
  });

  // Log the action
  await prisma.auditLog.create({
    data: {
      userId: createdUser.id,
      action: 'user_created',
      details: {
        username: createdUser.username,
        role: createdUser.role,
        restaurantId: createdUser.restaurantId,
      },
    },
  });

  // Return user without password
  const { password, ...userWithoutPassword } = createdUser;
  return userWithoutPassword;
};

/**
 * Login a user
 * @param {Object} loginData Login data including username and password
 * @returns {Promise<Object>} Access token, refresh token, and user data
 */
const loginUser = async (loginData) => {
  console.log('USER_SERVICE: loginUser called with username:', loginData.username);
  let user;
  
  try {
    console.log('USER_SERVICE: Querying database for user');
    // Find user by username
    user = await prisma.user.findUnique({
      where: { username: loginData.username },
    });
    console.log('USER_SERVICE: Database query completed, user found:', !!user);

    // Check if user exists
    if (!user) {
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      throw error;
    }
  } catch (error) {
    // If this is a Prisma error (like table doesn't exist), convert to user-friendly error
    if (error.code || (error.message && error.message.includes('does not exist'))) {
      logger.error({
        message: 'Database error during login',
        error: error,
        userId: loginData.username,
        context: 'loginUser',
        timestamp: new Date().toISOString()
      });
      const userError = new Error('Authentication service unavailable. Please try again later.');
      userError.statusCode = 503;
      throw userError;
    }
    // Otherwise rethrow the error
    throw error;
  }

  console.log('USER_SERVICE: Comparing passwords');
  // Compare password
  let isPasswordValid;
  try {
    console.log('USER_SERVICE: About to call bcrypt.compare');
    isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    console.log('USER_SERVICE: bcrypt.compare completed successfully, valid:', isPasswordValid);
  } catch (bcryptError) {
    console.error('USER_SERVICE: bcrypt.compare failed:', bcryptError);
    throw bcryptError;
  }
  if (!isPasswordValid) {
    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }

  console.log('USER_SERVICE: Generating tokens');
  // Generate tokens
  const accessToken = generateAccessToken(user);
  console.log('USER_SERVICE: Access token generated');
  const refreshToken = generateRefreshToken(user);

  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  try {
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });
  } catch (error) {
    logger.error({
      message: 'Failed to store refresh token',
      error: error,
      userId: user.id,
      username: user.username,
      context: 'loginUser.refreshToken',
      timestamp: new Date().toISOString()
    });
    // Don't expose database errors to the client
    const userError = new Error('Authentication service unavailable. Please try again later.');
    userError.statusCode = 503;
    throw userError;
  }

  // Log the action
  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'user_login',
        details: {
          username: user.username,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    // Just log the error but don't fail the login if audit logging fails
    logger.error({
      message: 'Failed to create audit log',
      error: error,
      userId: user.id,
      username: user.username,
      action: 'user_login',
      context: 'loginUser.auditLog',
      timestamp: new Date().toISOString()
    });
    // We continue the process as audit logging is secondary to the login process
  }

  // Return tokens and user data (without password)
  const { password, ...userWithoutPassword } = user;
  return {
    accessToken,
    refreshToken,
    user: userWithoutPassword,
  };
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshTokenValue Refresh token
 * @returns {Promise<Object>} New access token
 */
const refreshToken = async (refreshTokenValue) => {
  // Find refresh token
  const tokenRecord = await prisma.refreshToken.findFirst({
    where: {
      token: refreshTokenValue,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
  });

  // Check if token exists and is valid
  if (!tokenRecord) {
    const error = new Error('Invalid refresh token');
    error.statusCode = 401;
    throw error;
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { id: tokenRecord.userId },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 401;
    throw error;
  }

  // Generate new access token
  const accessToken = generateAccessToken(user);

  return { accessToken };
};

/**
 * Revoke a refresh token
 * @param {string} refreshTokenValue Refresh token
 * @returns {Promise<void>}
 */
const revokeRefreshToken = async (refreshTokenValue) => {
  await prisma.refreshToken.update({
    where: { token: refreshTokenValue },
    data: {
      revoked: true,
      revokedAt: new Date(),
    },
  });
};

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId User ID
 * @returns {Promise<void>}
 */
const revokeAllUserRefreshTokens = async (userId) => {
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: {
      revoked: true,
      revokedAt: new Date(),
    },
  });
};

/**
 * Validate password strength
 * Requirements: At least 8 characters, include uppercase, lowercase, and numbers
 * @param {string} password Password to validate
 * @returns {boolean} Whether password meets requirements
 */
const validatePassword = (password) => {
  // Length check
  if (password.length < 8) {
    return false;
  }

  // Check for uppercase, lowercase, and numbers
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasUppercase && hasLowercase && hasNumber;
};

/**
 * Generate access token for a user
 * @param {Object} user User object
 * @returns {string} JWT access token
 */
const generateAccessToken = (user) => {
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    restaurantId: user.restaurantId,
  };

  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
};

/**
 * Generate refresh token for a user
 * @param {Object} user User object
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (user) => {
  const payload = {
    sub: user.id,
    type: 'refresh',
  };

  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

module.exports = {
  registerUser,
  loginUser,
  refreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  validatePassword,
};
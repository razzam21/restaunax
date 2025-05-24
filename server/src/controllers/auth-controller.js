const asyncHandler = require('express-async-handler');
const userService = require('../services/user-service');
const { createLogger } = require('../utils/logger');
const config = require('../config');

const logger = createLogger('auth-controller');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public (should be restricted to admin in production)
 */
const register = asyncHandler(async (req, res) => {
  try {
    const userData = {
      username: req.body.username,
      password: req.body.password,
      role: req.body.role,
      restaurantId: req.body.restaurantId,
    };

    const user = await userService.registerUser(userData);

    res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    // Log detailed error information
    logger.error({
      message: 'User registration failed',
      error: error,
      username: req.body.username,
      role: req.body.role,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.originalUrl,
      context: 'auth-controller.register'
    });
    
    // Set appropriate status code based on error
    const statusCode = error.statusCode || 500;
    
    // For 500 errors, don't expose internal details
    const errorMessage = statusCode === 500 
      ? 'An unexpected error occurred. Please try again later.'
      : error.message;
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  console.log('LOGIN: Starting login process');
  try {
    console.log('LOGIN: Extracting login data');
    const loginData = {
      username: req.body.username,
      password: req.body.password,
    };
    console.log('LOGIN: Calling userService.loginUser');

    const { accessToken, refreshToken, user } = await userService.loginUser(loginData);
    console.log('LOGIN: userService.loginUser completed successfully');

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Should be true in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // Return access token and user data
    res.json({
      success: true,
      accessToken,
      user,
    });
  } catch (error) {
    // Log detailed error information
    logger.error({
      message: 'User login failed',
      error: error,
      username: req.body.username,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.originalUrl,
      context: 'auth-controller.login'
    });
    
    // Set appropriate status code based on error
    const statusCode = error.statusCode || 500;
    
    // For 500 errors, don't expose internal details
    const errorMessage = statusCode === 500 
      ? 'An unexpected error occurred. Please try again later.'
      : error.message;
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public (requires refresh token cookie)
 */
const refreshToken = asyncHandler(async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      // Use 401 status but add a specific error code that the client can use
      // to avoid infinite loops
      return res.status(401).json({
        success: false,
        error: 'Refresh token is required',
        errorCode: 'REFRESH_TOKEN_MISSING'
      });
    }

    // Generate new access token
    const { accessToken } = await userService.refreshToken(refreshToken);

    res.json({
      success: true,
      accessToken,
    });
  } catch (error) {
    // Log detailed error information
    logger.error({
      message: 'Token refresh failed',
      error: error,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.originalUrl,
      hasRefreshToken: !!req.cookies.refreshToken,
      context: 'auth-controller.refreshToken'
    });
    
    // Set appropriate status code based on error
    const statusCode = error.statusCode || 500;
    
    // For 500 errors, don't expose internal details
    const errorMessage = statusCode === 500 
      ? 'An unexpected error occurred. Please try again later.'
      : error.message;
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    // Revoke refresh token if it exists
    if (refreshToken) {
      await userService.revokeRefreshToken(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    // Log detailed error information
    logger.error({
      message: 'Logout failed',
      error: error,
      userId: req.user?.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.originalUrl,
      hasRefreshToken: !!req.cookies.refreshToken,
      context: 'auth-controller.logout'
    });
    
    // Set appropriate status code based on error
    const statusCode = error.statusCode || 500;
    
    // For 500 errors, don't expose internal details
    const errorMessage = statusCode === 500 
      ? 'An unexpected error occurred. Please try again later.'
      : error.message;
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
};
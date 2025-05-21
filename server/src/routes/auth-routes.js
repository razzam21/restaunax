const express = require('express');
const { 
  register, 
  login, 
  refreshToken, 
  logout 
} = require('../controllers/auth-controller');
const { requireAuth, hasRole, auditAction } = require('../middleware/auth');
const { validate, sanitize } = require('../middleware/validation');
const { registerSchema, loginSchema } = require('../utils/validation-schemas');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for authentication endpoints
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.',
  },
});

// Register a new user (only accessible to owners/admins in production)
router.post(
  '/register',
  requireAuth, // Requires authentication
  hasRole(['owner']), // Restrict to owners only
  sanitize(['username']), // Sanitize inputs
  validate(registerSchema), // Validate request body
  register
);

// Login user
router.post(
  '/login',
  loginLimiter, // Apply rate limiting
  sanitize(['username']), // Sanitize inputs
  validate(loginSchema), // Validate request body
  auditAction('login_attempt'), // Audit login attempts
  login
);

// Refresh token
router.post('/refresh-token', refreshToken);

// Logout user
router.post(
  '/logout',
  requireAuth, // Requires authentication
  auditAction('logout'), // Audit logout
  logout
);

module.exports = router;
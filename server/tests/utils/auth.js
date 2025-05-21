const jwt = require('jsonwebtoken');
const config = require('../../src/config');

/**
 * Generate a test JWT token for authentication in tests
 * @param {Object} user User object to use for token generation
 * @returns {String} JWT token
 */
const generateTestToken = (user = {}) => {
  const payload = {
    sub: user.id || 'test_user_id',
    username: user.username || 'test',
    role: user.role || 'wait_staff',
    restaurantId: user.restaurantId || 'rest_1',
  };

  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: '1h', // Longer expiry for tests
  });
};

/**
 * Add authentication headers to a request
 * @param {Object} request Supertest request object
 * @param {Object} user User object to use for token generation
 * @returns {Object} Request with auth headers
 */
const authenticateRequest = (request, user = {}) => {
  const token = generateTestToken(user);
  return request.set('Authorization', `Bearer ${token}`);
};

module.exports = {
  generateTestToken,
  authenticateRequest,
};
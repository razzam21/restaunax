const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 8080,
  
  // CORS configuration
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // JWT configuration
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-dev-only',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-dev-only',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // Bcrypt configuration
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },
  
  // Default restaurant ID for MVP1 (will be removed in MVP2)
  defaultRestaurantId: 'rest_1',
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
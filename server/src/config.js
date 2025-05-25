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
  
  // AI Configuration
  ai: {
    enabled: process.env.AI_ENABLED === 'true',
    primaryEngine: process.env.AI_PRIMARY_ENGINE || 'ollama',
    ollama: {
      enabled: process.env.OLLAMA_ENABLED === 'true',
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama2',
      timeout: parseInt(process.env.OLLAMA_TIMEOUT) || 30000,
    },
    openai: {
      enabled: process.env.OPENAI_ENABLED === 'true',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4',
      timeout: parseInt(process.env.OPENAI_TIMEOUT) || 120000,
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
    },
  },
  
  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
};
const dotenv = require('dotenv');

// Load env variables
dotenv.config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 8080,
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:80',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
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
      timeout: parseInt(process.env.OPENAI_TIMEOUT) || 30000,
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
    },
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    db: parseInt(process.env.REDIS_DB) || 0,
  },
};
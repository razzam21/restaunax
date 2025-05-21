const winston = require('winston');
const { format } = require('winston');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Create logs directory if it doesn't exist
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

/**
 * Format for detailed error logging
 * Properly captures error stack traces and serializes objects
 */
const detailedFormat = format((info) => {
  // Handle Error instances specially to capture stack traces
  if (info.message instanceof Error) {
    const error = info.message;
    info.message = error.message;
    info.stack = error.stack;
    info.name = error.name;
  } else if (info instanceof Error) {
    info.message = info.message;
    info.stack = info.stack;
    info.name = info.name;
  }
  
  return info;
});

/**
 * Create a logger with a specific module name
 * @param {string} module Module name
 * @returns {winston.Logger} Winston logger
 */
const createLogger = (module) => {
  return winston.createLogger({
    level: config.logging.level || 'info',
    format: format.combine(
      detailedFormat(),
      format.timestamp(),
      format.errors({ stack: true }),
      format.splat(),
      format.json()
    ),
    defaultMeta: { service: 'restaunax', module },
    transports: [
      // Development logging (pretty console output)
      new winston.transports.Console({
        format: format.combine(
          format.colorize(),
          format.printf(({ timestamp, level, message, module, stack }) => {
            // For console, provide a simpler output
            const moduleInfo = module ? `[${module}]` : '';
            if (stack) {
              return `${timestamp} ${moduleInfo} ${level}: ${message}\n${stack}`;
            }
            return `${timestamp} ${moduleInfo} ${level}: ${message}`;
          })
        ),
        level: config.env === 'production' ? 'info' : 'debug'
      }),
      
      // Detailed error logs
      new winston.transports.File({ 
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5
      }),
      
      // All logs
      new winston.transports.File({ 
        filename: path.join(logDir, 'combined.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 5
      })
    ],
    // Handle uncaught exceptions and unhandled rejections
    exceptionHandlers: [
      new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') })
    ],
    exitOnError: false
  });
};

module.exports = {
  createLogger,
};
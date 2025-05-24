const { createLogger } = require('../../utils/logger');

/**
 * Abstract base class for AI engines
 * Provides common interface and functionality for all AI engines
 */
class AIEngineBase {
  /**
   * @param {string} engineName - Name of the AI engine (e.g., 'ollama', 'openai')
   * @param {Object} config - Engine-specific configuration
   */
  constructor(engineName, config = {}) {
    this.engineName = engineName;
    this.config = {
      enabled: false,
      timeout: 30000,
      ...config
    };
    this.enabled = this.config.enabled;
    this.logger = createLogger(`ai-engine-${engineName}`);

    this.logger.info('AI Engine initialized', {
      engine: engineName,
      enabled: this.enabled,
      config: this.sanitizeConfigForLogging(this.config)
    });
  }

  /**
   * Check if the engine is enabled
   * @returns {boolean} True if engine is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Validate that the engine is enabled, throw error if not
   * @throws {Error} Human-readable error if engine is disabled
   */
  validateEnabled() {
    if (!this.enabled) {
      const error = new Error(`AI engine ${this.engineName} is not available. Please check configuration.`);
      error.code = 'AI_ENGINE_DISABLED';
      error.statusCode = 503;
      throw error;
    }
  }

  /**
   * Get engine information
   * @returns {Object} Engine info including name, enabled status, and config
   */
  getEngineInfo() {
    return {
      name: this.engineName,
      enabled: this.enabled,
      model: this.config.model,
      timeout: this.config.timeout,
    };
  }

  /**
   * Validate response format from AI engine
   * @param {Object} response - Response object to validate
   * @returns {boolean} True if response is valid
   */
  validateResponse(response) {
    if (!response || typeof response !== 'object') {
      return false;
    }

    // Check for required fields
    const hasText = typeof response.text === 'string';
    const hasConfidence = typeof response.confidence === 'number';
    const hasMetadata = typeof response.metadata === 'object';

    return hasText && hasConfidence && hasMetadata;
  }

  /**
   * Sanitize configuration for logging (remove sensitive data)
   * @param {Object} config - Configuration object
   * @returns {Object} Sanitized configuration
   */
  sanitizeConfigForLogging(config) {
    const sanitized = { ...config };
    
    // Remove sensitive fields
    if (sanitized.apiKey) {
      sanitized.apiKey = '***REDACTED***';
    }
    if (sanitized.token) {
      sanitized.token = '***REDACTED***';
    }
    if (sanitized.password) {
      sanitized.password = '***REDACTED***';
    }

    return sanitized;
  }

  /**
   * Handle timeout for engine operations
   * @param {Promise} operation - Operation to execute with timeout
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise} Operation result or timeout error
   */
  async withTimeout(operation, timeoutMs = this.config.timeout) {
    return Promise.race([
      operation,
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`AI engine ${this.engineName} operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  // =============================================================================
  // ABSTRACT METHODS - Must be implemented by concrete engines
  // =============================================================================

  /**
   * Test connection to the AI service
   * @abstract
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    throw new Error('testConnection method must be implemented by concrete AI engine');
  }

  /**
   * Generate AI insight based on system and user prompts
   * @abstract
   * @param {string} systemPrompt - System prompt defining AI behavior
   * @param {string} userPrompt - User prompt with specific request
   * @param {Object} options - Additional options (temperature, maxTokens, etc.)
   * @returns {Promise<Object>} Response object with text, confidence, and metadata
   */
  async generateInsight(systemPrompt, userPrompt, options = {}) {
    throw new Error('generateInsight method must be implemented by concrete AI engine');
  }
}

module.exports = AIEngineBase;
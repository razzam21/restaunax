const config = require('../config');
const { createLogger } = require('../utils/logger');
const AIManager = require('./ai-manager');
const sanitizeHtml = require('sanitize-html');

const logger = createLogger('ai-report-service');

/**
 * Generic AI Report Service
 * Provides a flexible interface for generating AI-powered reports
 * Supports any report type by accepting custom system prompts, user prompts, and options
 */
class AIReportService {
  constructor() {
    this.enabled = config.ai?.enabled || false;
    this.aiManager = null;
    this.initialized = false;
    
    logger.info('AI Report Service initialized', { enabled: this.enabled });
  }

  /**
   * Lazy initialization of AI Manager
   * @private
   */
  _ensureInitialized() {
    if (!this.initialized) {
      this.aiManager = new AIManager();
      this.initialized = true;
      logger.debug('AI Manager initialized');
    }
  }

  /**
   * Check if AI features are enabled
   * @returns {boolean} True if AI features are enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Validate that AI features are enabled and throw user-friendly error if not
   * @throws {Error} If AI features are disabled
   */
  validateEnabled() {
    if (!this.enabled) {
      const error = new Error(
        'AI features are not available with your current plan. Upgrade to Premium to access AI-powered reports and insights.'
      );
      error.code = 'AI_FEATURES_DISABLED';
      error.statusCode = 402; // Payment Required
      throw error;
    }
  }

  /**
   * Test connection to AI services
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    if (!this.enabled) {
      return false;
    }

    try {
      this._ensureInitialized();
      return await this.aiManager.testConnection();
    } catch (error) {
      logger.error('AI connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Sanitize input data to prevent XSS and other security issues
   * @private
   * @param {any} data - Data to sanitize
   * @returns {any} Sanitized data
   */
  _sanitizeData(data) {
    if (typeof data === 'string') {
      return sanitizeHtml(data, {
        allowedTags: [],
        allowedAttributes: {}
      });
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this._sanitizeData(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this._sanitizeData(value);
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * Validate report generation options
   * @private
   * @param {Object} options - Report generation options
   * @throws {Error} If required parameters are missing
   */
  _validateOptions(options) {
    const required = ['reportType', 'systemPrompt', 'userPrompt', 'data'];
    const missing = required.filter(field => !options[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }
  }

  /**
   * Apply default options for report generation
   * @private
   * @param {Object} options - Report generation options
   * @returns {Object} Options with defaults applied
   */
  _applyDefaults(options) {
    return {
      temperature: 0.3,
      maxTokens: 1500,
      ...options
    };
  }

  /**
   * Parse AI response and determine format
   * @private
   * @param {string} responseText - Raw AI response text
   * @returns {Object} Parsed response with format metadata
   */
  _parseAIResponse(responseText) {
    let parsedData;
    let responseFormat = 'text';
    
    try {
      parsedData = JSON.parse(responseText);
      responseFormat = 'json';
      logger.debug('Successfully parsed JSON response from AI');
    } catch (error) {
      // If parsing fails, treat as plain text
      parsedData = {
        raw_response: responseText,
        parsed_at: new Date().toISOString()
      };
      logger.debug('AI response treated as plain text (not valid JSON)');
    }
    
    return { parsedData, responseFormat };
  }

  /**
   * Build comprehensive user prompt including data context
   * @private
   * @param {string} userPrompt - Base user prompt
   * @param {any} data - Data to include in prompt
   * @returns {string} Complete user prompt with data
   */
  _buildUserPrompt(userPrompt, data) {
    const sanitizedData = this._sanitizeData(data);
    
    return `${userPrompt}

Data to analyze:
${JSON.stringify(sanitizedData, null, 2)}

Please provide your analysis in a structured format when possible.`;
  }

  /**
   * Generate an AI-powered report
   * @param {Object} options - Report generation options
   * @param {string} options.reportType - Type of report being generated
   * @param {string} options.systemPrompt - System prompt defining AI role and context
   * @param {string} options.userPrompt - User prompt with specific instructions
   * @param {any} options.data - Data to be analyzed by the AI
   * @param {number} [options.temperature=0.3] - AI creativity level (0-1)
   * @param {number} [options.maxTokens=1500] - Maximum tokens in response
   * @returns {Promise<Object>} Report generation result
   */
  async generateReport(options) {
    this.validateEnabled();
    this._validateOptions(options);
    
    const startTime = Date.now();
    
    try {
      this._ensureInitialized();
      
      // Apply defaults and build complete options
      const completeOptions = this._applyDefaults(options);
      const userPrompt = this._buildUserPrompt(completeOptions.userPrompt, completeOptions.data);
      
      logger.info('Starting AI report generation', {
        reportType: completeOptions.reportType,
        temperature: completeOptions.temperature,
        maxTokens: completeOptions.maxTokens
      });

      // Generate insight using AI Manager
      const aiResponse = await this.aiManager.generateInsight(
        completeOptions.systemPrompt,
        userPrompt,
        {
          temperature: completeOptions.temperature,
          maxTokens: completeOptions.maxTokens
        }
      );

      // Parse the response
      const { parsedData, responseFormat } = this._parseAIResponse(aiResponse.text);
      
      const duration = Date.now() - startTime;
      
      logger.info('AI report generation completed', {
        reportType: completeOptions.reportType,
        responseFormat,
        duration,
        confidence: aiResponse.confidence
      });

      // Build comprehensive result
      return {
        success: true,
        reportType: completeOptions.reportType,
        data: parsedData,
        metadata: {
          ...aiResponse.metadata,
          confidence: aiResponse.confidence,
          response_format: responseFormat,
          duration,
          timestamp: new Date().toISOString(),
          request_params: {
            reportType: completeOptions.reportType,
            temperature: completeOptions.temperature,
            maxTokens: completeOptions.maxTokens
          }
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('AI report generation failed', {
        reportType: options.reportType,
        error: error.message,
        duration
      });
      
      throw new Error(`Failed to generate AI report: ${error.message}`);
    }
  }

  /**
   * Get information about the available AI engine
   * @returns {Object} Engine information
   */
  getEngineInfo() {
    if (!this.enabled) {
      return { available: false, reason: 'AI features disabled' };
    }
    
    try {
      this._ensureInitialized();
      return this.aiManager.getEngineInfo();
    } catch (error) {
      logger.error('Failed to get engine info', { error: error.message });
      return { available: false, reason: error.message };
    }
  }
}

module.exports = AIReportService;
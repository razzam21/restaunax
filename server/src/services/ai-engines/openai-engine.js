const OpenAI = require('openai');
const AIEngineBase = require('./ai-engine-base');

/**
 * OpenAI Engine implementation
 * Provides AI insights using OpenAI's GPT models
 */
class OpenAIEngine extends AIEngineBase {
  /**
   * @param {Object} config - OpenAI configuration
   * @param {boolean} config.enabled - Whether OpenAI is enabled
   * @param {string} config.apiKey - OpenAI API key
   * @param {string} config.model - GPT model to use (e.g., 'gpt-4', 'gpt-3.5-turbo')
   * @param {number} config.timeout - Request timeout in milliseconds
   * @param {number} config.maxTokens - Maximum tokens for response
   */
  constructor(config) {
    super('openai', config);

    // Validate required configuration
    if (this.enabled && !config.apiKey) {
      this.logger.warn('OpenAI API key not provided, disabling OpenAI engine');
      this.enabled = false;
      return;
    }

    if (this.enabled) {
      try {
        // Initialize OpenAI client
        this.client = new OpenAI({
          apiKey: config.apiKey,
          timeout: config.timeout || 30000,
        });

        this.logger.info('OpenAI client initialized successfully', {
          model: config.model,
          maxTokens: config.maxTokens,
        });
      } catch (error) {
        this.logger.error('Failed to initialize OpenAI client', {
          error: error.message,
        });
        this.enabled = false;
      }
    }
  }

  /**
   * Test connection to OpenAI API
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    if (!this.enabled) {
      return false;
    }

    try {
      // Make a simple test request
      const response = await this.withTimeout(
        this.client.chat.completions.create({
          model: this.config.model,
          messages: [
            { role: 'user', content: 'Hello' }
          ],
          max_tokens: 5,
        })
      );

      this.logger.info('OpenAI connection test successful', {
        model: response.model,
        responseId: response.id,
      });
      
      return true;
    } catch (error) {
      this.logger.error('OpenAI connection test failed', {
        error: error.message,
        code: error.code,
        status: error.status,
      });
      return false;
    }
  }

  /**
   * Generate AI insight using OpenAI
   * @param {string} systemPrompt - System prompt defining AI behavior
   * @param {string} userPrompt - User prompt with specific request
   * @param {Object} options - Additional options
   * @param {number} options.temperature - Randomness (0-1)
   * @param {number} options.maxTokens - Maximum response tokens
   * @returns {Promise<Object>} Response object with text, confidence, and metadata
   */
  async generateInsight(systemPrompt, userPrompt, options = {}) {
    this.validateEnabled();

    const {
      temperature = 0.7,
      maxTokens = this.config.maxTokens,
    } = options;

    try {
      this.logger.debug('Generating OpenAI insight', {
        model: this.config.model,
        temperature,
        maxTokens,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
      });

      const response = await this.withTimeout(
        this.client.chat.completions.create({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        })
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      // Try to parse JSON response for confidence extraction
      let confidence = 0.7; // Default confidence
      let parsedContent;
      
      try {
        parsedContent = JSON.parse(content);
        if (typeof parsedContent.confidence === 'number') {
          confidence = parsedContent.confidence;
        }
      } catch (parseError) {
        // If not JSON, use content as-is with default confidence
        this.logger.debug('OpenAI response is not JSON, using as plain text');
      }

      const result = {
        text: content,
        confidence,
        metadata: {
          engine: 'openai',
          model: response.model,
          id: response.id,
          usage: response.usage,
          finishReason: response.choices[0]?.finish_reason,
          generatedAt: new Date().toISOString(),
        },
      };

      this.logger.info('OpenAI insight generated successfully', {
        responseId: response.id,
        model: response.model,
        tokens: response.usage?.total_tokens,
        confidence,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to generate OpenAI insight', {
        error: error.message,
        code: error.code,
        status: error.status,
        model: this.config.model,
      });

      // Handle specific OpenAI errors
      if (error.code === 'rate_limit_exceeded' || error.status === 429) {
        throw new Error('OpenAI API quota exceeded. Please try again later.');
      }
      
      if (error.code === 'invalid_api_key' || error.status === 401) {
        throw new Error('OpenAI API authentication failed. Please check your API key.');
      }
      
      if (error.status === 404) {
        throw new Error(`OpenAI model ${this.config.model} not available.`);
      }
      
      if (error.code === 'timeout' || error.message.includes('timeout')) {
        throw new Error('OpenAI API timeout. Please try again.');
      }
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('OpenAI API network error. Please check your connection.');
      }

      // Generic error
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}

module.exports = OpenAIEngine;
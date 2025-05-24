const axios = require('axios');
const AIEngineBase = require('./ai-engine-base');

/**
 * Ollama Engine implementation
 * Provides AI insights using locally hosted Ollama models
 */
class OllamaEngine extends AIEngineBase {
  /**
   * @param {Object} config - Ollama configuration
   * @param {boolean} config.enabled - Whether Ollama is enabled
   * @param {string} config.baseURL - Ollama server base URL
   * @param {string} config.model - Ollama model to use
   * @param {number} config.timeout - Request timeout in milliseconds
   */
  constructor(config) {
    const defaultConfig = {
      baseURL: 'http://localhost:11434',
      model: 'llama2',
      timeout: 30000,
      ...config,
    };

    super('ollama', defaultConfig);

    if (this.enabled) {
      try {
        // Create axios instance for Ollama API
        this.client = axios.create({
          baseURL: this.config.baseURL,
          timeout: this.config.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        this.logger.info('Ollama client initialized successfully', {
          baseURL: this.config.baseURL,
          model: this.config.model,
        });
      } catch (error) {
        this.logger.error('Failed to initialize Ollama client', {
          error: error.message,
        });
        this.enabled = false;
      }
    }
  }

  /**
   * Test connection to Ollama API
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await this.withTimeout(
        this.client.get('/api/tags')
      );

      this.logger.info('Ollama connection test successful', {
        status: response.status,
        baseURL: this.config.baseURL,
      });
      
      return response.status === 200;
    } catch (error) {
      this.logger.error('Ollama connection test failed', {
        error: error.message,
        code: error.code,
        baseURL: this.config.baseURL,
      });
      return false;
    }
  }

  /**
   * Generate AI insight using Ollama
   * @param {string} systemPrompt - System prompt defining AI behavior
   * @param {string} userPrompt - User prompt with specific request
   * @param {Object} options - Additional options
   * @param {number} options.temperature - Randomness (0-1)
   * @param {number} options.top_p - Nucleus sampling parameter
   * @returns {Promise<Object>} Response object with text, confidence, and metadata
   */
  async generateInsight(systemPrompt, userPrompt, options = {}) {
    this.validateEnabled();

    const {
      temperature = 0.7,
      ...otherOptions
    } = options;

    // Combine system and user prompts for Ollama
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

    try {
      this.logger.debug('Generating Ollama insight', {
        model: this.config.model,
        temperature,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
      });

      const response = await this.withTimeout(
        this.client.post('/api/generate', {
          model: this.config.model,
          prompt: combinedPrompt,
          stream: false,
          format: 'json',
          options: {
            temperature,
            ...otherOptions,
          },
        })
      );

      const content = response.data.response;
      if (!content) {
        throw new Error('Empty response from Ollama');
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
        this.logger.debug('Ollama response is not JSON, using as plain text');
      }

      const result = {
        text: content,
        confidence,
        metadata: {
          engine: 'ollama',
          model: response.data.model || this.config.model,
          done: response.data.done,
          totalDuration: response.data.total_duration,
          loadDuration: response.data.load_duration,
          promptEvalDuration: response.data.prompt_eval_duration,
          evalDuration: response.data.eval_duration,
          generatedAt: new Date().toISOString(),
        },
      };

      this.logger.info('Ollama insight generated successfully', {
        model: response.data.model,
        done: response.data.done,
        totalDuration: response.data.total_duration,
        confidence,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to generate Ollama insight', {
        error: error.message,
        code: error.code,
        status: error.response?.status,
        model: this.config.model,
      });

      // Handle specific Ollama errors
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Ollama API timeout. Please try again.');
      }
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Ollama API network error. Please check if Ollama is running.');
      }
      
      if (error.response?.status === 404) {
        throw new Error(`Ollama model ${this.config.model} not available. Please check if the model is installed.`);
      }
      
      if (error.response?.status === 503) {
        throw new Error('Ollama service unavailable. Please try again later.');
      }

      // Generic error
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }
}

module.exports = OllamaEngine;
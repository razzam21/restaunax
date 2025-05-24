const config = require('../config');
const logger = require('../utils/logger');
const OpenAIEngine = require('./ai-engines/openai-engine');
const OllamaEngine = require('./ai-engines/ollama-engine');

class AIManager {
  constructor() {
    this.engines = new Map();
    this.primaryEngine = null;
    this.initialized = false;
    this.enabled = config.ai.enabled;
    
    // Initialize immediately for backward compatibility with tests
    if (config.ai && config.ai.enabled) {
      this.initializeSync();
    }
  }
  
  initializeSync() {
    this.engines.clear();
    
    if (config.ai && config.ai.ollama && config.ai.ollama.enabled) {
      try {
        const ollamaEngine = new OllamaEngine(config.ai.ollama);
        this.engines.set('ollama', ollamaEngine);
        if (logger && logger.info) {
          logger.info('Ollama engine initialized');
        }
      } catch (error) {
        // Logger might not be available in tests
        if (logger && logger.error) {
          logger.error('Failed to initialize Ollama engine:', error);
        }
      }
    }

    if (config.ai && config.ai.openai && config.ai.openai.enabled) {
      try {
        const openaiEngine = new OpenAIEngine(config.ai.openai);
        this.engines.set('openai', openaiEngine);
        if (logger && logger.info) {
          logger.info('OpenAI engine initialized');
        }
      } catch (error) {
        if (logger && logger.error) {
          logger.error('Failed to initialize OpenAI engine:', error);
        }
      }
    }

    if (config.ai && config.ai.primaryEngine) {
      this.setPrimaryEngine(config.ai.primaryEngine);
    }
    this.initialized = true;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    if (!config.ai.enabled) {
      if (logger && logger.info) {
        logger.info('AI features are disabled');
      }
      this.initialized = true;
      return;
    }

    this.initializeSync();
    
    if (logger && logger.info) {
      if (this.engines.size === 0) {
        logger.warn('No AI engines were successfully initialized');
      } else {
        logger.info(`AI Manager initialized with ${this.engines.size} engines, primary: ${this.primaryEngine}`);
      }
    }
  }

  setPrimaryEngine(engineName) {
    if (this.engines.has(engineName)) {
      this.primaryEngine = engineName;
      if (logger && logger.info) {
        logger.info(`Primary AI engine set to: ${engineName}`);
      }
    } else if (this.engines.size > 0) {
      this.primaryEngine = this.engines.keys().next().value;
      if (logger && logger.warn) {
        logger.warn(`Engine '${engineName}' not available, using: ${this.primaryEngine}`);
      }
    } else {
      this.primaryEngine = null;
      if (logger && logger.warn) {
        logger.warn('No AI engines available');
      }
    }
  }
  
  getEnginesInfo() {
    if (!this.initialized) {
      this.initializeSync();
    }
    const info = {};
    for (const [name, engine] of this.engines) {
      info[name] = {
        name: name,
        enabled: true,
        type: name === 'openai' ? 'cloud' : 'local'
      };
    }
    return info;
  }
  
  getPrimaryEngine() {
    if (!this.initialized) {
      this.initializeSync();
    }
    return this.primaryEngine ? this.engines.get(this.primaryEngine) : null;
  }

  getAvailableEngines() {
    if (!this.initialized) {
      this.initializeSync();
    }
    const availableEngines = [];
    for (const [name, engine] of this.engines) {
      if (engine.isEnabled && engine.isEnabled()) {
        availableEngines.push(name);
      }
    }
    return availableEngines;
  }

  getEngine(engineName) {
    if (!this.initialized) {
      this.initializeSync();
    }
    return this.engines.get(engineName) || null;
  }
  
  validateEnabled() {
    if (!this.enabled) {
      throw new Error('AI features are not available');
    }
    if (this.getAvailableEngines().length === 0) {
      throw new Error('No AI engines are currently available');
    }
  }

  async testConnection(engineName = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (engineName) {
      const engine = this.getEngine(engineName);
      if (!engine) {
        throw new Error(`Engine '${engineName}' not found`);
      }
      return await engine.testConnection();
    }

    const results = {};
    for (const [name, engine] of this.engines) {
      try {
        results[name] = await engine.testConnection();
      } catch (error) {
        results[name] = { success: false, error: error.message };
      }
    }
    return results;
  }
  
  async testConnections() {
    return this.testConnection();
  }

  async generateInsight(systemPrompt, userPrompt, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.getAvailableEngines().length === 0) {
      throw new Error('No AI engines are currently available');
    }

    // Handle specific engine request
    if (options.engine) {
      if (!this.engines.has(options.engine)) {
        throw new Error(`Unknown AI engine: ${options.engine}`);
      }
      const engine = this.engines.get(options.engine);
      return await engine.generateInsight(systemPrompt, userPrompt, options);
    }

    const engineOrder = this._getEngineOrder(options.preferredEngine);
    let lastError = null;

    for (const engineName of engineOrder) {
      const engine = this.engines.get(engineName);
      if (!engine) continue;

      try {
        if (logger && logger.debug) {
          logger.debug(`Attempting insight generation with ${engineName}`);
        }
        const result = await engine.generateInsight(systemPrompt, userPrompt, options);
        if (logger && logger.info) {
          logger.info(`Successfully generated insight using ${engineName}`);
        }
        return result;
      } catch (error) {
        lastError = error;
        if (logger && logger.warn) {
          logger.warn(`Failed to generate insight with ${engineName}:`, error.message);
        }
        
        if (!this._shouldRetryWithNextEngine(error)) {
          throw error;
        }
      }
    }

    throw lastError || new Error('All AI engines failed');
  }

  _getEngineOrder(preferredEngine = null) {
    const engines = Array.from(this.engines.keys());
    
    if (preferredEngine && this.engines.has(preferredEngine)) {
      const filtered = engines.filter(name => name !== preferredEngine);
      return [preferredEngine, ...filtered];
    }
    
    if (this.primaryEngine && this.engines.has(this.primaryEngine)) {
      const filtered = engines.filter(name => name !== this.primaryEngine);
      return [this.primaryEngine, ...filtered];
    }
    
    return engines;
  }

  _shouldRetryWithNextEngine(error) {
    const retryableErrors = [
      'RATE_LIMITED',
      'SERVICE_UNAVAILABLE', 
      'CONNECTION_ERROR',
      'TIMEOUT_ERROR'
    ];
    
    return retryableErrors.includes(error.code) || 
           error.message.includes('timeout') ||
           error.message.includes('connection') ||
           error.message.includes('unavailable');
  }

  isEnabled() {
    return config.ai.enabled && this.engines.size > 0;
  }
  
  getEngineByName(engineName) {
    return this.getEngine(engineName);
  }

  async generateDemandForecast(params) {
    const systemPrompt = `You are an AI assistant specialized in restaurant demand forecasting. 
Analyze historical order data and menu items to predict future demand patterns.
Provide actionable insights for inventory planning and menu optimization.
Format your response as JSON with 'forecast', 'insights', and 'recommendations' fields.`;

    const userPrompt = `Based on the following data, provide a demand forecast for the next ${params.timeframe || '7d'}:

Menu Items: ${JSON.stringify(params.menuItems, null, 2)}
Historical Orders: ${JSON.stringify(params.historicalOrders, null, 2)}

Please analyze trends and provide specific recommendations for inventory planning.`;

    const result = await this.generateInsight(systemPrompt, userPrompt, { timeout: 30000 });
    return {
      ...result,
      type: 'demand_forecast'
    };
  }

  async generateMenuOptimization(params) {
    const systemPrompt = `You are an AI assistant specialized in restaurant menu optimization.
Analyze menu performance data to suggest improvements for profitability and customer satisfaction.
Consider pricing, popularity, preparation complexity, and ingredient costs.
Format your response as JSON with 'analysis', 'recommendations', and 'optimizations' fields.`;

    const userPrompt = `Analyze this menu and sales data to provide optimization recommendations:

Menu Items: ${JSON.stringify(params.menuItems, null, 2)}
Sales Data: ${JSON.stringify(params.salesData, null, 2)}
Customer Feedback: ${JSON.stringify(params.customerFeedback || [], null, 2)}

Please provide specific recommendations for menu improvements, pricing adjustments, and item additions/removals.`;

    const result = await this.generateInsight(systemPrompt, userPrompt, { timeout: 30000 });
    return {
      ...result,
      type: 'menu_optimization'
    };
  }
  
  async getDemandForecast(menuItems, historicalOrders, timeframe = '7d') {
    return this.generateDemandForecast({ menuItems, historicalOrders, timeframe });
  }

  async optimizeMenu(menuItems, salesData, customerFeedback = []) {
    return this.generateMenuOptimization({ menuItems, salesData, customerFeedback });
  }
}

module.exports = AIManager;
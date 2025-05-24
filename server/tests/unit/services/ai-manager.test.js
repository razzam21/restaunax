// Mock config
jest.mock('../../../src/config', () => ({
  ai: {
    enabled: true,
    primaryEngine: 'ollama',
    ollama: {
      enabled: true,
      baseURL: 'http://localhost:11434',
      model: 'llama2',
      timeout: 30000,
    },
    openai: {
      enabled: true,
      apiKey: 'test-api-key',
      model: 'gpt-4',
      timeout: 30000,
      maxTokens: 2000,
    },
  },
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock engines
jest.mock('../../../src/services/ai-engines/ollama-engine');
jest.mock('../../../src/services/ai-engines/openai-engine');

const OllamaEngine = require('../../../src/services/ai-engines/ollama-engine');
const OpenAIEngine = require('../../../src/services/ai-engines/openai-engine');
const AIManager = require('../../../src/services/ai-manager');

describe('AI Manager', () => {
  let mockOllamaEngine;
  let mockOpenAIEngine;
  let aiManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock engine instances
    mockOllamaEngine = {
      engineName: 'ollama',
      enabled: true,
      isEnabled: jest.fn(() => true),
      validateEnabled: jest.fn(),
      testConnection: jest.fn(),
      generateInsight: jest.fn(),
      getEngineInfo: jest.fn(() => ({ name: 'ollama', enabled: true })),
    };

    mockOpenAIEngine = {
      engineName: 'openai',
      enabled: true,
      isEnabled: jest.fn(() => true),
      validateEnabled: jest.fn(),
      testConnection: jest.fn(),
      generateInsight: jest.fn(),
      getEngineInfo: jest.fn(() => ({ name: 'openai', enabled: true })),
    };

    // Mock engine constructors
    OllamaEngine.mockImplementation(() => mockOllamaEngine);
    OpenAIEngine.mockImplementation(() => mockOpenAIEngine);

    // Create AI manager instance
    aiManager = new AIManager();
  });

  describe('Initialization', () => {
    test('should initialize with both engines when available', () => {
      expect(OllamaEngine).toHaveBeenCalledWith({
        enabled: true,
        baseURL: 'http://localhost:11434',
        model: 'llama2',
        timeout: 30000,
      });

      expect(OpenAIEngine).toHaveBeenCalledWith({
        enabled: true,
        apiKey: 'test-api-key',
        model: 'gpt-4',
        timeout: 30000,
        maxTokens: 2000,
      });
    });

    test('should set primary engine based on configuration', () => {
      expect(aiManager.primaryEngine).toBe('ollama');
    });

    test('should handle disabled AI configuration', () => {
      const config = require('../../../src/config');
      config.ai.enabled = false;

      const disabledManager = new AIManager();
      expect(disabledManager.enabled).toBe(false);
    });
  });

  describe('Engine Management', () => {
    test('should get available engines', () => {
      const engines = aiManager.getAvailableEngines();
      expect(engines).toEqual(['ollama', 'openai']);
    });

    test('should get engine info for all engines', () => {
      const info = aiManager.getEnginesInfo();
      expect(info).toHaveProperty('ollama');
      expect(info).toHaveProperty('openai');
      expect(info.ollama.name).toBe('ollama');
      expect(info.openai.name).toBe('openai');
    });

    test('should get primary engine', () => {
      const primary = aiManager.getPrimaryEngine();
      expect(primary).toBe(mockOllamaEngine);
    });

    test('should get engine by name', () => {
      const ollama = aiManager.getEngine('ollama');
      const openai = aiManager.getEngine('openai');
      
      expect(ollama).toBe(mockOllamaEngine);
      expect(openai).toBe(mockOpenAIEngine);
    });

    test('should return null for unknown engine', () => {
      const unknown = aiManager.getEngine('unknown');
      expect(unknown).toBeNull();
    });
  });

  describe('Feature Flag Validation', () => {
    test('should validate when AI is enabled', () => {
      expect(() => aiManager.validateEnabled()).not.toThrow();
    });

    test('should throw error when AI is disabled', () => {
      aiManager.enabled = false;
      expect(() => aiManager.validateEnabled()).toThrow('AI features are not available');
    });

    test('should throw error when no engines are available', () => {
      mockOllamaEngine.enabled = false;
      mockOpenAIEngine.enabled = false;
      mockOllamaEngine.isEnabled.mockReturnValue(false);
      mockOpenAIEngine.isEnabled.mockReturnValue(false);

      expect(() => aiManager.validateEnabled()).toThrow('No AI engines are currently available');
    });
  });

  describe('Connection Testing', () => {
    test('should test all engine connections', async () => {
      mockOllamaEngine.testConnection.mockResolvedValue(true);
      mockOpenAIEngine.testConnection.mockResolvedValue(true);

      const results = await aiManager.testConnections();

      expect(results).toEqual({
        ollama: true,
        openai: true,
      });
    });

    test('should handle connection failures gracefully', async () => {
      mockOllamaEngine.testConnection.mockResolvedValue(false);
      mockOpenAIEngine.testConnection.mockRejectedValue(new Error('API Error'));

      const results = await aiManager.testConnections();

      expect(results).toEqual({
        ollama: false,
        openai: false,
      });
    });

    test('should skip disabled engines in connection tests', async () => {
      mockOllamaEngine.enabled = false;
      mockOllamaEngine.isEnabled.mockReturnValue(false);
      mockOpenAIEngine.testConnection.mockResolvedValue(true);

      const results = await aiManager.testConnections();

      expect(results).toEqual({
        openai: true,
      });
      expect(mockOllamaEngine.testConnection).not.toHaveBeenCalled();
    });
  });

  describe('Insight Generation', () => {
    const mockInsight = {
      text: 'Generated insight',
      confidence: 0.85,
      metadata: { engine: 'ollama' },
    };

    test('should generate insight using primary engine', async () => {
      mockOllamaEngine.generateInsight.mockResolvedValue(mockInsight);

      const result = await aiManager.generateInsight(
        'System prompt',
        'User prompt'
      );

      expect(result).toBe(mockInsight);
      expect(mockOllamaEngine.generateInsight).toHaveBeenCalledWith(
        'System prompt',
        'User prompt',
        {}
      );
    });

    test('should fallback to secondary engine when primary fails', async () => {
      const primaryError = new Error('Primary engine failed');
      mockOllamaEngine.generateInsight.mockRejectedValue(primaryError);
      
      const secondaryInsight = {
        ...mockInsight,
        metadata: { engine: 'openai' },
      };
      mockOpenAIEngine.generateInsight.mockResolvedValue(secondaryInsight);

      const result = await aiManager.generateInsight(
        'System prompt',
        'User prompt'
      );

      expect(result).toBe(secondaryInsight);
      expect(mockOllamaEngine.generateInsight).toHaveBeenCalled();
      expect(mockOpenAIEngine.generateInsight).toHaveBeenCalled();
    });

    test('should throw error when all engines fail', async () => {
      const error1 = new Error('Engine 1 failed');
      const error2 = new Error('Engine 2 failed');
      
      mockOllamaEngine.generateInsight.mockRejectedValue(error1);
      mockOpenAIEngine.generateInsight.mockRejectedValue(error2);

      await expect(
        aiManager.generateInsight('System prompt', 'User prompt')
      ).rejects.toThrow('All AI engines failed');
    });

    test('should use specific engine when requested', async () => {
      mockOpenAIEngine.generateInsight.mockResolvedValue(mockInsight);

      const result = await aiManager.generateInsight(
        'System prompt',
        'User prompt',
        { engine: 'openai' }
      );

      expect(result).toBe(mockInsight);
      expect(mockOpenAIEngine.generateInsight).toHaveBeenCalled();
      expect(mockOllamaEngine.generateInsight).not.toHaveBeenCalled();
    });

    test('should throw error for unknown engine', async () => {
      await expect(
        aiManager.generateInsight(
          'System prompt',
          'User prompt',
          { engine: 'unknown' }
        )
      ).rejects.toThrow('Unknown AI engine: unknown');
    });

    test('should pass options to engine correctly', async () => {
      mockOllamaEngine.generateInsight.mockResolvedValue(mockInsight);

      const options = {
        temperature: 0.8,
        maxTokens: 1000,
      };

      await aiManager.generateInsight(
        'System prompt',
        'User prompt',
        options
      );

      expect(mockOllamaEngine.generateInsight).toHaveBeenCalledWith(
        'System prompt',
        'User prompt',
        options
      );
    });
  });

  describe('Backward Compatibility', () => {
    test('should support legacy demand forecast method', async () => {
      mockOllamaEngine.generateInsight.mockResolvedValue({
        text: JSON.stringify({
          confidence: 0.85,
          periods: [{ date: '2024-01-01', predicted_orders: 15 }],
        }),
        confidence: 0.85,
        metadata: { engine: 'ollama' },
      });

      const params = {
        restaurantId: 'test-id',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        historicalData: [{ date: '2023-12-01', orderCount: 5 }],
      };

      const result = await aiManager.generateDemandForecast(params);

      expect(result).toHaveProperty('type', 'demand_forecast');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('metadata');
    });

    test('should support legacy menu optimization method', async () => {
      mockOllamaEngine.generateInsight.mockResolvedValue({
        text: JSON.stringify({
          confidence: 0.82,
          recommendations: [{ type: 'pricing', item_id: 'item-1' }],
        }),
        confidence: 0.82,
        metadata: { engine: 'ollama' },
      });

      const params = {
        restaurantId: 'test-id',
        menuItems: [{ id: 'item-1', name: 'Pasta' }],
        orderHistory: [{ id: 'order-1', total: 14.99 }],
      };

      const result = await aiManager.generateMenuOptimization(params);

      expect(result).toHaveProperty('type', 'menu_optimization');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('metadata');
    });
  });

  describe('Error Handling', () => {
    test('should handle disabled engines gracefully', () => {
      mockOllamaEngine.enabled = false;
      mockOllamaEngine.isEnabled.mockReturnValue(false);

      const availableEngines = aiManager.getAvailableEngines();
      expect(availableEngines).toEqual(['openai']);
    });

    test('should handle engine initialization errors', () => {
      // Test that manager continues to work even if one engine fails to initialize
      OllamaEngine.mockImplementation(() => {
        throw new Error('Failed to initialize');
      });

      expect(() => new AIManager()).not.toThrow();
    });
  });
});
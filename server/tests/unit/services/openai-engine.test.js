// Mock OpenAI SDK
jest.mock('openai');

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const OpenAI = require('openai');
const OpenAIEngine = require('../../../src/services/ai-engines/openai-engine');

describe('OpenAI Engine', () => {
  let mockOpenAI;
  let openaiEngine;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock OpenAI instance
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    // Mock OpenAI constructor
    OpenAI.mockImplementation(() => mockOpenAI);

    // Create engine instance
    openaiEngine = new OpenAIEngine({
      enabled: true,
      apiKey: 'test-api-key',
      model: 'gpt-4',
      timeout: 30000,
      maxTokens: 2000,
    });
  });

  describe('Constructor and Configuration', () => {
    test('should initialize with correct properties', () => {
      expect(openaiEngine.engineName).toBe('openai');
      expect(openaiEngine.enabled).toBe(true);
      expect(openaiEngine.config.model).toBe('gpt-4');
      expect(openaiEngine.config.maxTokens).toBe(2000);
    });

    test('should create OpenAI client with API key', () => {
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        timeout: 30000,
      });
    });

    test('should handle missing API key', () => {
      const engineWithoutKey = new OpenAIEngine({
        enabled: true,
        // Missing apiKey
        model: 'gpt-4',
      });

      expect(engineWithoutKey.enabled).toBe(false);
    });

    test('should handle disabled configuration', () => {
      const disabledEngine = new OpenAIEngine({
        enabled: false,
        apiKey: 'test-api-key',
        model: 'gpt-4',
      });

      expect(disabledEngine.enabled).toBe(false);
    });
  });

  describe('Connection Testing', () => {
    test('should return true for successful connection test', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        id: 'test-completion',
        choices: [
          {
            message: { content: 'Test response' },
            finish_reason: 'stop',
          },
        ],
        usage: { total_tokens: 10 },
      });

      const result = await openaiEngine.testConnection();
      expect(result).toBe(true);
    });

    test('should return false for failed connection test', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const result = await openaiEngine.testConnection();
      expect(result).toBe(false);
    });

    test('should return false when engine is disabled', async () => {
      openaiEngine.enabled = false;

      const result = await openaiEngine.testConnection();
      expect(result).toBe(false);
    });

    test('should handle API authentication errors', async () => {
      const authError = new Error('Invalid API key');
      authError.code = 'invalid_api_key';
      mockOpenAI.chat.completions.create.mockRejectedValue(authError);

      const result = await openaiEngine.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('Insight Generation', () => {
    const mockCompletion = {
      id: 'test-completion-123',
      choices: [
        {
          message: {
            content: JSON.stringify({
              confidence: 0.85,
              analysis: 'Test analysis result',
              recommendations: ['Test recommendation'],
            }),
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
      },
      model: 'gpt-4',
    };

    test('should generate insight successfully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockCompletion);

      const result = await openaiEngine.generateInsight(
        'You are a restaurant analyst',
        'Analyze this menu data: {...}',
        { temperature: 0.7 }
      );

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata.engine).toBe('openai');
      expect(result.metadata.model).toBe('gpt-4');
    });

    test('should throw error when engine is disabled', async () => {
      openaiEngine.enabled = false;

      await expect(
        openaiEngine.generateInsight('System prompt', 'User prompt')
      ).rejects.toThrow('AI engine openai is not available');
    });

    test('should handle API errors gracefully', async () => {
      const apiError = new Error('Rate limit exceeded');
      apiError.code = 'rate_limit_exceeded';
      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      await expect(
        openaiEngine.generateInsight('System prompt', 'User prompt')
      ).rejects.toThrow('OpenAI API quota exceeded. Please try again later.');
    });

    test('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'timeout';
      mockOpenAI.chat.completions.create.mockRejectedValue(timeoutError);

      await expect(
        openaiEngine.generateInsight('System prompt', 'User prompt')
      ).rejects.toThrow('OpenAI API timeout');
    });

    test('should handle invalid JSON responses', async () => {
      const invalidJsonResponse = {
        ...mockCompletion,
        choices: [
          {
            message: { content: 'Invalid JSON response' },
            finish_reason: 'stop',
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(invalidJsonResponse);

      const result = await openaiEngine.generateInsight(
        'System prompt',
        'User prompt'
      );

      expect(result.text).toBe('Invalid JSON response');
      expect(result.confidence).toBe(0.7); // Fallback confidence
    });

    test('should pass correct parameters to OpenAI API', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockCompletion);

      await openaiEngine.generateInsight(
        'You are a restaurant analyst',
        'Analyze this data',
        {
          temperature: 0.8,
          maxTokens: 1500,
        }
      );

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a restaurant analyst' },
          { role: 'user', content: 'Analyze this data' },
        ],
        temperature: 0.8,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });
    });

    test('should use default options when none provided', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockCompletion);

      await openaiEngine.generateInsight(
        'System prompt',
        'User prompt'
      );

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'System prompt' },
          { role: 'user', content: 'User prompt' },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });
    });
  });

  describe('Response Processing', () => {
    test('should extract confidence from JSON response', async () => {
      const responseWithConfidence = {
        id: 'test',
        choices: [{
          message: {
            content: JSON.stringify({ confidence: 0.95, analysis: 'test' })
          },
          finish_reason: 'stop'
        }],
        usage: { total_tokens: 100 },
        model: 'gpt-4'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(responseWithConfidence);

      const result = await openaiEngine.generateInsight('sys', 'user');
      expect(result.confidence).toBe(0.95);
    });

    test('should use fallback confidence for non-JSON responses', async () => {
      const textResponse = {
        id: 'test',
        choices: [{
          message: { content: 'Plain text response' },
          finish_reason: 'stop'
        }],
        usage: { total_tokens: 100 },
        model: 'gpt-4'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(textResponse);

      const result = await openaiEngine.generateInsight('sys', 'user');
      expect(result.confidence).toBe(0.7);
    });

    test('should include usage metrics in metadata', async () => {
      const responseWithUsage = {
        id: 'test',
        choices: [{
          message: { content: 'test response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 75,
          total_tokens: 125
        },
        model: 'gpt-4'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(responseWithUsage);

      const result = await openaiEngine.generateInsight('sys', 'user');
      expect(result.metadata.usage).toEqual({
        prompt_tokens: 50,
        completion_tokens: 75,
        total_tokens: 125
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      const networkError = new Error('Network unreachable');
      networkError.code = 'ENOTFOUND';
      mockOpenAI.chat.completions.create.mockRejectedValue(networkError);

      await expect(
        openaiEngine.generateInsight('sys', 'user')
      ).rejects.toThrow('OpenAI API network error');
    });

    test('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.status = 429;
      mockOpenAI.chat.completions.create.mockRejectedValue(quotaError);

      await expect(
        openaiEngine.generateInsight('sys', 'user')
      ).rejects.toThrow('OpenAI API quota exceeded');
    });

    test('should handle invalid model errors', async () => {
      const modelError = new Error('Model not found');
      modelError.status = 404;
      mockOpenAI.chat.completions.create.mockRejectedValue(modelError);

      await expect(
        openaiEngine.generateInsight('sys', 'user')
      ).rejects.toThrow('OpenAI model gpt-4 not available');
    });
  });
});
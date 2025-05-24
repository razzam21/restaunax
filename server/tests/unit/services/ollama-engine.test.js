// Mock axios
jest.mock('axios');

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const axios = require('axios');
const OllamaEngine = require('../../../src/services/ai-engines/ollama-engine');

describe('Ollama Engine', () => {
  let mockAxiosInstance;
  let ollamaEngine;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };

    // Mock axios.create
    axios.create.mockReturnValue(mockAxiosInstance);

    // Create engine instance
    ollamaEngine = new OllamaEngine({
      enabled: true,
      baseURL: 'http://localhost:11434',
      model: 'llama2',
      timeout: 30000,
    });
  });

  describe('Constructor and Configuration', () => {
    test('should initialize with correct properties', () => {
      expect(ollamaEngine.engineName).toBe('ollama');
      expect(ollamaEngine.enabled).toBe(true);
      expect(ollamaEngine.config.model).toBe('llama2');
      expect(ollamaEngine.config.baseURL).toBe('http://localhost:11434');
    });

    test('should create axios client with correct config', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:11434',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    test('should handle disabled configuration', () => {
      const disabledEngine = new OllamaEngine({
        enabled: false,
        baseURL: 'http://localhost:11434',
        model: 'llama2',
      });

      expect(disabledEngine.enabled).toBe(false);
    });

    test('should use default configuration', () => {
      const defaultEngine = new OllamaEngine({
        enabled: true,
      });

      expect(defaultEngine.config.baseURL).toBe('http://localhost:11434');
      expect(defaultEngine.config.model).toBe('llama2');
      expect(defaultEngine.config.timeout).toBe(30000);
    });
  });

  describe('Connection Testing', () => {
    test('should return true for successful connection test', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      const result = await ollamaEngine.testConnection();
      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/tags');
    });

    test('should return false for failed connection test', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection failed'));

      const result = await ollamaEngine.testConnection();
      expect(result).toBe(false);
    });

    test('should return false when engine is disabled', async () => {
      ollamaEngine.enabled = false;

      const result = await ollamaEngine.testConnection();
      expect(result).toBe(false);
    });

    test('should handle network timeout', async () => {
      const timeoutError = new Error('timeout');
      timeoutError.code = 'ECONNABORTED';
      mockAxiosInstance.get.mockRejectedValue(timeoutError);

      const result = await ollamaEngine.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('Insight Generation', () => {
    const mockOllamaResponse = {
      data: {
        response: JSON.stringify({
          confidence: 0.85,
          analysis: 'Test analysis result',
          recommendations: ['Test recommendation'],
        }),
        model: 'llama2',
        done: true,
      },
    };

    test('should generate insight successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue(mockOllamaResponse);

      const result = await ollamaEngine.generateInsight(
        'You are a restaurant analyst',
        'Analyze this menu data: {...}',
        { temperature: 0.7 }
      );

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata.engine).toBe('ollama');
      expect(result.metadata.model).toBe('llama2');
    });

    test('should throw error when engine is disabled', async () => {
      ollamaEngine.enabled = false;

      await expect(
        ollamaEngine.generateInsight('System prompt', 'User prompt')
      ).rejects.toThrow('AI engine ollama is not available');
    });

    test('should handle API errors gracefully', async () => {
      const apiError = new Error('Model not found');
      apiError.response = { status: 404 };
      mockAxiosInstance.post.mockRejectedValue(apiError);

      await expect(
        ollamaEngine.generateInsight('System prompt', 'User prompt')
      ).rejects.toThrow('Ollama model llama2 not available. Please check if the model is installed.');
    });

    test('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ECONNABORTED';
      mockAxiosInstance.post.mockRejectedValue(timeoutError);

      await expect(
        ollamaEngine.generateInsight('System prompt', 'User prompt')
      ).rejects.toThrow('Ollama API timeout');
    });

    test('should handle invalid JSON responses', async () => {
      const invalidJsonResponse = {
        data: {
          response: 'Invalid JSON response',
          model: 'llama2',
          done: true,
        },
      };

      mockAxiosInstance.post.mockResolvedValue(invalidJsonResponse);

      const result = await ollamaEngine.generateInsight(
        'System prompt',
        'User prompt'
      );

      expect(result.text).toBe('Invalid JSON response');
      expect(result.confidence).toBe(0.7); // Fallback confidence
    });

    test('should pass correct parameters to Ollama API', async () => {
      mockAxiosInstance.post.mockResolvedValue(mockOllamaResponse);

      const systemPrompt = 'You are a restaurant analyst';
      const userPrompt = 'Analyze this data';
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

      await ollamaEngine.generateInsight(systemPrompt, userPrompt);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/generate', {
        model: 'llama2',
        prompt: combinedPrompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.7,
        },
      });
    });

    test('should use custom options when provided', async () => {
      mockAxiosInstance.post.mockResolvedValue(mockOllamaResponse);

      await ollamaEngine.generateInsight(
        'System prompt',
        'User prompt',
        {
          temperature: 0.8,
          top_p: 0.9,
        }
      );

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/generate', {
        model: 'llama2',
        prompt: 'System prompt\n\nUser prompt',
        stream: false,
        format: 'json',
        options: {
          temperature: 0.8,
          top_p: 0.9,
        },
      });
    });
  });

  describe('Response Processing', () => {
    test('should extract confidence from JSON response', async () => {
      const responseWithConfidence = {
        data: {
          response: JSON.stringify({ confidence: 0.95, analysis: 'test' }),
          model: 'llama2',
          done: true,
        },
      };

      mockAxiosInstance.post.mockResolvedValue(responseWithConfidence);

      const result = await ollamaEngine.generateInsight('sys', 'user');
      expect(result.confidence).toBe(0.95);
    });

    test('should use fallback confidence for non-JSON responses', async () => {
      const textResponse = {
        data: {
          response: 'Plain text response',
          model: 'llama2',
          done: true,
        },
      };

      mockAxiosInstance.post.mockResolvedValue(textResponse);

      const result = await ollamaEngine.generateInsight('sys', 'user');
      expect(result.confidence).toBe(0.7);
    });

    test('should include model info in metadata', async () => {
      const responseWithModel = {
        data: {
          response: 'test response',
          model: 'llama2:7b',
          done: true,
          total_duration: 5000000000,
          load_duration: 1000000000,
        },
      };

      mockAxiosInstance.post.mockResolvedValue(responseWithModel);

      const result = await ollamaEngine.generateInsight('sys', 'user');
      expect(result.metadata.model).toBe('llama2:7b');
      expect(result.metadata.totalDuration).toBe(5000000000);
      expect(result.metadata.loadDuration).toBe(1000000000);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      const networkError = new Error('Network unreachable');
      networkError.code = 'ENOTFOUND';
      mockAxiosInstance.post.mockRejectedValue(networkError);

      await expect(
        ollamaEngine.generateInsight('sys', 'user')
      ).rejects.toThrow('Ollama API network error');
    });

    test('should handle service unavailable errors', async () => {
      const serviceError = new Error('Service unavailable');
      serviceError.response = { status: 503 };
      mockAxiosInstance.post.mockRejectedValue(serviceError);

      await expect(
        ollamaEngine.generateInsight('sys', 'user')
      ).rejects.toThrow('Ollama service unavailable');
    });

    test('should handle model not found errors', async () => {
      const modelError = new Error('Model not found');
      modelError.response = { status: 404 };
      mockAxiosInstance.post.mockRejectedValue(modelError);

      await expect(
        ollamaEngine.generateInsight('sys', 'user')
      ).rejects.toThrow('Ollama model llama2 not available');
    });

    test('should handle generic HTTP errors', async () => {
      const httpError = new Error('Bad request');
      httpError.response = { status: 400, data: { error: 'Invalid request' } };
      mockAxiosInstance.post.mockRejectedValue(httpError);

      await expect(
        ollamaEngine.generateInsight('sys', 'user')
      ).rejects.toThrow('Ollama API error: Bad request');
    });
  });

  describe('Prompt Building', () => {
    test('should combine system and user prompts correctly', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: 'test response',
          model: 'llama2',
          done: true,
        },
      });

      const systemPrompt = 'You are a helpful assistant.';
      const userPrompt = 'What is 2+2?';

      await ollamaEngine.generateInsight(systemPrompt, userPrompt);

      const expectedPrompt = `${systemPrompt}\n\n${userPrompt}`;
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/generate',
        expect.objectContaining({
          prompt: expectedPrompt,
        })
      );
    });

    test('should handle empty prompts gracefully', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          response: 'test response',
          model: 'llama2',
          done: true,
        },
      });

      await ollamaEngine.generateInsight('', 'user prompt');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/generate',
        expect.objectContaining({
          prompt: '\n\nuser prompt',
        })
      );
    });
  });
});
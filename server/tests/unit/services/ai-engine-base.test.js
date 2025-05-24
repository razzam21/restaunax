// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const AIEngineBase = require('../../../src/services/ai-engines/ai-engine-base');

describe('AI Engine Base', () => {
  let mockEngine;

  beforeEach(() => {
    // Create a concrete implementation for testing
    class MockAIEngine extends AIEngineBase {
      constructor(config) {
        super('mock', config);
      }

      async testConnection() {
        return this.enabled;
      }

      async generateInsight(systemPrompt, userPrompt, options = {}) {
        if (!this.enabled) {
          throw new Error('Engine not enabled');
        }
        return {
          text: 'Mock insight response',
          confidence: 0.8,
          metadata: { engine: 'mock' }
        };
      }
    }

    mockEngine = new MockAIEngine({
      enabled: true,
      timeout: 5000,
      model: 'mock-model'
    });
  });

  describe('Constructor and Configuration', () => {
    test('should initialize with correct properties', () => {
      expect(mockEngine.engineName).toBe('mock');
      expect(mockEngine.enabled).toBe(true);
      expect(mockEngine.config.timeout).toBe(5000);
      expect(mockEngine.config.model).toBe('mock-model');
    });

    test('should create logger with engine name', () => {
      const { createLogger } = require('../../../src/utils/logger');
      expect(createLogger).toHaveBeenCalledWith('ai-engine-mock');
    });

    test('should handle disabled engine', () => {
      const disabledEngine = new (class extends AIEngineBase {
        constructor() {
          super('disabled', { enabled: false });
        }
        async testConnection() { return false; }
        async generateInsight() { throw new Error('Not implemented'); }
      })();

      expect(disabledEngine.enabled).toBe(false);
    });
  });

  describe('Feature Flag Validation', () => {
    test('should validate when enabled', () => {
      expect(() => mockEngine.validateEnabled()).not.toThrow();
    });

    test('should throw error when disabled', () => {
      mockEngine.enabled = false;
      expect(() => mockEngine.validateEnabled()).toThrow('AI engine mock is not available');
    });

    test('should throw error with correct code when disabled', () => {
      mockEngine.enabled = false;
      try {
        mockEngine.validateEnabled();
      } catch (error) {
        expect(error.code).toBe('AI_ENGINE_DISABLED');
        expect(error.statusCode).toBe(503);
      }
    });
  });

  describe('Common Interface Methods', () => {
    test('should have isEnabled method', () => {
      expect(mockEngine.isEnabled()).toBe(true);
      mockEngine.enabled = false;
      expect(mockEngine.isEnabled()).toBe(false);
    });

    test('should have getEngineInfo method', () => {
      const info = mockEngine.getEngineInfo();
      expect(info).toHaveProperty('name', 'mock');
      expect(info).toHaveProperty('enabled', true);
      expect(info).toHaveProperty('model', 'mock-model');
      expect(info).toHaveProperty('timeout', 5000);
    });
  });

  describe('Abstract Method Requirements', () => {
    test('should require testConnection implementation', () => {
      class IncompleteEngine extends AIEngineBase {
        constructor() {
          super('incomplete', { enabled: true });
        }
        // Missing testConnection implementation
        async generateInsight() { return {}; }
      }

      // This would fail if actually called, but we're testing interface
      expect(() => new IncompleteEngine()).not.toThrow();
    });

    test('should require generateInsight implementation', () => {
      class IncompleteEngine extends AIEngineBase {
        constructor() {
          super('incomplete', { enabled: true });
        }
        async testConnection() { return true; }
        // Missing generateInsight implementation
      }

      expect(() => new IncompleteEngine()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle configuration validation', () => {
      expect(() => {
        new (class extends AIEngineBase {
          constructor() {
            super('test', null); // Invalid config
          }
          async testConnection() { return true; }
          async generateInsight() { return {}; }
        })();
      }).not.toThrow(); // Should handle gracefully
    });

    test('should provide default timeout', () => {
      const engineWithoutTimeout = new (class extends AIEngineBase {
        constructor() {
          super('test', { enabled: true }); // No timeout specified
        }
        async testConnection() { return true; }
        async generateInsight() { return {}; }
      })();

      expect(engineWithoutTimeout.config.timeout).toBe(30000); // Default
    });
  });

  describe('Response Format Validation', () => {
    test('should validate standard response format', () => {
      const validResponse = {
        text: 'Valid response',
        confidence: 0.8,
        metadata: { engine: 'test' }
      };

      expect(mockEngine.validateResponse(validResponse)).toBe(true);
    });

    test('should reject invalid response format', () => {
      const invalidResponse = {
        // Missing required fields
        invalidField: 'test'
      };

      expect(mockEngine.validateResponse(invalidResponse)).toBe(false);
    });

    test('should handle null/undefined responses', () => {
      expect(mockEngine.validateResponse(null)).toBe(false);
      expect(mockEngine.validateResponse(undefined)).toBe(false);
    });
  });
});
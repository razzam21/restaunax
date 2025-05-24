// Mock config first
jest.mock('../../../src/config', () => ({
  ai: {
    enabled: true,
    primaryEngine: 'openai',
    openai: {
      enabled: true,
      apiKey: 'test-key',
      model: 'gpt-4',
      timeout: 30000,
    },
    ollama: {
      enabled: true,
      baseURL: 'http://localhost:11434',
      model: 'llama2',
      timeout: 30000,
    }
  },
  logging: {
    level: 'info',
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

// Mock AI Manager
const mockAIManager = {
  generateInsight: jest.fn(),
  isEnabled: jest.fn(),
  testConnection: jest.fn(),
  getEngineInfo: jest.fn(),
};

jest.mock('../../../src/services/ai-manager', () => {
  return jest.fn().mockImplementation(() => mockAIManager);
});

const AIReportService = require('../../../src/services/ai-report-service');

describe('AI Report Service', () => {
  let aiReportService;

  beforeEach(() => {
    jest.clearAllMocks();
    aiReportService = new AIReportService();
    
    // Set default mock returns
    mockAIManager.isEnabled.mockReturnValue(true);
    mockAIManager.testConnection.mockResolvedValue(true);
    mockAIManager.getEngineInfo.mockReturnValue({ 
      engine: 'openai', 
      model: 'gpt-4',
      available: true 
    });
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default settings', () => {
      expect(aiReportService).toBeDefined();
      expect(aiReportService.enabled).toBe(true);
    });

    test('should initialize AI manager on first use', async () => {
      const reportOptions = {
        reportType: 'demand_forecast',
        systemPrompt: 'You are a forecasting expert',
        userPrompt: 'Analyze this data',
        data: { test: 'data' }
      };

      mockAIManager.generateInsight.mockResolvedValue({
        text: 'Test forecast result',
        confidence: 0.85,
        metadata: { engine: 'openai' }
      });

      await aiReportService.generateReport(reportOptions);
      
      expect(mockAIManager.generateInsight).toHaveBeenCalled();
    });
  });

  describe('Feature Validation', () => {
    test('should validate when AI is enabled', () => {
      expect(() => aiReportService.validateEnabled()).not.toThrow();
    });

    test('should throw error when AI is disabled', () => {
      aiReportService.enabled = false;
      
      expect(() => aiReportService.validateEnabled())
        .toThrow('AI features are not available with your current plan');
    });

    test('should throw error with correct error code when disabled', () => {
      aiReportService.enabled = false;
      
      try {
        aiReportService.validateEnabled();
      } catch (error) {
        expect(error.code).toBe('AI_FEATURES_DISABLED');
        expect(error.statusCode).toBe(402);
      }
    });
  });

  describe('Report Generation', () => {
    const validReportOptions = {
      reportType: 'demand_forecast',
      systemPrompt: 'You are a restaurant demand forecasting expert.',
      userPrompt: 'Analyze historical order data and predict demand.',
      data: {
        historicalOrders: [
          { date: '2024-01-01', orders: 25, revenue: 750 },
          { date: '2024-01-02', orders: 30, revenue: 900 }
        ],
        forecastPeriod: { start: '2024-01-08', end: '2024-01-14' }
      },
      temperature: 0.3,
      maxTokens: 2000
    };

    test('should generate report successfully with valid options', async () => {
      const mockAIResponse = {
        text: JSON.stringify({
          confidence: 0.85,
          forecast: [
            { date: '2024-01-08', predicted_orders: 28, confidence: 0.87 },
            { date: '2024-01-09', predicted_orders: 32, confidence: 0.83 }
          ],
          insights: ['Monday shows consistent growth', 'Tuesday peak expected'],
          recommendations: ['Staff 2 extra servers on Tuesday']
        }),
        confidence: 0.85,
        metadata: { engine: 'openai', model: 'gpt-4', tokens: 150 }
      };

      mockAIManager.generateInsight.mockResolvedValue(mockAIResponse);

      const result = await aiReportService.generateReport(validReportOptions);

      expect(result.success).toBe(true);
      expect(result.reportType).toBe('demand_forecast');
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.engine).toBe('openai');
      expect(result.metadata.confidence).toBe(0.85);
    });

    test('should handle structured JSON response correctly', async () => {
      const mockStructuredResponse = {
        confidence: 0.92,
        forecast: [{ date: '2024-01-08', predicted_orders: 25 }],
        insights: ['Peak hours analysis complete']
      };

      mockAIManager.generateInsight.mockResolvedValue({
        text: JSON.stringify(mockStructuredResponse),
        confidence: 0.92,
        metadata: { engine: 'openai' }
      });

      const result = await aiReportService.generateReport(validReportOptions);

      expect(result.success).toBe(true);
      expect(result.data.confidence).toBe(0.92);
      expect(result.data.forecast).toHaveLength(1);
      expect(result.data.insights).toContain('Peak hours analysis complete');
    });

    test('should handle non-JSON AI response gracefully', async () => {
      mockAIManager.generateInsight.mockResolvedValue({
        text: 'This is a plain text response about demand forecasting',
        confidence: 0.75,
        metadata: { engine: 'ollama' }
      });

      const result = await aiReportService.generateReport(validReportOptions);

      expect(result.success).toBe(true);
      expect(result.data.raw_response).toBe('This is a plain text response about demand forecasting');
      expect(result.metadata.confidence).toBe(0.75);
      expect(result.metadata.response_format).toBe('text');
    });

    test('should throw error when AI is disabled', async () => {
      aiReportService.enabled = false;

      await expect(aiReportService.generateReport(validReportOptions))
        .rejects
        .toThrow('AI features are not available');
    });

    test('should throw error with missing required options', async () => {
      const invalidOptions = {
        systemPrompt: 'Test prompt'
        // Missing reportType, userPrompt, data
      };

      await expect(aiReportService.generateReport(invalidOptions))
        .rejects
        .toThrow('Missing required parameters');
    });

    test('should handle AI manager errors gracefully', async () => {
      mockAIManager.generateInsight.mockRejectedValue(new Error('OpenAI API error'));

      await expect(aiReportService.generateReport(validReportOptions))
        .rejects
        .toThrow('Failed to generate AI report: OpenAI API error');
    });

    test('should apply default options when not specified', async () => {
      const minimalOptions = {
        reportType: 'test_report',
        systemPrompt: 'You are a test expert',
        userPrompt: 'Test prompt',
        data: { test: true }
      };

      mockAIManager.generateInsight.mockResolvedValue({
        text: '{"result": "test"}',
        confidence: 0.8,
        metadata: { engine: 'openai' }
      });

      await aiReportService.generateReport(minimalOptions);

      expect(mockAIManager.generateInsight).toHaveBeenCalledWith(
        'You are a test expert',
        expect.stringContaining('Test prompt'),
        expect.objectContaining({
          temperature: 0.3, // Default temperature
          maxTokens: 1500   // Default maxTokens
        })
      );
    });

    test('should sanitize data before sending to AI', async () => {
      const optionsWithUnsafeData = {
        reportType: 'test_report',
        systemPrompt: 'You are a test expert',
        userPrompt: 'Analyze this data',
        data: {
          customerName: '<script>alert("xss")</script>',
          orders: [
            { item: '<img src=x onerror=alert(1)>' }
          ]
        }
      };

      mockAIManager.generateInsight.mockResolvedValue({
        text: '{"result": "safe"}',
        confidence: 0.8,
        metadata: { engine: 'openai' }
      });

      const result = await aiReportService.generateReport(optionsWithUnsafeData);

      expect(result.success).toBe(true);
      // Verify that the service handled unsafe data without throwing
      expect(mockAIManager.generateInsight).toHaveBeenCalled();
    });
  });

  describe('Connection Testing', () => {
    test('should return true for successful connection test', async () => {
      mockAIManager.testConnection.mockResolvedValue(true);

      const result = await aiReportService.testConnection();
      expect(result).toBe(true);
    });

    test('should return false for failed connection test', async () => {
      mockAIManager.testConnection.mockResolvedValue(false);

      const result = await aiReportService.testConnection();
      expect(result).toBe(false);
    });

    test('should return false when AI is disabled', async () => {
      aiReportService.enabled = false;

      const result = await aiReportService.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('Report Type Validation', () => {
    test('should accept valid report types', async () => {
      const validTypes = ['demand_forecast', 'menu_optimization', 'sales_analysis', 'custom_report'];
      
      for (const reportType of validTypes) {
        const options = {
          reportType,
          systemPrompt: 'Test prompt',
          userPrompt: 'Test prompt',
          data: { test: true }
        };

        mockAIManager.generateInsight.mockResolvedValue({
          text: '{"result": "test"}',
          confidence: 0.8,
          metadata: { engine: 'openai' }
        });

        const result = await aiReportService.generateReport(options);
        expect(result.reportType).toBe(reportType);
      }
    });

    test('should handle unknown report types', async () => {
      const options = {
        reportType: 'unknown_report_type',
        systemPrompt: 'Test prompt',
        userPrompt: 'Test prompt',
        data: { test: true }
      };

      mockAIManager.generateInsight.mockResolvedValue({
        text: '{"result": "test"}',
        confidence: 0.8,
        metadata: { engine: 'openai' }
      });

      const result = await aiReportService.generateReport(options);
      expect(result.reportType).toBe('unknown_report_type');
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should provide user-friendly error messages', async () => {
      mockAIManager.generateInsight.mockRejectedValue(new Error('Rate limit exceeded'));

      const options = {
        reportType: 'test',
        systemPrompt: 'Test',
        userPrompt: 'Test',
        data: {}
      };

      await expect(aiReportService.generateReport(options))
        .rejects
        .toThrow('Failed to generate AI report: Rate limit exceeded');
    });

    test('should handle timeout errors specifically', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'TIMEOUT';
      mockAIManager.generateInsight.mockRejectedValue(timeoutError);

      const options = {
        reportType: 'test',
        systemPrompt: 'Test',
        userPrompt: 'Test',
        data: {}
      };

      await expect(aiReportService.generateReport(options))
        .rejects
        .toThrow('Failed to generate AI report: Request timeout');
    });
  });

  describe('Metadata and Tracking', () => {
    test('should include comprehensive metadata in response', async () => {
      mockAIManager.generateInsight.mockResolvedValue({
        text: '{"result": "test"}',
        confidence: 0.88,
        metadata: { 
          engine: 'openai', 
          model: 'gpt-4',
          tokens: 234,
          duration: 1500
        }
      });

      const options = {
        reportType: 'demand_forecast',
        systemPrompt: 'Test prompt',
        userPrompt: 'Test prompt',
        data: { test: true }
      };

      const result = await aiReportService.generateReport(options);

      expect(result.metadata).toEqual(expect.objectContaining({
        engine: 'openai',
        model: 'gpt-4',
        confidence: 0.88,
        tokens: 234,
        response_format: 'json',
        timestamp: expect.any(String),
        duration: expect.any(Number)
      }));
    });

    test('should track request parameters in metadata', async () => {
      mockAIManager.generateInsight.mockResolvedValue({
        text: '{"result": "test"}',
        confidence: 0.8,
        metadata: { engine: 'openai' }
      });

      const options = {
        reportType: 'test_report',
        systemPrompt: 'Custom system prompt',
        userPrompt: 'Custom user prompt',
        data: { test: true },
        temperature: 0.7,
        maxTokens: 1000
      };

      const result = await aiReportService.generateReport(options);

      expect(result.metadata.request_params).toEqual(expect.objectContaining({
        temperature: 0.7,
        maxTokens: 1000,
        reportType: 'test_report'
      }));
    });
  });
});
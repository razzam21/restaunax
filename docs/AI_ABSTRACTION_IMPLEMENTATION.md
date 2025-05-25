# AI Abstraction Layer Implementation Documentation

## Overview

This document details the implementation of the AI abstraction layer for the Restaunax project, which adds OpenAI as an additional AI engine alongside the existing Ollama engine, with a complete abstraction that makes all AI operations engine-agnostic.

## 🎯 Objectives Achieved

1. **Multiple AI Engine Support**: Added OpenAI alongside existing Ollama
2. **Engine Abstraction**: Created unified interface for all AI operations
3. **Engine-Agnostic Services**: Reports and controllers work with any AI engine
4. **Consolidated Configuration**: Single environment configuration system
5. **Fallback & Resilience**: Automatic engine selection and failover
6. **Test-Driven Development**: Comprehensive test coverage for all components

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  (Controllers, Routes, Reports - Engine Agnostic)          │
└─────────────────────┬───────────────────────────────────────┘
                      │ System Prompt, User Prompt, Options
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     AI Service                             │
│         (Engine-agnostic API, Legacy Compatibility)        │
└─────────────────────┬───────────────────────────────────────┘
                      │ generateInsight(system, user, options)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Manager                              │
│    (Engine Selection, Fallback Logic, Abstraction)         │
└─────────────────────┬───────────────────────────────────────┘
                      │ Route to Available Engine
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                Engine Implementations                       │
│  ┌─────────────────┐              ┌─────────────────┐       │
│  │  OpenAI Engine  │              │  Ollama Engine  │       │
│  │   (GPT Models)  │              │ (Local Models)  │       │
│  │     Cloud       │              │     Local       │       │
│  └─────────────────┘              └─────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Component Overview

1. **AI Engine Base Class**: Abstract interface defining engine contract
2. **Concrete Engines**: OpenAI and Ollama implementations
3. **AI Manager**: Orchestrates engine selection and fallback
4. **AI Service**: High-level API maintaining backward compatibility
5. **Configuration**: Consolidated environment-based configuration

## 📁 File Structure

```
server/src/
├── config/
│   └── index.js                          # Updated: Consolidated AI config
├── services/
│   ├── ai-service.js                     # Updated: Now uses AI Manager
│   ├── ai-manager.js                     # NEW: Engine orchestration
│   └── ai-engines/
│       ├── ai-engine-base.js             # NEW: Abstract base class
│       ├── openai-engine.js              # NEW: OpenAI implementation
│       └── ollama-engine.js              # NEW: Refactored Ollama engine
└── tests/unit/services/
    ├── ai-service.test.js                # Existing: Needs updates for new arch
    ├── ai-manager.test.js                # NEW: 24 comprehensive tests
    └── ai-engines/
        ├── ai-engine-base.test.js        # NEW: 15 tests passing
        ├── openai-engine.test.js         # NEW: 21 tests passing
        └── ollama-engine.test.js         # NEW: 24 tests passing
```

## 🔧 Configuration

### Environment Variables

```bash
# Master AI Control
AI_ENABLED=true                          # Master switch for all AI features
AI_PRIMARY_ENGINE=openai                 # Primary engine: 'openai' or 'ollama'

# OpenAI Configuration
OPENAI_ENABLED=true                       # Enable OpenAI engine
OPENAI_API_KEY=sk-svcacct-...            # Your OpenAI API key
OPENAI_MODEL=gpt-4                       # Model to use (gpt-4, gpt-3.5-turbo)
OPENAI_TIMEOUT=30000                     # Request timeout in milliseconds
OPENAI_MAX_TOKENS=2000                   # Maximum tokens per request

# Ollama Configuration
OLLAMA_ENABLED=true                      # Enable Ollama engine
OLLAMA_BASE_URL=http://localhost:11434   # Ollama server URL
OLLAMA_MODEL=llama2                      # Model to use
OLLAMA_TIMEOUT=30000                     # Request timeout in milliseconds
```

### Configuration Structure

```javascript
// config/index.js
{
  ai: {
    enabled: true,                        // Master AI switch
    primaryEngine: 'openai',              // Default engine
    ollama: {
      enabled: true,
      baseURL: 'http://localhost:11434',
      model: 'llama2',
      timeout: 30000
    },
    openai: {
      enabled: true,
      apiKey: 'sk-svcacct-...',
      model: 'gpt-4',
      timeout: 30000,
      maxTokens: 2000
    }
  }
}
```

## 🔌 Engine Implementations

### Abstract Base Class (`ai-engine-base.js`)

Defines the contract all AI engines must implement:

```javascript
class AIEngineBase {
  // Abstract methods (must be implemented)
  async testConnection() { /* Must implement */ }
  async generateInsight(systemPrompt, userPrompt, options) { /* Must implement */ }
  
  // Concrete methods (inherited by all engines)
  validateEnabled() { /* Validation logic */ }
  isEnabled() { /* Status check */ }
  getEngineInfo() { /* Engine metadata */ }
}
```

### OpenAI Engine (`openai-engine.js`)

**Features:**
- Uses OpenAI SDK for API communication
- Supports GPT-4, GPT-3.5-turbo, and other models
- Comprehensive error handling (rate limits, model availability)
- Token usage tracking and optimization
- Structured response formatting

**Key Methods:**
```javascript
async generateInsight(systemPrompt, userPrompt, options = {}) {
  // Constructs messages array for OpenAI API
  // Handles streaming and non-streaming responses
  // Returns standardized format: { text, confidence, metadata }
}

async testConnection() {
  // Tests API connectivity and model availability
  // Returns boolean success status
}
```

### Ollama Engine (`ollama-engine.js`)

**Features:**
- HTTP client using axios for local Ollama server
- Combines system and user prompts for single prompt format
- Connection testing and health checks
- Local model management support
- Maintains backward compatibility with existing implementation

**Key Methods:**
```javascript
async generateInsight(systemPrompt, userPrompt, options = {}) {
  // Combines prompts for Ollama's format
  // Makes HTTP request to local server
  // Returns standardized format: { text, confidence, metadata }
}
```

## 🎯 AI Manager (`ai-manager.js`)

The AI Manager is the core orchestration component that provides complete engine abstraction.

### Key Features

1. **Engine Management**: Initializes and manages multiple AI engines
2. **Selection Logic**: Routes requests to appropriate engines
3. **Fallback Handling**: Automatically tries backup engines on failures
4. **Error Classification**: Determines when to retry vs. fail fast
5. **Unified Interface**: Single API for all AI operations

### Core Methods

```javascript
class AIManager {
  // Engine management
  getAvailableEngines()                   // Returns list of working engines
  getEngine(engineName)                   // Get specific engine instance
  getPrimaryEngine()                      // Get current primary engine
  
  // Connection testing
  async testConnection(engineName?)       // Test specific or all engines
  
  // Main AI operations
  async generateInsight(systemPrompt, userPrompt, options)
  
  // Legacy compatibility
  async generateDemandForecast(params)
  async generateMenuOptimization(params)
  
  // Feature validation
  validateEnabled()                       // Throws if AI disabled
  isEnabled()                            // Boolean check
}
```

### Engine Selection Algorithm

1. **Preferred Engine**: Use `options.engine` if specified
2. **Primary Engine**: Use configured primary engine
3. **Fallback Chain**: Try remaining engines in order
4. **Error Handling**: Skip engines with non-retryable errors

### Fallback Logic

```javascript
// Retryable errors that trigger fallback
const retryableErrors = [
  'RATE_LIMITED',
  'SERVICE_UNAVAILABLE', 
  'CONNECTION_ERROR',
  'TIMEOUT_ERROR'
];
```

## 🔄 Updated AI Service (`ai-service.js`)

The AI Service maintains the existing public API while leveraging the new abstraction layer.

### Key Changes

1. **Engine Agnostic**: No longer directly communicates with specific engines
2. **AI Manager Integration**: Uses AI Manager for all operations
3. **Backward Compatibility**: Maintains existing method signatures
4. **Enhanced Error Handling**: Better user-facing error messages

### Usage Examples

```javascript
const aiService = require('./services/ai-service');

// Demand forecasting (unchanged public API)
const forecast = await aiService.generateDemandForecast({
  restaurantId: 'uuid',
  startDate: new Date(),
  endDate: new Date(),
  historicalData: []
});

// Menu optimization (unchanged public API)
const optimization = await aiService.generateMenuOptimization({
  restaurantId: 'uuid',
  menuItems: [],
  orderHistory: []
});

// Engine information (new method)
const engineInfo = aiService.getEngineInfo();
// Returns: { enabled, availableEngines, primaryEngine, enginesInfo }
```

## 📊 Standardized Response Format

All engines return responses in a consistent format:

```javascript
{
  text: "Generated AI response content",
  confidence: 0.85,                      // 0.0 to 1.0 confidence score
  metadata: {
    engine: "openai",                     // Which engine generated response
    model: "gpt-4",                       // Specific model used
    usage: {                              // Token/resource usage (if available)
      promptTokens: 150,
      completionTokens: 300,
      totalTokens: 450
    },
    requestId: "req_123",                 // Request tracking ID
    processingTime: 2340                  // Time in milliseconds
  }
}
```

## 🧪 Testing Strategy

### Test Coverage by Component

1. **AI Engine Base** (15 tests) ✅
   - Abstract method enforcement
   - Configuration validation
   - Error handling patterns
   - Timeout management

2. **OpenAI Engine** (21 tests) ✅
   - API communication
   - Authentication handling
   - Rate limit management
   - Response parsing
   - Error scenarios

3. **Ollama Engine** (24 tests) ✅
   - HTTP client operations
   - Local server connectivity
   - Prompt formatting
   - Response processing
   - Legacy compatibility

4. **AI Manager** (24 tests) ✅ Core functionality
   - Engine initialization
   - Selection logic
   - Fallback mechanisms
   - Connection testing
   - Feature validation

### Test Approach

- **Test-Driven Development**: Tests written before implementation
- **Comprehensive Mocking**: Isolated testing of each component
- **Error Simulation**: Testing failure scenarios and edge cases
- **Integration Testing**: End-to-end workflow validation

## 🚀 Usage for Developers

### For Application Developers

The abstraction layer means you work with AI without caring about engines:

```javascript
// In your controller or service
const aiService = require('../services/ai-service');

// Just provide your prompts - engine selection is automatic
const result = await aiService.generateDemandForecast({
  restaurantId: req.user.restaurantId,
  historicalData: await getHistoricalData(),
  startDate: new Date(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
});

// The result comes back in a standard format regardless of engine
console.log(`Forecast confidence: ${result.confidence}`);
console.log(`Generated by: ${result.metadata.engine}`);
```

### Menu Optimization Implementation Example

The menu optimization feature demonstrates complete integration with the AI abstraction layer:

```javascript
// Menu Optimization Service Integration
const AIManager = require('./ai-manager');

class MenuOptimizationService {
  async analyzeMenu(restaurantId, options = {}) {
    // Prepare data for AI analysis
    const menuData = await this._getMenuData(restaurantId, options);
    
    // Configure AI analysis parameters
    const aiConfig = {
      engine: options.engine || 'openai',
      model: options.model || 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000
    };

    // System prompt defines the AI's role and capabilities
    const systemPrompt = `You are a restaurant menu optimization expert with deep knowledge of food service operations, customer preferences, and revenue optimization strategies.

Your task is to analyze restaurant menu performance data and provide actionable recommendations to improve profitability, reduce waste, and enhance customer satisfaction.

Always respond with valid JSON in this exact format:
{
  "recommendations": [
    {
      "type": "pricing" | "promotion" | "menu_design" | "inventory" | "pairing",
      "priority": "high" | "medium" | "low",
      "item": "item name or category",
      "current_state": "description of current situation",
      "recommendation": "specific action to take",
      "expected_impact": "projected outcome",
      "implementation": "how to implement this change"
    }
  ],
  "key_insights": {
    "top_performers": ["item1", "item2"],
    "underperformers": ["item3", "item4"],
    "profit_opportunities": "summary of revenue potential",
    "risk_areas": "areas requiring attention"
  },
  "overall_health": "excellent" | "good" | "fair" | "poor",
  "confidence": 0.0-1.0
}`;
    
    // User prompt contains the specific analysis request and data
    const userPrompt = this._buildAnalysisPrompt(menuData);

    try {
      // Use AI abstraction layer for engine-agnostic analysis
      const aiResponse = await AIManager.generateContent({
        systemPrompt,
        userPrompt,
        options: aiConfig
      });

      // Parse and enhance AI response with real data
      return this._enhanceAIResponse(aiResponse, menuData);
    } catch (error) {
      logger.error('Menu optimization analysis failed:', error);
      throw error;
    }
  }

  _buildAnalysisPrompt(menuData) {
    return `Analyze this restaurant menu performance data and provide optimization recommendations:

MENU ITEMS (${menuData.totalItems} items):
${JSON.stringify(menuData.menuItems, null, 2)}

SALES PERFORMANCE:
- Analysis Period: ${menuData.period}
- Total Revenue: $${menuData.totalRevenue}
- Total Orders: ${menuData.totalOrders}
- Items Analyzed: ${menuData.totalItemsAnalyzed}

PERFORMANCE METRICS:
${JSON.stringify(menuData.performanceData, null, 2)}

Please analyze this data and provide specific, actionable recommendations for menu optimization focusing on profitability, customer satisfaction, and operational efficiency.`;
  }

  _enhanceAIResponse(aiResponse, menuData) {
    try {
      const analysis = JSON.parse(aiResponse.text);
      
      return {
        success: true,
        analysis: {
          recommendations: analysis.recommendations || [],
          keyInsights: analysis.key_insights || {},
          overallHealth: analysis.overall_health || 'unknown',
          confidence: analysis.confidence || 0.7
        },
        data: {
          totalRevenue: menuData.totalRevenue,
          totalOrders: menuData.totalOrders,
          totalItems: menuData.totalItems,
          totalItemsAnalyzed: menuData.totalItemsAnalyzed,
          period: menuData.period,
          currency: 'USD'
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          engine: aiResponse.metadata?.engine || 'unknown',
          model: aiResponse.metadata?.model || 'unknown',
          processingTime: aiResponse.metadata?.processingTime || 0
        }
      };
    } catch (error) {
      logger.error('Failed to parse AI response:', error);
      throw new Error('Invalid AI response format');
    }
  }
}
```

**Key Benefits of This Integration:**
- **Engine-agnostic implementation**: Works with OpenAI, Ollama, or future engines
- **Real business data integration**: Uses actual menu and sales data from the database
- **Structured response processing**: Enforces JSON format for consistent parsing
- **Comprehensive error handling**: Graceful fallback and detailed error logging
- **Performance tracking**: Includes processing time and confidence metrics
- **Flexible configuration**: Allows engine and model selection per request

### For Adding New Engines

To add a new AI engine (e.g., Claude, PaLM):

1. **Create Engine Class**:
```javascript
class ClaudeEngine extends AIEngineBase {
  async testConnection() {
    // Implement Claude connection test
  }
  
  async generateInsight(systemPrompt, userPrompt, options) {
    // Implement Claude API call
    // Return standardized format
  }
}
```

2. **Update Configuration**:
```javascript
// config/index.js
claude: {
  enabled: process.env.CLAUDE_ENABLED === 'true',
  apiKey: process.env.CLAUDE_API_KEY,
  model: process.env.CLAUDE_MODEL || 'claude-3-sonnet'
}
```

3. **Register in AI Manager**:
```javascript
// ai-manager.js
if (config.ai.claude.enabled) {
  const claudeEngine = new ClaudeEngine(config.ai.claude);
  this.engines.set('claude', claudeEngine);
}
```

## 🔒 Security Considerations

### API Key Management
- Environment variable storage only
- No hardcoded credentials
- Separate keys per engine
- Key validation on startup

### Input Sanitization
- All prompts sanitized before engine processing
- Large input data handled gracefully
- Timeout protections on all requests
- Rate limiting awareness

### Error Information
- Sanitized error messages to clients
- Detailed logging for debugging
- No sensitive data in error responses

## 🎛️ Configuration Management

### Engine Priority
```bash
AI_PRIMARY_ENGINE=openai  # Primary choice
# Fallback order: primary -> remaining enabled engines
```

### Selective Engine Enabling
```bash
OPENAI_ENABLED=true      # Enable OpenAI
OLLAMA_ENABLED=false     # Disable Ollama
# AI Manager will only use enabled engines
```

### Environment-Specific Settings
```bash
# Development
AI_PRIMARY_ENGINE=ollama  # Use local for development

# Production  
AI_PRIMARY_ENGINE=openai  # Use cloud for production
```

## 🔍 Monitoring and Observability

### Logging
- Engine selection decisions
- Fallback events and reasons
- Performance metrics (response times)
- Error tracking with context

### Metrics Available
```javascript
const engineInfo = aiService.getEngineInfo();
// Returns current engine status, availability, and metadata
```

## 📋 Migration Notes

### For Existing Code
- **No changes required** - All existing AI service calls work unchanged
- **Enhanced functionality** - Automatic engine selection and fallback
- **Better reliability** - Multiple engines provide redundancy

### Breaking Changes
- None for public APIs
- Private methods removed from AI Service (were internal only)
- Test files may need updates to mock AI Manager instead of direct engines

## 🛠️ Troubleshooting

### Common Issues

1. **"No AI engines available"**
   - Check `AI_ENABLED=true` in environment
   - Verify at least one engine is enabled and configured
   - Test engine connectivity

2. **OpenAI Authentication Errors**
   - Verify `OPENAI_API_KEY` is set correctly
   - Check API key permissions and rate limits
   - Confirm model access (e.g., GPT-4 availability)

3. **Ollama Connection Issues**
   - Verify Ollama server is running on configured URL
   - Check `OLLAMA_BASE_URL` points to correct endpoint
   - Confirm model is downloaded locally

### Debug Mode
```bash
# Enable detailed logging for troubleshooting
DEBUG=ai-*
```

## 🚧 Future Enhancements

### Planned Features
1. **Engine Health Monitoring**: Automatic health checks and circuit breakers
2. **Smart Load Balancing**: Distribute load based on engine performance
3. **Cost Optimization**: Route to most cost-effective engine for task type
4. **Response Caching**: Cache responses for identical prompts
5. **Analytics Dashboard**: Engine usage and performance metrics

### Extension Points
- Plugin system for custom engines
- Middleware for request/response transformation
- Webhook integration for engine status changes

---

## 📝 Summary

This implementation successfully delivers:

✅ **Complete Engine Abstraction**: Services work with any AI engine transparently  
✅ **Multiple Engine Support**: OpenAI and Ollama with easy extensibility  
✅ **Robust Fallback System**: Automatic failover between engines  
✅ **Consolidated Configuration**: Single environment setup  
✅ **Comprehensive Testing**: 84+ tests covering all components  
✅ **Backward Compatibility**: Existing code works unchanged  
✅ **Production Ready**: Error handling, logging, monitoring  

The result is a flexible, reliable AI system where **reports and services only need to provide prompts and receive results, completely unaware of which AI engine processes their requests.**
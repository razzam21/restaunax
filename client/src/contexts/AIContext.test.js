import { renderHook, act } from '@testing-library/react';
import { AIProvider, useAI } from './AIContext';
import { AuthContext } from './AuthContext';
import api from '../services/api';
import webSocketService from '../services/websocket';

// Mock dependencies
jest.mock('../services/api');
jest.mock('../services/websocket');

const mockApi = api;
const mockWebSocketService = webSocketService;

describe('AIContext', () => {
  // Mock auth context values
  const mockAuthContextValue = {
    accessToken: 'test-token',
    isAuthenticated: true,
    user: {
      id: 'user-1',
      role: 'manager',
      restaurantId: 'restaurant-1'
    }
  };

  const MockWrapper = ({ children, authValue = mockAuthContextValue }) => (
    <AuthContext.Provider value={authValue}>
      <AIProvider>
        {children}
      </AIProvider>
    </AuthContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API mocks
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        features: {
          aiEnabled: true,
          hasPermission: true,
          availableFeatures: ['demand_forecast'],
          upgradeRequired: false,
          permissionRequired: false
        }
      }
    });

    mockWebSocketService.subscribe.mockReturnValue(() => {});
  });

  describe('Feature Status', () => {
    it('should initialize with disabled state for unauthenticated users', () => {
      const { result } = renderHook(() => useAI(), {
        wrapper: ({ children }) => (
          <MockWrapper authValue={{ ...mockAuthContextValue, isAuthenticated: false }}>
            {children}
          </MockWrapper>
        )
      });

      expect(result.current.featureStatus.aiEnabled).toBe(false);
      expect(result.current.hasAccess).toBe(false);
    });

    it('should initialize with disabled state for wait staff', () => {
      const { result } = renderHook(() => useAI(), {
        wrapper: ({ children }) => (
          <MockWrapper authValue={{ 
            ...mockAuthContextValue, 
            user: { ...mockAuthContextValue.user, role: 'wait_staff' }
          }}>
            {children}
          </MockWrapper>
        )
      });

      expect(result.current.featureStatus.aiEnabled).toBe(false);
      expect(result.current.hasAccess).toBe(false);
    });

    it('should check feature status for authorized users', async () => {
      const { result } = renderHook(() => useAI(), {
        wrapper: MockWrapper
      });

      // Wait for the effect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockApi.get).toHaveBeenCalledWith('/ai-status', {
        headers: { Authorization: 'Bearer test-token' }
      });
      expect(result.current.featureStatus.aiEnabled).toBe(true);
    });

    it('should handle API errors when checking feature status', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useAI(), {
        wrapper: MockWrapper
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Failed to check AI feature availability');
    });
  });

  describe('Demand Forecast Creation', () => {
    beforeEach(() => {
      mockApi.post.mockResolvedValue({
        data: {
          success: true,
          forecast: {
            data: {
              predictions: [
                { date: '2024-02-01', orders: 25, revenue: 450, confidence: 0.85 }
              ],
              confidence: 0.85
            },
            metadata: {
              generation_duration: 1500
            }
          },
          requestInfo: {
            startDate: '2024-02-01T00:00:00.000Z',
            endDate: '2024-02-07T00:00:00.000Z',
            lookbackDays: 30,
            requestedBy: 'test-user',
            requestedAt: '2024-01-25T10:00:00.000Z'
          },
          performance: {
            generation_duration: 1500,
            total_request_duration: 2000
          }
        }
      });
    });

    it('should create demand forecast successfully', async () => {
      const { result } = renderHook(() => useAI(), {
        wrapper: MockWrapper
      });

      // Set feature status to enabled
      await act(async () => {
        result.current.featureStatus.aiEnabled = true;
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const forecastParams = {
        startDate: '2024-02-01T00:00:00.000Z',
        endDate: '2024-02-07T00:00:00.000Z',
        lookbackDays: 30
      };

      let forecastResult;
      await act(async () => {
        forecastResult = await result.current.createDemandForecast(forecastParams);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/insights/demand-forecast', forecastParams, {
        headers: { Authorization: 'Bearer test-token' }
      });

      expect(forecastResult).toMatchObject({
        type: 'demand_forecast',
        status: 'completed',
        progress: 100,
        result: expect.objectContaining({
          data: expect.objectContaining({
            predictions: expect.any(Array)
          })
        })
      });

      // Should add to insights history
      expect(result.current.insights).toHaveLength(1);
      expect(result.current.insights[0]).toMatchObject({
        type: 'demand_forecast',
        status: 'completed'
      });
    });

    it('should handle forecast creation errors', async () => {
      mockApi.post.mockRejectedValue({
        response: {
          data: {
            error: 'Insufficient historical data'
          }
        }
      });

      const { result } = renderHook(() => useAI(), {
        wrapper: MockWrapper
      });

      await act(async () => {
        result.current.featureStatus.aiEnabled = true;
      });

      const forecastParams = {
        startDate: '2024-02-01T00:00:00.000Z',
        endDate: '2024-02-07T00:00:00.000Z',
        lookbackDays: 30
      };

      await act(async () => {
        try {
          await result.current.createDemandForecast(forecastParams);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Insufficient historical data');
    });

    it('should prevent forecast creation when AI is disabled', async () => {
      const { result } = renderHook(() => useAI(), {
        wrapper: MockWrapper
      });

      // Keep AI disabled
      await act(async () => {
        result.current.featureStatus.aiEnabled = false;
      });

      const forecastParams = {
        startDate: '2024-02-01T00:00:00.000Z',
        endDate: '2024-02-07T00:00:00.000Z',
        lookbackDays: 30
      };

      await act(async () => {
        try {
          await result.current.createDemandForecast(forecastParams);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).toBe('AI features are not available');
        }
      });

      expect(mockApi.post).not.toHaveBeenCalled();
    });
  });

  describe('Insight Results Retrieval', () => {
    it('should retrieve demand forecast results', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          forecast: {
            data: {
              predictions: [
                { date: '2024-02-01', orders: 25, revenue: 450, confidence: 0.85 }
              ]
            }
          }
        }
      });

      const { result } = renderHook(() => useAI(), {
        wrapper: MockWrapper
      });

      await act(async () => {
        result.current.featureStatus.aiEnabled = true;
      });

      let forecastResults;
      await act(async () => {
        forecastResults = await result.current.getInsightResults('forecast-123', 'demand_forecast');
      });

      expect(mockApi.get).toHaveBeenCalledWith('/insights/demand-forecast/forecast-123', {
        headers: { Authorization: 'Bearer test-token' }
      });

      expect(forecastResults).toMatchObject({
        data: {
          predictions: expect.any(Array)
        }
      });
    });

    it('should handle alternative response format', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            predictions: [
              { date: '2024-02-01', orders: 25, revenue: 450, confidence: 0.85 }
            ]
          }
        }
      });

      const { result } = renderHook(() => useAI(), {
        wrapper: MockWrapper
      });

      await act(async () => {
        result.current.featureStatus.aiEnabled = true;
      });

      let forecastResults;
      await act(async () => {
        forecastResults = await result.current.getInsightResults('forecast-123', 'demand_forecast');
      });

      expect(forecastResults).toMatchObject({
        predictions: expect.any(Array)
      });
    });

    it('should return null for failed requests', async () => {
      mockApi.get.mockRejectedValue(new Error('Not found'));

      const { result } = renderHook(() => useAI(), {
        wrapper: MockWrapper
      });

      await act(async () => {
        result.current.featureStatus.aiEnabled = true;
      });

      let forecastResults;
      await act(async () => {
        forecastResults = await result.current.getInsightResults('forecast-123', 'demand_forecast');
      });

      expect(forecastResults).toBeNull();
    });
  });

  describe('Job History Loading', () => {
    it('should load job history successfully', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          insights: [
            {
              id: 'insight-1',
              type: 'demand_forecast',
              status: 'completed',
              createdAt: '2024-01-25T10:00:00.000Z'
            }
          ]
        }
      });

      const { result } = renderHook(() => useAI(), {
        wrapper: MockWrapper
      });

      await act(async () => {
        result.current.featureStatus.aiEnabled = true;
        await result.current.loadJobHistory();
      });

      expect(mockApi.get).toHaveBeenCalledWith('/insights/history?page=1&limit=20', {
        headers: { Authorization: 'Bearer test-token' }
      });

      expect(result.current.insights).toHaveLength(1);
      expect(result.current.jobHistory).toHaveLength(1);
    });

    it('should load job history with filters', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          insights: []
        }
      });

      const { result } = renderHook(() => useAI(), {
        wrapper: MockWrapper
      });

      await act(async () => {
        result.current.featureStatus.aiEnabled = true;
        await result.current.loadJobHistory(2, 'demand_forecast');
      });

      expect(mockApi.get).toHaveBeenCalledWith('/insights/history?page=2&limit=20&type=demand_forecast', {
        headers: { Authorization: 'Bearer test-token' }
      });
    });
  });

  describe('Error Handling', () => {
    it('should clear errors automatically after timeout', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useAI(), {
        wrapper: MockWrapper
      });

      await act(async () => {
        result.current.error = 'Test error';
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(result.current.error).toBeNull();

      jest.useRealTimers();
    });

    it('should clear errors manually', () => {
      const { result } = renderHook(() => useAI(), {
        wrapper: MockWrapper
      });

      act(() => {
        result.current.error = 'Test error';
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('WebSocket Integration', () => {
    it('should subscribe to WebSocket updates when AI is enabled', async () => {
      const { result } = renderHook(() => useAI(), {
        wrapper: MockWrapper
      });

      await act(async () => {
        result.current.featureStatus.aiEnabled = true;
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockWebSocketService.subscribe).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should handle AI job updates via WebSocket', async () => {
      let messageHandler;
      mockWebSocketService.subscribe.mockImplementation((event, handler) => {
        messageHandler = handler;
        return () => {};
      });

      const { result } = renderHook(() => useAI(), {
        wrapper: MockWrapper
      });

      // Set up initial active job
      await act(async () => {
        result.current.activeJobs = [{
          id: 'job-1',
          status: 'processing',
          progress: 50
        }];
        result.current.featureStatus.aiEnabled = true;
      });

      // Simulate WebSocket message
      await act(async () => {
        messageHandler({
          type: 'ai_job_update',
          data: {
            jobId: 'job-1',
            status: 'completed',
            progress: 100
          }
        });
      });

      expect(result.current.activeJobs).toHaveLength(0); // Should be removed when completed
    });
  });
});
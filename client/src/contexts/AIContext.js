import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import webSocketService from '../services/websocket';

// Create context
export const AIContext = createContext();

export const AIProvider = ({ children }) => {
  const { accessToken, isAuthenticated, user } = useAuth();
  
  // AI feature state
  const [featureStatus, setFeatureStatus] = useState({
    aiEnabled: false,
    hasPermission: false,
    availableFeatures: [],
    upgradeRequired: true,
    permissionRequired: false,
  });
  
  // Job management state
  const [activeJobs, setActiveJobs] = useState([]);
  const [jobHistory, setJobHistory] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if user has access to AI features
  const hasAccess = isAuthenticated && ['manager', 'owner'].includes(user?.role);

  // Check AI feature status
  const checkFeatureStatus = useCallback(async () => {
    console.log('🔍 Checking AI feature status...', { hasAccess, isAuthenticated, userRole: user?.role });
    
    if (!hasAccess) {
      console.log('❌ No access - setting disabled state');
      setFeatureStatus({
        aiEnabled: false,
        hasPermission: false,
        availableFeatures: [],
        upgradeRequired: true,
        permissionRequired: !isAuthenticated || !['manager', 'owner'].includes(user?.role),
      });
      return;
    }

    try {
      console.log('📡 Making API call to /ai-status...');
      const response = await api.get('/ai-status', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      console.log('📦 API Response:', response.data);
      
      if (response.data.success) {
        console.log('✅ Setting feature status:', response.data.features);
        setFeatureStatus(response.data.features);
      }
    } catch (err) {
      console.error('❌ Failed to check AI feature status:', err);
      setError('Failed to check AI feature availability');
    }
  }, [hasAccess, accessToken, isAuthenticated, user?.role]);

  // Load job history
  const loadJobHistory = useCallback(async (page = 1, type = null) => {
    if (!hasAccess || !featureStatus.aiEnabled) {
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (type) params.append('type', type);

      const response = await api.get(`/insights/history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.data.success) {
        setJobHistory(response.data.insights);
        setInsights(response.data.insights);
      }
    } catch (err) {
      console.error('Failed to load job history:', err);
      setError('Failed to load insights history');
    } finally {
      setLoading(false);
    }
  }, [hasAccess, featureStatus.aiEnabled, accessToken]);

  // Create demand forecast job
  const createDemandForecast = useCallback(async (params) => {
    if (!hasAccess || !featureStatus.aiEnabled) {
      throw new Error('AI features are not available');
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/insights/demand-forecast', params, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.data.success) {
        // Create a job-like object for consistency with the UI
        const forecastResult = {
          id: `forecast_${Date.now()}`,
          type: 'demand_forecast',
          status: 'completed',
          progress: 100,
          result: response.data.forecast,
          requestInfo: response.data.requestInfo,
          performance: response.data.performance,
          createdAt: new Date().toISOString()
        };
        
        // Add to insights history since it's completed immediately
        setInsights(prev => [forecastResult, ...prev]);
        
        return forecastResult;
      } else {
        throw new Error(response.data.error || 'Failed to create demand forecast');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create demand forecast';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [hasAccess, featureStatus.aiEnabled, accessToken]);

  // Create menu optimization job
  const createMenuOptimization = useCallback(async (params) => {
    if (!hasAccess || !featureStatus.aiEnabled) {
      throw new Error('AI features are not available');
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/insights/menu-optimization', params, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.data.success) {
        const newJob = response.data.job;
        setActiveJobs(prev => [...prev, newJob]);
        return newJob;
      } else {
        throw new Error(response.data.error || 'Failed to create menu optimization');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create menu optimization';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [hasAccess, featureStatus.aiEnabled, accessToken]);

  // Get job status
  const getJobStatus = useCallback(async (jobId) => {
    if (!hasAccess || !featureStatus.aiEnabled) {
      return null;
    }

    try {
      const response = await api.get(`/insights/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.data.success) {
        return response.data.job;
      }
      return null;
    } catch (err) {
      console.error('Failed to get job status:', err);
      return null;
    }
  }, [hasAccess, featureStatus.aiEnabled, accessToken]);

  // Get insight results
  const getInsightResults = useCallback(async (jobId, type) => {
    if (!hasAccess || !featureStatus.aiEnabled) {
      return null;
    }

    try {
      const endpoint = type === 'demand_forecast' 
        ? `/insights/demand-forecast/${jobId}`
        : `/insights/menu-optimization/${jobId}`;
        
      const response = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.data.success) {
        // Handle both our immediate response format and stored forecast format
        if (type === 'demand_forecast') {
          return response.data.forecast || response.data.data;
        } else {
          return response.data.optimization || response.data.data;
        }
      }
      return null;
    } catch (err) {
      console.error('Failed to get insight results:', err);
      return null;
    }
  }, [hasAccess, featureStatus.aiEnabled, accessToken]);

  // Handle WebSocket AI job updates
  const handleAIJobUpdate = useCallback((data) => {
    console.log('AI job update received:', data.type, data);
    
    if (data.type === 'ai_job_update') {
      const jobUpdate = data.data;
      
      // Update active jobs list
      setActiveJobs(prev => 
        prev.map(job => 
          job.id === jobUpdate.jobId 
            ? { ...job, status: jobUpdate.status, progress: jobUpdate.progress }
            : job
        )
      );
      
      // If job is completed, remove from active jobs and refresh history
      if (jobUpdate.status === 'completed') {
        setActiveJobs(prev => prev.filter(job => job.id !== jobUpdate.jobId));
        loadJobHistory(); // Refresh history to show completed job
      }
    }
    
    if (data.type === 'ai_insight_ready') {
      // New insight is ready
      loadJobHistory(); // Refresh to show new insight
    }
  }, [loadJobHistory]);

  // Initialize AI context
  useEffect(() => {
    if (hasAccess) {
      checkFeatureStatus();
    }
  }, [hasAccess, checkFeatureStatus]);

  // Load initial data when AI is enabled
  useEffect(() => {
    if (hasAccess && featureStatus.aiEnabled) {
      loadJobHistory();
    }
  }, [hasAccess, featureStatus.aiEnabled, loadJobHistory]);

  // Subscribe to WebSocket AI updates
  useEffect(() => {
    if (hasAccess && featureStatus.aiEnabled) {
      // Subscribe to WebSocket messages
      const unsubscribe = webSocketService.subscribe('message', handleAIJobUpdate);
      
      return () => {
        unsubscribe();
      };
    }
  }, [hasAccess, featureStatus.aiEnabled, handleAIJobUpdate]);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000); // Clear error after 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  const contextValue = {
    // Feature status
    featureStatus,
    hasAccess,
    
    // Data
    activeJobs,
    jobHistory,
    insights,
    loading,
    error,
    
    // Actions
    checkFeatureStatus,
    loadJobHistory,
    createDemandForecast,
    createMenuOptimization,
    getJobStatus,
    getInsightResults,
    
    // Utilities
    clearError: () => setError(null),
  };

  return (
    <AIContext.Provider value={contextValue}>
      {children}
    </AIContext.Provider>
  );
};

// Custom hook for using the AI context
export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};
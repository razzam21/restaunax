import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Button,
  Chip,
  Alert,
  LinearProgress,
  Fade,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Restaurant as RestaurantIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

import { useAI } from '../contexts/AIContext';
import PremiumFeaturePrompt from '../components/common/PremiumFeaturePrompt';
import DemandForecastForm from '../components/features/ai/DemandForecastForm';
import MenuOptimizationForm from '../components/features/ai/MenuOptimizationForm';
import InsightsHistory from '../components/features/ai/InsightsHistory';
import ActiveJobsList from '../components/features/ai/ActiveJobsList';
import InsightViewer from '../components/features/ai/InsightViewer';
import ForecastViewer from '../components/features/ai/ForecastViewer';
import MenuOptimizationViewer from '../components/features/ai/MenuOptimizationViewer';

const AIInsightsPage = () => {
  const theme = useTheme();
  const {
    featureStatus,
    hasAccess,
    activeJobs,
    jobHistory,
    loading,
    error,
    checkFeatureStatus,
    loadJobHistory,
    clearError,
  } = useAI();

  const [activeTab, setActiveTab] = useState(0);
  const [premiumPromptOpen, setPremiumPromptOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState(null);

  // Check if we should show upgrade prompt
  const shouldShowUpgrade = !featureStatus.aiEnabled || !hasAccess;

  useEffect(() => {
    // Auto-open premium prompt if user doesn't have access
    if (shouldShowUpgrade && !premiumPromptOpen) {
      setPremiumPromptOpen(true);
    }
  }, [shouldShowUpgrade, premiumPromptOpen]);

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
  };

  const handleRefresh = async () => {
    await checkFeatureStatus();
    if (featureStatus.aiEnabled) {
      await loadJobHistory();
    }
  };

  const handleInsightView = (insight) => {
    setSelectedInsight(insight);
  };

  // If user doesn't have permission at all
  if (!hasAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          AI Insights
        </Typography>
        <Alert severity="warning" sx={{ mb: 3 }}>
          AI Insights are available to managers and owners only. Contact your restaurant owner to upgrade your account.
        </Alert>
        <PremiumFeaturePrompt
          open={premiumPromptOpen}
          onClose={() => setPremiumPromptOpen(false)}
          feature="ai_insights"
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <PsychologyIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h4" component="h1">
              AI Insights
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI-powered analytics for smarter business decisions
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          {/* Feature status indicator */}
          <Chip
            icon={featureStatus.aiEnabled ? <PsychologyIcon /> : <InfoIcon />}
            label={featureStatus.aiEnabled ? 'AI Enabled' : 'Premium Required'}
            color={featureStatus.aiEnabled ? 'success' : 'warning'}
            variant={featureStatus.aiEnabled ? 'filled' : 'outlined'}
          />
          
          <Tooltip title="Refresh status">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error display */}
      {error && (
        <Fade in={true}>
          <Alert 
            severity="error" 
            onClose={clearError}
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        </Fade>
      )}

      {/* Loading indicator */}
      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
        </Box>
      )}

      {/* Main content */}
      {featureStatus.aiEnabled ? (
        <>
          {/* Active jobs summary */}
          {activeJobs.length > 0 && (
            <Card sx={{ mb: 3, bgcolor: theme.palette.info.main + '10' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                  <TrendingUpIcon color="info" />
                  Active AI Analysis ({activeJobs.length})
                </Typography>
                <ActiveJobsList jobs={activeJobs} />
              </CardContent>
            </Card>
          )}

          {/* Main tabs */}
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                variant="fullWidth"
                sx={{ px: 2 }}
              >
                <Tab 
                  icon={<TrendingUpIcon />} 
                  label="Demand Forecast" 
                  iconPosition="start"
                />
                <Tab 
                  icon={<RestaurantIcon />} 
                  label="Menu Optimization" 
                  iconPosition="start"
                />
                <Tab 
                  icon={<HistoryIcon />} 
                  label="Insights History" 
                  iconPosition="start"
                />
              </Tabs>
            </Box>

            <CardContent sx={{ p: 3 }}>
              {/* Tab content */}
              {activeTab === 0 && <DemandForecastForm />}
              {activeTab === 1 && <MenuOptimizationForm />}
              {activeTab === 2 && (
                <InsightsHistory 
                  insights={jobHistory}
                  onViewInsight={handleInsightView}
                />
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* Upgrade required view */
        <Grid container spacing={3}>
          {/* Feature preview cards */}
          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                height: '100%',
                opacity: 0.7,
                position: 'relative',
                '&:hover': { opacity: 0.9 }
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <TrendingUpIcon color="primary" />
                  <Typography variant="h6">Demand Forecasting</Typography>
                  <Chip label="Premium" size="small" color="primary" />
                </Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Predict future order volumes and revenue with AI-powered analysis.
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setPremiumPromptOpen(true)}
                >
                  Learn More
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                height: '100%',
                opacity: 0.7,
                position: 'relative',
                '&:hover': { opacity: 0.9 }
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <RestaurantIcon color="primary" />
                  <Typography variant="h6">Menu Optimization</Typography>
                  <Chip label="Premium" size="small" color="primary" />
                </Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Optimize pricing and menu composition for maximum profitability.
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setPremiumPromptOpen(true)}
                >
                  Learn More
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Upgrade to Premium</strong> to unlock AI-powered insights that help restaurants increase revenue by 15% on average. 
                Contact our sales team to learn more about pricing and features.
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      )}

      {/* Premium feature prompt */}
      <PremiumFeaturePrompt
        open={premiumPromptOpen}
        onClose={() => setPremiumPromptOpen(false)}
        feature="ai_insights"
      />

      {/* Insight viewer modals */}
      {selectedInsight && selectedInsight.type === 'demand_forecast' && (
        <ForecastViewer
          forecast={selectedInsight}
          open={!!selectedInsight}
          onClose={() => setSelectedInsight(null)}
        />
      )}
      
      {selectedInsight && selectedInsight.type === 'menu_optimization' && (
        <MenuOptimizationViewer
          optimization={selectedInsight}
          open={!!selectedInsight}
          onClose={() => setSelectedInsight(null)}
        />
      )}
      
      {selectedInsight && !['demand_forecast', 'menu_optimization'].includes(selectedInsight.type) && (
        <InsightViewer
          insight={selectedInsight}
          open={!!selectedInsight}
          onClose={() => setSelectedInsight(null)}
        />
      )}
    </Box>
  );
};

export default AIInsightsPage;
import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  TrendingUp as TrendingUpIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';

import { useAI } from '../../../contexts/AIContext';

const MenuOptimizationForm = () => {
  const { createMenuOptimization, loading, error } = useAI();
  
  const [formData, setFormData] = useState({
    lookbackDays: 30,
    includeInactive: false,
  });
  
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const lookbackOptions = [
    { value: 14, label: '2 Weeks', description: 'Recent performance only' },
    { value: 30, label: '1 Month', description: 'Balanced analysis' },
    { value: 60, label: '2 Months', description: 'Seasonal trends' },
    { value: 90, label: '3 Months', description: 'Long-term patterns' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmissionSuccess(false);
      
      const job = await createMenuOptimization(formData);
      
      setSubmissionSuccess(true);
      console.log('Menu optimization job created:', job);
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmissionSuccess(false);
      }, 5000);
      
    } catch (err) {
      console.error('Failed to create menu optimization:', err);
      // Error is handled by the AI context
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getEstimatedDuration = () => {
    const baseDuration = 3; // 3 minutes base for menu optimization
    const dataFactor = formData.lookbackDays / 30;
    return Math.round(baseDuration * dataFactor);
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <RestaurantIcon color="primary" />
        <Box>
          <Typography variant="h5" component="h2">
            Menu Optimization
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI-powered analysis to optimize menu pricing and composition
          </Typography>
        </Box>
      </Box>

      {submissionSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Menu optimization analysis started! You&apos;ll receive insights on pricing, performance, and recommendations.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Analysis Configuration */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                  <AnalyticsIcon fontSize="small" />
                  Analysis Configuration
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Analysis Period</InputLabel>
                      <Select
                        value={formData.lookbackDays}
                        label="Analysis Period"
                        onChange={(e) => handleFieldChange('lookbackDays', e.target.value)}
                      >
                        {lookbackOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            <Box>
                              <Typography variant="body1">{option.label}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {option.description}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.includeInactive}
                          onChange={(e) => handleFieldChange('includeInactive', e.target.checked)}
                        />
                      }
                      label="Include Inactive Items"
                    />
                    <Typography variant="caption" color="text.secondary" display="block">
                      Analyze items that are currently disabled for potential reactivation
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* What You'll Get */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                  <TrendingUpIcon fontSize="small" />
                  Optimization Insights
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box textAlign="center" p={2}>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Pricing Analysis
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        AI recommendations for optimal pricing based on demand and profit margins
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Box textAlign="center" p={2}>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Performance Metrics
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Identify best and worst performing items with detailed analytics
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Box textAlign="center" p={2}>
                      <Typography variant="h6" color="primary" gutterBottom>
                        Menu Composition
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Suggestions for menu structure and category optimization
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Processing Information */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Analysis Details
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Estimated Duration:</Typography>
                      <Chip 
                        label={`~${getEstimatedDuration()} minutes`} 
                        size="small" 
                        color="info" 
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">Analysis Depth:</Typography>
                      <Chip 
                        label="Advanced AI" 
                        size="small" 
                        color="primary" 
                      />
                    </Box>
                  </Grid>
                </Grid>
                
                <Typography variant="body2" color="text.secondary" mt={2}>
                  The analysis will examine item performance, pricing elasticity, profit margins, and customer preferences to provide actionable recommendations.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={<RestaurantIcon />}
                sx={{ minWidth: 200 }}
              >
                {loading ? 'Starting Analysis...' : 'Optimize Menu'}
              </Button>
            </Box>
            
            {loading && (
              <Box mt={2}>
                <LinearProgress />
                <Typography variant="caption" color="text.secondary" align="center" display="block" mt={1}>
                  Initializing menu optimization analysis...
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default MenuOptimizationForm;
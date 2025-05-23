import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { useAI } from '../../../contexts/AIContext';

const DemandForecastForm = () => {
  const { createDemandForecast, loading, error } = useAI();
  
  const [formData, setFormData] = useState({
    startDate: null,
    endDate: null,
    lookbackDays: 30,
  });
  
  const [validationErrors, setValidationErrors] = useState({});
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const lookbackOptions = [
    { value: 7, label: '1 Week', description: 'Recent patterns only' },
    { value: 14, label: '2 Weeks', description: 'Short-term trends' },
    { value: 30, label: '1 Month', description: 'Balanced analysis' },
    { value: 60, label: '2 Months', description: 'Seasonal patterns' },
    { value: 90, label: '3 Months', description: 'Long-term trends' },
  ];

  const validateForm = () => {
    const errors = {};
    
    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }
    
    if (!formData.endDate) {
      errors.endDate = 'End date is required';
    }
    
    if (formData.startDate && formData.endDate) {
      if (formData.startDate >= formData.endDate) {
        errors.endDate = 'End date must be after start date';
      }
      
      // Check if forecast is for future dates
      const now = new Date();
      if (formData.startDate <= now) {
        errors.startDate = 'Forecast start date must be in the future';
      }
      
      // Check if forecast period is reasonable (not too far in future or too long)
      const daysDiff = Math.ceil((formData.endDate - formData.startDate) / (1000 * 60 * 60 * 24));
      if (daysDiff > 90) {
        errors.endDate = 'Forecast period cannot exceed 90 days';
      }
      if (daysDiff < 1) {
        errors.endDate = 'Forecast period must be at least 1 day';
      }
    }
    
    if (!formData.lookbackDays || formData.lookbackDays < 7) {
      errors.lookbackDays = 'Minimum 7 days of historical data required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmissionSuccess(false);
      
      const job = await createDemandForecast({
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        lookbackDays: formData.lookbackDays,
      });
      
      setSubmissionSuccess(true);
      console.log('Demand forecast job created:', job);
      
      // Reset form after successful submission
      setTimeout(() => {
        setSubmissionSuccess(false);
      }, 5000);
      
    } catch (err) {
      console.error('Failed to create demand forecast:', err);
      // Error is handled by the AI context
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Calculate estimated completion time
  const getEstimatedDuration = () => {
    const baseDuration = 2; // 2 minutes base
    const dataFactor = formData.lookbackDays / 30; // More data = longer processing
    return Math.round(baseDuration * dataFactor);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <TrendingUpIcon color="primary" />
          <Box>
            <Typography variant="h5" component="h2">
              Demand Forecasting
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Predict future order patterns using AI analysis of historical data
            </Typography>
          </Box>
        </Box>

        {submissionSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Demand forecast analysis started! You&apos;ll receive real-time updates as the analysis progresses.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Forecast Period */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                    <ScheduleIcon fontSize="small" />
                    Forecast Period
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="Start Date"
                        value={formData.startDate}
                        onChange={(date) => handleFieldChange('startDate', date)}
                        minDate={new Date()}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            error={!!validationErrors.startDate}
                            helperText={validationErrors.startDate}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="End Date"
                        value={formData.endDate}
                        onChange={(date) => handleFieldChange('endDate', date)}
                        minDate={formData.startDate || new Date()}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            error={!!validationErrors.endDate}
                            helperText={validationErrors.endDate}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Historical Data Configuration */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                    <AnalyticsIcon fontSize="small" />
                    Historical Data Analysis
                  </Typography>
                  
                  <FormControl fullWidth error={!!validationErrors.lookbackDays}>
                    <InputLabel>Historical Data Period</InputLabel>
                    <Select
                      value={formData.lookbackDays}
                      label="Historical Data Period"
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
                    {validationErrors.lookbackDays && (
                      <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                        {validationErrors.lookbackDays}
                      </Typography>
                    )}
                  </FormControl>
                  
                  <Box mt={2}>
                    <Typography variant="body2" color="text.secondary">
                      The AI will analyze {formData.lookbackDays} days of historical order data to identify patterns and generate accurate forecasts.
                    </Typography>
                  </Box>
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
                        <Typography variant="body2">Analysis Type:</Typography>
                        <Chip 
                          label="Machine Learning" 
                          size="small" 
                          color="primary" 
                        />
                      </Box>
                    </Grid>
                  </Grid>
                  
                  <Typography variant="body2" color="text.secondary" mt={2}>
                    You&apos;ll receive real-time notifications as the analysis progresses. The forecast will include hourly predictions, confidence intervals, and actionable insights.
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
                  startIcon={<TrendingUpIcon />}
                  sx={{ minWidth: 200 }}
                >
                  {loading ? 'Starting Analysis...' : 'Generate Forecast'}
                </Button>
              </Box>
              
              {loading && (
                <Box mt={2}>
                  <LinearProgress />
                  <Typography variant="caption" color="text.secondary" align="center" display="block" mt={1}>
                    Initializing AI analysis...
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </form>
      </Box>
    </LocalizationProvider>
  );
};

export default DemandForecastForm;
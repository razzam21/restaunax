import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useAI } from '../../../contexts/AIContext';

const ForecastViewer = ({ forecast, open, onClose }) => {
  const { deleteInsight, lockInsight, unlockInsight, loading } = useAI();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  if (!forecast || !open) return null;

  // Helper function to check if insight is locked
  const isLocked = (insight) => {
    return insight?.data?.locked === true;
  };

  // Handle lock/unlock toggle
  const handleLockToggle = async () => {
    try {
      if (isLocked(forecast)) {
        await unlockInsight(forecast.id);
      } else {
        await lockInsight(forecast.id);
      }
    } catch (error) {
      console.error('Error toggling lock:', error);
    }
  };

  // Handle delete with confirmation
  const handleDelete = async () => {
    try {
      await deleteInsight(forecast.id);
      setDeleteConfirmOpen(false);
      onClose(); // Close the dialog after deletion
    } catch (error) {
      console.error('Error deleting insight:', error);
      setDeleteConfirmOpen(false);
    }
  };

  const { result, requestInfo, performance, createdAt } = forecast || {};
  const { data } = result || {};
  const { forecast: predictions = [], summary = {}, insights = [], recommendations = [], trends = {} } = data || {};
  
  // Safely get confidence from multiple possible locations
  const confidence = data?.confidence || summary?.confidence || summary?.average_confidence || 0;

  // Format currency values
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date values
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Format confidence as percentage
  const formatConfidence = (confidence) => {
    if (typeof confidence !== 'number') return 'N/A';
    return `${Math.round(confidence * 100)}%`;
  };

  // Get confidence color based on value
  const getConfidenceColor = (confidence) => {
    if (typeof confidence !== 'number') return 'default';
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  // Format generation time
  const formatDuration = (ms) => {
    if (typeof ms !== 'number') return 'N/A';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Format trend factors
  const formatTrendFactor = (factor) => {
    return factor
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Check if data quality is low  
  const dataQuality = result?.historicalContext?.dataQuality || 'medium';
  const hasLowDataQuality = dataQuality === 'low';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <TrendingUpIcon color="primary" />
          <Box flex={1}>
            <Typography variant="h6">
              Demand Forecast Results
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={1}>
              <Chip 
                label="Demand Forecast" 
                size="small" 
                color="primary"
                variant="outlined"
              />
              {confidence > 0 && (
                <Chip 
                  label={`${formatConfidence(confidence)} confidence`}
                  size="small" 
                  color={getConfidenceColor(confidence)}
                />
              )}
              {isLocked(forecast) && (
                <Chip 
                  label="Locked" 
                  size="small" 
                  color="warning"
                  icon={<LockIcon />}
                />
              )}
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            {/* Lock/Unlock Button */}
            <Tooltip title={isLocked(forecast) ? "Unlock Insight" : "Lock Insight"}>
              <IconButton
                onClick={handleLockToggle}
                disabled={loading}
                color={isLocked(forecast) ? "warning" : "default"}
              >
                {isLocked(forecast) ? <LockIcon /> : <LockOpenIcon />}
              </IconButton>
            </Tooltip>

            {/* Delete Button - hidden when locked */}
            {!isLocked(forecast) && (
              <Tooltip title="Delete Insight">
                <IconButton
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={loading}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}

            {/* Close Button */}
            <Tooltip title="Close">
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Data Quality Warning */}
        {hasLowDataQuality && (
          <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
            This forecast is based on low data quality. 
            Results may be less reliable. Consider collecting more historical data.
          </Alert>
        )}

        {/* Summary Metrics */}
        {summary && Object.keys(summary).length > 0 && (
          <Box mb={4}>
            <Typography variant="h6" gutterBottom>
              <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Forecast Summary
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {summary.total_predicted_orders || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Orders
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {formatCurrency(summary.total_predicted_revenue)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Revenue
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {formatConfidence(confidence)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Confidence
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {summary.peak_day || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Peak Day
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Trends and Growth */}
        {trends && Object.keys(trends).length > 0 && (
          <Box mb={4}>
            <Typography variant="h6" gutterBottom>Trends & Insights</Typography>
            <Grid container spacing={2}>
              {trends.expectedGrowth && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Expected Growth: <strong>{trends.expectedGrowth}% growth expected</strong>
                  </Typography>
                </Grid>
              )}
              {trends.seasonalFactors && trends.seasonalFactors.length > 0 && (
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Seasonal Factors:
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {trends.seasonalFactors.map((factor, index) => (
                        <Chip
                          key={index}
                          label={formatTrendFactor(factor)}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>
              )}
              {trends.riskFactors && trends.riskFactors.length > 0 && (
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Risk Factors:
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {trends.riskFactors.map((factor, index) => (
                        <Chip
                          key={index}
                          label={formatTrendFactor(factor)}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* Predictions Table */}
        <Box mb={4}>
          <Typography variant="h6" gutterBottom>
            <CalendarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Daily Predictions
          </Typography>
          {predictions.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Day</strong></TableCell>
                    <TableCell align="right"><strong>Orders</strong></TableCell>
                    <TableCell align="right"><strong>Revenue</strong></TableCell>
                    <TableCell align="center"><strong>Confidence</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {predictions.map((prediction, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{formatDate(prediction.date)}</TableCell>
                      <TableCell>{prediction.day_of_week || 'N/A'}</TableCell>
                      <TableCell align="right">{prediction.orders || 0}</TableCell>
                      <TableCell align="right">{formatCurrency(prediction.revenue)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={formatConfidence(prediction.confidence || 0)}
                          size="small"
                          color={getConfidenceColor(prediction.confidence || 0)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No forecast data available
            </Typography>
          )}
        </Box>

        {/* Insights */}
        {insights.length > 0 && (
          <Box mb={4}>
            <Typography variant="h6" gutterBottom>Key Insights</Typography>
            <Box>
              {insights.map((insight, index) => (
                <Typography key={index} variant="body2" paragraph sx={{ pl: 2 }}>
                  • {insight}
                </Typography>
              ))}
            </Box>
          </Box>
        )}

        {/* Recommendations */}
        <Box mb={4}>
          <Typography variant="h6" gutterBottom>Recommendations</Typography>
          {recommendations.length > 0 ? (
            <Box>
              {recommendations.map((recommendation, index) => (
                <Typography key={index} variant="body2" paragraph sx={{ pl: 2 }}>
                  • {recommendation}
                </Typography>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No specific recommendations available
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Request Information */}
        <Box>
          <Typography variant="h6" gutterBottom>Request Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Forecast Period:</strong> {formatDate(requestInfo?.startDate)} - {formatDate(requestInfo?.endDate)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Lookback Period:</strong> {requestInfo?.lookbackDays || 'N/A'} days
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Generated on:</strong> {formatDate(createdAt)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Generation Time:</strong> {formatDuration(performance?.generation_duration)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Data Quality:</strong> {dataQuality || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Requested by:</strong> {requestInfo?.requestedBy || 'N/A'}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          Close
        </Button>
      </DialogActions>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <DeleteIcon color="error" />
            <Typography variant="h6">Delete Forecast</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this demand forecast? This action cannot be undone.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Generated on: {formatDate(createdAt)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete}
            color="error" 
            variant="contained"
            disabled={loading}
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default ForecastViewer;
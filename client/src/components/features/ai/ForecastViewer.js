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
} from '@mui/material';
import {
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const ForecastViewer = ({ forecast, open, onClose }) => {
  if (!forecast || !open) return null;

  const { result, requestInfo, performance, createdAt } = forecast;
  const { data } = result || {};
  const { predictions = [], summary = {}, trends = {}, recommendations = [] } = data || {};

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
  const hasLowDataQuality = result?.metadata?.data_quality_score < 0.5;

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
              {summary.averageConfidence && (
                <Chip 
                  label={`${formatConfidence(summary.averageConfidence)} confidence`}
                  size="small" 
                  color={getConfidenceColor(summary.averageConfidence)}
                />
              )}
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Data Quality Warning */}
        {hasLowDataQuality && (
          <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
            This forecast is based on low data quality (
            {Math.round((result?.metadata?.data_quality_score || 0) * 100)}%). 
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
                      {summary.totalPredictedOrders || 0}
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
                      {formatCurrency(summary.totalPredictedRevenue)}
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
                      {formatConfidence(summary.averageConfidence)}
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
                      {summary.peakDay || 'N/A'}
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
                          label={formatConfidence(prediction.confidence)}
                          size="small"
                          color={getConfidenceColor(prediction.confidence)}
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
                <strong>Data Quality:</strong> {Math.round((result?.metadata?.data_quality_score || 0) * 100)}%
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
    </Dialog>
  );
};

export default ForecastViewer;
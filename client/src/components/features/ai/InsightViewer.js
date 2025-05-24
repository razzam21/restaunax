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
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  Restaurant as RestaurantIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';

const InsightViewer = ({ insight, open, onClose }) => {
  if (!insight) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'demand_forecast':
        return <TrendingUpIcon color="primary" />;
      case 'menu_optimization':
        return <RestaurantIcon color="primary" />;
      default:
        return <AnalyticsIcon color="primary" />;
    }
  };

  const formatConfidence = (confidence) => {
    return `${Math.round(confidence * 100)}%`;
  };

  const renderData = (data) => {
    if (!data) return <Typography>No data available</Typography>;

    // Handle different insight types
    if (insight.type === 'demand_forecast') {
      return (
        <Box>
          {data.insights && (
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>Insights</Typography>
              {data.insights.map((item, index) => (
                <Typography key={index} variant="body2" paragraph>
                  • {item}
                </Typography>
              ))}
            </Box>
          )}
          
          {data.recommendations && (
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>Recommendations</Typography>
              {data.recommendations.map((item, index) => (
                <Typography key={index} variant="body2" paragraph color="primary">
                  • {item}
                </Typography>
              ))}
            </Box>
          )}
          
          {data.periods && data.periods.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>Forecast Preview</Typography>
              <Typography variant="body2" color="text.secondary">
                {data.periods.length} forecast periods generated
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    if (insight.type === 'menu_optimization') {
      return (
        <Box>
          {data.insights && (
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>Key Insights</Typography>
              {data.insights.map((item, index) => (
                <Typography key={index} variant="body2" paragraph>
                  • {item}
                </Typography>
              ))}
            </Box>
          )}
          
          {data.recommendations && (
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>Optimization Recommendations</Typography>
              {data.recommendations.slice(0, 5).map((rec, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="subtitle2" color="primary">
                      {rec.type?.toUpperCase()}: {rec.item_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {rec.reason}
                    </Typography>
                    {rec.expected_impact && (
                      <Chip label={rec.expected_impact} size="small" color="success" sx={{ mt: 1 }} />
                    )}
                  </CardContent>
                </Card>
              ))}
              {data.recommendations.length > 5 && (
                <Typography variant="caption" color="text.secondary">
                  +{data.recommendations.length - 5} more recommendations available
                </Typography>
              )}
            </Box>
          )}
          
          {data.performance_metrics && (
            <Box>
              <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Best Performers</Typography>
                  <Typography variant="h6" color="success.main">
                    {data.performance_metrics.best_performers?.length || 0}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Underperformers</Typography>
                  <Typography variant="h6" color="warning.main">
                    {data.performance_metrics.underperformers?.length || 0}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">Profit Leaders</Typography>
                  <Typography variant="h6" color="primary.main">
                    {data.performance_metrics.profit_leaders?.length || 0}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      );
    }

    // Default data rendering
    return (
      <Box>
        <Typography variant="body2" color="text.secondary">
          Raw insight data available. Contact support for detailed analysis.
        </Typography>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          {getIcon(insight.type)}
          <Box flex={1}>
            <Typography variant="h6">
              {insight.title}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={1}>
              <Chip 
                label={insight.type?.replace('_', ' ')} 
                size="small" 
                color="primary"
                variant="outlined"
              />
              <Chip 
                label={`${formatConfidence(insight.confidence)} confidence`}
                size="small" 
                color="success"
              />
            </Box>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {insight.summary && (
          <Box mb={3}>
            <Typography variant="body1" color="text.secondary">
              {insight.summary}
            </Typography>
          </Box>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        {renderData(insight.data)}
        
        <Box mt={3} pt={2} borderTop={1} borderColor="divider">
          <Typography variant="caption" color="text.secondary">
            Generated on {new Date(insight.createdAt).toLocaleString()}
            {insight.validUntil && (
              <> • Valid until {new Date(insight.validUntil).toLocaleDateString()}</>
            )}
          </Typography>
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

export default InsightViewer;
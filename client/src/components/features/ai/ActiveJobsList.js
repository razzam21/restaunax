import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Restaurant as RestaurantIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

const ActiveJobsList = ({ jobs = [] }) => {
  const getJobIcon = (type) => {
    switch (type) {
      case 'demand_forecast':
        return <TrendingUpIcon fontSize="small" />;
      case 'menu_optimization':
        return <RestaurantIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  const getJobTitle = (type) => {
    switch (type) {
      case 'demand_forecast':
        return 'Demand Forecast';
      case 'menu_optimization':
        return 'Menu Optimization';
      default:
        return 'AI Analysis';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'running':
        return 'info';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatEstimatedCompletion = (estimatedCompletion) => {
    if (!estimatedCompletion) return 'Calculating...';
    
    const completion = new Date(estimatedCompletion);
    const now = new Date();
    const diffMs = completion - now;
    
    if (diffMs <= 0) return 'Completing soon...';
    
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
    return `~${diffMinutes} min remaining`;
  };

  if (jobs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No active AI analysis jobs
      </Typography>
    );
  }

  return (
    <Grid container spacing={2}>
      {jobs.map((job) => (
        <Grid item xs={12} sm={6} key={job.id}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  {getJobIcon(job.type)}
                  <Typography variant="subtitle2">
                    {getJobTitle(job.type)}
                  </Typography>
                </Box>
                <Chip
                  label={job.status}
                  size="small"
                  color={getStatusColor(job.status)}
                  variant="outlined"
                />
              </Box>
              
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Progress
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {job.progress || 0}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={job.progress || 0}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
              
              {job.estimatedCompletion && (
                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                  <ScheduleIcon fontSize="inherit" />
                  {formatEstimatedCompletion(job.estimatedCompletion)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default ActiveJobsList;
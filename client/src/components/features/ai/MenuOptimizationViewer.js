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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  Restaurant as RestaurantIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Lightbulb as LightbulbIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useAI } from '../../../contexts/AIContext';

const MenuOptimizationViewer = ({ optimization, open, onClose }) => {
  const { deleteInsight, lockInsight, unlockInsight, loading } = useAI();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  if (!optimization || !open) return null;

  const data = optimization.result?.data || {};
  const metadata = optimization.result?.metadata || {};
  const performance = optimization.performance || {};
  const summary = data.summary || {};
  const itemPerformance = data.item_performance || [];
  const categoryPerformance = data.category_performance || [];
  const insights = data.insights || [];
  const recommendations = data.recommendations || [];

  // Helper function to check if insight is locked
  const isLocked = () => {
    return data.locked === true;
  };

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Helper function to format duration
  const formatDuration = (ms) => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Helper function to get trend chip color
  const getTrendChipColor = (trend) => {
    switch (trend) {
      case 'increasing':
        return 'success';
      case 'decreasing':
        return 'error';
      case 'stable':
        return 'default';
      default:
        return 'default';
    }
  };

  // Helper function to get recommendation chip color
  const getRecommendationChipColor = (recommendation) => {
    switch (recommendation) {
      case 'promote':
        return 'success';
      case 'remove':
        return 'error';
      case 'optimize':
        return 'warning';
      case 'maintain':
        return 'info';
      default:
        return 'default';
    }
  };

  // Handle lock/unlock toggle
  const handleLockToggle = async () => {
    try {
      if (isLocked()) {
        await unlockInsight(optimization.id);
      } else {
        await lockInsight(optimization.id);
      }
    } catch (error) {
      console.error('Failed to toggle lock:', error);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    try {
      await deleteInsight(optimization.id);
      setDeleteConfirmOpen(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete optimization:', error);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        aria-labelledby="menu-optimization-dialog-title"
        aria-label="Menu Optimization Analysis"
      >
        <DialogTitle 
          id="menu-optimization-dialog-title"
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            pb: 1 
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <RestaurantIcon color="primary" />
            <Typography variant="h6">Menu Optimization Analysis</Typography>
            {isLocked() && (
              <Chip 
                icon={<LockIcon />} 
                label="Locked" 
                color="warning" 
                size="small" 
              />
            )}
          </Box>
          <Box>
            <Tooltip title={isLocked() ? "Unlock Analysis" : "Lock Analysis"}>
              <IconButton
                onClick={handleLockToggle}
                disabled={loading}
                aria-label={isLocked() ? "unlock" : "lock"}
              >
                {isLocked() ? <LockOpenIcon /> : <LockIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Analysis">
              <IconButton
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={loading}
                aria-label="delete"
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {/* Analysis Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <AssessmentIcon fontSize="small" />
                Analysis Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary" gutterBottom>
                      {summary.total_items_analyzed || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Items
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main" gutterBottom>
                      {summary.active_items || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Items
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main" gutterBottom>
                      {formatCurrency(summary.total_revenue_analyzed || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Revenue
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main" gutterBottom>
                      {summary.top_category || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Top Category
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Item Performance */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon fontSize="small" />
                Item Performance
              </Typography>
              {itemPerformance.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Rank</TableCell>
                        <TableCell>Item Name</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="center">Trend</TableCell>
                        <TableCell align="center">Recommendation</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {itemPerformance.map((item, index) => (
                        <TableRow key={item.item_id || index}>
                          <TableCell>#{item.performance_rank || index + 1}</TableCell>
                          <TableCell fontWeight="bold">{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.total_revenue || 0)}
                          </TableCell>
                          <TableCell align="right">{item.total_quantity || 0}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={item.trend || 'unknown'} 
                              color={getTrendChipColor(item.trend)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={item.recommendation || 'none'} 
                              color={getRecommendationChipColor(item.recommendation)}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No items found</Alert>
              )}
            </CardContent>
          </Card>

          {/* Category Performance */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Category Performance
              </Typography>
              {categoryPerformance.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Items</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">Score</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {categoryPerformance.map((category, index) => (
                        <TableRow key={category.category || index}>
                          <TableCell fontWeight="bold">{category.category}</TableCell>
                          <TableCell align="right">{category.item_count || 0}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(category.total_revenue || 0)}
                          </TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={category.performance_score?.toFixed(1) || 'N/A'} 
                              color={category.performance_score >= 8 ? 'success' : 
                                     category.performance_score >= 6 ? 'warning' : 'error'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No category data available</Alert>
              )}
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            {/* Key Insights */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                    <LightbulbIcon fontSize="small" />
                    Key Insights
                  </Typography>
                  {insights.length > 0 ? (
                    <List dense>
                      {insights.map((insight, index) => (
                        <ListItem key={index} sx={{ pl: 0 }}>
                          <ListItemIcon>
                            <CheckCircleIcon color="info" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={insight}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No insights available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Recommendations */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                    <CheckCircleIcon fontSize="small" />
                    Recommendations
                  </Typography>
                  {recommendations.length > 0 ? (
                    <List dense>
                      {recommendations.map((recommendation, index) => (
                        <ListItem key={index} sx={{ pl: 0 }}>
                          <ListItemIcon>
                            <WarningIcon color="warning" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={recommendation}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No recommendations available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Analysis Details */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Analysis Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Duration:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatDuration(performance.generation_duration || metadata.generation_duration || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Confidence:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {Math.round((data.confidence || 0) * 100)}%
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Data Quality:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {summary.total_revenue_analyzed > 0 ? 'Good' : 'Limited'}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Requested:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {new Date(optimization.createdAt || Date.now()).toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Optimization Analysis</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this optimization analysis? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MenuOptimizationViewer;
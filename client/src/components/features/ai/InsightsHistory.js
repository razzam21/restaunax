import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  TrendingUp as TrendingUpIcon,
  Restaurant as RestaurantIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useAI } from '../../../contexts/AIContext';

const InsightsHistory = ({ insights = [], onViewInsight }) => {
  const { deleteInsight, lockInsight, unlockInsight, loading } = useAI();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const getJobIcon = (type) => {
    switch (type) {
      case 'demand_forecast':
        return <TrendingUpIcon fontSize="small" color="primary" />;
      case 'menu_optimization':
        return <RestaurantIcon fontSize="small" color="primary" />;
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

  const getStatusChip = (status) => {
    const statusConfig = {
      completed: { 
        label: 'Completed', 
        color: 'success', 
        icon: <CheckCircleIcon fontSize="small" /> 
      },
      running: { 
        label: 'Running', 
        color: 'info', 
        icon: <ScheduleIcon fontSize="small" /> 
      },
      pending: { 
        label: 'Pending', 
        color: 'warning', 
        icon: <ScheduleIcon fontSize="small" /> 
      },
      failed: { 
        label: 'Failed', 
        color: 'error', 
        icon: <ErrorIcon fontSize="small" /> 
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
      />
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatConfidence = (confidence) => {
    if (!confidence) return 'N/A';
    return `${Math.round(confidence * 100)}%`;
  };

  const isViewable = (insight) => {
    return insight.job?.status === 'completed';
  };

  const isLocked = (insight) => {
    return insight.data?.locked || false;
  };

  const handleDeleteClick = (insight) => {
    setSelectedInsight(insight);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedInsight) {
      try {
        await deleteInsight(selectedInsight.id);
        setDeleteConfirmOpen(false);
        setSelectedInsight(null);
      } catch (error) {
        // Error is handled in the context
        console.error('Delete failed:', error);
      }
    }
  };

  const handleLockToggle = async (insight) => {
    try {
      if (isLocked(insight)) {
        await unlockInsight(insight.id);
      } else {
        await lockInsight(insight.id);
      }
    } catch (error) {
      // Error is handled in the context
      console.error('Lock toggle failed:', error);
    }
  };

  if (insights.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No insights generated yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Start your first AI analysis using the tabs above
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Insights History
      </Typography>
      
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {insights.map((insight) => (
              <TableRow key={insight.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getJobIcon(insight.type)}
                    <Typography variant="body2">
                      {getJobTitle(insight.type)}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {insight.title || getJobTitle(insight.type)}
                    </Typography>
                    {insight.summary && (
                      <Typography variant="caption" color="text.secondary">
                        {insight.summary.length > 60 
                          ? `${insight.summary.substring(0, 60)}...`
                          : insight.summary
                        }
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                
                <TableCell>
                  {getStatusChip(insight.job?.status || 'pending')}
                </TableCell>
                
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">
                      {formatConfidence(insight.confidence)}
                    </Typography>
                    {insight.confidence && (
                      <LinearProgress
                        variant="determinate"
                        value={insight.confidence * 100}
                        sx={{ width: 40, height: 4 }}
                      />
                    )}
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(insight.createdAt)}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {/* View Button */}
                    {isViewable(insight) ? (
                      <Tooltip title="View Insight">
                        <IconButton
                          size="small"
                          onClick={() => onViewInsight(insight)}
                          color="primary"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title={`Analysis ${insight.job?.status || 'pending'}`}>
                        <span>
                          <IconButton size="small" disabled>
                            <VisibilityIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}

                    {/* Lock/Unlock Button */}
                    <Tooltip title={isLocked(insight) ? "Unlock Insight" : "Lock Insight"}>
                      <IconButton
                        size="small"
                        onClick={() => handleLockToggle(insight)}
                        color={isLocked(insight) ? "warning" : "default"}
                        disabled={loading}
                      >
                        {isLocked(insight) ? <LockIcon /> : <LockOpenIcon />}
                      </IconButton>
                    </Tooltip>

                    {/* Delete Button - only show if not locked */}
                    {!isLocked(insight) && (
                      <Tooltip title="Delete Insight">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(insight)}
                          color="error"
                          disabled={loading}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {insights.length > 0 && (
        <Box mt={2} textAlign="center">
          <Typography variant="caption" color="text.secondary">
            Showing {insights.length} insight{insights.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Insight</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the insight &quot;{selectedInsight?.title || 'Untitled'}&quot;?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. The insight will be removed from your history.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InsightsHistory;
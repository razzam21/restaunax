import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as HealthyIcon,
  Warning as DegradedIcon,
  Error as UnhealthyIcon,
  HelpOutline as UnknownIcon,
  PlayArrow as RunningIcon,
  Stop as StoppedIcon,
  Pause as PausedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as CpuIcon,
} from '@mui/icons-material';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import api from '../services/api';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`health-tabpanel-${index}`}
      aria-labelledby={`health-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function SystemHealthPage() {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [containers, setContainers] = useState([]);
  const [features, setFeatures] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Check if user has permission to view system health
  const hasPermission = user && ['owner', 'manager'].includes(user.role);

  const fetchSystemHealth = useCallback(async () => {
    if (!hasPermission) return;

    try {
      setLoading(true);
      const response = await api.get('/system/health');
      
      if (response.data.success) {
        setSystemHealth(response.data.data);
        setContainers(response.data.data.containers || []);
        setFeatures(response.data.data.features || []);
        setLastUpdated(new Date().toLocaleString());
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch system health data');
      console.error('Error fetching system health:', err);
    } finally {
      setLoading(false);
    }
  }, [hasPermission]);

  const fetchSystemMetrics = useCallback(async () => {
    if (!hasPermission) return;

    try {
      const response = await api.get('/system/metrics');
      
      if (response.data.success) {
        setSystemMetrics(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching system metrics:', err);
    }
  }, [hasPermission]);

  const triggerHealthCheck = async () => {
    try {
      setLoading(true);
      await api.post('/system/health/check');
      
      // Refresh data after triggering check
      setTimeout(() => {
        fetchSystemHealth();
      }, 2000);
    } catch (err) {
      setError('Failed to trigger health check');
      console.error('Error triggering health check:', err);
    }
  };

  const updateContainerStatus = async () => {
    try {
      setLoading(true);
      await api.post('/system/containers/update');
      
      // Refresh data after updating
      setTimeout(() => {
        fetchSystemHealth();
      }, 2000);
    } catch (err) {
      setError('Failed to update container status');
      console.error('Error updating container status:', err);
    }
  };

  const toggleFeature = async (featureName, enabled) => {
    try {
      await api.post(`/system/features/${featureName}`, { enabled: !enabled });
      
      // Refresh features
      fetchSystemHealth();
    } catch (err) {
      setError(`Failed to toggle feature: ${featureName}`);
      console.error('Error toggling feature:', err);
    }
  };

  useEffect(() => {
    if (hasPermission) {
      fetchSystemHealth();
      fetchSystemMetrics();
      
      // Set up polling for real-time updates
      const interval = setInterval(() => {
        fetchSystemHealth();
        fetchSystemMetrics();
      }, 30000); // Poll every 30 seconds

      return () => clearInterval(interval);
    }
  }, [hasPermission, fetchSystemHealth, fetchSystemMetrics]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <HealthyIcon sx={{ color: 'success.main' }} />;
      case 'degraded':
        return <DegradedIcon sx={{ color: 'warning.main' }} />;
      case 'unhealthy':
        return <UnhealthyIcon sx={{ color: 'error.main' }} />;
      default:
        return <UnknownIcon sx={{ color: 'grey.500' }} />;
    }
  };

  const getContainerStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <RunningIcon sx={{ color: 'success.main' }} />;
      case 'stopped':
      case 'exited':
        return <StoppedIcon sx={{ color: 'error.main' }} />;
      case 'paused':
        return <PausedIcon sx={{ color: 'warning.main' }} />;
      default:
        return <UnknownIcon sx={{ color: 'grey.500' }} />;
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (!hasPermission) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          You don't have permission to view system health. This feature is only available to owners and managers.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          System Health Monitor
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Trigger Manual Health Check">
            <IconButton onClick={triggerHealthCheck} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            onClick={updateContainerStatus}
            disabled={loading}
            startIcon={<RefreshIcon />}
          >
            Update Containers
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {lastUpdated && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Last updated: {lastUpdated}
        </Typography>
      )}

      {/* Overall Status Card */}
      {systemHealth && (
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title="Overall System Status"
            avatar={getStatusIcon(systemHealth.status)}
            action={
              <Chip
                label={systemHealth.status?.toUpperCase() || 'UNKNOWN'}
                color={
                  systemHealth.status === 'healthy' ? 'success' :
                  systemHealth.status === 'degraded' ? 'warning' :
                  systemHealth.status === 'unhealthy' ? 'error' : 'default'
                }
                variant="outlined"
              />
            }
          />
        </Card>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="system health tabs">
          <Tab label="Services" />
          <Tab label="Containers" />
          <Tab label="System Metrics" />
          <Tab label="Feature Flags" />
        </Tabs>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Services Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {systemHealth?.services?.map((service) => (
            <Grid item xs={12} md={6} lg={4} key={service.serviceName}>
              <Card>
                <CardHeader
                  title={service.serviceName}
                  avatar={getStatusIcon(service.status)}
                  action={
                    <Chip
                      label={service.status}
                      color={
                        service.status === 'healthy' ? 'success' :
                        service.status === 'degraded' ? 'warning' :
                        service.status === 'unhealthy' ? 'error' : 'default'
                      }
                      size="small"
                    />
                  }
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Response Time: {service.responseTime ? `${service.responseTime}ms` : 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Error Count: {service.errorCount || 0}
                  </Typography>
                  {service.lastError && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      Last Error: {service.lastError}
                    </Typography>
                  )}
                  {service.metadata && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {service.metadata.activeConnections !== undefined && (
                        `Active Connections: ${service.metadata.activeConnections}`
                      )}
                      {service.metadata.uptime && (
                        `Uptime: ${formatUptime(service.metadata.uptime)}`
                      )}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Containers Tab */}
      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Image</TableCell>
                <TableCell>CPU Usage</TableCell>
                <TableCell>Memory Usage</TableCell>
                <TableCell>Restart Count</TableCell>
                <TableCell>Started At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {containers.map((container) => (
                <TableRow key={container.name}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getContainerStatusIcon(container.status)}
                      {container.name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={container.status}
                      color={container.status === 'running' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{container.image}</TableCell>
                  <TableCell>
                    {container.cpuUsage ? `${container.cpuUsage.toFixed(1)}%` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {formatBytes(container.memoryUsage)}
                  </TableCell>
                  <TableCell>{container.restartCount || 0}</TableCell>
                  <TableCell>
                    {container.startedAt 
                      ? new Date(container.startedAt).toLocaleString() 
                      : 'N/A'
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* System Metrics Tab */}
      <TabPanel value={tabValue} index={2}>
        {systemMetrics && (
          <Grid container spacing={3}>
            {/* CPU Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader
                  title="CPU Information"
                  avatar={<CpuIcon />}
                />
                <CardContent>
                  <Typography variant="body2">
                    Brand: {systemMetrics.cpu?.brand || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    Cores: {systemMetrics.cpu?.cores || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    Speed: {systemMetrics.cpu?.speed ? `${systemMetrics.cpu.speed} GHz` : 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    Current Load: {systemMetrics.load?.currentLoad ? `${systemMetrics.load.currentLoad.toFixed(1)}%` : 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Memory Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader
                  title="Memory Information"
                  avatar={<MemoryIcon />}
                />
                <CardContent>
                  <Typography variant="body2">
                    Total: {formatBytes(systemMetrics.memory?.total)}
                  </Typography>
                  <Typography variant="body2">
                    Used: {formatBytes(systemMetrics.memory?.used)}
                  </Typography>
                  <Typography variant="body2">
                    Free: {formatBytes(systemMetrics.memory?.free)}
                  </Typography>
                  <Typography variant="body2">
                    Usage: {systemMetrics.memory?.percentage ? `${systemMetrics.memory.percentage}%` : 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Disk Information */}
            {systemMetrics.disk?.map((disk, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card>
                  <CardHeader
                    title={`Disk ${disk.mount || index + 1}`}
                    avatar={<StorageIcon />}
                  />
                  <CardContent>
                    <Typography variant="body2">
                      Type: {disk.type || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      Size: {formatBytes(disk.size)}
                    </Typography>
                    <Typography variant="body2">
                      Used: {formatBytes(disk.used)}
                    </Typography>
                    <Typography variant="body2">
                      Available: {formatBytes(disk.available)}
                    </Typography>
                    <Typography variant="body2">
                      Usage: {disk.percentage ? `${disk.percentage}%` : 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Feature Flags Tab */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={2}>
          {features.map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.name}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" component="h3">
                      {feature.name}
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      color={feature.enabled ? 'error' : 'success'}
                      onClick={() => toggleFeature(feature.name, feature.enabled)}
                    >
                      {feature.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </Box>
                  {feature.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {feature.description}
                    </Typography>
                  )}
                  <Chip
                    label={feature.enabled ? 'Enabled' : 'Disabled'}
                    color={feature.enabled ? 'success' : 'default'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>
    </Box>
  );
}

export default SystemHealthPage;
import { Fragment } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  CircularProgress, 
  Card, 
  CardContent, 
  Divider, 
  useTheme,
  Button,
  Chip
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  LocalDining, 
  AccessTime, 
  AttachMoney, 
  Speed,
  PendingActions,
  People
} from '@mui/icons-material';
import { useDashboard } from '../contexts/DashboardContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Status Indicator component
const StatusIndicator = ({ connected }) => {
  return (
    <Box display="flex" alignItems="center" justifyContent="flex-end" mb={2}>
      <Chip 
        label={connected ? "Live Data" : "Offline"} 
        color={connected ? "success" : "error"} 
        size="small" 
        variant="outlined"
      />
    </Box>
  );
};

// KPI Card component
const KpiCard = ({ title, value, icon, subtitle, trend, color }) => {
  const theme = useTheme();
  const IconComponent = icon;
  
  return (
    <Card elevation={3}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={1}>
          <Box mr={1} display="flex" bgcolor={`${color}.100`} p={1} borderRadius="50%">
            <IconComponent fontSize="small" color={color} />
          </Box>
          <Typography variant="h6" color="textSecondary">
            {title}
          </Typography>
        </Box>
        
        <Typography variant="h4" component="div" gutterBottom>
          {value}
        </Typography>
        
        {subtitle && (
          <Box display="flex" alignItems="center">
            {trend && trend !== 0 && (
              <Box mr={1} color={trend > 0 ? theme.palette.success.main : theme.palette.error.main}>
                {trend > 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
              </Box>
            )}
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Dashboard Page component
const DashboardPage = () => {
  const theme = useTheme();
  const { metrics, loading, error, isConnected, refreshDashboard } = useDashboard();
  const { user } = useAuth();
  
  // Check if user has access
  if (user.role !== 'manager' && user.role !== 'owner') {
    return (
      <Container>
        <Box mt={4} textAlign="center">
          <Typography variant="h5" color="error">
            Only managers and owners can view the dashboard
          </Typography>
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box mt={4} textAlign="center">
          <Typography variant="h5" color="error" gutterBottom>
            Error loading dashboard data
          </Typography>
          <Button variant="contained" onClick={refreshDashboard}>
            Try Again
          </Button>
        </Box>
      </Container>
    );
  }

  // Format hourly data for chart
  const hourlyChartData = metrics.hourlyData.map(hour => ({
    hour: hour.hour,
    revenue: parseFloat(hour.revenue).toFixed(2),
    orders: hour.orderCount
  }));

  // Format item performance data for pie chart
  const itemChartData = metrics.itemPerformance.map(item => ({
    name: item.itemName,
    value: item.quantity
  }));

  // Colors for pie chart
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
    '#8884d8', // Add some extras for more than 6 items
    '#83a6ed',
    '#8dd1e1',
    '#82ca9d',
  ];

  return (
    <Container maxWidth="lg">
      <Box mt={4} mb={2}>
        <Typography variant="h4" gutterBottom>
          Management Dashboard
        </Typography>
        <StatusIndicator connected={isConnected} />
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            title="Today's Revenue" 
            value={`$${metrics.dailyRevenue.today.toFixed(2)}`}
            icon={AttachMoney}
            subtitle={metrics.dailyRevenue.percentChange !== 0 
              ? `${metrics.dailyRevenue.percentChange > 0 ? '+' : ''}${metrics.dailyRevenue.percentChange.toFixed(1)}% vs yesterday`
              : 'No change vs yesterday'}
            trend={metrics.dailyRevenue.percentChange}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            title="Orders Today" 
            value={metrics.orderMetrics.totalToday}
            icon={LocalDining}
            subtitle={`Avg Value: $${metrics.orderMetrics.averageValue.toFixed(2)}`}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            title="Kitchen Load" 
            value={`${metrics.operationalStatus.kitchenLoad}%`}
            icon={Speed}
            subtitle={`${metrics.operationalStatus.pendingOrders} orders pending`}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard 
            title="Avg Prep Time" 
            value={`${metrics.orderMetrics.averagePrepTime.toFixed(1)} min`}
            icon={AccessTime}
            subtitle={`${metrics.operationalStatus.staffProductivity.toFixed(1)} orders/hour`}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Hourly Revenue Chart */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Hourly Revenue & Order Volume
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={hourlyChartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis yAxisId="left" orientation="left" stroke={theme.palette.primary.main} />
                  <YAxis yAxisId="right" orientation="right" stroke={theme.palette.secondary.main} />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    yAxisId="left" 
                    dataKey="revenue" 
                    name="Revenue ($)" 
                    fill={theme.palette.primary.main} 
                  />
                  <Bar 
                    yAxisId="right" 
                    dataKey="orders" 
                    name="Orders" 
                    fill={theme.palette.secondary.main} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Top Menu Items */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Top Menu Items
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box height={300} display="flex" flexDirection="column" justifyContent="center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={itemChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {itemChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} units`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Operational Metrics */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Operational Insights
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" p={2} bgcolor={theme.palette.background.default} borderRadius={1}>
                  <PendingActions color="warning" fontSize="large" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="body2" color="textSecondary">Pending Orders</Typography>
                    <Typography variant="h6">{metrics.operationalStatus.pendingOrders}</Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" p={2} bgcolor={theme.palette.background.default} borderRadius={1}>
                  <People color="info" fontSize="large" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="body2" color="textSecondary">Staff Productivity</Typography>
                    <Typography variant="h6">{metrics.operationalStatus.staffProductivity.toFixed(1)} orders/hour</Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" p={2} bgcolor={theme.palette.background.default} borderRadius={1}>
                  <AccessTime color="success" fontSize="large" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="body2" color="textSecondary">Peak Hours</Typography>
                    <Typography variant="h6">{metrics.operationalStatus.peakHours.join(', ')}</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;
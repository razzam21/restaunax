import { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  CircularProgress, 
  Button,
  TextField,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  Alert,
  useTheme,
  Tabs,
  Tab,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Card,
  CardContent
} from '@mui/material';
// Using standard TextField for date input instead of DatePicker to avoid compatibility issues
import { Refresh, PictureAsPdf, GridOn } from '@mui/icons-material';
import { useReports } from '../contexts/ReportContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { format, startOfMonth, subDays } from 'date-fns';

// Tab Panel component
const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          {children}
        </Box>
      )}
    </div>
  );
};

// Reports Page component
const ReportsPage = () => {
  const theme = useTheme();
  const { ordersReport, loading, error, loadOrdersReport, downloadReport, clearError } = useReports();
  const { user } = useAuth();
  
  // State for date range filters
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(new Date());
  const [selectedStatus, setSelectedStatus] = useState('');
  const [orderType, setOrderType] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [downloadFormat, setDownloadFormat] = useState('csv');
  
  // Quick date range options
  const [dateRange, setDateRange] = useState('month');

  // Check if user has access
  const hasAccess = user.role === 'manager' || user.role === 'owner';
  
  // Load initial report
  useEffect(() => {
    if (hasAccess) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  if (!hasAccess) {
    return (
      <Container>
        <Box mt={4} textAlign="center">
          <Typography variant="h5" color="error">
            Only managers and owners can access reports
          </Typography>
        </Box>
      </Container>
    );
  }

  // Handle date range change
  const handleDateRangeChange = (event) => {
    const range = event.target.value;
    setDateRange(range);
    
    const today = new Date();
    let yesterday;
    
    switch (range) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'yesterday':
        yesterday = subDays(today, 1);
        setStartDate(yesterday);
        setEndDate(yesterday);
        break;
      case 'week':
        setStartDate(subDays(today, 7));
        setEndDate(today);
        break;
      case 'month':
        setStartDate(startOfMonth(today));
        setEndDate(today);
        break;
      case 'customRange':
        // Keep current date range
        break;
      default:
        setStartDate(startOfMonth(today));
        setEndDate(today);
    }
  };

  // Load report data
  const fetchReport = () => {
    clearError();
    loadOrdersReport({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      status: selectedStatus || undefined,
      orderType: orderType || undefined
    });
  };

  // Handle download
  const handleDownload = () => {
    downloadReport(downloadFormat, {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      status: selectedStatus || undefined,
      orderType: orderType || undefined
    });
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Note: Initial report loading is now handled earlier in the component

  // Process data for charts
  const prepareStatusChartData = () => {
    if (!ordersReport.ordersByStatus) return [];
    
    return Object.keys(ordersReport.ordersByStatus).map(status => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: ordersReport.ordersByStatus[status]
    }));
  };
  
  const prepareTypeChartData = () => {
    if (!ordersReport.ordersByType) return [];
    
    return Object.keys(ordersReport.ordersByType).map(type => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: ordersReport.ordersByType[type]
    }));
  };

  // Colors for pie charts
  const STATUS_COLORS = {
    pending: theme.palette.warning.main,
    preparing: theme.palette.info.main,
    ready: theme.palette.primary.main,
    delivered: theme.palette.success.main
  };
  
  const TYPE_COLORS = {
    delivery: theme.palette.secondary.main,
    pickup: theme.palette.primary.main
  };

  const statusChartData = prepareStatusChartData();
  const typeChartData = prepareTypeChartData();

  // Format date for display
  const formatDate = (date) => {
    return date ? format(new Date(date), 'MMM d, yyyy') : '';
  };

  return (
    <Container maxWidth="lg">
      <Box mt={4} mb={2}>
        <Typography variant="h4" gutterBottom>
          Reports
        </Typography>
      </Box>

      {/* Filter Section */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl component="fieldset">
              <RadioGroup row value={dateRange} onChange={handleDateRangeChange}>
                <FormControlLabel value="today" control={<Radio />} label="Today" />
                <FormControlLabel value="yesterday" control={<Radio />} label="Yesterday" />
                <FormControlLabel value="week" control={<Radio />} label="Last 7 days" />
                <FormControlLabel value="month" control={<Radio />} label="This month" />
                <FormControlLabel value="customRange" control={<Radio />} label="Custom range" />
              </RadioGroup>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Box display="flex" flexWrap="wrap" gap={2}>
              <TextField
                type="date"
                label="Start Date"
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  setDateRange('customRange');
                  setStartDate(new Date(e.target.value));
                }}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 180 }}
              />
              
              <TextField
                type="date"
                label="End Date"
                value={format(endDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  setDateRange('customRange');
                  setEndDate(new Date(e.target.value));
                }}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 180 }}
              />
              
              <TextField
                select
                label="Status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                sx={{ width: 140 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="preparing">Preparing</MenuItem>
                <MenuItem value="ready">Ready</MenuItem>
                <MenuItem value="delivered">Delivered</MenuItem>
              </TextField>
              
              <TextField
                select
                label="Order Type"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                sx={{ width: 140 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="delivery">Delivery</MenuItem>
                <MenuItem value="pickup">Pickup</MenuItem>
              </TextField>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Refresh />}
                onClick={fetchReport}
              >
                Apply Filters
              </Button>
              
              <Box display="flex" alignItems="center" gap={1}>
                <TextField
                  select
                  size="small"
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value)}
                  sx={{ width: 100 }}
                >
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                </TextField>
                
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={downloadFormat === 'csv' ? <GridOn /> : <PictureAsPdf />}
                  onClick={handleDownload}
                  disabled={loading}
                >
                  Download
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading indicator */}
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Report Tabs */}
          <Box mb={4}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Summary" />
              <Tab label="Orders" />
              <Tab label="Charts" />
            </Tabs>
            
            {/* Summary Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card elevation={3}>
                    <CardContent>
                      <Typography variant="h6" color="textSecondary" gutterBottom>
                        Total Orders
                      </Typography>
                      <Typography variant="h3">
                        {ordersReport.totalOrders}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {formatDate(ordersReport.dateRange?.startDate)} - {formatDate(ordersReport.dateRange?.endDate)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card elevation={3}>
                    <CardContent>
                      <Typography variant="h6" color="textSecondary" gutterBottom>
                        Total Revenue
                      </Typography>
                      <Typography variant="h3">
                        ${ordersReport.totalRevenue?.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Average order: ${(ordersReport.totalRevenue / ordersReport.totalOrders || 0).toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card elevation={3}>
                    <CardContent>
                      <Typography variant="h6" color="textSecondary" gutterBottom>
                        By Type
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={1}>
                        {Object.entries(ordersReport.ordersByType || {}).map(([type, count]) => (
                          <Box key={type} display="flex" justifyContent="space-between">
                            <Typography>{type.charAt(0).toUpperCase() + type.slice(1)}</Typography>
                            <Typography fontWeight="bold">{count}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Orders by Status
                    </Typography>
                    <Grid container spacing={2}>
                      {Object.entries(ordersReport.ordersByStatus || {}).map(([status, count]) => (
                        <Grid item xs={6} sm={3} key={status}>
                          <Box 
                            p={2} 
                            bgcolor={theme.palette.background.default} 
                            borderRadius={1}
                            borderLeft={`4px solid ${STATUS_COLORS[status] || theme.palette.grey[500]}`}
                          >
                            <Typography variant="h5">{count}</Typography>
                            <Typography variant="body2" color="textSecondary">
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
            
            {/* Orders Tab */}
            <TabPanel value={tabValue} index={1}>
              <TableContainer component={Paper} elevation={3}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order #</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ordersReport.orders?.length > 0 ? (
                      ordersReport.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{order.orderNumber || order.id.substring(0, 8)}</TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell>{format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}</TableCell>
                          <TableCell>{order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)}</TableCell>
                          <TableCell>
                            <Box
                              component="span"
                              sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor: STATUS_COLORS[order.status] + '20',
                                color: STATUS_COLORS[order.status],
                                fontWeight: 'medium',
                              }}
                            >
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Box>
                          </TableCell>
                          <TableCell align="right">${order.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No orders found for the selected filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
            
            {/* Charts Tab */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Orders by Status
                    </Typography>
                    <Box height={300}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statusChartData.map((entry) => (
                              <Cell 
                                key={`cell-${entry.name}`} 
                                fill={STATUS_COLORS[entry.name.toLowerCase()] || theme.palette.grey[500]} 
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} orders`, 'Count']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Orders by Type
                    </Typography>
                    <Box height={300}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={typeChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {typeChartData.map((entry) => (
                              <Cell 
                                key={`cell-${entry.name}`} 
                                fill={TYPE_COLORS[entry.name.toLowerCase()] || theme.palette.grey[500]} 
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} orders`, 'Count']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
          </Box>
        </>
      )}
    </Container>
  );
};

export default ReportsPage;
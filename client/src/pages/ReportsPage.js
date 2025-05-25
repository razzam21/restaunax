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
  Divider,
  Alert,
  useTheme,
  useMediaQuery,
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
import ResponsiveTable from '../components/common/ResponsiveTable';
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
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
    <Container maxWidth="lg" sx={{ px: isMobile ? 1 : isTablet ? 2 : 3 }}>
      <Box mt={isMobile ? 2 : isTablet ? 3 : 4} mb={2}>
        <Typography variant={isMobile ? "h5" : isTablet ? "h4" : "h4"} gutterBottom>
          Reports
        </Typography>
      </Box>

      {/* Filter Section */}
      <Paper elevation={3} sx={{ p: isMobile ? 2 : isTablet ? 2.5 : 3, mb: isMobile ? 3 : isTablet ? 3.5 : 4 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Divider sx={{ mb: isMobile ? 2 : isTablet ? 2.5 : 3 }} />
        
        <Grid container spacing={isMobile ? 2 : 3} alignItems="flex-start">
          <Grid item xs={12} md={4}>
            <FormControl component="fieldset">
              <RadioGroup 
                row={!isMobile} 
                value={dateRange} 
                onChange={handleDateRangeChange}
                sx={{ flexDirection: isMobile ? 'column' : 'row' }}
              >
                <FormControlLabel value="today" control={<Radio />} label="Today" />
                <FormControlLabel value="yesterday" control={<Radio />} label="Yesterday" />
                <FormControlLabel value="week" control={<Radio />} label="Last 7 days" />
                <FormControlLabel value="month" control={<Radio />} label="This month" />
                <FormControlLabel value="customRange" control={<Radio />} label="Custom range" />
              </RadioGroup>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Grid container spacing={isMobile ? 1 : 2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  type="date"
                  label="Start Date"
                  value={format(startDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    setDateRange('customRange');
                    setStartDate(new Date(e.target.value));
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size={isMobile ? "medium" : "medium"}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  type="date"
                  label="End Date"
                  value={format(endDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    setDateRange('customRange');
                    setEndDate(new Date(e.target.value));
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size={isMobile ? "medium" : "medium"}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  label="Status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  fullWidth
                  size={isMobile ? "medium" : "medium"}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="preparing">Preparing</MenuItem>
                  <MenuItem value="ready">Ready</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  label="Order Type"
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  fullWidth
                  size={isMobile ? "medium" : "medium"}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="delivery">Delivery</MenuItem>
                  <MenuItem value="pickup">Pickup</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={12}>
            <Box 
              display="flex" 
              justifyContent={isMobile ? "center" : "flex-end"} 
              gap={isMobile ? 1 : 2}
              flexDirection={isMobile ? "column" : "row"}
              alignItems={isMobile ? "stretch" : "center"}
            >
              <Button
                variant="contained"
                color="primary"
                startIcon={<Refresh />}
                onClick={fetchReport}
                sx={{ 
                  minHeight: isMobile ? 48 : 'auto',
                  order: isMobile ? 2 : 1,
                }}
                fullWidth={isMobile}
              >
                Apply Filters
              </Button>
              
              <Box 
                display="flex" 
                alignItems="center" 
                gap={1}
                sx={{ 
                  order: isMobile ? 1 : 2,
                  width: isMobile ? '100%' : 'auto',
                }}
              >
                <TextField
                  select
                  size={isMobile ? "medium" : "small"}
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value)}
                  sx={{ 
                    width: isMobile ? '40%' : 100,
                    minWidth: 100,
                  }}
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
                  sx={{ 
                    flex: isMobile ? 1 : 'none',
                    minHeight: isMobile ? 48 : 'auto',
                  }}
                >
                  {isMobile ? 'Download' : 'Download'}
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
          <Box mb={isMobile ? 3 : 4}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              variant={isMobile ? "fullWidth" : "standard"}
              scrollButtons={isMobile ? "auto" : false}
              allowScrollButtonsMobile={isMobile}
            >
              <Tab label="Summary" />
              <Tab label="Orders" />
              <Tab label="Charts" />
            </Tabs>
            
            {/* Summary Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={isMobile ? 2 : 3}>
                <Grid item xs={12} md={4}>
                  <Card elevation={3}>
                    <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                      <Typography variant="h6" color="textSecondary" gutterBottom>
                        Total Orders
                      </Typography>
                      <Typography variant={isMobile ? "h4" : "h3"}>
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
                    <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                      <Typography variant="h6" color="textSecondary" gutterBottom>
                        Total Revenue
                      </Typography>
                      <Typography variant={isMobile ? "h4" : "h3"}>
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
                    <CardContent sx={{ p: isMobile ? 2 : 3 }}>
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
                  <Paper elevation={3} sx={{ p: isMobile ? 2 : 3, mt: isMobile ? 2 : 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Orders by Status
                    </Typography>
                    <Grid container spacing={isMobile ? 1 : 2}>
                      {Object.entries(ordersReport.ordersByStatus || {}).map(([status, count]) => (
                        <Grid item xs={6} sm={3} key={status}>
                          <Box 
                            p={isMobile ? 1.5 : 2} 
                            bgcolor={theme.palette.background.default} 
                            borderRadius={1}
                            borderLeft={`4px solid ${STATUS_COLORS[status] || theme.palette.grey[500]}`}
                          >
                            <Typography variant={isMobile ? "h6" : "h5"}>{count}</Typography>
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
              <ResponsiveTable
                columns={[
                  { key: 'orderNumber', label: 'Order #', width: '15%' },
                  { key: 'customerName', label: 'Customer', width: '20%' },
                  { key: 'createdAt', label: 'Date', width: '20%' },
                  { key: 'orderType', label: 'Type', width: '15%' },
                  { key: 'status', label: 'Status', width: '15%' },
                  { key: 'total', label: 'Total', width: '15%', align: 'right' }
                ]}
                data={ordersReport.orders?.map(order => ({
                  ...order,
                  orderNumber: order.orderNumber || order.id.substring(0, 8),
                  createdAt: format(new Date(order.createdAt), 'MMM d, yyyy h:mm a'),
                  orderType: order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1),
                  status: (
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
                  ),
                  total: `$${order.total.toFixed(2)}`
                })) || []}
                emptyMessage="No orders found for the selected filters"
                elevation={3}
              />
            </TabPanel>
            
            {/* Charts Tab */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={isMobile ? 2 : 3}>
                <Grid item xs={12} md={6}>
                  <Paper elevation={3} sx={{ p: isMobile ? 2 : 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Orders by Status
                    </Typography>
                    <Box height={isMobile ? 250 : 300}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={isMobile ? false : ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={isMobile ? 60 : 80}
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
                  <Paper elevation={3} sx={{ p: isMobile ? 2 : 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Orders by Type
                    </Typography>
                    <Box height={isMobile ? 250 : 300}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={typeChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={isMobile ? false : ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={isMobile ? 60 : 80}
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
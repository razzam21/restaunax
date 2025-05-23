import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  BugReport as DebugIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../../../services/api';

function SystemLogsViewer() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Filters
  const [levelFilter, setLevelFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      };

      if (levelFilter) params.level = levelFilter;
      if (serviceFilter) params.service = serviceFilter;
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const response = await api.get('/system/logs', { params });

      if (response.data.success) {
        setLogs(response.data.data.logs);
        setTotal(response.data.data.total);
      }
    } catch (err) {
      setError('Failed to fetch system logs');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, levelFilter, serviceFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterReset = () => {
    setLevelFilter('');
    setServiceFilter('');
    setStartDate(null);
    setEndDate(null);
    setPage(0);
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'warn':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'info':
        return <InfoIcon sx={{ color: 'info.main' }} />;
      case 'debug':
        return <DebugIcon sx={{ color: 'grey.500' }} />;
      default:
        return <InfoIcon sx={{ color: 'grey.500' }} />;
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      case 'info':
        return 'info';
      case 'debug':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            System Logs
          </Typography>
          <Button
            variant="outlined"
            onClick={fetchLogs}
            disabled={loading}
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Level</InputLabel>
                <Select
                  value={levelFilter}
                  label="Level"
                  onChange={(e) => setLevelFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="warn">Warning</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="debug">Debug</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Service"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                placeholder="Filter by service"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <DateTimePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                renderInput={(params) => <TextField {...params} size="small" fullWidth />}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <DateTimePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                renderInput={(params) => <TextField {...params} size="small" fullWidth />}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                onClick={handleFilterReset}
                disabled={loading}
                fullWidth
              >
                Reset Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Logs Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Level</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>User</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getLevelIcon(log.level)}
                          <Chip
                            label={log.level.toUpperCase()}
                            color={getLevelColor(log.level)}
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {formatTimestamp(log.timestamp)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={log.service} variant="outlined" size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={log.message}
                        >
                          {log.message}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {log.user ? (
                          <Box>
                            <Typography variant="body2">
                              {log.user.username}
                            </Typography>
                            <Chip
                              label={log.user.role}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            System
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      </Box>
    </LocalizationProvider>
  );
}

export default SystemLogsViewer;
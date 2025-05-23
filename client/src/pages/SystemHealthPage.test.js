import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import SystemHealthPage from './SystemHealthPage';
import api from '../services/api';

// Mock the API
jest.mock('../services/api');

// Mock date-fns adapter for DateTimePicker
jest.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: jest.fn(() => ({})),
}));

const theme = createTheme();

const mockAuthContext = {
  user: {
    id: '1',
    username: 'testowner',
    role: 'owner',
    restaurantId: 'restaurant-1',
  },
};

const mockThemeContext = {
  theme: {
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
  },
};

const mockSystemHealthData = {
  status: 'healthy',
  services: [
    {
      id: '1',
      serviceName: 'database',
      status: 'healthy',
      responseTime: 15,
      errorCount: 0,
      lastCheckAt: new Date().toISOString(),
    },
    {
      id: '2',
      serviceName: 'websocket',
      status: 'healthy',
      responseTime: 5,
      errorCount: 0,
      lastCheckAt: new Date().toISOString(),
      metadata: {
        activeConnections: 5,
        totalUsers: 3,
      },
    },
  ],
  containers: [
    {
      id: '1',
      name: 'api-container',
      status: 'running',
      image: 'restaunax-api:latest',
      cpuUsage: 25.5,
      memoryUsage: 512000000,
      restartCount: 0,
      startedAt: new Date().toISOString(),
    },
  ],
  features: [
    {
      id: '1',
      name: 'feature-a',
      enabled: true,
      description: 'Test feature A',
    },
    {
      id: '2',
      name: 'feature-b',
      enabled: false,
      description: 'Test feature B',
    },
  ],
};

const mockSystemMetrics = {
  cpu: {
    brand: 'Intel Core i7',
    cores: 8,
    speed: 3.2,
  },
  memory: {
    total: 16777216000,
    used: 8388608000,
    free: 8388608000,
    percentage: 50,
  },
  disk: [
    {
      fs: '/dev/disk1',
      type: 'APFS',
      size: 500000000000,
      used: 250000000000,
      available: 250000000000,
      percentage: 50,
      mount: '/',
    },
  ],
  load: {
    currentLoad: 25.5,
  },
};

const renderWithContext = (component, authUser = mockAuthContext.user) => {
  return render(
    <ThemeProvider theme={theme}>
      <AuthContext.Provider value={{ user: authUser }}>
        <ThemeContext.Provider value={mockThemeContext}>
          {component}
        </ThemeContext.Provider>
      </AuthContext.Provider>
    </ThemeProvider>
  );
};

describe('SystemHealthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/system/health') {
        return Promise.resolve({
          data: {
            success: true,
            data: mockSystemHealthData,
          },
        });
      }
      if (url === '/system/metrics') {
        return Promise.resolve({
          data: {
            success: true,
            data: mockSystemMetrics,
          },
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    api.post.mockResolvedValue({
      data: { success: true },
    });
  });

  describe('Authorization', () => {
    it('should show permission denied for non-owner/manager users', () => {
      const waitStaffUser = { ...mockAuthContext.user, role: 'wait_staff' };
      
      renderWithContext(<SystemHealthPage />, waitStaffUser);
      
      expect(screen.getByText(/you don't have permission/i)).toBeInTheDocument();
    });

    it('should allow access for owner users', async () => {
      renderWithContext(<SystemHealthPage />);
      
      await waitFor(() => {
        expect(screen.getByText('System Health Monitor')).toBeInTheDocument();
      });
    });

    it('should allow access for manager users', async () => {
      const managerUser = { ...mockAuthContext.user, role: 'manager' };
      
      renderWithContext(<SystemHealthPage />, managerUser);
      
      await waitFor(() => {
        expect(screen.getByText('System Health Monitor')).toBeInTheDocument();
      });
    });
  });

  describe('System Health Display', () => {
    it('should display overall system status', async () => {
      renderWithContext(<SystemHealthPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Overall System Status')).toBeInTheDocument();
        expect(screen.getByText('HEALTHY')).toBeInTheDocument();
      });
    });

    it('should display services in the services tab', async () => {
      renderWithContext(<SystemHealthPage />);
      
      await waitFor(() => {
        expect(screen.getByText('database')).toBeInTheDocument();
        expect(screen.getByText('websocket')).toBeInTheDocument();
      });

      // Check service details
      expect(screen.getByText('Response Time: 15ms')).toBeInTheDocument();
      expect(screen.getByText('Active Connections: 5')).toBeInTheDocument();
    });

    it('should display containers when switching to containers tab', async () => {
      renderWithContext(<SystemHealthPage />);
      
      await waitFor(() => {
        expect(screen.getByText('System Health Monitor')).toBeInTheDocument();
      });

      // Click on containers tab
      fireEvent.click(screen.getByText('Containers'));
      
      await waitFor(() => {
        expect(screen.getByText('api-container')).toBeInTheDocument();
        expect(screen.getByText('restaunax-api:latest')).toBeInTheDocument();
        expect(screen.getByText('25.5%')).toBeInTheDocument();
      });
    });

    it('should display system metrics when switching to metrics tab', async () => {
      renderWithContext(<SystemHealthPage />);
      
      await waitFor(() => {
        expect(screen.getByText('System Health Monitor')).toBeInTheDocument();
      });

      // Click on system metrics tab
      fireEvent.click(screen.getByText('System Metrics'));
      
      await waitFor(() => {
        expect(screen.getByText('CPU Information')).toBeInTheDocument();
        expect(screen.getByText('Memory Information')).toBeInTheDocument();
        expect(screen.getByText('Intel Core i7')).toBeInTheDocument();
      });
    });

    it('should display feature flags when switching to features tab', async () => {
      renderWithContext(<SystemHealthPage />);
      
      await waitFor(() => {
        expect(screen.getByText('System Health Monitor')).toBeInTheDocument();
      });

      // Click on feature flags tab
      fireEvent.click(screen.getByText('Feature Flags'));
      
      await waitFor(() => {
        expect(screen.getByText('feature-a')).toBeInTheDocument();
        expect(screen.getByText('feature-b')).toBeInTheDocument();
        expect(screen.getByText('Test feature A')).toBeInTheDocument();
      });
    });
  });

  describe('User Actions', () => {
    it('should trigger health check when refresh button is clicked', async () => {
      renderWithContext(<SystemHealthPage />);
      
      await waitFor(() => {
        expect(screen.getByText('System Health Monitor')).toBeInTheDocument();
      });

      const refreshButton = screen.getByLabelText(/trigger manual health check/i);
      fireEvent.click(refreshButton);
      
      expect(api.post).toHaveBeenCalledWith('/system/health/check');
    });

    it('should update container status when update button is clicked', async () => {
      renderWithContext(<SystemHealthPage />);
      
      await waitFor(() => {
        expect(screen.getByText('System Health Monitor')).toBeInTheDocument();
      });

      const updateButton = screen.getByText('Update Containers');
      fireEvent.click(updateButton);
      
      expect(api.post).toHaveBeenCalledWith('/system/containers/update');
    });

    it('should toggle feature flags when enable/disable button is clicked', async () => {
      renderWithContext(<SystemHealthPage />);
      
      await waitFor(() => {
        expect(screen.getByText('System Health Monitor')).toBeInTheDocument();
      });

      // Switch to feature flags tab
      fireEvent.click(screen.getByText('Feature Flags'));
      
      await waitFor(() => {
        const disableButton = screen.getByText('Disable');
        fireEvent.click(disableButton);
      });
      
      expect(api.post).toHaveBeenCalledWith('/system/features/feature-a', { enabled: false });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      api.get.mockRejectedValueOnce(new Error('API Error'));
      
      renderWithContext(<SystemHealthPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch system health data/i)).toBeInTheDocument();
      });
    });

    it('should handle health check trigger errors', async () => {
      api.post.mockRejectedValueOnce(new Error('Health check failed'));
      
      renderWithContext(<SystemHealthPage />);
      
      await waitFor(() => {
        expect(screen.getByText('System Health Monitor')).toBeInTheDocument();
      });

      const refreshButton = screen.getByLabelText(/trigger manual health check/i);
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to trigger health check/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Formatting', () => {
    it('should format bytes correctly', async () => {
      renderWithContext(<SystemHealthPage />);
      
      await waitFor(() => {
        expect(screen.getByText('System Health Monitor')).toBeInTheDocument();
      });

      // Switch to containers tab
      fireEvent.click(screen.getByText('Containers'));
      
      await waitFor(() => {
        expect(screen.getByText('488.28 MB')).toBeInTheDocument(); // 512000000 bytes
      });
    });

    it('should format timestamps correctly', async () => {
      renderWithContext(<SystemHealthPage />);
      
      await waitFor(() => {
        expect(screen.getByText('System Health Monitor')).toBeInTheDocument();
      });

      // Switch to containers tab
      fireEvent.click(screen.getByText('Containers'));
      
      await waitFor(() => {
        // Should display a formatted date string
        const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}/;
        expect(screen.getByText(dateRegex)).toBeInTheDocument();
      });
    });
  });
});
const {
  getOrdersReport,
  downloadOrdersReport,
  getDashboardMetrics
} = require('../../../src/controllers/report-controller');
const reportService = require('../../../src/services/report-service');

// Mock the report service
jest.mock('../../../src/services/report-service');

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('Report Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      user: { 
        id: 'user_1', 
        restaurantId: 'rest_1',
        role: 'manager'
      }
    };

    res = {
      json: jest.fn(() => res),
      status: jest.fn(() => res),
      setHeader: jest.fn(() => res),
      send: jest.fn(),
      attachment: jest.fn(() => res)
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrdersReport', () => {
    const mockReport = {
      orders: [
        { id: 'order_1', orderNumber: 'R1-001', customerName: 'John Doe', total: 42.50 }
      ],
      totalOrders: 1,
      totalRevenue: 42.50,
      ordersByStatus: { delivered: 1 },
      ordersByType: { delivery: 1 },
      dateRange: {
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-05-31')
      }
    };

    test('should return order report data on success', async () => {
      // Setup
      reportService.getOrdersReport.mockResolvedValue(mockReport);
      req.query = { startDate: '2025-05-01', endDate: '2025-05-31' };

      // Execute
      await getOrdersReport(req, res);

      // Verify
      expect(reportService.getOrdersReport).toHaveBeenCalledWith(
        'rest_1',
        { startDate: '2025-05-01', endDate: '2025-05-31' }
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    test('should handle service errors', async () => {
      // Setup
      const error = new Error('Service error');
      reportService.getOrdersReport.mockRejectedValue(error);

      // Execute
      await getOrdersReport(req, res);

      // Verify
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'An error occurred while generating the report'
      });
    });

    test('should return 403 if user is not manager or owner', async () => {
      // Setup
      req.user.role = 'wait_staff';

      // Execute
      await getOrdersReport(req, res);

      // Verify
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Only managers and owners can access reports'
      });
      expect(reportService.getOrdersReport).not.toHaveBeenCalled();
    });
  });

  describe('downloadOrdersReport', () => {
    const mockReportData = {
      format: 'csv',
      data: 'Order Number,Customer Name,Total\nR1-001,John Doe,42.50',
      filename: 'orders_report_rest_1_20250521.csv'
    };

    test('should return csv report file on success', async () => {
      // Setup
      reportService.generateOrdersReportData.mockResolvedValue(mockReportData);
      req.query = { format: 'csv' };

      // Execute
      await downloadOrdersReport(req, res);

      // Verify
      expect(reportService.generateOrdersReportData).toHaveBeenCalledWith(
        'rest_1',
        { format: 'csv' }
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type', 
        'text/csv'
      );
      expect(res.attachment).toHaveBeenCalledWith(mockReportData.filename);
      expect(res.send).toHaveBeenCalledWith(mockReportData.data);
    });

    test('should return pdf report file on success', async () => {
      // Setup
      const mockPdfData = {
        format: 'pdf',
        data: Buffer.from('fake-pdf-data'),
        filename: 'orders_report_rest_1_20250521.pdf'
      };
      reportService.generateOrdersReportData.mockResolvedValue(mockPdfData);
      req.query = { format: 'pdf' };

      // Execute
      await downloadOrdersReport(req, res);

      // Verify
      expect(reportService.generateOrdersReportData).toHaveBeenCalledWith(
        'rest_1',
        { format: 'pdf' }
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type', 
        'application/pdf'
      );
      expect(res.attachment).toHaveBeenCalledWith(mockPdfData.filename);
      expect(res.send).toHaveBeenCalledWith(mockPdfData.data);
    });

    test('should handle service errors', async () => {
      // Setup
      const error = new Error('Service error');
      reportService.generateOrdersReportData.mockRejectedValue(error);

      // Execute
      await downloadOrdersReport(req, res);

      // Verify
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'An error occurred while generating the report'
      });
    });

    test('should return 403 if user is not manager or owner', async () => {
      // Setup
      req.user.role = 'wait_staff';

      // Execute
      await downloadOrdersReport(req, res);

      // Verify
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Only managers and owners can access reports'
      });
      expect(reportService.generateOrdersReportData).not.toHaveBeenCalled();
    });
  });

  describe('getDashboardMetrics', () => {
    const mockMetrics = {
      dailyRevenue: {
        today: 425.5,
        previous: 356.8,
        percentChange: 19.3
      },
      orderMetrics: {
        totalToday: 10,
        averageValue: 42.55,
        averagePrepTime: 23.5
      },
      hourlyData: [
        {
          hour: '12:00',
          revenue: 215.75,
          orderCount: 5
        }
      ],
      itemPerformance: [
        {
          itemName: 'Pizza',
          quantity: 12,
          revenue: 191.88,
          averagePrepTime: 15.2
        }
      ],
      operationalStatus: {
        kitchenLoad: 60,
        pendingOrders: 3,
        staffProductivity: 5.2,
        peakHours: ['12:00', '19:00']
      }
    };

    test('should return dashboard metrics on success', async () => {
      // Setup
      reportService.getDashboardMetrics.mockResolvedValue(mockMetrics);

      // Execute
      await getDashboardMetrics(req, res);

      // Verify
      expect(reportService.getDashboardMetrics).toHaveBeenCalledWith('rest_1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMetrics
      });
    });

    test('should handle service errors', async () => {
      // Setup
      const error = new Error('Service error');
      reportService.getDashboardMetrics.mockRejectedValue(error);

      // Execute
      await getDashboardMetrics(req, res);

      // Verify
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'An error occurred while fetching dashboard metrics'
      });
    });

    test('should return 403 if user is not manager or owner', async () => {
      // Setup
      req.user.role = 'wait_staff';

      // Execute
      await getDashboardMetrics(req, res);

      // Verify
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Only managers and owners can access dashboard metrics'
      });
      expect(reportService.getDashboardMetrics).not.toHaveBeenCalled();
    });
  });
});
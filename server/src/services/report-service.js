const prisma = require('../db/client');
const { createLogger } = require('../utils/logger');
const PDFDocument = require('pdfkit');
const sanitizeHtml = require('sanitize-html');

const logger = createLogger('report-service');

/**
 * Get orders report for a restaurant within a date range
 * @param {string} restaurantId 
 * @param {Object} options 
 * @param {string} [options.startDate] - ISO date string
 * @param {string} [options.endDate] - ISO date string
 * @param {string} [options.status] - Filter by order status
 * @param {string} [options.orderType] - Filter by order type
 * @returns {Promise<Object>} Report data
 */
async function getOrdersReport(restaurantId, options = {}) {
  try {
    // Parse date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate = options.startDate 
      ? new Date(options.startDate) 
      : new Date(today);
    startDate.setDate(today.getDate() - 30); // Default to last 30 days
    
    let endDate = options.endDate 
      ? new Date(options.endDate) 
      : new Date(today);
    endDate.setHours(23, 59, 59, 999);

    // Build filter
    const filter = {
      restaurantId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    // Add optional filters
    if (options.status) {
      filter.status = sanitizeHtml(options.status);
    }
    
    if (options.orderType) {
      filter.orderType = sanitizeHtml(options.orderType);
    }

    // Get orders
    const orders = await prisma.order.findMany({
      where: filter,
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Count orders
    const totalOrders = await prisma.order.count({ where: filter });

    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

    // Group orders by status
    const ordersByStatus = {};
    orders.forEach(order => {
      if (!ordersByStatus[order.status]) {
        ordersByStatus[order.status] = 0;
      }
      ordersByStatus[order.status]++;
    });

    // Group orders by type
    const ordersByType = {};
    orders.forEach(order => {
      if (!ordersByType[order.orderType]) {
        ordersByType[order.orderType] = 0;
      }
      ordersByType[order.orderType]++;
    });

    return {
      orders,
      totalOrders,
      totalRevenue,
      ordersByStatus,
      ordersByType,
      dateRange: {
        startDate,
        endDate
      }
    };
  } catch (error) {
    logger.error('Error getting orders report', { error: error.message });
    throw error;
  }
}

/**
 * Get real-time dashboard metrics for a restaurant
 * @param {string} restaurantId 
 * @returns {Promise<Object>} Dashboard metrics
 */
async function getDashboardMetrics(restaurantId) {
  try {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get yesterday's date
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get daily metrics
    const dailyMetrics = await prisma.dailyMetric.findMany({
      where: {
        restaurantId,
        date: {
          gte: yesterday,
          lte: today
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Get today's metrics
    const todayMetrics = dailyMetrics.find(m => 
      m.date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
    ) || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      averagePrepTime: 0
    };

    // Get yesterday's metrics
    const yesterdayMetrics = dailyMetrics.find(m => 
      m.date.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]
    );

    // Calculate percent change in revenue
    let percentChange = 0;
    if (yesterdayMetrics && yesterdayMetrics.totalRevenue > 0) {
      percentChange = (
        (Number(todayMetrics.totalRevenue) - Number(yesterdayMetrics.totalRevenue)) / 
        Number(yesterdayMetrics.totalRevenue)
      ) * 100;
    }

    // Get hourly metrics for today
    const hourlyMetrics = await prisma.hourlyMetric.findMany({
      where: {
        restaurantId,
        date: today
      },
      orderBy: {
        hour: 'asc'
      }
    });

    // Get top menu items from today
    const itemMetrics = await prisma.itemMetric.findMany({
      where: {
        restaurantId,
        date: today
      },
      orderBy: {
        quantity: 'desc'
      },
      take: 10
    });

    // Get menu item details
    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId,
        id: {
          in: itemMetrics.map(item => item.menuItemId)
        }
      }
    });

    // Map menu items to metrics
    const itemPerformance = itemMetrics.map(metric => {
      const menuItem = menuItems.find(item => item.id === metric.menuItemId);
      return {
        itemName: menuItem ? menuItem.name : 'Unknown Item',
        quantity: metric.quantity,
        revenue: Number(metric.revenue),
        averagePrepTime: metric.averagePrepTime ? Number(metric.averagePrepTime) : 0
      };
    });

    // Calculate peak hours (hours with highest order counts)
    const peakHours = hourlyMetrics
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 2)
      .map(m => `${m.hour.toString().padStart(2, '0')}:00`);

    // Calculate kitchen load (as percentage of max capacity)
    // For simplicity, assuming max capacity is 20 orders per hour
    const currentHour = new Date().getHours();
    const currentHourMetric = hourlyMetrics.find(m => m.hour === currentHour);
    const kitchenLoad = currentHourMetric 
      ? Math.min(100, (currentHourMetric.orderCount / 20) * 100) 
      : 0;

    // Count pending orders
    const pendingOrders = await prisma.order.count({
      where: {
        restaurantId,
        status: 'pending',
        createdAt: {
          gte: today
        }
      }
    });

    // Calculate staff productivity (orders per hour)
    // Simplistic calculation: total orders / hours of operation
    // Assuming 8 hours of operation
    const staffProductivity = todayMetrics.totalOrders / 8;

    return {
      dailyRevenue: {
        today: Number(todayMetrics.totalRevenue),
        previous: yesterdayMetrics ? Number(yesterdayMetrics.totalRevenue) : 0,
        percentChange: Math.round(percentChange * 10) / 10
      },
      orderMetrics: {
        totalToday: todayMetrics.totalOrders,
        averageValue: Number(todayMetrics.averageOrderValue),
        averagePrepTime: Number(todayMetrics.averagePrepTime) || 0
      },
      hourlyData: hourlyMetrics.map(metric => ({
        hour: `${metric.hour.toString().padStart(2, '0')}:00`,
        revenue: Number(metric.revenue),
        orderCount: metric.orderCount
      })),
      itemPerformance,
      operationalStatus: {
        kitchenLoad: Math.round(kitchenLoad),
        pendingOrders,
        staffProductivity: Math.round(staffProductivity * 10) / 10,
        peakHours
      }
    };
  } catch (error) {
    logger.error('Error getting dashboard metrics', { error: error.message });
    return {
      dailyRevenue: { today: 0, previous: 0, percentChange: 0 },
      orderMetrics: { totalToday: 0, averageValue: 0, averagePrepTime: 0 },
      hourlyData: [],
      itemPerformance: [],
      operationalStatus: { kitchenLoad: 0, pendingOrders: 0, staffProductivity: 0, peakHours: [] }
    };
  }
}

/**
 * Update metrics when an order is created or updated
 * @param {Object} order - The order object
 * @returns {Promise<void>}
 */
async function updateMetricsForOrder(order) {
  try {
    const orderDate = new Date(order.createdAt);
    const dateKey = orderDate.toISOString().split('T')[0];
    const hour = orderDate.getHours();

    // Look for existing daily metric
    const existingDailyMetric = await prisma.dailyMetric.findUnique({
      where: {
        restaurantId_date: {
          restaurantId: order.restaurantId,
          date: new Date(dateKey)
        }
      }
    });

    if (existingDailyMetric) {
      // Update existing daily metric
      await prisma.dailyMetric.update({
        where: { id: existingDailyMetric.id },
        data: {
          totalOrders: existingDailyMetric.totalOrders + 1,
          totalRevenue: {
            increment: order.total
          },
          averageOrderValue: (Number(existingDailyMetric.totalRevenue) + order.total) / (existingDailyMetric.totalOrders + 1)
        }
      });
    } else {
      // Create new daily metric
      await prisma.dailyMetric.create({
        data: {
          restaurantId: order.restaurantId,
          date: new Date(dateKey),
          totalOrders: 1,
          totalRevenue: order.total,
          averageOrderValue: order.total
        }
      });
    }

    // Look for existing hourly metric
    const existingHourlyMetric = await prisma.hourlyMetric.findUnique({
      where: {
        restaurantId_date_hour: {
          restaurantId: order.restaurantId,
          date: new Date(dateKey),
          hour
        }
      }
    });

    if (existingHourlyMetric) {
      // Update existing hourly metric
      await prisma.hourlyMetric.update({
        where: { id: existingHourlyMetric.id },
        data: {
          orderCount: existingHourlyMetric.orderCount + 1,
          revenue: {
            increment: order.total
          }
        }
      });
    } else {
      // Create new hourly metric
      await prisma.hourlyMetric.create({
        data: {
          restaurantId: order.restaurantId,
          date: new Date(dateKey),
          hour,
          orderCount: 1,
          revenue: order.total
        }
      });
    }

    // Update item metrics
    for (const item of order.items) {
      if (!item.menuItemId) continue;

      const itemTotal = item.price * item.quantity;
      
      // Upsert item metric
      await prisma.itemMetric.upsert({
        where: {
          restaurantId_menuItemId_date: {
            restaurantId: order.restaurantId,
            menuItemId: item.menuItemId,
            date: new Date(dateKey)
          }
        },
        update: {
          quantity: { increment: item.quantity },
          revenue: { increment: itemTotal }
        },
        create: {
          restaurantId: order.restaurantId,
          menuItemId: item.menuItemId,
          date: new Date(dateKey),
          quantity: item.quantity,
          revenue: itemTotal
        }
      });
    }
  } catch (error) {
    logger.error('Error updating metrics for order', { 
      error: error.message, 
      orderId: order.id 
    });
  }
}

/**
 * Generate report data for download
 * @param {string} restaurantId 
 * @param {Object} options 
 * @param {string} options.format - 'csv' or 'pdf'
 * @param {string} [options.startDate] - ISO date string
 * @param {string} [options.endDate] - ISO date string
 * @returns {Promise<Object>} Report data
 */
async function generateOrdersReportData(restaurantId, options = {}) {
  try {
    const { format = 'csv', startDate, endDate } = options;

    // Get report data
    const report = await getOrdersReport(restaurantId, { startDate, endDate });

    // Format date for filename
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `orders_report_${restaurantId}_${dateStr}`;

    if (format === 'csv') {
      // Generate CSV data
      const rows = [
        ['Order Number', 'Customer Name', 'Order Type', 'Status', 'Total', 'Created At']
      ];

      report.orders.forEach(order => {
        rows.push([
          order.orderNumber || order.id,
          order.customerName,
          order.orderType,
          order.status,
          order.total.toFixed(2),
          new Date(order.createdAt).toISOString()
        ]);
      });

      // Convert to CSV string
      const csvData = rows.map(row => row.join(',')).join('\n');

      return {
        format: 'csv',
        data: csvData,
        filename: `${filename}.csv`
      };
    } else if (format === 'pdf') {
      // Generate PDF document
      const doc = new PDFDocument();
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));

      // Add header
      doc.fontSize(18).text('Orders Report', { align: 'center' });
      doc.moveDown();
      
      // Add date range
      doc.fontSize(12).text(
        `Date Range: ${report.dateRange.startDate.toLocaleDateString()} - ${report.dateRange.endDate.toLocaleDateString()}`,
        { align: 'left' }
      );
      doc.moveDown();

      // Add summary
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(12).text(`Total Orders: ${report.totalOrders}`);
      doc.fontSize(12).text(`Total Revenue: $${report.totalRevenue.toFixed(2)}`);
      doc.moveDown();

      // Add orders table
      doc.fontSize(14).text('Orders', { underline: true });
      doc.moveDown();

      // Table headers
      const tableTop = doc.y;
      const colWidths = [80, 100, 80, 80, 80, 100];
      
      let currentY = tableTop;
      doc.fontSize(10);
      
      // Draw headers
      doc.text('Order #', doc.x, currentY);
      doc.text('Customer', doc.x + colWidths[0], currentY);
      doc.text('Type', doc.x + colWidths[0] + colWidths[1], currentY);
      doc.text('Status', doc.x + colWidths[0] + colWidths[1] + colWidths[2], currentY);
      doc.text('Total', doc.x + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentY);
      doc.text('Created At', doc.x + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], currentY);
      
      currentY += 20;
      
      // Draw rows
      report.orders.slice(0, 50).forEach(order => { // Limit to 50 orders for PDF
        doc.text(order.orderNumber || order.id.substring(0, 8), doc.x, currentY);
        doc.text(order.customerName, doc.x + colWidths[0], currentY);
        doc.text(order.orderType, doc.x + colWidths[0] + colWidths[1], currentY);
        doc.text(order.status, doc.x + colWidths[0] + colWidths[1] + colWidths[2], currentY);
        doc.text(`$${order.total.toFixed(2)}`, doc.x + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentY);
        doc.text(new Date(order.createdAt).toLocaleDateString(), doc.x + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], currentY);
        
        currentY += 20;
        if (currentY > doc.page.height - 50) {
          doc.addPage();
          currentY = 50;
        }
      });

      // Finalize PDF
      doc.end();

      return new Promise((resolve) => {
        doc.on('end', () => {
          resolve({
            format: 'pdf',
            data: Buffer.concat(chunks),
            filename: `${filename}.pdf`
          });
        });
      });
    } else {
      throw new Error('Invalid report format');
    }
  } catch (error) {
    logger.error('Error generating report data', { error: error.message });
    throw error;
  }
}

module.exports = {
  getOrdersReport,
  getDashboardMetrics,
  updateMetricsForOrder,
  generateOrdersReportData
};
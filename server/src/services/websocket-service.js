const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../utils/logger');
const prisma = require('../db/client');
const config = require('../config');

const logger = createLogger('websocket-service');

// Map to store active connections by user
const connections = new Map();

// Map to store active connections by restaurant
const restaurantConnections = new Map();

/**
 * Initialize WebSocket server
 * @param {Object} server - HTTP server instance
 * @returns {WebSocket.Server} WebSocket server instance
 */
function initializeWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws/dashboard'
  });

  wss.on('connection', handleConnection);

  logger.info('WebSocket server initialized');
  return wss;
}

/**
 * Handle new WebSocket connection
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} req - HTTP request
 */
async function handleConnection(ws, req) {
  try {
    // Extract token from URL query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Authentication token is required');
      return;
    }

    // Verify JWT token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      logger.error('Invalid token', { error: err.message });
      ws.close(4002, 'Invalid authentication token');
      return;
    }

    // Check if user exists and has proper role
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId }
    });

    if (!user) {
      ws.close(4003, 'User not found');
      return;
    }

    if (user.role !== 'manager' && user.role !== 'owner') {
      ws.close(4004, 'Insufficient permissions');
      return;
    }

    // Generate unique connection ID
    const connectionId = uuidv4();

    // Store client information
    const clientInfo = {
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      userId: user.id,
      restaurantId: user.restaurantId,
      connectionId
    };

    // Store connection in database
    await prisma.webSocketConnection.create({
      data: {
        id: connectionId,
        userId: user.id,
        connectionId,
        clientInfo: clientInfo
      }
    });

    // Store active connection in memory
    if (!connections.has(user.id)) {
      connections.set(user.id, new Map());
    }
    connections.get(user.id).set(connectionId, ws);

    // Store connection by restaurant
    if (!restaurantConnections.has(user.restaurantId)) {
      restaurantConnections.set(user.restaurantId, new Map());
    }
    restaurantConnections.get(user.restaurantId).set(connectionId, ws);

    // Set connection properties
    ws.connectionId = connectionId;
    ws.userId = user.id;
    ws.restaurantId = user.restaurantId;

    logger.info('WebSocket connection established', { 
      userId: user.id,
      restaurantId: user.restaurantId,
      connectionId
    });

    // Send welcome message
    sendToConnection(ws, {
      type: 'connection_established',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Connected to dashboard updates'
      }
    });

    // Handle client messages
    ws.on('message', (message) => handleMessage(ws, message));

    // Handle connection close
    ws.on('close', () => handleClose(ws));

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket error', {
        connectionId,
        error: error.message
      });
    });

    // Send initial dashboard data
    sendInitialData(ws);

  } catch (error) {
    logger.error('Error handling WebSocket connection', { error: error.message });
    ws.close(4000, 'Internal server error');
  }
}

/**
 * Handle incoming WebSocket messages
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} message - Message data
 */
function handleMessage(ws, message) {
  try {
    const data = JSON.parse(message);

    // Update activity timestamp
    updateLastActivity(ws.connectionId);

    logger.debug('Received message', {
      connectionId: ws.connectionId,
      userId: ws.userId,
      type: data.type
    });

    // You can handle specific message types here if needed

  } catch (error) {
    logger.error('Error handling WebSocket message', {
      connectionId: ws.connectionId,
      error: error.message
    });
  }
}

/**
 * Handle WebSocket connection close
 * @param {WebSocket} ws - WebSocket connection
 */
async function handleClose(ws) {
  try {
    logger.info('WebSocket connection closed', {
      connectionId: ws.connectionId,
      userId: ws.userId
    });

    // Remove connection from memory
    if (connections.has(ws.userId)) {
      connections.get(ws.userId).delete(ws.connectionId);
      if (connections.get(ws.userId).size === 0) {
        connections.delete(ws.userId);
      }
    }

    // Remove from restaurant connections
    if (restaurantConnections.has(ws.restaurantId)) {
      restaurantConnections.get(ws.restaurantId).delete(ws.connectionId);
      if (restaurantConnections.get(ws.restaurantId).size === 0) {
        restaurantConnections.delete(ws.restaurantId);
      }
    }

    // Update connection status in database
    await prisma.webSocketConnection.delete({
      where: { connectionId: ws.connectionId }
    });

  } catch (error) {
    logger.error('Error handling WebSocket close', {
      connectionId: ws.connectionId,
      error: error.message
    });
  }
}

/**
 * Update last activity timestamp for connection
 * @param {string} connectionId - Connection ID
 */
async function updateLastActivity(connectionId) {
  try {
    await prisma.webSocketConnection.update({
      where: { connectionId },
      data: { lastActivityAt: new Date() }
    });
  } catch (error) {
    logger.error('Error updating last activity', {
      connectionId,
      error: error.message
    });
  }
}

/**
 * Send initial dashboard data to new connection
 * @param {WebSocket} ws - WebSocket connection
 */
async function sendInitialData(ws) {
  try {
    // Fetch current dashboard data
    const { 
      getDashboardMetrics 
    } = require('./report-service');
    
    const dashboardData = await getDashboardMetrics(ws.restaurantId);

    // Send to client
    sendToConnection(ws, {
      type: 'dashboard_data',
      timestamp: new Date().toISOString(),
      data: dashboardData
    });

  } catch (error) {
    logger.error('Error sending initial data', {
      connectionId: ws.connectionId,
      error: error.message
    });
  }
}

/**
 * Send message to a specific connection
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} message - Message object
 */
function sendToConnection(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Send message to all connections for a user
 * @param {string} userId - User ID
 * @param {Object} message - Message object
 */
function sendToUser(userId, message) {
  if (connections.has(userId)) {
    const userConnections = connections.get(userId);
    for (const [_, ws] of userConnections) {
      sendToConnection(ws, message);
    }
  }
}

/**
 * Send message to all connections for a restaurant
 * @param {string} restaurantId - Restaurant ID
 * @param {Object} message - Message object
 */
function sendToRestaurant(restaurantId, message) {
  if (restaurantConnections.has(restaurantId)) {
    const restConnections = restaurantConnections.get(restaurantId);
    for (const [_, ws] of restConnections) {
      sendToConnection(ws, message);
    }
  }
}

/**
 * Broadcast order status change to restaurant dashboard
 * @param {Object} order - Order object
 */
function broadcastOrderStatusChange(order) {
  sendToRestaurant(order.restaurantId, {
    type: 'order_status_change',
    timestamp: new Date().toISOString(),
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      customerName: order.customerName,
      total: order.total
    }
  });
}

/**
 * Broadcast new order to restaurant dashboard
 * @param {Object} order - Order object
 */
function broadcastNewOrder(order) {
  sendToRestaurant(order.restaurantId, {
    type: 'new_order',
    timestamp: new Date().toISOString(),
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      customerName: order.customerName,
      total: order.total,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
    }
  });
}

/**
 * Broadcast revenue update to restaurant dashboard
 * @param {string} restaurantId - Restaurant ID
 * @param {Object} metrics - Updated metrics
 */
function broadcastRevenueUpdate(restaurantId, metrics) {
  sendToRestaurant(restaurantId, {
    type: 'revenue_update',
    timestamp: new Date().toISOString(),
    data: metrics
  });
}

module.exports = {
  initializeWebSocketServer,
  broadcastOrderStatusChange,
  broadcastNewOrder,
  broadcastRevenueUpdate
};
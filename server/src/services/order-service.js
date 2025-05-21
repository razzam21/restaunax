const prisma = require('../db/client');
const { v4: uuidv4 } = require('uuid');
const { 
  broadcastNewOrder, 
  broadcastOrderStatusChange 
} = require('./websocket-service');
const { updateMetricsForOrder } = require('./report-service');

// Get all orders with optional status filter
const getOrders = async (status) => {
  const filters = {};
  
  if (status) {
    filters.status = status;
  }

  return prisma.order.findMany({
    where: filters,
    include: {
      items: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

// Get a single order by ID
const getOrderById = async (id) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true
    }
  });

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  return order;
};

// Generate a restaurant-specific order number with format: REST-DATE-SEQUENCE (e.g., R1-20250520-001)
const generateOrderNumber = async (restaurantId) => {
  if (!restaurantId) {
    throw new Error('Restaurant ID is required for order number generation');
  }
  
  // Extract restaurant short code (e.g., "rest_1" -> "R1")
  const restCode = restaurantId.replace('rest_', 'R');
  
  // Get today's date in YYYYMMDD format
  const today = new Date();
  const dateStr = today.getFullYear() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');
  
  // Count how many orders were created today for this specific restaurant
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));
  
  try {
    const ordersToday = await prisma.order.count({
      where: {
        restaurantId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });
    
    // Format: RESTAURANT-DATE-SEQUENCE (zero-padded to 3 digits)
    const sequenceNumber = String(ordersToday + 1).padStart(3, '0');
    const orderNumber = `${restCode}-${dateStr}-${sequenceNumber}`;
    
    console.log('Generated order number:', orderNumber);
    return orderNumber;
  } catch (error) {
    console.error('Error generating order number:', error);
    // Fallback to a timestamp-based number if count fails
    return `${restCode}-${dateStr}-ERR${Date.now().toString().slice(-3)}`;
  }
};

// Create a new order
const createOrder = async (orderData) => {
  console.log('Creating order with data:', JSON.stringify(orderData, null, 2));
  
  // Generate restaurant-specific order number
  const orderNumber = await generateOrderNumber(orderData.restaurantId);
  
  // Process item data for creation
  const items = orderData.items.map(item => {
    // Extract and prepare the item data
    const itemData = {
      id: item.id || uuidv4(),
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    };
    
    // Only include menuItemId if it's not null
    if (item.menuItemId) {
      itemData.menuItemId = item.menuItemId;
    }
    
    return itemData;
  });

  console.log('Processed items for creation:', JSON.stringify(items, null, 2));

  // Create order with items
  try {
    const newOrder = await prisma.order.create({
      data: {
        id: uuidv4(),
        orderNumber,
        restaurantId: orderData.restaurantId,
        customerName: orderData.customerName,
        orderType: orderData.orderType,
        status: 'pending',
        total: orderData.total,
        userId: orderData.userId,
        items: {
          create: items
        }
      },
      include: {
        items: true
      }
    });

    // Update metrics for the new order
    await updateMetricsForOrder(newOrder);

    // Broadcast the new order to dashboard
    broadcastNewOrder(newOrder);

    return newOrder;
  } catch (error) {
    console.error('Error creating order in Prisma:', error);
    throw error;
  }
};

// Update order status
const updateOrderStatus = async (id, status) => {
  // Get current order to check if status transition is valid
  const currentOrder = await prisma.order.findUnique({
    where: { id }
  });

  if (!currentOrder) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  // Valid status transitions
  const validTransitions = {
    pending: ['preparing'],
    preparing: ['ready'],
    ready: ['delivered'],
    delivered: []
  };

  // Check if status transition is valid
  if (!validTransitions[currentOrder.status].includes(status)) {
    const error = new Error(`Invalid status transition from ${currentOrder.status} to ${status}`);
    error.statusCode = 400;
    throw error;
  }

  // Update order status
  const updatedOrder = await prisma.order.update({
    where: { id },
    data: { status },
    include: {
      items: true
    }
  });

  // Broadcast status change to dashboard
  broadcastOrderStatusChange(updatedOrder);

  return updatedOrder;
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  generateOrderNumber // Export for testing
};
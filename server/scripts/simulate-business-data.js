#!/usr/bin/env node

/**
 * Business Data Simulation Script
 * 
 * Simulates 2 months of realistic restaurant data:
 * - Restaurant 1 (rest_1): Busy, successful restaurant
 * - Restaurant 2 (rest_2): Slow, struggling restaurant
 * 
 * This creates realistic patterns for AI analysis and recommendations.
 */

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Configuration
const SIMULATION_DAYS = process.argv[2] ? parseInt(process.argv[2]) : 60; // Default 2 months, but accept command line argument
const END_DATE = new Date();
const START_DATE = new Date(END_DATE.getTime() - (SIMULATION_DAYS * 24 * 60 * 60 * 1000));

console.log(`Simulating ${SIMULATION_DAYS} days of business data from ${START_DATE.toDateString()} to ${END_DATE.toDateString()}`);

// Restaurant profiles
const RESTAURANT_PROFILES = {
  'rest_1': {
    name: 'Restaunax Demo Restaurant',
    profile: 'busy',
    dailyOrderRange: [45, 85],
    avgOrderValue: [22, 45],
    peakHours: [11, 12, 13, 18, 19, 20], // Lunch and dinner rush
    weekendMultiplier: 1.4,
    growthTrend: 0.02, // 2% monthly growth
    popularItems: [
      { name: 'Margherita Pizza', price: 16.99, popularity: 0.25 },
      { name: 'Pepperoni Pizza', price: 18.99, popularity: 0.22 },
      { name: 'Caesar Salad', price: 12.99, popularity: 0.15 },
      { name: 'Spaghetti Carbonara', price: 19.99, popularity: 0.18 },
      { name: 'Garlic Bread', price: 6.99, popularity: 0.12 },
      { name: 'Tiramisu', price: 8.99, popularity: 0.08 }
    ]
  },
  'rest_2': {
    name: 'Ocean Breeze Restaurant',
    profile: 'slow',
    dailyOrderRange: [8, 25],
    avgOrderValue: [15, 28],
    peakHours: [12, 19], // Limited peak hours
    weekendMultiplier: 1.1,
    growthTrend: -0.01, // 1% monthly decline
    popularItems: [
      { name: 'Fish & Chips', price: 14.99, popularity: 0.30 },
      { name: 'Seafood Pasta', price: 22.99, popularity: 0.20 },
      { name: 'Clam Chowder', price: 8.99, popularity: 0.25 },
      { name: 'Grilled Salmon', price: 24.99, popularity: 0.15 },
      { name: 'Lobster Roll', price: 28.99, popularity: 0.10 }
    ]
  }
};

// Customer names for variety
const CUSTOMER_NAMES = [
  'John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'David Wilson',
  'Lisa Anderson', 'Robert Taylor', 'Jennifer Martinez', 'William Garcia', 'Ashley Rodriguez',
  'Christopher Lee', 'Amanda White', 'Matthew Thompson', 'Jessica Clark', 'Daniel Lewis',
  'Nicole Walker', 'Ryan Hall', 'Stephanie Young', 'Kevin King', 'Michelle Wright'
];

/**
 * Generate a random number within a range
 */
function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random float within a range
 */
function randomFloatInRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Get random customer name
 */
function getRandomCustomerName() {
  return CUSTOMER_NAMES[randomInRange(0, CUSTOMER_NAMES.length - 1)];
}

/**
 * Calculate if it's a weekend
 */
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Calculate business modifier based on day and trends
 */
function getBusinessModifier(restaurantId, date, dayIndex) {
  const profile = RESTAURANT_PROFILES[restaurantId];
  let modifier = 1;
  
  // Weekend effect
  if (isWeekend(date)) {
    modifier *= profile.weekendMultiplier;
  }
  
  // Growth/decline trend over time
  const monthProgress = dayIndex / 30; // Approximate months
  modifier *= (1 + profile.growthTrend * monthProgress);
  
  // Random daily variation (±20%)
  modifier *= randomFloatInRange(0.8, 1.2);
  
  return modifier;
}

/**
 * Generate orders for a specific hour
 */
function generateHourlyOrders(restaurantId, date, hour) {
  const profile = RESTAURANT_PROFILES[restaurantId];
  
  // Check if this is a peak hour
  const isPeakHour = profile.peakHours.includes(hour);
  
  // Base hourly order count
  let baseOrders;
  if (isPeakHour) {
    baseOrders = randomInRange(3, 8);
  } else if (hour >= 6 && hour <= 22) { // Operating hours
    baseOrders = randomInRange(0, 3);
  } else {
    return 0; // Closed
  }
  
  // Apply business modifier
  const dayIndex = Math.floor((date - START_DATE) / (24 * 60 * 60 * 1000));
  const modifier = getBusinessModifier(restaurantId, date, dayIndex);
  
  return Math.max(0, Math.round(baseOrders * modifier));
}

/**
 * Generate order items based on restaurant profile and actual menu items
 */
async function generateOrderItems(restaurantId, menuItemsCache) {
  // Use cached menu items if provided, otherwise fetch from database
  let menuItems = menuItemsCache;
  if (!menuItems) {
    menuItems = await prisma.menuItem.findMany({
      where: { restaurantId, isActive: true }
    });
  }
  
  if (menuItems.length === 0) {
    throw new Error(`No menu items found for restaurant ${restaurantId}`);
  }
  
  const numItems = randomInRange(1, 4);
  const items = [];
  let total = 0;
  
  for (let i = 0; i < numItems; i++) {
    // Select random menu item (weighted towards first items for consistency with popular items pattern)
    const itemIndex = Math.floor(Math.random() * Math.min(menuItems.length, 6)); // Favor first 6 items
    const selectedMenuItem = menuItems[itemIndex];
    
    const quantity = randomInRange(1, 2);
    const itemTotal = selectedMenuItem.price * quantity;
    
    items.push({
      id: uuidv4(),
      name: selectedMenuItem.name,
      quantity,
      price: selectedMenuItem.price,
      menuItemId: selectedMenuItem.id // Link to actual menu item
    });
    
    total += itemTotal;
  }
  
  return { items, total };
}

/**
 * Generate orders for a specific day
 */
async function generateDayOrders(restaurantId, date) {
  console.log(`Generating orders for ${RESTAURANT_PROFILES[restaurantId].name} on ${date.toDateString()}`);
  
  // Cache menu items for this restaurant to avoid repeated database queries
  const menuItems = await prisma.menuItem.findMany({
    where: { restaurantId, isActive: true }
  });
  
  if (menuItems.length === 0) {
    console.warn(`No menu items found for restaurant ${restaurantId}, skipping order generation`);
    return { orders: [], hourlyMetrics: {}, dailyMetrics: {} };
  }
  
  const dayOrders = [];
  const hourlyMetrics = {};
  
  // Initialize hourly metrics
  for (let hour = 0; hour < 24; hour++) {
    hourlyMetrics[hour] = {
      orderCount: 0,
      revenue: 0
    };
  }
  
  // Generate orders for each hour
  for (let hour = 0; hour < 24; hour++) {
    const orderCount = generateHourlyOrders(restaurantId, date, hour);
    
    for (let orderIndex = 0; orderIndex < orderCount; orderIndex++) {
      const orderTime = new Date(date);
      orderTime.setHours(hour, randomInRange(0, 59), randomInRange(0, 59));
      
      const { items, total } = await generateOrderItems(restaurantId, menuItems);
      
      const order = {
        id: uuidv4(),
        restaurantId,
        customerName: getRandomCustomerName(),
        orderType: Math.random() > 0.3 ? 'delivery' : 'pickup',
        status: 'delivered', // All historical orders are delivered
        total,
        createdAt: orderTime,
        updatedAt: orderTime,
        orderNumber: `ORD-${orderTime.getTime()}`,
        items
      };
      
      dayOrders.push(order);
      
      // Update hourly metrics
      hourlyMetrics[hour].orderCount++;
      hourlyMetrics[hour].revenue += total;
    }
  }
  
  return { orders: dayOrders, hourlyMetrics };
}

/**
 * Calculate daily metrics from orders
 */
function calculateDailyMetrics(orders) {
  if (orders.length === 0) {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      averagePrepTime: 0
    };
  }
  
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = totalRevenue / orders.length;
  const averagePrepTime = randomFloatInRange(8, 15); // Simulated prep time in minutes
  
  return {
    totalOrders: orders.length,
    totalRevenue,
    averageOrderValue,
    averagePrepTime
  };
}

/**
 * Create menu items for restaurants
 */
async function createMenuItems() {
  console.log('🍕 Creating menu items...');
  
  for (const restaurantId of Object.keys(RESTAURANT_PROFILES)) {
    const profile = RESTAURANT_PROFILES[restaurantId];
    
    for (const item of profile.popularItems) {
      // Check if menu item already exists
      const existingItem = await prisma.menuItem.findFirst({
        where: {
          restaurantId,
          name: item.name
        }
      });
      
      if (!existingItem) {
        const menuItem = await prisma.menuItem.create({
          data: {
            restaurantId,
            name: item.name,
            description: `Delicious ${item.name.toLowerCase()}`,
            price: item.price,
            category: 'Main Course',
            isActive: true,
            preparationTime: randomInRange(5, 15)
          }
        });
        
        // Store the ID for later use
        item.menuItemId = menuItem.id;
      } else {
        item.menuItemId = existingItem.id;
      }
    }
  }
  
  console.log('✅ Menu items created');
}

/**
 * Main simulation function
 */
async function runSimulation() {
  console.log('🚀 Starting business data simulation...');
  console.log(`📅 Simulating ${SIMULATION_DAYS} days of data`);
  console.log(`📊 Date range: ${START_DATE.toDateString()} to ${END_DATE.toDateString()}`);
  
  try {
    // Create menu items first
    await createMenuItems();
    
    // Clear existing data for the simulation period
    console.log('🧹 Cleaning existing data...');
    await prisma.itemMetric.deleteMany({
      where: {
        date: {
          gte: START_DATE,
          lte: END_DATE
        }
      }
    });
    
    await prisma.hourlyMetric.deleteMany({
      where: {
        date: {
          gte: START_DATE,
          lte: END_DATE
        }
      }
    });
    
    await prisma.dailyMetric.deleteMany({
      where: {
        date: {
          gte: START_DATE,
          lte: END_DATE
        }
      }
    });
    
    // Delete order items first (due to foreign key constraints)
    const ordersToDelete = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: START_DATE,
          lte: END_DATE
        }
      },
      select: { id: true }
    });
    
    if (ordersToDelete.length > 0) {
      await prisma.orderItem.deleteMany({
        where: {
          orderId: {
            in: ordersToDelete.map(o => o.id)
          }
        }
      });
      
      await prisma.order.deleteMany({
        where: {
          createdAt: {
            gte: START_DATE,
            lte: END_DATE
          }
        }
      });
    }
    
    console.log('✅ Existing data cleaned');
    
    // Generate data for each restaurant
    for (const restaurantId of Object.keys(RESTAURANT_PROFILES)) {
      console.log(`\n🏪 Processing ${RESTAURANT_PROFILES[restaurantId].name}...`);
      
      // Generate data for each day
      for (let dayOffset = 0; dayOffset < SIMULATION_DAYS; dayOffset++) {
        const currentDate = new Date(START_DATE);
        currentDate.setDate(currentDate.getDate() + dayOffset);
        
        // Generate orders and metrics for the day
        const { orders, hourlyMetrics } = await generateDayOrders(restaurantId, currentDate);
        
        // Insert orders
        for (const order of orders) {
          await prisma.order.create({
            data: {
              id: order.id,
              restaurantId: order.restaurantId,
              customerName: order.customerName,
              orderType: order.orderType,
              status: order.status,
              total: order.total,
              createdAt: order.createdAt,
              updatedAt: order.updatedAt,
              orderNumber: order.orderNumber,
              items: {
                create: order.items.map(item => ({
                  id: item.id,
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
                  menuItemId: item.menuItemId, // Link to menu item for analysis
                  createdAt: order.createdAt,
                  updatedAt: order.updatedAt
                }))
              }
            }
          });
        }
        
        // Calculate and insert daily metrics
        const dailyMetrics = calculateDailyMetrics(orders);
        await prisma.dailyMetric.create({
          data: {
            restaurantId,
            date: currentDate,
            totalOrders: dailyMetrics.totalOrders,
            totalRevenue: dailyMetrics.totalRevenue,
            averageOrderValue: dailyMetrics.averageOrderValue,
            averagePrepTime: dailyMetrics.averagePrepTime
          }
        });
        
        // Insert hourly metrics
        for (let hour = 0; hour < 24; hour++) {
          if (hourlyMetrics[hour].orderCount > 0) {
            await prisma.hourlyMetric.create({
              data: {
                restaurantId,
                date: currentDate,
                hour,
                orderCount: hourlyMetrics[hour].orderCount,
                revenue: hourlyMetrics[hour].revenue
              }
            });
          }
        }
        
        // Progress indicator
        if ((dayOffset + 1) % 10 === 0) {
          console.log(`   📊 Processed ${dayOffset + 1}/${SIMULATION_DAYS} days`);
        }
      }
      
      console.log(`✅ ${RESTAURANT_PROFILES[restaurantId].name} simulation complete`);
    }
    
    // Generate item metrics summary
    console.log('\n📈 Generating item performance metrics...');
    for (const restaurantId of Object.keys(RESTAURANT_PROFILES)) {
      const profile = RESTAURANT_PROFILES[restaurantId];
      
      for (const item of profile.popularItems) {
        // Get orders containing this item over the simulation period
        const orders = await prisma.order.findMany({
          where: {
            restaurantId,
            createdAt: {
              gte: START_DATE,
              lte: END_DATE
            },
            items: {
              some: {
                name: item.name
              }
            }
          },
          include: {
            items: {
              where: {
                name: item.name
              }
            }
          }
        });
        
        // Calculate metrics for each week
        for (let week = 0; week < Math.ceil(SIMULATION_DAYS / 7); week++) {
          const weekStart = new Date(START_DATE);
          weekStart.setDate(weekStart.getDate() + (week * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          
          const weekOrders = orders.filter(order => 
            order.createdAt >= weekStart && order.createdAt <= weekEnd
          );
          
          if (weekOrders.length > 0) {
            const totalQuantity = weekOrders.reduce((sum, order) => 
              sum + order.items.reduce((itemSum, orderItem) => itemSum + orderItem.quantity, 0), 0
            );
            const totalRevenue = weekOrders.reduce((sum, order) => 
              sum + order.items.reduce((itemSum, orderItem) => itemSum + (orderItem.quantity * orderItem.price), 0), 0
            );
            
            await prisma.itemMetric.create({
              data: {
                restaurantId,
                menuItemId: item.menuItemId, // Use the actual menu item ID
                date: weekStart,
                quantity: totalQuantity,
                revenue: totalRevenue,
                averagePrepTime: randomFloatInRange(5, 12)
              }
            });
          }
        }
      }
    }
    
    console.log('✅ Item metrics generated');
    console.log('\n🎉 Business data simulation completed successfully!');
    console.log('\n📊 Summary:');
    
    // Print summary statistics
    for (const restaurantId of Object.keys(RESTAURANT_PROFILES)) {
      const profile = RESTAURANT_PROFILES[restaurantId];
      const orderCount = await prisma.order.count({
        where: {
          restaurantId,
          createdAt: {
            gte: START_DATE,
            lte: END_DATE
          }
        }
      });
      
      const totalRevenue = await prisma.order.aggregate({
        where: {
          restaurantId,
          createdAt: {
            gte: START_DATE,
            lte: END_DATE
          }
        },
        _sum: {
          total: true
        }
      });
      
      console.log(`\n🏪 ${profile.name} (${profile.profile}):`);
      console.log(`   📦 Total Orders: ${orderCount}`);
      console.log(`   💰 Total Revenue: $${totalRevenue._sum.total?.toFixed(2) || '0.00'}`);
      console.log(`   📊 Avg Orders/Day: ${(orderCount / SIMULATION_DAYS).toFixed(1)}`);
      console.log(`   💵 Avg Order Value: $${orderCount > 0 ? (totalRevenue._sum.total / orderCount).toFixed(2) : '0.00'}`);
    }
    
  } catch (error) {
    console.error('❌ Simulation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the simulation
if (require.main === module) {
  runSimulation()
    .catch(console.error);
}

module.exports = { runSimulation };
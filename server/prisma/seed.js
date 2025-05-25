const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Password hash rounds
const SALT_ROUNDS = 12;

async function main() {
  // Create or retrieve restaurants with theme settings
  const restaurants = [
    {
      id: 'rest_1',
      name: 'Restaunax Demo Restaurant',
      themeId: 'rest_1', // Default theme
      primaryColor: '#2C4A7A',  // Slightly Dark Blue
      secondaryColor: '#D97A3A', // Slightly Dark Orange
    },
    {
      id: 'rest_2',
      name: 'Ocean Breeze Restaurant',
      themeId: 'rest_2',
      primaryColor: '#1A365D', // Deep Blue
      secondaryColor: '#9C4221', // Rustic Orange
    }
  ];
  
  // Create restaurants
  for (const restaurantData of restaurants) {
    // Check if restaurant already exists
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantData.id }
    });
    
    if (existingRestaurant) {
      // Update with theme data
      await prisma.restaurant.update({
        where: { id: restaurantData.id },
        data: {
          themeId: restaurantData.themeId,
          primaryColor: restaurantData.primaryColor,
          secondaryColor: restaurantData.secondaryColor,
        }
      });
      console.log(`Updated restaurant ${restaurantData.name} with theme data`);
    } else {
      // Create restaurant with theme data
      await prisma.restaurant.create({
        data: restaurantData
      });
      console.log(`Created restaurant: ${restaurantData.name}`);
    }
  }
  
  // Use the primary restaurant for the rest of the seed data
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: 'rest_1' }
  });

  // Create menu items
  const menuItems = [
    {
      id: 'menu_1',
      name: 'Margherita Pizza',
      description: 'Classic pizza with tomato sauce, mozzarella, and basil',
      price: 15.99,
      category: 'Pizza',
    },
    {
      id: 'menu_2',
      name: 'Pepperoni Pizza',
      description: 'Pizza topped with pepperoni slices',
      price: 18.99,
      category: 'Pizza',
    },
    {
      id: 'menu_3',
      name: 'Caesar Salad',
      description: 'Fresh romaine lettuce with Caesar dressing, croutons, and parmesan cheese',
      price: 8.99,
      category: 'Salad',
    },
    {
      id: 'menu_4',
      name: 'Greek Salad',
      description: 'Mixed greens with tomatoes, cucumbers, olives, and feta cheese',
      price: 10.99,
      category: 'Salad',
    },
    {
      id: 'menu_5',
      name: 'Spaghetti Carbonara',
      description: 'Classic Italian pasta with eggs, cheese, pancetta, and black pepper',
      price: 16.99,
      category: 'Pasta',
    },
    {
      id: 'menu_6',
      name: 'Garlic Bread',
      description: 'Toasted bread with garlic butter and herbs',
      price: 5.99,
      category: 'Side',
    },
    {
      id: 'menu_7',
      name: 'Tiramisu',
      description: 'Italian dessert with coffee-soaked ladyfingers and mascarpone cream',
      price: 6.99,
      category: 'Dessert',
    },
  ];

  for (const item of menuItems) {
    // Check if the menu item already exists
    const existingMenuItem = await prisma.menuItem.findUnique({
      where: { id: item.id }
    });
    
    if (existingMenuItem) {
      console.log(`Menu item ${item.name} already exists, skipping`);
    } else {
      await prisma.menuItem.create({
        data: {
          ...item,
          restaurantId: restaurant.id,
        },
      });
      console.log(`Created menu item: ${item.name}`);
    }
  }

  // Create orders
  const orderData = [
    {
      id: 'ord_123456',
      restaurantId: restaurant.id,
      customerName: 'Alex Johnson',
      orderType: 'delivery',
      status: 'pending',
      total: 42.50,
      items: {
        create: [
          {
            id: 'item_1',
            name: 'Margherita Pizza',
            quantity: 2,
            price: 15.99,
            menuItemId: 'menu_1',
          },
          {
            id: 'item_2',
            name: 'Caesar Salad',
            quantity: 1,
            price: 8.99,
            menuItemId: 'menu_3',
          },
        ],
      },
    },
    {
      id: 'ord_123457',
      restaurantId: restaurant.id,
      customerName: 'Maria Garcia',
      orderType: 'pickup',
      status: 'preparing',
      total: 34.99,
      items: {
        create: [
          {
            id: 'item_3',
            name: 'Spaghetti Carbonara',
            quantity: 1,
            price: 16.99,
            menuItemId: 'menu_5',
          },
          {
            id: 'item_4',
            name: 'Garlic Bread',
            quantity: 2,
            price: 5.99,
            menuItemId: 'menu_6',
          },
          {
            id: 'item_5',
            name: 'Tiramisu',
            quantity: 1,
            price: 6.99,
            menuItemId: 'menu_7',
          },
        ],
      },
    },
    {
      id: 'ord_123458',
      restaurantId: restaurant.id,
      customerName: 'John Smith',
      orderType: 'delivery',
      status: 'ready',
      total: 52.97,
      items: {
        create: [
          {
            id: 'item_6',
            name: 'Pepperoni Pizza',
            quantity: 1,
            price: 18.99,
            menuItemId: 'menu_2',
          },
          {
            id: 'item_7',
            name: 'Buffalo Wings',
            quantity: 2,
            price: 12.99,
            // No menuItemId since it's a custom item
          },
          {
            id: 'item_8',
            name: 'Chocolate Brownie',
            quantity: 1,
            price: 7.99,
            // No menuItemId since it's a custom item
          },
        ],
      },
    },
    {
      id: 'ord_123459',
      restaurantId: restaurant.id,
      customerName: 'Sarah Williams',
      orderType: 'pickup',
      status: 'delivered',
      total: 24.99,
      items: {
        create: [
          {
            id: 'item_9',
            name: 'Greek Salad',
            quantity: 1,
            price: 10.99,
            menuItemId: 'menu_4',
          },
          {
            id: 'item_10',
            name: 'Falafel Wrap',
            quantity: 1,
            price: 13.99,
            // No menuItemId since it's a custom item
          },
        ],
      },
    },
  ];

  for (const order of orderData) {
    // Check if order already exists
    const existingOrder = await prisma.order.findUnique({
      where: { id: order.id }
    });
    
    if (existingOrder) {
      console.log(`Order ${order.id} already exists, skipping`);
    } else {
      await prisma.order.create({
        data: order,
      });
      console.log(`Created order: ${order.id}`);
    }
  }

  // Create users with different roles
  const password = "Test1234";
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
  // Create users for both restaurants
  const userData = [
    // Restaurant 1 users
    {
      id: 'user_owner_1',
      username: 'owner',
      password: hashedPassword,
      role: 'owner',
      restaurantId: 'rest_1',
    },
    {
      id: 'user_manager_1',
      username: 'manager',
      password: hashedPassword,
      role: 'manager',
      restaurantId: 'rest_1',
    },
    {
      id: 'user_wait_staff_1',
      username: 'test',
      password: hashedPassword,
      role: 'wait_staff',
      restaurantId: 'rest_1',
    },
    // Restaurant 2 users
    {
      id: 'user_owner_2',
      username: 'owner2',
      password: hashedPassword,
      role: 'owner',
      restaurantId: 'rest_2',
    },
    {
      id: 'user_manager_2',
      username: 'manager2',
      password: hashedPassword,
      role: 'manager',
      restaurantId: 'rest_2',
    },
    {
      id: 'user_wait_staff_2',
      username: 'test2',
      password: hashedPassword,
      role: 'wait_staff',
      restaurantId: 'rest_2',
    },
  ];
  
  for (const user of userData) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    
    if (existingUser) {
      console.log(`User ${user.username} already exists, skipping`);
    } else {
      await prisma.user.create({
        data: user
      });
      console.log(`Created user: ${user.username} with role ${user.role} for restaurant ${user.restaurantId}`);
    }
  }

  console.log('Seed data inserted successfully!');
  console.log('Restaurant 1 users:');
  console.log('- Username: "test", Password: "Test1234", Role: "wait_staff"');
  console.log('- Username: "manager", Password: "Test1234", Role: "manager"');
  console.log('- Username: "owner", Password: "Test1234", Role: "owner"');
  console.log('Restaurant 2 users:');
  console.log('- Username: "test2", Password: "Test1234", Role: "wait_staff"');
  console.log('- Username: "manager2", Password: "Test1234", Role: "manager"');
  console.log('- Username: "owner2", Password: "Test1234", Role: "owner"');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
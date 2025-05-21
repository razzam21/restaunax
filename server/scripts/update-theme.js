// Script to directly update restaurant theme
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateRestaurantTheme() {
  try {
    console.log('Starting theme update...');
    
    // Update restaurant with ID rest_1
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: 'rest_1' },
      data: {
        themeId: 'rest_1',
        primaryColor: '#1A365D',
        secondaryColor: '#9C4221'
      }
    });
    
    console.log('Restaurant updated successfully:', updatedRestaurant);
  } catch (error) {
    console.error('Error updating restaurant theme:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateRestaurantTheme();
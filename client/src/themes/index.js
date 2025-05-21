import defaultTheme from './default';
import rest1Theme from './rest_1';
import rest2Theme from './rest_2';

// Map restaurant IDs to themes
const themeMap = {
  'default': defaultTheme,
  'rest_1': rest1Theme,
  'rest_2': rest2Theme,
  // Add more themes as needed
};

/**
 * Get the theme for a specific restaurant ID
 * @param {string} restaurantId - The restaurant ID
 * @returns {Object} The theme object
 */
export const getThemeByRestaurantId = (themeId) => {
  // Check if we have a valid themeId and it exists in our map
  if (themeId && themeMap[themeId]) {
    console.log(`Loading theme: ${themeId}`);
    return themeMap[themeId];
  }
  
  // Default fallback
  console.log('No valid theme found, using default theme');
  return defaultTheme;
};

export default defaultTheme;
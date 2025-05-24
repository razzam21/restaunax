import { createContext, useState, useContext, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { useAuth } from './AuthContext';
import { getThemeByRestaurantId } from '../themes';
import defaultTheme from '../themes/default';
import { restaurantService } from '../services/api';

// Create the theme context
const ThemeContext = createContext();

// Hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// ThemeProvider component
export const ThemeProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [theme, setTheme] = useState(defaultTheme);
  const [themeInfo, setThemeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load theme based on user's restaurant
  useEffect(() => {
    const loadTheme = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // If user is authenticated, get the theme for their restaurant
        if (isAuthenticated && user?.restaurantId) {
          try {
            // First fetch theme info from the API
            const response = await restaurantService.getRestaurantTheme(user.restaurantId);
            
            if (response.success && response.data) {
              setThemeInfo(response.data);
              console.log('Theme info from API:', response.data);
              
              // If the restaurant has a themeId, use it to get the theme
              if (response.data.theme && response.data.theme.id) {
                console.log(`Using theme ID from API: ${response.data.theme.id}`);
                const restaurantTheme = getThemeByRestaurantId(response.data.theme.id);
                setTheme(restaurantTheme);
              } else {
                // Fall back to restaurant ID if no theme ID is specified
                console.log(`No theme ID found, using restaurant ID: ${user.restaurantId}`);
                const restaurantTheme = getThemeByRestaurantId(user.restaurantId);
                setTheme(restaurantTheme);
              }
            } else {
              // API response was not successful, fall back to static theme
              console.log(`API response unsuccessful, using restaurant ID: ${user.restaurantId}`);
              const restaurantTheme = getThemeByRestaurantId(user.restaurantId);
              setTheme(restaurantTheme);
            }
          } catch (apiError) {
            console.error('Failed to load theme info from API:', apiError);
            // Fall back to static theme based on restaurant ID
            console.log(`API error, falling back to restaurant ID: ${user.restaurantId}`);
            const restaurantTheme = getThemeByRestaurantId(user.restaurantId);
            setTheme(restaurantTheme);
          }
        } else {
          // Otherwise, use the default theme
          console.log('No user or authentication, using default theme');
          setTheme(defaultTheme);
          setThemeInfo(null);
        }
      } catch (err) {
        console.error('Error loading theme:', err);
        setError(err.message || 'Failed to load theme');
        // Fall back to default theme
        setTheme(defaultTheme);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, [isAuthenticated, user]);

  // Force theme change (for future use, like user preferences)
  const changeTheme = (themeId) => {
    console.log(`changeTheme called with themeId: ${themeId}`);
    const newTheme = getThemeByRestaurantId(themeId);
    setTheme(newTheme);
  };

  // Context value
  const contextValue = {
    theme,
    themeInfo,
    loading,
    error,
    changeTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export { ThemeContext };
export default ThemeContext;
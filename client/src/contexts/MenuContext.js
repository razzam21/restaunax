import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { menuService } from '../services/api';

const MenuContext = createContext();

export const useMenu = () => useContext(MenuContext);

export const MenuProvider = ({ children }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all menu items, optionally filtered by category
  const fetchMenuItems = useCallback(async (category) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching menu items with category:', category || 'all');
      const data = await menuService.getMenuItems(category);
      console.log('Menu items fetched:', data);
      
      // Verify alphabetical sorting
      if (data && data.length > 0) {
        console.log('Menu items order check:');
        data.forEach((item, index) => {
          console.log(`${index}: ${item.name} (${item.category})`);
        });
      }
      
      setMenuItems(data || []);
      
      // Extract unique categories
      if (!category && data?.length > 0) {
        const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))];
        setCategories(uniqueCategories);
      }
    } catch (err) {
      console.error('Error in fetchMenuItems:', err);
      setError(err.response?.data?.error || 'Failed to fetch menu items');
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a single menu item by ID
  const getMenuItemById = useCallback(async (id) => {
    try {
      console.log('Fetching menu item by ID:', id);
      const data = await menuService.getMenuItemById(id);
      console.log('Menu item fetched:', data);
      return data;
    } catch (err) {
      console.error('Error in getMenuItemById:', err);
      setError(err.response?.data?.error || 'Failed to fetch menu item');
      return null;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    console.log('MenuContext mounted, fetching initial menu items');
    fetchMenuItems().catch(err => {
      console.error('Initial menu fetch error:', err);
    });
  }, [fetchMenuItems]);

  const contextValue = {
    menuItems,
    categories,
    loading,
    error,
    fetchMenuItems,
    getMenuItemById,
  };

  console.log('MenuContext current state:', { 
    menuItemsCount: menuItems.length, 
    categories,
    loading, 
    hasError: !!error 
  });

  return (
    <MenuContext.Provider value={contextValue}>
      {children}
    </MenuContext.Provider>
  );
};
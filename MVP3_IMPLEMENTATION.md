# MVP3: Dynamic Theming Implementation

This document explains how the dynamic theming system is implemented in Restaunax, enabling restaurant-specific themes.

## Overview

The dynamic theming system allows:

1. Different restaurants to have unique visual identities
2. Themes to be automatically applied based on the user's restaurant
3. Restaurant owners to select themes from a predefined set of options
4. Theme data to be stored in both the database and in static theme files

## Architecture

The theming system consists of several components:

### 1. Database Schema

The `Restaurant` model has been extended with theme-related fields:

```prisma
model Restaurant {
  id             String          @id @default(uuid())
  name           String
  themeId        String?         // ID of the theme to use
  primaryColor   String?         // Primary color for the restaurant's theme
  secondaryColor String?         // Secondary color for the restaurant's theme
  // other fields...
}
```

### 2. Theme Files

Static theme files define the complete Material UI themes:

- `/client/src/themes/default.js` - Default theme
- `/client/src/themes/rest_1.js` - Theme for restaurant 1
- `/client/src/themes/rest_2.js` - Theme for restaurant 2
- `/client/src/themes/index.js` - Theme registry and helper functions

### 3. Theme Context

The `ThemeContext` provides theme state management through React Context:

- Loads the appropriate theme based on the authenticated user's restaurant
- Manages theme loading state and errors
- Provides a `changeTheme` function for manual theme switching
- Uses Material UI's `ThemeProvider` to apply the theme

### 4. Backend API

The backend provides API endpoints to retrieve and update theme information:

- `GET /api/restaurants/:id` - Get restaurant data
- `GET /api/restaurants/:id/theme` - Get theme settings for a restaurant
- `GET /api/restaurants/themes` - Get list of available themes
- `PATCH /api/restaurants/:id` - Update restaurant settings (including theme)

### 5. Settings Page

A dedicated restaurant settings page allows owners to:

- View and update restaurant name
- Select from available themes
- Preview how themes will look
- Save theme changes

## User Roles and Permissions

- **Owner**: Full access to theme settings, can change restaurant theme
- **Manager/Wait Staff**: Can view the theme but cannot change it
- The settings page and theme update API are protected with role-based access control

## Theme Selection Flow

1. The owner navigates to the Settings page
2. Available themes are fetched from the server
3. The owner selects a theme from the dropdown
4. The owner can preview the theme before saving
5. On save, the theme is persisted to the database
6. The theme is automatically applied to all users in that restaurant

## Theme Structure

Each theme follows the Material UI theme structure with these main sections:

1. **Palette** - Colors for primary, secondary, background, text, etc.
2. **Typography** - Font families, sizes, weights
3. **Shape** - Border radius and other shape properties
4. **Shadows** - Elevation and shadow styles
5. **Components** - Component-specific styling overrides

## Current Themes

### Default Theme
- Primary: Slightly Dark Blue (#2C4A7A)
- Secondary: Slightly Dark Orange (#D97A3A)
- Background: Off-White (#F9FAFB)

### Blue Ocean Theme (rest_1)
- Primary: Deep Blue (#1A365D)
- Secondary: Rustic Orange (#9C4221)
- Background: Light Blue Grey (#F7FAFC)

### Forest Theme (rest_2)
- Primary: Forest Green (#276749)
- Secondary: Purple (#805AD5)
- Background: Light Green Tint (#F0FFF4)

## Testing

Comprehensive tests have been implemented for the theming system:

1. **Frontend Tests**:
   - `ThemeContext.test.js` - Tests theme loading and switching
   - `Header.test.js` - Tests theme display in the UI
   - `RestaurantSettingsPage.test.js` - Tests theme settings form

2. **Backend Tests**:
   - `restaurant-service.test.js` - Tests theme data retrieval and updates
   - `restaurant-controller.test.js` - Tests theme API endpoints

## Security Considerations

1. **Access Control**:
   - Only owners can modify restaurant theme settings
   - Theme updates are logged in the audit log
   - Permissions are checked at both the route and service level

2. **Data Validation**:
   - Color values are validated with regex to ensure proper hex format
   - Theme IDs are validated to ensure they exist
   - All inputs are sanitized to prevent XSS attacks

3. **Error Handling**:
   - Graceful fallback to default theme when errors occur
   - User-friendly error messages
   - Comprehensive error logging

## How to Add New Themes

To add a new theme:

1. Create a new theme file in `/client/src/themes/`
2. Register the theme in `/client/src/themes/index.js`
3. Add the theme to the available themes list in the restaurant service

Example:

```javascript
// In /client/src/themes/rest_3.js
import { createTheme } from '@mui/material/styles';
import defaultTheme from './default';

const restaurantTheme = createTheme({
  ...defaultTheme,
  palette: {
    ...defaultTheme.palette,
    primary: {
      main: '#8B5CF6', // Purple
      light: '#A78BFA',
      dark: '#7C3AED',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#F59E0B', // Amber
      light: '#FBBF24',
      dark: '#D97706',
      contrastText: '#FFFFFF',
    },
    // Other color overrides...
  },
});

export default restaurantTheme;
```

Then register it in the index.js:

```javascript
// In /client/src/themes/index.js
import rest3Theme from './rest_3';

const themeMap = {
  'rest_1': rest1Theme,
  'rest_2': rest2Theme,
  'rest_3': rest3Theme,
  // Add more themes as needed
};
```

And add it to the available themes in the restaurant service:

```javascript
// In /server/src/services/restaurant-service.js
const getAvailableThemes = async () => {
  return [
    // Existing themes...
    {
      id: 'rest_3',
      name: 'Purple Amber Theme',
      description: 'Purple with amber accents',
      primaryColor: '#8B5CF6',
      secondaryColor: '#F59E0B'
    }
  ];
};
```

## Using the Theme in Components

Components can access the current theme using the `useTheme` hook from Material UI:

```javascript
import { useTheme } from '@mui/material/styles';

const MyComponent = () => {
  const theme = useTheme();
  
  return (
    <div style={{ color: theme.palette.primary.main }}>
      Themed content
    </div>
  );
};
```

## Audit Logging

The theme system includes comprehensive audit logging to track changes:

1. **Audit Log Structure**:
   - Each theme change is recorded in the `AuditLog` table
   - Logs include: user ID, action type, timestamp, and detailed change information

2. **Logged Actions**:
   - Theme selection changes 
   - Primary/secondary color updates
   - Restaurant name updates

3. **Implementation**:
   - Uses a dedicated `audit-logger` utility for reliability
   - Two-tier approach (standard Prisma API with SQL fallback)
   - Ensures audit trail persistence even when theme changes fail

```javascript
// Example audit log entry for theme change
{
  "id": "ac9d6271-d6ec-4046-a930-59a544fbbbc0",
  "userId": "user_owner_1",
  "action": "update_restaurant",
  "details": {
    "restaurantId": "rest_1",
    "updatedFields": ["themeId", "primaryColor", "secondaryColor"],
    "timestamp": "2025-05-21T05:32:48.366Z",
    "themeId": "rest_2",
    "primaryColor": "#1A365D",
    "secondaryColor": "#9C4221"
  },
  "createdAt": "2025-05-21T05:32:48.366Z"
}
```

## Recent Improvements

1. **Theme Switching Reliability**:
   - Enhanced theme loading with better fallback mechanisms
   - Improved error handling throughout the theme system
   - Fixed edge cases with theme persistence

2. **Audit Log Reliability**:
   - Implemented a robust audit logging system for theme changes
   - Added fallback mechanisms for creating audit logs
   - Enhanced error reporting and debugging for audit logs

3. **User Experience Enhancements**:
   - Added better feedback for theme saving and errors
   - Improved theme preview functionality
   - Enhanced role-based UI elements

## Future Enhancements

1. **Theme Editor**: Allow restaurant owners to customize their theme beyond selecting from presets
2. **Dynamic Loading**: Load themes dynamically from a theme store rather than bundling them
3. **Theme Export/Import**: Allow owners to export/import themes
4. **Seasonal Themes**: Allow scheduled theme changes for special events or holidays
5. **Audit Log Viewer**: Add a UI for owners to view theme change history
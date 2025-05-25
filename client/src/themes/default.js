// Default theme for Restaunax
import { createTheme } from '@mui/material/styles';

const defaultTheme = createTheme({
  breakpoints: {
    values: {
      xs: 0,     // Mobile phones (0px and up)
      sm: 600,   // Small tablets (600px and up)
      md: 960,   // Large tablets/small laptops (960px and up)
      lg: 1280,  // Laptops/desktops (1280px and up)
      xl: 1920,  // Large desktops (1920px and up)
    },
  },
  palette: {
    primary: {
      main: '#2C4A7A', // Slightly Dark Blue
      light: '#4E6D9C',
      dark: '#1A3363',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#D97A3A', // Slightly Dark Orange
      light: '#E39864',
      dark: '#B45C1E',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F9FAFB', // Off-White
      paper: '#FFFFFF',
      light: '#E5E7EB', // Light Gray
    },
    info: {
      main: '#4A8B8C', // Muted Teal
      light: '#6CA3A4',
      dark: '#376D6E',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#A8333B', // Deep Red
      light: '#BC5962',
      dark: '#8C2129',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#4CAF50',
      light: '#6BC16F',
      dark: '#3B8C3E',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#FF9800',
      light: '#FFAC33',
      dark: '#CC7A00',
      contrastText: '#FFFFFF',
    },
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
      disabled: '#9CA3AF',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    // Responsive typography - different sizes for different devices
    h1: {
      fontWeight: 700,
      fontSize: '1.75rem', // Mobile
      '@media (min-width:600px)': {
        fontSize: '2rem',    // Tablet
      },
      '@media (min-width:960px)': {
        fontSize: '2.5rem',  // Desktop
      },
    },
    h2: {
      fontWeight: 600,
      fontSize: '1.5rem',  // Mobile
      '@media (min-width:600px)': {
        fontSize: '1.75rem', // Tablet
      },
      '@media (min-width:960px)': {
        fontSize: '2rem',    // Desktop
      },
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.25rem', // Mobile
      '@media (min-width:600px)': {
        fontSize: '1.5rem',  // Tablet
      },
      '@media (min-width:960px)': {
        fontSize: '1.75rem', // Desktop
      },
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.125rem', // Mobile
      '@media (min-width:600px)': {
        fontSize: '1.25rem',  // Tablet
      },
      '@media (min-width:960px)': {
        fontSize: '1.5rem',   // Desktop
      },
    },
    h5: {
      fontWeight: 500,
      fontSize: '1rem',     // Mobile
      '@media (min-width:600px)': {
        fontSize: '1.125rem', // Tablet
      },
      '@media (min-width:960px)': {
        fontSize: '1.25rem',  // Desktop
      },
    },
    h6: {
      fontWeight: 500,
      fontSize: '0.875rem', // Mobile
      '@media (min-width:600px)': {
        fontSize: '1rem',     // Tablet
      },
      '@media (min-width:960px)': {
        fontSize: '1rem',     // Desktop
      },
    },
    subtitle1: {
      fontSize: '0.875rem', // Mobile
      fontWeight: 400,
      '@media (min-width:600px)': {
        fontSize: '1rem',     // Tablet+
      },
    },
    subtitle2: {
      fontSize: '0.75rem',  // Mobile
      fontWeight: 500,
      '@media (min-width:600px)': {
        fontSize: '0.875rem', // Tablet+
      },
    },
    body1: {
      fontSize: '0.875rem', // Mobile
      fontWeight: 400,
      '@media (min-width:600px)': {
        fontSize: '1rem',     // Tablet+
      },
    },
    body2: {
      fontSize: '0.75rem',  // Mobile
      fontWeight: 400,
      '@media (min-width:600px)': {
        fontSize: '0.875rem', // Tablet+
      },
    },
    button: {
      fontSize: '0.75rem',  // Mobile
      fontWeight: 500,
      textTransform: 'none',
      '@media (min-width:600px)': {
        fontSize: '0.875rem', // Tablet+
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 2px 1px -1px rgba(0,0,0,0.1),0px 1px 1px 0px rgba(0,0,0,0.07),0px 1px 3px 0px rgba(0,0,0,0.06)',
    '0px 3px 1px -2px rgba(0,0,0,0.1),0px 2px 2px 0px rgba(0,0,0,0.07),0px 1px 5px 0px rgba(0,0,0,0.06)',
    '0px 3px 3px -2px rgba(0,0,0,0.1),0px 3px 4px 0px rgba(0,0,0,0.07),0px 1px 8px 0px rgba(0,0,0,0.06)',
    '0px 2px 4px -1px rgba(0,0,0,0.1),0px 4px 5px 0px rgba(0,0,0,0.07),0px 1px 10px 0px rgba(0,0,0,0.06)',
    '0px 3px 5px -1px rgba(0,0,0,0.1),0px 5px 8px 0px rgba(0,0,0,0.07),0px 1px 14px 0px rgba(0,0,0,0.06)',
    // ... More shadows can be added here
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
          },
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#4E6D9C',
          },
        },
        containedSecondary: {
          '&:hover': {
            backgroundColor: '#E39864',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

export default defaultTheme;
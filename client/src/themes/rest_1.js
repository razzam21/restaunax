// Theme for Restaurant 1
import { createTheme } from '@mui/material/styles';
import defaultTheme from './default';

const restaurantTheme = createTheme({
  ...defaultTheme,
  palette: {
    ...defaultTheme.palette,
    primary: {
      main: '#1A365D', // Deep Blue
      light: '#2C5282',
      dark: '#0E1F3C',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#9C4221', // Rustic Orange
      light: '#C05621',
      dark: '#7B341E',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F7FAFC', // Light Blue Grey
      paper: '#FFFFFF',
      light: '#EDF2F7',
    },
    info: {
      main: '#3182CE', // Bright Blue
      light: '#4299E1',
      dark: '#2B6CB0',
      contrastText: '#FFFFFF',
    },
  },
  // You can override any other theme properties here
});

export default restaurantTheme;
// Theme for Restaurant 2
import { createTheme } from '@mui/material/styles';
import defaultTheme from './default';

const restaurantTheme = createTheme({
  ...defaultTheme,
  palette: {
    ...defaultTheme.palette,
    primary: {
      main: '#276749', // Forest Green
      light: '#38A169',
      dark: '#1C4532',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#805AD5', // Purple
      light: '#9F7AEA',
      dark: '#6B46C1',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F0FFF4', // Light Green Tint
      paper: '#FFFFFF',
      light: '#E6FFFA',
    },
    info: {
      main: '#4299E1', // Bright Blue
      light: '#63B3ED',
      dark: '#2B6CB0',
      contrastText: '#FFFFFF',
    },
  },
  // You can override any other theme properties here
});

export default restaurantTheme;
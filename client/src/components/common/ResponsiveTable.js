import { 
  TableContainer, 
  useTheme, 
  useMediaQuery,
  Box 
} from '@mui/material';

/**
 * Responsive table wrapper that provides horizontal scrolling on mobile
 * and proper sizing for different screen sizes
 */
const ResponsiveTable = ({ children, ...props }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <TableContainer
      {...props}
      sx={{
        // Enable horizontal scrolling on mobile
        overflowX: isMobile ? 'auto' : 'visible',
        // Adjust max width to prevent layout issues
        maxWidth: '100%',
        // Add subtle border on mobile for better visual separation
        ...(isMobile && {
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
        }),
        // Merge any existing sx props
        ...props.sx,
      }}
    >
      <Box
        sx={{
          // Minimum width on mobile to ensure table doesn't get too cramped
          minWidth: isMobile ? 600 : 'auto',
        }}
      >
        {children}
      </Box>
    </TableContainer>
  );
};

export default ResponsiveTable;
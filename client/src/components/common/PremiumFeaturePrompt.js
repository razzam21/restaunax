import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  Restaurant as RestaurantIcon,
  Analytics as AnalyticsIcon,
  Star as StarIcon,
  ContactSupport as ContactIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

/**
 * PremiumFeaturePrompt - Non-obnoxious upsell component
 * Shows when users try to access disabled AI features
 */
const PremiumFeaturePrompt = ({ 
  open, 
  onClose, 
  feature = 'ai_insights',
  title = 'Premium AI Features',
  onContactSales,
}) => {
  const theme = useTheme();

  const featureDetails = {
    ai_insights: {
      title: 'AI-Powered Insights',
      description: 'Unlock intelligent demand forecasting and menu optimization',
      icon: <PsychologyIcon color="primary" />,
      features: [
        'Demand forecasting with 85%+ accuracy',
        'Menu optimization recommendations',
        'Real-time AI analysis',
        'Historical trend analysis',
        'Automated business insights',
      ],
    },
    demand_forecast: {
      title: 'Demand Forecasting',
      description: 'Predict future order patterns with AI precision',
      icon: <TrendingUpIcon color="primary" />,
      features: [
        'Predict daily and hourly demand',
        'Seasonal pattern recognition',
        'Staff scheduling optimization',
        'Inventory planning insights',
        'Revenue forecasting',
      ],
    },
    menu_optimization: {
      title: 'Menu Optimization',
      description: 'Optimize your menu for maximum profitability',
      icon: <RestaurantIcon color="primary" />,
      features: [
        'Pricing optimization recommendations',
        'Item performance analysis',
        'Profit margin insights',
        'Menu composition suggestions',
        'Customer preference analysis',
      ],
    },
  };

  const currentFeature = featureDetails[feature] || featureDetails.ai_insights;

  const handleContactSales = () => {
    if (onContactSales) {
      onContactSales();
    } else {
      // Default action - could open a contact form or redirect
      window.open('mailto:sales@restaunax.com?subject=Premium AI Features Inquiry', '_blank');
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={2}>
          {currentFeature.icon}
          <Box>
            <Typography variant="h5" component="h2" fontWeight="bold">
              {currentFeature.title}
            </Typography>
            <Chip 
              label="Premium Feature" 
              color="primary" 
              size="small" 
              sx={{ mt: 0.5 }}
            />
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {currentFeature.description}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
            <AnalyticsIcon fontSize="small" />
            What you&apos;ll get:
          </Typography>
          <List dense>
            {currentFeature.features.map((feature, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <StarIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary={feature}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box 
          sx={{ 
            p: 2, 
            bgcolor: theme.palette.primary.main + '10',
            borderRadius: 1,
            border: `1px solid ${theme.palette.primary.main}20`,
          }}
        >
          <Typography variant="body2" color="text.secondary" align="center">
            <strong>Upgrade to Premium</strong> to access AI-powered insights that can help increase revenue by up to 15% and reduce costs by 10%.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={onClose} 
          color="inherit"
        >
          Maybe Later
        </Button>
        <Button
          onClick={handleContactSales}
          variant="contained"
          startIcon={<ContactIcon />}
          sx={{ 
            background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
            '&:hover': {
              background: `linear-gradient(45deg, ${theme.palette.primary.dark} 30%, ${theme.palette.primary.main} 90%)`,
            }
          }}
        >
          Contact Sales
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PremiumFeaturePrompt;
const express = require('express');
const { 
  getRestaurantById, 
  getRestaurantTheme, 
  updateRestaurantSettings, 
  getAvailableThemes 
} = require('../controllers/restaurant-controller');
const { requireAuth, hasRole } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(requireAuth);

// Restaurant routes
router.get('/themes', getAvailableThemes);
router.get('/:id', getRestaurantById);
router.get('/:id/theme', getRestaurantTheme);
// Only owners can update restaurant settings
router.patch('/:id', hasRole('owner'), updateRestaurantSettings);

module.exports = router;
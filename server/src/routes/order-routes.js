const express = require('express');
const { 
  getOrders, 
  getOrderById, 
  createOrder, 
  updateOrderStatus 
} = require('../controllers/order-controller');
const { validate, sanitize } = require('../middleware/validation');
const { createOrderSchema, updateOrderSchema } = require('../utils/validation-schemas');

const router = express.Router();

// Get all orders with optional status filter
router.get('/', getOrders);

// Get a single order by ID
router.get('/:id', getOrderById);

// Create a new order
router.post(
  '/', 
  sanitize(['customerName']), 
  validate(createOrderSchema), 
  createOrder
);

// Update order status
router.patch(
  '/:id', 
  validate(updateOrderSchema), 
  updateOrderStatus
);

module.exports = router;
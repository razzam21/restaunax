const asyncHandler = require('express-async-handler');
const orderService = require('../services/order-service');

// @desc    Get all orders with optional status filter and pagination
// @route   GET /api/orders?page=1&limit=20&status=pending&restaurantId=rest_1
// @access  Public (for MVP1, will be restricted in MVP2)
const getOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20, restaurantId } = req.query;
  
  // Convert to numbers and validate
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Max 100 per page
  
  const result = await orderService.getOrders(status, pageNum, limitNum, restaurantId);
  res.json(result);
});

// @desc    Get a single order by ID
// @route   GET /api/orders/:id
// @access  Public (for MVP1, will be restricted in MVP2)
const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  res.json(order);
});

// @desc    Create a new order
// @route   POST /api/orders
// @access  Public (for MVP1, will be restricted in MVP2)
const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.body);
  res.status(201).json(order);
});

// @desc    Update order status
// @route   PATCH /api/orders/:id
// @access  Public (for MVP1, will be restricted in MVP2)
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await orderService.updateOrderStatus(req.params.id, status);
  res.json(order);
});

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus
};
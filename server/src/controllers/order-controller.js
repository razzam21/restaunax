const asyncHandler = require('express-async-handler');
const orderService = require('../services/order-service');

// @desc    Get all orders with optional status filter
// @route   GET /api/orders
// @access  Public (for MVP1, will be restricted in MVP2)
const getOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const orders = await orderService.getOrders(status);
  res.json(orders);
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
const Joi = require('joi');

// Order Item Schema
const orderItemSchema = Joi.object({
  id: Joi.string().optional(),
  name: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
  price: Joi.number().precision(2).min(0).required(),
  menuItemId: Joi.string().allow(null, '').optional()
});

// Create Order Schema
const createOrderSchema = Joi.object({
  customerName: Joi.string().required(),
  orderType: Joi.string().valid('delivery', 'pickup').required(),
  items: Joi.array().items(orderItemSchema).min(1).required(),
  total: Joi.number().precision(2).min(0).required(),
  restaurantId: Joi.string().required()
});

// Update Order Schema
const updateOrderSchema = Joi.object({
  status: Joi.string().valid('pending', 'preparing', 'ready', 'delivered').required()
});

// User Registration Schema
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('wait_staff', 'manager', 'owner').required(),
  restaurantId: Joi.string().required()
});

// User Login Schema
const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

module.exports = {
  createOrderSchema,
  updateOrderSchema,
  registerSchema,
  loginSchema
};
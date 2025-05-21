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
  restaurantId: Joi.string().default('rest_1') // Hardcoded for MVP 1
});

// Update Order Schema
const updateOrderSchema = Joi.object({
  status: Joi.string().valid('pending', 'preparing', 'ready', 'delivered').required()
});

module.exports = {
  createOrderSchema,
  updateOrderSchema
};
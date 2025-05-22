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

// Menu Item Schemas
const menuItemCreateSchema = Joi.object({
  name: Joi.string().required().trim().min(1).max(100),
  description: Joi.string().allow('', null).max(500),
  price: Joi.number().required().precision(2).min(0),
  categoryId: Joi.string().allow('', null),
  category: Joi.string().allow('', null), // Legacy field
  image: Joi.string().allow('', null).max(500),
  dietaryInfo: Joi.object({
    vegetarian: Joi.boolean(),
    vegan: Joi.boolean(),
    glutenFree: Joi.boolean(),
    containsNuts: Joi.boolean(),
    spicyLevel: Joi.number().integer().min(0).max(3)
  }).allow(null),
  isActive: Joi.boolean(),
  preparationTime: Joi.number().integer().min(0).allow(null)
});

const menuItemUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  description: Joi.string().allow('', null).max(500),
  price: Joi.number().precision(2).min(0),
  categoryId: Joi.string().allow('', null),
  category: Joi.string().allow('', null), // Legacy field
  image: Joi.string().allow('', null).max(500),
  dietaryInfo: Joi.object({
    vegetarian: Joi.boolean(),
    vegan: Joi.boolean(),
    glutenFree: Joi.boolean(),
    containsNuts: Joi.boolean(),
    spicyLevel: Joi.number().integer().min(0).max(3)
  }).allow(null),
  isActive: Joi.boolean(),
  preparationTime: Joi.number().integer().min(0).allow(null)
}).min(1);

const menuItemBulkUpdateSchema = Joi.object({
  ids: Joi.array().items(Joi.string()).required().min(1),
  data: Joi.object({
    categoryId: Joi.string().allow('', null),
    isActive: Joi.boolean(),
    preparationTime: Joi.number().integer().min(0).allow(null)
  }).required().min(1)
});

// Menu Category Schemas
const menuCategorySchema = Joi.object({
  name: Joi.string().required().trim().min(1).max(50),
  description: Joi.string().allow('', null).max(255),
  displayOrder: Joi.number().integer().min(0),
  isActive: Joi.boolean()
});

const menuCategoryUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50),
  description: Joi.string().allow('', null).max(255),
  displayOrder: Joi.number().integer().min(0),
  isActive: Joi.boolean()
}).min(1);

const categoryOrderSchema = Joi.object({
  categoryOrders: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      order: Joi.number().integer().min(0).required()
    })
  ).required().min(1)
});

module.exports = {
  createOrderSchema,
  updateOrderSchema,
  registerSchema,
  loginSchema,
  
  // Menu item schemas
  menuItemCreateSchema,
  menuItemUpdateSchema,
  menuItemBulkUpdateSchema,
  
  // Menu category schemas
  menuCategorySchema,
  menuCategoryUpdateSchema,
  categoryOrderSchema
};
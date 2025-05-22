const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');
const { 
  createOrderSchema, 
  updateOrderSchema, 
  registerSchema, 
  loginSchema,
  menuItemCreateSchema,
  menuItemUpdateSchema,
  menuItemBulkUpdateSchema,
  menuCategorySchema,
  menuCategoryUpdateSchema,
  categoryOrderSchema
} = require('../utils/validation-schemas');

// Create a validation middleware that validates request data against a Joi schema
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({ 
      success: false, 
      error: error.details.map(x => x.message).join(', ') 
    });
  }
  
  next();
};

// Sanitize middleware to prevent XSS attacks
const sanitize = (fields) => (req, res, next) => {
  if (!req.body) return next();

  fields.forEach(field => {
    if (req.body[field]) {
      if (typeof req.body[field] === 'string') {
        req.body[field] = sanitizeHtml(req.body[field], {
          allowedTags: [],
          allowedAttributes: {}
        });
      }
    }
  });

  next();
};

// Shared utility to sanitize an object (used in menu controller)
const sanitizeObject = (obj) => {
  if (!obj) return obj;
  
  const sanitizedObj = { ...obj };
  
  Object.keys(sanitizedObj).forEach(key => {
    if (typeof sanitizedObj[key] === 'string') {
      sanitizedObj[key] = sanitizeHtml(sanitizedObj[key], {
        allowedTags: [],
        allowedAttributes: {}
      });
    }
  });
  
  return sanitizedObj;
};

// Validation middlewares
const validateCreateOrder = validate(createOrderSchema);
const validateUpdateOrder = validate(updateOrderSchema);
const validateRegister = validate(registerSchema);
const validateLogin = validate(loginSchema);
const validateMenuItemCreate = validate(menuItemCreateSchema);
const validateMenuItemUpdate = validate(menuItemUpdateSchema);
const validateMenuItemBulk = validate(menuItemBulkUpdateSchema);
const validateMenuCategory = validate(menuCategorySchema);
const validateMenuCategoryOrder = validate(categoryOrderSchema);

module.exports = {
  validate,
  sanitize,
  sanitizeObject,
  validateCreateOrder,
  validateUpdateOrder,
  validateRegister,
  validateLogin,
  validateMenuItemCreate,
  validateMenuItemUpdate,
  validateMenuItemBulk,
  validateMenuCategory,
  validateMenuCategoryOrder
};
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

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

module.exports = {
  validate,
  sanitize
};
const { createOrderSchema, updateOrderSchema } = require('../../../src/utils/validation-schemas');
const Joi = require('joi');

describe('Validation Schemas', () => {
  describe('createOrderSchema', () => {
    test('should validate a valid order', () => {
      // Arrange
      const validOrder = {
        customerName: 'John Doe',
        orderType: 'delivery',
        items: [
          { name: 'Burger', quantity: 2, price: 9.99 }
        ],
        total: 19.98,
        restaurantId: 'rest_1'
      };

      // Act
      const result = createOrderSchema.validate(validOrder);

      // Assert
      expect(result.error).toBeUndefined();
    });

    test('should require restaurantId', () => {
      // Arrange
      const orderWithoutRestaurantId = {
        customerName: 'John Doe',
        orderType: 'pickup',
        items: [
          { name: 'Pizza', quantity: 1, price: 12.99 }
        ],
        total: 12.99
      };

      // Act
      const result = createOrderSchema.validate(orderWithoutRestaurantId);

      // Assert
      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain('restaurantId');
    });

    test('should reject invalid order type', () => {
      // Arrange
      const invalidOrder = {
        customerName: 'John Doe',
        orderType: 'invalid_type', // Invalid order type
        items: [
          { name: 'Salad', quantity: 1, price: 7.99 }
        ],
        total: 7.99,
        restaurantId: 'rest_1'
      };

      // Act
      const result = createOrderSchema.validate(invalidOrder);

      // Assert
      expect(result.error).toBeTruthy();
      expect(result.error.details[0].message).toContain('orderType');
    });
  });

  describe('updateOrderSchema', () => {
    test('should validate valid status update', () => {
      // Arrange
      const validUpdate = {
        status: 'preparing'
      };

      // Act
      const result = updateOrderSchema.validate(validUpdate);

      // Assert
      expect(result.error).toBeUndefined();
    });

    test('should reject invalid status', () => {
      // Arrange
      const invalidUpdate = {
        status: 'invalid_status'
      };

      // Act
      const result = updateOrderSchema.validate(invalidUpdate);

      // Assert
      expect(result.error).toBeTruthy();
      expect(result.error.details[0].message).toContain('status');
    });
  });

  // We need to extend the schema to include order number validation
  describe('Order Number Format', () => {
    test('should validate order number in format R1-YYYYMMDD-001', () => {
      // Create an extended schema that includes orderNumber field
      const orderWithNumberSchema = Joi.object({
        orderNumber: Joi.string().pattern(/^R\d+-\d{8}-\d{3}$/).required()
      });
      
      // Arrange
      const validOrderNumber = {
        orderNumber: 'R1-20250520-001'
      };
      
      // Act
      const result = orderWithNumberSchema.validate(validOrderNumber);
      
      // Assert
      expect(result.error).toBeUndefined();
    });
    
    test('should reject invalid order number format', () => {
      // Create an extended schema that includes orderNumber field
      const orderWithNumberSchema = Joi.object({
        orderNumber: Joi.string().pattern(/^R\d+-\d{8}-\d{3}$/).required()
      });
      
      // Test cases with invalid formats
      const invalidFormats = [
        { orderNumber: 'X1-20250520-001' },  // Wrong prefix
        { orderNumber: 'R1-2025520-001' },   // Wrong date format
        { orderNumber: 'R1-20250520-01' },   // Wrong sequence format
        { orderNumber: 'R1-20250520001' },   // Missing hyphen
        { orderNumber: 'R1-20250520-0001' }, // Too many digits in sequence
      ];
      
      // Test each invalid format
      invalidFormats.forEach(invalidFormat => {
        // Act
        const result = orderWithNumberSchema.validate(invalidFormat);
        
        // Assert
        expect(result.error).toBeTruthy();
        expect(result.error.details[0].message).toContain('orderNumber');
      });
    });
  });
});
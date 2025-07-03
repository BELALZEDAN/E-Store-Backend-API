import { body } from 'express-validator';

export const createOrderValidator = [
  // Validate shipping_info object and its required fields
  body('shipping_info').isObject().withMessage('Shipping info must be an object'),
  body('shipping_info.address')
    .notEmpty()
    .withMessage('Shipping address is required'),
  body('shipping_info.city')
    .notEmpty()
    .withMessage('Shipping city is required'),
  body('shipping_info.postal_code')
    .notEmpty()
    .withMessage('Shipping postal code is required'),
  body('shipping_info.country')
    .notEmpty()
    .withMessage('Shipping country is required'),

  // Validate payment_info object and its required fields
  body('payment_info').isObject().withMessage('Payment info must be an object'),
  body('payment_info.method')
    .notEmpty()
    .withMessage('Payment method is required'),

  // Validate products is a non-empty array
  body('products')
    .isArray({ min: 1 })
    .withMessage('Products must be a non-empty array'),

  // Validate each product item inside products array
  body('products.*.product_id')
    .isInt({ min: 1 })
    .withMessage('Product ID must be a positive integer'),

  body('products.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  // Validate optional status field and allowed enum values
  body('status')
    .optional()
    .isIn([
      'pending',
      'processing',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'refunded',
      'failed',
      'on_hold',
      'returned',
    ])
    .withMessage('Invalid status value'),
];

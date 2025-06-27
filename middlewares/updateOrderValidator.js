import { body, param } from "express-validator";

// Allowed order statuses
const VALID_STATUSES = [
    "pending", "processing", "shipped", "out_for_delivery",
    "delivered", "cancelled", "refunded", "failed",
    "on_hold", "returned"
];

export const updateOrderValidator = [
    // Validate order_id param as positive integer
    param('order_id')
        .isInt({ gt: 0 })
        .withMessage('Order ID must be a positive integer'),

    // Validate shipping_info if present: must be object with required fields if provided
    body('shipping_info').optional().isObject().withMessage('Shipping info must be an object'),
    body('shipping_info.address').optional().notEmpty().withMessage('Shipping address cannot be empty'),
    body('shipping_info.city').optional().notEmpty().withMessage('Shipping city cannot be empty'),
    body('shipping_info.postal_code').optional().notEmpty().withMessage('Shipping postal code cannot be empty'),
    body('shipping_info.country').optional().notEmpty().withMessage('Shipping country cannot be empty'),

    // Validate payment_info if present: must be object with required fields if provided
    body('payment_info').optional().isObject().withMessage('Payment info must be an object'),
    body('payment_info.method').optional().notEmpty().withMessage('Payment method cannot be empty'),

    // Validate products if present: must be non-empty array
    body('products').optional().isArray({ min: 1 }).withMessage('Products must be a non-empty array'),

    // Validate each product in products array if present
    body('products.*.product_id')
        .optional()
        .isInt({ gt: 0 })
        .withMessage('Product ID must be a positive integer'),

    body('products.*.quantity')
        .optional()
        .isInt({ gt: 0 })
        .withMessage('Quantity must be a positive integer'),

    // Validate status if present and is one of the allowed enum values
    body('status')
        .optional()
        .isIn(VALID_STATUSES)
        .withMessage('Invalid status value'),
];
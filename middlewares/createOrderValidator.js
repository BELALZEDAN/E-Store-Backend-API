import { body } from "express-validator";

// Allowed statuses for orders
const VALID_STATUSES = [
    "pending", "processing", "shipped", "out_for_delivery",
    "delivered", "cancelled", "refunded", "failed",
    "on_hold", "returned"
];

// Validation rules for creating an order
export const createOrderValidator = [
    body("user_id")
        .notEmpty().withMessage("User ID is required")
        .isMongoId().withMessage("Invalid User ID format"),

    body("shipping_info")
        .notEmpty().withMessage("Shipping info is required")
        .isString().withMessage("Shipping info must be a string")
        .isLength({ min: 10 }).withMessage("Shipping info should have at least 10 characters")
        .matches(/^[A-Za-z0-9\s,.-]+$/).withMessage("Shipping info contains invalid characters")
        .trim(),

    body("payment_info")
        .optional()
        .isString().withMessage("Payment info must be a string")
        .isLength({ min: 10 }).withMessage("Payment info should have at least 10 characters")
        .matches(/^[A-Za-z0-9\s,.-]+$/).withMessage("Payment info contains invalid characters")
        .trim(),

    body("products")
        .isArray({ min: 1 }).withMessage("Products must be a non-empty array"),

    body("products.*.product") // The "*" applies the validation to each product in the "products" array.
        .notEmpty().withMessage("Product ID is required")
        .isMongoId().withMessage("Invalid Product ID format"),

    body("products.*.quantity")
        .isInt({ min: 1 }).withMessage("Product quantity must be at least 1"),

    body("total_price")
        .notEmpty().withMessage("Total price is required")
        .isFloat({ min: 0 }).withMessage("Total price must be a non-negative number"),

    body("status")
        .optional()
        .isIn(VALID_STATUSES).withMessage("Invalid status value"),
];

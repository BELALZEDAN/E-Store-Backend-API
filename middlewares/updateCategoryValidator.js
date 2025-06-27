import { body, param } from "express-validator";

// Validation middleware for updating a category (SQL version)
export const updateCategoryValidator = [
    // Validate the category_id in params (changed from isMongoId to isInt)
    param("category_id")
        .isInt({ min: 1 }).withMessage("Invalid category ID format"),

    // Validate the category_name (unchanged)
    body("category_name")
        .optional()
        .isString().withMessage("Category name must be a string")
        .isLength({ min: 3 }).withMessage("Category name must be at least 3 characters")
        .trim(),

    // Validate the description (unchanged)
    body("description")
        .optional()
        .isString().withMessage("Description must be a string")
        .isLength({ min: 5 }).withMessage("Description must be at least 5 characters")
        .trim(),
];
import { body, param } from "express-validator";

// Validation middleware for updating a category
export const updateCategoryValidator = [
    // Validate the category_id in params
    param("category_id")
        .isMongoId().withMessage("Invalid category ID format"),

    // Validate the category_name
    body("category_name")
        .optional() // Make it optional since it may not be included in the update
        .isString().withMessage("Category name must be a string")
        .isLength({ min: 3 }).withMessage("Category name must be at least 3 characters")
        .matches(/^[A-Za-z0-9\s]+$/).withMessage("Category name must contain only letters, numbers, and spaces")
        .trim(),

    // Validate the description
    body("description")
        .optional() // Make it optional since it may not be included in the update
        .isString().withMessage("Description must be a string")
        .isLength({ min: 5 }).withMessage("Description must be at least 5 characters")
        .matches(/^[A-Za-z0-9\s,.-]+$/).withMessage("Description can contain letters, numbers, spaces, and basic punctuation")
        .trim(),
];

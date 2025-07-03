import { body } from "express-validator";

// Validation middleware for creating a category
export const createCategoryValidator = [
    body("category_name")
        .notEmpty().withMessage("Category name is required")
        .isString().withMessage("Category name must be a string")
        .isLength({ min: 3 }).withMessage("Category name must be at least 3 characters")
        .trim(),

    body("description")
        .notEmpty().withMessage("Description is required")
        .isString().withMessage("Description must be a string")
        .isLength({ min: 5 }).withMessage("Description must be at least 5 characters")
        .trim(),
];

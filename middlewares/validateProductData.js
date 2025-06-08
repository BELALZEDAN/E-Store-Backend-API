import { body, validationResult } from "express-validator";

// Middleware to validate product data
export const validateProductData = [
  body("product_name").notEmpty().withMessage("Product name is required."),

  body("description")
    .notEmpty()
    .withMessage("Description is required.")
    .isLength({ min: 15 })
    .withMessage("Description must be at least 15 characters long."),

  body("price")
    .notEmpty()
    .withMessage("Product price is required.")
    .isNumeric()
    .withMessage("Price must be a number."),

  body("stock")
    .notEmpty()
    .withMessage("Product stock is required.")
    .isInt({ min: 0 })
    .withMessage("Stock must be a positive integer."),

  body("category")
    .notEmpty()
    .withMessage("Product category is required.")
    .isMongoId()
    .withMessage("Category is required and must be a valid ObjectId."),

  body("images_url")
    .optional()
    .isArray({ max: 5 })
    .withMessage("You can upload up to 5 images only.")
];

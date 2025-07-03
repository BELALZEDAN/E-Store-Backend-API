import { body } from "express-validator";

// Validation rules for user registration
export const registerUserValidator = [
  body("first_name")
    .trim()
    .isLength({ min: 3 })
    .withMessage("First name should have at least 3 characters")
    .matches(/^[A-Za-z\s]+$/)
    .withMessage("First name should only contain letters"),

  body("last_name")
    .trim()
    .isLength({ min: 3 })
    .withMessage("First name should have at least 3 characters")
    .matches(/^[A-Za-z\s]+$/)
    .withMessage("First name should only contain letters"),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password should have at least 8 characters"),

  body("bio")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Bio should have at least 8 characters"),

  // Optional validation for image_url if it exists
  body("image_url")
    .optional()
    .isURL()
    .withMessage("Image URL must be a valid URL"),
];

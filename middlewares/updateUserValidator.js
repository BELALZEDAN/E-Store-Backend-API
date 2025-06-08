import { body } from "express-validator";

export const updateUserValidator = [
  body("full_name.first_name")
    .optional()
    .isLength({ min: 3 })
    .withMessage("First name should have at least 3 characters")
    .matches(/^[A-Za-z]+$/)
    .withMessage("First name should only contain letters"),

  body("full_name.last_name")
    .optional()
    .isLength({ min: 3 })
    .withMessage("Last name should have at least 3 characters")
    .matches(/^[A-Za-z]+$/)
    .withMessage("Last name should only contain letters"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email")
    .normalizeEmail(),

  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  body("bio")
    .optional()
    .isLength({ min: 15 })
    .withMessage("Bio must be at least 15 characters"),
];

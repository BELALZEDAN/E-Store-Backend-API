// middlewares/validateReview.js
import { body, validationResult } from "express-validator";

export const updateReviewValidator = [
    // Validate comment
    body("comment")
        .notEmpty().withMessage("Comment is required")
        .isLength({ min: 2 }).withMessage("Comment must be at least 2 characters"),
];

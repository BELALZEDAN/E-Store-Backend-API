// middlewares/validateReview.js
import { body } from "express-validator";

export const updateReviewValidator = [
    // Validate comment
    body("comment")
        .isString().withMessage("Comment must be only string")
        .isLength({ min: 2 }).withMessage("Comment must be at least 2 characters"),
];

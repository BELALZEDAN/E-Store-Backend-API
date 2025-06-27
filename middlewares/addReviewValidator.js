import { body, param } from 'express-validator';

export const addReviewValidator = [
    // Validate product_id
    body('product_id')
        .notEmpty().withMessage('Product ID is required')
        .isInt().withMessage('Product ID must be an integer')
        .toInt(),

    // Validate comment
    body('comment')
        .isString().withMessage('Comment must be a string')
        .trim()
        .isLength({ min: 1, max: 500 }).withMessage('Comment must be between 1 and 500 characters'),

    // Validate rating
    body('rating')
        .notEmpty().withMessage('Rating is required')
        .isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5')
        .toInt()
];
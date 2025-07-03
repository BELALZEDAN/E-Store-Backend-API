import express from "express";
import {
    addReview,
    getReviewsByProduct,
    updateReview,
    deleteReview,
    toggleLikeReview,
} from "../controllers/review.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { addReviewValidator } from "../middlewares/addReviewValidator.js";
import { handleValidation } from "../middlewares/handleValidation.js";
import { updateReviewValidator } from "../middlewares/updateReviewValidator.js";

const router = express.Router();

// Add a new review (authenticated user required)
router.post("/",
    verifyToken,
    addReviewValidator,
    handleValidation,
    addReview);

// Get all reviews for a specific product (supports search, pagination, and filtering)
router.get("/product/:product_id", getReviewsByProduct);

// Update a review (only the owner can update their review)
router.put("/:review_id",
    verifyToken,
    updateReviewValidator,
    handleValidation,
    updateReview);

// Delete a review (only the owner or an admin can delete)
router.delete("/:review_id", verifyToken, deleteReview);

// Toggle like/unlike on a review by a specific user
router.patch("/like/:review_id", verifyToken, toggleLikeReview);

export default router;
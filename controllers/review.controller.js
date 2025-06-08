import Review from "../models/review.model.js";
import { checkOwnershipOrAdmin } from "../utils/checkOwnershipOrAdmin.js";
import { sendResponse } from "../utils/sendResponse.js";
import mongoose from "mongoose";

// Add Review
export const addReview = async (req, res) => {
    try {
        const { user_id, product_id, comment } = req.body;

        // Check if the user is authenticated (assuming user info is in req.user)
        if (!req.user) {
            return sendResponse(res, 401, false, "User not authenticated");
        }

        // Check if the user ID matches the authenticated user
        if (user_id !== req.user._id.toString()) {
            return sendResponse(res, 403, false, "You are not authorized to add a review for this product");
        }

        // Check if the product ID is valid
        if (!mongoose.Types.ObjectId.isValid(product_id)) {
            return sendResponse(res, 400, false, "Invalid product ID");
        }

        // Check if the user ID is valid
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return sendResponse(res, 400, false, "Invalid user ID");
        }

        // Create a new review
        const newReview = new Review({
            user_id,
            product_id,
            comment,
        });

        // Save the review to the database
        await newReview.save();

        return sendResponse(res, 201, true, "Review added successfully", newReview);
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

// Get Reviews by Product ID
export const getReviewsByProduct = async (req, res) => {
    try {
        const { product_id } = req.params;

        // Validate product ID
        if (!mongoose.Types.ObjectId.isValid(product_id)) {
            return sendResponse(res, 400, false, "Invalid product ID");
        }

        // Query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || ""; // search text in comment
        const minLikes = parseInt(req.query.minLikes) || 0; // filter by likes count

        // Build query object
        const query = {
            product_id,
            comment: { $regex: search, $options: "i" }, // case-insensitive search
        };

        // Fetch reviews and filter manually by likes count if needed
        let reviews = await Review.find(query)
            .populate("user_id", "full_name email")
            .populate("likes", "full_name email")
            .sort({ createdAt: -1 }); // Sort the reviews by creation date in descending order (newest first)

        // Filter by likes count if specified
        if (minLikes > 0) {
            reviews = reviews.filter((review) => review.likes.length >= minLikes);
        }

        // Get total after filtering
        const total = reviews.length;

        // Paginate manually
        const paginatedReviews = reviews.slice(skip, skip + limit);

        const data = {
            total,
            page,
            limit,
            reviews: paginatedReviews,
        }

        return sendResponse(res, 200, true, "Reviews retrieved successfully", data);
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }

    // GET /api/reviews/product/ 6639c2e...?page=1&limit=5&search=great&minLikes=2
};

// Update a Review
export const updateReview = async (req, res) => {
    try {
        const { review_id } = req.params;
        const { comment } = req.body;

        // Validate review ID
        if (!mongoose.Types.ObjectId.isValid(review_id)) {
            return sendResponse(res, 400, false, "Invalid review ID");
        }

        // Find the review to be updated
        const review = await Review.findById(review_id);
        if (!review) {
            return sendResponse(res, 404, false, "Review not found");
        }

        // Check ownership
        const ownershipCheck = checkOwner(review, req.user, "Review");

        if (ownershipCheck) {
            return sendResponse(res, ownershipCheck.status, false, ownershipCheck.message);
        }

        // Update the review with the new comment
        review.comment = comment;

        // Run validation before saving
        await review.validate();

        // Save the updated review
        const updatedReview = await review.save();

        return sendResponse(res, 200, true, "Review updated successfully", updatedReview);
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

// Delete a Review
export const deleteReview = async (req, res) => {
    try {
        const { review_id } = req.params;

        // Check if the review ID is valid
        if (!mongoose.Types.ObjectId.isValid(review_id)) {
            return sendResponse(res, 400, false, "Invalid review ID");
        }

        // Find the review to check ownership (assuming the user is already decoded in the req.user)
        const review = await Review.findById(review_id);

        if (!review) {
            return sendResponse(res, 404, false, "Review not found");
        }

        // Check if the current user is the owner of the review or is an admin
        const ownershipCheck = checkOwnershipOrAdmin(review, req.user, "Review");

        if (ownershipCheck) {
            return sendResponse(res, ownershipCheck.status, false, ownershipCheck.message);
        }

        // Delete the review from the database
        await Review.findByIdAndDelete(review_id);

        return sendResponse(res, 200, true, "Review deleted successfully");
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

// Add or remove like on a review
export const toggleLikeReview = async (req, res) => {
    try {
        const { review_id } = req.params;

        // Get the authenticated user
        const user_id = req.user._id;

        // Validate review ID
        if (!mongoose.Types.ObjectId.isValid(review_id)) {
            return sendResponse(res, 400, false, "Invalid review ID");
        }

        // Find the review by ID
        const review = await Review.findById(review_id);
        if (!review) {
            return sendResponse(res, 404, false, "Review not found");
        }

        // Check if the user already liked the review
        const alreadyLiked = review.likes.includes(user_id.toString());

        if (alreadyLiked) {
            review.likes = review.likes.filter(like => like.toString() !== user_id.toString());
        } else {
            review.likes.push(user_id);
        }

        await review.save();

        return sendResponse(res, 200, true, "Review like status updated successfully", review);
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};


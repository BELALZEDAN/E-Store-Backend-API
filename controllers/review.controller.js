import pool from "../config/db.js";
import { sendResponse } from "../utils/sendResponse.js";

// Add Review
export const addReview = async (req, res) => {
    let connection;
    try {
        const { product_id, comment, rating } = req.body;
        const user_id = req.user?.id;

        // Check authentication
        if (!user_id) {
            return sendResponse(res, 401, false, "User not authenticated");
        }

        // Input validation
        if (!product_id) {
            return sendResponse(res, 400, false, "Product ID is required");
        }
        if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
            return sendResponse(res, 400, false, "Comment is required");
        }
        if (rating && (isNaN(rating) || rating < 1 || rating > 5)) {
            return sendResponse(res, 400, false, "Rating must be between 1 and 5");
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Check if product exists
        const [product] = await connection.query('SELECT id FROM products WHERE id = ?', [product_id]);
        if (product.length === 0) {
            await connection.rollback();
            return sendResponse(res, 404, false, "Product not found");
        }

        // Insert review (multiple reviews allowed, no unique constraint on user/product)
        const [result] = await connection.query(
            'INSERT INTO reviews (user_id, product_id, comment, rating) VALUES (?, ?, ?, ?)',
            [user_id, product_id, comment.trim(), rating || null]
        );

        // Retrieve newly added review with user info
        const [newReview] = await connection.query(
            `SELECT r.*, u.username, u.first_name, u.last_name, u.email 
         FROM reviews r 
         JOIN users u ON r.user_id = u.id 
         WHERE r.id = ?`,
            [result.insertId]
        );

        await connection.commit();

        return sendResponse(res, 201, true, "Review added successfully", newReview[0]);
    } catch (err) {
        if (connection) await connection.rollback();
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    } finally {
        if (connection) connection.release();
    }
};

// Get Reviews by Product ID
export const getReviewsByProduct = async (req, res) => {
    try {
        const { product_id } = req.params;

        // Validate product_id
        if (isNaN(product_id)) {
            return sendResponse(res, 400, false, "Invalid product ID");
        }

        // Pagination parameters
        const current = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (current - 1) * limit;

        // Filters
        const search = req.query.search || "";
        const minLikes = parseInt(req.query.minLikes) || 0;

        // Sorting options (with white-listed fields)
        const allowedSortFields = ["created_at", "like_count"];
        const sortBy = allowedSortFields.includes(req.query.sortBy) ? req.query.sortBy : "created_at";
        const sortOrder = req.query.sortOrder === "asc" ? "ASC" : "DESC";

        // Build base review query with filters and sorting
        let reviewQuery = `
        SELECT 
          r.*, 
          u.username, 
          u.first_name, 
          u.last_name, 
          u.email,
          COUNT(rl.user_id) AS like_count
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN review_likes rl ON r.id = rl.review_id
        WHERE r.product_id = ?
        ${search ? "AND r.comment LIKE ?" : ""}
        GROUP BY r.id
        HAVING like_count >= ?
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
        `;

        const reviewParams = [
            product_id,
            ...(search ? [`%${search}%`] : []),
            minLikes,
            limit,
            offset
        ];

        // Execute main paginated query
        const [reviews] = await pool.query(reviewQuery, reviewParams);

        // Build total count query (for pagination calculation)
        let countQuery = `
        SELECT COUNT(*) AS total
        FROM (
          SELECT r.id
          FROM reviews r
          LEFT JOIN review_likes rl ON r.id = rl.review_id
          WHERE r.product_id = ?
          ${search ? "AND r.comment LIKE ?" : ""}
          GROUP BY r.id
          HAVING COUNT(rl.user_id) >= ?
        ) AS filtered_reviews
        `;

        const countParams = [
            product_id,
            ...(search ? [`%${search}%`] : []),
            minLikes
        ];

        const [totalResult] = await pool.query(countQuery, countParams);
        const total = totalResult[0]?.total || 0;
        const totalPages = Math.ceil(total / limit);

        // Build response payload
        const data = {
            reviews,
            total,
            totalPages,
            current,
            limit,
            hasNextPage: current < totalPages,
            hasPrevPage: current > 1
        };

        return sendResponse(res, 200, true, "Reviews retrieved successfully", data);
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

// Update a Review
export const updateReview = async (req, res) => {
    let connection;
    try {
        const { review_id } = req.params;
        const { comment, rating } = req.body;

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Check if review exists and get owner and product_id
        const [review] = await connection.query(
            'SELECT user_id, product_id FROM reviews WHERE id = ?',
            [review_id]
        );

        if (review.length === 0) {
            await connection.rollback();
            return sendResponse(res, 404, false, "Review not found");
        }

        // Check ownership (user must be owner or admin)
        if (review[0].user_id !== req.user.id && req.user.role !== 'admin') {
            await connection.rollback();
            return sendResponse(res, 403, false, "Not authorized to update this review");
        }

        // Update the review fields (comment and/or rating)
        const updates = [];
        const values = [];

        if (comment !== undefined) {
            updates.push('comment = ?');
            values.push(comment);
        }
        if (rating !== undefined) {
            if (isNaN(rating) || rating < 1 || rating > 5) {
                await connection.rollback();
                return sendResponse(res, 400, false, "Rating must be between 1 and 5");
            }
            updates.push('rating = ?');
            values.push(rating);
        }

        if (updates.length === 0) {
            await connection.rollback();
            return sendResponse(res, 400, false, "No valid fields to update");
        }

        values.push(review_id);

        await connection.query(
            `UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        // Recalculate average rating for the product
        const product_id = review[0].product_id;

        const [ratings] = await connection.query(
            'SELECT rating FROM reviews WHERE product_id = ? AND rating IS NOT NULL',
            [product_id]
        );

        let averageRating = null;
        if (ratings.length > 0) {
            const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
            averageRating = parseFloat((totalRating / ratings.length).toFixed(1));
        }

        // Update average_rating in products table
        if (averageRating !== null) {
            await connection.query(
                'UPDATE products SET average_rating = ? WHERE id = ?',
                [averageRating, product_id]
            );
        } else {
            await connection.query(
                'UPDATE products SET average_rating = NULL WHERE id = ?',
                [product_id]
            );
        }

        // Get the updated review with user info
        const [updatedReview] = await connection.query(
            `SELECT r.*, u.username, u.first_name, u.last_name, u.email 
         FROM reviews r 
         JOIN users u ON r.user_id = u.id 
         WHERE r.id = ?`,
            [review_id]
        );

        await connection.commit();

        return sendResponse(res, 200, true, "Review updated successfully", updatedReview[0]);
    } catch (err) {
        if (connection) await connection.rollback();
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    } finally {
        if (connection) connection.release();
    }
};

// Delete a Review
export const deleteReview = async (req, res) => {
    let connection;
    try {
        const { review_id } = req.params;

        if (!req.user) {
            return sendResponse(res, 401, false, "Unauthorized");
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Check if review exists and get owner
        const [review] = await connection.query(
            'SELECT user_id FROM reviews WHERE id = ?',
            [review_id]
        );

        if (review.length === 0) {
            await connection.rollback();
            return sendResponse(res, 404, false, "Review not found");
        }

        // Check ownership (user must be owner or admin)
        if (review[0].user_id !== req.user.id && req.user.role !== 'admin') {
            await connection.rollback();
            return sendResponse(res, 403, false, "Not authorized to delete this review");
        }

        // Delete the review (CASCADE will handle likes)
        await connection.query('DELETE FROM reviews WHERE id = ?', [review_id]);

        await connection.commit();

        return sendResponse(res, 200, true, "Review deleted successfully");
    } catch (err) {
        if (connection) await connection.rollback();
        console.error("Error deleting review:", err);
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    } finally {
        if (connection) connection.release();
    }
};

// Add or remove like on a review
export const toggleLikeReview = async (req, res) => {
    let connection;
    try {
        if (!req.user) {
            return sendResponse(res, 401, false, "Unauthorized");
        }
        const { review_id } = req.params;
        const user_id = req.user.id;

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Check if review exists
        const [review] = await connection.query(
            'SELECT id FROM reviews WHERE id = ?',
            [review_id]
        );

        if (review.length === 0) {
            await connection.rollback();
            return sendResponse(res, 404, false, "Review not found");
        }

        // Check if already liked
        const [like] = await connection.query(
            'SELECT * FROM review_likes WHERE review_id = ? AND user_id = ?',
            [review_id, user_id]
        );

        let action;
        if (like.length > 0) {
            // Unlike
            await connection.query(
                'DELETE FROM review_likes WHERE review_id = ? AND user_id = ?',
                [review_id, user_id]
            );
            action = 'Like removed';
        } else {
            // Like
            await connection.query(
                'INSERT INTO review_likes (review_id, user_id) VALUES (?, ?)',
                [review_id, user_id]
            );
            action = 'Like added';
        }

        // Get updated like count
        const [likeCount] = await connection.query(
            'SELECT COUNT(*) as count FROM review_likes WHERE review_id = ?',
            [review_id]
        );

        await connection.commit();

        return sendResponse(res, 200, true, "Review like status updated successfully", {
            action,
            likeCount: likeCount[0].count
        });
    } catch (err) {
        if (connection) await connection.rollback();
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    } finally {
        if (connection) connection.release();
    }
};
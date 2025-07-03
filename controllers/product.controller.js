import pool from "../config/db.js";
import { moveImagesToProductFolder, removeImages } from "../middlewares/uploadImages.js";
import { sendResponse } from "../utils/sendResponse.js";

// Create a new product
export const createProduct = async (req, res) => {
  let connection;

  try {
    const {
      product_name,
      description,
      price,
      stock,
      category_id,
      discount = 0,
    } = req.body;

    const seller_id = req.user?.id;
    if (!seller_id) {
      return sendResponse(res, 401, false, "Unauthorized: seller ID missing");
    }

    const files = req.files;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [category] = await connection.query(
      "SELECT id FROM categories WHERE id = ?",
      [category_id]
    );
    if (category.length === 0) {
      await connection.rollback();
      return sendResponse(res, 400, false, "Category does not exist");
    }

    const [seller] = await connection.query(
      "SELECT id FROM users WHERE id = ?",
      [seller_id]
    );
    if (seller.length === 0) {
      await connection.rollback();
      return sendResponse(res, 400, false, "Invalid seller account");
    }

    const [result] = await connection.query(
      `INSERT INTO products 
       (product_name, description, price, stock, category_id, discount, seller_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        product_name,
        description,
        price,
        stock,
        category_id,
        discount,
        seller_id,
      ]
    );

    const productId = result.insertId;

    if (files && files.length > 0) {
      const imagePaths = moveImagesToProductFolder(files, productId);
      const imageInsertValues = imagePaths.map((path) => [productId, path]);
      await connection.query(
        "INSERT INTO product_images (product_id, image_url) VALUES ?",
        [imageInsertValues]
      );
    }

    // Get images with their IDs from the database
    const [imagesResult] = await connection.query(
      "SELECT id, image_url FROM product_images WHERE product_id = ?",
      [productId]
    );

    await connection.commit();

    return sendResponse(res, 201, true, "Product created successfully", {
      id: productId,
      product_name,
      description,
      price,
      stock,
      discount,
      category_id,
      seller_id,
      images: imagesResult, // Array of {id, image_url}
    });
  } catch (err) {
    if (connection) await connection.rollback();
    return sendResponse(
      res,
      500,
      false,
      "Internal server error while creating product",
      null,
      err.message
    );
  } finally {
    if (connection) connection.release();
  }
};

// Get all products with pagination
export const getAllProducts = async (req, res) => {
  let connection;
  try {
    // Pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    connection = await pool.getConnection();

    // Get products with category names
    const [products] = await connection.query(
      `SELECT p.*, c.category_name 
       FROM products p
       JOIN categories c ON p.category_id = c.id
       LIMIT ? OFFSET ?`,
      [limit, skip]
    );

    if (products.length === 0) {
      return sendResponse(res, 200, true, "No products found", {
        products: [],
        total: 0,
        totalPages: 0,
        current: page,
        limit,
        hasNextPage: false,
        hasPrevPage: false,
      });
    }

    const productIds = products.map(p => p.id);

    // Fetch images for all products
    const [images] = await connection.query(
      `SELECT id, product_id, image_url FROM product_images WHERE product_id IN (?)`,
      [productIds]
    );

    // Fetch reviews with user info
    const [allReviews] = await connection.query(
      `SELECT r.*, u.username, u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id IN (?)`,
      [productIds]
    );

    // Fetch likes for these reviews
    const [allLikes] = await connection.query(
      `SELECT review_id FROM review_likes WHERE review_id IN (
         SELECT id FROM reviews WHERE product_id IN (?)
       )`,
      [productIds]
    );

    // Map images by product
    const imagesMap = new Map();
    images.forEach(img => {
      if (!imagesMap.has(img.product_id)) imagesMap.set(img.product_id, []);
      imagesMap.get(img.product_id).push({ id: img.id, image_url: img.image_url });
    });

    // Count likes per review_id
    const likesCountMap = new Map();
    allLikes.forEach(like => {
      likesCountMap.set(like.review_id, (likesCountMap.get(like.review_id) || 0) + 1);
    });

    // Map reviews by product_id including like count
    const reviewsMap = new Map();
    allReviews.forEach(review => {
      if (!reviewsMap.has(review.product_id)) reviewsMap.set(review.product_id, []);
      reviewsMap.get(review.product_id).push({
        id: review.id,
        comment: review.comment,
        rating: review.rating,
        created_at: review.created_at,
        like_count: likesCountMap.get(review.id) || 0,
        user: {
          id: review.user_id,
          username: review.username,
          first_name: review.first_name,
          last_name: review.last_name,
        }
      });
    });

    // Compose final products with images, reviews, average_rating (float)
    const enrichedProducts = products.map(product => {
      const productImages = imagesMap.get(product.id) || [];
      const reviews = reviewsMap.get(product.id) || [];

      const totalRatings = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      const validRatingsCount = reviews.filter(r => r.rating !== null && r.rating !== undefined).length;

      const average_rating = validRatingsCount > 0 ? totalRatings / validRatingsCount : null;

      return {
        ...product,
        images: productImages,
        review_count: reviews.length,
        average_rating,
        reviews,
      };
    });

    // Total products count for pagination
    const [[{ total }]] = await connection.query("SELECT COUNT(*) as total FROM products");

    const totalPages = Math.ceil(total / limit);

    const data = {
      products: enrichedProducts,
      total,
      totalPages,
      current: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1 && page <= totalPages
    };

    return sendResponse(res, 200, true, "Products fetched successfully", data);
  } catch (err) {
    return sendResponse(res, 500, false, "Failed to fetch products", null, err.message);
  } finally {
    if (connection) connection.release();
  }
};

// Get a single product by ID
export const getProductById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params; // Get product ID from URL

    connection = await pool.getConnection(); // Get DB connection

    // Fetch product with category name
    const [products] = await connection.query(
      `SELECT p.*, c.category_name 
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [id]
    );

    if (products.length === 0) {
      return sendResponse(res, 404, false, "Product not found");
    }

    // Fetch product images from product_images table
    const [images] = await connection.query(
      `SELECT id, image_url FROM product_images WHERE product_id = ?`,
      [id]
    );

    // Fetch reviews with user info
    const [reviews] = await connection.query(
      `SELECT r.id, r.comment, r.rating, r.created_at,
              u.id as user_id, u.username, u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ?`,
      [id]
    );

    // Fetch review likes counts for these reviews
    const reviewIds = reviews.map(r => r.id);
    let likesCountMap = new Map();
    if (reviewIds.length > 0) {
      const [likes] = await connection.query(
        `SELECT review_id, COUNT(*) as like_count 
         FROM review_likes 
         WHERE review_id IN (?)
         GROUP BY review_id`,
        [reviewIds]
      );
      likes.forEach(like => {
        likesCountMap.set(like.review_id, like.like_count);
      });
    }

    // Calculate average rating as float without type casting
    let averageRating = null;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      const validRatingsCount = reviews.filter(r => r.rating !== null && r.rating !== undefined).length;
      averageRating = validRatingsCount > 0 ? totalRating / validRatingsCount : null;
    }

    // Construct product response object
    const product = {
      ...products[0],
      images, // array of {id, image_url}
      reviews: reviews.map(r => ({
        id: r.id,
        comment: r.comment,
        rating: r.rating,
        created_at: r.created_at,
        like_count: likesCountMap.get(r.id) || 0, // number of likes for each review
        user: {
          id: r.user_id,
          username: r.username,
          first_name: r.first_name,
          last_name: r.last_name,
        }
      })),
      average_rating: averageRating,
      review_count: reviews.length
    };

    return sendResponse(res, 200, true, "Product fetched successfully", product);
  } catch (err) {
    return sendResponse(
      res,
      500,
      false,
      "Failed to fetch product",
      null,
      err.message
    );
  } finally {
    if (connection) connection.release();
  }
};

// Update a product by ID
export const updateProduct = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const {
      product_name,
      description,
      price,
      stock,
      category_id,
      discount,
      replace_images = false, // flag to replace old images completely
    } = req.body;

    const files = req.files;

    connection = await pool.getConnection();

    // Check if product exists
    const [existing] = await connection.query(
      "SELECT id FROM products WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return sendResponse(res, 404, false, "Product not found");
    }

    // Validate category if provided
    if (category_id) {
      const [category] = await connection.query(
        "SELECT id FROM categories WHERE id = ?",
        [category_id]
      );
      if (category.length === 0) {
        return sendResponse(res, 400, false, "Category does not exist");
      }
    }

    // Build update query dynamically for product fields
    const updates = [];
    const values = [];

    if (product_name) {
      updates.push("product_name = ?");
      values.push(product_name);
    }
    if (description) {
      updates.push("description = ?");
      values.push(description);
    }
    if (price) {
      updates.push("price = ?");
      values.push(price);
    }
    if (stock) {
      updates.push("stock = ?");
      values.push(stock);
    }
    if (category_id) {
      updates.push("category_id = ?");
      values.push(category_id);
    }
    if (discount !== undefined) {
      updates.push("discount = ?");
      values.push(discount);
    }

    if (updates.length > 0) {
      values.push(id);
      await connection.query(
        `UPDATE products SET ${updates.join(", ")} WHERE id = ?`,
        values
      );
    }

    // Handle images in product_images table
    if (replace_images) {
      // Delete old images from disk and DB
      const [oldImages] = await connection.query(
        "SELECT image_url FROM product_images WHERE product_id = ?",
        [id]
      );

      if (oldImages.length > 0) {
        const oldImageUrls = oldImages.map(img => img.image_url);
        removeImages(oldImageUrls); // Your function to delete files from disk

        await connection.query(
          "DELETE FROM product_images WHERE product_id = ?",
          [id]
        );
      }
    }

    // Insert new images if any
    if (files && files.length > 0) {
      const imagePaths = moveImagesToProductFolder(files, id);
      const insertValues = imagePaths.map(path => [id, path]);
      await connection.query(
        "INSERT INTO product_images (product_id, image_url) VALUES ?",
        [insertValues]
      );
    }

    // Fetch updated product with category
    const [updated] = await connection.query(
      `SELECT p.*, c.category_name 
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [id]
    );

    // Fetch product images with their IDs
    const [images] = await connection.query(
      "SELECT id, image_url FROM product_images WHERE product_id = ?",
      [id]
    );

    // Fetch reviews with user info for this product
    const [reviews] = await connection.query(
      `SELECT r.id, r.comment, r.rating, r.created_at,
              u.id as user_id, u.username, u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ?`,
      [id]
    );

    // Get number of likes for each review
    const reviewIds = reviews.map(r => r.id);
    let likesCountMap = new Map();

    if (reviewIds.length > 0) {
      const [likes] = await connection.query(
        `SELECT review_id, COUNT(*) as like_count
         FROM review_likes
         WHERE review_id IN (?)
         GROUP BY review_id`,
        [reviewIds]
      );
      likes.forEach(like => {
        likesCountMap.set(like.review_id, like.like_count);
      });
    }

    // Calculate average rating as float without casting to int
    let averageRating = null;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      const validRatingsCount = reviews.filter(r => r.rating !== null && r.rating !== undefined).length;
      averageRating = validRatingsCount > 0 ? totalRating / validRatingsCount : null;
    }

    // Build final response object
    const productWithReviews = {
      ...updated[0],
      images,
      reviews: reviews.map(r => ({
        id: r.id,
        comment: r.comment,
        rating: r.rating,
        created_at: r.created_at,
        like_count: likesCountMap.get(r.id) || 0,
        user: {
          id: r.user_id,
          username: r.username,
          first_name: r.first_name,
          last_name: r.last_name,
        },
      })),
      average_rating: averageRating,
      review_count: reviews.length,
    };

    return sendResponse(
      res,
      200,
      true,
      "Product updated successfully",
      productWithReviews
    );
  } catch (err) {
    return sendResponse(
      res,
      500,
      false,
      "Failed to update product",
      null,
      err.message
    );
  } finally {
    if (connection) connection.release();
  }
};

// Delete a product by ID
export const deleteProduct = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if product exists
    const [existing] = await connection.query(
      "SELECT id FROM products WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return sendResponse(res, 404, false, "Product not found");
    }

    // Get all image URLs related to this product
    const [images] = await connection.query(
      "SELECT image_url FROM product_images WHERE product_id = ?",
      [id]
    );

    if (images.length > 0) {
      const imageUrls = images.map(img => img.image_url);
      // Remove image files from server (implement this function based on your storage logic)
      removeImages(imageUrls);

      // Delete image records from product_images table
      await connection.query(
        "DELETE FROM product_images WHERE product_id = ?",
        [id]
      );
    }

    // Delete product (will cascade delete reviews if FK constraints set)
    await connection.query("DELETE FROM products WHERE id = ?", [id]);

    await connection.commit();

    return sendResponse(res, 200, true, "Product deleted successfully");
  } catch (err) {
    if (connection) await connection.rollback();

    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return sendResponse(
        res,
        400,
        false,
        "Cannot delete product - it has associated orders or reviews"
      );
    }
    return sendResponse(
      res,
      500,
      false,
      "Failed to delete product",
      null,
      err.message
    );
  } finally {
    if (connection) connection.release();
  }
};

// Get seller products with pagination, search, and sorting
export const getProductsBySeller = async (req, res) => {
  let connection;
  try {
    const seller_id = req.params.sellerId;

    // Pagination params with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search || "";
    const sortBy = ["price", "created_at"].includes(req.query.sortBy)
      ? req.query.sortBy
      : "created_at";

    const order = req.query.order?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    connection = await pool.getConnection();

    // Verify seller exists
    const [sellerExists] = await connection.query(
      `SELECT id FROM users WHERE id = ? AND role = 'seller'`,
      [seller_id]
    );
    if (sellerExists.length === 0) {
      return sendResponse(res, 404, false, "Seller not found");
    }

    // Get paginated products
    const [products] = await connection.query(
      `SELECT p.*, c.category_name 
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.seller_id = ? AND p.product_name LIKE ?
       ORDER BY p.${sortBy} ${order}
       LIMIT ? OFFSET ?`,
      [seller_id, `%${search}%`, limit, offset]
    );

    if (products.length === 0) {
      return sendResponse(res, 200, true, "No products found for this seller", {
        seller_id,
        products: [],
        pagination: {
          total: 0,
          totalPages: 0,
          current: page,
          limit,
          hasNextPage: false,
          hasPrevPage: false
        },
      });
    }

    const productIds = products.map(p => p.id);

    // Get product images
    const [allImages] = await connection.query(
      `SELECT id, product_id, image_url FROM product_images WHERE product_id IN (?)`,
      [productIds]
    );

    const imagesMap = new Map();
    allImages.forEach(img => {
      if (!imagesMap.has(img.product_id)) imagesMap.set(img.product_id, []);
      imagesMap.get(img.product_id).push({ id: img.id, image_url: img.image_url });
    });

    // Get reviews with user info
    const [allReviews] = await connection.query(
      `SELECT r.id, r.product_id, r.comment, r.rating, r.created_at,
              u.id as user_id, u.username, u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id IN (?)`,
      [productIds]
    );

    const reviewIds = allReviews.map(r => r.id);

    // Get likes
    let likesCountMap = new Map();
    if (reviewIds.length > 0) {
      const [likes] = await connection.query(
        `SELECT review_id, COUNT(*) as like_count
         FROM review_likes
         WHERE review_id IN (?)
         GROUP BY review_id`,
        [reviewIds]
      );
      likes.forEach(like => {
        likesCountMap.set(like.review_id, like.like_count);
      });
    }

    const reviewsMap = new Map();
    allReviews.forEach(r => {
      if (!reviewsMap.has(r.product_id)) reviewsMap.set(r.product_id, []);
      reviewsMap.get(r.product_id).push({
        id: r.id,
        comment: r.comment,
        rating: r.rating,
        created_at: r.created_at,
        like_count: likesCountMap.get(r.id) || 0,
        user: {
          id: r.user_id,
          username: r.username,
          first_name: r.first_name,
          last_name: r.last_name,
        },
      });
    });

    const enrichedProducts = products.map(product => ({
      ...product,
      images: imagesMap.get(product.id) || [],
      reviews: reviewsMap.get(product.id) || [],
    }));

    // Get total for pagination
    const [[{ total }]] = await connection.query(
      `SELECT COUNT(*) as total 
       FROM products 
       WHERE seller_id = ? AND product_name LIKE ?`,
      [seller_id, `%${search}%`]
    );

    const totalPages = Math.ceil(total / limit);

    return sendResponse(res, 200, true, "Seller products fetched successfully", {
      seller_id,
      products: enrichedProducts,
      pagination: {
        total,
        totalPages,
        current: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1 && page <= totalPages
      },
    });
  } catch (err) {
    return sendResponse(
      res,
      500,
      false,
      "Failed to fetch seller's products",
      null,
      err.message
    );
  } finally {
    if (connection) connection.release();
  }
};

// Delete all products
export const deleteAllProducts = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Delete all records from products table
    const [result] = await connection.query("DELETE FROM products");

    // Send success response with number of deleted rows
    return sendResponse(
      res,
      200,
      true,
      `All products deleted successfully. Total deleted: ${result.affectedRows}`
    );
  } catch (err) {
    // Send error response on failure
    return sendResponse(
      res,
      500,
      false,
      "Failed to delete all products",
      null,
      err.message
    );
  } finally {
    // Release DB connection back to pool
    if (connection) connection.release();
  }
};

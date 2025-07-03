import fs from 'fs';
import pool from "../config/db.js";
import dotenv from "dotenv";
import { generateToken } from "../utils/generateToken.js";
import { comparePasswords, hashPassword } from "../utils/passwordUtils.js";
import { sendResponse } from "../utils/sendResponse.js";
import { generateUniqueUsername } from "../utils/usernameUtils.js";
import { moveImageToFolder } from '../middlewares/uploadImage.js';
import path from 'path';


dotenv.config();

// Register new user
export const registerUser = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      role = "user",
      banned_until = null,
      bio = null,
    } = req.body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      if (req.file) fs.unlinkSync(req.file.path);
      return sendResponse(res, 400, false, "Missing required fields");
    }

    // Generate a unique username
    const username = await generateUniqueUsername(first_name, last_name);

    // Check if user already exists
    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (existingUsers.length > 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return sendResponse(res, 409, false, "Username or Email already exists.");
    }

    // Hash password
    const hashedPassword = await hashPassword(password, +process.env.HASHINGSALT || 12);

    // Insert user
    const [result] = await pool.query(
      `INSERT INTO users 
        (username, first_name, last_name, email, password, role, banned_until, bio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, first_name, last_name, email, hashedPassword, role, banned_until, bio]
    );

    const userId = result.insertId;

    // Handle image upload
    let relativePath;
    if (req.file) {
      try {
        relativePath = moveImageToFolder(req.file, 'users', userId);
        await pool.query("UPDATE users SET image_url = ? WHERE id = ?", [relativePath, userId]);
      } catch (fileError) {
        console.error("Image processing error:", fileError);
        fs.unlinkSync(req.file.path);
        return sendResponse(res, 500, false, "Image processing failed");
      }
    }

    // Generate token using the helper function
    const token = generateToken({ id: userId, role });

    const data = {
      user: {
        id: userId,
        username,
        first_name,
        last_name,
        email,
        role,
        bio,
        profile_image: relativePath
      },
      token,
    };

    return sendResponse(res, 201, true, "User registered successfully", data);

  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error(error);
    return sendResponse(res, 500, false, "Internal server error", null, error.message);
  }
};

// User login
export const loginUser = async (req, res) => {
  let connection;

  try {
    const { email, password } = req.body;

    // Get a connection from the pool
    connection = await pool.getConnection();

    // Retrieve user by email
    const [users] = await connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    // Check if user exists and password is correct
    const user = users[0];
    const isValid = user && await comparePasswords(password, user.password);

    if (!isValid) {
      return sendResponse(res, 400, false, "Invalid email or password");
    }

    // Optional: Check if user is banned
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      return sendResponse(res, 403, false, "Your account is temporarily banned");
    }

    // Generate JWT token
    const token = generateToken({ id: user.id, role: user.role });

    // Prepare user data to return (without sensitive fields)
    const userData = {
      id: user.id,
      username: user.username,
      full_name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      role: user.role,
      bio: user.bio,
      image_url: user.image_url,
    };

    // Send success response with token and user info
    return sendResponse(res, 200, true, "User logged in successfully", {
      data: userData,
      token,
    });

  } catch (err) {
    // Log error and return server error response
    console.error("Login error:", err);
    return sendResponse(res, 500, false, "Internal server error", null, err.message);
  } finally {
    // Release the DB connection
    if (connection) connection.release();
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();

    // Parse pagination query parameters with default values
    const currentPage = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (currentPage - 1) * limit;

    // Get total user count for pagination metadata
    const [countResult] = await connection.query('SELECT COUNT(*) AS total FROM users');
    const totalUsers = countResult[0].total;
    const totalPages = Math.ceil(totalUsers / limit);

    // Get paginated users
    const [users] = await connection.query(
      `SELECT id, first_name, last_name, email, role, image_url, bio, created_at, updated_at
       FROM users
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Add full_name field to match previous format
    const formattedUsers = users.map(user => ({
      ...user,
      full_name: `${user.first_name} ${user.last_name}`
    }));

    return sendResponse(res, 200, true, "Users fetched successfully", {
      users: formattedUsers,
      pagination: {
        total: totalUsers,
        totalPages,
        current: currentPage,
        limit,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      }
    });
  } catch (err) {
    return sendResponse(res, 500, false, "Internal server error", null, err.message);
  } finally {
    if (connection) connection.release();
  }
};

// Get user by ID
export const getSingleUser = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    connection = await pool.getConnection();
    const [users] = await connection.query(
      'SELECT id, first_name, last_name, email, role, image_url, bio, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return sendResponse(res, 404, false, "User not found");
    }

    const user = users[0];
    // Format full_name for consistency with MongoDB version
    const formattedUser = {
      ...user,
      full_name: `${user.first_name} ${user.last_name}`
    };

    return sendResponse(res, 200, true, "User fetched successfully", formattedUser);
  } catch (err) {
    return sendResponse(res, 500, false, "Internal server error", null, err.message);
  } finally {
    if (connection) connection.release();
  }
};

// Update user
export const updateUser = async (req, res) => {
  let connection;

  try {
    const { id } = req.params;
    const updates = { ...req.body };

    connection = await pool.getConnection();

    // Check if user exists by id
    const [existingUsers] = await connection.query(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );
    if (existingUsers.length === 0) {
      return sendResponse(res, 404, false, "User not found");
    }

    const user = existingUsers[0];
    const updateFields = [];
    const updateValues = [];

    // Hash password if provided
    if (updates.password) {
      const hashedPassword = await hashPassword(updates.password, +process.env.HASHINGSALT);
      updateFields.push("password = ?");
      updateValues.push(hashedPassword);
    }

    // Update first name if provided
    if (updates.first_name) {
      updateFields.push("first_name = ?");
      updateValues.push(updates.first_name);
    }

    // Update last name if provided
    if (updates.last_name) {
      updateFields.push("last_name = ?");
      updateValues.push(updates.last_name);
    }

    // Update email if provided
    if (updates.email) {
      updateFields.push("email = ?");
      updateValues.push(updates.email);
    }

    // Update bio if provided
    if (updates.bio) {
      updateFields.push("bio = ?");
      updateValues.push(updates.bio);
    }

    // Handle image update: delete old image, move new one
    if (req.file) {
      const oldImageRelative = user.image_url;
      const oldImageAbsolute = path.resolve(`.${oldImageRelative}`);

      if (oldImageRelative && fs.existsSync(oldImageAbsolute)) {
        fs.unlinkSync(oldImageAbsolute);
      }

      const newImagePath = moveImageToFolder(req.file, "users", id);
      updateFields.push("image_url = ?");
      updateValues.push(newImagePath);
    }

    // If no fields to update, return error
    if (updateFields.length === 0) {
      return sendResponse(res, 400, false, "No valid fields to update");
    }

    // Execute update query
    const updateQuery = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
    await connection.query(updateQuery, [...updateValues, id]);

    // Retrieve updated user data
    const [updatedUsers] = await connection.query(
      "SELECT id, first_name, last_name, email, role, image_url, bio FROM users WHERE id = ?",
      [id]
    );

    const updatedUser = updatedUsers[0];

    // Format user data before sending
    const formattedUser = {
      ...updatedUser,
      full_name: `${updatedUser.first_name} ${updatedUser.last_name}`,
    };

    return sendResponse(res, 200, true, "User updated", formattedUser);

  } catch (err) {
    console.error("Update User Error:", err);
    return sendResponse(res, 500, false, "Internal server error", null, err.message);
  } finally {
    if (connection) connection.release();
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    connection = await pool.getConnection();
    const [result] = await connection.query(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return sendResponse(res, 404, false, "User not found");
    }

    return sendResponse(res, 200, true, "User deleted");
  } catch (err) {
    return sendResponse(res, 500, false, "Internal server error", null, err.message);
  } finally {
    if (connection) connection.release();
  }
};

// User logout
export const logout = (req, res) => {
  return sendResponse(res, 200, true, "User logged out successfully");
};

// Delete all users
export const deleteAllUsers = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Delete all products first to avoid FK constraint errors
    await connection.query("DELETE FROM products");

    // Then delete all users
    const [result] = await connection.query("DELETE FROM users");

    await connection.commit();

    return sendResponse(
      res,
      200,
      true,
      `All users deleted successfully. Total deleted: ${result.affectedRows}`
    );
  } catch (err) {
    if (connection) await connection.rollback();
    return sendResponse(res, 500, false, "Internal server error", null, err.message);
  } finally {
    if (connection) connection.release();
  }
};


import pool from "../config/db.js";
import { sendResponse } from "../utils/sendResponse.js";

// Create a new category
export const createCategory = async (req, res) => {
    let connection;
    try {
        const { category_name, description } = req.body;
        connection = await pool.getConnection();

        // Check if the category already exists
        const [existingCategory] = await connection.query(
            "SELECT id FROM categories WHERE category_name = ?",
            [category_name]
        );

        if (existingCategory.length > 0) {
            return sendResponse(res, 400, false, "Category already exists");
        }

        // Create a new category
        const [result] = await connection.query(
            "INSERT INTO categories (category_name, description) VALUES (?, ?)",
            [category_name, description]
        );

        // Get the newly created category
        const [newCategory] = await connection.query(
            "SELECT * FROM categories WHERE id = ?",
            [result.insertId]
        );

        return sendResponse(res, 201, true, "Category created successfully", newCategory[0]);
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    } finally {
        if (connection) connection.release();
    }
};

// Get all categories
export const getAllCategories = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [categories] = await connection.query("SELECT * FROM categories");
        return sendResponse(res, 200, true, "Categories retrieved successfully", categories);
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    } finally {
        if (connection) connection.release();
    }
};

// Get a single category by ID
export const getCategoryById = async (req, res) => {
    let connection;
    try {
        const { category_id } = req.params;
        connection = await pool.getConnection();

        // Check if category exists
        const [category] = await connection.query(
            "SELECT * FROM categories WHERE id = ?",
            [category_id]
        );

        if (category.length === 0) {
            return sendResponse(res, 404, false, "Category not found");
        }

        return sendResponse(res, 200, true, "Category retrieved successfully", category[0]);
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    } finally {
        if (connection) connection.release();
    }
};

// Update a category
export const updateCategory = async (req, res) => {
    let connection;
    try {
        const { category_id } = req.params;
        const { category_name, description } = req.body;
        connection = await pool.getConnection();

        // Check if the category exists
        const [category] = await connection.query(
            "SELECT * FROM categories WHERE id = ?",
            [category_id]
        );

        if (category.length === 0) {
            return sendResponse(res, 404, false, "Category not found");
        }

        // Update the category fields
        await connection.query(
            "UPDATE categories SET category_name = ?, description = ? WHERE id = ?",
            [
                category_name || category[0].category_name,
                description || category[0].description,
                category_id
            ]
        );

        // Get the updated category
        const [updatedCategory] = await connection.query(
            "SELECT * FROM categories WHERE id = ?",
            [category_id]
        );

        return sendResponse(res, 200, true, "Category updated successfully", updatedCategory[0]);
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    } finally {
        if (connection) connection.release();
    }
};

// Delete a category
export const deleteCategory = async (req, res) => {
    let connection;
    try {
        const { category_id } = req.params;
        connection = await pool.getConnection();

        // Check if category exists
        const [category] = await connection.query(
            "SELECT * FROM categories WHERE id = ?",
            [category_id]
        );

        if (category.length === 0) {
            return sendResponse(res, 404, false, "Category not found");
        }

        // Delete the category
        await connection.query(
            "DELETE FROM categories WHERE id = ?",
            [category_id]
        );

        return sendResponse(res, 200, true, "Category deleted successfully");
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    } finally {
        if (connection) connection.release();
    }
};

// Delete all categories
export const deleteAllCategories = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        // Delete all categories from the database
        const [result] = await connection.query("DELETE FROM categories");

        return sendResponse(
            res,
            200,
            true,
            `All categories deleted successfully. Total deleted: ${result.affectedRows}`
        );
    } catch (err) {
        return sendResponse(
            res,
            500,
            false,
            "Failed to delete all categories",
            null,
            err.message
        );
    } finally {
        if (connection) connection.release();
    }
};

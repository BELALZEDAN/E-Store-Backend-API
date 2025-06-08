import Category from "../models/category.model.js";
import { sendResponse } from "../utils/sendResponse.js"; // Assuming a utility to send responses

// Create a new category
export const createCategory = async (req, res) => {
    try {
        const { category_name, description } = req.body;

        // Check if the category already exists
        const existingCategory = await Category.findOne({ category_name });
        if (existingCategory) {
            return sendResponse(res, 400, false, "Category already exists");
        }

        // Create a new category
        const newCategory = new Category({
            category_name,
            description,
        });

        // Save the category to the database
        await newCategory.save();

        // Return success response with the created category
        return sendResponse(res, 201, true, "Category created successfully", newCategory);
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

// Get all categories
export const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        return sendResponse(res, 200, true, "Categories retrieved successfully", categories);
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

// Get a single category by ID
export const getCategoryById = async (req, res) => {
    try {
        const { category_id } = req.params;

        // Check if category exists
        const category = await Category.findById(category_id);
        if (!category) {
            return sendResponse(res, 404, false, "Category not found");
        }

        return sendResponse(res, 200, true, "Category retrieved successfully", category);
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

// Update a category
export const updateCategory = async (req, res) => {
    try {
        const { category_id } = req.params;
        const { category_name, description } = req.body;

        // Check if the category exists
        const category = await Category.findById(category_id);
        if (!category) {
            return sendResponse(res, 404, false, "Category not found");
        }

        // Update the category fields
        category.category_name = category_name || category.category_name;
        category.description = description || category.description;

        // Save the updated category
        await category.save();

        return sendResponse(res, 200, true, "Category updated successfully", category);
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

// Delete a category
export const deleteCategory = async (req, res) => {
    try {
        const { category_id } = req.params;

        // Check if category exists
        const category = await Category.findById(category_id);
        if (!category) {
            return sendResponse(res, 404, false, "Category not found");
        }

        // Delete the category
        await category.remove();

        return sendResponse(res, 200, true, "Category deleted successfully");
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

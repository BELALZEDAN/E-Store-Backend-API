import express from "express";
import {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    deleteAllCategories,
} from "../controllers/category.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { createCategoryValidator } from "../middlewares/createCategoryValidator.js";
import { handleValidation } from "../middlewares/handleValidation.js";
import { updateCategoryValidator } from "../middlewares/updateCategoryValidator.js";

// Routes for category operations
const router = express.Router();

// Create a new category
router.post("/",
    verifyToken,
    createCategoryValidator,
    handleValidation,
    createCategory);

// Get all categories
router.get("/", getAllCategories);

// Get a category by ID
router.get("/:category_id", getCategoryById);

// Update category by ID
router.put("/:category_id",
    verifyToken,
    updateCategoryValidator,
    handleValidation,
    updateCategory);

// DELETE all categories - only for development environment
router.delete("/delete-all", verifyToken, deleteAllCategories); // This route is available only in development mode

// Delete category by ID
router.delete("/:category_id", verifyToken, deleteCategory);

export default router;

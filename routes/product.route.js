import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsBySeller,
  deleteAllProducts,
} from "../controllers/product.controller.js";
import { validateProductData } from "../middlewares/validateProductData.js";
import { uploadImages } from "../middlewares/uploadImages.js";
import { verifyToken } from "../middlewares/verifyToken.js"; // Verify the token
import { handleValidation } from "../middlewares/handleValidation.js";

const router = express.Router();

// Route to create a new product (protected by verifyToken middleware)
router.post("/",
  verifyToken,
  uploadImages,
  validateProductData,
  handleValidation,
  createProduct);

// Route to get all products with pagination (protected)
router.get("/", getAllProducts);

// Route to get a single product by ID (protected)
router.get("/:id", getProductById);

// Route to update a product by ID (protected by verifyToken middleware)
router.put(
  "/:id",
  verifyToken,
  uploadImages,
  validateProductData,
  handleValidation,
  updateProduct
);

// DELETE all products - only for development environment
router.delete("/delete-all", verifyToken, deleteAllProducts) // This route is available only in development mode

// Route to delete a product by ID (protected by verifyToken middleware)
router.delete("/:id", verifyToken, deleteProduct);

// Route to get all products of a specific seller
router.get("/seller/:sellerId/products", getProductsBySeller);

export default router;

import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
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

// Route to delete a product by ID (protected by verifyToken middleware)
router.delete("/:id", verifyToken, deleteProduct);

export default router;

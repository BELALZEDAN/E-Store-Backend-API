import express from "express";
import {
  addToCart,
  removeFromCart,
  getCart,
  clearCart,
} from "../controllers/cart.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { addToCartValidator } from "../middlewares/addToCartValidator.js";
import { handleValidation } from "../middlewares/handleValidation.js";

const router = express.Router();

// GET /api/cart → Get current user's cart
router.get("/", verifyToken, getCart);

// POST /api/cart → Add/update products in the cart
router.post(
  "/",
  verifyToken,
  addToCartValidator,
  handleValidation,
  addToCart
);

// DELETE /api/cart → Clear the entire cart
router.delete("/", verifyToken, clearCart);

// DELETE /api/cart/product/:product_id → Remove a specific product from cart
router.delete("/product/:product_id", verifyToken, removeFromCart);

export default router;

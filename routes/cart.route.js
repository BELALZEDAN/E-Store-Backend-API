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

// Route to add or update products in the cart
router.post("/",
  verifyToken,
  addToCartValidator,
  handleValidation,
  addToCart);

// Route to remove a specific product from the cart
router.delete("/:user_id/:product_id",
  verifyToken,
  removeFromCart);

// Route to get the cart of a specific user
router.get("/:user_id", verifyToken, getCart);

// Route to clear all products from the user's cart
router.delete("/:user_id", verifyToken, clearCart);

export default router;

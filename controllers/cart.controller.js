import mongoose from "mongoose";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import { sendResponse } from "../utils/sendResponse.js";

// Create or update the user's cart
export const addToCart = async (req, res) => {
  try {
    const { user_id, products } = req.body;

    // Verify that the user_id from request matches the one in the token
    if (user_id !== req.user.id) {
      return sendResponse(res, 403, false, "Access denied. User ID mismatch");
    }

    // Check if the products array is not empty
    if (!products || products.length === 0) {
      return sendResponse(res, 400, false, "Products array is empty");
    }

    // Check if each product has a valid product ID and quantity
    for (let item of products) {
      if (!item.product || item.quantity < 1) {
        return sendResponse(res, 400, false, "Invalid product or quantity");
      }

      // Check if the product exists in the database
      const product = await Product.findById(item.product);
      if (!product) {
        return sendResponse(
          res,
          404,
          false,
          `Product with id ${item.product} not found`
        );
      }
    }

    // Check if the user already has a cart
    let cart = await Cart.findOne({ user_id });

    if (!cart) {
      // If no cart exists, create a new one
      cart = new Cart({
        user_id,
        products: products, // Add all products to the cart
      });
    } else {
      // If cart exists, update it with the new products
      for (let item of products) {
        const existingProductIndex = cart.products.findIndex(
          (productItem) => productItem.product.toString() === item.product
        );

        if (existingProductIndex !== -1) {
          // If the product is already in the cart, update the quantity
          cart.products[existingProductIndex].quantity += item.quantity;
        } else {
          // If the product is not in the cart, add it
          cart.products.push(item);
        }
      }
    }

    // Save the cart after modifications
    await cart.save();

    // Return the updated cart
    sendResponse(res, 200, true, "Cart updated", cart);
  } catch (err) {
    // res.status(500).json({ message: "Server error", error: err.message });
    sendResponse(res, 500, false, "Internal server error", null, err.message);
  }
};

// Remove product from the cart
export const removeFromCart = async (req, res) => {
  try {
    const { user_id, product_id } = req.params;

    // Verify that the user_id from request matches the one in the token
    if (user_id !== req.user.id) {
      return sendResponse(res, 403, false, "Access denied. User ID mismatch");
    }

    // Validate both user_id and product_id
    if (
      !mongoose.Types.ObjectId.isValid(user_id) ||
      !mongoose.Types.ObjectId.isValid(product_id)
    ) {
      return sendResponse(res, 400, false, "Invalid product or user ID");
    }

    // Find the cart associated with the user
    const cart = await Cart.findOne({ user_id });

    if (!cart) {
      return sendResponse(res, 404, false, "Cart not found");
    }

    // Find the index of the product in the cart
    const productIndex = cart.products.findIndex(
      (item) => item.product.toString() === product_id
    );

    if (productIndex === -1) {
      return sendResponse(res, 404, false, "Product not found in your cart");
    }

    // Remove the product from the cart
    cart.products.splice(productIndex, 1);

    if (cart.products.length === 0) {
      // Delete the cart if it's now empty
      await cart.deleteOne();
      return sendResponse(
        res,
        200,
        true,
        "Product removed and cart deleted because it became empty"
      );
    }

    // Save the updated cart
    await cart.save();

    sendResponse(res, 200, true, "Product removed from cart", cart);
  } catch (err) {
    console.error("Server error:", err);
    sendResponse(res, 500, false, "Internal server error", null, err.message);
  }
};

// Get the user's cart
export const getCart = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Verify that the user_id from request matches the one in the token
    if (user_id !== req.user.id) {
      return sendResponse(res, 403, false, "Access denied. User ID mismatch");
    }

    // Validate user_id
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return sendResponse(res, 400, false, "Invalid user ID");
    }

    // Find the cart by user_id
    const cart = await Cart.findOne({ user_id }).populate("products.product");

    if (!cart) {
      return sendResponse(res, 404, false, "Cart not found");
    }

    sendResponse(res, 200, true, "Cart fetched successfully", cart);
  } catch (err) {
    sendResponse(res, 500, false, "Internal server error", null, err.message);
  }
};

// Clear the cart (remove all products)
export const clearCart = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Verify that the user_id from request matches the one in the token
    if (user_id !== req.user.id) {
      return sendResponse(res, 403, false, "Access denied. User ID mismatch");
    }

    // Validate user_id
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return sendResponse(res, 400, false, "Invalid user ID");
    }

    // Find and delete the user's cart
    const cart = await Cart.findOneAndDelete({ user_id });

    if (!cart) {
      return sendResponse(res, 404, false, "Cart not found");
    }

    // Return success message
    sendResponse(res, 200, true, "Cart cleared");
  } catch (err) {
    sendResponse(res, 500, false, "Internal server error", null, err.message);
  }
};

import pool from "../config/db.js";
import { sendResponse } from "../utils/sendResponse.js";

// Create or update the user's cart
export const addToCart = async (req, res) => {
  let connection;
  try {
    const userId = req.user.id; // Get authenticated user's ID
    const { products } = req.body; // Array of products to add/update in cart

    // Validate input: check if products array exists and is not empty
    if (!products || products.length === 0) {
      return sendResponse(res, 400, false, "Your cart is empty. Add products before submitting");
    }

    // Merge duplicate products by summing their quantities to avoid duplicates in DB
    const combinedProducts = products.reduce((acc, item) => {
      const found = acc.find(p => p.product === item.product);
      if (found) found.quantity += item.quantity;
      else acc.push({ product: item.product, quantity: item.quantity });
      return acc;
    }, []);

    connection = await pool.getConnection();
    await connection.beginTransaction(); // Start DB transaction for atomicity

    // Verify each product exists and quantity is valid (>0)
    const productChecks = await Promise.all(
      combinedProducts.map(item => connection.query("SELECT id FROM products WHERE id = ?", [item.product]))
    );
    for (let i = 0; i < combinedProducts.length; i++) {
      if (combinedProducts[i].quantity < 1 || productChecks[i][0].length === 0) {
        // If invalid, rollback transaction and return error
        await connection.rollback();
        return sendResponse(res, 400, false, `Invalid product or quantity for product ID ${combinedProducts[i].product}`);
      }
    }

    // Check if user already has a cart
    let [cart] = await connection.query("SELECT id FROM carts WHERE user_id = ?", [userId]);
    let cartId;
    if (cart.length === 0) {
      // No cart exists: create a new cart for the user
      const [result] = await connection.query("INSERT INTO carts (user_id) VALUES (?)", [userId]);
      cartId = result.insertId; // Get the new cart's ID
    } else {
      cartId = cart[0].id; // Existing cart's ID
    }

    // Get existing items in the cart
    const [existingItems] = await connection.query(
      "SELECT id, product_id, quantity FROM cart_items WHERE cart_id = ?",
      [cartId]
    );

    // Create a map for quick lookup of existing products in cart
    const existingMap = new Map();
    existingItems.forEach(item => existingMap.set(item.product_id, item));

    // Prepare DB queries: update quantity if product exists, else insert new product
    const queries = combinedProducts.map(item => {
      if (existingMap.has(item.product)) {
        const existingItem = existingMap.get(item.product);
        const newQuantity = existingItem.quantity + item.quantity; // Add new quantity to existing
        return connection.query("UPDATE cart_items SET quantity = ? WHERE id = ?", [newQuantity, existingItem.id]);
      } else {
        // Insert new product with its quantity to cart_items
        return connection.query("INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)", [cartId, item.product, item.quantity]);
      }
    });

    await Promise.all(queries); // Execute all queries in parallel
    await connection.commit(); // Commit transaction to save changes

    // Fetch updated cart with product details to send back to client
    const [updatedCart] = await connection.query(
      `SELECT ci.id, ci.product_id, ci.quantity, p.product_name, p.price, p.discount 
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cartId]
    );

    // Return success response with updated cart products
    return sendResponse(res, 200, true, "Cart updated", { products: updatedCart });

  } catch (err) {
    // Rollback DB transaction on any error
    if (connection) await connection.rollback();
    // Return internal server error with error message
    return sendResponse(res, 500, false, "Internal server error", null, err.message);
  } finally {
    // Release DB connection no matter what
    if (connection) connection.release();
  }
};

// Remove a specific product from the user's cart
export const removeFromCart = async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    const { product_id } = req.params;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get user's cart
    const [cartRows] = await connection.query("SELECT id FROM carts WHERE user_id = ?", [userId]);
    if (cartRows.length === 0) {
      return sendResponse(res, 404, false, "Cart not found");
    }

    const cartId = cartRows[0].id;

    // Check if the product exists in the cart
    const [cartItem] = await connection.query(
      "SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?",
      [cartId, product_id]
    );

    if (cartItem.length === 0) {
      return sendResponse(res, 404, false, "Product not found in your cart");
    }

    // Remove product
    await connection.query("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?", [cartId, product_id]);

    // Fetch updated cart
    const [updatedCart] = await connection.query(
      `SELECT ci.id, ci.product_id, ci.quantity, p.product_name, p.price, p.discount
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cartId]
    );

    await connection.commit();
    return sendResponse(res, 200, true, "Product removed from cart", { products: updatedCart });
  } catch (err) {
    if (connection) await connection.rollback();
    return sendResponse(res, 500, false, "Internal server error", null, err.message);
  } finally {
    if (connection) connection.release();
  }
};
// Get the user's cart
export const getCart = async (req, res) => {
  let connection;
  try {
    const userId = req.user.id; // Get user ID from the token directly

    connection = await pool.getConnection();

    // Find the cart for this user
    const [cart] = await connection.query(
      "SELECT id FROM carts WHERE user_id = ?",
      [userId]
    );

    if (cart.length === 0) {
      return sendResponse(res, 404, false, "Cart not found");
    }

    const cartId = cart[0].id;

    // Get cart items joined with product details
    const [cartItems] = await connection.query(
      `SELECT ci.id, ci.product_id, ci.quantity, p.product_name, p.price, p.discount, 
              p.description, p.stock, p.category_id
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = ?`,
      [cartId]
    );

    // Send back the cart products
    return sendResponse(res, 200, true, "Cart fetched successfully", { products: cartItems });

  } catch (err) {
    return sendResponse(res, 500, false, "Internal server error", null, err.message);
  } finally {
    if (connection) connection.release();
  }
};

// Clear the cart (remove all products)
export const clearCart = async (req, res) => {
  let connection;
  try {
    const userId = req.user.id; // Get user ID from token

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Find the cart for the user
    const [cart] = await connection.query(
      "SELECT id FROM carts WHERE user_id = ?",
      [userId]
    );

    if (cart.length === 0) {
      // If no cart, just return success (idempotent behavior)
      await connection.commit();
      return sendResponse(res, 200, true, "Cart is already empty");
    }

    const cartId = cart[0].id;

    // Delete all cart items but keep the cart record itself
    await connection.query("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);

    await connection.commit();
    return sendResponse(res, 200, true, "Cart cleared successfully");
  } catch (err) {
    if (connection) await connection.rollback();
    return sendResponse(res, 500, false, "Internal server error", null, err.message);
  } finally {
    if (connection) connection.release();
  }
};

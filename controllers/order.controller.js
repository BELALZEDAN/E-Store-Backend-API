import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { sendResponse } from "../utils/sendResponse.js";

// Create a new order
export const createOrder = async (req, res) => {
    try {
        // Destructure the necessary fields from the request body
        const { user_id, shipping_info, payment_info, products, total_price, status } = req.body;

        // Check if the products array is provided and is not empty
        if (!products || products.length === 0) {
            return sendResponse(res, 400, false, "Products array is empty");
        }

        // Loop through the products to verify each one exists in the database
        for (let item of products) {
            const product = await Product.findById(item.product);
            if (!product) {
                // Return an error if the product is not found in the database
                return sendResponse(res, 404, false, `Product with id ${item.product} not found`);
            }
        }

        // Create a new order with the provided data
        const newOrder = new Order({
            user_id,
            shipping_info,
            payment_info,
            products,
            total_price,
            status: status || "pending", // Default status to "pending" if not provided
        });

        // Save the new order to the database
        await newOrder.save();

        // Return a success response with the created order
        return sendResponse(res, 201, true, "Order created successfully", newOrder);
    } catch (err) {
        // Catch any errors and return an error response
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};


// Get all orders
export const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Default to page 1 and limit 10
        // Use skip and limit for pagination
        const orders = await Order.find()
            .skip((page - 1) * limit) // Skip documents for pagination
            .limit(limit) // Limit results to the specified number
            .populate("user_id") // Populate user data
            .populate("products.product"); // Populate product data

        // Return response with retrieved orders
        return sendResponse(res, 200, true, "Orders retrieved successfully", orders);
    } catch (err) {
        // Handle errors and send an internal server error response
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};


// Get single order by ID
export const getOrderById = async (req, res) => {
    try {
        const { order_id } = req.params;

        // Validate if the provided order_id is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(order_id)) {
            return sendResponse(res, 400, false, "Invalid order ID format. Expected a valid ObjectId.");
        }

        // Fetch the order by ID and populate related fields
        const order = await Order.findById(order_id)
            .populate("user_id") // Populate user data
            .populate("products.product"); // Populate product data

        // If the order does not exist, return a 404 error
        if (!order) {
            return sendResponse(res, 404, false, "Order not found");
        }

        // Return the retrieved order with a 200 status
        return sendResponse(res, 200, true, "Order retrieved successfully", order);
    } catch (err) {
        // Handle any errors and return a 500 server error with the error message
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

// Delete order by ID
export const deleteOrder = async (req, res) => {
    try {
        const { order_id } = req.params;

        // Validate if the provided order_id is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(order_id)) {
            // Return a 400 error if the ObjectId is invalid
            return sendResponse(res, 400, false, "Invalid order ID format. Expected a valid ObjectId.");
        }

        // Attempt to find and delete the order by ID
        const order = await Order.findByIdAndDelete(order_id);

        // If no order is found, return a 404 error
        if (!order) {
            return sendResponse(res, 404, false, "Order not found");
        }

        // If order is deleted successfully, return a success message
        return sendResponse(res, 200, true, "Order deleted successfully");
    } catch (err) {
        // If an internal server error occurs, return a 500 error with the message
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};


// Get orders by user ID
export const getOrdersByUser = async (req, res) => {
    try {
        let { user_id } = req.params;

        // Check if user_id is provided in the request parameters
        if (!user_id) {
            return sendResponse(res, 400, false, "User ID is required");
        }

        // Validate if the provided user_id is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            // Return a 400 error if the ObjectId format is invalid
            return sendResponse(res, 400, false, "Invalid user ID format. Expected a valid ObjectId.");
        }

        // Find orders that belong to the specified user_id
        const orders = await Order.find({ user_id: user_id })
            .populate("user_id") // Populate user data in the response
            .populate("products.product"); // Populate product data in the response

        // If no orders are found for this user, return a 404 error
        if (orders.length === 0) {
            return sendResponse(res, 404, false, "No orders found for this user");
        }

        // Return the found orders along with a success message
        return sendResponse(res, 200, true, "Orders retrieved successfully", orders);
    } catch (err) {
        // Handle internal server errors
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

// Update order
export const updateOrder = async (req, res) => {
    try {
        const { order_id } = req.params;
        const {
            shipping_info,
            payment_info,
            products,
            total_price,
            status,
        } = req.body;

        // Validate the format of the order ID to ensure it's a valid Mongo ObjectId
        if (!mongoose.Types.ObjectId.isValid(order_id)) {
            return sendResponse(res, 400, false, "Invalid order ID format. Expected a valid ObjectId.");
        }

        // Try to find the order in the database using the provided ID
        const order = await Order.findById(order_id);
        if (!order) {
            return sendResponse(res, 404, false, "Order not found");
        }

        // If a list of products is provided in the update request
        if (products) {
            // Ensure the products field is a non-empty array
            if (!Array.isArray(products) || products.length === 0) {
                return sendResponse(res, 400, false, "Products array is empty or invalid");
            }

            // Loop through each product item and check if it exists in the database
            for (let item of products) {
                const productExists = await Product.findById(item.product);
                if (!productExists) {
                    return sendResponse(res, 404, false, `Product with id ${item.product} not found`);
                }
            }

            // If all products are valid, update the products field in the order
            order.products = products;
        }

        // If a status is provided, validate it against a list of allowed values
        if (status) {
            const allowedStatuses = [
                "pending",
                "processing",
                "shipped",
                "out_for_delivery",
                "delivered",
                "cancelled",
                "refunded",
                "failed",
                "on_hold",
                "returned",
            ];

            // Return an error if the status is not one of the allowed values
            if (!allowedStatuses.includes(status)) {
                return sendResponse(res, 400, false, "Invalid order status");
            }

            // Update the status field in the order
            order.status = status;
        }

        // Update optional fields only if they are provided in the request
        if (shipping_info) order.shipping_info = shipping_info;
        if (payment_info) order.payment_info = payment_info;
        if (total_price !== undefined) order.total_price = total_price;

        // Save the updated order to the database
        await order.save();

        // Re-fetch the updated order and populate related fields for better response clarity
        const updatedOrder = await Order.findById(order_id)
            .populate("user_id")              // Populate the user data associated with the order
            .populate("products.product");    // Populate product details inside the products array

        // Send a success response with the updated order data
        return sendResponse(res, 200, true, "Order updated successfully", updatedOrder);
    } catch (err) {
        // Handle unexpected server errors gracefully
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

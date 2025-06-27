import pool from "../config/db.js";
import { parseInfo } from "../utils/parseInfo.js";
import { sendResponse } from "../utils/sendResponse.js";

// Create a new order
export const createOrder = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Use user ID from authenticated user (assumed set in req.user)
        const user_id = req.user.id;
        const { shipping_info, payment_info, products, status = 'pending' } = req.body;

        // Verify user exists
        const [userExists] = await connection.query(
            `SELECT id FROM users WHERE id = ?`,
            [user_id]
        );
        if (userExists.length === 0) {
            return sendResponse(res, 404, false, `User with ID ${user_id} not found`);
        }

        // Validate products input existence and non-empty
        if (!products || products.length === 0) {
            return sendResponse(res, 400, false, "Products array is empty");
        }

        // Extract product IDs for batch fetch
        const productIds = products.map(item => item.product_id);

        // Fetch product data: stock, price, discount
        const [productRows] = await connection.query(
            `SELECT id, stock, price, discount FROM products WHERE id IN (?)`,
            [productIds]
        );

        // Map product id to product data for quick lookup
        const productMap = new Map(productRows.map(p => [p.id, p]));

        // Validate product existence and sufficient stock
        for (const item of products) {
            const product = productMap.get(item.product_id);
            if (!product) {
                return sendResponse(res, 404, false, `Product with ID ${item.product_id} not found`);
            }
            if (product.stock < item.quantity) {
                return sendResponse(res, 400, false, `Insufficient stock for product ${item.product_id}`);
            }
        }

        // Calculate total price including discount
        let total_price = 0;
        for (const item of products) {
            const { price, discount } = productMap.get(item.product_id);
            const actualDiscount = discount ?? 0; // default to 0 if null/undefined
            const discountedPrice = price - (price * (actualDiscount / 100));
            total_price += discountedPrice * item.quantity;
        }

        // Insert order record
        const [orderResult] = await connection.query(
            `INSERT INTO orders (user_id, shipping_info, payment_info, total_price, status)
         VALUES (?, ?, ?, ?, ?)`,
            [
                user_id,
                JSON.stringify(shipping_info),
                JSON.stringify(payment_info),
                total_price,
                status
            ]
        );

        const orderId = orderResult.insertId;

        // Insert order items and update product stock
        for (const item of products) {
            const { price, discount } = productMap.get(item.product_id);
            const actualDiscount = discount ?? 0;
            const discountedPrice = price - (price * (actualDiscount / 100));

            await connection.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price_at_order)
           VALUES (?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, discountedPrice]
            );

            await connection.query(
                `UPDATE products SET stock = stock - ? WHERE id = ?`,
                [item.quantity, item.product_id]
            );
        }

        // Fetch full order details with aggregated products info
        const [orderRows] = await connection.query(
            `SELECT o.*,
                JSON_ARRAYAGG(
                  JSON_OBJECT(
                    'product_id', oi.product_id,
                    'quantity', oi.quantity,
                    'price_at_order', oi.price_at_order,
                    'product_name', p.product_name
                  )
                ) AS products
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE o.id = ?
         GROUP BY o.id`,
            [orderId]
        );

        const order = orderRows[0];

        // Parse JSON fields safely
        order.shipping_info = parseInfo(order.shipping_info);
        order.payment_info = parseInfo(order.payment_info);

        // Handle products JSON: parse only if it's string, else keep as is
        if (typeof order.products === 'string') {
            order.products = JSON.parse(order.products);
        }

        await connection.commit();

        return sendResponse(res, 201, true, "Order created successfully", order);
    } catch (err) {
        if (connection) await connection.rollback();
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    } finally {
        if (connection) connection.release();
    }
};

// Get all orders with pagination
export const getAllOrders = async (req, res) => {
    try {
        // Extract pagination parameters from the query string or use default values
        const { page = 1, limit = 10 } = req.query;
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit);
        const offset = (parsedPage - 1) * parsedLimit;

        // Get total number of orders for calculating pagination metadata
        const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM orders');
        const total = countRows[0].total;
        const totalPages = Math.ceil(total / parsedLimit);

        // Fetch only the IDs of the orders for the current page
        const [orderIdRows] = await pool.query(
            'SELECT id FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [parsedLimit, offset]
        );

        const orderIds = orderIdRows.map(row => row.id);

        // If no orders found, return an empty array with pagination info
        if (orderIds.length === 0) {
            return sendResponse(res, 200, true, "No orders found", {
                orders: [],
                pagination: {
                    total,
                    current: parsedPage,
                    limit: parsedLimit,
                    totalPages,
                    hasNextPage: false,
                    hasPrevPage: false
                }
            });
        }

        // Fetch detailed order data, including user and associated product info
        const [orderRows] = await pool.query(
            `SELECT o.*, 
              u.username, u.email,
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'product_id', oi.product_id,
                  'quantity', oi.quantity,
                  'price_at_order', oi.price_at_order,
                  'product_name', p.product_name
                )
              ) AS products
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.id IN (?)
            GROUP BY o.id`,
            [orderIds]
        );

        // Format each order with parsed JSON and additional info
        const orders = orderRows.map(order => ({
            ...order,
            shipping_info: parseInfo(order.shipping_info),
            payment_info: parseInfo(order.payment_info),
            products: typeof order.products === 'string' ? JSON.parse(order.products) : order.products,
        }));

        // Return response with full orders list and improved pagination metadata
        return sendResponse(res, 200, true, "Orders fetched successfully", {
            orders,
            pagination: {
                total,
                totalPages,
                current: parsedPage,
                limit: parsedLimit,
                hasNextPage: parsedPage < totalPages && totalPages > 1,
                hasPrevPage: parsedPage > 1 && parsedPage <= totalPages
            }
        });

    } catch (err) {
        // Handle unexpected server/database errors
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

// Get single order by ID
export const getOrderById = async (req, res) => {
    try {
        const { order_id } = req.params;

        // Validate order_id is a valid number
        if (isNaN(order_id)) {
            return sendResponse(res, 400, false, "Invalid order ID format. Expected a number.");
        }

        const [orderRows] = await pool.query(
            `SELECT o.*, 
                u.username, u.email,
                JSON_ARRAYAGG(
                  JSON_OBJECT(
                    'product_id', oi.product_id,
                    'quantity', oi.quantity,
                    'price_at_order', oi.price_at_order,
                    'product_name', p.product_name
                  )
                ) AS products
         FROM orders o
         JOIN users u ON o.user_id = u.id
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE o.id = ?
         GROUP BY o.id`,
            [order_id]
        );

        if (orderRows.length === 0) {
            return sendResponse(res, 404, false, "Order not found");
        }

        const order = orderRows[0];
        order.shipping_info = parseInfo(order.shipping_info);
        order.payment_info = parseInfo(order.payment_info);
        order.products = typeof order.products === 'string' ? JSON.parse(order.products) : order.products;

        return sendResponse(res, 200, true, "Order fetched successfully", order);
    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

// Delete order by ID
export const deleteOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const user_id = req.user.id; // authenticated user ID
        const { order_id } = req.params;

        if (isNaN(order_id)) {
            return sendResponse(res, 400, false, "Invalid order ID format. Expected a number.");
        }

        // Verify order exists and belongs to user (authorization check)
        const [orderCheck] = await connection.query(
            'SELECT * FROM orders WHERE id = ? AND user_id = ?',
            [order_id, user_id]
        );
        if (orderCheck.length === 0) {
            return sendResponse(res, 404, false, "Order not found or permission denied.");
        }

        // Get ordered products to restore stock
        const [orderProducts] = await connection.query(
            'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
            [order_id]
        );

        // Restore stock for each product
        for (const item of orderProducts) {
            await connection.query(
                'UPDATE products SET stock = stock + ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // Delete order items first (foreign key constraint)
        await connection.query(
            'DELETE FROM order_items WHERE order_id = ?',
            [order_id]
        );

        // Delete the order itself
        const [result] = await connection.query(
            'DELETE FROM orders WHERE id = ?',
            [order_id]
        );

        if (result.affectedRows === 0) {
            return sendResponse(res, 404, false, "Order not found");
        }

        await connection.commit();
        return sendResponse(res, 200, true, "Order deleted successfully");
    } catch (err) {
        await connection.rollback();
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    } finally {
        connection.release();
    }
};

// Get orders by user ID
export const getOrdersByUser = async (req, res) => {
    try {
        const { user_id } = req.params;

        // Parse pagination parameters from query, with default values
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Validate that user_id is a valid number
        if (isNaN(user_id)) {
            return sendResponse(res, 400, false, "Invalid user ID format. Expected a number.");
        }

        // Query the total number of orders for this user (used for pagination metadata)
        const [countRows] = await pool.query(
            'SELECT COUNT(*) AS total FROM orders WHERE user_id = ?',
            [user_id]
        );
        const total = countRows[0].total;

        // If no orders found, respond with 404
        if (total === 0) {
            return sendResponse(res, 404, false, "No orders found for this user");
        }

        // Query paginated orders along with aggregated product details per order
        const [orderRows] = await pool.query(
            `SELECT o.*, 
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'product_id', oi.product_id,
                        'quantity', oi.quantity,
                        'price_at_order', oi.price_at_order,
                        'product_name', p.product_name
                    )
                ) AS products
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?`,
            [user_id, limit, offset]
        );

        // Process each order row
        const orders = orderRows.map(order => ({
            ...order,
            shipping_info: parseInfo(order.shipping_info),
            payment_info: parseInfo(order.payment_info),
            products: typeof order.products === 'string' ? JSON.parse(order.products) : order.products
        }));

        // Calculate total pages for pagination
        const totalPages = Math.ceil(total / limit);

        // Return orders with pagination metadata
        return sendResponse(res, 200, true, "Orders retrieved successfully", {
            orders,
            pagination: {
                total,
                totalPages,
                current: page,
                limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (err) {
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    }
};

// Update order
export const updateOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const user_id = req.user.id;  // Authenticated user ID from middleware
        const { order_id } = req.params;
        const { shipping_info, payment_info, products, status } = req.body;

        // Validate order_id is a number
        if (isNaN(order_id)) {
            return sendResponse(res, 400, false, "Invalid order ID format. Expected a number.");
        }

        // Check if the order exists and belongs to the current user (authorization)
        const [orderRows] = await connection.query(
            'SELECT * FROM orders WHERE id = ? AND user_id = ?',
            [order_id, user_id]
        );

        if (orderRows.length === 0) {
            return sendResponse(res, 404, false, "Order not found or permission denied.");
        }

        // Validate provided status if any
        if (status) {
            const allowedStatuses = [
                "pending", "processing", "shipped", "out_for_delivery",
                "delivered", "cancelled", "refunded", "failed", "on_hold", "returned"
            ];
            if (!allowedStatuses.includes(status)) {
                return sendResponse(res, 400, false, "Invalid order status");
            }
        }

        // Prepare an object to hold fields to update
        const updates = {};
        if (shipping_info) updates.shipping_info = JSON.stringify(shipping_info);
        if (payment_info) updates.payment_info = JSON.stringify(payment_info);
        if (status) updates.status = status;

        // Handle products update if provided
        if (products) {
            if (!Array.isArray(products) || products.length === 0) {
                return sendResponse(res, 400, false, "Products must be a non-empty array");
            }

            // 1. Restore stock of existing order items before update
            const [existingItems] = await connection.query(
                'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
                [order_id]
            );
            for (const item of existingItems) {
                await connection.query(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }

            // 2. Remove old order items to prepare for new ones
            await connection.query(
                'DELETE FROM order_items WHERE order_id = ?',
                [order_id]
            );

            // 3. Validate new products and calculate new total price
            const productIds = products.map(p => p.product_id);
            const [productRows] = await connection.query(
                'SELECT id, stock, price, discount FROM products WHERE id IN (?)',
                [productIds]
            );
            const productMap = new Map(productRows.map(p => [p.id, p]));

            let total_price = 0;
            for (const item of products) {
                const product = productMap.get(item.product_id);
                if (!product) {
                    return sendResponse(res, 404, false, `Product with id ${item.product_id} not found`);
                }
                if (product.stock < item.quantity) {
                    return sendResponse(res, 400, false, `Insufficient stock for product ${item.product_id}`);
                }
                const discount = product.discount ?? 0;
                const discountedPrice = product.price - (product.price * (discount / 100));
                total_price += discountedPrice * item.quantity;
            }

            // 4. Insert new order items and update product stock accordingly
            for (const item of products) {
                const product = productMap.get(item.product_id);
                const discount = product.discount ?? 0;
                const discountedPrice = product.price - (product.price * (discount / 100));

                await connection.query(
                    'INSERT INTO order_items (order_id, product_id, quantity, price_at_order) VALUES (?, ?, ?, ?)',
                    [order_id, item.product_id, item.quantity, discountedPrice]
                );

                await connection.query(
                    'UPDATE products SET stock = stock - ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }

            // Update total_price after recalculating from products
            updates.total_price = total_price;
        }

        // Update the orders table if there are any fields to update
        if (Object.keys(updates).length > 0) {
            const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const params = [...Object.values(updates), order_id];
            await connection.query(`UPDATE orders SET ${setClause} WHERE id = ?`, params);
        }

        await connection.commit();

        // Fetch updated order details including product info
        const [updatedOrderRows] = await pool.query(
            `SELECT o.*, 
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price_at_order', oi.price_at_order,
                'product_name', p.product_name
              )
            ) AS products
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE o.id = ?
         GROUP BY o.id`,
            [order_id]
        );

        if (updatedOrderRows.length === 0) {
            return sendResponse(res, 404, false, "Updated order not found");
        }

        const updatedOrder = updatedOrderRows[0];

        // Parse JSON fields safely
        updatedOrder.shipping_info = parseInfo(updatedOrder.shipping_info);
        updatedOrder.payment_info = parseInfo(updatedOrder.payment_info);
        if (typeof updatedOrder.products === 'string') {
            updatedOrder.products = JSON.parse(updatedOrder.products);
        }

        return sendResponse(res, 200, true, "Order updated successfully", updatedOrder);

    } catch (err) {
        await connection.rollback();
        return sendResponse(res, 500, false, "Internal server error", null, err.message);
    } finally {
        connection.release();
    }
};

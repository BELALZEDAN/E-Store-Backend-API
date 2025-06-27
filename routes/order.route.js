import express from "express";
import {
    createOrder,
    getAllOrders,
    getOrderById,
    deleteOrder,
    getOrdersByUser,
    updateOrder,
} from "../controllers/order.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { createOrderValidator } from "../middlewares/createOrderValidator.js";
import { handleValidation } from "../middlewares/handleValidation.js";
import { updateOrderValidator } from "../middlewares/updateOrderValidator.js";

const router = express.Router();

// Route to create a new order
router.post("/",
    verifyToken,
    createOrderValidator,
    handleValidation,
    createOrder);

// Route to get all orders
router.get("/", getAllOrders);

// Route to get a single order by ID
router.get("/:order_id", getOrderById);

// Route to update an order
router.put("/:order_id",
    verifyToken,
    updateOrderValidator,
    handleValidation,
    updateOrder);

// Route to delete an order by ID
router.delete("/:order_id", verifyToken, deleteOrder);

// Route to get all orders by a specific user
router.get("/user/:user_id", getOrdersByUser);

export default router;

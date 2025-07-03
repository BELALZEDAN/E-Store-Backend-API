import express from "express";
import dotenv from "dotenv";
import pool from './config/db.js';
import userRoutes from "./routes/user.route.js";
import cartRoutes from "./routes/cart.route.js";
import productRoutes from "./routes/product.route.js";
import orderRoutes from "./routes/order.route.js";
import categoryRoutes from "./routes/category.route.js";
import reviewRoutes from "./routes/review.route.js";
import { sendResponse } from "./utils/sendResponse.js";
import cors from 'cors';
import helmet from 'helmet';
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import cron from "node-cron";
import cleanupTempDirectory from "./utils/cleanupTempUploads.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet()); // Sets various HTTP headers for security

// Enable CORS with configuration
app.use(cors());
// {
//   origin: process.env.CLIENT_URL || (process.env.NODE_ENV === 'development' ? '*' : false),
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }

// Request body parsing middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files (images) from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "E-Store API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use("/api/users", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/reviews", reviewRoutes);

// 404 Not Found handler
app.use((req, res) => {
  return sendResponse(res, 404, false, "Resource not found");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.stack);
  return sendResponse(res, 500, false, "Internal Server Error");
});

// Database connection and server startup
async function initializeServer() {
  let dbConnection;
  try {
    // Test database connection
    dbConnection = await pool.getConnection();
    console.log(`[${new Date().toISOString()}] Database connected (ID: ${dbConnection.threadId})`);

    const PORT = process.env.PORT || 5001;
    const server = app.listen(PORT, () => {
      console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
    });

    cron.schedule('0 * * * *', () => {
      cleanupTempDirectory(); // Runs every hour at minute 0
    });

    // Graceful shutdown handlers
    const shutdown = async (signal) => {
      console.log(`[${new Date().toISOString()}] ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        if (dbConnection) await dbConnection.release();
        console.log(`[${new Date().toISOString()}] Server closed`);
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('unhandledRejection', (err) => {
      console.error(`[${new Date().toISOString()}] Unhandled Rejection:`, err);
      shutdown('unhandledRejection');
    });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] Server initialization failed:`, err);
    if (dbConnection) await dbConnection.release();
    process.exit(1);
  }
}

// Start the server
initializeServer();
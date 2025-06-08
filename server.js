import express from "express";
import dotenv from "dotenv";
import { connectDB } from './config/db.js';
import userRoutes from "./routes/user.route.js";
import cartRoutes from "./routes/cart.route.js";
import productRoutes from "./routes/product.route.js"
import orderRoutes from "./routes/order.route.js"
import categoryRoutes from "./routes/category.route.js"
import reviewRoutes from "./routes/review.route.js";
import { sendResponse } from "./utils/sendResponse.js";
import cors from 'cors'

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors()); // /* Cross Origin Resource Sharing */ fetching api will denied in other applications without using this middleware

// Use routes
app.use("/api/users", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/category", categoryRoutes)
app.use("/api/reviews", reviewRoutes);

// app.all('*', (req, res, next) => {
//   return sendResponse(res, 404, false, "This resource is not available")
// })

// Connect to DB and start the server
connectDB()
  .then(() => {
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to the database", err);
  });

// Welcome route
app.get("/", (req, res) => {
  res.send("Welcome to E-Store API");
});

import jwt from "jsonwebtoken";
import { sendResponse } from "../utils/sendResponse.js";

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Extract token from Authorization header

  if (!token) {
    return sendResponse(res, 401, false, "No token provided");
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // You can provide a more detailed error message here
      return sendResponse(res, 403, false, "Invalid or expired token");
    }

    req.user = decoded; // Attach user data to the request object (decoded token)
    next(); // Pass control to the next middleware or route handler
  });
};

export { verifyToken };

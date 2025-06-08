// Import the validationResult function from express-validator
import { validationResult } from "express-validator";
import { sendResponse } from "../utils/sendResponse.js";

// Middleware to handle validation errors
export const handleValidation = (req, res, next) => {
  // Extract validation errors from the request
  const errors = validationResult(req);

  // If there are validation errors, return a 400 Bad Request with error details
  if (!errors.isEmpty()) {
    // return res.status(400).json({ errors: errors.array() });
    return sendResponse(res, 400, false, null, errors.array())
  }

  // If no validation errors, proceed to the next middleware or controller
  next();
};

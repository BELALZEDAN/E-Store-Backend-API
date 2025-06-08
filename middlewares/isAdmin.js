import { sendResponse } from "../utils/sendResponse.js";

// middleware/isAdmin.js
export const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return sendResponse(res, 403, false, "Access denied");
  }
  next();
};

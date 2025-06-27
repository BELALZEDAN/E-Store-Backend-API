import express from "express";
import bcrypt from 'bcrypt';
import {
  registerUser,
  loginUser,
  getAllUsers,
  getSingleUser,
  updateUser,
  deleteUser,
  logout,
  deleteAllUsers,
} from "../controllers/user.controller.js";

import { moveImageToFolder, upload } from "../middlewares/uploadImage.js";
import { handleValidation } from "../middlewares/handleValidation.js";
import { registerUserValidator } from "../middlewares/registerUserValidator.js";
import { updateUserValidator } from "../middlewares/updateUserValidator.js";
import { loginUserValidator } from "../middlewares/loginUserValidator.js";
import { isAdmin } from "../middlewares/isAdmin.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

// Register user with image upload
router.post(
  "/register",
  upload.single("profile_image"), // Image upload middleware
  registerUserValidator, // Validation for registration
  handleValidation, // Handle any validation errors
  registerUser
);

// Login
router.post("/login", loginUserValidator, handleValidation, loginUser);

// Get all users
router.get("/", getAllUsers);

// Get user by ID
router.get("/:id", getSingleUser);

// Update user with image upload
router.put(
  "/:id",
  verifyToken,
  upload.single("profile_image"), // Image upload middleware
  updateUserValidator, // Validation for updating user
  handleValidation, // Handle validation errors
  updateUser
);

// DELETE all users - only for development environment
router.delete("/delete-all", verifyToken, deleteAllUsers) // This route is available only in development mode

// Delete user
router.delete("/:id", verifyToken, isAdmin, deleteUser); // This route must be available just for admin

// Logout route
router.post("/logout", verifyToken, logout); // Logout route to clear the token from cookies

export default router;

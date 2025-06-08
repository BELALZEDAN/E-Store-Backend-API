import express from "express";
import {
  registerUser,
  loginUser,
  getAllUsers,
  getSingleUser,
  updateUser,
  deleteUser,
  logout,
} from "../controllers/user.controller.js";

import { moveImageToUserFolder, upload } from "../middlewares/uploadImage.js";
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
  upload.single("image"), // Image upload middleware
  registerUserValidator, // Validation for registration
  handleValidation, // Handle any validation errors
  async (req, res, next) => {
    // Call the registerUser controller after image upload
    try {
      const user = await registerUser(req, res);

      // If image is uploaded and user is registered, move the image to the user's folder
      if (req.file) {
        const userId = user.id; // Assuming 'user' has an 'id' field
        moveImageToUserFolder(req.file, userId);
      }

    } catch (error) {
      next(error); // Catch any errors during registration
    }
  }
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
  upload.single("image"), // Image upload middleware
  updateUserValidator, // Validation for updating user
  handleValidation, // Handle validation errors
  async (req, res, next) => {
    try {
      const userId = req.params.id;
      await updateUser(req, res);

      // If an image is uploaded, move it to the user's folder
      if (req.file) {
        moveImageToUserFolder(req.file, userId); // Move image to the user's folder
      }

    } catch (error) {
      next(error); // Catch any errors during the update
    }
  }
);

// Delete user
router.delete("/:id", verifyToken, isAdmin, deleteUser); // This route must be available just for admin

// Logout route
router.post("/logout", verifyToken, logout); // Logout route to clear the token from cookies

export default router;

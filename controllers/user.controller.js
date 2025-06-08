import User from "../models/user.model.js";
import dotenv from "dotenv";
import { generateToken } from "../utils/generateToken.js";
import { comparePasswords, hashPassword } from "../utils/passwordUtils.js";
import { sendResponse } from "../utils/sendResponse.js";

dotenv.config();

// Register new user
export const registerUser = async (req, res) => {
  try {
    const { full_name, email, password, role, bio } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // return res
      //   .status(400)
      //   .json({ success: false, message: "Email already in use" });
      return sendResponse(res, 400, false, "Email already in use");
    }

    const hashedPassword = await hashPassword(
      password,
      +process.env.HASHINGSALT
    );

    const image_url = req.file ? req.file.path : null;

    const newUser = new User({
      full_name,
      email,
      password: hashedPassword,
      role,
      image_url,
      bio,
    });

    await newUser.save();

    let token;

    try {
      token = generateToken(newUser);
    } catch (err) {
      // console.error(err);
      return sendResponse(res, 500, false, "Failed to generate token", null, err.message);
    }

    // res.status(201).json({
    //   success: true,
    //   message: "User registered successfully",
    //   data: {
    //     user: {
    //       id: newUser._id,
    //       name: newUser.full_name,
    //       email: newUser.email,
    //       role: newUser.role,
    //       bio: newUser.bio,
    //       image_url: newUser.image_url,
    //     },
    //     token,
    //   },
    // });

    const data = {
      user: {
        id: newUser._id,
        name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        bio: newUser.bio,
        image_url: newUser.image_url,
      },
      token,
    };

    return sendResponse(res, 201, true, "User registered successfully", data);
  } catch (err) {
    // res.status(500).json({
    //   success: false,
    //   message: "Internal server error",
    //   error: err.message,
    // });
    return sendResponse(res, 500, false, "Internal server error", null, err.message);
  }
};

// User login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await comparePasswords(password, user.password))) {
      // return res
      //   .status(400)
      //   .json({ success: false, message: "Invalid credentials" });
      return sendResponse(res, 400, false, "Invalid credentials");
    }

    let token;

    try {
      token = generateToken(user);
    } catch (err) {
      // console.error(err);
      return sendResponse(res, 500, false, "Failed to generate token", null, err.message);
    }

    // res.status(200).json({
    //   success: true,
    //   message: "User login successfully",
    //   data: {
    //     user: {
    //       id: user._id,
    //       username: user.username,
    //       full_name: user.full_name,
    //       email: user.email,
    //       role: user.role,
    //       bio: user.bio,
    //       image_url: user.image_url,
    //     },
    //     token,
    //   },
    // });

    const data = {
      user: {
        id: user._id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        image_url: user.image_url,
      },
      token,
    };

    sendResponse(res, 200, true, "User login successfully", data);
  } catch (err) {
    // res.status(500).json({
    //   success: false,
    //   message: "Internal server error",
    //   error: err.message,
    // });
    sendResponse(res, 500, false, "Internal server error", null, err.message);
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password"); // .select("-password") to avoid sharing password
    // res.status(200).json({
    //   success: true,
    //   message: "Users fetched successfully",
    //   data: users,
    // });
    sendResponse(res, 200, true, "Users fetched successfully", users);
  } catch (err) {
    // res.status(500).json({
    //   success: false,
    //   message: "Internal server error",
    //   error: err.message,
    // });
    sendResponse(res, 500, false, "Internal server error", null, err.message);
  }
};

// Get user by ID
export const getSingleUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) {
      // return res
      //   .status(404)
      //   .json({ success: false, message: "User not found" });
      return sendResponse(res, 404, false, "User not found");
    }
    // res.status(200).json({
    //   success: true,
    //   message: "User fetched successfully",
    //   data: user,
    // });
    sendResponse(res, 200, true, "User fetched successfully", user);
  } catch (err) {
    // res.status(500).json({
    //   success: false,
    //   message: "Internal server error",
    //   error: err.message,
    // });
    sendResponse(res, 500, false, "Internal server error", null, err.message);
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.password) {
      updates.password = await hashPassword(
        updates.password,
        +process.env.HASHINGSALT
      );
    }

    if (updates.full_name) {
      updates.full_name = {
        first_name: updates.full_name.first_name || "",
        last_name: updates.full_name.last_name || "",
      };
    }

    if (req.file) {
      updates.image_url = req.file.path;
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true, // Ensure that the updated user document is returned (not the original one)
      // runValidators: true, // Ensure that the validation rules defined in the schema are applied during the update
    }).select("-password"); // Exclude the password field from the returned user data for security reasons

    if (!updatedUser) {
      // return res.status(404).json({ message: "User not found" });
      return sendResponse(res, 404, false, "User not found");
    }

    // res.status(200).json({ message: "User updated", user: updatedUser });
    sendResponse(res, 200, true, "User updated", updatedUser);
  } catch (err) {
    // res.status(500).json({ message: "Server error", error: err.message });
    sendResponse(res, 500, false, "Internal server error", null, err.message);
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      // return res.status(404).json({ message: "User not found" });
      return sendResponse(res, 404, false, "User not found");
    }
    // res.status(200).json({ message: "User deleted" });
    sendResponse(res, 200, true, "User deleted", deletedUser);
  } catch (err) {
    // res.status(500).json({ message: "Server error", error: err.message });
    sendResponse(res, 500, false, "Internal server error", null, err.message);
  }
};

// User logout
export const logout = (req, res) => {
  // Send success response after the token is cleared by middleware
  sendResponse(res, 200, true, "User logged out successfully");
};

import { Schema, model } from "mongoose";
import { generateUniqueUsername } from "../utils/usernameUtils.js";
import { forbiddenWords } from "../data/data.js";

// const forbiddenWords = ["badword1", "offensive", "curse"];

// Define the User schema
const userSchema = new Schema(
  {
    username: {
      type: String,
      unique: true, // Ensure the username is unique in the database
    },
    full_name: {
      first_name: {
        type: String,
        required: true,
        trim: true,
        minlength: [3, "First name should have at least 3 characters"],
        validate: {
          validator: function (v) {
            return /^[A-Za-z]+$/.test(v);
          },
          message: "First name should only contain letters",
        },
      },
      last_name: {
        type: String,
        required: true,
        trim: true,
        minlength: [3, "Last name should have at least 3 characters"],
        validate: {
          validator: function (v) {
            return /^[A-Za-z]+$/.test(v);
          },
          message: "Last name should only contain letters",
        },
      }
    },
    email: {
      type: String,
      required: true, // Email is required
      unique: true, // Email must be unique
      lowercase: true, // Store email in lowercase format for uniformity
      match: [/\S+@\S+\.\S+/, "Please provide a valid email address"], // Email format validation
    },
    password: {
      type: String,
      required: true, // Password is required
      minlength: [8, "Password should have at least 8 characters"], // Minimum length of 8 characters
    },
    role: {
      type: String,
      enum: ["user", "admin", "seller"], // Only specific roles allowed
      default: "user", // Default role is 'user'
    },
    image_url: {
      type: String, // Optional URL for the user's profile image
    },
    banned_until: {
      type: Date,
      default: null, // Null means the user is not banned
    },
    bio: {
      type: String,
      trim: true,
      minlength: [15, "Bio should have at least 15 characters"],
      validate: {
        validator: function (v) {
          const clean = v.toLowerCase();
          return !forbiddenWords.some((word) => clean.includes(word));
        },
        message: "Bio contains inappropriate language",
      },
    },
  },
  { timestamps: true } // Automatically add 'createdAt' and 'updatedAt' fields
);

// Pre-save hook to automatically generate a unique username if not provided
userSchema.pre("save", async function (next) {
  // If no username is provided, generate one
  if (!this.username) {
    this.username = await generateUniqueUsername(
      this.full_name.first_name,
      this.full_name.last_name
    );
  }
  next(); // Proceed with the save operation
});

// Create and export the User model based on the schema
const User = model("User", userSchema);

export default User;

// Request:
// {
//   "full_name": {
//     "first_name": "John",
//     "last_name": "Doe"
//   },
//   "email": "john.doe@example.com",
//   "password": "SecurePass123",
//   "role": "user",
//   "image_url": "https://example.com/images/john.jpg",
//   "bio": "I am a passionate developer who loves building modern web applications."
// }

// Response:
// [
//    {
//      "_id": "662f88d8a0f7a8d4f1cfba74",
//      "username": "john_doe263829",
//      "full_name": {
//        "first_name": "John",
//        "last_name": "Doe"
//      },
//      "email": "john.doe@example.com",
//      "password": "hashed-password",
//      "role": "user",
//      "image_url": "https://example.com/images/john.jpg",
//      "banned_until": null,
//      "bio": "I am a passionate developer who loves building modern web applications.",
//      "createdAt": "2025-05-03T12:34:56.789Z",
//      "updatedAt": "2025-05-03T12:34:56.789Z",
//      "__v": 0
//    },
//    {
//      "_id": "662f88d8a0f7a8d4f1cfcd84",
//      "username": "ali_ali263829",
//      "full_name": {
//        "first_name": "Ali",
//        "last_name": "Ali"
//      },
//      "email": "ali.ali@example.com",
//      "password": "hashed-password",
//      "role": "seller",
//      "image_url": "https://example.com/images/john.jpg",
//      "banned_until": null,
//      "bio": "I am a passionate developer who loves building modern web applications.",
//      "createdAt": "2025-05-03T12:34:56.789Z",
//      "updatedAt": "2025-05-03T12:34:56.789Z",
//      "__v": 0
//    },
//    {
//      "_id": "662f88d8a0f7a8d4b1u8ba74",
//      "username": "ahmed_ahmed263829",
//      "full_name": {
//        "first_name": "Ahmed",
//        "last_name": "Ahmed"
//      },
//      "email": "ahmed.agmed@example.com",
//      "password": "hashed-password",
//      "role": "user",
//      "image_url": "https://example.com/images/john.jpg",
//      "banned_until": null,
//      "bio": "I am a passionate developer who loves building modern web applications.",
//      "createdAt": "2025-05-03T12:34:56.789Z",
//      "updatedAt": "2025-05-03T12:34:56.789Z",
//      "__v": 0
//    }
// ]

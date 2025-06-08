import { Schema, model } from "mongoose";

// Define the Category schema
const categorySchema = new Schema({
  category_name: {
    type: String,
    required: true, // Category name is required
    trim: true, // Automatically trims extra spaces from category name
    minlength: [3, "Category name should have at least 3 characters"], // Minimum length of 3 characters
    validate: {
      validator: function (v) {
        return /^[A-Za-z0-9\s]+$/.test(v); // Ensure category name contains only letters, numbers, and spaces
      },
      message: "Category name should only contain letters, numbers, and spaces",
    },
  },
  description: {
    type: String,
    required: true, // Description is required
    trim: true, // Automatically trims extra spaces from category description
    minlength: [5, "Description should have at least 5 characters"], // Minimum length of 5 characters
    validate: {
      validator: function (v) {
        return /^[A-Za-z0-9\s,.-]+$/.test(v); // Ensure description contains letters, numbers, spaces, and basic punctuation
      },
      message:
        "Category description should only contain letters, numbers, spaces, and basic punctuation",
    },
  },
});

// Create and export the Category model based on the schema
const Category = model("Category", categorySchema);

export default Category;

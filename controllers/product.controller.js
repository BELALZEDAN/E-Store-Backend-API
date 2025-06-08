import mongoose from "mongoose";
import Product from "../models/product.model.js";
import { sendResponse } from "../utils/sendResponse.js";

// Helper to populate related fields
const populateProduct = (query) =>
  query.populate("category").populate("reviews");

// Create a new product
export const createProduct = async (req, res) => {
  const {
    product_name,
    description,
    price,
    stock,
    category,
    images_url,
    discount,
  } = req.body;

  try {
    const product = new Product({
      product_name,
      description,
      price,
      stock,
      category,
      images_url,
      discount,
    });

    const savedProduct = await product.save();

    // Respond with the saved product
    // res.status(201).json({
    //   message: "Product created successfully",
    //   product: savedProduct,
    // });
    return sendResponse(res, 201, true, "Product created successfully", savedProduct)
  } catch (err) {
    // res.status(400).json({
    //   message: "Failed to create product",
    //   error: err.message,
    // });
    return sendResponse(res, 400, false, "Failed to create product", null, err.message)
  }
};

// Get all products
export const getAllProducts = async (req, res) => {
  try {
    // Get page and limit values from query parameters
    const page = parseInt(req.query.page) || 1; // Default page is 1
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10 products per page

    // Calculate the number of products to skip based on the page and limit
    const skip = (page - 1) * limit;

    // Query to get products with pagination (skip and limit)
    const products = await populateProduct(
      Product.find().select("-__v").skip(skip).limit(limit)
    );

    // Get the total number of products in the database
    const totalProducts = await Product.countDocuments();

    // Respond with the products, total count, and pagination info
    // res.status(200).json({
    //   message: "Products fetched successfully",
    //   data: {
    //     products,
    //     totalProducts,
    //     totalPages: Math.ceil(totalProducts / limit), // Calculate total pages
    //     currentPage: page,
    //     limit,
    //   },
    // });
    const data = {
      products,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit), // Calculate total pages
      currentPage: page,
      limit,
    };

    return sendResponse(res, 200, true, "Products fetched successfully", data)
  } catch (err) {
    // res.status(500).json({
    //   message: "Failed to fetch products",
    //   error: err.message,
    // });
    return sendResponse(res, 500, false, "Failed to fetch products", null, err.message)
  }
};

// Get a single product by ID
export const getProductById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    // return res.status(400).json({ message: "Invalid product ID" });
    return sendResponse(res, 400, false, "Invalid product ID")
  }

  try {
    const product = await populateProduct(Product.findById(id).select("-__v"));
    if (!product) {
      // return res.status(404).json({ message: "Product not found" });
      return sendResponse(res, 404, false, "Product not found")
    }
    // res.status(200).json({ product });
    return sendResponse(res, 200, true, "Product fetched successfully", product)
  } catch (err) {
    // console.error("Get Product By ID Error:", err);
    // res
    //   .status(500)
    //   .json({ message: "Failed to fetch product", error: err.message });
    return sendResponse(res, 500, false, "Failed to fetch product", null, err.message)
  }
};

// Update a product by ID
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    product_name,
    description,
    price,
    stock,
    category,
    images_url,
    discount,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    // return res.status(400).json({ message: "Invalid product ID" });
    return sendResponse(res, 400, false, "Invalid product ID")
  }

  try {
    const updated = await Product.findByIdAndUpdate(
      id,
      {
        product_name,
        description,
        price,
        stock,
        category,
        images_url,
        discount,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      // return res.status(404).json({ message: "Product not found" });
      return sendResponse(res, 404, false, "Product not found")
    }

    // res.status(200).json({ message: "Product updated", product: updated });
    return sendResponse(res, 200, true, "Product updated successfully", updated)
  } catch (err) {
    // console.error("Update Product Error:", err);
    // res
    //   .status(400)
    //   .json({ message: "Failed to update product", error: err.message });
    return sendResponse(res, 400, false, "Failed to update product", null, err.messageF)
  }
};

// Delete a product by ID
export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    // return res.status(400).json({ message: "Invalid product ID" });
    return sendResponse(res, 400, false, "Invalid product ID")
  }

  try {
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      // return res.status(404).json({ message: "Product not found" });
      return sendResponse(res, 404, false, "Product not found")
    }

    // res.status(200).json({ message: "Product deleted" });
    return sendResponse(res, 200, true, "Product deleted successfully", deleted)
  } catch (err) {
    // console.error("Delete Product Error:", err);
    // res
    //   .status(500)
    //   .json({ message: "Failed to delete product", error: err.message });
    return sendResponse(res, 500, false, "Failed to delete product", null, err.message)
  }
};


// ======================/* Need some updates */====================== //
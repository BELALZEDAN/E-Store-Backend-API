import multer from "multer";
import path from "path";
import fs from "fs";
import Product from "../models/product.model.js";

// Ensure the "uploads/products" folder exists, if not, create it
const ensureUploadsFolderExists = () => {
  const uploadDir = path.join(__dirname, "../uploads/products");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true }); // Create folder if it doesn't exist
  }
};

// Define storage engine for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadsFolderExists(); // Ensure the folder exists before saving
    cb(null, "uploads/products/"); // Save to the "uploads/products" folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Add a timestamp to avoid name collision
  },
});

// Initialize multer with file size limits and file filter for image types
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max file size is 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp|bmp|svg|tiff/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true); // Accept the file
    } else {
      cb(new Error("Only image files are allowed")); // Reject the file
    }
  },
});

// Create product with images
export const createProduct = async (req, res) => {
  try {
    // Check if product already exists
    const existingProduct = await Product.findOne({
      product_name: req.body.product_name,
    });

    if (existingProduct) {
      return res.status(400).json({
        message: "Product already exists",
        product: existingProduct,
      });
    }

    // If product doesn't exist, create a new one
    const productData = req.body;

    // Add images to product data
    if (req.files && req.files.length > 0) {
      productData.images_url = req.files.map((file) => file.path); // Save the image file paths
    }

    const product = new Product(productData);
    const savedProduct = await product.save();

    res.status(201).json({
      message: "Product created successfully",
      product: savedProduct,
    });
  } catch (err) {
    console.error("Create Product Error:", err);
    res
      .status(400)
      .json({ message: "Invalid product data", error: err.message });
  }
};

// Route to upload images (Single or multiple)
export const uploadImages = upload.array("images", 5); // Field name is "images" and limit of 5 images

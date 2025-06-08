import { Schema, model } from "mongoose";

// Define the Product schema
const productSchema = new Schema(
  {
    product_name: {
      type: String,
      required: true, // Product name is required
      trim: true, // Automatically trims extra spaces from product
      minlength: [3, "Product name should have at least 3 characters"], // Minimum length of 3 characters
      validate: {
        validator: function (v) {
          return /^[A-Za-z0-9\s,.-]+$/.test(v);
        },
        message: "Product name should only contain letters",
      },
    },
    description: {
      type: String,
      trim: true, // Automatically trims extra spaces from description
      minlength: [15, "Description should have at least 15 characters"],
      validate: {
        validator: function (v) {
          return /^[A-Za-z0-9\s,.-]+$/.test(v);
        },
        message: "Description should only contain letters",
      },
    },
    images_url: {
      type: [String], // Array of URLs for product images
      // validate: {
      //   validator: function (v) {
      //     return v.every((url) => /^(https?:\/\/[^\s]+)$/.test(url)); // Ensure all items are valid URLs
      //   },
      //   message: "Each image URL should be a valid URL",
      // },
      default: [], // Default value is an empty array (no images initially)
      maxlength: [5, "You can upload up to 5 images"], // Limit to 5 images
    },
    price: {
      type: Number,
      required: true, // Price is required
    },
    stock: {
      type: Number,
      required: true, // Stock is required
    },
    discount: {
      type: Number,
      min: 0, // Discount cannot be negative
      max: 100, // Discount cannot exceed 100%
      default: 0, // Default discount is 0%
    },
    // rating: {
    //   type: Number,
    //   min: 0, // Minimum rating is 0
    //   max: 5, // Maximum rating is 5
    //   default: 0, // Default rating is 0
    // },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category", // Reference to the Category model
      required: true, // Category is required
    },
    reviews: [
      {
        type: Schema.Types.ObjectId,
        ref: "Review", // Reference to the Review model
      },
    ],
  },
  { timestamps: true } // Automatically add 'createdAt' and 'updatedAt' fields
);

// Create and export the Product model based on the schema
const Product = model("Product", productSchema);

export default Product;

// Request :
// {
//   "product_name": "Product Name",
//   "description": "This is a product description. It must be at least 15 characters long.",
//   "images_url": [
//     "https://example.com/image1.jpg",
//     "https://example.com/image2.jpg"
//   ],
//   "price": 29.99,
//   "stock": 100,
//   "discount": 10,
//   "rating": 4.5,
//   "category": "ObjectId of the category (e.g., '60d3b41abdacab002f8f9c23')",
//   "reviews": [
//     "ObjectId of the review (e.g., '60d3b41abdacab002f8f9c24')"
//   ]
// }

// Response :
// [
//     {
//        "_id": "60d3b41abdacab002f8f9c25",
//        "product_name": "Product Name",
//        "description": "This is a product description. It must be at least 15 characters long.",
//        "images_url": [
//          "https://example.com/image1.jpg",
//          "https://example.com/image2.jpg"
//        ],
//        "price": 29.99,
//        "stock": 100,
//        "discount": 10,
//        "rating": 4.5,
//        "category": "60d3b41abdacab002f8f9c23",
//        "reviews": [
//          "60d3b41abdacab002f8f9c24"
//        ],
//        "createdAt": "2025-05-03T12:34:56.789Z",
//        "updatedAt": "2025-05-03T12:34:56.789Z",
//        "__v": 0
//    },
//     {
//        "_id": "60d3b41abdacab002f8f9c25",
//        "product_name": "Product Name",
//        "description": "This is a product description. It must be at least 15 characters long.",
//        "images_url": [
//          "https://example.com/image1.jpg",
//          "https://example.com/image2.jpg"
//        ],
//        "price": 29.99,
//        "stock": 100,
//        "discount": 10,
//        "rating": 4.5,
//        "category": "60d3b41abdacab002f8f9c23",
//        "reviews": [
//          "60d3b41abdacab002f8f9c24"
//        ],
//        "createdAt": "2025-05-03T12:34:56.789Z",
//        "updatedAt": "2025-05-03T12:34:56.789Z",
//        "__v": 0
//    },
//     {
//        "_id": "60d3b41abdacab002f8f9c25",
//        "product_name": "Product Name",
//        "description": "This is a product description. It must be at least 15 characters long.",
//        "images_url": [
//          "https://example.com/image1.jpg",
//          "https://example.com/image2.jpg"
//        ],
//        "price": 29.99,
//        "stock": 100,
//        "discount": 10,
//        "rating": 4.5,
//        "category": "60d3b41abdacab002f8f9c23",
//        "reviews": [
//          "60d3b41abdacab002f8f9c24"
//        ],
//        "createdAt": "2025-05-03T12:34:56.789Z",
//        "updatedAt": "2025-05-03T12:34:56.789Z",
//        "__v": 0
//    },
// ]

// ===================// This code need some fixing //===================
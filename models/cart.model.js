import { Schema, model } from "mongoose";

// Define the Cart schema
const cartSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the user who owns the cart
      required: true,
      unique: true, // One cart per user
    },
    products: {
      type: [
        {
          product: {
            type: Schema.Types.ObjectId,
            ref: "Product", // Reference to the Product model
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
            default: 0,
            min: [1, "Quantity cannot be less than 1"], // Minimum quantity of 1
            max: [100, "Quantity cannot exceed 100"], // Maximum quantity of 100
            validate: {
              validator: Number.isInteger,
              message: "Quantity must be an integer",
            },
          },
        },
      ],
      default: [], // Ensures it's always an array, even when empty
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Pre-save middleware to prevent duplicate products and handle empty cart
cartSchema.pre("save", function (next) {
  // Check for duplicate products with the same quantity
  const seen = new Set();
  for (const item of this.products) {
    const key = item.product.toString() + ":" + item.quantity; // Combine product and quantity
    if (seen.has(key)) {
      return next(
        new Error(
          "Duplicate product with the same quantity in cart is not allowed"
        )
      );
    }
    seen.add(key);
  }

  // If products array is empty, remove the cart
  if (this.products.length === 0) {
    return this.remove(); // Automatically remove the cart if it's empty
  }

  next();
});

// Post-save hook to ensure that the cart is valid
cartSchema.post("save", function (doc, next) {
  // If the cart is saved successfully, we just pass it along
  next();
});

// Ensure the cart gets deleted if it's empty during a manual delete operation
cartSchema.pre("remove", function (next) {
  if (this.products.length === 0) {
    return next(); // Proceed to remove the empty cart
  }
  next(); // Allow removal if there are products
});

const Cart = model("Cart", cartSchema);

export default Cart;

// {
//   "user_id": "66338a6a3d73b48d13db1f2a",
//   "products": [
//     {
//       "product": "66338a6a3d73b48d13db1f5c",
//       "quantity": 2
//     },
//     {
//       "product": "66338a6a3d73b48d13db1f5d",
//       "quantity": 1
//     }
//   ]
// }

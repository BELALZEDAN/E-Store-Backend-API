import { Schema, model } from "mongoose";

// Define the Order schema
const orderSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true, // User is required
    },
    shipping_info: {
      type: String,
      trim: true, // Trim extra spaces
      minlength: [10, "Shipping info should have at least 10 characters"],
      validate: {
        validator: function (v) {
          return /^[A-Za-z0-9\s,.-]+$/.test(v); // Allow more realistic characters in addresses
        },
        message: "Shipping info contains invalid characters",
      },
      default: "Empty data",
    },
    payment_info: {
      type: String,
      trim: true,
      minlength: [10, "Payment info should have at least 10 characters"],
      validate: {
        validator: function (v) {
          return /^[A-Za-z0-9\s,.-]+$/.test(v); // Allow digits and basic symbols
        },
        message: "Payment info contains invalid characters",
      },
      default: "Empty data",
    },
    total_price: {
      type: Number,
      required: true, // Total price is required
      min: 0, // Must be 0 or more
      default: 0,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "refunded",
        "failed",
        "on_hold",
        "returned",
      ],
      default: "pending", // Default order status
    },
    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product", // Reference to the Product model
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1, // Minimum quantity
        },
      },
    ],
    paid_at: {
      type: Date, // Date when payment was made
      default: Date.now,
    },
    delivered_at: {
      type: Date, // Date when delivery was completed
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt fields automatically
);

// Middleware for setting delivered_at when saving a new document
orderSchema.pre("save", function (next) {
  // Check if the status is modified to 'delivered' and delivered_at is not already set
  if (this.isModified("status") && this.status === "delivered" && !this.delivered_at) {
    this.delivered_at = new Date(); // Set the delivery timestamp
  }
  next();
});

// Middleware for setting delivered_at when updating an existing document
orderSchema.pre(["findOneAndUpdate", "updateOne", "findByIdAndUpdate"], function (next) {
  const update = this.getUpdate();

  // Extract status and delivered_at from both direct and $set-based updates
  const status = update.status || (update.$set && update.$set.status);
  const deliveredAt = update.delivered_at || (update.$set && update.$set.delivered_at);

  // If status is being changed to 'delivered' and delivered_at is not set, add it
  if (status === "delivered" && !deliveredAt) {
    const now = new Date();

    if (update.$set) {
      update.$set.delivered_at = now; // Add to $set if it exists
    } else {
      update.delivered_at = now; // Add directly otherwise
    }
  }

  next();
});

// Create and export the Order model
const Order = model("Order", orderSchema);
export default Order;

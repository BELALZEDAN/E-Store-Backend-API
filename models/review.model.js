import { Schema, model } from "mongoose";

const forbiddenWords = ["badword1", "offensive", "curse"];

// Define the Review schema
const reviewSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true, // User id is required
    },
    product_id: {
      type: Schema.Types.ObjectId,
      ref: "Product", // Reference to the Product model
      required: true, // Product id is required
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User", // Users who liked this review
      },
    ],
    comment: {
      type: String,
      trim: true, // Remove extra whitespace from both ends
      validate: {
        // Custom validator to reject comments with forbidden words
        validator: function (v) {
          const clean = v?.toLowerCase() || "";
          return !forbiddenWords.some((word) => clean.includes(word));
        },
        message: "Comment contains inappropriate language",
      },
    },
  },
  { timestamps: true }
);

const Review = model("Review", reviewSchema);

export default Review;

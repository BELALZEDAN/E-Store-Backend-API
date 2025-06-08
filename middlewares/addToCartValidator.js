import { body } from "express-validator";

// Validator for adding products to the cart
export const addToCartValidator = [
    body("user_id").isMongoId().withMessage("Invalid user ID format"),
    body("products")
        .isArray({ min: 1 })
        .withMessage("Products array must contain at least one product")
        .bail() // Prevents further validation if failed
        .custom((value) => {
            // Check each product for a valid ID and quantity
            for (let item of value) {
                if (!item.product || !mongoose.Types.ObjectId.isValid(item.product)) {
                    throw new Error("Invalid product ID");
                }
                if (item.quantity < 1) {
                    throw new Error("Quantity must be at least 1");
                }
            }
            return true;
        })
];

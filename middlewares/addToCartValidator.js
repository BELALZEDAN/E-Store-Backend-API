import { body } from "express-validator";

export const addToCartValidator = [
    // Validate products array
    body("products")
        // Must be an array with at least one element
        .isArray({ min: 1 })
        .withMessage("Products array must contain at least one product")
        .bail() // Stop validation chain if previous check failed
        // Custom validation for each product in the array
        .custom((value) => {
            // Iterate through each product item
            for (let item of value) {
                // Validate product ID exists and is a valid integer
                if (!item.product || !Number.isInteger(Number(item.product))) {
                    throw new Error("Invalid product ID");
                }

                // Validate quantity is at least 1
                if (item.quantity < 1) {
                    throw new Error("Quantity must be at least 1");
                }
            }
            return true; // Validation passed
        })
];
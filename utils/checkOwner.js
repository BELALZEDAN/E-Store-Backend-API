import { sendResponse } from "../utils/sendResponse.js";

// Helper function to check ownership
export const checkOwner = (document, user, modelName = "Resource") => {
    // Check if the current user is the owner
    if (document.user_id.toString() !== user._id.toString()) {
        return {
            status: 403,
            message: `You are not authorized to access this ${modelName}`
        };
    }
    return null;  // No error, proceed
};

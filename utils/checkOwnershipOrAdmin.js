import { sendResponse } from "../utils/sendResponse.js";

// Helper function to check ownership or admin role
export const checkOwnershipOrAdmin = (document, user, modelName = "Resource") => {
    if (document.user_id.toString() !== user._id.toString() && user.role !== 'admin') {
        return {
            status: 403,
            message: `You are not authorized to access this ${modelName}`
        };
    }
    return null;  // No error, proceed
};

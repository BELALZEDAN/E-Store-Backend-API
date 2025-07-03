import { sendResponse } from "../utils/sendResponse.js";

export const checkOwner = (resource, user, modelName = "Resource") => {
    // Check if the current user is the owner
    if (resource.user_id !== user.id) {
        return {
            status: 403,
            message: `You are not authorized to access this ${modelName}`
        };
    }
    return null; // No error, authorized
};
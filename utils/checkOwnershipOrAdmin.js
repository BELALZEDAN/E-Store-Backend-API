import { sendResponse } from "../utils/sendResponse.js";

export const checkOwnershipOrAdmin = (record, user, modelName = "Resource") => {
    // Check if user is not owner AND not admin
    if (record.user_id !== user.id && user.role !== 'admin') {
        return {
            status: 403,
            message: `You are not authorized to access this ${modelName}`
        };
    }
    return null; // Authorization granted
};
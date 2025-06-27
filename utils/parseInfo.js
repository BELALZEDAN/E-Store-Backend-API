// Helper function to parse shipping and payment info
export const parseInfo = (infoString) => {
    try {
        return JSON.parse(infoString);
    } catch (err) {
        return infoString;
    }
};
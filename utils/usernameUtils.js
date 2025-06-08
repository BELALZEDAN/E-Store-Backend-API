import User from "../models/user.model.js";
import { v4 as uuidv4 } from "uuid"; // Use UUID for generating truly unique identifiers

// Function to generate a base username based on first and last name
export function generateBaseUsername(firstName, lastName) {
    const cleanedFirstName = firstName.trim().toLowerCase().replace(/\s+/g, "_"); // Clean and format the first name
    const cleanedLastName = lastName.trim().toLowerCase().replace(/\s+/g, "_"); // Clean and format the last name
    return `${cleanedFirstName}_${cleanedLastName}`; // Combine first and last name for base username
}

// Function to generate a unique username based on the base name
export async function generateUniqueUsername(firstName, lastName) {
    const baseName = generateBaseUsername(firstName, lastName); // Generate base name

    // Check if the base name already exists
    let existingUser = await User.findOne({ username: baseName });

    if (!existingUser) {
        const randomNumber = Math.floor(Math.random() * 1000000)
            .toString()
            .padStart(6, "0"); // 6-digit random number
        const candidate = `${baseName}${randomNumber}`;

        return candidate; // If base name is unique, return it
    }

    // If the base name exists, append UUID
    const candidate = `${baseName}_${uuidv4()}`;
    return candidate; // Return the generated username with UUID
}
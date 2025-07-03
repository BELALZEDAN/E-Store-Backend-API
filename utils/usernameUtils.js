import { v4 as uuidv4 } from "uuid";
import pool from "../config/db.js"

export function generateBaseUsername(firstName, lastName) {
    const cleanedFirstName = firstName.trim().toLowerCase().replace(/\s+/g, "_");
    const cleanedLastName = lastName.trim().toLowerCase().replace(/\s+/g, "_");
    return `${cleanedFirstName}_${cleanedLastName}`;
}

export async function generateUniqueUsername(firstName, lastName) {
    const baseName = generateBaseUsername(firstName, lastName);
    let connection;

    try {
        connection = await pool.getConnection();

        // Check if username exists in SQL
        const [existingUser] = await connection.query(
            'SELECT id FROM users WHERE username = ?',
            [baseName]
        );

        if (existingUser.length === 0) {
            const randomNumber = Math.floor(Math.random() * 1000000)
                .toString()
                .padStart(6, "0");
            return `${baseName}${randomNumber}`;
        }

        return `${baseName}_${uuidv4()}`;
    } finally {
        if (connection) connection.release();
    }
}
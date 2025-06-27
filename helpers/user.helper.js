import pool from '../config/db.js';


// Adds a new user to the database
export const addUser = async (userData) => {
    try {
        const query = `
      INSERT INTO users 
        (username, first_name, last_name, email, password, role, image_url, bio)
      VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const [result] = await pool.execute(query, [
            userData.username,
            userData.first_name,
            userData.last_name,
            userData.email,
            userData.password,
            userData.role || 'user',
            userData.image_url || null,
            userData.bio || null
        ]);

        // Return user data without password
        const { password, ...user } = userData;
        return { id: result.insertId, ...user };

    } catch (error) {
        console.error('[Database] Error adding user:', error);

        // Handle duplicate entry error
        if (error.code === 'ER_DUP_ENTRY') {
            const field = error.message.includes('email') ? 'Email' : 'Username';
            throw new Error(`${field} already exists`);
        }

        throw error;
    }
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<Object|null>} User object or null if not found
 */
// export const getUserByEmail = async (email) => {
//      ... implementation ...
// };

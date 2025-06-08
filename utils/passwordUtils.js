// Import bcryptjs to handle password hashing and comparison
import bcrypt from "bcryptjs";

// Function to hash a password with a specified number of salt rounds (default is 12)
export const hashPassword = async (password, saltRounds = 12) => {
  // Hash the password using bcrypt and return the hashed result
  return await bcrypt.hash(password, saltRounds);
};

// Function to compare a plain password with a hashed password
export const comparePasswords = async (plainPassword, hashedPassword) => {
  // Compare the plain password with the hashed password and return the result (true/false)
  return await bcrypt.compare(plainPassword, hashedPassword);
};

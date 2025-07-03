// Import jsonwebtoken to create and sign JWTs
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Generate a JWT token using the user ID and role
export const generateToken = (user) => {
  if (!user || !user.id || !user.role) {
    throw new Error("User object must include id and role");
  }

  return jwt.sign(
    { id: user.id, role: user.role }, // Payload: User ID and role
    process.env.JWT_SECRET, // Secret key from environment variables
    {
      expiresIn: "30d", // Token expires in 30 days
    }
  );
};

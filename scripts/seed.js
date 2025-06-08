import { connectDB, connection } from "../config/db.js";

const seedDatabase = async () => {
  try {
    await connectDB(); 

    await connection.execute(
      `INSERT INTO users (name, email, password, image_url, bio) VALUES (?, ?, ?, ?, ?)`,
      ["Alice", "alice@example.com", "hashedpassword123", "alice.jpg", "I love coding"]
    );

    console.log("Seed complete");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding database:", err.message);
    process.exit(1);
  }
};

seedDatabase();

import mongoose from "mongoose";
import "dotenv/config";

const db = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("DATABASE Connected Succesfully");


  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

export { db };

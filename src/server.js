import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/authRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";
import { productRoutes } from "./routes/productRoutes.js";
import "dotenv/config";
import { db } from "./config/db.js";

// a
const app = express();

// middlware
app.use(express.json());
app.use(cors());

// routes

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/product", productRoutes);


// database connection
db()
  .then(() => {
    console.log("Database connection established, starting server...");

    // server connection
    app.listen(process.env.SERVER_PORT, () => {
      console.log(
        `server started at: http://localhost:${process.env.SERVER_PORT}`
      );
    });
  })
  .catch((error) => {
    console.error("Failed to connect to database:", error.message);
    process.exit(1);
  });

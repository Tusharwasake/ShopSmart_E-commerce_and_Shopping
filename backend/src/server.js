import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/authRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";
import { productRoutes } from "./routes/productRoutes.js";
import "dotenv/config";
import { db } from "./config/db.js";

import { categoryRoutes } from "./routes/categoryRoutes.js";
import { variantRoutes } from "./routes/variantRoutes.js";
import { cartRoutes } from "./routes/cartRoutes.js";
import { orderRoutes } from "./routes/orderRoutes.js";
import { paymentRoutes } from "./routes/paymentRoutes.js";
import { shippingRoutes } from "./routes/shippingRoutes.js";
import { wishlistRoutes } from "./routes/wishlistRoutes.js";
import { searchRoutes } from "./routes/searchRoutes.js";
import { reviewRoutes } from "./routes/reviewRoutes.js";
import { couponRoutes } from "./routes/couponRoutes.js";
import { analyticsRoutes } from "./routes/analyticsRoutes.js";
import { inventoryRoutes } from "./routes/inventoryRoutes.js";
import { dashboardRoutes } from "./routes/dashboardRoutes.js";
import { contentRoutes } from "./routes/contentRoutes.js";
import { notificationRoutes } from "./routes/notificationRoutes.js";
import { uploadRoutes } from "./routes/uploadRoutes.js";
import { taxRoutes } from "./routes/taxRoutes.js";
import { vendorRoutes } from "./routes/vendorRoutes.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// middlware
app.use(express.json());
app.use(cors());

// routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/product", productRoutes);
app.use("/payment", paymentRoutes);
app.use("/categories", categoryRoutes);
app.use("/cart", cartRoutes);
app.use("/variants", variantRoutes);
app.use("/orders", orderRoutes);
app.use("/payments", paymentRoutes);
app.use("/shipping", shippingRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/search", searchRoutes);
app.use("/reviews", reviewRoutes);
app.use("/coupons", couponRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/admin/dashboard", dashboardRoutes);
app.use("/content", contentRoutes);
app.use("/notifications", notificationRoutes);
app.use("/upload", uploadRoutes);
app.use("/taxes", taxRoutes);
app.use("/api/vendors", vendorRoutes);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

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

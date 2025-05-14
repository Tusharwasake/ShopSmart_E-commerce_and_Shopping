// routes/variantRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  getProductVariants,
  getVariantById,
  createVariant,
  updateVariant,
  deleteVariant,
  updateVariantPositions,
  bulkUpdateVariantStock,
  getLowStockVariants,
} from "../controllers/variantController.js";

const variantRoutes = express.Router();

// Public routes
variantRoutes.get("/product/:productId", getProductVariants);
variantRoutes.get("/:id", getVariantById);

// Admin routes
variantRoutes.post("/", authentication, adminAuth, createVariant);
variantRoutes.put("/:id", authentication, adminAuth, updateVariant);
variantRoutes.delete("/:id", authentication, adminAuth, deleteVariant);
variantRoutes.put(
  "/positions/update",
  authentication,
  adminAuth,
  updateVariantPositions
);
variantRoutes.put(
  "/stock/bulk-update",
  authentication,
  adminAuth,
  bulkUpdateVariantStock
);
variantRoutes.get(
  "/inventory/low-stock",
  authentication,
  adminAuth,
  getLowStockVariants
);

export { variantRoutes };

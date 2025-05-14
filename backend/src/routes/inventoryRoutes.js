// inventoryRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  getInventoryOverview,
  getProductInventory,
  updateProductStock,
  bulkUpdateStock,
  getLowStockProducts,
  getInventoryHistory,
  createInventoryAdjustment,
  getInventoryStats,
  getVariantInventory,
  updateVariantStock,
} from "../controllers/inventoryController.js";

const inventoryRoutes = express.Router();

// All inventory routes require authentication and admin privileges
inventoryRoutes.get(
  "/overview",
  authentication,
  adminAuth,
  getInventoryOverview
);
inventoryRoutes.get(
  "/product/:productId",
  authentication,
  adminAuth,
  getProductInventory
);
inventoryRoutes.put(
  "/product/:productId",
  authentication,
  adminAuth,
  updateProductStock
);
inventoryRoutes.post(
  "/bulk-update",
  authentication,
  adminAuth,
  bulkUpdateStock
);
inventoryRoutes.get(
  "/low-stock",
  authentication,
  adminAuth,
  getLowStockProducts
);
inventoryRoutes.get("/history", authentication, adminAuth, getInventoryHistory);
inventoryRoutes.post(
  "/adjustment",
  authentication,
  adminAuth,
  createInventoryAdjustment
);
inventoryRoutes.get("/stats", authentication, adminAuth, getInventoryStats);
inventoryRoutes.get(
  "/variant/:variantId",
  authentication,
  adminAuth,
  getVariantInventory
);
inventoryRoutes.put(
  "/variant/:variantId",
  authentication,
  adminAuth,
  updateVariantStock
);

export { inventoryRoutes };

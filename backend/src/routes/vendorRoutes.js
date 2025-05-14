// vendorRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import { vendorAuth } from "../middlewares/vendorAuthMiddleware.js";
import {
  getAllVendors,
  getVendorById,
  registerAsVendor,
  updateVendorProfile,
  getVendorProducts,
  addVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
  getVendorDashboard,
  getVendorOrders,
  updateOrderStatus,
  getVendorPayments,
  getVendorReviews,
  getVendorStatistics,
  approveVendor,
  rejectVendor,
  suspendVendor,
  getVendorApplications,
  getVendorSettlements,
} from "../controllers/vendorController.js";

const vendorRoutes = express.Router();

// Public routes
vendorRoutes.get("/", getAllVendors);
vendorRoutes.get("/:id", getVendorById);

// Vendor registration & profile
vendorRoutes.post("/register", authentication, registerAsVendor);
vendorRoutes.put("/profile", authentication, vendorAuth, updateVendorProfile);

// Vendor products
vendorRoutes.get("/:id/products", getVendorProducts);
vendorRoutes.post("/products", authentication, vendorAuth, addVendorProduct);
vendorRoutes.put(
  "/products/:id",
  authentication,
  vendorAuth,
  updateVendorProduct
);
vendorRoutes.delete(
  "/products/:id",
  authentication,
  vendorAuth,
  deleteVendorProduct
);

// Vendor dashboard
vendorRoutes.get("/dashboard", authentication, vendorAuth, getVendorDashboard);
vendorRoutes.get("/orders", authentication, vendorAuth, getVendorOrders);
vendorRoutes.put(
  "/orders/:id/status",
  authentication,
  vendorAuth,
  updateOrderStatus
);
vendorRoutes.get("/payments", authentication, vendorAuth, getVendorPayments);
vendorRoutes.get("/reviews", authentication, vendorAuth, getVendorReviews);
vendorRoutes.get(
  "/statistics",
  authentication,
  vendorAuth,
  getVendorStatistics
);

// Admin routes for managing vendors
vendorRoutes.get(
  "/admin/applications",
  authentication,
  adminAuth,
  getVendorApplications
);
vendorRoutes.put(
  "/admin/:id/approve",
  authentication,
  adminAuth,
  approveVendor
);
vendorRoutes.put("/admin/:id/reject", authentication, adminAuth, rejectVendor);
vendorRoutes.put(
  "/admin/:id/suspend",
  authentication,
  adminAuth,
  suspendVendor
);
vendorRoutes.get(
  "/admin/settlements",
  authentication,
  adminAuth,
  getVendorSettlements
);

export { vendorRoutes };

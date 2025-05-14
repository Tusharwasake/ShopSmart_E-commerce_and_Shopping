// dashboardRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  getDashboardSummary,
  getRecentOrders,
  getTopProducts,
  getSalesStatistics,
  getCustomerStatistics,
  getInventorySummary,
  getRevenueChart,
  getSystemSettings,
  updateSystemSettings,
  getNotifications,
  markNotificationAsRead,
  getAuditLog,
} from "../controllers/dashboardController.js";

const dashboardRoutes = express.Router();

// All dashboard routes require authentication and admin privileges
dashboardRoutes.get("/summary", authentication, adminAuth, getDashboardSummary);
dashboardRoutes.get(
  "/recent-orders",
  authentication,
  adminAuth,
  getRecentOrders
);
dashboardRoutes.get("/top-products", authentication, adminAuth, getTopProducts);
dashboardRoutes.get("/sales", authentication, adminAuth, getSalesStatistics);
dashboardRoutes.get(
  "/customers",
  authentication,
  adminAuth,
  getCustomerStatistics
);
dashboardRoutes.get(
  "/inventory",
  authentication,
  adminAuth,
  getInventorySummary
);
dashboardRoutes.get(
  "/revenue-chart",
  authentication,
  adminAuth,
  getRevenueChart
);
dashboardRoutes.get("/settings", authentication, adminAuth, getSystemSettings);
dashboardRoutes.put(
  "/settings",
  authentication,
  adminAuth,
  updateSystemSettings
);
dashboardRoutes.get(
  "/notifications",
  authentication,
  adminAuth,
  getNotifications
);
dashboardRoutes.put(
  "/notifications/:id",
  authentication,
  adminAuth,
  markNotificationAsRead
);
dashboardRoutes.get("/audit-log", authentication, adminAuth, getAuditLog);

export { dashboardRoutes };

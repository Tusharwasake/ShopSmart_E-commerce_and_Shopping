// analyticsRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  getSalesAnalytics,
  getProductAnalytics,
  getCustomerAnalytics,
  getInventoryAnalytics,
  getMarketingAnalytics,
  getDashboardSummary,
  getSearchAnalytics,
  getCategoryAnalytics,
  getRevenueBreakdown,
  exportAnalyticsReport,
} from "../controllers/analyticsController.js";

const analyticsRoutes = express.Router();

// All routes require authentication and admin privileges
analyticsRoutes.get("/sales", authentication, adminAuth, getSalesAnalytics);
analyticsRoutes.get(
  "/products",
  authentication,
  adminAuth,
  getProductAnalytics
);
analyticsRoutes.get(
  "/customers",
  authentication,
  adminAuth,
  getCustomerAnalytics
);
analyticsRoutes.get(
  "/inventory",
  authentication,
  adminAuth,
  getInventoryAnalytics
);
analyticsRoutes.get(
  "/marketing",
  authentication,
  adminAuth,
  getMarketingAnalytics
);
analyticsRoutes.get(
  "/dashboard-summary",
  authentication,
  adminAuth,
  getDashboardSummary
);
analyticsRoutes.get("/search", authentication, adminAuth, getSearchAnalytics);
analyticsRoutes.get(
  "/categories",
  authentication,
  adminAuth,
  getCategoryAnalytics
);
analyticsRoutes.get(
  "/revenue-breakdown",
  authentication,
  adminAuth,
  getRevenueBreakdown
);
analyticsRoutes.get(
  "/export",
  authentication,
  adminAuth,
  exportAnalyticsReport
);

export { analyticsRoutes };

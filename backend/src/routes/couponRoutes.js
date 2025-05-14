// couponRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  getAllCoupons,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getActiveCoupons,
  applyCoupon,
  removeCoupon,
  getUserCoupons,
  getCouponUsage,
  bulkUpdateCoupons,
} from "../controllers/couponController.js";

const couponRoutes = express.Router();

// Public routes
couponRoutes.get("/active", getActiveCoupons);
couponRoutes.post("/validate", validateCoupon);

// Customer routes
couponRoutes.post("/apply", authentication, applyCoupon);
couponRoutes.delete("/remove", authentication, removeCoupon);
couponRoutes.get("/my-coupons", authentication, getUserCoupons);

// Admin routes
couponRoutes.get("/", authentication, adminAuth, getAllCoupons);
couponRoutes.get("/:code", authentication, adminAuth, getCouponByCode);
couponRoutes.post("/", authentication, adminAuth, createCoupon);
couponRoutes.put("/:id", authentication, adminAuth, updateCoupon);
couponRoutes.delete("/:id", authentication, adminAuth, deleteCoupon);
couponRoutes.get("/usage/:code", authentication, adminAuth, getCouponUsage);
couponRoutes.post("/bulk-update", authentication, adminAuth, bulkUpdateCoupons);

export { couponRoutes };

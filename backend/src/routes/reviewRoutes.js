// reviewRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getReviewById,
  getUserReviews,
  getReviewStats,
  likeReview,
  unlikeReview,
  reportReview,
  getReportedReviews,
  approveReview,
  rejectReview,
} from "../controllers/reviewController.js";

const reviewRoutes = express.Router();

// Public routes
reviewRoutes.get("/product/:productId", getProductReviews);
reviewRoutes.get("/:id", getReviewById);
reviewRoutes.get("/stats/product/:productId", getReviewStats);

// Authenticated user routes
reviewRoutes.post("/", authentication, createReview);
reviewRoutes.put("/:id", authentication, updateReview);
reviewRoutes.delete("/:id", authentication, deleteReview);
reviewRoutes.get("/user/me", authentication, getUserReviews);
reviewRoutes.post("/:id/like", authentication, likeReview);
reviewRoutes.delete("/:id/like", authentication, unlikeReview);
reviewRoutes.post("/:id/report", authentication, reportReview);

// Admin routes
reviewRoutes.get(
  "/admin/reported",
  authentication,
  adminAuth,
  getReportedReviews
);
reviewRoutes.put("/:id/approve", authentication, adminAuth, approveReview);
reviewRoutes.put("/:id/reject", authentication, adminAuth, rejectReview);

export { reviewRoutes };

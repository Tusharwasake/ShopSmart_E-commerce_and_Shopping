// orderRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  createOrder,
  getOrderById,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  processRefund,
  getOrderInvoice,
  validateCheckout,
  createGuestOrder,
  getOrderTracking,
  getOrderStatistics,
  resendOrderConfirmation,
} from "../controllers/orderController.js";

const orderRoutes = express.Router();

// Customer order routes
orderRoutes.post("/create", authentication, createOrder);
orderRoutes.post("/validate-checkout", authentication, validateCheckout);
orderRoutes.post("/guest", createGuestOrder);
orderRoutes.get("/my-orders", authentication, getUserOrders);
orderRoutes.get("/:id", authentication, getOrderById);
orderRoutes.get("/:id/invoice", authentication, getOrderInvoice);
orderRoutes.get("/:id/tracking", authentication, getOrderTracking);
orderRoutes.post("/:id/cancel", authentication, cancelOrder);
orderRoutes.post(
  "/:id/resend-confirmation",
  authentication,
  resendOrderConfirmation
);

// Admin order routes
orderRoutes.get("/", authentication, adminAuth, getAllOrders);
orderRoutes.put("/:id/status", authentication, adminAuth, updateOrderStatus);
orderRoutes.post("/:id/refund", authentication, adminAuth, processRefund);
orderRoutes.get("/statistics", authentication, adminAuth, getOrderStatistics);

export { orderRoutes };

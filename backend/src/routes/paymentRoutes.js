// paymentRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  createPaymentIntent,
  processPayment,
  handlePaymentWebhook,
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getTransactions,
  getTransactionById,
  getPaymentStatistics,
} from "../controllers/paymentController.js";

const paymentRoutes = express.Router();

// Customer payment routes
paymentRoutes.post("/create-intent", authentication, createPaymentIntent);
paymentRoutes.post("/process", authentication, processPayment);
paymentRoutes.get("/methods", authentication, getPaymentMethods);
paymentRoutes.post("/methods", authentication, addPaymentMethod);
paymentRoutes.put("/methods/:id", authentication, updatePaymentMethod);
paymentRoutes.delete("/methods/:id", authentication, deletePaymentMethod);
paymentRoutes.get("/transactions", authentication, getTransactions);
paymentRoutes.get("/transactions/:id", authentication, getTransactionById);

// Admin payment routes
paymentRoutes.get(
  "/statistics",
  authentication,
  adminAuth,
  getPaymentStatistics
);

// Webhook (no authentication - secured by secret)
paymentRoutes.post("/webhook", handlePaymentWebhook);

export { paymentRoutes };

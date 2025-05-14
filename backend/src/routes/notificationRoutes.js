// notificationRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  getUserNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  updateNotificationPreferences,
  getNotificationPreferences,
  sendTestNotification,
  getAdminNotifications,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  getNotificationTemplates,
} from "../controllers/notificationController.js";

const notificationRoutes = express.Router();

// User notification routes
notificationRoutes.get("/", authentication, getUserNotifications);
notificationRoutes.get("/:id", authentication, getNotificationById);
notificationRoutes.put("/:id/read", authentication, markNotificationAsRead);
notificationRoutes.put("/read-all", authentication, markAllNotificationsAsRead);
notificationRoutes.delete("/:id", authentication, deleteNotification);
notificationRoutes.delete("/clear-all", authentication, deleteAllNotifications);

// Notification preferences
notificationRoutes.get(
  "/preferences",
  authentication,
  getNotificationPreferences
);
notificationRoutes.put(
  "/preferences",
  authentication,
  updateNotificationPreferences
);

// Admin notification routes
notificationRoutes.get(
  "/admin",
  authentication,
  adminAuth,
  getAdminNotifications
);
notificationRoutes.post(
  "/test",
  authentication,
  adminAuth,
  sendTestNotification
);
notificationRoutes.get(
  "/templates",
  authentication,
  adminAuth,
  getNotificationTemplates
);
notificationRoutes.post(
  "/templates",
  authentication,
  adminAuth,
  createNotificationTemplate
);
notificationRoutes.put(
  "/templates/:id",
  authentication,
  adminAuth,
  updateNotificationTemplate
);
notificationRoutes.delete(
  "/templates/:id",
  authentication,
  adminAuth,
  deleteNotificationTemplate
);

export { notificationRoutes };

// shippingRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  getShippingMethods,
  getShippingMethodById,
  createShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  getShippingZones,
  getShippingZoneById,
  createShippingZone,
  updateShippingZone,
  deleteShippingZone,
  validateAddress,
  calculateShipping,
} from "../controllers/shippingController.js";

const shippingRoutes = express.Router();

// Public shipping routes
shippingRoutes.get("/methods", getShippingMethods);
// shippingRoutes.post("/calculate", calculateShipping); // Removing this until implemented
shippingRoutes.post("/validate-address", validateAddress);

// Admin shipping methods routes
shippingRoutes.get(
  "/admin/methods",
  authentication,
  adminAuth,
  getShippingMethods
);
shippingRoutes.get(
  "/admin/methods/:id",
  authentication,
  adminAuth,
  getShippingMethodById
);
shippingRoutes.post(
  "/admin/methods",
  authentication,
  adminAuth,
  createShippingMethod
);
shippingRoutes.put(
  "/admin/methods/:id",
  authentication,
  adminAuth,
  updateShippingMethod
);
shippingRoutes.delete(
  "/admin/methods/:id",
  authentication,
  adminAuth,
  deleteShippingMethod
);

// Admin shipping zones routes
shippingRoutes.get("/admin/zones", authentication, adminAuth, getShippingZones);
shippingRoutes.get(
  "/admin/zones/:id",
  authentication,
  adminAuth,
  getShippingZoneById
);
shippingRoutes.post(
  "/admin/zones",
  authentication,
  adminAuth,
  createShippingZone
);
shippingRoutes.put(
  "/admin/zones/:id",
  authentication,
  adminAuth,
  updateShippingZone
);
shippingRoutes.delete(
  "/admin/zones/:id",
  authentication,
  adminAuth,
  deleteShippingZone
);

shippingRoutes.post("/calculate", calculateShipping);
export { shippingRoutes };

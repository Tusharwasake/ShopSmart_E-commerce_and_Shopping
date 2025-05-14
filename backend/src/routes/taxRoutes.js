// taxRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  getTaxRates,
  getTaxRateById,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
  calculateTax,
  getTaxZones,
  getTaxZoneById,
  createTaxZone,
  updateTaxZone,
  deleteTaxZone,
  getTaxSettings,
  updateTaxSettings,
  getTaxReport,
} from "../controllers/taxController.js";

const taxRoutes = express.Router();

// Public tax calculation route
taxRoutes.post("/calculate", calculateTax);

// Tax rates routes (admin only)
taxRoutes.get("/rates", authentication, adminAuth, getTaxRates);
taxRoutes.get("/rates/:id", authentication, adminAuth, getTaxRateById);
taxRoutes.post("/rates", authentication, adminAuth, createTaxRate);
taxRoutes.put("/rates/:id", authentication, adminAuth, updateTaxRate);
taxRoutes.delete("/rates/:id", authentication, adminAuth, deleteTaxRate);

// Tax zones routes (admin only)
taxRoutes.get("/zones", authentication, adminAuth, getTaxZones);
taxRoutes.get("/zones/:id", authentication, adminAuth, getTaxZoneById);
taxRoutes.post("/zones", authentication, adminAuth, createTaxZone);
taxRoutes.put("/zones/:id", authentication, adminAuth, updateTaxZone);
taxRoutes.delete("/zones/:id", authentication, adminAuth, deleteTaxZone);

// Tax settings routes (admin only)
taxRoutes.get("/settings", authentication, adminAuth, getTaxSettings);
taxRoutes.put("/settings", authentication, adminAuth, updateTaxSettings);

// Tax reporting (admin only)
taxRoutes.get("/report", authentication, adminAuth, getTaxReport);

export { taxRoutes };

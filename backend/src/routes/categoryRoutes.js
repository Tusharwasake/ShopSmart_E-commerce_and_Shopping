// categoryRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts,
  getCategoryTree,
  getAllSubcategories,
  getCategoryAttributes,
} from "../controllers/categoryController.js";

const categoryRoutes = express.Router();

// Public category routes
categoryRoutes.get("/", getAllCategories);
categoryRoutes.get("/tree", getCategoryTree);
categoryRoutes.get("/:id", getCategoryById);
categoryRoutes.get("/:id/products", getCategoryProducts);
categoryRoutes.get("/:id/subcategories", getAllSubcategories);
categoryRoutes.get("/:id/attributes", getCategoryAttributes);

// Admin category routes
categoryRoutes.post("/", authentication, adminAuth, createCategory);
categoryRoutes.put("/:id", authentication, adminAuth, updateCategory);
categoryRoutes.delete("/:id", authentication, adminAuth, deleteCategory);

export { categoryRoutes };

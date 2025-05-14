// searchRoutes.js
import express from "express";
import {
  searchProducts,
  searchSuggestions,
  getPopularSearches,
  recordSearchQuery,
  searchByCategory,
  searchByFilter,
} from "../controllers/searchController.js";

const searchRoutes = express.Router();

// Public search routes
searchRoutes.get("/", searchProducts);
searchRoutes.get("/suggestions", searchSuggestions);
searchRoutes.get("/popular", getPopularSearches);
searchRoutes.get("/category/:category", searchByCategory);
searchRoutes.post("/filter", searchByFilter);

// Record search query (typically called from frontend after search)
searchRoutes.post("/record", recordSearchQuery);

export { searchRoutes };

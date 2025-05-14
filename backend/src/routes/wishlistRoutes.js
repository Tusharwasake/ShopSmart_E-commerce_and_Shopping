// wishlistRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
  clearWishlist,
  checkWishlistItem,
} from "../controllers/wishlistController.js";

const wishlistRoutes = express.Router();

// All wishlist routes require authentication
wishlistRoutes.get("/", authentication, getWishlist);
wishlistRoutes.post("/add", authentication, addToWishlist);
wishlistRoutes.delete("/remove/:productId", authentication, removeFromWishlist);
wishlistRoutes.post("/move-to-cart/:productId", authentication, moveToCart);
wishlistRoutes.delete("/clear", authentication, clearWishlist);
wishlistRoutes.get("/check/:productId", authentication, checkWishlistItem);

export { wishlistRoutes };

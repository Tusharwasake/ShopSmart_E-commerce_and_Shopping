// cartRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartTotal,
  applyCartCoupon,
  removeCoupon,
  moveToWishlist,
  saveForLater,
  getSavedItems,
  moveSavedToCart,
  removeSavedItem,
} from "../controllers/cartController.js";

const cartRoutes = express.Router();

// Cart management routes - all require authentication
cartRoutes.get("/", authentication, getCart);
cartRoutes.post("/add", authentication, addToCart);
cartRoutes.put("/update/:itemId", authentication, updateCartItem);
cartRoutes.delete("/remove/:itemId", authentication, removeFromCart);
cartRoutes.delete("/clear", authentication, clearCart);
cartRoutes.get("/total", authentication, getCartTotal);

// Coupon routes
cartRoutes.post("/coupon/apply", authentication, applyCartCoupon);
cartRoutes.delete("/coupon", authentication, removeCoupon);

// Wishlist interaction
cartRoutes.post("/move-to-wishlist/:itemId", authentication, moveToWishlist);

// Save for later functionality
cartRoutes.post("/save-for-later/:itemId", authentication, saveForLater);
cartRoutes.get("/saved", authentication, getSavedItems);
cartRoutes.post("/saved/move-to-cart/:itemId", authentication, moveSavedToCart);
cartRoutes.delete("/saved/remove/:itemId", authentication, removeSavedItem);

export { cartRoutes };



// productRoutes.js
import express from "express";
import { authentication } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
  productInsert,
  getProductById,
  getProductsByCategory,
  updateProduct,
  deleteProduct,
  searchProducts,
  addProductToCart,
  reduceCartQuantity,
  removeFromCart,
  clearCart,
  getCart,
  getAllProducts,
  wishlistProduct,
  removeWishlist,
  getWishlist,
  getTotalCartPrice,
  getProductReviews,
  addProductReview,
  getFeaturedProducts,
  getRelatedProducts,
  getBestSellers,
  getNewArrivals,
  getProductsOnSale,
  bulkUpdateStock,
  createProductReview,
  updateProductReview,
  deleteProductReview,
  uploadProductImages,
  getProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant
} from "../controllers/productController.js";

const productRoutes = express.Router();

// Product listing/search routes
productRoutes.get("/", getAllProducts);
productRoutes.get("/search", searchProducts);
productRoutes.get("/featured", getFeaturedProducts);
productRoutes.get("/best-sellers", getBestSellers);
productRoutes.get("/new-arrivals", getNewArrivals);
productRoutes.get("/on-sale", getProductsOnSale);
productRoutes.get("/category/:category", getProductsByCategory);

// Product CRUD routes
productRoutes.post("/", authentication, adminAuth, productInsert);
productRoutes.get("/:id", getProductById);
productRoutes.put("/:id", authentication, adminAuth, updateProduct);
productRoutes.delete("/:id", authentication, adminAuth, deleteProduct);
productRoutes.get("/:id/related", getRelatedProducts);

// Product variants
productRoutes.get("/:id/variants", getProductVariants);
productRoutes.post("/:id/variants", authentication, adminAuth, createProductVariant);
productRoutes.put("/:id/variants/:variantId", authentication, adminAuth, updateProductVariant);
productRoutes.delete("/:id/variants/:variantId", authentication, adminAuth, deleteProductVariant);

// Product images
productRoutes.post("/:id/images", authentication, adminAuth, uploadProductImages);

// Product reviews
productRoutes.get("/:id/reviews", getProductReviews);
productRoutes.post("/:id/reviews", authentication, createProductReview);
productRoutes.put("/reviews/:reviewId", authentication, updateProductReview);
productRoutes.delete("/reviews/:reviewId", authentication, deleteProductReview);

// Cart routes
productRoutes.get("/cart", authentication, getCart);
productRoutes.post("/cart", authentication, addProductToCart);
productRoutes.put("/cart/:productId", authentication, reduceCartQuantity);
productRoutes.delete("/cart/:productId", authentication, removeFromCart);
productRoutes.delete("/cart", authentication, clearCart);
productRoutes.get("/cart/total", authentication, getTotalCartPrice);

// Wishlist routes
productRoutes.get("/wishlist", authentication, getWishlist);
productRoutes.post("/wishlist", authentication, wishlistProduct);
productRoutes.delete("/wishlist/:productId", authentication, removeWishlist);

// Admin inventory management
productRoutes.post("/bulk-update-stock", authentication, adminAuth, bulkUpdateStock);

export { productRoutes };
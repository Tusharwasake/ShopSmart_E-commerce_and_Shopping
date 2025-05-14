// wishlistController.js
import { user } from "../models/User.js";
import { Product } from "../models/Product.js";
import mongoose from "mongoose";

// Get user's wishlist
const getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userDoc = await user.findById(userId).populate({
      path: 'wishlist',
      select: 'title price images stock discount description category'
    });

    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userDoc.wishlist || userDoc.wishlist.length === 0) {
      return res.status(200).json({
        message: "Wishlist is empty",
        wishlist: []
      });
    }

    // Check if products are still available and in stock
    const wishlistItems = userDoc.wishlist.map(product => {
      const inStock = product.stock > 0;
      return {
        id: product._id,
        title: product.title,
        price: product.price,
        discount: product.discount || 0,
        discountedPrice: product.discount ? 
          product.price - (product.price * (product.discount / 100)) : 
          product.price,
        image: product.images && product.images.length > 0 ? product.images[0] : null,
        inStock,
        category: product.category,
        description: product.description
      };
    });

    res.status(200).json({
      message: "Wishlist fetched successfully",
      wishlist: wishlistItems,
      count: wishlistItems.length
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error.message);
    res.status(500).json({ message: "Error fetching wishlist" });
  }
};

// Add product to wishlist
const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const userDoc = await user.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    // Initialize wishlist array if it doesn't exist
    if (!userDoc.wishlist) {
      userDoc.wishlist = [];
    }

    // Check if product is already in wishlist
    if (userDoc.wishlist.includes(productId)) {
      return res.status(400).json({ message: "Product already in wishlist" });
    }

    // Add to wishlist
    userDoc.wishlist.push(productId);
    await userDoc.save();

    res.status(200).json({
      message: "Product added to wishlist",
      wishlistCount: userDoc.wishlist.length
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error.message);
    res.status(500).json({ message: "Error adding to wishlist" });
  }
};

// Remove product from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const userDoc = await user.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if wishlist exists
    if (!userDoc.wishlist || userDoc.wishlist.length === 0) {
      return res.status(404).json({ message: "Wishlist is empty" });
    }

    // Check if product is in wishlist
    const productIndex = userDoc.wishlist.indexOf(productId);
    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in wishlist" });
    }

    // Remove from wishlist
    userDoc.wishlist.splice(productIndex, 1);
    await userDoc.save();

    res.status(200).json({
      message: "Product removed from wishlist",
      wishlistCount: userDoc.wishlist.length
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error.message);
    res.status(500).json({ message: "Error removing from wishlist" });
  }
};

// Move product from wishlist to cart
const moveToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    const { quantity = 1, variantId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const userDoc = await user.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if wishlist exists
    if (!userDoc.wishlist || userDoc.wishlist.length === 0) {
      return res.status(404).json({ message: "Wishlist is empty" });
    }

    // Check if product is in wishlist
    const productIndex = userDoc.wishlist.indexOf(productId);
    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in wishlist" });
    }

    // Check if product exists and has enough stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check stock
    if (variantId) {
      // Check variant stock if applicable
      const variant = product.variants && product.variants.find(v => v._id.toString() === variantId);
      if (variant && variant.stock < quantity) {
        return res.status(400).json({
          message: "Not enough stock for this variant",
          availableStock: variant.stock
        });
      }
    } else if (product.stock < quantity) {
      return res.status(400).json({
        message: "Not enough stock available",
        availableStock: product.stock
      });
    }

    // Initialize cart if it doesn't exist
    if (!userDoc.cart) {
      userDoc.cart = [];
    }

    // Check if product already in cart
    const cartItemIndex = userDoc.cart.findIndex(item => {
      if (variantId) {
        return item.productId.toString() === productId &&
               item.variantId && item.variantId.toString() === variantId;
      }
      return item.productId.toString() === productId && !item.variantId;
    });

    if (cartItemIndex !== -1) {
      // Update quantity if product already in cart
      userDoc.cart[cartItemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      const cartItem = {
        productId,
        quantity,
        addedAt: new Date()
      };

      if (variantId) {
        cartItem.variantId = variantId;
      }

      userDoc.cart.push(cartItem);
    }

    // Update product stock
    if (variantId) {
      const variantIndex = product.variants.findIndex(v => v._id.toString() === variantId);
      product.variants[variantIndex].stock -= quantity;
    } else {
      product.stock -= quantity;
    }

    await product.save();

    // Remove from wishlist
    userDoc.wishlist.splice(productIndex, 1);
    await userDoc.save();

    res.status(200).json({
      message: "Product moved from wishlist to cart",
      wishlistCount: userDoc.wishlist.length,
      cartCount: userDoc.cart.length
    });
  } catch (error) {
    console.error("Error moving product to cart:", error.message);
    res.status(500).json({ message: "Error moving product to cart" });
  }
};

// Clear wishlist
const clearWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userDoc = await user.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    // Clear wishlist
    userDoc.wishlist = [];
    await userDoc.save();

    res.status(200).json({
      message: "Wishlist cleared successfully"
    });
  } catch (error) {
    console.error("Error clearing wishlist:", error.message);
    res.status(500).json({ message: "Error clearing wishlist" });
  }
};

// Check if product is in wishlist
const checkWishlistItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const userDoc = await user.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    const isInWishlist = userDoc.wishlist && userDoc.wishlist.includes(productId);

    res.status(200).json({
      inWishlist: isInWishlist
    });
  } catch (error) {
    console.error("Error checking wishlist item:", error.message);
    res.status(500).json({ message: "Error checking wishlist item" });
  }
};

export {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
  clearWishlist,
  checkWishlistItem
};
// cartController.js
import { user } from "../models/User.js";
import { Product } from "../models/Product.js";
import { ProductVariant } from "../models/ProductVariant.js";
import { Coupon } from "../models/Coupon.js";
import mongoose from "mongoose";

// Get cart contents
const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userFetch = await user.findById(userId).populate({
      path: "cart.productId",
      select: "title price images stock discount variants",
    });

    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userFetch.cart || userFetch.cart.length === 0) {
      return res.status(200).json({
        message: "Cart is empty",
        cart: [],
        totalItems: 0,
        subtotal: 0,
      });
    }

    // Transform cart data for response
    const cartItems = [];
    let subtotal = 0;

    for (const item of userFetch.cart) {
      if (!item.productId) continue;

      let price = item.productId.price;
      let variantInfo = null;

      // Handle variant pricing
      if (
        item.variantId &&
        item.productId.variants &&
        item.productId.variants.length > 0
      ) {
        const variant = item.productId.variants.find(
          (v) => v._id.toString() === item.variantId.toString()
        );

        if (variant) {
          if (variant.price) {
            price = variant.price;
          }
          variantInfo = {
            id: variant._id,
            name: variant.name,
            attributes: variant.attributes,
          };
        }
      }

      // Apply discount if any
      const discount = item.productId.discount || 0;
      const discountedPrice = price - price * (discount / 100);

      const itemTotal = discountedPrice * item.quantity;
      subtotal += itemTotal;

      cartItems.push({
        id: item._id,
        productId: item.productId._id,
        title: item.productId.title,
        price: price,
        discountedPrice: discountedPrice,
        discount: discount,
        image:
          item.productId.images && item.productId.images.length > 0
            ? item.productId.images[0]
            : null,
        quantity: item.quantity,
        variant: variantInfo,
        stock:
          item.variantId && variantInfo
            ? item.productId.variants.find(
                (v) => v._id.toString() === item.variantId.toString()
              )?.stock
            : item.productId.stock,
        total: itemTotal,
        addedAt: item.addedAt,
      });
    }

    // Get applied coupon if any
    let couponDiscount = 0;
    let couponInfo = null;

    if (userFetch.cart.coupon) {
      couponInfo = {
        code: userFetch.cart.coupon.code,
        discountType: userFetch.cart.coupon.discountType,
        discountValue: userFetch.cart.coupon.discountValue,
      };

      // Calculate coupon discount
      if (userFetch.cart.coupon.discountType === "percentage") {
        couponDiscount = subtotal * (userFetch.cart.coupon.discountValue / 100);
      } else {
        couponDiscount = userFetch.cart.coupon.discountValue;
      }

      // Don't allow negative total
      if (couponDiscount > subtotal) {
        couponDiscount = subtotal;
      }
    }

    const total = subtotal - couponDiscount;

    res.status(200).json({
      message: "Cart fetched successfully",
      cart: cartItems,
      totalItems: cartItems.length,
      subtotal,
      coupon: couponInfo,
      couponDiscount,
      total,
    });
  } catch (error) {
    console.error("Error fetching cart:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Add to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity, variantId } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        message: "Product ID and quantity are required",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than 0",
      });
    }

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check stock
    if (variantId) {
      // Check variant stock
      let variant;
      if (product.variants && product.variants.length > 0) {
        variant = product.variants.find((v) => v._id.toString() === variantId);
      }

      if (!variant) {
        // Try to find in separate variants collection if not embedded
        variant = await ProductVariant.findOne({
          _id: variantId,
          productId,
        });
      }

      if (!variant) {
        return res.status(404).json({ message: "Variant not found" });
      }

      if (variant.stock < quantity) {
        return res.status(400).json({
          message: "Not enough stock available",
          availableStock: variant.stock,
        });
      }
    } else {
      // Check main product stock
      if (product.stock < quantity) {
        return res.status(400).json({
          message: "Not enough stock available",
          availableStock: product.stock,
        });
      }
    }

    // Check if cart exists, create if not
    if (!userFetch.cart) {
      userFetch.cart = [];
    }

    // Check if product already in cart
    const existingItemIndex = userFetch.cart.findIndex((item) => {
      if (variantId) {
        return (
          item.productId.toString() === productId &&
          item.variantId &&
          item.variantId.toString() === variantId
        );
      }
      return item.productId.toString() === productId && !item.variantId;
    });

    if (existingItemIndex !== -1) {
      // Update quantity if product already in cart
      userFetch.cart[existingItemIndex].quantity += quantity;
    } else {
      // Add new product to cart
      const cartItem = {
        productId,
        quantity,
        addedAt: new Date(),
      };

      if (variantId) {
        cartItem.variantId = variantId;
      }

      userFetch.cart.push(cartItem);
    }

    // Update product stock
    if (variantId) {
      // Update variant stock
      if (product.variants && product.variants.length > 0) {
        const variantIndex = product.variants.findIndex(
          (v) => v._id.toString() === variantId
        );

        if (variantIndex !== -1) {
          product.variants[variantIndex].stock -= quantity;
          await product.save();
        } else {
          // Update separate variant collection
          await ProductVariant.updateOne(
            { _id: variantId },
            { $inc: { stock: -quantity } }
          );
        }
      } else {
        // Update separate variant collection
        await ProductVariant.updateOne(
          { _id: variantId },
          { $inc: { stock: -quantity } }
        );
      }
    } else {
      // Update main product stock
      product.stock -= quantity;
      await product.save();
    }

    await userFetch.save();

    res.status(200).json({
      message: "Product added to cart successfully",
      cartSize: userFetch.cart.length,
    });
  } catch (error) {
    console.error("Error adding to cart:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update cart item
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        message:
          "Quantity must be greater than 0. Use remove endpoint to delete items.",
      });
    }

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find item in cart
    const cartItemIndex = userFetch.cart.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (cartItemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    const cartItem = userFetch.cart[cartItemIndex];
    const productId = cartItem.productId;
    const variantId = cartItem.variantId;
    const oldQuantity = cartItem.quantity;

    // Get product to check stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Calculate quantity difference
    const quantityDiff = quantity - oldQuantity;

    // Check if enough stock available
    if (variantId) {
      // Check variant stock
      let variant;
      if (product.variants && product.variants.length > 0) {
        variant = product.variants.find((v) => v._id.toString() === variantId);
      }

      if (!variant) {
        // Try to find in separate variants collection
        variant = await ProductVariant.findOne({
          _id: variantId,
          productId,
        });
      }

      if (!variant) {
        return res.status(404).json({ message: "Variant not found" });
      }

      if (quantityDiff > 0 && variant.stock < quantityDiff) {
        return res.status(400).json({
          message: "Not enough stock available",
          availableStock: variant.stock,
          requestedIncrease: quantityDiff,
        });
      }

      // Update variant stock
      if (product.variants && product.variants.length > 0) {
        const variantIndex = product.variants.findIndex(
          (v) => v._id.toString() === variantId
        );

        if (variantIndex !== -1) {
          product.variants[variantIndex].stock -= quantityDiff;
          await product.save();
        } else {
          // Update separate variant collection
          await ProductVariant.updateOne(
            { _id: variantId },
            { $inc: { stock: -quantityDiff } }
          );
        }
      } else {
        // Update separate variant collection
        await ProductVariant.updateOne(
          { _id: variantId },
          { $inc: { stock: -quantityDiff } }
        );
      }
    } else {
      // Check main product stock
      if (quantityDiff > 0 && product.stock < quantityDiff) {
        return res.status(400).json({
          message: "Not enough stock available",
          availableStock: product.stock,
          requestedIncrease: quantityDiff,
        });
      }

      // Update main product stock
      product.stock -= quantityDiff;
      await product.save();
    }

    // Update cart item quantity
    userFetch.cart[cartItemIndex].quantity = quantity;
    await userFetch.save();

    res.status(200).json({
      message: "Cart item updated successfully",
      itemId,
      newQuantity: quantity,
    });
  } catch (error) {
    console.error("Error updating cart item:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Remove from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find item in cart
    const cartItemIndex = userFetch.cart.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (cartItemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    const cartItem = userFetch.cart[cartItemIndex];
    const productId = cartItem.productId;
    const variantId = cartItem.variantId;
    const quantity = cartItem.quantity;

    // Get product to restore stock
    const product = await Product.findById(productId);
    if (product) {
      if (variantId) {
        // Restore variant stock
        if (product.variants && product.variants.length > 0) {
          const variantIndex = product.variants.findIndex(
            (v) => v._id.toString() === variantId
          );

          if (variantIndex !== -1) {
            product.variants[variantIndex].stock += quantity;
            await product.save();
          } else {
            // Update separate variant collection
            await ProductVariant.updateOne(
              { _id: variantId },
              { $inc: { stock: quantity } }
            );
          }
        } else {
          // Update separate variant collection
          await ProductVariant.updateOne(
            { _id: variantId },
            { $inc: { stock: quantity } }
          );
        }
      } else {
        // Restore main product stock
        product.stock += quantity;
        await product.save();
      }
    }

    // Remove item from cart
    userFetch.cart.splice(cartItemIndex, 1);
    await userFetch.save();

    res.status(200).json({
      message: "Item removed from cart successfully",
      remainingItems: userFetch.cart.length,
    });
  } catch (error) {
    console.error("Error removing from cart:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userFetch.cart || userFetch.cart.length === 0) {
      return res.status(200).json({ message: "Cart is already empty" });
    }

    // Restore stock for all items
    for (const item of userFetch.cart) {
      const product = await Product.findById(item.productId);
      if (product) {
        if (item.variantId) {
          // Restore variant stock
          if (product.variants && product.variants.length > 0) {
            const variantIndex = product.variants.findIndex(
              (v) => v._id.toString() === item.variantId.toString()
            );

            if (variantIndex !== -1) {
              product.variants[variantIndex].stock += item.quantity;
              await product.save();
            } else {
              // Update separate variant collection
              await ProductVariant.updateOne(
                { _id: item.variantId },
                { $inc: { stock: item.quantity } }
              );
            }
          } else {
            // Update separate variant collection
            await ProductVariant.updateOne(
              { _id: item.variantId },
              { $inc: { stock: item.quantity } }
            );
          }
        } else {
          // Restore main product stock
          product.stock += item.quantity;
          await product.save();
        }
      }
    }

    // Clear cart
    userFetch.cart = [];
    // Remove any applied coupon
    userFetch.cart.coupon = undefined;

    await userFetch.save();

    res.status(200).json({ message: "Cart cleared successfully" });
  } catch (error) {
    console.error("Error clearing cart:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get cart total
const getCartTotal = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userFetch = await user.findById(userId).populate({
      path: "cart.productId",
      select: "title price discount variants",
    });

    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userFetch.cart || userFetch.cart.length === 0) {
      return res.status(200).json({
        message: "Cart is empty",
        subtotal: 0,
        discount: 0,
        shipping: 0,
        tax: 0,
        total: 0,
        items: 0,
      });
    }

    let subtotal = 0;
    let itemCount = 0;
    let productDiscount = 0;

    for (const item of userFetch.cart) {
      if (!item.productId) continue;

      let price = item.productId.price;

      // Handle variant pricing
      if (
        item.variantId &&
        item.productId.variants &&
        item.productId.variants.length > 0
      ) {
        const variant = item.productId.variants.find(
          (v) => v._id.toString() === item.variantId.toString()
        );

        if (variant && variant.price) {
          price = variant.price;
        }
      }

      // Calculate item discount
      const discount = item.productId.discount || 0;
      const discountAmount = price * (discount / 100) * item.quantity;
      productDiscount += discountAmount;

      subtotal += price * item.quantity;
      itemCount += item.quantity;
    }

    // Apply coupon if any
    let couponDiscount = 0;
    let couponInfo = null;

    if (userFetch.cart.coupon) {
      couponInfo = {
        code: userFetch.cart.coupon.code,
        discountType: userFetch.cart.coupon.discountType,
        discountValue: userFetch.cart.coupon.discountValue,
      };

      // Calculate coupon discount
      if (userFetch.cart.coupon.discountType === "percentage") {
        couponDiscount =
          (subtotal - productDiscount) *
          (userFetch.cart.coupon.discountValue / 100);
      } else {
        couponDiscount = userFetch.cart.coupon.discountValue;
      }

      // Don't allow negative total
      if (couponDiscount > subtotal - productDiscount) {
        couponDiscount = subtotal - productDiscount;
      }
    }

    // Calculate shipping (simplified - you would have more complex logic)
    const shipping = subtotal > 50 ? 0 : 5.99;

    // Calculate tax (example: 5%)
    const taxRate = 0.05;
    const taxableAmount = subtotal - productDiscount - couponDiscount;
    const tax = taxableAmount * taxRate;

    // Calculate total
    const total = taxableAmount + tax + shipping;

    res.status(200).json({
      subtotal: parseFloat(subtotal.toFixed(2)),
      productDiscount: parseFloat(productDiscount.toFixed(2)),
      coupon: couponInfo,
      couponDiscount: parseFloat(couponDiscount.toFixed(2)),
      totalDiscount: parseFloat((productDiscount + couponDiscount).toFixed(2)),
      shipping: parseFloat(shipping.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      items: itemCount,
    });
  } catch (error) {
    console.error("Error calculating cart total:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Apply coupon to cart
const applyCartCoupon = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userFetch.cart || userFetch.cart.length === 0) {
      return res
        .status(400)
        .json({ message: "Cannot apply coupon to empty cart" });
    }

    // Find coupon
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      active: true,
      expiryDate: { $gt: new Date() },
    });

    if (!coupon) {
      return res
        .status(404)
        .json({ message: "Invalid or expired coupon code" });
    }

    // Check if minimum purchase requirement is met
    let subtotal = 0;
    for (const item of userFetch.cart) {
      const product = await Product.findById(item.productId);
      if (product) {
        let price = product.price;

        // Handle variant pricing
        if (item.variantId && product.variants && product.variants.length > 0) {
          const variant = product.variants.find(
            (v) => v._id.toString() === item.variantId.toString()
          );

          if (variant && variant.price) {
            price = variant.price;
          }
        }

        // Calculate after product discount
        const discount = product.discount || 0;
        const discountedPrice = price - price * (discount / 100);

        subtotal += discountedPrice * item.quantity;
      }
    }

    if (coupon.minimumPurchase && subtotal < coupon.minimumPurchase) {
      return res.status(400).json({
        message: `Minimum purchase of $${coupon.minimumPurchase} required for this coupon`,
        minimumPurchase: coupon.minimumPurchase,
        currentSubtotal: subtotal,
      });
    }

    // Check if user already used this coupon
    if (coupon.oneTimeUse) {
      const alreadyUsed = await user.findOne({
        _id: userId,
        "usedCoupons.code": code.toUpperCase(),
      });

      if (alreadyUsed) {
        return res
          .status(400)
          .json({ message: "You have already used this coupon" });
      }
    }

    // Apply coupon to cart
    userFetch.cart.coupon = {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    };

    await userFetch.save();

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = subtotal * (coupon.discountValue / 100);
    } else {
      discountAmount = coupon.discountValue;
    }

    // Don't allow discount greater than subtotal
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    res.status(200).json({
      message: "Coupon applied successfully",
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      newTotal: parseFloat((subtotal - discountAmount).toFixed(2)),
    });
  } catch (error) {
    console.error("Error applying coupon:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Remove coupon from cart
const removeCoupon = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userFetch.cart || !userFetch.cart.coupon) {
      return res.status(400).json({ message: "No coupon applied to cart" });
    }

    // Store coupon code for response
    const couponCode = userFetch.cart.coupon.code;

    // Remove coupon
    userFetch.cart.coupon = undefined;
    await userFetch.save();

    res.status(200).json({
      message: "Coupon removed successfully",
      removedCoupon: couponCode,
    });
  } catch (error) {
    console.error("Error removing coupon:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Move item from cart to wishlist
const moveToWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find item in cart
    const cartItemIndex = userFetch.cart.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (cartItemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    const cartItem = userFetch.cart[cartItemIndex];
    const productId = cartItem.productId;
    const quantity = cartItem.quantity;

    // Restore stock
    const product = await Product.findById(productId);
    if (product) {
      if (cartItem.variantId) {
        // Restore variant stock
        if (product.variants && product.variants.length > 0) {
          const variantIndex = product.variants.findIndex(
            (v) => v._id.toString() === cartItem.variantId.toString()
          );

          if (variantIndex !== -1) {
            product.variants[variantIndex].stock += quantity;
            await product.save();
          } else {
            // Update separate variant collection
            await ProductVariant.updateOne(
              { _id: cartItem.variantId },
              { $inc: { stock: quantity } }
            );
          }
        } else {
          // Update separate variant collection
          await ProductVariant.updateOne(
            { _id: cartItem.variantId },
            { $inc: { stock: quantity } }
          );
        }
      } else {
        // Restore main product stock
        product.stock += quantity;
        await product.save();
      }
    }

    // Check if product already in wishlist
    if (!userFetch.wishlist) {
      userFetch.wishlist = [];
    }

    const existingInWishlist = userFetch.wishlist.some(
      (item) => item.toString() === productId.toString()
    );

    if (!existingInWishlist) {
      userFetch.wishlist.push(productId);
    }

    // Remove from cart
    userFetch.cart.splice(cartItemIndex, 1);
    await userFetch.save();

    res.status(200).json({
      message: "Item moved to wishlist successfully",
      productId,
      wishlistSize: userFetch.wishlist.length,
      cartSize: userFetch.cart.length,
    });
  } catch (error) {
    console.error("Error moving to wishlist:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Save item for later
const saveForLater = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find item in cart
    const cartItemIndex = userFetch.cart.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (cartItemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    const cartItem = userFetch.cart[cartItemIndex];
    const productId = cartItem.productId;
    const variantId = cartItem.variantId;
    const quantity = cartItem.quantity;

    // Restore stock
    // Restore stock
    const product = await Product.findById(productId);
    if (product) {
      if (variantId) {
        // Restore variant stock
        if (product.variants && product.variants.length > 0) {
          const variantIndex = product.variants.findIndex(
            (v) => v._id.toString() === variantId.toString()
          );

          if (variantIndex !== -1) {
            product.variants[variantIndex].stock += quantity;
            await product.save();
          } else {
            // Update separate variant collection
            await ProductVariant.updateOne(
              { _id: variantId },
              { $inc: { stock: quantity } }
            );
          }
        } else {
          // Update separate variant collection
          await ProductVariant.updateOne(
            { _id: variantId },
            { $inc: { stock: quantity } }
          );
        }
      } else {
        // Restore main product stock
        product.stock += quantity;
        await product.save();
      }
    }

    // Initialize savedItems if it doesn't exist
    if (!userFetch.savedItems) {
      userFetch.savedItems = [];
    }

    // Save item for later
    userFetch.savedItems.push({
      productId,
      variantId,
      quantity,
      savedAt: new Date(),
    });

    // Remove from cart
    userFetch.cart.splice(cartItemIndex, 1);
    await userFetch.save();

    res.status(200).json({
      message: "Item saved for later successfully",
      cartSize: userFetch.cart.length,
      savedItemsSize: userFetch.savedItems.length,
    });
  } catch (error) {
    console.error("Error saving item for later:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get saved items
const getSavedItems = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userFetch = await user.findById(userId).populate({
      path: "savedItems.productId",
      select: "title price images discount variants",
    });

    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!userFetch.savedItems || userFetch.savedItems.length === 0) {
      return res.status(200).json({
        message: "No saved items found",
        savedItems: [],
      });
    }

    // Transform saved items data for response
    const savedItems = [];

    for (const item of userFetch.savedItems) {
      if (!item.productId) continue;

      let price = item.productId.price;
      let variantInfo = null;

      // Handle variant pricing
      if (
        item.variantId &&
        item.productId.variants &&
        item.productId.variants.length > 0
      ) {
        const variant = item.productId.variants.find(
          (v) => v._id.toString() === item.variantId.toString()
        );

        if (variant) {
          if (variant.price) {
            price = variant.price;
          }
          variantInfo = {
            id: variant._id,
            name: variant.name,
            attributes: variant.attributes,
          };
        }
      }

      // Apply discount if any
      const discount = item.productId.discount || 0;
      const discountedPrice = price - price * (discount / 100);

      savedItems.push({
        id: item._id,
        productId: item.productId._id,
        title: item.productId.title,
        price: price,
        discountedPrice: discountedPrice,
        discount: discount,
        image:
          item.productId.images && item.productId.images.length > 0
            ? item.productId.images[0]
            : null,
        quantity: item.quantity,
        variant: variantInfo,
        stock:
          item.variantId && variantInfo
            ? item.productId.variants.find(
                (v) => v._id.toString() === item.variantId.toString()
              )?.stock
            : item.productId.stock,
        savedAt: item.savedAt,
      });
    }

    res.status(200).json({
      message: "Saved items fetched successfully",
      savedItems,
    });
  } catch (error) {
    console.error("Error fetching saved items:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Move saved item to cart
const moveSavedToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find item in saved items
    const savedItemIndex = userFetch.savedItems.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (savedItemIndex === -1) {
      return res.status(404).json({ message: "Item not found in saved items" });
    }

    const savedItem = userFetch.savedItems[savedItemIndex];
    const productId = savedItem.productId;
    const variantId = savedItem.variantId;
    const quantity = savedItem.quantity;

    // Check product availability
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product no longer available" });
    }

    // Check stock
    if (variantId) {
      // Check variant stock
      let variant;
      if (product.variants && product.variants.length > 0) {
        variant = product.variants.find(
          (v) => v._id.toString() === variantId.toString()
        );
      }

      if (!variant) {
        // Try to find in separate variants collection
        variant = await ProductVariant.findOne({
          _id: variantId,
          productId,
        });
      }

      if (!variant) {
        return res.status(404).json({ message: "Variant no longer available" });
      }

      if (variant.stock < quantity) {
        return res.status(400).json({
          message: "Not enough stock available",
          availableStock: variant.stock,
          requestedQuantity: quantity,
        });
      }

      // Update variant stock
      if (product.variants && product.variants.length > 0) {
        const variantIndex = product.variants.findIndex(
          (v) => v._id.toString() === variantId.toString()
        );

        if (variantIndex !== -1) {
          product.variants[variantIndex].stock -= quantity;
          await product.save();
        } else {
          // Update separate variant collection
          await ProductVariant.updateOne(
            { _id: variantId },
            { $inc: { stock: -quantity } }
          );
        }
      } else {
        // Update separate variant collection
        await ProductVariant.updateOne(
          { _id: variantId },
          { $inc: { stock: -quantity } }
        );
      }
    } else {
      // Check main product stock
      if (product.stock < quantity) {
        return res.status(400).json({
          message: "Not enough stock available",
          availableStock: product.stock,
          requestedQuantity: quantity,
        });
      }

      // Update main product stock
      product.stock -= quantity;
      await product.save();
    }

    // Initialize cart if it doesn't exist
    if (!userFetch.cart) {
      userFetch.cart = [];
    }

    // Check if product already in cart
    const existingItemIndex = userFetch.cart.findIndex((item) => {
      if (variantId) {
        return (
          item.productId.toString() === productId.toString() &&
          item.variantId &&
          item.variantId.toString() === variantId.toString()
        );
      }
      return (
        item.productId.toString() === productId.toString() && !item.variantId
      );
    });

    if (existingItemIndex !== -1) {
      // Update quantity if product already in cart
      userFetch.cart[existingItemIndex].quantity += quantity;
    } else {
      // Add new product to cart
      userFetch.cart.push({
        productId,
        variantId,
        quantity,
        addedAt: new Date(),
      });
    }

    // Remove from saved items
    userFetch.savedItems.splice(savedItemIndex, 1);
    await userFetch.save();

    res.status(200).json({
      message: "Item moved to cart successfully",
      cartSize: userFetch.cart.length,
      savedItemsSize: userFetch.savedItems.length,
    });
  } catch (error) {
    console.error("Error moving saved item to cart:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Remove saved item
const removeSavedItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    const userFetch = await user.findById(userId);
    if (!userFetch) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find item in saved items
    const savedItemIndex = userFetch.savedItems.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (savedItemIndex === -1) {
      return res.status(404).json({ message: "Item not found in saved items" });
    }

    // Remove from saved items
    userFetch.savedItems.splice(savedItemIndex, 1);
    await userFetch.save();

    res.status(200).json({
      message: "Saved item removed successfully",
      savedItemsSize: userFetch.savedItems.length,
    });
  } catch (error) {
    console.error("Error removing saved item:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export {
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
};

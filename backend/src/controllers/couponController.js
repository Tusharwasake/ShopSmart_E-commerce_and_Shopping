// couponController.js
import { Coupon } from "../models/Coupon.js";
import { CouponUsage } from "../models/CouponUsage.js";
import { user } from "../models/User.js";

// Get all coupons (admin)
const getAllCoupons = async (req, res) => {
  try {
    const {
      active,
      type,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    const query = {};

    if (active !== undefined) {
      query.active = active === "true";
    }

    if (type) {
      query.discountType = type;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sorting
    const sortOptions = {};
    sortOptions[sort] = order === "asc" ? 1 : -1;

    // Execute query
    const coupons = await Coupon.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Coupon.countDocuments(query);

    res.status(200).json({
      message: "Coupons fetched successfully",
      coupons,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching coupons:", error.message);
    res.status(500).json({ message: "Error fetching coupons" });
  }
};

// Get coupon by code (admin)
const getCouponByCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json({
      message: "Coupon fetched successfully",
      coupon,
    });
  } catch (error) {
    console.error("Error fetching coupon:", error.message);
    res.status(500).json({ message: "Error fetching coupon" });
  }
};

// Create a new coupon (admin)
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minimumPurchase,
      maximumDiscount,
      expiryDate,
      active,
      oneTimeUse,
      usageLimit,
      usageLimitPerUser,
      applicableProducts,
      excludedProducts,
      applicableCategories,
      excludedCategories,
    } = req.body;

    if (!code || !discountType || !discountValue) {
      return res.status(400).json({
        message: "Code, discount type, and discount value are required",
      });
    }

    // Validate discount type
    if (!["percentage", "fixed"].includes(discountType)) {
      return res.status(400).json({
        message: "Discount type must be either 'percentage' or 'fixed'",
      });
    }

    // Validate discount value
    if (
      discountType === "percentage" &&
      (discountValue <= 0 || discountValue > 100)
    ) {
      return res.status(400).json({
        message: "Percentage discount must be between 0 and 100",
      });
    }

    if (discountType === "fixed" && discountValue <= 0) {
      return res.status(400).json({
        message: "Fixed discount must be greater than 0",
      });
    }

    // Check if coupon with same code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (existingCoupon) {
      return res.status(400).json({
        message: "A coupon with this code already exists",
      });
    }

    // Create new coupon
    const newCoupon = await Coupon.create({
      code: code.toUpperCase(),
      description: description || "",
      discountType,
      discountValue,
      minimumPurchase: minimumPurchase || 0,
      maximumDiscount: maximumDiscount || null,
      expiryDate: expiryDate || null,
      active: active !== undefined ? active : true,
      oneTimeUse: oneTimeUse || false,
      usageLimit: usageLimit || null,
      usageLimitPerUser: usageLimitPerUser || null,
      applicableProducts: applicableProducts || [],
      excludedProducts: excludedProducts || [],
      applicableCategories: applicableCategories || [],
      excludedCategories: excludedCategories || [],
      usageCount: 0,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "Coupon created successfully",
      coupon: newCoupon,
    });
  } catch (error) {
    console.error("Error creating coupon:", error.message);
    res.status(500).json({ message: "Error creating coupon" });
  }
};

// Update a coupon (admin)
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find the coupon
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    // Validate discount type if changed
    if (
      updates.discountType &&
      !["percentage", "fixed"].includes(updates.discountType)
    ) {
      return res.status(400).json({
        message: "Discount type must be either 'percentage' or 'fixed'",
      });
    }

    // Validate discount value if changed
    if (updates.discountValue) {
      const type = updates.discountType || coupon.discountType;

      if (
        type === "percentage" &&
        (updates.discountValue <= 0 || updates.discountValue > 100)
      ) {
        return res.status(400).json({
          message: "Percentage discount must be between 0 and 100",
        });
      }

      if (type === "fixed" && updates.discountValue <= 0) {
        return res.status(400).json({
          message: "Fixed discount must be greater than 0",
        });
      }
    }

    // Check for code uniqueness if code is being changed
    if (updates.code && updates.code !== coupon.code) {
      const existingCoupon = await Coupon.findOne({
        code: updates.code.toUpperCase(),
        _id: { $ne: id },
      });

      if (existingCoupon) {
        return res.status(400).json({
          message: "A coupon with this code already exists",
        });
      }

      updates.code = updates.code.toUpperCase();
    }

    // Apply updates
    updates.updatedAt = new Date();

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    res.status(200).json({
      message: "Coupon updated successfully",
      coupon: updatedCoupon,
    });
  } catch (error) {
    console.error("Error updating coupon:", error.message);
    res.status(500).json({ message: "Error updating coupon" });
  }
};

// Delete a coupon (admin)
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    await Coupon.findByIdAndDelete(id);

    res.status(200).json({
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting coupon:", error.message);
    res.status(500).json({ message: "Error deleting coupon" });
  }
};

// Validate a coupon (public)
const validateCoupon = async (req, res) => {
  try {
    const { code, userId, cartTotal } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    // Find the coupon
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      active: true,
    });

    if (!coupon) {
      return res.status(404).json({
        valid: false,
        message: "Invalid coupon code",
      });
    }

    // Check if coupon is expired
    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      return res.status(400).json({
        valid: false,
        message: "Coupon has expired",
      });
    }

    // Check minimum purchase requirement
    if (coupon.minimumPurchase && cartTotal < coupon.minimumPurchase) {
      return res.status(400).json({
        valid: false,
        message: `Minimum purchase of $${coupon.minimumPurchase} required`,
        minimumPurchase: coupon.minimumPurchase,
        currentTotal: cartTotal,
      });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        valid: false,
        message: "Coupon usage limit reached",
      });
    }

    // Check if user specific checks are needed
    let userCanUse = true;
    let userMessage = "";

    if (userId) {
      // Check one time use
      if (coupon.oneTimeUse) {
        const hasUsed = await CouponUsage.findOne({
          couponId: coupon._id,
          userId,
        });

        if (hasUsed) {
          userCanUse = false;
          userMessage = "You have already used this coupon";
        }
      }

      // Check user limit
      if (userCanUse && coupon.usageLimitPerUser) {
        const userUsageCount = await CouponUsage.countDocuments({
          couponId: coupon._id,
          userId,
        });

        if (userUsageCount >= coupon.usageLimitPerUser) {
          userCanUse = false;
          userMessage = "You have reached the usage limit for this coupon";
        }
      }
    }

    // Calculate discount
    let discountAmount = 0;

    if (coupon.discountType === "percentage") {
      discountAmount = (cartTotal * coupon.discountValue) / 100;

      // Apply maximum discount if set
      if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
        discountAmount = coupon.maximumDiscount;
      }
    } else {
      discountAmount = coupon.discountValue;

      // Don't allow discount greater than cart total
      if (discountAmount > cartTotal) {
        discountAmount = cartTotal;
      }
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    res.status(200).json({
      valid: userCanUse,
      message: userCanUse ? "Coupon is valid" : userMessage,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        newTotal: cartTotal - discountAmount,
      },
    });
  } catch (error) {
    console.error("Error validating coupon:", error.message);
    res.status(500).json({ message: "Error validating coupon" });
  }
};

// Get active public coupons
const getActiveCoupons = async (req, res) => {
  try {
    // Get current date
    const currentDate = new Date();

    // Find active coupons that aren't expired
    const coupons = await Coupon.find({
      active: true,
      $or: [{ expiryDate: { $gt: currentDate } }, { expiryDate: null }],
    }).select(
      "code description discountType discountValue minimumPurchase maximumDiscount expiryDate"
    );

    // Format for public consumption
    const formattedCoupons = coupons.map((coupon) => ({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minimumPurchase: coupon.minimumPurchase || 0,
      maximumDiscount: coupon.maximumDiscount,
      expiryDate: coupon.expiryDate,
    }));

    res.status(200).json({
      message: "Active coupons fetched successfully",
      coupons: formattedCoupons,
    });
  } catch (error) {
    console.error("Error fetching active coupons:", error.message);
    res.status(500).json({ message: "Error fetching active coupons" });
  }
};

// Apply coupon to cart
const applyCoupon = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { code, cartTotal } = req.body;

    if (!code || cartTotal === undefined) {
      return res.status(400).json({
        message: "Coupon code and cart total are required",
      });
    }

    // Find the coupon
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      active: true,
    });

    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    // Check if coupon is expired
    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      return res.status(400).json({ message: "Coupon has expired" });
    }

    // Check minimum purchase requirement
    if (coupon.minimumPurchase && cartTotal < coupon.minimumPurchase) {
      return res.status(400).json({
        message: `Minimum purchase of $${coupon.minimumPurchase} required`,
        minimumPurchase: coupon.minimumPurchase,
        currentTotal: cartTotal,
      });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        message: "Coupon usage limit reached",
      });
    }

    // Check one time use
    if (coupon.oneTimeUse) {
      const hasUsed = await CouponUsage.findOne({
        couponId: coupon._id,
        userId,
      });

      if (hasUsed) {
        return res.status(400).json({
          message: "You have already used this coupon",
        });
      }
    }

    // Check user limit
    if (coupon.usageLimitPerUser) {
      const userUsageCount = await CouponUsage.countDocuments({
        couponId: coupon._id,
        userId,
      });

      if (userUsageCount >= coupon.usageLimitPerUser) {
        return res.status(400).json({
          message: "You have reached the usage limit for this coupon",
        });
      }
    }

    // Find user
    const userDoc = await user.findById(userId);

    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate discount
    let discountAmount = 0;

    if (coupon.discountType === "percentage") {
      discountAmount = (cartTotal * coupon.discountValue) / 100;

      // Apply maximum discount if set
      if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
        discountAmount = coupon.maximumDiscount;
      }
    } else {
      discountAmount = coupon.discountValue;

      // Don't allow discount greater than cart total
      if (discountAmount > cartTotal) {
        discountAmount = cartTotal;
      }
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    // Store coupon in user's cart
    userDoc.cart.coupon = {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    };

    await userDoc.save();

    res.status(200).json({
      message: "Coupon applied successfully",
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        newTotal: cartTotal - discountAmount,
      },
    });
  } catch (error) {
    console.error("Error applying coupon:", error.message);
    res.status(500).json({ message: "Error applying coupon" });
  }
};

// Remove coupon from cart
const removeCoupon = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find user
    const userDoc = await user.findById(userId);

    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if coupon exists in cart
    if (!userDoc.cart.coupon) {
      return res.status(400).json({
        message: "No coupon applied to cart",
      });
    }

    const couponCode = userDoc.cart.coupon.code;

    // Remove coupon from cart
    userDoc.cart.coupon = undefined;
    await userDoc.save();

    res.status(200).json({
      message: "Coupon removed successfully",
      removedCoupon: couponCode,
    });
  } catch (error) {
    console.error("Error removing coupon:", error.message);
    res.status(500).json({ message: "Error removing coupon" });
  }
};

// Get coupons available to the user
const getUserCoupons = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cartTotal } = req.query;

    // Get current date
    const currentDate = new Date();

    // Find active coupons that aren't expired
    const coupons = await Coupon.find({
      active: true,
      $or: [{ expiryDate: { $gt: currentDate } }, { expiryDate: null }],
    }).select(
      "_id code description discountType discountValue minimumPurchase maximumDiscount expiryDate oneTimeUse usageLimitPerUser"
    );

    // Check eligibility for each coupon
    const userCoupons = [];

    for (const coupon of coupons) {
      let eligible = true;
      let message = "";

      // Check if meets minimum purchase
      if (
        cartTotal &&
        coupon.minimumPurchase &&
        cartTotal < coupon.minimumPurchase
      ) {
        eligible = false;
        message = `Requires minimum purchase of $${coupon.minimumPurchase}`;
      }

      // Check one time use
      if (eligible && coupon.oneTimeUse) {
        const hasUsed = await CouponUsage.findOne({
          couponId: coupon._id,
          userId,
        });

        if (hasUsed) {
          eligible = false;
          message = "Already used";
        }
      }

      // Check user limit
      if (eligible && coupon.usageLimitPerUser) {
        const userUsageCount = await CouponUsage.countDocuments({
          couponId: coupon._id,
          userId,
        });

        if (userUsageCount >= coupon.usageLimitPerUser) {
          eligible = false;
          message = "Usage limit reached";
        }
      }

      // Calculate potential discount
      let discountAmount = null;

      if (cartTotal) {
        if (coupon.discountType === "percentage") {
          discountAmount = (cartTotal * coupon.discountValue) / 100;

          // Apply maximum discount if set
          if (
            coupon.maximumDiscount &&
            discountAmount > coupon.maximumDiscount
          ) {
            discountAmount = coupon.maximumDiscount;
          }
        } else {
          discountAmount = coupon.discountValue;

          // Don't allow discount greater than cart total
          if (discountAmount > cartTotal) {
            discountAmount = cartTotal;
          }
        }

        // Round to 2 decimal places
        discountAmount = Math.round(discountAmount * 100) / 100;
      }

      userCoupons.push({
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minimumPurchase: coupon.minimumPurchase || 0,
        maximumDiscount: coupon.maximumDiscount,
        expiryDate: coupon.expiryDate,
        eligible,
        message,
        potentialDiscount: discountAmount,
      });
    }

    res.status(200).json({
      message: "User coupons fetched successfully",
      coupons: userCoupons,
    });
  } catch (error) {
    console.error("Error fetching user coupons:", error.message);
    res.status(500).json({ message: "Error fetching user coupons" });
  }
};

// Get coupon usage stats (admin)
const getCouponUsage = async (req, res) => {
  try {
    const { code } = req.params;

    // Find coupon
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    // Get usage data
    const usageData = await CouponUsage.find({ couponId: coupon._id })
      .sort({ usedAt: -1 })
      .populate("userId", "username email")
      .populate("orderId", "orderNumber total");

    // Calculate stats
    const totalUsage = usageData.length;
    const totalDiscountAmount = usageData.reduce(
      (sum, item) => sum + item.discountAmount,
      0
    );
    const totalOrderAmount = usageData.reduce(
      (sum, item) => sum + (item.orderId ? item.orderId.total : 0),
      0
    );

    const stats = {
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        usageCount: coupon.usageCount,
        usageLimit: coupon.usageLimit,
      },
      usage: {
        total: totalUsage,
        totalDiscountAmount,
        totalOrderAmount,
        averageDiscount: totalUsage > 0 ? totalDiscountAmount / totalUsage : 0,
        averageOrder: totalUsage > 0 ? totalOrderAmount / totalUsage : 0,
      },
      history: usageData.map((item) => ({
        user: item.userId
          ? {
              id: item.userId._id,
              username: item.userId.username,
              email: item.userId.email,
            }
          : { username: "Guest" },
        order: item.orderId
          ? {
              id: item.orderId._id,
              number: item.orderId.orderNumber,
              total: item.orderId.total,
            }
          : null,
        discountAmount: item.discountAmount,
        usedAt: item.usedAt,
      })),
    };

    res.status(200).json({
      message: "Coupon usage stats fetched successfully",
      stats,
    });
  } catch (error) {
    console.error("Error fetching coupon usage:", error.message);
    res.status(500).json({ message: "Error fetching coupon usage" });
  }
};

// Bulk update coupons (admin)
const bulkUpdateCoupons = async (req, res) => {
  try {
    const { action, couponIds } = req.body;

    if (
      !action ||
      !couponIds ||
      !Array.isArray(couponIds) ||
      couponIds.length === 0
    ) {
      return res.status(400).json({
        message: "Action and coupon IDs array are required",
      });
    }

    let updateData = {};

    // Determine the update operation
    switch (action) {
      case "activate":
        updateData = { active: true };
        break;
      case "deactivate":
        updateData = { active: false };
        break;
      case "delete":
        // Delete all coupons
        await Coupon.deleteMany({ _id: { $in: couponIds } });

        return res.status(200).json({
          message: `${couponIds.length} coupons deleted successfully`,
        });
      default:
        return res.status(400).json({
          message:
            "Invalid action. Supported actions: activate, deactivate, delete",
        });
    }

    // Update coupons
    const result = await Coupon.updateMany(
      { _id: { $in: couponIds } },
      { $set: updateData }
    );

    res.status(200).json({
      message: `${result.modifiedCount} coupons updated successfully`,
      action,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error bulk updating coupons:", error.message);
    res.status(500).json({ message: "Error bulk updating coupons" });
  }
};

export {
  getAllCoupons,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getActiveCoupons,
  applyCoupon,
  removeCoupon,
  getUserCoupons,
  getCouponUsage,
  bulkUpdateCoupons,
};
